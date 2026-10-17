# Invitation role during registration (#362)

Verified against `main` tip including `26e19cb9`. Distinct from #344 (`public.users.role` learner vocabulary).

## Intent

Make the **stored invitation role** the only authority for whether an invite accepts as `admin` or `staff`, which registration endpoint may consume it, and whether staff operational rows are created. UI copy and wizard steps are display-only.

## Contract

Helpers in `server/utils/invitation-role.ts` (additions in #362; invite parsing already existed):

- `roleFromInvitation(role)` — invitation is authoritative at accept: exact `'admin'` → `admin`, anything else → `staff`.
- `legacyAcceptsInvitationRole(role)` — legacy `POST /api/auth/register` `action=register-staff` continues only when stored role is exactly `'staff'`. Admin (and any other) invitations must not be accepted or consumed on that path (**403** before password / Auth / profile / token consume).
- `createsStaffOperationalRecords(role)` — `true` only for `staff`. Working hours, locations, calendar, availability belong to staff invitations only.

Client display helpers in `utils/staff-registration-flow.ts`:

- `displayInvitationRole` — from get-invitation payload; **not** authorization.
- `registrationStepSkipped` — admin invitations skip staff onboarding steps 1–5 (categories / hours / locations / calendar / documents); steps 0 and 6 remain.
- `registrationHomePath(serverRole)` — only the **registration response** `role` is authoritative: exact `'admin'` → `/admin`, else `/dashboard`.

Canonical accept path for both roles: `POST /api/staff/register` uses `registeredRole = roleFromInvitation(invitation.role)`, inserts `users.role = registeredRole`, and gates operational inserts with `createsStaffOperationalRecords(registeredRole)`.

## Pitfalls

- Do not accept admin invites on legacy `/api/auth/register` register-staff — that path must refuse before consume.
- UI `loadedInvitationRole` / `isAdminInviteUi` must not be treated as server authorization.
- Admin invites must not create staff operational rows even if the client posts hours/locations.
- Open draft **#196** `STAFF_INVITATION_REGISTRATION` covers CAS consume / location ownership / URL redaction — extend that mental model with this role lock; do not rewrite that draft here.
- Unrelated to #344 `student`/`client` learner role storage.

## Codepaths

| Symbol / path | Role |
|---|---|
| `legacyAcceptsInvitationRole` → `server/api/auth/register.post.ts` | Legacy staff-only accept gate |
| `roleFromInvitation`, `createsStaffOperationalRecords` → `server/api/staff/register.post.ts` | Authoritative role + ops gating |
| `utils/staff-registration-flow.ts` + `pages/register/staff.vue` | Display-only wizard / redirect |
| `server/utils/__tests__/admin-invitation-registration.test.ts` | Admin vs staff accept contract |
| `server/utils/__tests__/staff-register-existing-auth.test.ts` | Existing-auth register path |
| `utils/__tests__/staff-registration-flow.test.ts` | Client step/home helpers |
