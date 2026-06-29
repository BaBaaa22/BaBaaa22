import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { amount, reference, description } = await req.json();

    const apiKey = Deno.env.get('SUMUP_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SumUp API key not configured' }, { status: 400 });
    }

    // Fetch merchant code from DB or auto-discover from SumUp API
    const gateways = await base44.asServiceRole.entities.PaymentGateway.filter({ provider: 'sumup', is_enabled: true });
    let merchantCode = gateways[0]?.merchant_id || '';

    if (!merchantCode) {
      // Auto-fetch merchant code from SumUp
      const profileRes = await fetch('https://api.sumup.com/v0.1/me', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const profile = await profileRes.json();
      merchantCode = profile?.merchant_profile?.merchant_code || '';
      console.log('Auto-fetched merchant code:', merchantCode);
    }

    if (!merchantCode) {
      return Response.json({ error: 'Could not determine SumUp merchant code' }, { status: 400 });
    }

    const response = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_reference: reference,
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        currency: 'GBP',
        description: description || "Marco's Order",
        merchant_code: merchantCode,
      }),
    });

    const data = await response.json();
    console.log('SumUp checkout response:', JSON.stringify(data));

    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to create checkout', detail: data }, { status: 400 });
    }

    // Build the hosted checkout URL
    const checkoutId = data.id;
    const hostedUrl = data.hosted_checkout_url || `https://pay.sumup.com/b2c/SUMUP_PAY/${checkoutId}`;

    return Response.json({ checkout_id: checkoutId, hosted_checkout_url: hostedUrl });
  } catch (error) {
    console.error('sumupCreateCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});