# Student contact conflict (phone / email)

**When to use:** Staff edit of a client fails with 409; message names another person; unique constraint on `(phone, tenant_id)` or `(email, tenant_id)` after save; onboarding-pending or deactivated duplicates confuse support.

Verified against source (Aug 2026).

---

## Intent

When staff update a client’s phone or email, surface **who already owns** that contact in the same tenant (including deactivated / pending onboarding), instead of a generic DB error.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Staff UI | `components/StudentDetailsEditModal.vue` — shows API `statusMessage` |
| API | `POST /api/staff/update-student-details` — staff/admin, same-tenant only |
| Messages | `server/utils/student-contact-conflict.ts` |

Auth: caller must be `staff` or `admin` with matching `tenant_id`. Roles like `accountant` are rejected (403).

---

## Conflict rules

1. Email: trim + lower-case; empty → `null`. Pre-check `ilike` on email within tenant, excluding current user → **409** with `duplicateEmailMessage`.
2. Phone: trim; empty → `null`; else `normalizePhoneNumber` (invalid → **400**). Pre-check exact normalized phone within tenant → **409** with `duplicatePhoneMessage`.
3. If a unique constraint still fires (`users_phone_tenant_unique` / `users_email_tenant_unique`), map via `messageForUniqueConstraint` (name may be missing → generic German text).

Hints appended to the other person’s name:

| Condition | Hint |
|-----------|------|
| `deleted_at` set or `is_active === false` | `(deaktiviertes Konto)` |
| `onboarding_status === 'pending'` | `(Onboarding noch offen)` |

Example: `Diese Telefonnummer ist bereits bei Max Muster (Onboarding noch offen) hinterlegt.`

---

## Pitfalls

1. **Tenant-scoped only** — Same phone at another school is allowed; conflicts are per `tenant_id`.
2. **Normalization** — Staff must enter a parseable CH/international number; free-text fails with 400 before conflict checks.
3. **Race** — Two parallel edits can still hit the unique index; API maps that to 409 without always naming the other user.
4. **Clearing contact** — Empty email/phone stores `null` and does not conflict.

---

## Ops checks

```sql
-- Find owners of a phone inside a tenant
SELECT id, first_name, last_name, phone, email, is_active, deleted_at, onboarding_status
FROM public.users
WHERE tenant_id = '<tenant-uuid>'
  AND phone = '<normalized-phone>';

-- Same for email (stored lower-case)
SELECT id, first_name, last_name, email, is_active, deleted_at, onboarding_status
FROM public.users
WHERE tenant_id = '<tenant-uuid>'
  AND lower(email) = lower('<email>');
```

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/student-contact-conflict.ts` | Message helpers + unique-constraint mapping |
| `server/api/staff/update-student-details.post.ts` | Pre-checks + update |
| `components/StudentDetailsEditModal.vue` | Staff edit UX |
| `server/utils/__tests__/student-contact-conflict.test.ts` | Unit coverage for messages |
