# In-App Help Modal (Role-Based Articles)

**When to use:** Adding/editing user help content, help modal empty for a role, `/help` redirects oddly, or Markdown rendering/callouts look wrong.

Author-facing content rules: [`content/help/README.md`](../content/help/README.md).

---

## Intent

Ship short, role-scoped how-tos inside the app (modal + deep links) without a CMS. Articles are Markdown on disk under `content/help/{client|staff|admin}/`, loaded by a Nitro API, filtered by the signed-in user’s role.

---

## Architecture

```
content/help/{role}/*.md
        ↓
GET /api/help/articles  (reads filesystem, parses frontmatter + Markdown)
        ↓
composables/useHelpDocs.ts  (role filter)
        ↓
components/help/HelpModal.vue  (global modal in app.vue)
```

| Piece | Path |
|-------|------|
| Modal shell | `components/help/HelpModal.vue` (mounted from `app.vue`) |
| Open/close state | `composables/useHelpModal.ts` (`openHelp`, `openArticle`, …) |
| Fetch + visibility | `composables/useHelpDocs.ts` |
| API | `server/api/help/articles.get.ts` |
| Parse / sanitize | `utils/helpMarkdown.ts` (DOMPurify) |
| Route shims | `pages/help/index.vue`, `pages/help/[slug].vue` — open modal then redirect to role home |
| Entry points | Admin layout, `CustomerDashboard`, `StaffSettings` (`openHelp()`) |

Nuxt `ignore` excludes `**/*.md` globally but **un-ignores** `content/help/**` so articles stay watchable in dev (`nuxt.config.ts`).

---

## Article contract

**Path:** `content/help/<role>/<slug>.md` — slug = filename without `.md` (not `README.md`).

**Frontmatter**

```yaml
---
title: Kurzer Titel
summary: Ein Satz für die Übersicht
order: 10
---
```

| Field | Required | Notes |
|-------|----------|--------|
| `title` | yes (falls back to slug) | List + modal header |
| `summary` | recommended | Overview card |
| `order` | optional (default 100) | Lower = higher in list; API sorts `order` then title (`de`) |

**Body Markdown (supported subset):** `#`–`###`, paragraphs, `-`/`*` ul, numbered ol, `` `code` ``, `**bold**`, `*em*`, links (`http(s)` or `/path`), pipes tables. First `#` heading is skipped in HTML (title comes from frontmatter).

**Callout headings (h2):** title starting with `Tipp` → tip; `Hinweis` / `Gut zu wissen` → note; `Wichtig` / `Voraussetzung` → warn. Rendered as `<aside class="help-callout …">`.

HTML is sanitized; allowed tags include headings, lists, table, `aside`, `a`, `code`, etc.

---

## Role visibility

API returns **all** roles’ articles. Client filter:

| Auth role | `helpRole` | Visible article roles |
|-----------|------------|------------------------|
| client | `client` | `client` only |
| staff | `staff` | `staff` only |
| admin / super_admin / tenant_admin / sub_admin | `admin` | **`admin` + `staff`** |
| none / unknown | `null` | empty list |

Admins intentionally see staff docs too. Clients never see staff/admin articles via the modal filter (even though the API payload includes them — do not put secrets in help Markdown).

---

## `/help` routes

`/help` and `/help/:slug` are thin shims: call `openHelp(slug?)`, then `navigateTo` the role dashboard (`/customer-dashboard`, `/dashboard`, or admin home). Deep links still work; content stays in the modal.

---

## Common pitfalls

1. **Forgot frontmatter** — article still loads; title becomes the slug; order defaults to 100 (sinks to bottom).
2. **Wrong folder** — staff file under `client/` never appears for instructors.
3. **README.md in a role folder** — skipped by the API.
4. **Unsupported Markdown** — images, HTML blocks, nested formatting may be stripped or ignored; stick to the subset above.
5. **Empty modal for logged-out users** — `visibleRoles` is empty until auth roles resolve.
6. **Deploy / cwd** — API uses `process.cwd()/content/help`; ensure that tree is present in the server bundle (not only client assets).
7. **Content style** — German du-form, real product UI only; no invented features (`content/help/README.md`).

---

## Codepaths

- `content/help/**`
- `content/help/README.md`
- `server/api/help/articles.get.ts`
- `utils/helpMarkdown.ts`
- `composables/useHelpDocs.ts`
- `composables/useHelpModal.ts`
- `components/help/HelpModal.vue`
- `app.vue`
- `pages/help/index.vue`, `pages/help/[slug].vue`
- `layouts/admin.vue`, `components/customer/CustomerDashboard.vue`, `components/StaffSettings.vue`
- `nuxt.config.ts` (`ignore` exception for `content/help/**`)
