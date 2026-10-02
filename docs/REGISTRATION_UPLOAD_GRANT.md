# Public registration document upload grant

**When to use:** Debugging `/register/:tenant` document uploads, changing `POST /api/auth/upload-document`, or hardening anonymous registration windows.

Verified against current `main` (Oct 2026). Landed: **#334** (`a85c6dac`).

**Not this:** Tenant-registration HMAC (`registration-token.ts` / welcome email). Public `register-client` **role lock** (draft docs #196). Registration form **idempotency** (#325 — separate helpers under `pending-registration-user.ts` / `register-form-submission.ts`). Customer document upload once logged in (session owner path unchanged).

---

## Intent

After public `register-client` creates (or reuses) a pending user, the browser must upload required documents **without** a full login session. The server mints a short-lived HMAC **upload grant** bound to that user + tenant. Staff/owner sessions keep the previous path. Cross-tenant privileged sessions cannot authorize by session alone.

---

## Contract (current `main`)

### Grant mint (`createRegistrationUploadGrant`)

| Field | Value |
|-------|--------|
| Claims | `userId`, `tenantId`, `purpose: 'document-upload'`, `exp` |
| TTL | `REGISTRATION_UPLOAD_GRANT_TTL_MS` = **10 minutes** |
| Domain prefix | `registration-upload-grant.v1` (distinct from tenant registration tokens) |
| Encoding | `base64url(JSON).base64url(HMAC-SHA256)` |
| Secret | Prefer `NUXT_REGISTRATION_TOKEN_SECRET` (≥32 chars); else `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` (≥32); else mint/verify fail |
| Replay | **Not** one-time — same grant may cover multiple category uploads until expiry; no redemption store |
| Clock skew | Reject `exp` more than TTL + 30s into the future |

Minted only from the **stored** user row in `register-client` (`registrationUploadGrantForStoredUser`), never from client-supplied ids alone.

### Authz (`authorizeRegistrationDocumentUpload`)

Order of evaluation:

1. **Request tenant isolation** — if `requestTenantId` present and ≠ `documentOwner.tenant_id` → **403** tenant isolation (even with a grant).
2. **Grant path** — valid grant whose claims match owner id, owner tenant, and purpose → allow `via: 'grant'`. Expired grant is treated as absent (falls through). Invalid/malformed → **403** `Forbidden` (no signature detail).
3. **Session path**
   - Privileged roles (`STAFF_ADMIN_ROLES`): same-tenant (or `super_admin`); foreign tenant without grant → **403** `Forbidden – tenant mismatch`
   - Owner session (`dbUserId === documentOwner.id`) → allow
   - **Anonymous registration window** (no session): user `created_at` within **30 minutes** and `onboarding_status` in `{pending, pending_documents, incomplete}` (or null) → allow; completed accounts excluded
4. Else → **401** `Authentication required`

Document tenant written on the row stays **`documentOwner.tenant_id`** even if a foreign session is present alongside a matching grant.

### HTTP wiring

| Surface | Behavior |
|---------|----------|
| `POST /api/auth/register-client` | Response may include `uploadGrant` string |
| `pages/register/[tenant].vue` | Sends string `tenantId` + in-memory `uploadGrant` on upload |
| `POST /api/auth/upload-document` | Reads `body.uploadGrant`; rate limit `upload_document_registration` **10 / hour / IP** |

---

## Pitfalls

1. **Grant is not a session** — it does not adopt the caller’s session tenant; owner tenant wins.
2. **Foreign staff session + no grant = 403** — privileged role alone is insufficient across tenants.
3. **Expired grant falls through** — may still succeed via the 30-minute anonymous window; do not assume expiry alone blocks uploads for brand-new pending users.
4. **Missing secret** — mint returns `null` / verify `invalid`; uploads then depend on session or registration window.
5. **Do not reuse tenant-registration tokens** — different HMAC domain and claim shape; keep secrets long enough (≥32) when using the dedicated env var.
6. **Rate limit still applies** — grant validity does not bypass the IP hourly cap.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/registration-upload-grant.ts` | Sign / verify |
| `server/utils/registration-upload-authz.ts` | Allow / deny decision |
| `server/api/auth/register-client.post.ts` | Mint after pending user write |
| `server/api/auth/upload-document.post.ts` | Enforce decision + storage |
| `pages/register/[tenant].vue` | Client grant handoff |
| `server/utils/__tests__/registration-upload-grant.test.ts` | Grant + wiring expectations |
