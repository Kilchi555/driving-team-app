# Account Switch — Admin ↔ Staff Impersonation

**When to use:** Primary admins (or granted actors) need to open a staff calendar/session without sharing passwords; return-to-admin fails; grants UI does not list expected staff; website-only tenants cannot switch.

Verified against source (Aug 2026).

---

## Intent

Let a **tenant admin** temporarily become an active **staff** Auth session (and return), so support and dual-role owners can work in the staff UI. Privilege checks live only in `server/utils/account-switch.ts` — API routes must not invent their own allow rules.

---

## Surfaces

| Item | Detail |
|------|--------|
| UI | `AccountSwitchModal` (admin layout); grants: `AccountSwitchGrantsModal` |
| List targets | `GET /api/auth/switch-targets` |
| Switch | `POST /api/auth/switch-account` `{ target_user_id }` |
| Grants | `GET` / `PUT /api/admin/account-switch-grants` |
| Cookie | `sb-impersonator` (httpOnly, HMAC, max **8h**) |
| Tables | `impersonation_sessions`, `account_switch_grants`; user cols `linked_admin_user_id`, `can_switch_all_staff` |

Rate limit on switch: **20 / hour** per actor user id (`switch_account`).

---

## Who may switch

| Actor | Staff targets |
|-------|----------------|
| Primary tenant admin (`role=admin`, not `admin_level=sub_admin`) | All active staff with `auth_user_id` + email in the same tenant |
| Staff with `linked_admin_user_id` pointing at a live primary admin | Treated as that admin’s “own staff” path (return to linked admin) |
| Sub-admin / staff with `can_switch_all_staff=true` | All switchable staff |
| Actor with rows in `account_switch_grants` | Only listed staff targets |
| `super_admin` | **Never** (hard deny) |
| `tenants.website_only=true` | **Never** |

Staff must be `role=staff`, `is_active`, not deleted, with Auth + email. Switching to another **admin** is only “return to admin” (valid impersonator cookie or `linked_admin_user_id`).

While impersonating, grant checks use the **admin behind the cookie**, not the staff being helped (`resolveGrantActor`).

---

## Session mechanics

1. `mintSessionForUser` issues a magic-link OTP for the target email via service role, verifies it with the anon client, and refuses if Auth user id ≠ `users.auth_user_id`.
2. Auth cookies are replaced with the new session.
3. **Admin → staff:** insert/update `impersonation_sessions` and set `sb-impersonator` (`switch_type`: `linked` | `support` | `staff_switch`).
4. **Staff → staff:** session changes, but **no** impersonator cookie is minted (only tenant-admin actors get one).
5. **Return to admin:** ends open impersonation (`ended_at`) and clears the cookie.
6. Redirect: staff → `/dashboard`; admin → `/admin` (or `/admin/website` if website-only — switch itself is blocked there).

Cookie secret: `ACCOUNT_SWITCH_COOKIE_SECRET` (≥32 chars) or fallback `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.

---

## Grants management

Primary tenant admin (or super_admin) may `PUT` grants for a **staff or sub-admin** actor:

- `can_switch_all_staff: true` clears per-target rows and allows all staff.
- Otherwise replace rows with `target_ids` (max 100; must be active staff in tenant with Auth).

Primary admins do not need grants.

---

## Pitfalls

1. **Website-only tenants** — switch endpoints return 403; UI flags stay off.
2. **Inactive / deleted / no Auth** staff never appear as targets.
3. **Stale impersonator cookie** — session row ended, tenant mismatch, actor Auth id changed, or >8h → treated as not impersonating.
4. **Logout after switch** should land on tenant login (`/{slug}`), not bare `/login` (see `utils/redirect-to-login.ts` + login page).
5. **Staff-to-staff** does not create an admin return path via cookie; only linked-admin return works without a prior admin→staff hop.
6. Do not bypass `account-switch.ts` for authorization in new endpoints.

---

## Codepaths

- `server/utils/account-switch.ts` — authz, cookie, mint, sessions
- `server/api/auth/switch-account.post.ts`, `switch-targets.get.ts`
- `server/api/admin/account-switch-grants.get.ts`, `.put.ts`
- `components/AccountSwitchModal.vue`, `components/admin/AccountSwitchGrantsModal.vue`
- `sql_migrations/20260818_account_switch.sql`, `20260818_staff_invite_link_to_admin.sql`
- `stores/auth.ts` — client switch helper
