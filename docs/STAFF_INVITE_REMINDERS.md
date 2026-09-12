# Staff invite reminder cron

**When to use:** Invited staff never get a second email; onboarding placeholder addresses receive reminders; reminder fires twice; cron 401s; colliding “30-day check-in” confusion.

Verified against source (Aug 2026). Cron lives on main (`vercel.json` + `send-staff-invite-reminders`); related open tip `#73` ships/clarifies the same behavior and drops the old 30-day check-in path.

---

## Intent

Send **one** branded reminder email for each pending staff invitation that is still valid, has a real email, and is at least **3 days** old. Cross-tenant; service-role cron.

---

## Schedule & auth

| Item | Value |
|------|-------|
| Path | `GET /api/cron/send-staff-invite-reminders` |
| Vercel cron | `10 8 * * *` (08:10 UTC daily) |
| Auth | `Authorization: Bearer ${CRON_SECRET}` |
| Batch | Max **80** candidates per run (created_at ascending) |

Unauthorized → 401 + warn log.

---

## Eligibility

DB prefilter on `staff_invitations`:

- `status = 'pending'`
- `reminder_sent_at IS NULL`
- `expires_at > now`
- `created_at <= now − 3 days`
- limit 80

Then `isDueForStaffInviteReminder` (`server/utils/staff-invite-email.ts`, `STAFF_INVITE_REMINDER_AFTER_DAYS = 3`) re-checks:

| Gate | Fail → skip |
|------|-------------|
| Status | Not `pending` |
| Already reminded | `reminder_sent_at` set |
| Placeholder email | `@onboarding.simy.ch` or `pending_*@invite.simy.ch` (`isPlaceholderStaffInviteEmail`) |
| Expiry | `expires_at <= now` |
| Age | `now < created_at + 3 UTC days` |

---

## Send path

For each due invite:

1. Load tenant branding (`name`, `slug`, logos, `primary_color`, `from_email`, `resend_domain_verified`).
2. Terminology via `getTenantTerminology` (staff / clients labels).
3. First active admin email for the dual-login hint block (reminders set `showDualLoginHint: false`).
4. `sendEmail` with subject `Erinnerung: Einladung als {staffLabel} – {tenantName}` and `buildStaffInviteEmailHtml({ …, isReminder: true })`.
5. Invite link: `{BASE_URL}/register/staff?token={invitation_token}` (`NUXT_PUBLIC_BASE_URL` or `https://app.simy.ch`).
6. On success: set `reminder_sent_at` (+ `updated_at`). Failures increment `failed` and do **not** stamp `reminder_sent_at` (retry next day).

Audit: `staff_invite_reminders_cron` with `{ sent, failed, candidates, duration_ms }`.

Manual resend remains `POST /api/staff/resend-invite` / super-admin `resend_staff_invite` — those are separate from this once-only cron.

---

## Pitfalls

1. **Placeholder invites** — Onboarding emails never get cron reminders; operators must use a real address or the resend APIs.
2. **One shot** — After `reminder_sent_at` is set, cron never emails again even if the invite is still pending.
3. **Expired tokens** — Filter requires `expires_at > now`; expired rows are ignored (staff needs a fresh invite).
4. **Not the 30-day check-in** — That older flow was removed/avoided so it would not collide with this daily job; do not reintroduce overlapping reminder crons on the same table without a distinct column.
5. **Data URLs as logos** — `data:` logo URLs are stripped (`logoUrl = null`) so email clients do not get huge payloads.
6. **Batch cap** — Tenants with large invite backlogs may need multiple days to clear (&gt;80 due).

---

## Smoke test

1. Insert pending invite with real email, `created_at` 4 days ago, `reminder_sent_at` null, future `expires_at` → cron with `CRON_SECRET` → `sent ≥ 1`, row has `reminder_sent_at`.
2. Re-run cron → same invite not sent again.
3. Invite with `nicole@onboarding.simy.ch` → skipped by helper.
4. Missing/wrong bearer → 401.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/cron/send-staff-invite-reminders.get.ts` | Cron handler |
| `server/utils/staff-invite-email.ts` | Due check, placeholder detect, HTML builder |
| `vercel.json` | Schedule `10 8 * * *` |
| `server/api/staff/invite.post.ts` / `resend-invite.post.ts` | Initial + manual invite |
| `server/utils/__tests__/staff-invite-email.test.ts` | Due / placeholder matrix |
