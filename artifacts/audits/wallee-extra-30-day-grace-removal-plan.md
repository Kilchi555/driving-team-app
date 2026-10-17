# Remove Additional 30-Day Wallee Activation Grace — Investigation & Implementation Plan

**Verdict: READY FOR IMPLEMENTATION** (planning only — **no code changed**)

**Observed (UTC):** `2026-10-17T14:26:00Z` (approx.)  
**Repo:** Kilchi555/driving-team-app  
**Mode:** Read-only investigation + plan. No commits, deploys, DB writes, or Stripe/Wallee mutations.

---

## 1. Executive summary

The “extra 30 days” are **not** an extension of `tenants.trial_ends_at` (the registration SaaS free trial). They are a **second Stripe subscription trial** (`subscription_data.trial_period_days: 30`) created at **paid-plan Checkout** when the tenant opts into Wallee and Wallee is not yet `active`.

That Stripe trial:

- Delays the **first SaaS subscription charge** until trial end (or until super-admin Wallee activation ends the trial early).
- Is **independent** of lesson-payment processing once Wallee credentials exist.
- Is **conflated in UX copy** with “Abrechnung startet erst wenn Online-Zahlungen aktiv sind,” which over-promises free SaaS time.

**Product intent to implement later:** Keep the original 30-day SaaS registration trial (`SAAS_TRIAL_DAYS`). Do **not** grant another 30 free SaaS billing days solely because Wallee onboarding is incomplete.

---

## 2. Exact source of the additional 30 days

| Location | Role |
|----------|------|
| `server/api/stripe/create-checkout-session.post.ts` **L243–277** | **Authoritative writer.** `needsWalleeTrial = withWallee && !wallleeAlreadyActive` → `subscription_data.trial_period_days: 30` + Checkout `custom_text.submit` promising free until Wallee active. |
| `server/api/stripe/create-checkout-session.post.ts` **L102–113** | `wallleeAlreadyActive = tenant.wallee_onboarding_status === 'active'` — only then **skips** the Stripe trial. |
| `server/api/stripe/webhook.post.ts` **L58–72, L322–335** | On `checkout.session.completed` / subscription upsert: if `with_wallee=true` and Stripe `status=trialing`, sets `wallee_trial_started_at`; always sets `is_trial: false` + plan + `current_period_end`. Sends Wallee welcome email. |
| `server/api/admin/wallee-activate.post.ts` **L105–127** | On successful Wallee activation: if Stripe sub is `trialing`, `subscriptions.update({ trial_end: 'now' })` — **ends** the billing pause early. |
| `server/api/cron/send-wallee-reminders.get.ts` | Reminds at days 10/20/27 from `wallee_trial_started_at` with “X Tage bis zur Abrechnung” (assumes 30-day window). |
| `utils/saas-trial.ts` | Documents **separation**: registration trial ≠ Wallee Stripe `trial_period_days`. |

**Not the source:** registration `trial_ends_at` (`register.post.ts` + `SAAS_TRIAL_DAYS`), Wallee payment timeouts, lesson `payments` tables, website hosting trials.

The period is **stored in Stripe** as subscription trial end (and mirrored into `tenants.current_period_end` via webhook). Locally `wallee_trial_started_at` marks reminder schedule start — it does **not** by itself grant SaaS access.

---

## 3. Current-state flow (numbered)

