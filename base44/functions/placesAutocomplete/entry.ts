Deno.serve(async (req) => {
  try {
    const { input } = await req.json();
    if (!input || input.trim().length < 2) {
      return Response.json({ predictions: [] });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    // Use Places API (New) - Autocomplete
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ['gb'],
        languageCode: 'en',
      }),
    });

    const data = await res.json();
    console.log('Places API (New) response status:', res.status);

    if (!res.ok) {
      console.log('Error:', JSON.stringify(data));
      return Response.json({ predictions: [], error: data.error?.message || 'API error' });
    }

    const predictions = (data.suggestions || []).map(s => {
      const p = s.placePrediction;
      return {
        place_id: p?.placeId || '',
        description: p?.text?.text || '',
        main_text: p?.structuredFormat?.mainText?.text || p?.text?.text || '',
        secondary_text: p?.structuredFormat?.secondaryText?.text || '',
      };
    });

    return Response.json({ predictions });
  } catch (error) {
    return Response.json({ error: error.message, predictions: [] }, { status: 500 });
  }
});