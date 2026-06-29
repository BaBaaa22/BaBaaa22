import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categorySortOrder = [
      'Basic Pizza', 'Ham Pizza', 'Chicken Pizza', 'Hot & Spicy Pizza', 'Special Mix Pizza', 'Sea Food Pizza',
      'Garlic Bread', 'Kebabs', 'Burgers', 'Parmesan', 'Wraps', 'Potato Dishes', 'Special Dishes',
      'Appetisers', 'Breads', 'Tub Of Sauces', 'Kids Meals', 'Meal Deals', 'Desserts', 'Drinks'
    ];

    // Use LLM with internet search to get the full menu from the live website
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Go to https://mymarcos.co.uk/menu and extract the COMPLETE menu for ALL categories.

The categories are:
Basic Pizza, Ham Pizza, Chicken Pizza, Hot & Spicy Pizza, Special Mix Pizza, Sea Food Pizza, 
GARLIC BREAD, KEBABS, BURGERS, PARMESAN, WRAPS, POTATO DISHES, SPECIAL DISHES, 
APPETISERS, BREADS, TUB OF SAUCES, KIDS MEALS, MEAL DEALS, DESSERTS, DRINKS

For EVERY item in EVERY category, return:
- name: exact item name as shown (e.g. "10\\" Margherita", "Doner Kebab", "Chicken Burger")
- description: item description if present, else empty string
- category: the main category name (use title case, e.g. "Basic Pizza", "Kebabs", "Burgers", "Garlic Bread", "Potato Dishes", "Special Dishes", "Appetisers", "Breads", "Tub Of Sauces", "Kids Meals", "Meal Deals", "Desserts", "Drinks", "Wraps", "Parmesan")
- subcategory: the pizza/item variety grouping (strip size prefix like 10", 12", 14" from pizza names)
- base_price: numeric GBP price (e.g. 6.00), must be > 0
- is_vegetarian: true only if clearly vegetarian
- is_spicy: true only if clearly hot/spicy

Include EVERY item that has a price. This is critical — get ALL items from ALL 20 categories.
Return JSON only.`,
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
                category: { type: "string" },
                subcategory: { type: "string" },
                base_price: { type: "number" },
                is_vegetarian: { type: "boolean" },
                is_spicy: { type: "boolean" }
              },
              required: ["name", "category", "base_price"]
            }
          }
        }
      }
    });

    const items = (result?.items || []).filter(i => i.base_price > 0);
    console.log(`LLM extracted ${items.length} items`);

    if (items.length === 0) {
      return Response.json({ error: 'No items extracted' }, { status: 400 });
    }

    // Delete existing items
    let existingPage = await base44.asServiceRole.entities.MenuItem.list('created_date', 500);
    while (existingPage.length > 0) {
      await Promise.all(existingPage.map(i => base44.asServiceRole.entities.MenuItem.delete(i.id)));
      existingPage = await base44.asServiceRole.entities.MenuItem.list('created_date', 500);
    }

    // Assign sort orders by category
    const withSortOrder = items.map((item, idx) => {
      const catIdx = categorySortOrder.findIndex(c => c.toLowerCase() === item.category?.toLowerCase());
      return {
        name: item.name,
        description: item.description || '',
        category: item.category,
        subcategory: item.subcategory || '',
        base_price: item.base_price,
        is_vegetarian: item.is_vegetarian || false,
        is_spicy: item.is_spicy || false,
        is_available: true,
        available_for_delivery: true,
        available_for_collection: true,
        sort_order: catIdx >= 0 ? catIdx * 1000 + idx : 9999 + idx,
      };
    });

    // Bulk create in batches of 50
    let created = 0;
    const batchSize = 50;
    for (let i = 0; i < withSortOrder.length; i += batchSize) {
      await base44.asServiceRole.entities.MenuItem.bulkCreate(withSortOrder.slice(i, i + batchSize));
      created += Math.min(batchSize, withSortOrder.length - i);
    }

    return Response.json({ success: true, created, categories: [...new Set(items.map(i => i.category))] });
  } catch (error) {
    console.error('scrapeAndImportMenu error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});