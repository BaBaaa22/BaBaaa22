import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { checkout_id } = await req.json();

    const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkout_id}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUMUP_API_KEY')}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || 'Failed to fetch checkout' }, { status: 400 });
    }

    return Response.json({ status: data.status, checkout_id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});