import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    let csvContent = body.csvContent;

    // If fileUrl provided, fetch the file
    if (body.fileUrl && !csvContent) {
      const fileRes = await fetch(body.fileUrl);
      if (!fileRes.ok) {
        return Response.json({ error: 'Failed to fetch CSV file' }, { status: 400 });
      }
      csvContent = await fileRes.text();
    }

    if (!csvContent) {
      return Response.json({ error: 'CSV content or fileUrl required' }, { status: 400 });
    }

    // Parse CSV
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return Response.json({ error: 'CSV must have header and data rows' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const priceIdx = headers.indexOf('price');
    const descIdx = headers.indexOf('description');
    const catIdx = headers.indexOf('category');
    const subCatIdx = headers.indexOf('subcategory');

    if (nameIdx === -1 || priceIdx === -1) {
      return Response.json({ error: 'CSV must have "name" and "price" columns' }, { status: 400 });
    }

    let synced = 0;
    let created = 0;
    let errors = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(v => v.trim());
      const name = row[nameIdx];
      const price = parseFloat(row[priceIdx]);
      const description = descIdx !== -1 ? row[descIdx] : '';
      const category = catIdx !== -1 ? row[catIdx] : 'Uncategorized';
      const subcategory = subCatIdx !== -1 ? row[subCatIdx] : null;

      if (!name || isNaN(price)) {
        errors.push(`Row ${i + 1}: Invalid name or price`);
        continue;
      }

      try {
        // Find existing item by name
        const existing = await base44.asServiceRole.entities.MenuItem.filter({ name });
        
        if (existing.length > 0) {
          // Update existing item
          await base44.asServiceRole.entities.MenuItem.update(existing[0].id, {
            base_price: price,
            description: description || existing[0].description,
            category: category || existing[0].category,
            subcategory: subcategory || existing[0].subcategory
          });
          synced++;
        } else {
          // Create new item
          await base44.asServiceRole.entities.MenuItem.create({
            name,
            description,
            category,
            subcategory,
            base_price: price,
            is_available: true,
            available_for_delivery: true,
            available_for_collection: true,
            modifier_groups: []
          });
          created++;
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${name}): ${err.message}`);
      }
    }

    return Response.json({
      success: true,
      synced,
      created,
      errors: errors.length > 0 ? errors : null,
      message: `Synced ${synced} items, created ${created} new items`
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});