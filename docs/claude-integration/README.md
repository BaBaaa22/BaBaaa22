# Marco's Express — Claude AI Integration Guide

**App:** Marco's Express (Base44 app id `69ab3c5ee6dd34e24ec02946`) — a restaurant ordering platform with a customer web/PWA front end and an EPOS (staff) back office.
**Goal:** Connect Claude AI to the existing Base44 app + website, optimise the EPOS and customer ordering flows, and lay the foundation for a strategic analytics dashboard.

> **Naming note:** the brief calls the platform "Base64". The actual platform is **Base44** (no-code/low-code AI app builder, `@base44/sdk`). Everything below is written against the real Base44 architecture found in this repository's source.

---

## What's in this guide

| Doc | Purpose |
|---|---|
| [`01-architecture.md`](./01-architecture.md) | AI integration architecture: platform choice, trigger points, data flow, auth & security |
| [`02-systems-audit.md`](./02-systems-audit.md) | Technical audit: entity schemas, endpoints, data-flow diagrams, ranked automation opportunities |
| [`03-epos-and-customer-ux.md`](./03-epos-and-customer-ux.md) | EPOS workflow optimisation + customer ordering flow + UI/UX layout recommendations |
| [`04-implementation-roadmap.md`](./04-implementation-roadmap.md) | Concrete config steps, API examples, data mapping, priority ranking, bottlenecks |
| [`05-strategic-analytics-framework.md`](./05-strategic-analytics-framework.md) | Five-domain strategic analytics framework (reactive → proactive) |
| [`reference/claudeAssist.entry.ts`](./reference/claudeAssist.entry.ts) | Runnable Base44 backend function that calls the Anthropic API |
| [`reference/order-automation-payloads.md`](./reference/order-automation-payloads.md) | Example trigger payloads, Claude API requests/responses, env vars |

---

## Headline recommendation (the one decision that matters most)

**Do not put a generic workflow-automation SaaS (Zapier/Make) on the live ordering path.** Base44 already runs Deno serverless functions (`base44/functions/*/entry.ts`) and ships with entity automations and a built-in `Core.InvokeLLM`/`Core.SendEmail` integration. The lowest-latency, most reliable, and cheapest pattern is:

- **Live ordering path (latency-critical):** Base44 entity automation → Base44 function → **Anthropic Messages API** directly, using **Claude Haiku 4.5** for per-order classification. One hop, no third-party SaaS, ~300–800 ms.
- **Async/scheduled path (analytics, reports, digests):** **n8n** (self-hosted) on a cron, reading Base44 entities via the existing `getEposOrders`-style functions and calling **Claude Sonnet 4.6 / Opus 4.8** for synthesis.

This split keeps the customer/kitchen experience fast and the analytics flexible. Full reasoning in [`01-architecture.md`](./01-architecture.md#platform-choice).

---

## End-to-end data flow (live order)

```
 CUSTOMER WEB/PWA                    BASE44 BACKEND                         CLAUDE
 ┌───────────────┐                  ┌──────────────────────┐              ┌─────────────┐
 │ MenuPage      │  Order.create()  │ Order entity (RLS)    │              │ Anthropic   │
 │ Checkout      │ ───────────────▶ │   status=received     │              │ Messages API│
 │ CartPanel     │                  └──────────┬───────────┘              └──────▲──────┘
 └───────────────┘                             │ entity automation (onCreate)    │
        ▲                                       ▼                                 │
        │                            ┌──────────────────────┐  x-api-key (Haiku) │
        │   poll / status link       │ claudeAssist()       │ ───────────────────┘
        │                            │  - categorise items   │ ◀───── JSON tool result
        │                            │  - route kitchen tix  │   {station, prep_min,
        │                            │  - upsell suggestion   │    upsell, allergen_flags}
        │                            └──────────┬───────────┘
        │                                       │ Order.update({ai_*})
        │                                       ▼
 ┌───────────────┐   getEposOrders()  ┌──────────────────────┐
 │ AdminEPOS     │ ◀───────────────── │ Order (enriched)      │
 │ kitchen tix   │   (30s poll)       │  ai_station, ai_prep, │
 │ AdminDashboard│                    │  ai_upsell, ...        │
 └───────────────┘                    └──────────────────────┘
                                                │ status change automation
                                                ▼
                                      notifyCustomerStatusUpdate()  ──▶  email to customer
```

The pieces in **bold-italic** (`claudeAssist`, the `ai_*` fields) are new; everything else already exists in this repo. See [`02-systems-audit.md`](./02-systems-audit.md) for the exact current state and [`04-implementation-roadmap.md`](./04-implementation-roadmap.md) for how to build the new pieces.

---

## Models & cost at a glance

| Use | Model | ID | Price (in/out per 1M tok) |
|---|---|---|---|
| Per-order classification / routing / upsell (high volume) | Claude Haiku 4.5 | `claude-haiku-4-5` | $1 / $5 |
| Customer support chat, smart search, recommendations | Claude Sonnet 4.6 | `claude-sonnet-4-6` | $3 / $15 |
| Strategic analytics, weekly synthesis (low volume) | Claude Opus 4.8 | `claude-opus-4-8` | $5 / $25 |

A typical order classification call is ~800 input + ~150 output tokens. On Haiku 4.5 that is roughly **$0.0015 per order** before prompt caching — about **£1.20 per 1,000 orders**. With the menu cached as a stable prompt prefix it drops further. Cost detail in [`04-implementation-roadmap.md`](./04-implementation-roadmap.md#cost).
