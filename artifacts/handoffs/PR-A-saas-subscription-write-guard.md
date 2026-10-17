# PR-A — Server-Side SaaS Subscription Write Access

**Verdict: PASS — PR-A IMPLEMENTED, DRAFT READY FOR HUMAN REVIEW**

## Identity

| Item | Value |
|------|-------|
| Branch | `cursor/saas-subscription-write-guard-9780` |
| Base | `origin/main` @ `ef794668f909826057a713393333af2ed31b70d2` |
| Mode | Draft PR only — no merge / deploy / migrations |
| Scope | Staff/admin (+ in-tenant customer confirm/cancel) appointment & course calendar mutations |

## Guard semantics

Pure policy: `evaluateTenantSubscriptionWriteAccess(snapshot, now)`  
Module: `utils/tenant-subscription-write-access.ts`

| Condition | `writable` | `reasonCode` |
|-----------|------------|--------------|
| Missing / null snapshot | false | `missing_snapshot` |
| `website_only === true` | true | `website_only_bypass` |
| Active trial (`now <= trial_ends_at`, or no end) | true | `active_trial` |
| Trial expired (`now > trial_ends_at`) | false | `trial_expired` |
| Paid + `now < current_period_end` | true | `paid_active` |
| Paid + `now >= current_period_end` | false | `paid_period_lapsed` |
| Paid + missing `current_period_end` | true | `paid_period_missing_compat` |
| Bad dates / `!is_trial` with plan `trial`/missing | false | `inconsistent_subscription_state` |

Aligned with `decideTrialGate`: trial uses `now > end`; paid uses `!(now < end)`. **No grace period.** No Zurich EOD. Website entitlement is **not** reused.

Server helper: `assertTenantSubscriptionWritable`  
→ loads trusted tenant row via service-role client  
→ **402** `{ code: 'saas_subscription_required', reason }` when blocked  
→ **503** `{ code: 'saas_subscription_lookup_failed' }` on lookup failure (fail-closed, not mislabeled as expiry)  
→ explicit `bypass: 'system' | 'billing'` only (never from body/query)  
→ structured logs: tenantId, userId, route, reasonCode (no PII/tokens)

**Superadmin:** target tenant ID is used; acting-for-tenant does **not** bypass that tenant’s restriction.

**`website_only`:** same SaaS nav bypass. These tenants are website-product tenants; if they somehow hit SaaS appointment APIs with a valid session, the gate allows (parity with `decideTrialGate`). They are not granted access to *other* tenants’ data — tenant ownership checks still apply first.

## Route enforcement matrix

| Route | Guard site | Notes |
|-------|------------|-------|
| `POST /api/appointments/save` | After tenant isolation | Trusted tenant = body tenant after auth check, else profile |
| `POST /api/appointments/create-vacation-range` | After auth | `authUser.tenant_id` |
| `POST /api/calendar/manage` | Mutation actions only | `create-appointment`, `update-appointment-status` — **not** `create-payment` (OUT) |
| `POST /api/staff/update-appointment` | After ownership load | Before credit/duration side-effects |
| `POST /api/staff/batch-update-appointment-status` | After batch tenant verify | Before update |
| `POST /api/appointments/adjust-duration` | After tenant check | Staff: enforce; internal secret: `bypass: 'system'` |
| `POST /api/appointments/confirm` | After ownership | Customer write on school tenant |
| `POST /api/appointments/confirm-with-payment` | After ownership | Before payment mutations |
| `POST /api/appointments/delete` | After same-tenant authz | |
| `POST /api/staff/delete-appointment` | After ownership | |
| `POST /api/appointments/cancel-staff` | After appointment load | Before `handle-cancellation` |
| `POST /api/appointments/cancel-customer` | After ownership | |
| `POST /api/appointments/manage-products` | After authz; mutate only | `delete`/`save` only; not `get` |
| `POST /api/admin/appointments/cancellation-obligation` | Non-dry-run path only | |
| `POST /api/exams/save-result` | After appt tenant verify | Marks appointment completed |
| `POST /api/staff/save-criteria-evaluations` | After appt tenant verify | Marks appointment completed |
| `POST /api/admin/resources/block` | After resource ownership | |
| `POST /api/admin/resources/block/cancel` | After booking verify | |
| `POST /api/admin/courses/upsert` | Immediately after admin auth | Before course/session/appt writes |
| `POST /api/admin/courses/update-session-instructors` | After course load | Before session/appt mutations |
| `POST /api/admin/courses/cancel-course` | After course load | |
| `POST /api/courses/update-status` | Before course update | Covers calendar sync path |
| `POST /api/medical-certificate/approve-and-cancel` | After appt load | Cancels appointment |

