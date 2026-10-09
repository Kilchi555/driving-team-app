# SARI license expiration validation

**When to use:** Public/admin course enroll fails with license errors when SARI returns `expirationdate: null`; customers see “01.01.1970” expiry; debugging #241 / `validateLicense`.

Verified against source (Sep 2026). Merge `d7bd310e` (#241).

Related: SARI SOAP overview in [`SARI_SOAP_COURSES_V3_API.md`](./SARI_SOAP_COURSES_V3_API.md) (API shapes). This runbook is the **expiration fail-closed** contract only.

---

## Intent

SARI license rows may omit or null `expirationdate`. Coercing `null`/`0`/`false` through `new Date(...)` produced Unix Epoch and false “expired since 1970” failures. Validation now classifies expiration **before** comparing to course sessions and fails closed with explicit states.

---

## Contract

### `classifyExpirationDate(raw)`

| Input | Result |
|-------|--------|
| `null` / `undefined` | `UNKNOWN` |
| non-string | `INVALID` |
| `''` / whitespace-only string | `INVALID` |
| non-empty string, parseable | `VALID_DATE` |
| non-empty string, NaN date | `INVALID` |

Only non-empty strings are passed to `Date`.

### `validateLicense(course, customerData)` states

Thrown as H3 `403` with `data.licenseValidationState`:

| State | When |
|-------|------|
| `NO_MATCHING_LICENSE` | No license category allowed for the course (VKU/PGS mapping unchanged) |
| `UNKNOWN_EXPIRATION` | Matching license(s) exist but **only** unknown expirations (null/missing) — German copy in `UNKNOWN_LICENSE_EXPIRATION_MESSAGE` |
| `INVALID_EXPIRATION` | Matching licenses exist but none yield a valid date (and no unknown-only path) — `INVALID_LICENSE_EXPIRATION_MESSAGE` |
| `EXPIRED` | Best dated license ends before last session end (or before now if no sessions) |
| (success / no throw) | Best dated license covers all sessions |

Among dated licenses, prefer later expiry, then higher category preference index (PGS: A1 / A35KW / A; VKU: those plus B).

Unknown expirations are skipped when any dated license exists; if **all** matching licenses are unknown → `UNKNOWN_EXPIRATION` (fail closed, never Epoch).

Courses with no `category` skip license validation.

---

## Pitfalls

1. **Treating null expiration as “no expiry / forever valid”** — product choice is fail closed; do not special-case null as valid without an explicit product decision and new state.
2. **`new Date(null)` / `new Date(0)` in callers** — reintroduces Epoch. Always go through `classifyExpirationDate`.
3. **Showing 01.01.1970 in UI** — symptom of old coercion; after #241 API returns `UNKNOWN_EXPIRATION` / `INVALID_EXPIRATION` messages instead.
4. **Course with no category** — validation skipped (unchanged).

---

## Codepaths

| Path | Notes |
|------|-------|
| `server/utils/license-validation.ts` | `classifyExpirationDate`, `validateLicense` |
| `server/utils/__tests__/license-validation.test.ts` | Null/invalid/expired/valid matrices |

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/license-validation.test.ts
```