1. Tenant registers → SaaS free trial: `is_trial=true`, `trial_ends_at = now + SAAS_TRIAL_DAYS` (30).
2. Tenant opens `/upgrade`, leaves **Online-Zahlungen** on (`withWallee` default **true**).
3. `POST /api/stripe/create-checkout-session`: if `wallee_onboarding_status !== 'active'`, Checkout creates subscription with **`trial_period_days: 30`**.
4. Customer completes Checkout (card collected; first charge deferred by Stripe trial).
5. Webhooks / `sync-subscription`: tenant becomes `is_trial=false`, `subscription_plan` = starter/…, `current_period_end` ≈ Stripe trial/period end; `wallee_trial_started_at` set if trialing+Wallee.
6. SaaS write gate (`evaluateTenantSubscriptionWriteAccess`) treats them as **paid_active** while `current_period_end` is future — **full SaaS access without a successful paid invoice**.
7. Until Wallee is activated: lesson online payments unavailable (or pending); cron emails count down 30 days.
8. Super-admin `wallee-activate` → credentials saved → Stripe `trial_end: 'now'` → billing starts (subject to Stripe invoice).
9. If Wallee never activates: Stripe trial still ends after ~30 days → billing starts anyway (reminder copy states this).

**Without Wallee at Checkout:** no `trial_period_days` → “Abrechnung startet sofort.”

---

## 4. Policy answers (Phase 2)

| # | Answer |
|---|--------|
| 1 Origin | Stripe Checkout `trial_period_days: 30` when upgrading with Wallee and Wallee not active |
| 2 Trigger | `withWallee !== false` AND `wallee_onboarding_status !== 'active'` |
| 3 Stored vs dynamic | Stripe subscription trial; mirrored `current_period_end`; `wallee_trial_started_at` for reminders |
| 4 Scope | Only tenants choosing Wallee at Checkout while not already active |
| 5 Effect | Delays **SaaS subscription charging**; does **not** equal Wallee lesson-payment capability |
| 6 Overlap with registration trial | Separate systems. Upgrade **clears** `is_trial` and starts Stripe trial — can yield a **second** free SaaS window after (or during) the first |
| 7 Activate before/during/after original trial | Before/during upgrade with inactive Wallee → still get Stripe 30-day trial. After registration trial expired → upgrade+Wallee still gets Stripe 30-day trial. Activate Wallee during Stripe trial → early `trial_end: now`. Activate after Stripe trial ended → no trial to end; billing already running |
| 8 Existing tenants on this period | Currently `trialing` in Stripe with `with_wallee` — still in free SaaS billing pause until trial ends or activation |
| 9 Other providers | Same Checkout path; not shared with website Stripe or Wallee charge APIs |
| 10 Removal risk | Removing Stripe trial does **not** by itself revoke SaaS access for tenants already on paid period; it stops **new** free billing pauses. Existing `trialing` subs need an explicit migration/product choice |

### Three systems (do not conflate)

| System | What it controls |
|--------|------------------|
| **SIMY SaaS entitlement** | `is_trial` / `trial_ends_at` / plan / `current_period_end` → navigation + write gates |
| **Wallee setup/activation** | Credentials, `wallee_onboarding_status`, online payment toggle |
| **Lesson payments** | Customer charges via Wallee once configured |

---

## 5. Frontend truthfulness audit

| File / surface | Current user-visible message | States |
|----------------|------------------------------|--------|
| `pages/upgrade.vue` ~42 | “30 Tage kostenlos testen…” | Registration/SaaS marketing trial (keep; different concept) |
| `pages/upgrade.vue` ~330–338 | Mit Wallee: “Abrechnung startet erst wenn alles aktiv ist — du hast **30 Tage Zeit**.” Ohne: “Abrechnung startet sofort.” | Before Checkout |
| `pages/upgrade.vue` ~466–468 | Banner: Abrechnung starts when online payments active — **30 Tage Zeit** (HR + Wallee) | Before Checkout |
| `create-checkout-session` Checkout `custom_text` | “Du wirst erst belastet, sobald dein Wallee-Konto aktiviert ist. Bis dahin läuft dein Abonnement **kostenlos**.” | Stripe Checkout UI |
| `pages/payment/success.vue` ~20–27 | “erst abgerechnet, wenn Wallee aktiv — **30 Tage** Zeit”; “Abrechnung startet erst nach der Aktivierung” | After Checkout with `wallee_setup=1` |
| Webhook welcome email subject/body | “30 Tage”; timeline; “Abrechnung startet erst wenn Online-Zahlungen aktiv” | After Checkout completed |
| Cron `send-wallee-reminders` | “X Tage verbleibend / bis zur Abrechnung” | Days 10/20/27 of Wallee trial window |
| `components/admin/WalleeOnboardingWidget.vue` ~38, ~90 | Active: “Ab heute wird die Abrechnung gestartet.” Pending: “Abrechnung startet erst ab diesem Zeitpunkt.” | Profile onboarding |
| Marketing pages (`fahrschule-software.vue`, etc.) | “30 Tage kostenlos” for **product trial** | Leave unless they claim Wallee-linked free billing |

