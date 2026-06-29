import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { csv_url } = await req.json();
    if (!csv_url) return Response.json({ error: 'csv_url required' }, { status: 400 });

    // Fetch the CSV
    const csvRes = await fetch(csv_url);
    const csvText = await csvRes.text();

    // Parse CSV (handle quoted fields with embedded commas/newlines)
    function parseCSV(text) {
      const rows = [];
      let row = [];
      let field = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
          else if (ch === '"') { inQuotes = false; }
          else { field += ch; }
        } else {
          if (ch === '"') { inQuotes = true; }
          else if (ch === ',') { row.push(field); field = ''; }
          else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
          else if (ch === '\r') { /* skip */ }
          else { field += ch; }
        }
      }
      if (field || row.length) { row.push(field); rows.push(row); }
      return rows;
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) return Response.json({ error: 'CSV empty' }, { status: 400 });

    const headers = rows[0].map(h => h.trim());
    const get = (row, col) => (row[headers.indexOf(col)] || '').trim();

    // Parse custom_options field from Magento format
    // Returns array of modifier_groups in our schema format
    function parseCustomOptions(raw) {
      if (!raw) return [];
      // Split by pipe to get individual option declarations
      const parts = raw.split('|');
      // Group by "name=..." field to build modifier groups
      const groups = {};
      const groupOrder = [];

      for (const part of parts) {
        const fields = {};
        // Split by comma carefully — each field is key=value
        // Use regex to extract key=value pairs
        const matches = part.matchAll(/(\w+)=([^,]*(?:,[^=,]*)*?)(?=,\w+=|$)/g);
        for (const m of matches) {
          fields[m[1].trim()] = m[2].trim();
        }

        const groupName = fields['name'] || 'Options';
        const optionName = fields['custom_menu'] || fields['option_title'] || '';
        const priceAdj = parseFloat(fields['price']) || 0;
        const maxSel = parseInt(fields['maximum_option']) || 99;
        const required = fields['required'] === '1';

        if (!optionName) continue;

        if (!groups[groupName]) {
          groups[groupName] = {
            name: groupName,
            is_required: required,
            min_selections: required ? 0 : 0,
            max_selections: maxSel,
            options: [],
          };
          groupOrder.push(groupName);
        }

        groups[groupName].options.push({
          name: optionName,
          price_adjustment: priceAdj,
          is_available: true,
        });
        // Update max_selections in case it varies per line
        if (maxSel > 0) groups[groupName].max_selections = maxSel;
        if (required) groups[groupName].is_required = true;
      }

      return groupOrder.map(n => groups[n]);
    }

    // Extract category from Magento path: "marcopizzas.com/KIDS MEAL" -> "KIDS MEAL"
    function extractCategory(cat) {
      if (!cat) return 'Uncategorized';
      const parts = cat.split('/');
      return parts[parts.length - 1].trim() || 'Uncategorized';
    }

    // Detect size prefix to build subcategory
    function getSubcategory(name) {
      const sizeMatch = name.match(/^(\d+[""]?\s*[Ii]nch(?:es)?|\d+[""])\s+(.+)$/i);
      return sizeMatch ? sizeMatch[2].trim() : name.trim();
    }

    // Build menu items from CSV rows
    const inserts = [];
    let sortOrder = 0;

    // Category display order (customize as needed)
    const CAT_ORDER = [
      'PIZZAS', 'PIZZA', 'SIDES', 'BURGERS', 'WRAPS', 'KIDS MEAL',
      'CALZONE', 'SALAD', 'DESSERTS', 'DRINKS', 'MEAL DEALS', 'SPECIALS',
    ];

    const itemsByCategory = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue;

      const productOnline = get(row, 'product_online');
      if (productOnline === '0') continue; // skip disabled

      const name = get(row, 'name');
      if (!name) continue;

      const rawCat = get(row, 'categories');
      const category = extractCategory(rawCat);
      const subcategory = getSubcategory(name);
      const priceStr = get(row, 'price');
      const base_price = parseFloat(priceStr) || 0;
      const description = get(row, 'short_description') || get(row, 'description') || '';
      const customOptionsRaw = get(row, 'custom_options');
      const modifier_groups = parseCustomOptions(customOptionsRaw);

      if (!itemsByCategory[category]) itemsByCategory[category] = [];
      itemsByCategory[category].push({
        name,
        description,
        category,
        subcategory,
        base_price,
        is_vegetarian: false,
        is_spicy: false,
        is_available: true,
        available_for_delivery: true,
        available_for_collection: true,
        allergens: [],
        modifier_groups,
        sort_order: 0, // will set after ordering
      });
    }

    // Sort categories and assign sort_order
    const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
      const ai = CAT_ORDER.indexOf(a.toUpperCase());
      const bi = CAT_ORDER.indexOf(b.toUpperCase());
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    for (const cat of sortedCategories) {
      for (const item of itemsByCategory[cat]) {
        item.sort_order = sortOrder++;
        inserts.push(item);
      }
    }

    // Delete all existing menu items in parallel batches
    while (true) {
      const existing = await base44.asServiceRole.entities.MenuItem.list('', 50);
      if (!existing || existing.length === 0) break;
      // Delete in parallel batches of 5
      for (let d = 0; d < existing.length; d += 5) {
        await Promise.all(existing.slice(d, d + 5).map(e => base44.asServiceRole.entities.MenuItem.delete(e.id)));
      }
      if (existing.length < 50) break;
    }

    // BulkCreate all items in one call
    await base44.asServiceRole.entities.MenuItem.bulkCreate(inserts);
    const created = inserts.length;

    return Response.json({
      success: true,
      created,
      categories: sortedCategories,
    });
  } catch (error) {
    console.error('importMenuFromMagento error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});