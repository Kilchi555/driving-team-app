# Backlog / Offene Aufgaben

## Security

### Cloudflare Turnstile als CAPTCHA einbauen
- **Warum:** hCaptcha wurde entfernt (CSP-Konflikte, schlechte UX). Server-seitiger Schutz (Rate Limiting, Account Lockout) ist aktiv und reicht vorerst.
- **Wann nötig:** Bei stärkerem Bot-Druck auf die Login-Seite
- **Details:**
  - Cloudflare Turnstile: kostenlos bis 1M req/Monat, DSGVO-ok, meist unsichtbar
  - Docs: https://developers.cloudflare.com/turnstile/
  - Einbinden: Script-Tag + Widget in `pages/login.vue`, serverseitige Verifizierung in `server/api/auth/login.post.ts` via `https://challenges.cloudflare.com/turnstile/v0/siteverify`
  - Nur nach N Fehlversuchen anzeigen (analog bisheriger hCaptcha-Logik mit `failedLoginAttempts`)
  - Site Key + Secret Key in `.env` als `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
