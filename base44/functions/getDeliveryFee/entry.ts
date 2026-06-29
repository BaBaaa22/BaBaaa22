import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { customer_postcode } = await req.json();

    if (!customer_postcode) {
      return Response.json({ error: 'customer_postcode is required' }, { status: 400 });
    }

    // Fetch store settings
    const settingsArr = await base44.asServiceRole.entities.StoreSettings.filter({ setting_key: 'main' });
    const settings = settingsArr[0];

    if (!settings) {
      return Response.json({ error: 'Store settings not found' }, { status: 404 });
    }

    // If distance zones not enabled, fall back to postcode prefix matching
    if (!settings.use_distance_zones || !settings.shop_postcode || !settings.distance_zones?.length) {
      const cleaned = customer_postcode.toUpperCase().trim();
      const zones = [...(settings.delivery_zones || [])].sort((a, b) => b.postcode_prefix.length - a.postcode_prefix.length);
      const match = zones.find(z => cleaned.startsWith(z.postcode_prefix.toUpperCase()));
      return Response.json({
        mode: 'postcode',
        delivery_charge: match?.delivery_charge ?? settings.default_delivery_charge ?? 2.5,
        minimum_order: match?.minimum_order ?? settings.minimum_delivery_order ?? 10,
        zone_name: match?.zone_name ?? null,
        in_range: true,
      });
    }

    // Distance-based: use Google Maps Distance Matrix API
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    const origin = encodeURIComponent(settings.shop_postcode + ', UK');
    const destination = encodeURIComponent(customer_postcode + ', UK');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=imperial&key=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      return Response.json({ error: 'Could not calculate distance', detail: element?.status }, { status: 422 });
    }

    // distance in metres → miles
    const distanceMetres = element.distance.value;
    const distanceMiles = distanceMetres / 1609.34;

    // Sort zones ascending by max_miles, find the first zone customer falls into
    const sorted = [...settings.distance_zones].sort((a, b) => a.max_miles - b.max_miles);
    const matchedZone = sorted.find(z => distanceMiles <= z.max_miles);

    if (!matchedZone) {
      // Outside all zones
      return Response.json({
        mode: 'distance',
        distance_miles: parseFloat(distanceMiles.toFixed(2)),
        in_range: false,
        delivery_charge: null,
        minimum_order: null,
        zone_name: null,
      });
    }

    return Response.json({
      mode: 'distance',
      distance_miles: parseFloat(distanceMiles.toFixed(2)),
      in_range: true,
      delivery_charge: matchedZone.delivery_charge,
      minimum_order: matchedZone.minimum_order ?? settings.minimum_delivery_order ?? 10,
      zone_name: matchedZone.zone_name ?? null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});