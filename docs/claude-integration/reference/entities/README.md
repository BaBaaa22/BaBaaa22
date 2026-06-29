# Entity changes — draft schemas & migration notes

Ready-to-apply Base44 entity definitions for the prerequisites in the audit
([`../../02-systems-audit.md`](../../02-systems-audit.md#prerequisites-before-the-blocked-items)).
**These are drafts — nothing here has been applied to the live Base44 app.**

| File | Change | Type | When |
|---|---|---|---|
| `Order.jsonc` | + `ai_*` fields, + `status_history` | Modify (additive) | Phase 0 / 1 (T1, workforce) |
| `MenuItem.jsonc` | + `cost` | Modify (additive) | When you start margin analysis |
| `MenuItemCost.jsonc` | New (privacy-preserving alt to `MenuItem.cost`) | New | Pick this **or** `MenuItem.cost`, not both |
| `Insight.jsonc` | New | New | Phase 3 (analytics dashboard) |
| `InventoryItem.jsonc` | New | New | Defer (true inventory) |
| `Customer.jsonc` | New | New / optional | Defer (CLV/segmentation) — decision required |

---

## Three decisions baked into these drafts

### 1. Status-enum reconciliation — this is a CODE fix, not a schema change

The `Order` entity enum is already correct (`received, in_kitchen, out_for_delivery, ready, completed, cancelled`). The mismatch is that the **EPOS UI writes `preparing`** instead of `in_kitchen`.

**Recommended (and what `Order.jsonc` assumes):** leave the enum as-is and fix the UI.
- `src/pages/AdminEPOS.jsx`: change `STATUS_FLOW = ['received','preparing','ready','completed']` → `['received','in_kitchen','ready','completed']`, and the `STATUS_CONFIG` key `preparing` → `in_kitchen` (keep the label "Preparing" for display).
- `src/pages/AdminDashboard.jsx`: change the `openOrders` filter `['received','in_kitchen','ready','preparing']` → `['received','in_kitchen','ready']`.
- One-off data fix: update any existing orders with `status: "preparing"` to `in_kitchen`.

**Alternative (not recommended):** add `"preparing"` to the entity enum. This leaves two synonyms forever and makes every status-driven query/automation handle both. Only do this if changing the UI is genuinely off the table.

Either way, **T4 (AI status copy) and workforce analytics need this resolved first**, because a status-change automation must match the value the UI actually writes.

### 2. Where COGS lives — `MenuItem.cost` vs `MenuItemCost`

`MenuItem` read RLS is **public** for available items, so a `cost` field on it is readable by anyone (competitors can derive your margins). Choose:
- **`MenuItem.cost`** — simplest, one field, but COGS is public.
- **`MenuItemCost`** (separate admin-only entity) — recommended; analytics joins on `menu_item_id`; COGS stays private.

The drafts include both so you can pick. **Apply only one.**

### 3. `Customer` entity — privacy trade-off

Building a persistent per-customer profile (CLV/segmentation) is a data-protection decision, not just a technical one. If you adopt `Customer.jsonc`:
- Decide the canonical key (phone or `created_by` email) and be consistent.
- Extend `deleteMyAccount` (existing function) to also delete the matching `Customer` row.
- Cover it in the privacy policy.

---

## How to apply (when you're ready)

**Option A — Git/repo (preferred, reviewable):** copy the chosen files into the app's `base44/entities/` directory and push. Per the project README, "Any change pushed to the repo will also be reflected in the Base44 Builder." This gives you a reviewable diff and a rollback point.

**Option B — Base44 MCP / Builder:** apply with the Base44 MCP `update_entity_schema` (for `Order`/`MenuItem`) and `create_entity_schema` (for the new entities), or edit in the Base44 Builder UI. Faster, but no PR review.

**Order of operations:**
1. Apply `Order.jsonc` additions (safe — all optional). Deploy `claudeAssist` (T1) against it.
2. Do the status-enum UI fix + data backfill.
3. When starting analytics: add `Insight`, stand up n8n.
4. When starting margin work: add `MenuItem.cost` **or** `MenuItemCost`, backfill costs.
5. Defer `InventoryItem` and `Customer` until their domains are prioritised.

## Safety / rollback

- All `Order` and `MenuItem` changes are **additive and optional** — existing rows and the live ordering path are unaffected (new fields read as null/absent).
- New entities are inert until something writes to them.
- The one change that touches behaviour is the status-enum UI fix — test it on the EPOS before deploying, since it changes what value the status buttons write.
- No `required[]` field is added to any existing entity, so no existing create/update call can break.
