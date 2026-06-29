import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { menuItems, modifierOptions, itemModifiers } = await req.json();

    if (!menuItems || !Array.isArray(menuItems)) {
      return Response.json({ error: 'menuItems array required' }, { status: 400 });
    }

    // 1. Build options lookup: groupExportId -> sorted array of options
    const optionsByGroup = {};
    if (modifierOptions && Array.isArray(modifierOptions)) {
      modifierOptions.forEach(opt => {
        const gid = opt.groupExportId;
        if (!optionsByGroup[gid]) optionsByGroup[gid] = [];
        optionsByGroup[gid].push({
          name: opt.name?.trim(),
          price_adjustment: parseFloat(opt.priceAdjustment) || 0,
          is_available: opt.isAvailable === 'TRUE',
          _position: parseInt(opt.position) || 0,
        });
      });
      // sort each group's options by position
      Object.values(optionsByGroup).forEach(arr =>
        arr.sort((a, b) => a._position - b._position)
      );
    }

    // 2. Build groups lookup from item-modifiers: groupExportId -> { name, options }
    //    The item-modifiers CSV has modifierGroupExportId and modifierGroupName
    const groupById = {};
    if (itemModifiers && Array.isArray(itemModifiers)) {
      itemModifiers.forEach(im => {
        const gid = im.modifierGroupExportId;
        if (!groupById[gid]) {
          groupById[gid] = {
            name: im.modifierGroupName?.trim(),
            is_required: false,
            min_selections: 0,
            max_selections: 99,
            options: optionsByGroup[gid] || [],
          };
        }
      });
    }

    // 3. Build item -> ordered modifier group IDs map
    const itemModifierMap = {}; // itemExportId -> [{ groupExportId, position }]
    if (itemModifiers && Array.isArray(itemModifiers)) {
      itemModifiers.forEach(im => {
        const iid = im.itemExportId;
        if (!itemModifierMap[iid]) itemModifierMap[iid] = [];
        itemModifierMap[iid].push({
          groupExportId: im.modifierGroupExportId,
          position: parseInt(im.position) || 0,
        });
      });
      // sort by position
      Object.values(itemModifierMap).forEach(arr =>
        arr.sort((a, b) => a.position - b.position)
      );
    }

    // 4. Group menu items by category and subcategory (base name stripped of size prefix)
    const itemsByCategory = {}; // { category: { baseName: { description, items[] } } }

    menuItems.forEach(item => {
      if (item.isAvailable !== 'TRUE') return;

      const cat = item.categoryName?.trim() || 'Uncategorized';
      if (!itemsByCategory[cat]) itemsByCategory[cat] = {};

      // Detect size prefix: "10inch", "12inch", "9 Inch", "7 Inch", "10\"", "12\"", etc.
      const sizeMatch = item.name.match(/^(\d+["'"]?\s*[Ii]nch(?:es)?|\d+["'"])\s+(.+)$/i);
      const baseName = sizeMatch ? sizeMatch[2].trim() : item.name.trim();

      if (!itemsByCategory[cat][baseName]) {
        itemsByCategory[cat][baseName] = {
          description: item.description?.trim() || '',
          items: [],
        };
      }

      itemsByCategory[cat][baseName].items.push({
        exportId: item.exportId,
        name: item.name.trim(),
        base_price: parseFloat(item.basePrice) || 0,
        allergens: item.allergens
          ? item.allergens.split(',').map(a => a.trim()).filter(Boolean)
          : [],
        is_spicy: item.isSpicy === 'TRUE',
        is_vegetarian: item.isVegetarian === 'TRUE',
      });
    });

    // 5. Delete all existing menu items
    let page = 0;
    while (true) {
      const existing = await base44.asServiceRole.entities.MenuItem.list('', 200);
      if (!existing || existing.length === 0) break;
      await Promise.all(existing.map(e => base44.asServiceRole.entities.MenuItem.delete(e.id)));
      if (existing.length < 200) break;
    }

    // 6. Insert new items
    let created = 0;
    let sortOrder = 0;
    const inserts = [];

    for (const [category, subcategories] of Object.entries(itemsByCategory)) {
      for (const [subcategoryName, subcatData] of Object.entries(subcategories)) {
        for (const item of subcatData.items) {
          const modGroups = (itemModifierMap[item.exportId] || [])
            .map(({ groupExportId }) => groupById[groupExportId])
            .filter(Boolean);

          inserts.push({
            name: item.name,
            description: subcatData.description || '',
            category,
            subcategory: subcategoryName,
            base_price: item.base_price,
            is_vegetarian: item.is_vegetarian,
            is_spicy: item.is_spicy,
            is_available: true,
            available_for_delivery: true,
            available_for_collection: true,
            allergens: item.allergens,
            modifier_groups: modGroups,
            sort_order: sortOrder++,
          });
        }
      }
    }

    // Batch insert in chunks of 20 to avoid timeouts
    const chunkSize = 20;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      await Promise.all(chunk.map(data => base44.asServiceRole.entities.MenuItem.create(data)));
      created += chunk.length;
    }

    return Response.json({
      success: true,
      created,
      categories: Object.keys(itemsByCategory).length,
      modifier_groups_found: Object.keys(groupById).length,
    });
  } catch (error) {
    console.error('importMenuFromCSV error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});