# SARI tenant ownership before side effects (#347)

Verified against `main` tip including `a40f7267`.

## Intent

Bind SARI enroll / unenroll / CZV·FL course actions / participant sync to the **authenticated tenant’s owned course (or session)** before any external SARI call, credential load, or local mutation. Service role bypasses RLS, so ownership must be checked in the handler.

## Contract

Gated routes (ownership before side effects):

| Route | Gate |
|---|---|
| `server/api/sari/enroll-student.post.ts` | Load session with joined `course`; require `course.tenant_id === userProfile.tenant_id`. Missing and foreign sessions share **404** `Course session not found`. Student already tenant-scoped. Body `tenant_id` is not authoritative. |
| `server/api/sari/unenroll-student.post.ts` | Session path: join `course:courses(id, tenant_id)` and compare tenants (same 404 collapsing). Registration update / deletes also `.eq('tenant_id', userProfile.tenant_id)`. |
| `server/api/sari/czv/delete-course.post.ts` | `courses.id` + `tenant_id = userProfile.tenant_id` before SARI delete. |
| `server/api/sari/czv/gen-confirmation.post.ts` | Same owned-course check before confirmation generation. |
| `server/api/sari/czv/start-import.post.ts` | Same owned-course check before import. |
| `server/api/sari/sync-participants.post.ts` | Load course with `.eq('tenant_id', userData.tenant_id)` **before** `getTenantSecretsSecure` / SARI client. Client-supplied `sariCourseIds` accepted only when already in the owned course’s session / `GROUP_` ids (`ownedSariIds`). |

There is no shared helper module named for this gate in #347: each handler performs an inline ownership query (or session+course join). Tests live in `server/utils/__tests__/sari-tenant-boundary.test.ts`.

## Pitfalls

- Service-role clients must not skip the tenant equality check.
- Foreign and missing resources should look the same to the caller (404), to avoid cross-tenant probing.
- Injected `sariCourseIds` / body `tenant_id` must not expand the SARI call set beyond owned ids.
- Distinct from SARI membership / checkout race runbooks and from ABSENT / deny-on-null SARI docs.

## Tests (`sari-tenant-boundary`)

- **enroll-student**: owned enroll succeeds; foreign session blocked before SARI and before registration insert; no membership when SARI enroll fails.
- **unenroll-student**: owned unenroll; foreign session blocked; registration-scoped multi-session unenroll; foreign registration course blocked; no foreign session id passed to SARI; fail closed with no membership; keep membership when SARI unenroll fails.
- **CZV / FL**: ownership required for start-import, delete-course, gen-confirmation.
- **sync-participants**: no SARI call for injected foreign course id; sync owned ids; keep owned and drop injected ids in one request.

## Codepaths

| Path | Role |
|---|---|
| `server/api/sari/enroll-student.post.ts` | Session+course tenant check before secrets/SARI/insert |
| `server/api/sari/unenroll-student.post.ts` | Session course tenant + registration tenant scope |
| `server/api/sari/czv/{start-import,delete-course,gen-confirmation}.post.ts` | Owned course row before side effects |
| `server/api/sari/sync-participants.post.ts` | Owned course + owned SARI id filter before secrets |
| `server/utils/__tests__/sari-tenant-boundary.test.ts` | Boundary suite |

## Related (do not conflate)

- Welcome/onboarding **#338** / open **#339** — not SARI.
- Register-client / invitation docs (**#196**, **#362**) — auth registration, not SARI tenant boundary.
