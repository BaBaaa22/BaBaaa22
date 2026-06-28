# 3. EPOS & Customer UX Optimisation

How Claude improves both flows, plus concrete UI/UX layout recommendations grounded in the existing React pages (`src/pages/*`, `src/components/*`).

---

## 3.1 EPOS workflow optimisation

### Current EPOS (from `src/pages/AdminEPOS.jsx`)

A single dense screen: category buttons (`CATEGORY_ORDER`, `CATEGORY_COLORS`), an order builder, a status flow (`received → preparing → ready → completed`), an audible new-order alert (`playOrderAlert`), and a 30s order poll. `AdminDashboard.jsx` shows today's net sales, average order, discounts, open orders, and a 7-day comparison. Staff currently read every order, decide the station mentally, and judge prep time by experience.

### Where Claude removes manual steps

| Manual step today | With Claude | Mechanism |
|---|---|---|
| Read order, mentally assign kitchen station | Auto-tagged station + colour on the ticket | T1 → `ai_station` rendered as the existing category colour chip |
| Estimate prep/ready time by gut | Per-order prep ETA + a "promise by" time | T1 → `ai_prep_time`; surface a countdown next to `differenceInMinutes` (already imported) |
| Split a multi-item order across stations in your head | Pre-grouped kitchen tickets | T1 → `ai_ticket_groups` (pizza / fryer / cold) |
| Spot "no nuts" in free-text `notes` under pressure | Allergen-conflict badge | #7 → compares `Order.notes` to `MenuItem.allergens`, flags red |
| Decide upsell verbally at the counter | Suggested add-on shown on the order builder | T2 surfaced in EPOS too (phone orders) |
| Guess if a busy period is coming | "Busy in ~20 min (last 3 Fridays)" banner | T6/T7 digest → `Insight` shown on dashboard |

### Staff decision support

