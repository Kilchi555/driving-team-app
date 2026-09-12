# GitHub Actions secret encryption (credential rotation)

**When to use:** Super-admin credential rotation to GitHub fails; you need to know how secrets are sealed; replacing the old `python3 -c` / PyNaCl path; writing tests for rotation.

Verified against source (Aug 2026). Commit `434d245a` (#98).

---

## Intent

Updating a repo Actions secret requires a **libsodium sealed box** with the repository’s public key (`GET .../actions/secrets/public-key`). Values must never be interpolated into a shell `python3 -c` string — encrypt in Node, then `PUT` `encrypted_value` + `key_id`.

---

## Contract

### Helper

`encryptGithubActionsSecret(publicKeyBase64, secretValue)` in `server/utils/github-actions-secret-encrypt.ts`:

1. `await sodium.ready` (`libsodium-wrappers`)
2. Decode repo public key as **original** base64
3. `crypto_box_seal(secretValue, publicKey)`
4. Return ciphertext as **original** base64

`assertGithubSecretName`: `^[A-Za-z0-9_]+$`, max length 100 → else `invalid_secret_name`.

### Rotation API

`POST /api/super-admin/rotate-credential` (super_admin only):

| Body field | Meaning |
|------------|---------|
| `credentialKey` | Secret / env name (validated) |
| `value` | New plaintext (never logged) |
| `targets` | `vercel` and/or `github` |

GitHub path:

1. Fetch public key with `GH_API_TOKEN` or `SIMY_GITHUB_PAT`
2. Encrypt via helper
3. `PUT /repos/Kilchi555/driving-team-app/actions/secrets/{name}`
4. Record rotation timestamp via `loadRotationLog` / `saveRotationLog`

Vercel path (same endpoint): PATCH/POST project env `prj_DhkLC3tYRjc3zE7CZSoLFqhESWhK` with `VERCEL_API_TOKEN` — orthogonal to sealed-box encrypt.

---

## Pitfalls

1. **Never shell-embed the secret** — previous Python one-liner leaked values into process args / logs risk.
2. **Wrong base64 variant** — GitHub expects libsodium **ORIGINAL** encoding for key and ciphertext (not URL-safe).
3. **Token env names** — GitHub uses `GH_API_TOKEN` **or** `SIMY_GITHUB_PAT`; missing both → 500 `GH_API_TOKEN nicht konfiguriert`.
4. **Name validation** — hyphens / spaces in `credentialKey` fail before any API call.
5. **204 is success** — GitHub PUT may return 204; treat only non-ok (and not 204) as failure.

---

## Smoke test

1. Unit: `server/utils/__tests__/github-actions-secret-encrypt.test.ts` — round-trip seal with a test key vector / known API shape.
2. Super-admin UI rotation targeting `github` only → secret updated; rotation log timestamp advances.
3. Invalid `credentialKey` (e.g. `BAD-NAME`) → 400 without calling GitHub.

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/github-actions-secret-encrypt.ts` | Sealed-box encrypt + name assert |
| `server/utils/__tests__/github-actions-secret-encrypt.test.ts` | Unit coverage |
| `server/api/super-admin/rotate-credential.post.ts` | Vercel + GitHub rotation |
| `docs/ACCESS_AND_SECRETS_POLICY.md` | Broader secrets policy |

Related (may live on open docs PRs): fuller credential-rotation runbook (`CREDENTIAL_ROTATION.md`). Dependency review workflow (`.github/workflows/dependency-review.yml`, #100) blocks new High/Critical advisories on PRs to `main` — separate from secret encryption. Private vuln reports go to `SECURITY.md` (#99).
