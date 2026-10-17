# Internal email edge function secret

Verified from `main` after merge of `551863cc` (#371).

## Intent

Supabase Edge Functions that send mail must accept only server-to-server calls that present a shared internal secret. A logged-in user JWT (or anon key alone) must fail closed.

This is **not** `CRON_SECRET`, `RESEND_API_KEY`, or the service-role key. Gateway JWT verification is a separate layer and does **not** replace this control.

## Contract

| Piece | Value |
|---|---|
| Env (both sides) | `SIMY_INTERNAL_EMAIL_SECRET` |
| Header | `x-simy-internal-email-secret` (`INTERNAL_EMAIL_SECRET_HEADER`) |
| Nitro helper | `internalEmailAuthHeaders()` in `server/utils/internal-email-secret.ts` |
| Edge auth | `authorizeInternalEmail` in `supabase/functions/_shared/internal-email-auth.ts` |

Required in **two** places (separate process envs):

1. Vercel / Nitro runtime
2. Supabase Edge Function secrets

Unset secret on Nitro → invoke helpers throw **500** `Unable to send email` (do not leak that the secret is missing to clients beyond that statusMessage).

Unset / missing / mismatch on the function → **401** `Unauthorized` (same response for missing vs wrong; comparison uses SHA-256 digest equality to avoid short-circuit leaks).

## Locked functions

| Function | Notes |
|---|---|
| `send-email` | Generic outbound; payload via `parseOutboundEmail` |
| `send-staff-invitation-email` | Invite HTML; host allowlist for links |
| `send-payment-reminder` | Reminder content built server-side after auth |

## Who may call

Nitro paths that `functions.invoke(..., { headers: internalEmailAuthHeaders() })`:

- `server/api/email/send-wallee-payment-link.post.ts`
- `server/api/payments/settle-and-email.post.ts`
- `server/utils/send-adjustment-notification.ts`

Browser composable `composables/useEmailService.ts` was **removed**. Do not reintroduce client-side invokes of these functions.

Other product emails (vouchers, many invites) use Nitro `sendEmail` / Resend directly and are outside this edge lockdown.

## Payload constraints (`parseOutboundEmail`)

- `to` / `email` must agree if both set; max 320 chars; no CR/LF
- Subject required, ≤ 200, no CR/LF
- Body via `body` (plain → `<br>`) or `html`; max 200_000 chars
- Caller `from` rejected unless exactly `noreply@simy.ch` (`PLATFORM_FROM_EMAIL`)

## Ops pitfalls

1. Deploying edge functions without setting `SIMY_INTERNAL_EMAIL_SECRET` breaks all three sends with 401.
2. Setting the secret only on Vercel (or only on Supabase) breaks the other side.
3. Never put the secret in `runtimeConfig.public`, Vue composables, or logs.
4. Do not treat a valid Supabase user JWT as authorization for these functions.
5. Rotate by updating **both** Vercel and Supabase, then verify one settle/Wallee-link/adjustment send.

## Codepaths

- `server/utils/internal-email-secret.ts`
- `supabase/functions/_shared/internal-email-auth.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-staff-invitation-email/index.ts`
- `supabase/functions/send-payment-reminder/index.ts`
- `server/utils/__tests__/internal-email-edge-lockdown.test.ts`

See also: `docs/ACCESS_AND_SECRETS_POLICY.md` (general secrets policy).
