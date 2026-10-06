# Registration email disposable allowlist and spam heuristics

Verified from `main` after `b5235f64` (spam false-positive fix) and `#376` / `70d7e512` (`bluemail.ch` allowlist).

## Intent

Block throwaway signup addresses without rejecting legitimate Swiss business and ISP mailboxes. Remote disposable providers (mailcheck.ai + debounce.io) are OR’d; network failures **fail open**.

## Contract

`server/utils/email-validator.ts` → `validateRegistrationEmail`:

1. Format (`isValidEmail`).
2. Disposable checks, unless domain is in `ALLOWED_NON_DISPOSABLE_DOMAINS`.
3. Local disposable set, then remote `mailcheck` / `debounce` signals.
4. Spam heuristic (`isSpamEmail`) on local-part only.

### Allowlist

Exact-match domains that skip disposable checks (local + remote):

| Domain | Why |
|---|---|
| `bluemail.ch` | Debounce.io false positive; Swisscom NS / Bluewin MX family |

Adding a domain: exact lowercase host only; do not widen to parent wildcards without evidence.

### Spam heuristic (post-`b5235f64`)

Rejects:

- Local parts matching `^(test|spam|fake|xxx|zzz|aaa|bbb)(\d*)$`
- Same character repeated **six or more** times

Does **not** reject common business locals (`admin@`, `info@`, …) or digit-heavy locals (dates, phone-like).

User-facing reasons:

- Disposable → `REGISTRATION_DISPOSABLE_EMAIL_REASON`
- Spam → `REGISTRATION_SPAM_EMAIL_REASON`

Disposable rejection telemetry may include `{ domain, signal }` — never the full address.

## Call sites (examples)

Staff/tenant registration and invite email checks: `server/api/staff/register.post.ts`, invite/resend paths, `server/api/tenants/check-availability.get.ts`, and related admin tenant actions. Prefer `validateRegistrationEmail` over ad-hoc disposable checks.

## Pitfalls

1. Remote APIs fail open — a outage will not block signups; local list still applies.
2. Allowlist bypasses disposable only; spam heuristic still runs.
3. Distinct from `#371` internal email edge secret (`SIMY_INTERNAL_EMAIL_SECRET`).

## Tests

- `server/utils/__tests__/email-validator.test.ts`
- `server/utils/__tests__/staff-register-email-validation.test.ts`
