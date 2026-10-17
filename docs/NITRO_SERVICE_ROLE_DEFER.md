# Defer Nitro service-role clients until the handler

**When to use:** Adding or editing Nitro API modules that need a Supabase service-role client, or debugging Nuxt/Nitro boot crashes that mention TDZ / module init around `createClient`.

Verified against current `main` (Oct 2026). Landed: **#293** (`ca6f549d`).

**Not this:** Broader lazy Supabase server init (open draft **#284**). Resend lazy init (`docs` draft #300 / #295). Public mutator removal (#304). Prefer `getSupabaseAdmin()` from `server/utils/supabase-admin` when the route already uses that helper.

---

## Intent

Do not construct `@supabase/supabase-js` service-role clients at **module top level**. Import-time `createClient(process.env.SUPABASE_URL!, …)` ran during Nitro module evaluation and could crash Nuxt dev with a renderer temporal-dead-zone error. Create the client **inside** the request handler (or a factory called from the handler) after the request arrives.

---

## Contract (current `main`)

Three modules were fixed the same way:

| Module | Pattern |
|--------|---------|
| `server/api/admin/manage.post.ts` | `createServiceRoleClient()` called after auth inside the handler; client passed into action helpers |
| `server/api/auth/register.post.ts` | Same local factory; no module-scope client |
| `server/api/documents/upload.post.ts` | Same local factory inside the handler |

Factory shape (all three):

```ts
function createServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient(supabaseUrl!, serviceRoleKey!)
}
```

Auth / session checks still run first where they already existed; only the **timing** of client construction changed. Credentials are the same env vars as before.

---

## Pitfalls

1. **Do not reintroduce top-level `createClient`** in these (or similar) API files — it can break `nuxt dev` even when production appears fine.  
2. **#284 may supersede local factories** — if that PR merges a shared lazy server client, prefer the shared helper and retire per-file factories.  
3. **Non-null assertions remain** — missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` still fail when the handler first builds the client; that is unchanged.  
4. **Passing the client into helpers** — manage.post action functions take `supabase` as an argument so they never close over a module singleton.

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/admin/manage.post.ts` | Evaluation admin actions |
| `server/api/auth/register.post.ts` | Session-based register actions |
| `server/api/documents/upload.post.ts` | Authenticated document upload actions |
| `server/utils/supabase-admin.ts` | Preferred shared admin client elsewhere (`getSupabaseAdmin`) |
