import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STATUS_MESSAGES = {
  in_kitchen: {
    subject: "Your order is being prepared! 🍕",
    body: (order) => `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
  <div style="background: #c0392b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Marco's Express</h1>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Your order is in the kitchen! 👨‍🍳</h2>
    <p style="color: #555;">Hi ${order.customer_name},</p>
    <p style="color: #555;">Great news! Your order <strong>#${order.order_number}</strong> has been picked up by our kitchen and is now being freshly prepared for you.</p>
    <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #555;"><strong>Order Total:</strong> £${(order.total || 0).toFixed(2)}</p>
      <p style="margin: 4px 0 0; color: #555;"><strong>Type:</strong> ${order.order_type === 'delivery' ? 'Delivery' : 'Collection'}</p>
    </div>
    <p style="color: #555;">We'll let you know when it's ${order.order_type === 'delivery' ? 'on its way' : 'ready for collection'}!</p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">Marco's Express &bull; Thank you for your order!</p>
  </div>
</div>`,
  },
  out_for_delivery: {
    subject: "Your order is on its way! 🚗",
    body: (order) => `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
  <div style="background: #c0392b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Marco's Express</h1>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Your order is on its way! 🚗</h2>
    <p style="color: #555;">Hi ${order.customer_name},</p>
    <p style="color: #555;">Your order <strong>#${order.order_number}</strong> has left our kitchen and is heading to you now!</p>
    <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #555;"><strong>Delivering to:</strong> ${order.delivery_address || order.delivery_postcode || 'Your address'}</p>
      <p style="margin: 4px 0 0; color: #555;"><strong>Order Total:</strong> £${(order.total || 0).toFixed(2)}</p>
    </div>
    <p style="color: #555;">Please ensure someone is available to receive the order. See you soon!</p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">Marco's Express &bull; Thank you for your order!</p>
  </div>
</div>`,
  },
  ready: {
    subject: "Your order is ready for collection! ✅",
    body: (order) => `
<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
  <div style="background: #c0392b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Marco's Express</h1>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Ready for collection! ✅</h2>
    <p style="color: #555;">Hi ${order.customer_name},</p>
    <p style="color: #555;">Your order <strong>#${order.order_number}</strong> is freshly prepared and ready for you to collect!</p>
    <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0; color: #555;"><strong>Order Total:</strong> £${(order.total || 0).toFixed(2)}</p>
    </div>
    <p style="color: #555;">Please come and collect your order at your earliest convenience.</p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">Marco's Express &bull; Thank you for your order!</p>
  </div>
</div>`,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { order_id, status } = await req.json();

    if (!order_id || !status) {
      return Response.json({ error: 'order_id and status are required' }, { status: 400 });
    }

    const template = STATUS_MESSAGES[status];
    if (!template) {
      return Response.json({ skipped: true, reason: 'No notification template for this status' });
    }

    // Fetch the order
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    const order = orders[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.customer_email) {
      return Response.json({ skipped: true, reason: 'No customer email on file' });
    }

    // Send email via built-in integration
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: order.customer_email,
      subject: template.subject,
      body: template.body(order),
      from_name: "Marco's Express",
    });

    return Response.json({ success: true, email_sent_to: order.customer_email, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});