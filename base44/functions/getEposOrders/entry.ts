import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 200);

    return Response.json({ orders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});