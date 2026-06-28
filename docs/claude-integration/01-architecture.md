# 1. AI Integration Architecture

How Claude AI connects to the Marco's Express Base44 app + website, where it is invoked, what data flows, and how it is secured.

---

## 1.1 Platform choice

The brief asks for a recommendation among Zapier, n8n, Make, or Power Automate. The honest answer for this codebase is **a hybrid, and the automation SaaS is the *secondary* tool, not the primary one.**

### Why not a SaaS automation tool on the live path

Base44 is not a closed no-code silo — this repo already contains **23 Deno serverless functions** under `base44/functions/*/entry.ts`, each a real `Deno.serve` handler with full access to entities and integrations:

```ts
// base44/functions/getEposOrders/entry.ts (existing)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const orders = await base44.asServiceRole.entities.Order.list('-created_date', 200);
  return Response.json({ orders });
});
```

And `notifyAdminNewOrder` is already wired to an **entity automation** (it receives `{ event, data, old_data, payload_too_large }` on `Order` create). That means Base44 has a native event bus and a native serverless runtime. Adding Zapier/Make between the order event and Claude would:

- add a network hop and a polling/webhook delay (Zapier polling can be 1–15 min on lower tiers; live ordering needs sub-second),
- add a second place for secrets and failure,
- cost per-task/per-execution at order volume,
- and duplicate logic that a 40-line Base44 function does natively.

### The recommendation

| Path | Tool | Why |
|---|---|---|
| **Live ordering** (classification, kitchen routing, upsell, status copy) | **Base44 function → Anthropic Messages API directly** | One hop, ~300–800 ms, no third-party, reuses existing auth & entity automation. Use **Claude Haiku 4.5**. |
| **Async / scheduled** (nightly digests, demand forecast, menu/staff analytics, multi-step enrichment with retries and human-in-the-loop) | **n8n (self-hosted)** on cron, reading Base44 via functions, calling Claude | Visual multi-step orchestration, cheap at low frequency, easy for a non-developer owner to tweak, retries/branching built in. Use **Claude Sonnet 4.6 / Opus 4.8**. |

**Why n8n over Zapier/Make/Power Automate for the async tier:**

- **n8n** is self-hostable (flat cost, no per-task billing), has a first-class HTTP Request node and a code node, handles secrets via its own credential store, and is the natural fit for "run a weekly analysis over all orders." Best for a cost-conscious SMB doing scheduled, multi-step work.
- **Make** is a strong hosted alternative if the owner won't self-host — better visual debugging than Zapier, cheaper per-op. Acceptable substitute for n8n.
- **Zapier** is the weakest fit here: per-task pricing punishes order volume and its polling latency is unsuitable even for the async tier's larger jobs. Use only if the team already lives in Zapier.
- **Power Automate** only makes sense if the business is already a Microsoft 365 shop and wants approvals/Teams notifications; otherwise it adds licensing and friction.

