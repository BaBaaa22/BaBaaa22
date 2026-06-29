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

A ready-to-apply unified diff is at [`../status-enum-reconciliation.patch`](../status-enum-reconciliation.patch). Apply it from the **app repo root** (where `src/` lives):

```sh
git apply docs/claude-integration/reference/status-enum-reconciliation.patch
```

It changes three files (display labels stay "Preparing"; only the stored value changes):
- `src/pages/AdminEPOS.jsx` — `STATUS_FLOW`, the `STATUS_CONFIG` key, the advance-label check, and the CURRENT tab filter: `preparing` → `in_kitchen`.
- `src/pages/AdminDashboard.jsx` — `openOrders` filter (drops the duplicate `preparing`) and the status-colour check.
- `src/pages/OrderStatus.jsx` — the customer stepper key `preparing` → `in_kitchen`.

> **Why three files, not two:** the app has **two** admin order screens. `AdminOrders.jsx` and `OrderHistory.jsx` already use the correct entity values (`in_kitchen`, `out_for_delivery`); only `AdminEPOS.jsx`, `AdminDashboard.jsx`, and the customer `OrderStatus.jsx` use `preparing`. So existing production data is almost certainly a **mix** of both values depending on which screen set the status — the backfill below is not optional.

**One-off data backfill (run BEFORE deploying the patch).** Update existing `preparing` orders to `in_kitchen` so the two screens agree. Via the Base44 MCP or a one-shot service-role function:

```ts
const stuck = await base44.asServiceRole.entities.Order.filter({ status: 'preparing' });
for (const o of stuck) {
  await base44.asServiceRole.entities.Order.update(o.id, { status: 'in_kitchen' });
}
```

**Out of scope (separate enhancement):** the EPOS flow and the customer stepper don't model `out_for_delivery` (the EPOS collapses delivery into `ready`). Reconciling `preparing` does **not** add `out_for_delivery` to those screens — that's a deliberate, separate UX change if you want delivery customers to see an "out for delivery" step.

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
