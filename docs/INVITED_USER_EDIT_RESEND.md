# Edit and resend pending invitations

Verified from `main` after merge of `e5603e8f` (#370).

## Intent

Admins can correct name/email on pending invitations and resend without creating a second invite mechanism. Role, tenant, and ownership always come from the server-side caller and the loaded row — request bodies cannot set them.

Distinct from invitation **role lock at registration** (#362 / open draft `INVITATION_ROLE_REGISTRATION`).

## Two invitation stores

| Kind | Storage | Editable statuses |
|---|---|---|
| Staff / admin | `staff_invitations` | `pending`, `expired` |
| Client | `users` with `onboarding_status = pending`, `auth_user_id IS NULL` | pending only (no auth user yet) |

## Public interfaces

| Route | Purpose |
|---|---|
| `POST /api/staff/update-invite` | Edit pending/expired staff or admin invitation |
| `POST /api/staff/resend-invite` | Renew token (30d) + resend staff/admin mail |
| `POST /api/admin/invited-clients/update` | Edit pending client invitation |
| `POST /api/admin/invited-clients/resend` | Renew onboarding token (30d) + resend |

Auth: authenticated admin (`assertInvitationAdmin`: role `admin`, active, not deleted). Rate limits: update ~30/h, resend ~10/h per actor.

UI: `InvitedUserEditDialog` / `InvitedUserRowActions` / `useInvitedUserActions` on `pages/admin/users/index.vue` and `pages/admin/privatkunden.vue`.

## Core helpers (`invited-user-manage.ts`)

- `loadInvitationAdminCaller` / `assertInvitationAdmin`
- `updatePendingStaffInvitation` / `updatePendingClientInvitation`
- `renewPendingClientInvitation`
- `buildStaffInvitationRenewal` / `buildClientOnboardingRenewal` — new token, `expires` = now + 30 days, staff status forced back to `pending`
- Token accept helpers: `staffInvitationAcceptsToken`, `clientOnboardingAcceptsToken`

Email change renews the token. Name-only patch does not. Email uniqueness checked via existing availability helpers (staff path uses `checkEmailAvailableForStaff`).

Client onboarding link format used on resend: `https://app.simy.ch/onboarding/{token}`.

## Constraints & pitfalls

1. Staff callers that are not `admin` get 403 — staff role cannot edit/resend through these admin helpers.
2. Accepted / cancelled staff invitations are not editable (`EDITABLE_STAFF_STATUSES`).
3. Client rows with `auth_user_id` set are not pending invites — renew/update refuse them.
4. Payload cannot change `role` or `tenant_id`; those stay on the loaded row / caller tenant filter.
5. Resend staff mail may still go through Nitro `sendEmail` (Resend), not the locked edge `send-staff-invitation-email` path — see `INTERNAL_EMAIL_EDGE_SECRET.md` for which callers still use the edge function.
6. Complementary to #359/#352 multi-admin lifecycle UI/RLS; this runbook is only edit/resend mechanics.

## Codepaths

- `server/utils/invited-user-manage.ts`
- `server/utils/invitation-token.ts` — `generateInvitationToken`
- `server/api/staff/update-invite.post.ts`, `resend-invite.post.ts`
- `server/api/admin/invited-clients/update.post.ts`, `resend.post.ts`
- `components/users/InvitedUserEditDialog.vue`, `InvitedUserRowActions.vue`
- `composables/useInvitedUserActions.ts`
- Tests: `server/utils/__tests__/invited-user-manage.test.ts`