- **Upsell prompt (EPOS):** when building a phone order in `AdminEPOS.jsx`, show the same T2 suggestion ("add garlic bread — 60% of pizza orders do") as a one-tap add button. Pure margin, no extra staff effort.
- **Busy-period prediction:** the nightly digest (T6) computes hourly order density; the dashboard shows a forward-looking "expected covers next 2h" so staff can prep dough/stations ahead. This is advisory and clearly labelled with its basis ("based on last 4 same-weekdays").
- **Accuracy gains:** the allergen double-check (#7) is the highest-trust automation — it catches a `notes: "severe nut allergy"` against a `MenuItem` whose `allergens` include `nuts` and forces an explicit staff acknowledgement before the ticket prints.

### Real-time inventory via Claude — honest scoping

True real-time inventory needs an `InventoryItem` entity that does not exist yet (§2.4). **What is feasible now:** Claude flags *likely* low items from the day's order velocity ("32 Margheritas today vs ~18 avg — check dough/mozzarella") in the nightly digest. **What needs build first:** decrement-on-order, reorder alerts, supplier ordering. Present the velocity flag now; sequence the stock entity later.

---

## 3.2 Customer app / website optimisation

### Current customer flow (from `src/pages/Home.jsx`, `MenuPage.jsx`, `Checkout.jsx`, components)

`Home` → postcode/order-type (`PostcodeEntry`, `OrderTypeSelector`) → `MenuPage` (category nav, item cards, customisation/size modals) → `CartPanel` → `Checkout` (address, payment) → `OrderStatus`. Mobile has a bottom nav (`MobileBottomNav`) and PWA support (`public/sw.js`, `manifest.json`).

### Where Claude enhances the experience

| Touchpoint | Claude enhancement | Page |
|---|---|---|
| **Search / discovery** | NL search: "spicy chicken under £8, no dairy" → ranked `MenuItem`s (T5) | `MenuPage.jsx` search box |
| **Personalised recommendations** | "Order again" + "you might like" from this phone/email's past `Order`s | `Home.jsx` / `MenuPage.jsx` |
| **Cart upsell** | "Add garlic bread?" before checkout (T2) | `CartPanel.jsx` / `Checkout.jsx` |
| **Order tracking** | Friendly, specific status copy ("Your pizza's in the oven — ~12 min") (T4) | `OrderStatus.jsx` + status emails |
| **Support** | Chat: "is it gluten free?", "where's my order?", "are you open?" (T3) | new widget, grounded in `MenuItem`/`StoreSettings`/own `Order` |

**Dynamic pricing — recommendation: don't.** The brief lists it; for a single pizzeria it risks customer trust and collides with the existing `Coupon`/`Discount` engine (which already does time/day-windowed offers via `Discount.days_of_week/start_time/end_time`). Better: let Claude *recommend which existing `Discount` to run* (a `05` analytics output the owner approves), not silently vary prices at checkout.

### Streamlined checkout & status visibility

- Keep checkout boring and fast; the only AI touch is the **single** T2 upsell, shown once, dismissible, never blocking pay.
- Replace the generic status strings with T4 copy that names the item and gives a live ETA from `ai_prep_time`.
- Make the status page show the kitchen stage visually (received → in kitchen → out for delivery/ready) — reconcile the enum first (§2.1) so the stages match what the EPOS writes.

### Mobile vs web parity

The app is mobile-first (bottom nav, PWA, pull-to-refresh). Parity rules:
- T2/T5 responses must be small and fast on mobile data — Haiku 4.5, capped output, streamed where it helps.
- The support widget (T3) should be a slide-up sheet on mobile (reuse `components/ui/sheet.jsx` / `drawer.jsx`), a corner panel on web.
- Recommendations render in the same `ItemCard` component on both — no separate layout.

---

## 3.3 UI/UX layout recommendations

### EPOS dashboard (prioritisation & hierarchy)

1. **Lead with action, not history.** `AdminDashboard.jsx` opens on sales metrics; the live operational need is *open orders*. Put **open orders with AI station colours + prep ETA countdowns at the top**, sales summary below.
2. **AI station as the primary visual key.** Reuse the existing `CATEGORY_COLORS` map: tint each ticket by `ai_station` so the kitchen reads the board at a glance.
3. **Allergen badge = highest contrast.** A red allergen-conflict badge (#7) must be the most prominent element on any ticket that has one, with a tap-to-acknowledge gate.
4. **Quick-access actions.** One-tap status advance (already `STATUS_FLOW`), one-tap AI upsell add, one-tap "print grouped tickets" using `ai_ticket_groups`.
5. **A single insights strip.** One dismissible banner for the day's top `Insight` (busy prediction / velocity flag) — never a wall of AI text.

### Customer ordering interface

1. **Discovery first.** Put the T5 NL search prominently above the category nav on `MenuPage`; keep category browse as the fallback.
2. **Recommendations as a rail, not a popup.** A horizontal "Order again / Popular now" rail of `ItemCard`s on `Home`/top of `MenuPage`.
3. **Cart → one upsell.** In `CartPanel`, one AI add-on suggestion as an inline card with a + button; dismiss persists for the session.
4. **Checkout: zero new friction.** No AI between "Pay" and confirmation.
5. **Status: visual + human.** Stepper component + T4 sentence + live ETA.

### Real-time updates & notifications

- Customer status currently arrives by email (`notifyCustomerStatusUpdate`). Add in-app live update via the existing poll on `OrderStatus.jsx`; optionally a PWA push (the service worker exists) for "ready/out for delivery".
- EPOS new-order alert (`playOrderAlert`) stays; add a distinct sound/colour for an **allergen-flagged** order.

### Mobile responsiveness

- The Radix/Tailwind component kit (`src/components/ui/*`) already gives responsive primitives — reuse `sheet`/`drawer` for the support widget, `sonner`/`toast` for AI suggestions, `skeleton` for streaming states.
- Keep all AI-injected UI inside existing components so it inherits the responsive layout; do not add a parallel desktop-only AI panel.

---

## 3.4 Priority of UX changes

| Priority | Change | Depends on |
|---|---|---|
| **Quick win** | EPOS station colour + prep ETA on tickets | T1 |
| **Quick win** | Allergen-conflict badge | #7 (T1 variant) |
| **Quick win** | Single cart upsell card | T2 |
| Next | NL menu search | T5 |
| Next | Human status copy + visual stepper | T4 + enum fix |
| Later | Support chat widget | T3 |
| Later | Insights strip on dashboard | T6/T7 + `Insight` entity |

Build steps and code in [`04-implementation-roadmap.md`](./04-implementation-roadmap.md).
