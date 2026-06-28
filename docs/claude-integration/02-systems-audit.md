# 2. Technical Systems Audit

A factual map of the Marco's Express Base44 architecture as it exists in this repository, plus a ranked list of where Claude AI can be inserted. Every field name and path below is taken from the actual source.

---

## 2.1 Database schema & data models

Base44 entities live in `base44/entities/*.jsonc`. Eight entities exist.

### `Order` — the core transactional entity (`base44/entities/Order.jsonc`)

| Field | Type | Notes |
|---|---|---|
| `order_number` | string | Human-facing id |
| `order_type` | enum | `delivery` \| `collection` (required) |
| `status` | enum | `received` \| `in_kitchen` \| `out_for_delivery` \| `ready` \| `completed` \| `cancelled` (default `received`) |
| `customer_name` | string | required |
| `customer_phone` | string | required |
| `customer_email` | string | optional — **gates status emails** (`notifyCustomerStatusUpdate` skips if absent) |
| `delivery_address`, `delivery_postcode` | string | delivery only |
| `items[]` | array | `{ item_name, quantity, base_price, modifiers[]{group_name,option_name,price_adjustment}, item_total }` |
| `subtotal`, `delivery_charge`, `discount_amount`, `total` | number | money |
| `coupon_code` | string | links to `Coupon.code` (denormalised, no FK) |
| `payment_method` | enum | `card` \| `cash` |
| `payment_status` | enum | `pending` \| `paid` \| `refunded` (default `pending`) |
| `notes` | string | **free-text customer input — untrusted** |

**RLS:** create open; read = own (`created_by == {{user.email}}`) or admin; update/delete = admin only.

> ⚠️ **Status-enum mismatch (real gap).** The `Order` entity enum is `received, in_kitchen, out_for_delivery, ready, completed, cancelled`. But `src/pages/AdminEPOS.jsx` defines `STATUS_FLOW = ['received','preparing','ready','completed']` and `AdminDashboard.jsx` filters `['received','in_kitchen','ready','preparing']`. So `preparing` (UI) and `in_kitchen` (entity) are used interchangeably and `out_for_delivery` is unused in the EPOS flow. This must be reconciled before status-driven AI automations are reliable — otherwise a status-change trigger may never fire for the value the UI actually writes. **Flagged as a prerequisite for T4.**

### `MenuItem` (`base44/entities/MenuItem.jsonc`)

`name`, `description`, `category`, `subcategory`, `base_price`, `is_vegetarian`, `is_spicy`, `is_available`, `available_for_delivery`, `available_for_collection`, `allergens[]`, `modifier_groups[]` (`name, is_required, min/max_selections, options[]{name, price_adjustment, is_available}`), `sort_order`.

> ⚠️ **No cost/COGS field and no stock-count field.** `MenuItem` has `base_price` but **no `cost`/`food_cost`** and **no `stock_level`/`quantity_on_hand`**. Consequences:
> - **Margin analysis is blocked** until a `cost` field is added — Claude cannot compute true profitability, only revenue.
> - **Inventory forecasting is advisory-only** — there is no stock entity to decrement or reconcile against. Claude can predict *demand* from order history but cannot manage *stock* until an `InventoryItem` entity exists.
> Both are listed as prerequisites in §2.4 and [`05`](./05-strategic-analytics-framework.md).

### Other entities

- **`User`** — `role: admin | user`. The entire EPOS authorisation model rests on this single field.
- **`StoreSettings`** — `store_name`, `phone`, `address`, `shop_postcode`, `is_open`, `allow_preorders`, `opening_hours[]`, `delivery_zones[]` / `distance_zones[]`, `use_distance_zones`, `default_delivery_charge`, `minimum_delivery_order`, `accept_card/cash`, `offer_banner_text/active`. Read is public (`read: {}`). This is Claude's source of truth for hours/delivery answers in T3.
- **`Coupon`** — `code`, `discount_type`, `discount_value`, `min_order_value`, `free_delivery`, `applies_to`, `coupon_type` (`basic`/`one_time`/`per_customer`), `expiry_date`, `is_active`.
- **`Discount`** — time/day-windowed automatic discounts (`days_of_week[]`, `start_time`, `end_time`, `first_time_only`).
- **`ShopApplication`** — onboarding for a multi-tenant story (shop signup, payment provider, menu CSV url). Indicates the app is built to host multiple shops.
- **`PaymentGateway`** — `provider` (stripe/paypal/square/sumup/worldpay/opayo/neropay), keys, `mode`. **Holds secrets** — admin-only RLS; never expose to Claude.

