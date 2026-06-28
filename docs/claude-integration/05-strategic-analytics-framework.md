# 5. Strategic Analytics Framework

A strategic briefing — not an implementation spec — for evolving the Claude-powered dashboard from **reactive order processing** (kitchen routing, upsells from [`01`–`04`](./01-architecture.md)) into **proactive business optimisation**. The aim is to map the opportunity space and surface where *your* decisions matter, not to hand you a finished plan.

The operational layer already designed (order classification, the `Insight` entity, n8n batch tier) is the foundation everything here sits on.

---

## 5.1 The five domains and how they interconnect

```
                         ┌──────────────────────────────┐
                         │   CUSTOMER BEHAVIOUR INTEL    │  (timing, combinations, repeat rate)
                         └───────────┬───────────┬───────┘
                                     │           │
                     feeds segments  │           │  feeds demand signal
                                     ▼           ▼
        ┌───────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
        │ CUSTOMER LIFETIME │   │ MENU / BUSINESS      │   │ PREDICTIVE INVENTORY │
        │ VALUE (CLV)       │◀─▶│ OPTIMISATION         │──▶│ / DEMAND FORECAST    │
        └───────────────────┘   └──────────┬──────────┘   └──────────┬───────────┘
                  ▲                          │ item-level demand        │ prep/stock plan
                  │ retention value          ▼                          ▼
                  │              ┌─────────────────────┐      ┌──────────────────────┐
                  └──────────────│ WORKFORCE PERFORMANCE│◀─────│  (covers per hour)    │
                                 │ / STAFFING           │      └──────────────────────┘
                                 └─────────────────────┘
```

The domains are not independent reports — they share a substrate (the `Order` stream) and feed each other:

- **Customer behaviour** produces the segments **CLV** values and the patterns **menu optimisation** and **demand forecasting** consume.
- **Menu optimisation** outputs item-level demand that **inventory forecasting** turns into prep/stock plans.
- **Demand forecasting** outputs covers-per-hour that **workforce** turns into rotas.
- **CLV** weights everything: a recommendation that hurts your highest-value segment is the wrong recommendation even if it lifts average ticket.

The order-level → strategic-level bridge: individual `Order` rows are aggregated (by item, hour, weekday, customer key, station) in the n8n batch tier; pattern recognition and synthesis happen in Claude over those aggregates, never over raw rows one at a time. **Aggregate first, reason second** — both for cost and for signal.

---

## 5.2 The domains in detail

| Domain | Core analytical task | Required data inputs | Claude's role | Intended business outcome |
|---|---|---|---|---|
| **Customer behaviour intelligence** | Find ordering patterns: timing, item combinations, reorder cadence, channel | `Order.{items,created_date,order_type,coupon_code}`, customer key (phone/`created_by`) | Pattern recognition + segment naming + plain-language "why" | Targeted offers, menu placement, knowing who orders what when |
| **Menu / business optimisation** | Rank items by demand × margin; spot dogs and stars; suggest pairings/placements | `Order.items`, `MenuItem.{base_price, **cost**}` | Synthesis + menu-engineering matrix + recommendations | Drop/relaunch items, reprice, design upsell pairs |
| **Workforce performance** | Throughput, prep-time vs `ai_prep_time`, covers-per-hour, station load | `Order.{created_date,status,ai_station,ai_prep_time}`, status timestamps | Anomaly detection + staffing suggestion | Better rotas, prep timing, training flags |
| **Predictive inventory / demand** | Forecast item demand by day/hour; flag prep + stock needs | ≥8–12 weeks of `Order.items`; (stock for true mgmt) | Forecasting + uncertainty bands | Prep-ahead, reduce waste/stockouts |
| **Customer lifetime value** | Score & segment customers by value, frequency, recency, churn risk | All orders per customer key over time | Segmentation + value modelling | Retention spend, VIP treatment, win-back |

**Where each lives:** customer behaviour, menu, CLV → **daily/weekly batch** (Sonnet/Opus). Workforce → **daily**. Demand forecast → **weekly** (Opus), refreshed daily for next-day prep. Nothing here is real-time; the live tier ([`01`–`04`](./01-architecture.md)) already covers real-time.

---

## 5.3 Analytical capability & feasibility

- **Pattern recognition / synthesis** (customer behaviour, menu, CLV): Claude is strong here over well-aggregated inputs. These are the **near-feasible** domains.
- **Forecasting** (demand): Claude can produce sensible directional forecasts with uncertainty language, but it is **not a statistical time-series engine**. For volume forecasting, do the arithmetic (moving averages, weekday seasonality) in the n8n `Code` node and use Claude to *interpret, caveat, and recommend* — not to invent the numbers. This keeps forecasts grounded and auditable.
- **Limits to respect:**
  - **Data volume:** reliable weekday/seasonality forecasting wants **≥8–12 weeks**; segmentation/CLV want enough repeat customers to be meaningful. Below that, label outputs "early signal, low confidence."
  - **Margin/menu engineering is blocked until `MenuItem.cost` exists** — without it Claude ranks by revenue, which can flatter low-margin volume items. State this caveat loudly until the field lands.
  - **Inventory is advisory until an `InventoryItem` entity exists** — Claude forecasts *demand*, not *stock on hand*.

**Cadence vs cost/latency:** batch daily/weekly. A weekly Opus synthesis over aggregates is a handful of calls — pennies. Do not run strategic analyses per-order; that is both wasteful and noisier.

**Human-in-the-loop:** every recommendation that drives an operational change (drop an item, change a rota, run a discount) is a *proposal the owner approves*, not an auto-action. Forecasts and segment definitions especially need a human sense-check against ground truth the data can't see (a local event, a supplier issue).

---

## 5.4 Business integration & usability

