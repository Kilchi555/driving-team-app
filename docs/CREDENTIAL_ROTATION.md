# Credential Rotation — Super-Admin Ops

**When to use:** Rotating API keys/secrets into Vercel and/or GitHub from the tenant-admin credentials UI, rotation appears to succeed but env is unchanged, or overdue reminders need triage.

Verified against source (Aug 2026).

---

## Intent

Super-admins rotate named credentials from `pages/tenant-admin/credentials.vue` without hand-editing every host. The API writes the new value to selected targets, then records the rotation timestamp in an R2-backed log used for overdue reminders.

---

## Auth & API

| Item | Detail |
|------|--------|
| UI | `/tenant-admin/credentials` (super-admin) |
| Rotate | `POST /api/super-admin/rotate-credential` |
| Status / log | `GET /api/super-admin/credential-status` |
| Reminder config | `POST /api/super-admin/credential-config` |
| Test mail | `POST /api/super-admin/test-credential-email` |

Caller must be authenticated with `users.role === 'super_admin'`.

### Rotate body

```json
{
  "credentialKey": "RESEND_API_KEY",
  "value": "<new secret>",
  "targets": ["vercel", "github"]
}
```

Both `credentialKey` and `value` required; `targets` non-empty subset of `vercel` | `github`.

---

## Targets

### Vercel

- Uses `process.env.VERCEL_API_TOKEN`
- Project id constant in `rotate-credential.post.ts`: `prj_DhkLC3tYRjc3zE7CZSoLFqhESWhK` (simy-app)
- Lists env via Vercel API v10; **PATCH** existing key or **POST** encrypted env for `production` + `preview`
- Result string: `updated` or `created`

**Ops note:** An earlier typo in the project id (`…CZS_oL…` with an underscore) caused rotations to hit the wrong/missing project. If Vercel shows no change after a “successful” UI rotate, confirm the constant matches the live Vercel project (commit `eaca2626`).

### GitHub Actions secrets

- Token: `GH_API_TOKEN` or fallback `SIMY_GITHUB_PAT`
- Repo: `Kilchi555/driving-team-app`
- Encrypts with the repo actions public key (Python `nacl` sealed box via `execSync`) then `PUT` secret

---

## Rotation log & intervals

- Log + config JSON live in R2 bucket `driving-team-backups` (`credentials-rotation-log.json`, `credentials-config.json`) — load/save helpers in `credential-status.get.ts`
- After each successful rotate, `log[credentialKey] = ISO timestamp`
- Default reminder intervals (days; `0` = never) include Supabase keys (365), R2/S3 (90), Resend/Stripe/Wallee/Twilio (180), encryption keys (`0` — needs DB migration before rotate)

UI compares last rotation vs configured interval for overdue counts.

---

## Pitfalls

1. **Wrong Vercel project id** — rotation can return success against a non-production project; always verify the constant when debugging “env not updated”.
2. **Missing host tokens** — absent `VERCEL_API_TOKEN` / GitHub PAT → HTTP 500 with German message; UI surfaces `err.data.message`.
3. **Targets are per credential** — the UI sends `selectedCred.targets`; rotating only Vercel will not update GitHub Actions and vice versa.
4. **Encryption keys marked never** — `ENCRYPTION_KEY` / `IBAN_ENCRYPTION_KEY` default interval `0`; rotating them without a data re-encrypt plan will break ciphertext.
5. **No secret echo** — responses return `{ success, results, rotatedAt }` only; do not log the new value in tickets or docs.
6. **Python + nacl on the server** — GitHub target requires working `python3` + `nacl` in the runtime image; Vercel-only rotates do not need that path.

---

## Codepaths

- `pages/tenant-admin/credentials.vue` — modal rotate, config, test email
- `server/api/super-admin/rotate-credential.post.ts` — Vercel + GitHub writers
- `server/api/super-admin/credential-status.get.ts` — log/config R2 helpers + default intervals
- `server/api/super-admin/credential-config.post.ts`, `test-credential-email.post.ts`
