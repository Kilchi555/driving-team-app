# Staff Photo Upload — Booking & Website Avatars

**When to use:** Instructor cards on public booking show initials instead of a portrait, tenant website team blocks miss images, or admin photo upload fails (type/size/tenant).

Verified against source (Aug 2026).

---

## Intent

Admins upload a square WebP portrait for `staff` / `admin` users. The public URL is stored on `users.metadata` and surfaced on online booking instructor pickers and premium tenant website team sections.

---

## Contract

| Item | Value |
|------|--------|
| Endpoint | `POST /api/admin/upload-staff-photo` |
| Auth | Caller role in `admin`, `tenant_admin`, `super_admin`, `superadmin` |
| Target roles | `staff` or `admin` only |
| Tenant | Non–super-admin callers must match target `tenant_id` |
| Storage bucket | `tenant-logos` |
| Object path | `{tenant_id}/staff/{userId}-{sha1_10}.webp` |
| Processing | `sharp`: auto-rotate, cover crop **640×640**, WebP q82 |
| Max upload | **8 MB** raw |
| MIME allow | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif` |
| Metadata keys | Both `photo_url` and `avatar_url` set to the same public URL |

### Multipart fields

| Field | Required | Purpose |
|-------|----------|---------|
| `user_id` | Yes | Target `users.id` |
| `file` | Yes (unless remove) | Image bytes |
| `remove` | Optional | `"1"` clears `photo_url` / `avatar_url` from metadata (does not delete the storage object) |

Success: `{ success: true, photo_url: string | null }`.

---

## Admin UI

`components/admin/UserDetails.vue` posts the same multipart form (upload + remove). Local metadata is patched so the form reflects the new URL without a full reload.

---

## Consumers

| Consumer | How photo is read |
|----------|-------------------|
| Booking instructor grid | `POST /api/booking/get-locations-and-staff` → `metadata.photo_url` \|\| `metadata.avatar_url` → `photo_url` on each staff entry |
| Booking page UI | `pages/booking/availability/[slug].vue` — `<img>` if `instructor.photo_url`, else initials |
| Premium website team | `server/utils/website-premium.ts` + `pages/s/[subdomain]/**` — same metadata keys |

Staff must also be **online-bookable** at the location (and category/event-type rules) to appear in booking; a photo alone does not list them.

---

## Pitfalls

1. **Only staff/admin** — uploading for `customer` (or other roles) returns 400.
2. **Remove does not purge storage** — metadata keys are cleared; the WebP may remain in `tenant-logos`.
3. **Both metadata keys** — readers accept either; writers always set both to stay compatible.
4. **GIF → still WebP** — animated input is processed with `animated: false`; result is a static WebP.
5. **Booking cache / CDN** — after replace, hashed filename changes (`…-{hash}.webp`); old URLs may linger in browser cache until refresh.
6. **Half-day Ferien credits** — separate topic (`STAFF_HOURS_SOLL.md` on open docs PR #41); not part of photo upload.

---

## Codepaths

- `server/api/admin/upload-staff-photo.post.ts`
- `components/admin/UserDetails.vue` — upload / remove handlers
- `server/api/booking/get-locations-and-staff.post.ts` — expose `photo_url`
- `pages/booking/availability/[slug].vue` — instructor cards
- `server/utils/website-premium.ts`, `pages/s/[subdomain]/index.vue`, `pages/s/[subdomain]/[slug].vue`