> ⚠️ **No `Customer` entity.** Customers are denormalised onto each `Order` (`customer_name/phone/email`, plus `created_by`). There is no loyalty/CLV record, no order-history rollup. For customer segmentation and lifetime-value analytics (domain in [`05`](./05-strategic-analytics-framework.md)), `customer_phone` (or `created_by` email) is the natural join key, but a `Customer` aggregate entity will eventually be needed.

---

## 2.2 API endpoints & authentication

### Existing backend functions (`base44/functions/*/entry.ts`) — 23 total

| Function | Purpose | Auth | Relevant to AI |
|---|---|---|---|
| `getEposOrders` | List last 200 orders for EPOS | admin (`auth.me()` + role) | **read surface for AI-enriched orders** |
| `getOrderById` | Fetch single order | — | customer order-status (T3) |
| `notifyAdminNewOrder` | Email admin on new order | **entity automation** payload `{event,data,old_data}` | **template to clone for `claudeAssist` (T1)** |
| `notifyCustomerStatusUpdate` | Email customer on status change | admin | **extend with AI copy (T4)** |
| `sendOrderEmail` | Order confirmation email | — | — |
| `getDeliveryFee` | Distance/zone delivery fee | — | feeds T2 checkout context |
| `placesAutocomplete`, `placesDetails` | Google Places address | — | — |
| `neropayCreateCheckout`, `neropayGetPayment`, `neropayIPN`, `sumupCreateCheckout`, `sumupGetCheckout`, `syncPaymentStatus` | Payments | — | out of AI scope (secrets) |
| `importMenuFromCSV`, `importMenuFromJSON`, `importMenuFromMagento`, `importFromNewCsv`, `importFromMagentoCsvURL`, `syncMenuFromCSV`, `scrapeMenuCategory`, `scrapeAndImportMenu` | Menu import/scrape | admin | one-off; AI could clean imports (low priority) |
| `deleteMyAccount` | GDPR delete | user | — |

**Auth mechanisms in place:**
- **Function auth:** Base44 SDK token via `createClientFromRequest(req)` + `base44.auth.me()`; admin gating by `user.role`. This is the only auth layer and it is consistent across functions.
- **Service-role:** `base44.asServiceRole.entities.*` bypasses RLS for trusted server work (used by `getEposOrders`, `notifyAdminNewOrder`).
- **Secrets:** `Deno.env.get('ADMIN_EMAIL')` pattern. No secret currently in the browser bundle.
- **Entity automations:** Base44's native onCreate/onUpdate hooks. `notifyAdminNewOrder` proves the pattern, including the `payload_too_large` fallback (refetch by `body.event.entity_id`).

**Response format:** all functions return `Response.json(...)` with conventional status codes (403 forbidden, 404 not found, 500 error). No documented rate limits at the function layer — **add a per-day spend guard for AI calls** (§1.5).

**Gaps where endpoints must be created:**

| Needed | New function |
|---|---|
| T1 order classification | `claudeAssist` (onCreate automation) — see [`reference/claudeAssist.entry.ts`](./reference/claudeAssist.entry.ts) |
| T2 checkout upsell | `suggestUpsell` (sync, called from `Checkout.jsx`) |
| T3 support chat | `customerAssistant` (sync, streamed) |
| T5 smart search | `smartMenuSearch` (sync, called from `MenuPage.jsx`) |
| T6/T7 analytics writeback | `Insight` entity + n8n writes (no function strictly required if n8n uses a service token) |

---

## 2.3 Data-flow diagrams

### Order creation (real-time) — current

```
MenuPage/CartPanel ─Order.create()→ Order(status=received)
                                         │ (entity automation, existing)
                                         ▼
                                  notifyAdminNewOrder() ──SendEmail──▶ admin inbox
EPOS poll (getEposOrders / 30s) ◀──── Order
Admin sets status ──Order.update()──▶ status change
                                         │ (automation)
                                         ▼
                                  notifyCustomerStatusUpdate() ──SendEmail──▶ customer
```

### Order creation — with Claude (proposed, additive)

```
Order.create(status=received)
   ├─▶ notifyAdminNewOrder()            (unchanged)
   └─▶ claudeAssist()  ──Anthropic──▶  {station, prep_min, ticket_groups, allergens}
                         Order.update({ai_station, ai_prep_time, ai_ticket_groups, ai_allergen_flags})
                                         │
EPOS reads enriched Order ◀──────────────┘  (renders station colour, ETA, allergen badge)
```

