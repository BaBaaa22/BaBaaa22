import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { category, sort_base } = await req.json();

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_1_pro',
      add_context_from_internet: true,
      prompt: `Visit https://mymarcos.co.uk/menu and find the section for "${category}".

List EVERY individual item in that category that has a price. For pizza items include ALL sizes (10", 12", 14").

Return a JSON object with an "items" array. Each item must have:
- name: exact item name as shown on the website (e.g. "10\\" Margherita", "Doner Kebab")
- description: the description shown beneath the item name (empty string if none)
- subcategory: the variety/group name (for pizzas strip the size prefix; for other items use the item name itself)
- base_price: the numeric GBP price (number, e.g. 6.50)
- is_vegetarian: boolean
- is_spicy: boolean

Be thorough — include every single item with a price shown in that category.`,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                subcategory: { type: "string" },
                base_price: { type: "number" },
                is_vegetarian: { type: "boolean" },
                is_spicy: { type: "boolean" }
              },
              required: ["name", "base_price"]
            }
          }
        }
      }
    });

    const rawItems = (result?.items || []).filter(i => i.base_price > 0);
    const items = rawItems.map((item, idx) => ({
      name: item.name,
      description: item.description || '',
      category,
      subcategory: item.subcategory || item.name,
      base_price: item.base_price,
      is_vegetarian: item.is_vegetarian || false,
      is_spicy: item.is_spicy || false,
      is_available: true,
      available_for_delivery: true,
      available_for_collection: true,
      sort_order: (sort_base || 0) + idx
    }));

    if (items.length === 0) {
      return Response.json({ error: 'No items found', category }, { status: 400 });
    }

    // Bulk create
    await base44.asServiceRole.entities.MenuItem.bulkCreate(items);

    return Response.json({ success: true, category, created: items.length, items: items.map(i => i.name) });
  } catch (error) {
    console.error('scrapeMenuCategory error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});