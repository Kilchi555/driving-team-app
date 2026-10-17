# FCM Push Notifications

## Intent

Deliver native push (iOS/Android via Capacitor → FCM HTTP v1) for booking confirmations and queued reminders. Missing Firebase env must **not** break booking or cron flows — sends become silent no-ops.

Play Store / `google-services.json` packaging steps live in [ANDROID_PLAY_SUBMISSION.md](./ANDROID_PLAY_SUBMISSION.md) §1.5. This runbook covers the **server pipeline and ID mapping**.

## Architecture

```
Native app (Capacitor)
  plugins/push.client.ts
    → PushNotifications.register()
    → POST /api/push/register-token  (Bearer session)
         maps auth.users.id → public.users.id
         upserts push_tokens (user_id, token, platform, tenant_id)

Send paths
  A) Direct: sendPushToUser(public.users.id, payload)
     - appointment confirmation (after email attempt)
     - change / deletion helpers
  B) Queue: outbound_messages_queue.channel = 'push'
     - appointment reminders cron
     - payment reminders cron
     → process-outbound-messages → sendPushToUser
```

## Env

| Variable | Purpose |
|----------|---------|
| `FIREBASE_PROJECT_ID` | FCM project id |
| `FIREBASE_SERVICE_ACCOUNT` | Full service-account JSON as **one** string |

If either is missing, `sendPushToUser` returns `{ sent: 0, configured: false }`.

`FIREBASE_SERVICE_ACCOUNT` parsing normalizes PEM newlines (hosts that expand `\n` into real newlines). Invalid JSON → warn + no-op.

## ID contract (critical)

- **Store and send against `public.users.id`**, never `auth.users.id`.
- `register-token` looks up `users.auth_user_id = session.user.id`, then upserts with conflict key `(user_id, token)`.
- Reminder queue rows must set `context_data.user_id` to that same app user id; the outbound processor fails the row if it is missing.

## Surfaces

| Surface | Behavior |
|---------|----------|
| `POST /api/push/register-token` | Auth required; body `{ token, platform: ios\|android\|web }` |
| `POST /api/push/send` | `admin` / `super_admin` / `staff`; tenant isolation except super_admin; test/manual send |
| Confirmation | Direct push in `dispatchAppointmentConfirmation` (non-blocking `.catch`) when customer email path runs |
| `send-appointment-reminders` | Always enqueues a `push` row alongside email/SMS |
| `send-payment-reminders` | Enqueues `push` with `path: /customer/payments` |
| `process-outbound-messages` | Cron every ~5 min (`2,7,12,...`); push marked **sent even if 0 devices** so the queue does not retry forever |

Invalid FCM tokens (`NOT_FOUND` / 404) are deleted from `push_tokens`.

## Client behavior

- Plugin runs **only** on native platforms (`Capacitor.isNativePlatform`).
- Permission denied → skip registration (no error spam).
- Notification tap navigates to `data.path` when present (default `/customer-dashboard`).

## Pitfalls

1. **Wrong user id** → push “succeeds” with `sent: 0` or hits the wrong row. Always use `public.users.id`.
2. **`configured: false`** → env missing/broken; fix Vercel env, not the queue.
3. **Queue marks sent with zero devices** — expected; check `push_tokens` and Firebase console, not `outbound_messages_queue` retries.
4. **Web platform** is accepted by the API but the client plugin does not register in browsers.
5. Stale tokens are cleaned only on send failure classification (`invalid_token`), not on logout.

## Smoke test

1. Native login + allow notifications.
2. `select id, user_id, platform, updated_at from push_tokens order by updated_at desc limit 5;`
3. As staff/admin: `POST /api/push/send` with `{ "userId": "<public.users.id>", "title": "Test", "body": "Hallo" }`.
4. Book a lesson → confirmation push (if confirmation email path not skipped).
5. Optional: appointment reminder cron with `?test_appointment_id=...` → queue row `channel=push` → wait for `process-outbound-messages`.

## Codepaths

| Path | Role |
|------|------|
| `server/utils/push.ts` | FCM HTTP v1 + token cleanup |
| `server/api/push/register-token.post.ts` | Device registration |
| `server/api/push/send.post.ts` | Manual/admin send |
| `plugins/push.client.ts` | Capacitor registration + tap navigation |
| `server/utils/dispatch-appointment-confirmation.ts` | Direct confirmation push |
| `server/api/cron/send-appointment-reminders.get.ts` | Queue appointment push |
| `server/api/cron/send-payment-reminders.get.ts` | Queue payment push |
| `server/api/cron/process-outbound-messages.get.ts` | Drain `channel=push` |
| `docs/ANDROID_PLAY_SUBMISSION.md` | Client packaging / Play secrets |
