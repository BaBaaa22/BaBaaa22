import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// NeroPay v2 webhook handler
// Signature: HMAC-SHA256(timestamp + "." + rawBody, NEROPAY_WEBHOOK_SECRET)
// Headers: X-NeroPay-Timestamp, X-NeroPay-Signature

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Read raw body as text (needed for signature verification)
    const rawBody = await req.text();
    console.log('NeroPay IPN raw body:', rawBody.slice(0, 500));

    // Verify v2 webhook signature
    const webhookSecret = Deno.env.get('NEROPAY_WEBHOOK_SECRET') || Deno.env.get('neropay_secret');
    const timestamp = req.headers.get('X-NeroPay-Timestamp') || req.headers.get('x-neropay-timestamp');
    const receivedSig = req.headers.get('X-NeroPay-Signature') || req.headers.get('x-neropay-signature');

    console.log('IPN headers — timestamp:', timestamp, 'signature:', receivedSig);

    if (webhookSecret && timestamp && receivedSig) {
      const message = `${timestamp}.${rawBody}`;
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        'raw', encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
      const expectedSig = Array.from(new Uint8Array(sigBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      if (expectedSig.toLowerCase() !== receivedSig.toLowerCase()) {
        console.warn('IPN signature mismatch — expected:', expectedSig, 'got:', receivedSig);
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('IPN signature verified OK');
    } else {
      console.warn('IPN: skipping signature check — missing webhookSecret, timestamp, or signature');
    }

    // Parse the body
    const body = JSON.parse(rawBody);
    console.log('NeroPay IPN parsed body:', JSON.stringify(body));

    // Support both direct fields and nested data object
    const identifier = body.identifier || body.data?.identifier;
    const status = body.status || body.data?.status || body.event;

    if (!identifier) {
      console.warn('IPN: no identifier in payload');
      return Response.json({ ok: true }); // Don't block NeroPay retries
    }

    // Strip "LinkPay_" prefix added by NeroPay for payment-links
    // Also strip the random suffix we appended (e.g. "MRC-ABC123-T3OMR6" → "MRC-ABC123")
    const withoutPrefix = identifier.replace(/^LinkPay_/i, '');
    // Order numbers are like "MRC-XXXXXX". The suffix we add is "-XXXXXX" (6 chars). Strip last "-XXXXXX" segment.
    const orderRef = withoutPrefix.replace(/-[A-Z0-9]{6}$/, '');
    console.log('IPN: identifier =', identifier, '| stripped orderRef =', orderRef);

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderRef });
    const order = orders[0];

    if (!order) {
      console.warn('IPN: order not found for ref:', orderRef);
      return Response.json({ ok: true });
    }

    // Mark paid on any success-like status (NeroPay uses "AUTHORISED" or "authorised")
    const normalizedStatus = (status || '').toLowerCase();
    const isPaid = normalizedStatus === 'paid' || normalizedStatus === 'success' || normalizedStatus === 'completed' || normalizedStatus === 'payment.success' || normalizedStatus === 'authorised' || normalizedStatus === 'authorized';
    const isFailed = normalizedStatus === 'failed' || normalizedStatus === 'cancelled' || normalizedStatus === 'payment.failed' || normalizedStatus === 'declined';

    console.log('IPN: status =', status, '| normalised =', normalizedStatus, '| isPaid =', isPaid, '| isFailed =', isFailed);

    if (isPaid) {
      await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'paid' });
      console.log('Order marked as paid:', order.id);

      const updatedOrder = { ...order, payment_status: 'paid' };
      Promise.all([
        base44.asServiceRole.functions.invoke('notifyAdminNewOrder', { data: updatedOrder }),
        base44.asServiceRole.functions.invoke('sendOrderEmail', { data: updatedOrder }),
      ]).catch(e => console.warn('Notification error:', e.message));

    } else if (isFailed) {
      await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'pending', status: 'cancelled' });
      console.log('Order marked as cancelled:', order.id);
    } else {
      console.log('IPN: unhandled status:', status, '— no action taken');
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('NeroPay IPN error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});