**Misleading:** Copy implies SaaS billing waits **until Wallee is active**, but Stripe trial also **ends after 30 days even if Wallee is still pending**. Also implies a free period **because of** Wallee setup, stacking on the registration trial.

### Proposed replacement copy (German — draft for implementation PR)

**Upgrade toggle (with Wallee):**  
“Online-Zahlungen (Wallee) richten wir nach dem Upgrade ein (ca. 2–5 Werktage nach Antrag). **Dein Simy-Abo wird gemäss Plan abgerechnet** — die Einrichtung von Online-Zahlungen verlängert die Testphase nicht. Ohne Wallee bleiben Bar- und Rechnungszahlung möglich.”

**Upgrade toggle (without Wallee):**  
“Nur Bar- und Rechnungszahlung. Online-Zahlungen kannst du später unter Einstellungen beantragen. Die Abo-Abrechnung startet gemäss deinem Plan.”

**Order banner:**  
“Online-Zahlungen sind optional und **kein** zusätzliches Gratis-Abo. Die SaaS-Abrechnung folgt deinem gewählten Plan und der bestehenden Test-/Vertragsperiode.”

**Checkout custom_text:** Remove the “Abonnement kostenlos bis Wallee aktiv” message; if Stripe trial is removed, do not promise deferred billing.

**Success page:**  
“Abo eingerichtet. Als Nächstes: Wallee-Antrag ausfüllen, damit Kunden online zahlen können. **Hinweis:** Die Abo-Abrechnung richtet sich nach deinem Plan — nicht danach, ob Wallee schon aktiv ist.”

**Welcome / reminder emails:** Retarget to onboarding progress only; remove “30 Tage bis Abrechnung / gratis bis aktiv” framing once backend trial is removed. Until existing Stripe trials drain, reminders may still reference remaining Stripe trial days from live subscription data — do not invent dates.

**Wallee widget pending:**  
“Wir richten Wallee ein (ca. 5 Werktage). Online-Kundenzahlungen sind erst danach möglich. **Dein Simy-Abo läuft unabhängig davon.**”

**Wallee widget active:**  
“Online-Zahlungen sind aktiv. Kundenzahlungen per Karte/TWINT möglich.” (Drop “Ab heute wird die Abrechnung gestartet” if billing already started or is independent.)

---

## 6. Impact on existing tenants / migration

| Cohort | Impact of removing Checkout Stripe trial going forward |
|--------|--------------------------------------------------------|
| New upgrades with Wallee | Charged per Stripe subscription rules immediately (no extra 30-day pause) |
| Already `trialing` + `with_wallee` | **Unaffected by code-only Checkout change** until Stripe trial ends or admin ends trial |
| Already paid / period active | Unaffected |
| Registration trial only (not upgraded) | Unaffected (`SAAS_TRIAL_DAYS`) |

**Migration options (human decision required — not executed):**

1. **Soft:** Stop creating new Stripe trials; let existing `trialing` subscriptions expire naturally.  
2. **Hard:** End all current Wallee-related Stripe trials (`trial_end: now`) — revenue/ops impact; needs explicit approval.  
3. **Data:** Optional clear/stop using `wallee_trial_started_at` for billing messaging; **no** need to rewrite `trial_ends_at` (different field).

No DB schema migration is **required** to stop granting new grace periods. Reminder cron and emails should be updated so they do not assume a universal 30-day billing pause.

