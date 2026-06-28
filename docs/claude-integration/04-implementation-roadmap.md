# 4. Technical Implementation Roadmap

Concrete steps to ship the integration, with the priority ranking, data mapping, cost, and bottlenecks. Code lives in [`reference/claudeAssist.entry.ts`](./reference/claudeAssist.entry.ts) and [`reference/order-automation-payloads.md`](./reference/order-automation-payloads.md).

---

## 4.1 Build sequence

### Phase 0 — Prerequisites (½ day)

1. **Add additive `ai_*` fields to `Order`** (no migration risk — all optional): `ai_station` (string), `ai_prep_time` (number), `ai_ticket_groups` (array), `ai_allergen_flags` (array), `ai_complexity` (string), `ai_status` (string). Edit `base44/entities/Order.jsonc` or use the Base44 MCP `update_entity_schema`.
2. **Set the `ANTHROPIC_API_KEY` secret** in Base44 (same place as `ADMIN_EMAIL`).
3. **Reconcile the status enum** (unblocks T4): pick one set. Recommended — make the `Order` enum and `AdminEPOS.jsx STATUS_FLOW` agree (`received → in_kitchen → ready → completed`, plus `out_for_delivery` for delivery, `cancelled`). Update `AdminEPOS.jsx` (`STATUS_FLOW`, `STATUS_CONFIG`) and `AdminDashboard.jsx`'s `openOrders` filter to match the entity.

### Phase 1 — Quick wins (1–2 days)

| Step | What | File |
|---|---|---|
| 1.1 | Create `claudeAssist` function | copy [`reference/claudeAssist.entry.ts`](./reference/claudeAssist.entry.ts) to `base44/functions/claudeAssist/entry.ts` |
| 1.2 | Wire it as an **`Order` onCreate entity automation** | Base44 automations UI — mirror how `notifyAdminNewOrder` is attached |
| 1.3 | Render `ai_station` colour + `ai_prep_time` countdown + allergen badge on EPOS tickets | `src/pages/AdminEPOS.jsx` (reuse `CATEGORY_COLORS`, `differenceInMinutes`) |
| 1.4 | Create `suggestUpsell` sync function (T2) | `base44/functions/suggestUpsell/entry.ts` (pattern in payloads doc §E) |
| 1.5 | Render single upsell card | `src/components/cart/CartPanel.jsx` |

After Phase 1 you have AI kitchen routing, prep ETAs, allergen safety, and checkout upsell — all with zero third-party tooling.

### Phase 2 — Customer experience (2–4 days)

| Step | What |
|---|---|
| 2.1 | `smartMenuSearch` function (T5) → hook into `MenuPage.jsx` search |
| 2.2 | Extend `notifyCustomerStatusUpdate` with T4 AI copy (needs Phase-0 enum fix); add visual stepper to `OrderStatus.jsx` |
| 2.3 | `customerAssistant` streamed function (T3) + slide-up `sheet`/`drawer` widget |

### Phase 3 — Analytics foundation (3–5 days)

| Step | What |
|---|---|
| 3.1 | Add `Insight` entity (`type`, `period`, `payload_json`, `confidence`, `created_date`) |
| 3.2 | Stand up self-hosted **n8n**; add Anthropic + Base44 service credentials |
| 3.3 | Build nightly digest workflow (T6, payloads doc §G) → writes `Insight` |
| 3.4 | Add an "insights strip" to `AdminDashboard.jsx` reading the latest `Insight` |

### Phase 4 — Strategic (ongoing)

Demand forecast (T7) and the five-domain dashboard — see [`05-strategic-analytics-framework.md`](./05-strategic-analytics-framework.md). Gated on the `cost`/inventory prerequisites for the margin/stock domains.

---

## 4.2 Specific modules / nodes

**Base44 (live path):** `Deno.serve` function + `createClientFromRequest` + `base44.asServiceRole.entities.*` + native **entity automation** trigger + `Deno.env.get` secret + `fetch` to Anthropic. No new infra.

**Anthropic Messages API:** `tools` + `tool_choice` (forced) + `strict: true` for schema-valid output; `cache_control: ephemeral` on the menu/system prefix; `claude-haiku-4-5` for per-order, `claude-sonnet-4-6`/`claude-opus-4-8` for analytics.

**n8n (async path):** `Cron` → `HTTP Request` (call `getEposOrders`) → `Code` (shape) → `HTTP Request` (Anthropic) → `Code` (parse) → `HTTP Request` (Base44 `Insight.create`). Credentials in n8n's store.

