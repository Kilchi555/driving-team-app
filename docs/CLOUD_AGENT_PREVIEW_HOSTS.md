# Cloud Agent / tunnel preview hosts

**When to use:** Cloud Agent or tunnel preview shows **404 / „Diese Domain ist noch nicht mit einer Simy-Website verbunden“** on `/`; local `curl` to `127.0.0.1` works but the browser preview does not; login cookies fail on HTTP preview URLs.

Verified against source (Sep 2026). Commit `7d947a46` (#199).

---

## Intent

`server/middleware/02.custom-domain.ts` maps unknown `Host` / `X-Forwarded-Host` values to tenant custom domains. Anything that is **not** an app host is treated as a customer domain.

Cloud Agent previews send the pod IP, the single-label host `cursor`, or `*.cursor.com` / tunnel hostnames. Before #199 those were unknown → homepage 404. Production custom-domain behaviour on `app.simy.ch` is unchanged.

---

## Contract

### What counts as an app host (`isAppHost`)

| Host shape | Treated as app? |
|------------|-----------------|
| `app.simy.ch`, `www.app.simy.ch`, `localhost`, `127.0.0.1` | Yes (`APP_HOSTS`) |
| `*.vercel.app`, `simy.ch`, `www.simy.ch` | Yes |
| IPv4 / `::1` | Yes (pod / loopback) |
| Single-label name (no `.`), e.g. `cursor` | Yes |
| Suffixes: `.cursor.com`, `.cursor.sh`, `.cursor.run`, `.cursor.app`, `.ngrok-free.dev`, `.ngrok.io`, `.trycloudflare.com`, `.loca.lt` | Yes |
| Real customer domains (`fahrschule-example.ch`) | **No** → custom-domain path |

### Extra guards

| Guard | Behaviour |
|-------|-----------|
| `import.meta.dev` | Skip custom-domain 404 entirely when the host is unknown |
| `vite.server.allowedHosts: true` | Stop Vite blocking unfamiliar preview Host headers |
| Cookies `secure` | Only when `NODE_ENV === 'production'` (HTTP previews can store session cookies) |
| HSTS header | Only when `NODE_ENV === 'production'` |

---

## Pitfalls

1. **Healthy localhost ≠ healthy preview** — curling `127.0.0.1` never hits the custom-domain 404; the browser uses `X-Forwarded-Host` / pod hostname.
2. **Do not add customer domains to `APP_HOSTS` or `DEV_PREVIEW_SUFFIXES`** — that would skip landing rewrite for real custom domains.
3. **Production unknown hosts still 404 `/`** — only `import.meta.dev` skips that path; preview suffixes + IPs are the production-safe escape hatch for tunnels that run with a production build.
4. **Secure cookies + HSTS in production stay on** — never flip `secure`/`HSTS` off for `app.simy.ch` to “fix” a tunnel; use a non-production `NODE_ENV` for HTTP previews.

---

## Quick checks

```bash
# App host (should NOT custom-domain 404)
curl -sI -H 'Host: cursor' http://127.0.0.1:3000/ | head -5

# Unit contract
npx vitest run server/utils/__tests__/custom-domain-app-host.test.ts
```

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/custom-domain.ts` | `APP_HOSTS`, `DEV_PREVIEW_SUFFIXES`, `isAppHost` |
| `server/middleware/02.custom-domain.ts` | Host resolution + `import.meta.dev` skip |
| `nuxt.config.ts` | `vite.server.allowedHosts`, cookie `secure`, HSTS |
| `server/utils/__tests__/custom-domain-app-host.test.ts` | Host classification contract |
