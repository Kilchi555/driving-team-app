# SMS / Print Short Links (`simy.ch/fl`)

**When to use:** Outbound SMS or print for driving-instructor prospects needs a short URL; click counts must be checked without simy.ch GA4 access; `/fl` unexpectedly forwards to app.simy.ch; UTM attribution is missing on `/fahrschule`.

Verified against source (Aug 2026).

---

## Intent

Keep campaign links short and readable (`simy.ch/fl`) while attaching full UTM params **server-side** before a 302 to the marketing landing page. Also write each click to Supabase so operators can count opens in SQL without GA4 on the simy.ch property.

Lives in the **Simy marketing app** (`apps/simy`), not the main booking app.

---

## Contract

| Item | Detail |
|------|--------|
| Public URL | `https://simy.ch/fl` (optional `?c=<campaign>`) |
| Handler | `apps/simy/server/routes/fl.get.ts` |
| Default campaign | `fahrlehrer-empfehlung` (when `c` omitted or empty) |
| Campaign cap | `c` trimmed, max **60** chars |
| Redirect | **302** → `/fahrschule?utm_source=sms&utm_medium=sms&utm_campaign=<campaign>` |
| Click log | RPC `log_sms_link_click` → table `public.sms_link_clicks` |
| Env | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable/anon) |

RPC body fields sent by the route:

- `p_campaign`
- `p_target_path` (always `/fahrschule` today)
- `p_user_agent`
- `p_referrer`

The RPC is a **security definer** with a narrow grant to anon: insert into that click table only. The marketing site must not use a service-role key here.

---

## Routing pitfall (Vercel)

`apps/simy/vercel.json` has a catch-all that forwards most paths to `https://app.simy.ch/$1`. **`fl` is excluded** from that negative lookahead so the marketing Nuxt route can serve `/fl`.

If someone removes `fl` from the exclusion list, SMS links will hit the app host and the short-link handler will not run.

---

## Click logging reliability

On **current main**, logging is fire-and-forget (`fetch` without await). On Vercel, work started after the response is sent can be cut off, so rows may be missing even when the redirect succeeds.

Follow-up **PR #53** (open at doc time) awaits the RPC with a **2s** abort timeout so logging completes before the 302; failures/timeouts still never block the redirect. Prefer that behavior in production.

Missing `SUPABASE_URL` / `SUPABASE_ANON_KEY` → logging is skipped silently; redirect still happens.

---

## Ops checks

```sql
-- Recent clicks for the default campaign
SELECT id, campaign, target_path, user_agent, referrer, created_at
FROM public.sms_link_clicks
WHERE campaign = 'fahrlehrer-empfehlung'
ORDER BY created_at DESC
LIMIT 50;
```

Manual smoke: open `https://simy.ch/fl` and `https://simy.ch/fl?c=test-drop`, confirm 302 to `/fahrschule` with UTMs, then confirm rows (after #53 lands, every click should insert).

There is **no SQL migration in this repo** for `sms_link_clicks` / `log_sms_link_click` — schema was applied in Supabase for the marketing campaigns. Do not invent columns beyond what the RPC accepts; inspect the live DB for the full table DDL.

---

## Examples

```text
simy.ch/fl
→ /fahrschule?utm_source=sms&utm_medium=sms&utm_campaign=fahrlehrer-empfehlung

simy.ch/fl?c=print-flyer-q3
→ /fahrschule?utm_source=sms&utm_medium=sms&utm_campaign=print-flyer-q3
```

(`utm_source` / `utm_medium` stay `sms` even for print — intentional for this drop.)

---

## Codepaths

- `apps/simy/server/routes/fl.get.ts` — redirect + click log
- `apps/simy/vercel.json` — keep `/fl` on the marketing deployment
- Supabase: `public.sms_link_clicks`, RPC `log_sms_link_click`
