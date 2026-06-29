import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const order = body.data;

    if (!order) {
      return Response.json({ error: 'No order data' }, { status: 400 });
    }

    const itemsHtml = (order.items || []).map(item => {
      const mods = (item.modifiers || []).map(m => `<li style="color:#666;font-size:13px;">- ${m.option_name}</li>`).join('');
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            <strong>${item.quantity} x ${item.item_name}</strong>
            ${mods ? `<ul style="margin:4px 0 0 0;padding:0;list-style:none;">${mods}</ul>` : ''}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">
            £${(item.item_total || 0).toFixed(2)}
          </td>
        </tr>`;
    }).join('');

    const orderHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:30px;border-radius:8px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#d92b3a;margin:0;font-size:28px;">Marco's</h1>
          <p style="color:#666;margin:6px 0 0;">Order Confirmation</p>
        </div>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0;font-size:13px;color:#666;">Order ID: <strong>${order.order_number || 'N/A'}</strong></p>
          <p style="margin:4px 0 0;font-size:13px;color:#666;">Type: <strong>${(order.order_type || '').toUpperCase()}</strong></p>
          ${order.delivery_address ? `<p style="margin:4px 0 0;font-size:13px;color:#666;">Delivery to: <strong>${order.delivery_address}</strong></p>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${itemsHtml}
        </table>
        <div style="margin-top:16px;border-top:2px solid #eee;padding-top:12px;">
          ${order.delivery_charge > 0 ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:#666;margin-bottom:4px;"><span>Delivery charge</span><span>£${(order.delivery_charge || 0).toFixed(2)}</span></div>` : ''}
          ${order.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:#d92b3a;margin-bottom:4px;"><span>Discount</span><span>-£${(order.discount_amount || 0).toFixed(2)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;margin-top:8px;">
            <span>Total</span><span>£${(order.total || 0).toFixed(2)}</span>
          </div>
        </div>
        ${order.notes ? `<div style="margin-top:16px;background:#fff8e1;padding:12px;border-radius:6px;"><p style="margin:0;font-size:13px;"><strong>Notes:</strong> ${order.notes}</p></div>` : ''}
        <p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">Thank you for ordering from Marco's! 🍕</p>
      </div>`;

    const promises = [];

    // Email to customer
    if (order.customer_email) {
      promises.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          to: order.customer_email,
          from_name: "Marco's Pizzeria",
          subject: `Order Confirmed – ${order.order_number || "Marco's"}`,
          body: orderHtml,
        })
      );
    }

    // Email to admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) {
      promises.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail,
          from_name: "Marco's Orders",
          subject: `New Order #${order.order_number || ''} – £${(order.total || 0).toFixed(2)} (${order.order_type})`,
          body: orderHtml,
        })
      );
    }

    await Promise.all(promises);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});