---

## 4.3 Data mapping (Base44 ↔ Claude)

| Base44 field | → Claude (request) | ← Claude (response) | → Base44 (write) |
|---|---|---|---|
| `Order.items[]` (item_name, quantity, modifiers) | order lines | — | — |
| `MenuItem.{name,category,allergens,is_vegetarian,is_spicy}` | cached menu context | — | — |
| `Order.notes` | untrusted note (data block) | — | — |
| `Order.order_type` | context | — | — |
| — | — | `kitchen_station` | `Order.ai_station` |
| — | — | `prep_time_minutes` | `Order.ai_prep_time` |
| — | — | `ticket_groups` | `Order.ai_ticket_groups` |
| — | — | `allergen_flags` | `Order.ai_allergen_flags` |
| — | — | `complexity` | `Order.ai_complexity` |

**Never mapped to Claude:** `customer_phone`, `customer_email`, `delivery_address`, `PaymentGateway.*`, `ShopApplication.payment_*`.

---

## 4.4 Authentication setup (checklist)

1. Browser → function: unchanged Base44 SDK token; keep `auth.me()` + `role` gate on every admin function.
2. Function → Anthropic: `x-api-key: Deno.env.get('ANTHROPIC_API_KEY')`, `anthropic-version: 2023-06-01`.
3. n8n → Anthropic: key in n8n credentials.
4. n8n → Base44: a dedicated service token (treat as admin; least-privilege if Base44 supports scoped tokens).
5. Verify the Anthropic key is **not** present under any `VITE_` name (would leak to the browser bundle).

---

## 4.5 Cost {#cost}

Per-order T1 call: ~800 input + ~150 output tokens, on **Haiku 4.5** ($1/$5 per 1M).
- Without caching: (800 × $1 + 150 × $5) / 1e6 ≈ **$0.00155/order**.
- The bulk of input is the menu; with `cache_control` the menu (~600 tok) bills at ~0.1× after the first call of each 5-minute window, dropping cost toward **~$0.0009/order**.
- **~£1.20 per 1,000 orders** order of magnitude. Negligible vs ticket value.

T2 upsell adds a second small Haiku call per checkout (~$0.0005). Analytics (T6/T7) are a handful of Sonnet/Opus calls per day — pennies.

**Guards:** daily spend ceiling in the function (short-circuit on a counter entity); SDK/`fetch` retries on 429/5xx; Haiku keeps unit cost low so a traffic spike is cheap.

---

## 4.6 Bottlenecks & mitigations

| Bottleneck | Risk | Mitigation |
|---|---|---|
| **Added latency on order create** | EPOS sees the order late | `claudeAssist` runs as a *parallel, async* automation; the order appears in EPOS immediately and gets `ai_*` enrichment a beat later. Never block create on Claude. |
| **Anthropic outage / timeout** | Orders stall | Fail open: write `ai_station="unassigned"`, `ai_status="error"`; EPOS works without AI. |
| **Prompt cache misses** | Cost creeps up | Sort the menu deterministically; keep the system prefix byte-stable; watch `usage.cache_read_input_tokens`. |
| **Status enum mismatch** | T4 trigger never fires | Phase-0 reconciliation. |
| **No `cost`/stock data** | Margin/inventory analytics impossible | Add `MenuItem.cost`; defer the `InventoryItem` entity; ship demand-velocity flags meanwhile. |
| **Prompt injection via `notes`/search** | Model misbehaves | Pass user text as delimited data, bounded by a tool schema; the *function*, not Claude, performs writes. |
| **Cost runaway at scale** | Surprise bill | Haiku + caching + daily ceiling + per-day counter. |
| **n8n self-host reliability** | Missed digests | Digests are non-critical; alert on workflow failure; analytics tolerate a missed night. |

---

## 4.7 Plan B — no Base44 code, use Make {#plan-b-make}

If writing Base44 functions is off the table:

```
Order onCreate automation → outbound webhook
  → Make scenario: [Webhook] → [Anthropic HTTP module] → [Base44 REST: PATCH Order ai_* fields]
```

Works, but: +1–3 s latency, a second secret store (Make), and per-operation billing at order volume. Acceptable for the async analytics tier; **not recommended for the live ordering path** where the native Base44 function is strictly better.

---

Next: [`05-strategic-analytics-framework.md`](./05-strategic-analytics-framework.md) — turning this operational foundation into a proactive decision tool.