`course-staff-notifications.ts`: **not** gated inside the helper (not an HTTP boundary). Callers above are gated.

## Explicitly omitted (with reason)

| Path | Reason |
|------|--------|
| `apply-discount` | Frozen handler always 403; no DB mutation today |
| Medical `approve` / `reject` | **STOP** — `event.context.user`, no tenant filter on appointment load; auth ownership unclear → not speculative |
| Medical `upload`, `customer/update-medical-certificate` | Field updates on already-cancelled / medical metadata; not create/cancel calendar mutations for PR-A staff calendar scope; follow-up |
| Calendar `create-payment` | Payment write — OUT of PR-A |
| Public booking / guest / reserve-slot / proposals / rentals | Product OUT |
| Stripe / webhooks / cron / handle-cancellation direct | System/billing OUT (cancel-staff entry gated) |
| Invoice / cash / wallet / settings / invites | OUT |
| Website entitlement | Separate product |
| Client UI read-only (PR-B) | OUT |

## Follow-up risks (incomplete wider inventory)

Discovered appointment write surfaces **not** guarded in PR-A (flag only):

- `server/api/admin/payment-operations.post.ts` (soft/hard delete)
- `server/api/payments/process.post.ts`
- `server/api/booking/guest-book.post.ts` (OUT by product)
- `server/utils/dispatch-appointment-confirmation.ts`
- `server/utils/course-staff-notifications.ts` (caller-gated for IN routes)
- `server/utils/lookup-phone-click-attribution.ts`
- Direct client Supabase / Edge Function writes: **not exhaustively audited**

**Do not claim every write path is protected.**

## Tests

| Command | Exit |
|---------|------|
| `npm run lint` | **0** |
| `npx vitest run utils/__tests__/tenant-subscription-write-access.test.ts server/utils/__tests__/assert-tenant-subscription-writable.test.ts server/utils/__tests__/saas-subscription-write-guard.http.test.ts` | **0** (30 tests) |
| `npx vitest run` …save-price, save-credit, category-default-payment-method (with assert mocked in those suites) | **0** for those files |
| Full `npx vitest run` | Pre-existing unrelated failures remain (`website-landing-nav.browser`, `payment-receipt-reset.db`, porcelain check in `course-invoice-phase1-schema` while dirty). PR-A suites green. |

Mocks/PGlite are **not** production evidence. No production/staging writes performed.

## Compatibility

HTTP **402** + `data.code = 'saas_subscription_required'` matches existing billing-style 402 patterns (`website_payment_required`, invite seat limits). Clients without special handling still surface statusMessage pointing to `/upgrade`. Dedicated client UX reserved for PR-B.

## Safety confirmation

- No production / shared-staging DB writes  
- No migrations  
- No Stripe / Supabase / Vercel / DNS / secrets / deploy changes  
- No auto-merge  
- Draft PR only; human review is the next gate  

## Unresolved concerns (non-blocking for draft)

1. Medical `approve`/`reject` auth model needs a separate hardening PR before gating.  
2. `manage-products` profile-missing fallback compares auth UUID to DB user ids (pre-existing); gate uses `appointment.tenant_id` after that path.  
3. `exams/save-result` and `save-criteria-evaluations` still lack staff role checks (pre-existing); subscription gate added after tenant-scoped appointment verify.  
4. Wider Supabase/Edge inventory incomplete by design.