Two automations fire on the same create event in parallel; neither blocks the customer.

### Inventory / menu availability (current)

There is **no inventory transaction flow**. Availability is a manual boolean: an admin toggles `MenuItem.is_available` in `AdminMenu.jsx`. There is no decrement-on-order, no reorder point, no stock ledger. This is the single biggest structural gap for the "inventory management" trigger point — it is currently a *manual process with no data to automate against*.

### Customer query (current)

No in-app support channel exists. A customer checks status via `OrderStatus.jsx` / `getOrderById` (polling) or the status emails. T3 adds a chat function.

**Real-time vs batch:** order/status flows are real-time (event + 30s poll). Menu import and any analytics are batch. There are no existing scheduled jobs — n8n introduces the first ones (T6/T7).

---

## 2.4 Automation opportunity analysis (ranked)

Each opportunity scored on **Ease** (1=hard, 5=trivial), **Impact**, and mapped to a trigger point. "Feasible now" = no schema/data prerequisite.

| Rank | Opportunity | Trigger | Ease | Impact | Feasible now? | Why feasible / blocker |
|---|---|---|---|---|---|---|
| 1 | **Kitchen ticket routing + prep ETA** | order processing (T1) | 4 | High | ✅ Yes | Order `items[]` + `MenuItem` categories already exist; pure classification. Clone `notifyAdminNewOrder` automation. |
| 2 | **Checkout upsell** | order processing (T2) | 4 | High | ✅ Yes | Cart + menu + `StoreSettings` hours all available; one sync function. Direct revenue. |
| 3 | **Smarter status messages** | order status (T4) | 4 | Medium | ⚠️ After enum fix | Extend `notifyCustomerStatusUpdate`; **blocked by the `preparing`/`in_kitchen` mismatch** (§2.1). |
| 4 | **Smart menu search / NL recommendations** | customer support (T5) | 3 | Medium | ✅ Yes | `MenuItem` has `is_vegetarian/is_spicy/allergens/category`; enough to answer "spicy veggie under £8". |
| 5 | **Customer support chat (status/allergen/hours)** | customer support (T3) | 3 | Medium | ✅ Yes | `StoreSettings` (public read) + own-`Order` RLS give safe grounding. |
| 6 | **Nightly sales/anomaly digest** | analytics (T6) | 3 | Medium | ✅ Yes | All order data present; n8n cron + Sonnet. Foundation for the dashboard. |
| 7 | **Allergen safety double-check** | order processing | 4 | High (safety) | ✅ Yes | `MenuItem.allergens` + `Order.notes` ("no nuts") — flag conflicts to staff. Cheap, high-trust. |
| 8 | **Demand forecast / prep planning** | inventory (T7) | 2 | High | ⚠️ Partial | Demand from order history is feasible; **true stock management blocked — no `cost`/`stock` fields** (§2.1). |
| 9 | **Menu-import cleanup** | (ops) | 3 | Low | ✅ Yes | Normalise scraped CSV categories/allergens. One-off, low urgency. |
| 10 | **Margin/menu-engineering analytics** | analytics | 2 | High | ❌ No | **Blocked — `MenuItem` has no `cost`.** Add `cost` field first. |

### Prerequisites before the blocked items

1. **Reconcile order status values** (entity enum vs EPOS UI) — unblocks T4 and reliable status analytics.
2. **Add `MenuItem.cost`** (number, food cost) — unblocks margin and menu-engineering analytics.
3. **Add an `InventoryItem` entity** (`name`, `unit`, `stock_level`, `reorder_point`, `linked_menu_items[]`) and decrement on order — unblocks real inventory management (large; defer).
4. **Add an `Insight` entity** (`type`, `period`, `payload_json`, `confidence`, `created_date`) — lands n8n analytics output for the dashboard to read.
5. **(Optional) `Customer` aggregate entity** keyed on phone/email — unblocks CLV/segmentation.

### Most immediately actionable

**T1 (kitchen routing), T2 (upsell), and T7-allergen-check (#7)** require **zero schema changes** and reuse the existing automation + function patterns. Start there. T4 needs the one-line enum reconciliation first. Everything in the strategic dashboard ([`05`](./05-strategic-analytics-framework.md)) depends on the `Insight` entity and, for the high-value margin/inventory domains, on prerequisites 2–3.

Next: [`03-epos-and-customer-ux.md`](./03-epos-and-customer-ux.md).
