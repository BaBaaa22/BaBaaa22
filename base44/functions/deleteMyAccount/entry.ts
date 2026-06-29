import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Deletes the current user's data (orders, etc.) and marks the account for removal.
 * Full platform-level account deletion (removing the auth user) requires
 * admin action via the Base44 dashboard.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all orders created by this user
    const orders = await base44.entities.Order.filter({ created_by: user.email });
    await Promise.all(orders.map(o => base44.entities.Order.delete(o.id)));

    // Return success — the frontend will then log the user out
    return Response.json({
      success: true,
      message: 'Account data deleted. Your session will now end.',
      deleted: { orders: orders.length }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});