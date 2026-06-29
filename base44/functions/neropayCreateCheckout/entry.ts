Deno.serve(async (req) => {
  try {
    const { amount, reference, description, success_url, cancel_url, ipn_url } = await req.json();

    const secretKey = Deno.env.get('neropay_secret');
    const publicKey = Deno.env.get('PublicKey');

    if (!secretKey || !publicKey) {
      return Response.json({ error: 'NeroPay keys not configured.' }, { status: 500 });
    }

    // Use /v2/payment-links (LinkPay) — returns a shareable checkout_url
    // Append random suffix to prevent NeroPay deduplication returning stale links
    const uniqueIdentifier = `${reference}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const body = {
      public_key: publicKey,
      currency: 'GBP',
      amount: parseFloat(amount),
      details: description || "Marco's Order",
      identifier: uniqueIdentifier,
      ...(success_url ? { success_url } : {}),
      ...(cancel_url ? { cancel_url } : {}),
      ...(ipn_url ? { ipn_url } : {}),
    };

    const res = await fetch('https://eu.neropay.app/v2/payment-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('NeroPay /v2/payment-links status:', res.status);
    console.log('Response body:', text.slice(0, 2000));

    let data;
    try { data = JSON.parse(text); } catch(e) { data = { raw: text }; }

    if (!res.ok) {
      const errMsg = data?.message || data?.error?.message || `NeroPay error (${res.status})`;
      return Response.json({ error: errMsg, debug: data }, { status: 400 });
    }

    const payload = data.data || data;
    const checkoutUrl = payload.payment_link || payload.checkout_url || payload.link || payload.url || payload.payment_url;

    if (!checkoutUrl) {
      console.log('No checkout_url found. Payload keys:', JSON.stringify(Object.keys(payload)));
      console.log('Full payload:', JSON.stringify(payload).slice(0, 1000));
      return Response.json({ error: 'No checkout URL returned from NeroPay', debug: payload }, { status: 400 });
    }

    console.log('Checkout URL:', checkoutUrl);
    return Response.json({ checkout_url: checkoutUrl, payment_id: payload.id });

  } catch (error) {
    console.error('neropayCreateCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});