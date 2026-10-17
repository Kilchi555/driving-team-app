# Native push registration (after login)

**When to use:** Capacitor app never shows the OS notification dialog; FCM token appears in device logs but not in `push_tokens`; staff cookie login never registers a device; in-app “Mitteilungen sind aus” card stacks next to the iOS permission sheet.

Verified against source (Aug 2026). Server send pipeline / Firebase env / `public.users.id` mapping: draft runbook `FCM_PUSH_NOTIFICATIONS` (open doc PR) — this page covers **client registration timing** only.

---

## Intent

Ask for notification permission **only after login** (Play review), survive **cookie sessions** without a ready `supabase.auth` session, and **retry** token persist when FCM fires before auth is ready.

---

## Flow

```
plugins/push.client.ts (native only)
  setup once → bind auth watchers
  tryRegister:
    flushPendingPushToken()
    ensureNativePushRegistration({ request: isLoggedIn() })
      request=false on login screen → no OS dialog
      request=true when authStore.isLoggedIn

composables/useNativePush.ts
  PushNotifications.register() → 'registration' event → persistPushToken
  resolveAccessToken:
    1) supabase.auth.getSession().access_token
    2) else refreshClientSession() (cookie → /api/auth/refresh)
  POST /api/push/register-token
    Authorization Bearer when token known
    otherwise same-origin cookies (sb-auth-token) via getAuthenticatedUser
```

| Piece | Role |
|-------|------|
| `plugins/push.client.ts` | One-shot setup; re-try ~15s for late Capacitor / cookie hydrate |
| `ensureNativePushRegistration` | Bind listeners; optional `requestPermissions`; `register()` when granted |
| `pendingToken` / `flushPendingPushToken` | Hold FCM token until auth can persist it |
| `NativePushPrompt` | **Only** when permission is already `denied` (settings CTA) — never duplicates the OS sheet |

---

## API contract

`POST /api/push/register-token`

| Field | Constraint |
|-------|------------|
| Auth | Required (`getAuthUserFromRequest` → Bearer **or** cookie + refresh) |
| `token` | Non-empty string, ≤ 4096 chars |
| `platform` | `ios` \| `android` \| `web` |
| Storage | Upsert `push_tokens` on `(user_id, token)` where `user_id` = `public.users.id` (lookup via `auth_user_id`) |

404 if no `public.users` row for the auth user.

---

## Pitfalls

1. **OS dialog on `/login`** — Must not run with `request: true` while logged out. Plugin gates on `authStore.isLoggedIn`.
2. **Token before session** — FCM often fires first. Without `pendingToken` + `flushPendingPushToken`, registration is dropped.
3. **Cookie-only staff/admin** — `supabase.auth.getSession()` may be empty. Client must call `refreshClientSession` and/or rely on cookie auth on the API. Do not require a Bearer header only.
4. **Double UI** — `NativePushPrompt` is for **denied** only. Showing it while the system sheet is up fails Play/App Store UX (`c1783eb6`).
5. **`setupStarted` guard** — Setup runs once; interval still calls `tryRegister` after login so late login is covered without re-binding listeners forever.
6. **Web** — Plugin exits when not Capacitor native; API accepts `web` but the client does not register browsers.

---

## Smoke test

1. Cold-start native app on login screen → **no** OS permission sheet.
2. Log in → system dialog once (if undetermined).
3. `select user_id, platform, updated_at from push_tokens order by updated_at desc limit 5;`
4. Deny notifications → in-app card offers Settings; dismiss stores `simy_push_prompt_dismissed_at` in `sessionStorage`.
5. Cookie staff session (no supabase-js session yet) → token still upserts after hydrate/refresh.

---

## Codepaths

| Path | Role |
|------|------|
| `plugins/push.client.ts` | After-login registration orchestration |
| `composables/useNativePush.ts` | Permission, FCM register, pending token, auth resolution |
| `server/api/push/register-token.post.ts` | Persist token → `push_tokens` |
| `server/utils/auth-helper.ts` / `getAuthenticatedUser` | Bearer + cookie auth for register |
| `utils/client-session-refresh.ts` | Cookie → access token for Bearer header |
| `components/native/NativePushPrompt.vue` | Denied-only settings nudge |
| `app.vue` | Mounts `NativePushPrompt` |