| Insight type | Decision-maker | Format |
|---|---|---|
| Staff performance / staffing | Shift manager | Daily dashboard tile + next-day staffing suggestion |
| Demand / inventory forecast | Owner / kitchen lead | Weekly forecast + daily next-day prep list |
| Customer segmentation / offers | Owner (marketing hat) | Weekly segment report + suggested `Discount`/`Coupon` to run |
| Menu optimisation | Owner | Monthly menu-engineering matrix |
| CLV / retention | Owner | Monthly; VIP + churn-risk lists |

**Surfacing confidence:** every `Insight` carries a `confidence` field (already in the proposed entity). Render it visibly (e.g. a low/med/high chip) and show the *basis* ("based on 6 same-weekdays") so the owner can weight it. Never present a low-data forecast as a fact.

**When insights conflict** (e.g. demand says "spike in the Hawaiian" but menu optimisation says "drop the Hawaiian — low margin"): the framework should **present the tension explicitly to the human**, not silently pick. The right resolution is a judgement call that depends on strategy (volume vs margin) — Claude's job is to lay out the trade-off with both numbers; the owner decides. Encode this as a "conflicts" section in the weekly synthesis rather than a single ranked list.

---

## 5.5 Implementation sequencing & dependencies

**Build order (rationale):**

1. **Customer behaviour + nightly digest** first — it is feasible now (no schema prereq), proves value fast, and produces the aggregates the other domains reuse. This *is* the minimal viable analytics dashboard.
2. **Workforce performance** next — needs reliable **status timestamps** and the **enum reconciliation** (Phase 0 of [`04`](./04-implementation-roadmap.md)); EPOS logging may need to record when each status transition happened.
3. **Demand forecast (interpretation layer)** once ~8–12 weeks of data exist.
4. **Menu optimisation + CLV** once **`MenuItem.cost`** is added (margin) and enough repeat-customer history accrues.
5. **True inventory** last — gated on the `InventoryItem` entity (largest build).

**Prerequisites recap (from the audit):**
- `Insight` entity (lands all outputs).
- Status-enum reconciliation + per-transition timestamps (workforce).
- `MenuItem.cost` (margin, menu engineering, CLV value).
- `InventoryItem` entity (real inventory).
- Optional `Customer` aggregate (CLV/segmentation at scale).

**Minimal viable dashboard:** the nightly digest tile (sales, top items, prep-time outliers, one recommended action) on `AdminDashboard.jsx`. It needs only the `Insight` entity and one n8n workflow — and it demonstrates the reactive→proactive shift before any of the harder domains are built.

---

## 5.6 Risk & constraint mapping

| Risk | Where it bites | Guardrail |
|---|---|---|
| **Incomplete data** (missing `cost`, no feedback/ratings, sparse history) | Menu/CLV/forecast | Gate those domains behind the prerequisite fields; label low-confidence outputs |
| **Overconfident forecasts** | Inventory → overstocking/waste | Compute numbers statistically, Claude only interprets; always show uncertainty bands; human approves stock orders |
| **Biased segmentation** | CLV → over-serving a vocal segment, neglecting growth | Review segment definitions with a human; don't auto-act on segments |
| **Conflicting insights auto-resolved** | Cross-domain | Never auto-pick — surface the trade-off (§5.4) |
| **Recommendation → operational harm** | Any domain driving a change | Every change is a human-approved proposal; log what was acted on to measure outcomes |
| **Prompt-injected free-text** in notes/reviews | Behaviour analysis | Treat all customer text as untrusted data; bound Claude with tool schemas |

**Governance before Claude drives change:** (1) every operational recommendation is a proposal with a named owner; (2) outputs carry confidence + basis; (3) the owner reviews weekly; (4) acted-on recommendations are tagged so the next cycle can measure whether they worked — closing the loop from advice to outcome.

---

## 5.7 Key decisions for you to make

These are yours, not the architect's:

1. **Volume vs margin** when they conflict — which does Marco's optimise for by default? (Drives how the menu/demand conflict is resolved.)
2. **How much autonomy** to grant: advice-only forever, or auto-run low-risk actions (e.g. auto-enable a pre-approved `Discount` on a slow night) once trust is earned?
3. **Customer identity model:** is phone or email the canonical customer key? Do you want a `Customer` entity, given the privacy implications of building per-customer profiles?
4. **Inventory ambition:** demand-velocity flags (cheap, now) vs full stock management (a real build) — how far do you want to go?
5. **Which domain proves value first** for *your* priorities — retention (CLV), efficiency (workforce), or margin (menu)? The MVP digest is domain-agnostic; the second build should follow your biggest pain.

---

## 5.8 Quick wins vs long-term

| Horizon | Opportunity |
|---|---|
| **Quick win** | Nightly digest tile (sales, top items, prep outliers, one action) — MVP dashboard |
| **Quick win** | Busy-period prediction from weekday history (advisory) |
| **Quick win** | Weekly customer-behaviour summary + a suggested existing `Discount` to run |
| **Mid** | Workforce/throughput analytics (after status-timestamp logging) |
| **Mid** | Demand-forecast interpretation (after 8–12 weeks of data) |
| **Long** | Menu-engineering matrix (after `MenuItem.cost`) |
| **Long** | CLV/segmentation + retention programmes (after history + customer key decision) |
| **Long** | True predictive inventory (after `InventoryItem` entity) |

**Critical success factors:** ground every number (compute, don't hallucinate); show confidence + basis; keep humans in the loop on every change; close the advice→outcome loop. **Failure modes to watch:** acting on low-data forecasts, ranking menu by revenue without margin, auto-resolving cross-domain conflicts, and letting customer free-text become an injection vector. Avoid these and the dashboard becomes a genuine decision tool rather than a wall of plausible charts.
