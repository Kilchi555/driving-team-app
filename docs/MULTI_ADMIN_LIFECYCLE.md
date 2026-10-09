# Tenant multi-admin lifecycle

Verified from `main` after merges of `62edcdb9` (#352) and `ae6c1c73` (#359).

## Intent

A tenant may have **multiple active admins**, exactly **one active primary**, and invite additional admins through the existing staff-invitation pipeline. Privilege fields (`role`, `is_primary_admin`, `is_active`, `deleted_at`, `auth_user_id`, …) stay **server-owned**. Clients cannot flip them via Data API.

Related but separate: invitation role lock at registration (#362 / draft `INVITATION_ROLE_REGISTRATION` on #363) and invite edit/resend (#370 / draft on #372). This runbook covers primary lifecycle, deactivation rules, schema fail-closed, and the Admins-tab invite UI.

## Roles & flags

| Concept | Rule |
|---|---|
| Active admin | `role === 'admin'` AND `is_active` AND `deleted_at` null |
| Active primary | Active admin AND `is_primary_admin === true` |
| `super_admin` / `super_admin` | Cross-tenant; does **not** pass `passesNormalAdminCheck` |
| Invitation role | `staff_invitations.role` ∈ `{admin, staff}`; default `staff`; authoritative at accept |

Helpers: `server/utils/admin-lifecycle.ts`, `server/utils/invitation-role.ts`.

## Primary transfer

- Endpoint: `POST /api/admin/transfer-primary` with body `{ target_user_id }` only
- Both flag writes happen in SQL RPC `transfer_primary_admin(p_caller_user_id, p_target_user_id)` — single UPDATE, no intermediate dual-primary
- Caller must be the active primary; target must be an active login-capable admin in the same tenant
- Missing RPC → 503 (`TRANSFER_PRIMARY_UNAVAILABLE` / `multi-admin-schema.ts`)

## Deactivation / reactivation

`evaluateDeactivation` / `deactivateTenantUser`:

| Case | Outcome |
|---|---|
| Last active admin | 409 — cannot remove |
| Primary deactivates self | 403 |
| Non-primary tries to deactivate the primary | 403 |
| Cross-tenant (non–super_admin) | 403 |

`evaluateReactivation`: only `super_admin` or the active primary may reactivate.

Deactivation sets `is_active: false`, `deleted_at`, optional reason, revokes Auth sessions, audits `user_deactivated`.

## Invite additional admins (#359)

- UI: `components/users/AdminInviteDialog.vue` on the **Admins** tab of `/admin/users` (`AdminsTab.vue`)
- Creates an invitation (person sets their own login) — not a password-less admin row
- Server path: `POST /api/staff/invite` via `pickStaffInviteFields` (whitelists name/email/phone/role; drops `tenant_id` and nested privilege fields)
- Missing `staff_invitations.role` column → 503 (`STAFF_INVITATION_ROLE_UNAVAILABLE`)
- Admin invitations do **not** create staff operational rows (`createsStaffOperationalRecords` is false for `admin`)

## Schema / migrations (apply status)

| File | Role |
|---|---|
| `migrations/20261002_staff_invitations_role.sql` | Adds `staff_invitations.role` + check |
| `migrations/20261002_transfer_primary_admin.sql` | `transfer_primary_admin` RPC |
| `migrations/20261002_sec_c01_extend_users_privilege_freeze.sql` | Extends privilege freeze to `is_primary_admin`, `auth_user_id`, `is_active`, `deleted_at` |
| `migrations/20261002_staff_locations_tenant_fk.sql` | Rejects staff_location whose user/location tenants differ |
| `migrations/20261002_staff_locations_admin_role_rls.sql` | **No-op** placeholder — live policies unchanged |
| `migrations/20261002_zz_multi_admin_primary_repair.sql` | Repair + constraints; **not applied by app**; header says production apply only after diagnostics |

Presence in the repo ≠ production applied. App code **fails closed** (503) when role column or transfer RPC is missing — it does not fall back to the old write shape.

## Constraints & pitfalls

1. Never let the client send `is_primary_admin` / `role` / `tenant_id` on invite or user create — whitelist fields only.
2. Do not “fix” dual primaries from the app; use the RPC (or ops-reviewed repair SQL).
3. `admin_level` is not the primary flag — `is_primary_admin` is authoritative for transfer/deactivation.
4. Staff invite UI ≠ admin invite UI; admin invite lives on the Admins tab, not the staff action menu.
5. Cross-link invitation accept-time role enforcement to the invitation-role runbook when that draft merges — do not duplicate it here.

## Codepaths

- `server/utils/admin-lifecycle.ts`
- `server/utils/invitation-role.ts`
- `server/utils/multi-admin-schema.ts`
- `server/api/admin/transfer-primary.post.ts`
- `server/api/staff/invite.post.ts`
- `server/api/users/deactivate.post.ts` / `reactivate.post.ts` / `admin/users/manage.post.ts`
- `components/users/AdminInviteDialog.vue`, `components/users/AdminsTab.vue`, `pages/admin/users/index.vue`
- Tests: `server/utils/__tests__/multi-admin-lifecycle.test.ts`
