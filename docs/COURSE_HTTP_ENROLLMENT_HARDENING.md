# Course HTTP enrollment hardening

**When to use:** Public Kursanmeldung fails with 404/400 for private or cancelled courses; custom session swaps pull another tenant’s slots; legacy `/api/courses/enroll` or `enroll-complete` clients break; debugging #205 / Course HTTP P0–P1.

Verified against source (Sep 2026). Merge `a3f9fd47` (#205), incorporating reviewed #198.

Payment method / empty-email / staff autofill rules (#186–#189) are a separate concern — do not fold them into this runbook.

---

## Intent

Public course HTTP surfaces must:

1. Derive **tenant authority from the course row**, not from a client-supplied `tenantId`.
2. Only enroll courses that are **public, active, and status ∈ {`active`,`scheduled`}**.
3. Validate **custom session swaps** against the same tenant and (for public flows) public parent courses.
4. Complete Wallee enrollments via the **webhook**, not a client-called completion writer.
5. Retire leftover writers that could create confirmed registrations outside those paths.

Out of scope for #205 (do not assume fixed here): SQL migrations, RLS, atomic capacity, waitlist security, Wallee idempotency.

---

## Contract

### Canonical public writers

| Surface | Role |
|---------|------|
| `POST /api/courses/enroll-cash` | Cash-on-site / invoice (no upfront Wallee) |
| `POST /api/courses/enroll-wallee` | Creates pending registration + starts public payment |
| `POST /api/payments/process-public` | Public Wallee charge (courseId path) **or** admin payment-link (`enrollmentId` pending) |
| `POST /api/wallee/webhook` | Confirms registration after payment; SARI enroll; confirmation email |

### Retired writers (HTTP 410, no side effects)

| Route | Why retired |
|-------|-------------|
| `POST /api/courses/enroll` | Authenticated JWT could create a **confirmed** registration outside admin/public flows |
| `POST /api/courses/enroll-complete` | Legacy client completion after Wallee; registration is created by the webhook |

Status message points callers at `enroll-wallee` / `enroll-cash` / admin enrollment.

### Public course authority (`loadPublicCourseForEnrollment`)

| Rule | Behavior |
|------|----------|
| Course id | Must be a valid UUID → else **400** |
| Visibility | `is_public === true` and `is_active !== false` → else **404** |
| Status | Only `active` / `scheduled` (`PUBLIC_ENROLLABLE_STATUSES`) → else **400** (“Dieser Kurs kann derzeit nicht gebucht werden.”) |
| Client `tenantId` | Optional; if present must match `course.tenant_id` → else **404** |
| Authoritative tenant | Always `course.tenant_id` |

Used by `enroll-cash`, `enroll-wallee`, and the **courseId** branch of `process-public` (before payment insert / Wallee create).

### `process-public` branches

| Branch | Authority |
|--------|-----------|
| `enrollmentId` set | Load **pending** registration for `tenantId`; require nested course `is_public`; **do not** call `loadPublicCourseForEnrollment` |
| `courseId` (public checkout) | `loadPublicCourseForEnrollment` then overwrite `tenantId` from course; assert custom sessions with `requirePublic: true` |

Payable amount is recomputed from DB — client amount is not trusted for the Wallee charge.

### Custom sessions (`assertCustomSessionsForTenant`)

| Rule | Behavior |
|------|----------|
| Empty / null | Allowed (no custom sessions) |
| Pointers | Must resolve session UUID and/or SARI ids; malformed UUIDs → **400** |
| Tenant | Resolved session/course tenant must equal authoritative `tenantId` |
| `requirePublic: true` | Parent course of each session must be public |
| Cross-tenant / private course ids | Fail closed (**400**) |
| Sanitized payload | Server rewrites `sessionId` / `courseId` / SARI ids from DB |

Public enroll + public checkout pass `requirePublic: true`. Webhook uses `requirePublic: course.is_public === true` and **ignores** invalid custom sessions on SARI enroll (warn + drop) rather than failing the whole payment.

### Webhook tenant binding

- Course load for registration creation: `.eq('tenant_id', payment.tenant_id)` and `course.tenant_id === payment.tenant_id`.
- SARI enroll path: abort if `course.tenant_id !== registration.tenant_id`.
- Custom sessions re-validated with registration tenant before applying swaps.

### Related catalog / customer gates (same slice)

| Surface | Gate |
|---------|------|
| `GET /api/courses/available-sessions` | Public: catalog by `tenantId` + public courses. `admin=true` → `requireAdminProfile`; foreign `tenantId` → **403** (not a data source) |
| `GET /api/courses/transfer-targets` | Tenant-scoped; excludes private courses |
| `GET /api/customer/upcoming-course-registrations` | Filter `tenant_id`; allowlisted columns (no `select('*')`, no `sari_faberid` / `license_number`) |
| Public course embeds | Prefer `courseSessionsEmbed` / `course_sessions!course_sessions_course_id_fkey` (FK-safe) |

### Confirmation email callers (P0-05)

Trusted internal secret forwarders after #205:

- `enroll-cash.post.ts`
- `wallee/webhook.post.ts`
- `admin/courses/enroll-user.post.ts`
- `admin/courses/add-participant.post.ts`
- `admin-course-enroll.ts`

Legacy `/api/courses/enroll` is **not** a caller (retired).

---

## Pitfalls

1. **Client `tenantId` is not an auth boundary** — Mismatch with the course row is 404; never authorize from the body alone.
2. **Calling retired enroll routes** — Expect **410 Gone** with zero DB writes. Point integrations at cash/wallee/admin.
3. **Expecting `enroll-complete` after Wallee** — Registration is webhook-driven; client completion is gone.
4. **Admin payment-link vs public checkout** — `enrollmentId` path skips `loadPublicCourseForEnrollment` but still requires a public pending registration.
5. **Private course sessions in public customSessions** — Fail closed even if UUID is guessable.
6. **`available-sessions?admin=true` without auth** — Must fail admin gate; query-string admin is not enough.
7. **Unqualified `course_sessions` embeds** — Ambiguous FKs break PostgREST; use `course_sessions_course_id_fkey`.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/course-custom-sessions.ts` | `loadPublicCourseForEnrollment`, `assertCustomSessionsForTenant`, `PUBLIC_ENROLLABLE_STATUSES` |
| `server/utils/course-session-embed.ts` | FK-qualified embeds + column allowlists |
| `server/api/courses/enroll-cash.post.ts` | Public cash/invoice writer |
| `server/api/courses/enroll-wallee.post.ts` | Public Wallee pending writer |
| `server/api/courses/enroll/post.ts` | Retired → 410 |
| `server/api/courses/enroll-complete.post.ts` | Retired → 410 |
| `server/api/payments/process-public.post.ts` | Public checkout + payment-link |
| `server/api/wallee/webhook.post.ts` | Tenant-bound registration + custom session re-check |
| `server/api/courses/available-sessions.get.ts` | Public catalog / admin-gated swap list |
| `server/api/customer/upcoming-course-registrations.get.ts` | Tenant-scoped customer roster |
| `server/utils/__tests__/course-http-p0p1.test.ts` | Helper + source-contract gates |
| `server/utils/__tests__/p0-05-email-endpoint-authz.test.ts` | Trusted confirmation email callers |
