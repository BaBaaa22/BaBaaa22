import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only allow admins to import
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const menuData = body.menuData;

    if (!menuData || !menuData.menuItems || !Array.isArray(menuData.menuItems)) {
      return Response.json({ error: 'Invalid menu data structure' }, { status: 400 });
    }

    // Transform JSON items to MenuItem entity format
    const itemsToCreate = menuData.menuItems.map((item, index) => {
      const categoryPath = item.categoryPath || '';
      const [mainCategory, subcategory] = categoryPath.split('>').map(s => s.trim());

      // Build modifier groups with proper structure
      let modifierGroups = [];
      if (item.modifierGroups && Array.isArray(item.modifierGroups)) {
        modifierGroups = item.modifierGroups.map(mg => ({
          name: mg.name || '',
          is_required: mg.is_required || false,
          min_selections: mg.min_selections || 0,
          max_selections: mg.max_selections || 1,
          options: (mg.options && Array.isArray(mg.options)) ? mg.options.map(opt => ({
            name: opt.name || '',
            price_adjustment: opt.price_adjustment || 0,
            is_available: opt.is_available !== false
          })) : []
        }));
      }

      return {
        name: item.name,
        description: item.description || '',
        category: mainCategory || 'Uncategorized',
        subcategory: subcategory || null,
        base_price: parseFloat(item.basePrice) || 0,
        is_vegetarian: item.isVegetarian || false,
        is_spicy: item.isSpicy || false,
        is_available: item.isAvailable !== false,
        available_for_delivery: item.isAvailable !== false,
        available_for_collection: item.isAvailable !== false,
        allergens: item.allergens || [],
        modifier_groups: modifierGroups,
        sort_order: index
      };
    });

    // Bulk create items
    const result = await base44.asServiceRole.entities.MenuItem.bulkCreate(itemsToCreate);

    return Response.json({
      success: true,
      itemsCreated: itemsToCreate.length,
      message: `Successfully imported ${itemsToCreate.length} menu items`
    });

  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});