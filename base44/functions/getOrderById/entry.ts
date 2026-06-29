import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Use service role so guests can view their order by ID
    const orders = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    return Response.json({ order: orders[0] });
  } catch (error) {
    console.error('getOrderById error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});