---

## 7. Test plan & regression risks

### Proposed tests (to add in implementation PR)

1. Checkout with `withWallee=true`, Wallee not active → **no** `trial_period_days` (after change).  
2. Checkout with Wallee already `active` → still no trial (unchanged).  
3. Checkout `withWallee=false` → no trial (unchanged).  
4. Registration tenant: `is_trial` / `trial_ends_at` still `SAAS_TRIAL_DAYS`.  
5. Webhook upsert while Stripe `trialing` (legacy): still sets plan fields; document behavior.  
6. `wallee-activate` still ends Stripe trial if present (keep for legacy).  
7. Write-access: expired registration trial without upgrade still blocked; paid period still allowed.  
8. Lesson payment paths unchanged when Wallee credentials present.  
9. Frontend copy snapshots / string tests for upgrade + success pages.

### Regression risks

- Tenants who **expected** free billing until Wallee live will be charged earlier — communicate in UI **before** Checkout.  
- Reminder cron copy becomes wrong if still saying “Tage bis Abrechnung” after trials removed.  
- Do **not** repurpose `trial_ends_at` for Wallee.  
- Do **not** remove payment-provider timeouts unrelated to this Stripe trial.  
- Entitlement already treats Stripe-trial tenants as paid (`is_trial=false`) — removing future trials reduces unpaid-but-writable windows (aligns with payment reconciliation findings).

---

## 8. Smallest safe implementation plan

### Backend (minimal)

1. In `create-checkout-session.post.ts`: stop setting `trial_period_days: 30` (and remove/replace Checkout `custom_text` that promises free until Wallee).  
2. Keep `with_wallee` metadata for onboarding/emails.  
3. Keep `wallee-activate` early `trial_end: 'now'` for **legacy** trialing subs.  
4. Adjust `send-wallee-reminders` + welcome email templates to drop “gratis bis Abrechnung / 30 Tage Billing-Pause” claims (or gate on live Stripe `trialing` status only for legacy).

### Frontend

1. Rewrite `upgrade.vue` Wallee toggle + banner copy.  
2. Rewrite `payment/success.vue` Wallee setup messaging.  
3. Soften `WalleeOnboardingWidget` “Abrechnung startet…” lines.  
4. Leave standalone “30 Tage kostenlos testen” marketing for **registration** trial unless product wants a separate pass.

### Tests

- Unit/HTTP: Checkout session params with/without Wallee; assert absence of `trial_period_days`.  
- String/contract tests for key German phrases if the repo pattern allows.

### Migration

- **Not required** for schema.  
- Optional ops runbook for existing Stripe `trialing` + `with_wallee` tenants (soft vs hard end).

### Docs

- Update any internal notes that describe Wallee Checkout as a 30-day billing pause; keep `utils/saas-trial.ts` comment accurate.

---

## 9. Explicit unknowns / evidence still needed

1. Product choice for **in-flight** Stripe `trialing` Wallee tenants (soft drain vs end now).  
2. Whether Checkout without trial still collects a payment method and creates `incomplete`/`active` as desired in live Stripe mode (verify in test mode during implementation).  
3. Exact live Stripe Price behavior (proration, collection method) when trial is omitted — confirm in Stripe Dashboard at implement time.  
4. Full inventory of Resend templates outside repo (if any) that still promise the grace.  
5. Whether any B2B contract PDF/AGB text promises Wallee-linked free billing (legal review).

---

## 10. Actions not performed

- No code edits, commits, pushes, merges, deploys  
- No DB/Stripe/Wallee/email mutations  
- No assumption that Production already matches this plan  

---

## Recommended next step

Open a **draft** implementation PR that (1) removes `trial_period_days` for Wallee Checkout, (2) updates the listed German UI/email strings, (3) adds Checkout param tests, (4) documents soft handling of existing `trialing` subscriptions — after human sign-off on the in-flight tenant policy.
