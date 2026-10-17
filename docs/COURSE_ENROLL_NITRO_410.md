# Course enroll route retirement (Nitro `.post.ts`)

**When to use:** Clients still call `POST /api/courses/enroll` and need the Gone response; someone “fixes” retirement by editing the wrong file; debugging #207 after #205.

Verified against source (Sep 2026). Merge `be5448c5` (#207). Broader enrollment authority lives in draft `COURSE_HTTP_ENROLLMENT_HARDENING` (#205 / PR #206) — this page only covers **which file Nitro binds**.

---

## Intent

`POST /api/courses/enroll` must remain a **pure HTTP 410** with no auth, body parse, or DB writes. Canonical writers:

- `POST /api/courses/enroll-wallee`
- `POST /api/courses/enroll-cash`
- admin enrollment

---

## Contract

### Nitro file → route mapping (nitropack 2.13.4 `scanServerRoutes`)

| File | Bound route | Method |
|------|-------------|--------|
| `server/api/courses/enroll.post.ts` | `/api/courses/enroll` | **POST** |
| `server/api/courses/enroll/post.ts` | `/api/courses/enroll/post` | (no method suffix — path segment) |
| `server/api/courses/enroll-complete.post.ts` | `/api/courses/enroll-complete` | **POST** |

Both `enroll.post.ts` and `enroll/post.ts` are **410 handlers**. Keep both: deleting only the folder file does **not** retire the real enroll POST.

### Handler behavior

- Throws `createError({ statusCode: 410, … })` immediately.
- Status text points at wallee / cash / admin enrollment.
- No `readBody`, JWT, Supabase, or payment side effects (asserted by `enroll-post-410.test.ts`).

---

## Pitfalls

1. **Editing `enroll/post.ts` thinking it is `POST /api/courses/enroll`** — That file is `/api/courses/enroll/post`. Change `enroll.post.ts` for the real route.
2. **Reintroducing a writer in either file** — Both must stay Gone; #205 retired authenticated confirmed-registration creation on this path.
3. **Confusing this with payment/matching rules (#186–#189)** — Different topic (`COURSE_PUBLIC_ENROLLMENT` on draft #193).

---

## Codepaths

| Path | Role |
|------|------|
| `server/api/courses/enroll.post.ts` | Real `POST /api/courses/enroll` → 410 |
| `server/api/courses/enroll/post.ts` | Path-segment 410 (keep) |
| `server/api/courses/enroll-complete.post.ts` | Legacy completion → 410 |
| `server/utils/__tests__/enroll-post-410.test.ts` | Nitro mapping + pure-410 contract |
