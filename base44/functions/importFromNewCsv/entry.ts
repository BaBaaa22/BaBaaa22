import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CAT_ORDER = [
  'BASIC PIZZAS', 'HAM PIZZAS', 'CHICKEN PIZZAS', 'SEAFOOD PIZZAS',
  'HOT AND SPICY PIZZAS', 'SPECIAL MIX PIZZAS', 'KEBABS', 'BURGERS',
  'GARLIC BREAD', 'PARMESAN', 'WRAPS', 'POTATO DISHES', 'SPECIAL DISHES',
  'APPETISERS', 'BREADS', 'TUB OF SAUCES', 'KIDS MEALS', 'MEAL DEALS',
  'DESSERTS', 'DRINKS',
];

const parseCSVLine = (line) => {
  const parts = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && inQ && line[i+1] === '"') { cur += '"'; i++; } // escaped quote ""
    else if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { parts.push(cur); cur = ''; }
    else { cur += c; }
  }
  parts.push(cur);
  return parts.map(p => p.trim());
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { csv_url } = await req.json();
    if (!csv_url) return Response.json({ error: 'csv_url required' }, { status: 400 });

    const csvText = await fetch(csv_url).then(r => r.text());
    const lines = csvText.split('\n');

    // Parse modifier groups from MODIFIER GROUPS section
    // Each MODIFIER row: TYPE,,,,,,Description,Position,,,,,,,,Description,,,,,,,,,,ID,Name,Type,Required,Min,Max,Active,Options
    // col indices (0-based): 0=TYPE, 6=Description, 22=?, 24=ID, 25=Name, 26=Type, 27=Required, 28=Min, 29=Max, 30=Active, 31=Options
    const modifierGroupsByName = {}; // name -> { name, is_required, min_selections, max_selections, options[] }

    let section = '';
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('SECTION,CATEGORIES')) { section = 'categories'; continue; }
      if (trimmed.startsWith('SECTION,MENU ITEMS')) { section = 'menu_items'; continue; }
      if (trimmed.startsWith('SECTION,MODIFIER GROUPS')) { section = 'modifiers'; continue; }
      if (trimmed.startsWith('SECTION,') ) { section = 'other'; continue; }
      if (trimmed.startsWith('HEADER,')) continue;

      if (section === 'modifiers' && trimmed.startsWith('MODIFIER,')) {
        const cols = parseCSVLine(rawLine);
        // col[25]=UUID, col[26]=Name, col[27]=Type, col[28]=Required, col[29]=Min, col[30]=Max, col[31]=Active, col[32]=Options
        const name = cols[26] || '';
        const type = (cols[27] || '').toUpperCase();
        const required = (cols[28] || '').toUpperCase() === 'YES';
        const minSel = parseInt(cols[29]) || 0;
        const maxSel = parseInt(cols[30]) || 0;
        const active = (cols[31] || '').toUpperCase() !== 'NO';
        const optionsStr = cols[32] || '';

        if (!name || !active) continue;

        // Parse options: "Name=Price, Name=Price, ..."
        const options = [];
        for (const opt of optionsStr.split(',')) {
          const eqIdx = opt.lastIndexOf('=');
          if (eqIdx === -1) {
            const n = opt.trim();
            if (n) options.push({ name: n, price_adjustment: 0, is_available: true });
          } else {
            const n = opt.substring(0, eqIdx).trim();
            const p = parseFloat(opt.substring(eqIdx + 1)) || 0;
            if (n) options.push({ name: n, price_adjustment: p, is_available: true });
          }
        }

        modifierGroupsByName[name] = {
          name,
          is_required: required,
          min_selections: minSel,
          max_selections: maxSel > 0 ? maxSel : options.length,
          options,
        };
      }
    }

    console.log(`Parsed ${Object.keys(modifierGroupsByName).length} modifier groups`);


    // Parse menu items from MENU ITEMS section
    // MENU_ITEM cols: 0=TYPE, 1=Category ID, 6=Description, 11=ID, 12=Name, 13=Category Path, 14=Category ID, 15=Description, 16=Price, 17=Available, 18=Vegetarian, 19=Spicy, 24=Modifier Groups (pipe-separated names)
    const menuItems = [];

    section = '';
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('SECTION,CATEGORIES')) { section = 'categories'; continue; }
      if (trimmed.startsWith('SECTION,MENU ITEMS')) { section = 'menu_items'; continue; }
      if (trimmed.startsWith('SECTION,MODIFIER GROUPS')) { section = 'modifiers'; continue; }
      if (trimmed.startsWith('SECTION,')) { section = 'other'; continue; }
      if (trimmed.startsWith('HEADER,')) continue;

      if (section === 'menu_items' && trimmed.startsWith('MENU_ITEM,')) {
        const cols = parseCSVLine(rawLine);
        const itemName = cols[12] || '';
        const categoryPath = cols[13] || '';
        if (!itemName || !categoryPath) continue;

        const pathParts = categoryPath.split('>').map(p => p.trim());
        const mainCategory = pathParts[0] || '';
        const subcategory = pathParts[1] || '';

        const description = (cols[15] || cols[6] || '').trim();
        const price = parseFloat(cols[16]) || 0;
        const available = (cols[17] || 'Yes').toLowerCase() === 'yes';
        const isVeg = (cols[18] || '').toLowerCase() === 'yes';
        const isSpicy = (cols[19] || '').toLowerCase() === 'yes';

        // Modifier groups: pipe-separated names in col 24
        const modGroupNames = (cols[24] || '').split('|').map(s => s.trim()).filter(Boolean);
        const itemModGroups = modGroupNames
          .map(n => modifierGroupsByName[n])
          .filter(Boolean);

        menuItems.push({
          name: itemName,
          description,
          category: mainCategory,
          subcategory,
          base_price: price,
          is_vegetarian: isVeg,
          is_spicy: isSpicy,
          is_available: available,
          available_for_delivery: true,
          available_for_collection: true,
          allergens: [],
          modifier_groups: itemModGroups,
          sort_order: 0,
        });
      }
    }

    console.log(`Parsed ${menuItems.length} menu items`);
    const withMods = menuItems.filter(i => i.modifier_groups.length > 0).length;
    console.log(`Items with modifiers: ${withMods}`);

    if (menuItems.length === 0) {
      return Response.json({ error: 'No menu items found in CSV' }, { status: 400 });
    }

    // Sort by category order
    menuItems.sort((a, b) => {
      const ai = CAT_ORDER.indexOf(a.category.toUpperCase());
      const bi = CAT_ORDER.indexOf(b.category.toUpperCase());
      return ((ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999)) || a.name.localeCompare(b.name);
    });
    menuItems.forEach((item, idx) => { item.sort_order = idx; });

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const retryCreate = async (batch, retries = 3) => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await base44.asServiceRole.entities.MenuItem.bulkCreate(batch);
          return;
        } catch (e) {
          if (attempt < retries - 1) {
            await sleep(2000 * (attempt + 1));
          } else throw e;
        }
      }
    };

    // Safe swap: create new items first, then delete old ones
    let created = 0;
    for (let i = 0; i < menuItems.length; i += 3) {
      const batch = menuItems.slice(i, i + 3);
      await retryCreate(batch);
      created += batch.length;
      await sleep(800);
    }

    // Delete old items (those created before the new batch)
    const existing = await base44.asServiceRole.entities.MenuItem.list('sort_order', 5000);
    const toDelete = existing.slice(0, existing.length - created);
    for (let i = 0; i < toDelete.length; i++) {
      await base44.asServiceRole.entities.MenuItem.delete(toDelete[i].id);
      if (i % 10 === 9) await sleep(500);
    }

    return Response.json({
      status: 'success',
      total: menuItems.length,
      created,
      modifier_groups_found: Object.keys(modifierGroupsByName).length,
      items_with_modifiers: withMods,
    });
  } catch (error) {
    console.error(error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});