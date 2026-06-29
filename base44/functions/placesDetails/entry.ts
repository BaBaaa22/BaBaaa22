Deno.serve(async (req) => {
  try {
    const { place_id } = await req.json();
    if (!place_id) return Response.json({ error: 'place_id required' }, { status: 400 });

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    // Use Places API (New) - Place Details
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place_id)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'addressComponents,formattedAddress',
      },
    });

    const data = await res.json();
    console.log('Places Details response status:', res.status);

    if (!res.ok) {
      console.log('Error:', JSON.stringify(data));
      return Response.json({ error: data.error?.message || 'API error' }, { status: 500 });
    }

    const components = data.addressComponents || [];
    const get = (type) => components.find(c => c.types?.includes(type))?.longText || '';
    const getShort = (type) => components.find(c => c.types?.includes(type))?.shortText || '';

    return Response.json({
      formatted_address: data.formattedAddress || '',
      street_number: get('street_number'),
      route: get('route'),
      postcode: getShort('postal_code'),
      town: get('postal_town') || get('locality'),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});