import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Payload from entity automation: { event, data, old_data }
    const order = body.data;
    const orderId = body.event?.entity_id;

    // If payload was too large, fetch manually
    let orderData = order;
    if (body.payload_too_large || !order) {
      const results = await base44.asServiceRole.entities.Order.filter({ id: orderId });
      orderData = results[0];
    }

    if (!orderData) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (!adminEmail) {
      return Response.json({ error: 'Missing ADMIN_EMAIL secret' }, { status: 500 });
    }

    // Send via built-in SendEmail integration (no connector required)

    const isDelivery = orderData.order_type === 'delivery';

    const itemsHtml = (orderData.items || []).map(item => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;">${item.quantity} × ${item.item_name}</td>
        <td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">£${(item.item_total || 0).toFixed(2)}</td>
      </tr>
      ${(item.modifiers || []).map(m => `<tr><td colspan="2" style="padding:2px 0 2px 12px;color:#999;font-size:12px;">↳ ${m.group_name ? m.group_name + ': ' : ''}${m.option_name}${m.price_adjustment > 0 ? ' (+£' + m.price_adjustment.toFixed(2) + ')' : ''}</td></tr>`).join('')}
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,sans-serif;">
      <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:#dc2626;padding:20px 28px;display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-size:18px;font-weight:900;">M</span>
          </div>
          <div>
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase;letter-spacing:1px;">Marco's Pizzeria</p>
            <h1 style="margin:2px 0 0;color:#fff;font-size:18px;">New Order Received!</h1>
          </div>
        </div>

        <div style="padding:24px 28px;">
          <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
            <span style="background:#fef2f2;color:#dc2626;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;">
              ${isDelivery ? 'Delivery' : 'Collection'}
            </span>
            <span style="background:#f0fdf4;color:#16a34a;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;">
              ${orderData.payment_method === 'card' ? 'Card' : 'Cash'}
            </span>
            <span style="background:#f8fafc;color:#475569;padding:6px 14px;border-radius:20px;font-size:13px;">
              #${orderData.order_number || orderId?.slice(-6)}
            </span>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr>
              <td style="padding:4px 0;color:#888;font-size:13px;width:120px;">Customer</td>
              <td style="padding:4px 0;font-weight:600;color:#111;">${orderData.customer_name}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#888;font-size:13px;">Phone</td>
              <td style="padding:4px 0;font-weight:600;color:#111;">${orderData.customer_phone || '—'}</td>
            </tr>
            ${isDelivery && orderData.delivery_address ? `
            <tr>
              <td style="padding:4px 0;color:#888;font-size:13px;">Address</td>
              <td style="padding:4px 0;font-weight:600;color:#111;">${orderData.delivery_address}</td>
            </tr>` : ''}
            ${orderData.notes ? `
            <tr>
              <td style="padding:4px 0;color:#888;font-size:13px;">Notes</td>
              <td style="padding:4px 0;color:#dc2626;font-weight:600;">${orderData.notes}</td>
            </tr>` : ''}
          </table>

          <div style="background:#fafafa;border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 12px;font-weight:700;color:#111;font-size:14px;">Order Items</p>
            <table style="width:100%;border-collapse:collapse;">
              ${itemsHtml}
            </table>
            <div style="border-top:2px solid #e5e7eb;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;">
              <span style="font-weight:700;font-size:16px;color:#111;">Total</span>
              <span style="font-weight:800;font-size:18px;color:#dc2626;">£${(orderData.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:12px;">Marco's Pizzeria — Admin Notification</p>
        </div>
      </div>
    </body>
    </html>`;

    const subject = `New ${isDelivery ? 'Delivery' : 'Collection'} Order — £${(orderData.total || 0).toFixed(2)} — ${orderData.customer_name}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      from_name: "Marco's Orders",
      subject,
      body: html,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});