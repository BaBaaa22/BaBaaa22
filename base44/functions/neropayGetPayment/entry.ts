import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { payment_id } = await req.json();

    // Always use env secret for NeroPay (never stored in DB)
    const secretKey = Deno.env.get('NEROPAY_SECRET_KEY');

    if (!secretKey) {
      return Response.json({ error: 'NeroPay secret key not configured in environment variables.' }, { status: 500 });
    }

    // payment_id is a pi_... (payment intent ID)
    const res = await fetch(`https://eu.neropay.app/v2/payment-intents/retrieve/${payment_id}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` },
    });

    const data = await res.json();
    console.log('NeroPay get payment-intent response:', JSON.stringify(data));

    if (!res.ok) {
      return Response.json({ error: data?.error?.message || 'NeroPay error' }, { status: 400 });
    }

    const payload = data.data || data;
    const rawStatus = payload.status || payload.transaction?.status;

    const statusMap = {
      succeeded: 'paid',
      paid: 'paid',
      completed: 'paid',
      pending: 'pending',
      processing: 'pending',
      requires_payment_method: 'pending',
      failed: 'failed',
      canceled: 'cancelled',
      cancelled: 'cancelled',
    };
    const status = statusMap[rawStatus?.toLowerCase()] || rawStatus;

    return Response.json({ payment_id, status, amount: payload.amount, currency: payload.currency });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});