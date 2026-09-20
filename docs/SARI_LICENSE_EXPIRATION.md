# SARI license expiration validation

**When to use:** Public/admin course enroll fails (or unexpectedly succeeds) on SARI license checks; customers see “01.01.1970” expiry; debugging #241 / #245 / `validateLicense`.

Verified against source (Sep 2026). Current contract: merge `11b12305` (#245), which supersedes the #241 fail-closed treatment of null expiration.

Related: SARI SOAP overview in [`SARI_SOAP_COURSES_V3_API.md`](./SARI_SOAP_COURSES_V3_API.md) (API shapes). This runbook is the **expiration classification** contract only.

> **Note:** Draft docs PR #243 described #241 (`null` → `UNKNOWN_EXPIRATION` deny). That narrative is **outdated** after #245. Trust this page + `license-validation.ts` on `main`.

---

## Intent

SARI license rows often omit or null `expirationdate`. Coercing `null`/`0`/`false`/`` through `new Date(...)` produced Unix Epoch and false “expired since 1970” failures (#241).

Product rule after #245:

| Expiration value | Classification | Effect when it is the only matching license |
|------------------|----------------|-----------------------------------------------|
| `null` / missing / `''` / whitespace | `ABSENT` | **Allow** enrollment (does not block) |
| Non-string / unparseable string | `INVALID` | **Deny** with `INVALID_EXPIRATION` |
| Parseable date string | `VALID_DATE` | Allow or deny by session coverage / “now” |

`ABSENT` is **not** “unlimited forever” when a dated matching license also exists: the dated license still governs allow/deny.

---

## Contract

### `classifyExpirationDate(raw)`

| Input | Result |
|-------|--------|
| `null` / `undefined` | `ABSENT` |
| `''` / whitespace-only string | `ABSENT` |
| non-string (`0`, `false`, …) | `INVALID` |
| non-empty string, parseable | `VALID_DATE` |
| non-empty string, NaN date | `INVALID` |

Only non-empty trimmed strings are passed to `Date`. Never call `new Date(null)` / `new Date(0)` in callers.

### `validateLicense(course, customerData)`

Thrown as H3 `403` with `data.licenseValidationState`:

| State | When |
|-------|------|
| `NO_MATCHING_LICENSE` | No license category allowed for the course (VKU/PGS mapping unchanged) |
| `INVALID_EXPIRATION` | Matching licenses exist, none are dated, and at least one is `INVALID` |
| `EXPIRED` | Best dated license ends before last session end (or before now if no sessions) |
| (success / no throw) | Best dated license covers all sessions, **or** all matching licenses are `ABSENT` only |

Among dated licenses, prefer later expiry, then higher category preference index (PGS: A1 / A35KW / A; VKU: those plus B).

Resolution rules:

1. Skip `ABSENT` when collecting dated licenses.
2. If any dated license exists → evaluate the best one (ignore sibling `ABSENT` / `INVALID`).
3. If no dated license and any `INVALID` → `INVALID_EXPIRATION`.
4. If no dated license and only `ABSENT` → **return** (allow).

Courses with no `category` skip license validation.

### Leftover type / message (do not reintroduce deny-on-null)

`LicenseValidationState` still includes `UNKNOWN_EXPIRATION`, and `UNKNOWN_LICENSE_EXPIRATION_MESSAGE` is still exported, but **#245 no longer throws that state**. Do not wire UI or APIs to expect deny-on-null unless product changes again.

---

## Pitfalls

1. **Treating null expiration as deny (draft #243 / #241)** — current product allows `ABSENT`-only matching licenses.
2. **Treating `ABSENT` as unlimited when a dated sibling exists** — expired + null still **denies** (`EXPIRED`); null does not override a dated expiry.
3. **`new Date(null)` / `new Date(0)` in callers** — reintroduces Epoch / 01.01.1970. Always use `classifyExpirationDate`.
4. **Empty string ≠ INVALID** — empty/whitespace is `ABSENT` (allow when alone); only malformed non-empty strings are `INVALID`.
5. **Course with no category** — validation skipped (unchanged).

---

## Codepaths

| Path | Notes |
|------|-------|
| `server/utils/license-validation.ts` | `classifyExpirationDate`, `validateLicense` |
| `server/utils/__tests__/license-validation.test.ts` | ABSENT allow / INVALID deny / dated+null / expired+null matrices |

Callers that invoke `validateLicense` during enroll (cash/Wallee/admin) inherit this contract; do not re-parse `expirationdate` ad hoc in those routes.

---

## Quick verify

```bash
npx vitest run server/utils/__tests__/license-validation.test.ts
```
