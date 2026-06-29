// base44/functions/generateItemDescription/entry.ts
//
// Powers the "Generate using AI" button on the AdminMenu Edit Item form
// (matches the My Business Hub reference). Given an item's name/category/flags,
// Claude writes a short, appetising menu description. Admin-only.
//
// Secret required (Base44 secrets): ANTHROPIC_API_KEY
//
// Frontend call:  base44.functions.invoke('generateItemDescription', { name, category, is_vegetarian, is_spicy, allergens })
// Returns:        { description: string }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Menu editing is admin-only — gate the generator the same way.
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { name, category, is_vegetarian, is_spicy, allergens } = await req.json();
    if (!name) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Missing ANTHROPIC_API_KEY secret' }, { status: 500 });
    }

    const traits = [
      category ? `category: ${category}` : null,
      is_vegetarian ? 'vegetarian' : null,
      is_spicy ? 'spicy' : null,
      Array.isArray(allergens) && allergens.length ? `contains: ${allergens.join(', ')}` : null,
    ].filter(Boolean).join('; ');

    const anthropicReq = {
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      system:
        'You write short, appetising menu descriptions for a UK takeaway. ' +
        'One or two sentences, max ~30 words. Sensory and specific, no emojis, no quotation marks, ' +
        'no price, no marketing clichés ("mouth-watering", "to die for"). British English. ' +
        'Return only the description text.',
      messages: [
        {
          role: 'user',
          content: `Item: ${name}${traits ? `\nTraits: ${traits}` : ''}`,
        },
      ],
    };

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicReq),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json({ error: 'Anthropic call failed', detail }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
      .trim()
      .replace(/^["']|["']$/g, ''); // strip stray wrapping quotes

    if (!text) {
      return Response.json({ error: 'Empty response' }, { status: 502 });
    }

    return Response.json({ description: text, usage: data.usage });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
