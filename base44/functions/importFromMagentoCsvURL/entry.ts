import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { csv_url } = await req.json();
    if (!csv_url) {
      return Response.json({ error: 'csv_url is required' }, { status: 400 });
    }

    // Fetch CSV content
    const csvRes = await fetch(csv_url);
    const csvText = await csvRes.text();
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);

    // Parse a CSV line handling quoted fields
    const parseCSVLine = (line) => {
      const parts = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      return parts;
    };

    // Helper: find the column index containing "CATEGORY > Item" pattern
    // e.g. "BASIC PIZZAS > Margherita"
    const findCategoryCol = (parts) => {
      for (let i = 0; i < parts.length; i++) {
        const v = parts[i]?.trim() || '';
        if (v.includes(' > ')) return i;
      }
      return -1;
    };

    // Helper: find description col = category col - 1
    // For variation rows: category col - 1 = description (e.g. "Tomato And Cheese")
    // For flat rows: category col - 1 = blank or a description

    // Group rows by item name
    const itemMap = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = parseCSVLine(line);
      if (parts.length < 10) continue;

      const itemName = parts[0]?.trim();
      if (!itemName || itemName === 'Item name') continue;

      // Find category dynamically
      const catCol = findCategoryCol(parts);
      if (catCol === -1) continue;

      const categoryPath = parts[catCol].trim();
      const description  = catCol > 0 ? (parts[catCol - 1]?.trim() || '') : '';
      const variationType = parts[1]?.trim() || '';
      const sizeLabel    = parts[2]?.trim() || '';

      // Price is at col[10] for variation rows (e.g. "6.4", "8.9", "12")
      // For flat items col[10] is blank — price not stored in CSV, default to 0
      const priceRaw = parts[10]?.trim() || '';
      const price = parseFloat(priceRaw) || 0;

      if (!itemMap[itemName]) {
        itemMap[itemName] = { categoryPath, description, sizes: [], flatPrice: null };
      }

      if (variationType === 'Size' && sizeLabel && price > 0) {
        // Deduplicate sizes
        const alreadyHasSize = itemMap[itemName].sizes.some(s => s.name === sizeLabel);
        if (!alreadyHasSize) {
          itemMap[itemName].sizes.push({ name: sizeLabel, price });
        }
      } else if (!variationType) {
        if (price > 0 && !itemMap[itemName].flatPrice) {
          itemMap[itemName].flatPrice = price;
        }
        // Update description if we have one
        if (description && !itemMap[itemName].description) {
          itemMap[itemName].description = description;
        }
      }
    }

    // Convert to MenuItem records
    const menuItems = [];
    const categoryOrder = [
      'BASIC PIZZAS', 'HAM PIZZAS', 'CHICKEN PIZZAS', 'SEAFOOD PIZZAS',
      'HOT & SPICY PIZZAS', 'SPECIAL MIX PIZZAS', 'KEBABS', 'BURGERS',
      'GARLIC BREAD', 'PARMESAN', 'WRAPS', 'POTATO DISHES', 'SPECIAL DISHES',
      'APPETISERS', 'BREADS', 'TUB OF SAUCES', 'KIDS MEALS', 'MEAL DEALS',
      'DESSERTS', 'DRINKS'
    ];

    for (const [itemName, data] of Object.entries(itemMap)) {
      const categoryParts = data.categoryPath.includes('>')
        ? data.categoryPath.split('>').map(c => c.trim())
        : [data.categoryPath.trim()];
      const mainCategory = categoryParts[0] || '';
      const subCategory  = categoryParts[1] || mainCategory;

      if (!mainCategory || mainCategory.length < 2) continue;

      if (data.sizes.length > 0) {
        for (const size of data.sizes) {
          menuItems.push({
            name: `${itemName} (${size.name})`,
            base_price: size.price,
            category: mainCategory,
            subcategory: subCategory,
            description: data.description || itemName,
            is_available: true, is_vegetarian: false, is_spicy: false,
            allergens: [], available_for_delivery: true,
            available_for_collection: true, modifier_groups: [], sort_order: 0,
          });
        }
      } else {
        menuItems.push({
          name: itemName,
          base_price: data.flatPrice ?? 0,
          category: mainCategory,
          subcategory: subCategory,
          description: data.description || itemName,
          is_available: true, is_vegetarian: false, is_spicy: false,
          allergens: [], available_for_delivery: true,
          available_for_collection: true, modifier_groups: [], sort_order: 0,
        });
      }
    }

    // Sort and assign sort_order
    menuItems.sort((a, b) => {
      const ai = categoryOrder.indexOf(a.category.toUpperCase());
      const bi = categoryOrder.indexOf(b.category.toUpperCase());
      if (ai !== bi) return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
      return a.name.localeCompare(b.name);
    });
    menuItems.forEach((item, idx) => { item.sort_order = idx; });

    // Delete existing and bulk-create new
    const existing = await base44.asServiceRole.entities.MenuItem.list(null, 1000);
    if (existing.length > 0) {
      await Promise.all(existing.map(item => base44.asServiceRole.entities.MenuItem.delete(item.id)));
    }

    let created = 0;
    for (let i = 0; i < menuItems.length; i += 50) {
      await base44.asServiceRole.entities.MenuItem.bulkCreate(menuItems.slice(i, i + 50));
      created += menuItems.slice(i, i + 50).length;
    }

    return Response.json({
      status: 'success',
      message: `Imported ${created} menu items from CSV`,
      total: menuItems.length,
      items: created,
    });
  } catch (error) {
    console.error('importFromMagentoCsvURL error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});