> If you must avoid writing any Base44 function code, the fallback is: Base44 entity automation → outbound webhook → **Make** scenario → Anthropic HTTP module → Base44 REST update. This works but adds ~1–3 s latency and a second secret store. Treat it as plan B, documented in [`04-implementation-roadmap.md`](./04-implementation-roadmap.md#plan-b-make).

### Base44 native `Core.InvokeLLM`

Base44 exposes `base44.asServiceRole.integrations.Core.InvokeLLM` (the same `Core` namespace already used for `SendEmail` in `notifyAdminNewOrder`). This is the absolute simplest path and needs no API key management. **Trade-off:** it is provider-/model-abstracted, so you give up direct control over model choice (Haiku vs Opus), prompt caching, tool-use schemas, and token-level cost control. **Recommendation:** use a direct Anthropic call from the function for the ordering path (control + caching + cost), and keep `Core.InvokeLLM` as a zero-config fallback for prototyping.

---

## 1.2 Trigger points — where Claude is invoked

Ranked by value-to-effort (full feasibility analysis in [`02-systems-audit.md`](./02-systems-audit.md#automation-opportunities)).

| # | Trigger | Event source | Claude job | Model | Sync? |
|---|---|---|---|---|---|
| T1 | **New order created** | `Order` entity automation (onCreate) | Classify items → kitchen station, prep-time estimate, allergen flags, kitchen-ticket grouping | Haiku 4.5 | Async (fire-and-forget, writes back `ai_*` fields) |
| T2 | **Upsell at checkout** | `Checkout.jsx` calls a function before payment | Suggest 1–2 add-ons given cart + menu + time of day | Haiku 4.5 | Sync (must return < 600 ms) |
| T3 | **Customer support / order question** | Customer chat widget → function | Answer "where's my order", allergen, opening hours from `StoreSettings` + `Order` | Sonnet 4.6 | Sync (streamed) |
| T4 | **Status update copy** | `Order` status-change automation | Generate friendly, context-aware status message (extends existing `notifyCustomerStatusUpdate`) | Haiku 4.5 | Async |
| T5 | **Smart menu search / recommendations** | `MenuPage.jsx` search box → function | Natural-language → matching `MenuItem`s, "spicy veggie under £8" | Haiku 4.5 | Sync |
| T6 | **Nightly business digest** | n8n cron 02:00 | Summarise day's orders → sales, top items, anomalies, prep-time outliers | Sonnet 4.6 | Async batch |
| T7 | **Demand / inventory forecast** | n8n cron weekly | Forecast item demand from historical `Order`s; flag prep/stock | Opus 4.8 | Async batch |

T1, T2, T4 are the **quick wins**. T6/T7 feed the strategic dashboard in [`05-strategic-analytics-framework.md`](./05-strategic-analytics-framework.md).

---

## 1.3 Data flow — what crosses each boundary

### Base44 → Claude (request)

For **T1 (order classification)** the function sends:

- The order's `items[]` (item_name, quantity, modifiers, item_total) — already on the `Order` entity.
- A **cached menu context**: the full `MenuItem` list (name, category, allergens, is_vegetarian, is_spicy) marked with `cache_control: ephemeral` so it is billed at ~0.1× after the first call.
- A compact instruction + a **tool schema** that forces structured JSON out (no free-text parsing).

What is **deliberately not sent**: `customer_phone`, `customer_email`, `delivery_address`, payment keys. Classification only needs item data. (PII minimisation — see §1.5.)

### Claude → Base44 (response)

Claude returns a validated JSON object via a `record_order_analysis` tool:

```json
{
  "kitchen_station": "pizza",
  "prep_time_minutes": 14,
  "ticket_groups": [{ "station": "pizza", "items": ["Margherita x2"] },
                    { "station": "fryer", "items": ["Chips x1"] }],
  "allergen_flags": ["gluten", "dairy"],
  "complexity": "standard"
}
```

The function writes these into **new `ai_*` fields** on the `Order` entity (`ai_station`, `ai_prep_time`, `ai_ticket_groups`, `ai_allergen_flags`). The EPOS (`AdminEPOS.jsx`, `getEposOrders`) then renders them — no schema change to the read path, just additive fields.

### Back to the customer/website

`AdminDashboard.jsx` and `AdminEPOS.jsx` already poll (`refetchInterval: 30000`, and `getEposOrders`). They read the enriched `Order` and show AI station colours, prep ETAs, and upsell prompts. Customer-side, T2/T5 responses are returned synchronously to the React page.

Full field mapping table: [`04-implementation-roadmap.md`](./04-implementation-roadmap.md#data-mapping).

---

## 1.4 Authentication

Two trust boundaries, two mechanisms.

**Customer/EPOS → Base44 function.** Already handled by the Base44 SDK. The browser client (`src/api/base44Client.js`) carries the user token; functions call `base44.auth.me()` and check `user.role === 'admin'` for EPOS endpoints (see `getEposOrders`, `notifyCustomerStatusUpdate`). **Reuse this unchanged** — every new function must start with the same `auth.me()` + role gate that the existing functions use.

**Base44 function → Anthropic.** API key. Store as a Base44 secret (same mechanism as `Deno.env.get('ADMIN_EMAIL')` already used in `notifyAdminNewOrder`):

```ts
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');   // set via Base44 secrets, never in code
```

Headers: `x-api-key: <key>`, `anthropic-version: 2023-06-01`. **OAuth is not used** — the Anthropic Messages API is API-key auth. There is no end-user OAuth in this flow because the customer never talks to Claude directly; all Claude calls are server-side from a Base44 function.

**n8n → Anthropic / Base44.** n8n credential store holds the Anthropic key and a Base44 service token. n8n never sees a customer credential.

---

## 1.5 Security considerations

1. **Server-side only.** The Anthropic key lives in Base44 secrets / n8n credentials and is read with `Deno.env.get`. It never reaches `src/` (the browser bundle). Confirm no `VITE_`-prefixed Anthropic var is ever created — `VITE_` vars are shipped to the client.
2. **PII minimisation.** Send Claude the *minimum* — item data for classification, not phone/email/address. For T3 support, send only the specific order the authenticated customer owns (the `Order` RLS already enforces `created_by == {{user.email}}` for non-admins).
3. **Prompt-injection containment.** Customer free-text (`Order.notes`, support questions, search queries) is untrusted. Pass it as data inside a clearly delimited user block, never concatenated into the system prompt, and keep Claude's authority bounded by the tool schema (it can only *return structured fields*, not take actions). The function — not Claude — performs the `Order.update`.
4. **Output validation.** Use Anthropic **tool use with `strict: true`** so the model returns schema-valid JSON; the function still range-checks (`prep_time_minutes` within 1–120, `kitchen_station` in an allowlist) before writing to the entity.
5. **Fail-open ordering.** Claude is an *enhancement*, never a gate. If the classification call errors or times out, the order still proceeds with `ai_station = "unassigned"`. Kitchen operations must never block on the AI.
6. **Rate limiting & cost guard.** Per-order calls are cheap, but cap concurrency and add a per-day spend ceiling in the function (short-circuit if a daily counter entity exceeds a threshold). The SDK auto-retries 429/5xx with backoff.
7. **Data retention / GDPR.** Anthropic API requests are not used for training. Still, document in the privacy policy that order item data is processed by a third-party AI for kitchen routing. Avoid sending special-category data.

---

## 1.6 Architecture summary

```
                        ┌────────────────────────── Base44 (existing) ──────────────────────────┐
 Customer PWA/Web ──────▶ Order.create ──▶ [entity automation] ──▶ claudeAssist() ──▶ Anthropic │
   (src/pages/*)         Entities: Order, MenuItem, StoreSettings,        │  (Haiku 4.5,         │
 EPOS (AdminEPOS) ◀───── Coupon, Discount, User, PaymentGateway           │   x-api-key)         │
   getEposOrders         Integrations: Core.SendEmail, Core.InvokeLLM      ▼                      │
                        Secrets: ANTHROPIC_API_KEY, ADMIN_EMAIL    Order.update(ai_*)             │
                        └─────────────────────────────────────────────────────────────────────────┘
                                          ▲ read (functions)         │ cron
                                          │                          ▼
                                   ┌──────┴───────────── n8n (self-hosted) ────────────┐
                                   │ nightly digest (Sonnet) · weekly forecast (Opus)  │
                                   │ → writes Insight entity → AdminDashboard renders   │
                                   └────────────────────────────────────────────────────┘
```

Next: [`02-systems-audit.md`](./02-systems-audit.md) documents exactly what exists today and ranks the automation opportunities.
