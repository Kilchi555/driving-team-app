# Tenant brand colors from logo

**When to use:** Logo upload succeeds but booking/UI stays indigo stock colors; website CMS colors diverge from admin branding; custom event-type colors get overwritten after a logo change; simy.ch marketing preview colors ≠ persisted palette; grey/black wordmarks extract to `null`.

Verified against source (Aug 2026). Tip `#78` / commit `2bba3b99`.

---

## Intent

Every logo persist path extracts a 3-color palette (primary, secondary, accent) with the **same** Sharp pipeline used by the preview API, then writes it to `tenants` + `website_tenants` and selectively updates `event_types.default_color`.

---

## Extraction

`extractColorsFromImageBuffer` in `server/utils/extract-logo-colors.ts`:

1. Rotate → resize 120×120 cover → raw RGBA.
2. **Pass 1 (`vivid`):** drop near-white / near-black and low-saturation pixels.
3. **Pass 2 (`ink`):** if &lt;10 vivid pixels, keep any non-near-white ink (grey/black marks).
4. K-means (k=3, 12 iters) → sort by saturation → `normalizeBrandPalette` (UI contrast + distance floors).
5. Returns `[primary, secondary, accent]` hex strings, or `null` if still &lt;10 pixels.

Preview API: `POST /api/brand/extract-colors`

| Constraint | Value |
|------------|-------|
| Body | `{ logoData: "data:image/…;base64,…" }` |
| Max payload | 2.5 MB decoded |
| Rate limit | 30 / min / IP (`extract_logo_colors`) |
| Response | `{ colors: [p,s,a] \| null }` |

Client helpers: `extractColorsFromLogo` / `extractColorsFromFile` in `utils/logoUtils.ts` (also used on `apps/simy` via proxy `apps/simy/server/api/brand/extract-colors.post.ts` → app URL).

---

## Persist / apply

`applyTenantBrandColors(supabase, tenantId, { primary, secondary, accent }, { previousColors? })`:

| Target | Update |
|--------|--------|
| `tenants` | `primary_color`, `secondary_color`, `accent_color` |
| `website_tenants` | Same three columns (by `tenant_id`) |
| `event_types` | `default_color = primary` **only** when `shouldSyncEventTypeColor` |

### When event types sync

`shouldSyncEventTypeColor(color, previousColors)` is true if:

- Color is a **stock** Simy template hex (`#6366f1`, `#0ea5e9`, `#8b5cf6`, `#ec4899`, `#f59e0b`, `#10b981`, `#3b82f6`, `#666666`), or
- Color matches any previous tenant primary/secondary/accent (case-insensitive).

Otherwise the event type keeps its custom color (e.g. `#C45A12`).

If `previousColors` is omitted, the helper loads current tenant colors first (so a second logo upload can replace the **previous** brand palette on event types).

---

## Call sites

| Trigger | Path | Notes |
|---------|------|-------|
| Admin / staff logo upload | `POST /api/tenant/upload-logo` | Runs extract+apply for `logo`, `logo_wide`, `logo_square`; returns `colors` in JSON |
| Manual branding save | `POST /api/tenants/branding` | When `primary_color` changes, applies with explicit `previousColors` from existing row |
| Tenant register defaults | `server/api/tenants/register.post.ts` | After category/event defaults, re-applies current brand onto event types |
| Seed defaults | `server/api/tenants/seed-defaults.post.ts` | Same apply helper |
| Website wizard | `POST /api/website/wizard-save` | Apply when wizard stores brand |
| UI preview only | `POST /api/brand/extract-colors` | Does **not** write DB |

`LogoUploadBox` / `TenantLogoUpload` / admin profile use the upload API; marketing site preview uses extract-colors only until register.

---

## Pitfalls

1. **Preview ≠ persist** — Changing colors in the UI without saving branding / uploading a logo leaves DB unchanged. Persist only on the call sites above.
2. **Custom calendar colors** — Manually set `event_types.default_color` outside stock + previous brand is preserved across logo swaps.
3. **Transparent / tiny logos** — &lt;10 usable pixels → `null`; upload still succeeds with `colors: null`.
4. **Banner uploads** — `assetType: banner` syncs `hero_image_url` only; no palette extract.
5. **Website row missing** — `website_tenants` update warns and continues; tenant row may still update.
6. **simy.ch proxy** — Marketing app forwards extract to `APP_URL`; local marketing-only env without app URL fails preview.

---

## Smoke test

1. Upload `logo_square` with a vivid brand mark → response includes `colors`; `tenants.primary_color` and `website_tenants.primary_color` match; stock event types move to primary.
2. Set one event type to `#C45A12`, upload a new logo → that event type stays `#C45A12`; stock / old-brand colors update.
3. `POST /api/brand/extract-colors` with the same data URL → same triple as upload would persist.
4. Grey wordmark logo → ink pass yields a usable darkened primary (not silent `null`).

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/extract-logo-colors.ts` | Sharp palette extraction |
| `server/utils/apply-tenant-brand-colors.ts` | Persist + selective event-type sync |
| `server/utils/stock-event-type-color.ts` | Stock hex set |
| `server/api/brand/extract-colors.post.ts` | Preview API |
| `server/api/tenant/upload-logo.post.ts` | Logo persist + apply |
| `server/api/tenants/branding.post.ts` | Manual color save |
| `utils/logoUtils.ts` | Client extract wrapper |
| `server/utils/__tests__/extract-logo-colors.test.ts` | Extraction tests |
| `server/utils/__tests__/apply-tenant-brand-colors.test.ts` | Sync matrix |
