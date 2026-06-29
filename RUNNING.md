# Running & launching Marco's Express (with the Claude AI integration)

This branch (`claude/base64-claude-integration-0exe7x`) is the full Marco's
Express Base44 app with the Claude integration applied. It **builds clean**
(`npm install && npm run build` → exit 0).

There are three levels of "launch". Pick what you need.

---

## 1. Just *see* the AI features — zero setup

Open these files in any browser (no install, no backend):

- `docs/claude-integration/reference/menu-ai-demo.html` — the "Generate using AI" menu screen
- `docs/claude-integration/reference/epos-demo.html` — the live EPOS with the AI order strip
- `docs/claude-integration/reference/epos-preview.png` — static EPOS AI strip
- `docs/claude-integration/reference/epos-demo.webm`, `menu-ai-demo.webm` — recorded walkthroughs

These are faithful mocks (same colours/logic as the real components) for showing the feature.

---

## 2. Run the *real app* locally

```bash
git clone https://github.com/BaBaaa22/BaBaaa22.git
cd BaBaaa22
git checkout claude/base64-claude-integration-0exe7x
npm install
```

Create **`.env.local`** in the project root:

```
VITE_BASE44_APP_ID=69ab3c5ee6dd34e24ec02946
VITE_BASE44_APP_BASE_URL=https://<your-app>.base44.app
```

- `VITE_BASE44_APP_ID` above is Marco's Express (already correct).
- `VITE_BASE44_APP_BASE_URL` is your published backend URL — find it in the Base44
  dashboard for Marco's Express.

```bash
npm run dev       # http://localhost:5173  (live login + real data)
npm run build     # production build
npm run preview   # serve the production build locally
```

The local front end talks to your **live Base44 backend**. You'll log in as admin
and see real menu/orders. The AI buttons stay inert until the backend secret is set
(see §4) — that's server-side, independent of how you run the front end.

---

## 3. Publish it live on Base44

1. **Get this code into Marco's Express.** In Base44 → Marco's Express → GitHub
   integration, connect `BaBaaa22/BaBaaa22`, branch
   `claude/base64-claude-integration-0exe7x` (or pull this branch into your existing
   Base44 git). Pushed code reflects into the Base44 builder.
2. **Set the secret** (§4).
3. **Wire the automation** (§5).
4. Click **Publish** in Base44.

---

## 4. Set the Anthropic API key (required for all AI features)

The AI functions (`generateItemDescription`, `claudeAssist`) are **server-side** and
need a secret — they no-op without it, no matter how you launch.

- Base44 dashboard → Marco's Express → secrets / environment (same place as `ADMIN_EMAIL`)
- Add: `ANTHROPIC_API_KEY = <your Anthropic key>`
- **Rotate** any key that was shared in plaintext; treat it as compromised.

Already done on the live app (additive, reversible): the `Order` `ai_*` +
`status_history` fields and the `Insight` analytics entity.

---

## 5. Wire the `claudeAssist` automation (kitchen routing / allergen strip)

The EPOS AI strip auto-populates only when `claudeAssist` runs on each new order.
In the Base44 builder, add an **entity automation**:

- Entity: **Order**
- Trigger: **on create**
- Action: run function **`claudeAssist`**

This mirrors how the existing `notifyAdminNewOrder` automation is attached. The
`generateItemDescription` function needs **no** automation — it's called directly by
the "Generate using AI" button.

> Prereqs before wiring: the `claudeAssist` function must exist in the live app
> (step 3.1) and the secret must be set (§4). `claudeAssist` is fail-open — if the
> AI call errors it tags the order `ai_status: "error"` and the order flows normally,
> so it never blocks order creation.

---

## 6. Status-value backfill (run once, after §3 deploys)

The status fix standardises the stored value `preparing` → `in_kitchen`. Existing
orders are a mix (two admin screens wrote different values). After the code is live,
run once (Base44 MCP, or a one-shot service-role function):

```ts
const stuck = await base44.asServiceRole.entities.Order.filter({ status: 'preparing' });
for (const o of stuck) {
  await base44.asServiceRole.entities.Order.update(o.id, { status: 'in_kitchen' });
}
```

Irreversible (rewrites live order rows) — run it after the UI is deployed so the
board stays consistent. Details: `docs/claude-integration/reference/entities/README.md`.

---

## Quick reference — what's where

| Thing | Path |
|---|---|
| AI order classifier | `base44/functions/claudeAssist/entry.ts` |
| AI menu descriptions | `base44/functions/generateItemDescription/entry.ts` |
| EPOS AI strip | `src/pages/AdminEPOS.jsx` |
| "Generate using AI" button | `src/pages/AdminMenu.jsx` |
| New analytics entity | `base44/entities/Insight.jsonc` |
| Order schema (+ai_* fields) | `base44/entities/Order.jsonc` |
| Design docs | `docs/claude-integration/*.md` |
