# Impact Analysis / Implementation Gate

**When to use:** Before changing auth, payments, tenant isolation, RLS, or other elevated-risk areas; when a Cursor agent (or human) must produce an Implementation Gate instead of coding immediately.

Verified against source (Sep 2026). Merge `ebf84aad` (#143). Companion rule: `.cursor/rules/impact-analysis.mdc` (agent-requestable). Ship/release policy: [SHIP_TO_MAIN.md](./SHIP_TO_MAIN.md) and `.cursor/rules/ship-to-main.mdc`.

---

## Intent

Stop elevated-risk changes from expanding scope or shipping without a written **Implementation Gate**. Impact Analysis authorizes **analysis and a gate recommendation** only — it does **not** authorize expanding task scope or skipping ship/CI floors.

Governance order (with Ship-to-main):

1. Impact Analysis / Implementation Gate (when Activation Policy requires it)
2. Implementation (approved scope only)
3. Tests / Verification
4. Ship-to-main (PR → required Actions → merge → production)

A **SAFE** gate does **not** override Ship-to-main. Green CI does **not** retroactively replace required Impact Analysis.

---

## Contract

### Activation (required)

Impact Analysis is **required** when the change touches any of:

- a **P0** or **P1** hotspot (`.cursor/docs/architecture-hotspots.md`)
- Authentication / session infrastructure
- Authorization / roles / privilege gates
- Multi-tenant isolation (`tenant_id` / tenant context)
- RLS policies
- Supabase privileged / service-role / admin clients
- Payments (tenant checkout), **Wallee**, **Stripe**
- Trial / billing / subscription gating
- Middleware that affects authorization or tenant routing
- Any change classified **CRITICAL** change risk

### Skip (optional)

May skip **only** when **all** hold:

- Change risk clearly **LOW** (`.cursor/docs/change-risk-guide.md`)
- No P0 / P1 hotspot touched (including as a dependency)
- No auth / authz / tenant / RLS / privileged Supabase / payment / Wallee / Stripe / trial-billing / authz-or-tenant middleware path
- Scope unambiguous and narrowly local

Ambiguous classification → treat as **NEEDS VERIFICATION** (analysis required) until evidence shows a clean LOW skip.

### Architecture inputs (mandatory when analyzing)

| Doc | Use for |
|-----|---------|
| `.cursor/docs/architecture-hotspots.md` | P0/P1/P2 hotspots, blast radius, regressions |
| `.cursor/docs/change-risk-guide.md` | LOW / MEDIUM / HIGH / **CRITICAL** tiers |
| `.cursor/docs/dependency-map.md` | Dependency chains and shared hubs |
| `.cursor/docs/system-map.md` | Auth, tenant, payment, data flows |
| `.cursor/docs/impact-matrix.md` | Area × risk quick reference |

**Authority:** current code wins over docs. If they disagree, mark `NEEDS VERIFICATION`. Do not invent architecture. Older root Markdown claiming `COMPLETE` / `ALL FIXED` / `SECURITY COMPLETE` is not automatic posture for Impact Analysis.

### Change-risk scale (canonical)

Use **only**: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`.

Do **not** mix hotspot priority (P0/P1/P2) with change risk. P0 involvement must never be rationalized as LOW or MEDIUM change risk.

### Phases (keep separate)

| Phase | Who | Allowed |
|-------|-----|---------|
| ANALYSIS | Architect / analyzer | Classify, map hotspots/deps, assess risk, write gate **recommendation** |
| DECISION | User or separate Architect (not Executor) | Approve / block / expand scope for P0, CRITICAL, authz, tenant, RLS, payments |
| IMPLEMENTATION | Executor | Only inside approved Change Scope / Implementation Contract |
| VERIFICATION | Executor | Tests and checks from the gate + change-risk guide |

**No self-approval:** the implementing Executor must not approve their own P0 / CRITICAL / otherwise approval-required work.

### Human approval before implementation

Require explicit User/Architect approval before coding when any of:

- P0 hotspot involvement
- Change risk **CRITICAL**
- Authentication / Authorization
- Tenant isolation / RLS
- Payment / billing (including Wallee / Stripe / trial gates)

Until that approval is explicit, do **not** modify application code — even if the gate says `SAFE TO IMPLEMENT` or `IMPLEMENT WITH CAUTION`.

LOW or clearly scoped MEDIUM (none of the above) may proceed after the gate is written, with explicit non-expanded scope.

---

## Examples

**Requires gate + approval before code**

- Touch `server/utils` that uses `getSupabaseAdmin`, Wallee webhook fulfillment, or RLS migrations
- Change session cookies, role checks, or `tenant_id` filtering in Nitro handlers

**May skip (verify all skip bullets)**

- Docs-only / Cursor rules / comments
- Copy tweak on a single admin display page with no shared imports and no payment/auth path

**Out-of-scope discovery**

- Blocking finding → **STOP**, escalate, wait for explicit scope expansion (Executor must not self-fix)
- Non-blocking → **REPORT ONLY**, continue original scope

---

## Pitfalls

1. **SAFE gate ≠ ready to ship** — still need Ship-to-main / required Actions.
2. **Invented deps** — only cite hotspots and call sites verified in code.
3. **Executor self-approval** — “I am Architect therefore I approve myself” is forbidden.
4. **Scope creep from defects** — discovered bugs outside scope are not automatic work.
5. **Mixing P0 with LOW risk** — hotspot priority and change-risk tiers are different axes.
6. **Stale COMPLETE reports** — prefer `.cursor/docs/*` + code over old root status Markdown.

---

## Codepaths

| Path | Role |
|------|------|
| `.cursor/rules/impact-analysis.mdc` | Activation Policy, phases, gate template, scope control |
| `.cursor/docs/architecture-hotspots.md` | P0/P1/P2 inventory |
| `.cursor/docs/change-risk-guide.md` | Risk tiers and minimum verification |
| `.cursor/docs/dependency-map.md` | Shared hubs / chains |
| `.cursor/docs/system-map.md` | System overview for analysis |
| `.cursor/docs/impact-matrix.md` | Area × risk matrix |
| `.cursor/rules/ship-to-main.mdc` | PR / CI / production release (after gate) |
| [SHIP_TO_MAIN.md](./SHIP_TO_MAIN.md) | Human-facing ship runbook |
