# iOS CI Match signing (TestFlight)

**When to use:** GitHub Actions `Build White-Label iOS App` fails at code signing; TestFlight never gets a new build; Match cannot decrypt/install profiles; Xcode 16 ignores the provisioning profile; you are bumping `clients/*/config.json` `version` for a new upload.

Verified against source (Aug 2026).

---

## Intent

CI has **no Apple ID interactive session**. Builds must use **manual signing** with certs/profiles from Fastlane Match (encrypted git repo) and an **App Store Connect API key** (`.p8`). Automatic Xcode signing fails on GitHub runners.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| Workflow | `.github/workflows/build-ios.yml` — `workflow_dispatch` (one client) or tag `v*` (all `tier=whitelabel`) |
| Lane | `bundle exec fastlane ios deploy` from **repo root** (not `ios/App`) |
| Cert sync | `fastlane ios sync_certificates` — Match `type: appstore`, `git_branch: main`, `readonly` on CI |
| Client config | `clients/<id>/config.json` — `bundleId`, `version`, optional `serverUrl`, `ios.teamId` |
| Local upload | `CLIENT=simy DEPLOY_TARGET=testflight bundle exec fastlane ios deploy` |

Default Match git URL if `MATCH_GIT_URL` empty: `https://github.com/Kilchi555/simy-certificates.git`.

---

## Required secrets (names only)

| GitHub secret | Used as |
|---------------|---------|
| `APP_STORE_CONNECT_API_KEY_BASE64` | Decoded to `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8` |
| `APP_STORE_CONNECT_API_KEY_ID` | → `APPLE_API_KEY_ID` for Fastlane |
| `APP_STORE_CONNECT_ISSUER_ID` | → `APPLE_API_ISSUER_ID` |
| `APPLE_TEAM_ID` | Team for Match + manual signing |
| `MATCH_GIT_URL` | Certificate repo URL |
| `MATCH_PASSWORD` | Decrypt Match store |
| `MATCH_GIT_TOKEN` | PAT with read access to Match repo (`x-access-token` basic auth) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Icon generation / non-hosted Nuxt generate |

Do **not** confuse with older doc names like `APPLE_API_KEY_CONTENT` — the workflow expects `APP_STORE_CONNECT_API_KEY_BASE64`.

---

## Deploy flow (what the lane does)

1. `scripts/gen-cap-config.mjs` + `npx cap sync ios`
2. Set CFBundle version from `clients/<id>/config.json`; build number = `%Y%m%d%H%M`
3. `fastlane/strip-ats.sh` (restored in `after_all` / `error`)
4. `sync_certificates` via Match + ASC API key
5. Install profile into **both** legacy and Xcode 16+ directories, then force `CODE_SIGN_STYLE=Manual`
6. `build_app` → IPA → TestFlight (`upload_to_testflight`) or App Store (`deliver`, no auto-submit)

---

## Hosted-shell clients (`serverUrl`)

If `clients/<id>/config.json` has `serverUrl` (e.g. Simy → `https://app.simy.ch/login`), the workflow **skips `npx nuxt generate`**, writes a stub `.output/public/index.html`, and relies on the WebView loading the live site. This avoids OOM / long Nuxt builds in iOS CI.

Bump marketing version in `config.json` (e.g. `1.1.1`) so TestFlight lists the new build ahead of older ones; the Fastlane build number is still the timestamp.

---

## Pitfalls

1. **Never `cd ios/App` before Fastlane** — There is no Fastfile there; non-interactive CI then prompts to create one and dies.
2. **Automatic signing cannot work in CI** — Runners have no Apple ID; lane must keep `use_automatic_signing: false` and Match profiles.
3. **Match branch is `main`** — Wrong branch → empty/outdated profiles (`sigh_*_appstore_profile-name` empty → hard fail).
4. **Xcode 16 profile path** — Profiles must exist under `~/Library/Developer/Xcode/UserData/Provisioning Profiles` (legacy `MobileDevice` alone is not enough). The lane copies into both dirs and **skips copy when src == dest** (self-copy crashes).
5. **API key file path** — Fastlane expects `~/.appstoreconnect/private_keys/AuthKey_<APPLE_API_KEY_ID>.p8`. CI decodes the base64 secret there before the lane runs.
6. **Hosted shell + Nuxt** — Do not re-enable full `nuxt generate` for Simy-style clients without raising Node heap and accepting much longer CI.
7. **Local Match write** — CI uses `readonly: true`. Creating/renewing certs: run `CLIENT=<id> bundle exec fastlane ios sync_certificates` locally (not readonly).

---

## Ops checks

```bash
# Manual TestFlight for one client
# Actions → Build White-Label iOS App → client=simy, environment=testflight

# Local cert sync (interactive machine with secrets in .env)
CLIENT=simy bundle exec fastlane ios sync_certificates

# Confirm client is whitelabel + version
node -e "console.log(require('./clients/simy/config.json').tier, require('./clients/simy/config.json').version, require('./clients/simy/config.json').serverUrl)"
```

---

## Codepaths

| Path | Role |
|------|------|
| `.github/workflows/build-ios.yml` | Matrix build, ASC key install, hosted-shell skip, Fastlane invoke |
| `fastlane/Fastfile` | `sync_certificates`, `deploy`, profile install, manual signing, TestFlight upload |
| `fastlane/strip-ats.sh` / `restore-ats.sh` | Release ATS strip + restore |
| `clients/*/config.json` | Bundle ID, marketing version, `serverUrl`, team override |
| `scripts/gen-cap-config.mjs` | Capacitor config per client |
| `docs/APP_STORE_SUBMISSION.md` | Store listing / review checklist (not CI signing) |
| `docs/WHITELABEL_APP.md` | Broader white-label setup (secret table may lag; prefer this runbook for CI) |
