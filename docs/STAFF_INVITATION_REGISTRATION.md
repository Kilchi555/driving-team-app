# Staff invitation registration

**When to use:** Concurrent staff signups against one invite; cross-tenant location assignment during register; invitation tokens appearing in logs/Sentry; debugging “Einladung ungültig” after a failed attempt.

Verified against source (Sep 2026). Commit `d9a58361` (#194). Customer role lock is [PUBLIC_REGISTER_CLIENT_ROLE.md](./PUBLIC_REGISTER_CLIENT_ROLE.md). Public invite lookup architecture notes live in `get-invitation.post.ts` (no anon SELECT on `staff_invitations`).

---

## Intent

Staff onboarding is **invite-token → register**, not self-serve role choice:

1. Admin creates a row in `staff_invitations` (pending, expiring token).
2. Invitee loads UI → `POST /api/staff/get-invitation` (token equality lookup, minimal payload).
3. Invitee submits → `POST /api/staff/register` (service-role): verify locations → **claim invite** → create Auth user + `users` (`role: 'staff'`) + assignments.

Auth (GoTrue) and `staff_invitations` are **not** one Postgres transaction. After #194 the invite is claimed with a compare-and-swap **before** Auth user creation so races cannot mint multiple staff from one token.

---

## Contract

### Consume / release

| Helper | Behavior |
|--------|----------|
| `consumePendingStaffInvitation(supabase, token, claimedAt)` | `UPDATE … SET status='accepted', accepted_at=claimedAt WHERE invitation_token AND status='pending' AND expires_at > claimedAt RETURNING …`. Loser gets `null`. |
| `releaseStaffInvitationClaim(supabase, id, claimedAt)` | Restores `pending` / clears `accepted_at` **only** for this claim (`id` + `accepted_at` match). Used when Auth/profile steps fail **before** a staff profile is committed. |

Order inside `register.post.ts` (simplified):

1. Normalize token; rate-limit; validate email/password.
2. Preview pending invite (email bind + expiry) — wrong email must not consume.
3. `verifyStaffRegistrationLocations` (tenant ownership) — reject **before** claim.
4. `consumePendingStaffInvitation` — single winner.
5. Create Auth user + `users` row (`role: 'staff'`, `tenant_id` from invitation — **never** from body).
6. Write verified `staff_locations` / exam locations / working hours.
7. On failure before profile commit: delete Auth user (if any) + `releaseStaffInvitationClaim`.

### Location ownership

Client-supplied `selectedLocationIds` / `selectedExamLocationIds` are later written with **service_role**, so RLS does not protect them.

| Scope | Allowed rows |
|-------|----------------|
| Standard | `locations.tenant_id = invitation.tenant_id` |
| Exam | `tenant_id IS NULL AND location_type = 'exam'` (shared catalogue; same rule as get-invitation) |

Malformed / oversized arrays (>200) or partial ownership → **400**, no claim.

### Token logging

| Helper | Use |
|--------|-----|
| `redactSensitiveUrl(href)` | Redact known secret query keys (`token`, `invitation_token`, `access_token`, …) |
| `urlWithoutQueryForLogs(href)` | Origin + pathname only (prefer for referers) |

`GET /api/auth/current-user` logs referer via `urlWithoutQueryForLogs` so invite URLs do not leak tokens into logs.

### Public get-invitation

- Lookup **only** by `invitation_token` + `status='pending'` (service_role).
- Do **not** restore anon SELECT on `staff_invitations`.
- Do **not** look up by caller-supplied `tenant_id`, invitation id, or email.

---

## Pitfalls

1. **SELECT-then-UPDATE is not safe** — concurrent requests all passed the pending check before #194. Always use the guarded update helpers.
2. **Claim before Auth** — if you create the Auth user first, losers of a race still leave orphan Auth users.
3. **Release is claim-scoped** — releasing without matching `accepted_at` must not reopen someone else’s successful registration.
4. **Email-bound invites** — mismatch is rejected **pre-claim** so a wrong email cannot briefly consume the token.
5. **Body `tenant_id` / `role` are not inputs** — tenant comes from the invitation; role is hardcoded `staff`.
6. **Exam vs standard** — assigning another tenant’s “standard” location as if it were exam will fail ownership checks.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/consume-staff-invitation.ts` | Atomic claim + release |
| `server/utils/verify-staff-locations.ts` | Pre-claim location ownership |
| `server/api/staff/register.post.ts` | Full staff registration orchestration |
| `server/api/staff/get-invitation.post.ts` | Public token lookup + location catalogues |
| `utils/redact-sensitive-url.ts` | URL redaction for logs |
| `server/api/auth/current-user.get.ts` | Referer logging without query secrets |
| `plugins/sentry.client.ts` | Client error reporting (token-safe URLs) |
| `pages/register/staff.vue` | Staff registration UI |
| `server/utils/__tests__/consume-staff-invitation.test.ts` | Claim/release unit coverage |
| `server/utils/__tests__/verify-staff-locations.test.ts` | Ownership / malformed input |
| `server/utils/__tests__/staff-get-invitation.security.test.ts` | Lookup surface contracts |
| `server/utils/__tests__/redact-sensitive-url.test.ts` | Redaction helpers |
