import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Fetch the order
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // If payment method is cash, keep as pending (only staff can mark as paid)
    if (order.payment_method === 'cash') {
      return Response.json({ 
        payment_status: order.payment_status,
        message: 'Cash orders must be manually confirmed by staff'
      });
    }

    // For card payments, check NeroPay
    if (order.payment_method === 'card') {
      try {
        const paymentRes = await base44.functions.invoke('neropayGetPayment', {
          reference: order.order_number
        });

        const paymentStatus = paymentRes?.data?.status;
        let newPaymentStatus = order.payment_status;

        // Map NeroPay status to order payment_status
        if (paymentStatus === 'completed' || paymentStatus === 'paid') {
          newPaymentStatus = 'paid';
        } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
          newPaymentStatus = 'pending';
        }

        // Update order if status changed
        if (newPaymentStatus !== order.payment_status) {
          await base44.asServiceRole.entities.Order.update(order_id, {
            payment_status: newPaymentStatus
          });
        }

        return Response.json({ 
          payment_status: newPaymentStatus,
          gateway_status: paymentStatus,
          synced: true
        });
      } catch (error) {
        return Response.json({ 
          error: 'Could not sync with payment gateway',
          current_status: order.payment_status,
          details: error.message
        }, { status: 500 });
      }
    }

    return Response.json({ payment_status: order.payment_status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});