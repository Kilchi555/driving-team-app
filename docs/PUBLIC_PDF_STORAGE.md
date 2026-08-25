# Public PDF storage (receipts bucket)

**When to use:** Native app cannot open a PDF; course participant-list upload fails with Supabase `Invalid key`; invoice/correspondence PDF overwrites another tenant’s file; download filename shows mojibake or umlauts disappear from the **object key**.

Verified against source (Aug 2026). Related UI: course roster → `CourseSessionRosterModal` → `openParticipantListPdf`.

---

## Intent

Generated PDFs must open in **Capacitor** via `Browser.open()`, which only accepts **http(s)** URLs. The shared helper uploads to the public Supabase `receipts` bucket and returns a public URL plus a human-readable download name.

Object keys must satisfy Supabase Storage `isValidKey` (ASCII / S3-safe). User-facing names (course titles with umlauts, invoice numbers) must **not** be embedded in the storage path.

---

## Contract

`uploadPdfAndGetPublicUrl(supabase, { folder, filename, pdfBuffer })`:

| Output | Meaning |
|--------|---------|
| `pdfUrl` | Public HTTPS URL of the uploaded object |
| `filename` | Sanitized display/download name (may still be German ASCII, e.g. `Zuerich`) |

Storage path shape:

```text
{folder}/{YYYY}/{MM}/{uuid}.pdf
```

Example (participant list):

```text
participant-lists/2026/08/7be38dda-9882-4efc-a2c6-b5e66813f9f7.pdf
```

- **Path** = ASCII folder + date + random UUID only (no course/student name).
- **Download name** = `sanitizeStorageFilename(filename)` — umlauts transliterated (`ü`→`ue`, `ß`→`ss`), accents stripped, junk → `_`.

### Callers (same helper)

| API / flow | Typical `folder` |
|------------|------------------|
| `POST /api/courses/participant-list-pdf` | `participant-lists` |
| Invoice download / dunning / preview | invoice-related folders |
| Correspondence send / download / preview | correspondence folders |

Client open path: `utils/openPdf.ts` — native requires HTTPS; web may use blob/`window.open`.

### Participant list specifics

- Auth: `requireAdminProfile` (same gate as roster).
- Body: `{ courseId?, appointmentId? }` → `loadCourseRoster` → `all_participants`.
- Empty roster / missing course name → **400**.
- Render: Puppeteer (+ `@sparticuz/chromium` on Vercel) from `buildParticipantListHtml`.
- Web: `openParticipantListPdf` prefers local print dialog; native always hits the PDF API.

---

## Pitfalls

1. **Do not put course names in the object key** — Even after light sanitizing, titles like `Zürich-Altstetten` historically failed `isValidKey`. UUID-only paths are mandatory.
2. **`upsert: true` without a unique token** — Same filename across tenants would overwrite. The helper always prefixes with `crypto.randomUUID()`.
3. **Native ≠ data URL** — Returning a base64 `data:` PDF breaks Capacitor. Always upload + public URL.
4. **Filename vs path** — Ops/debug: the download name can contain transliterated course text; the storage key will not. Searching Storage by course name will miss objects.
5. **Chromium locally** — Dev launch looks for Chrome/Chromium binaries; production uses Sparticuz. Missing binary → render 500, not a storage error.

---

## Ops checks

```bash
# After a failed native open: confirm URL is https and object exists
# Key pattern: participant-lists/YYYY/MM/<uuid>.pdf in bucket `receipts`
```

Unit coverage: `server/utils/__tests__/upload-pdf-public.test.ts` (umlaut transliteration + UUID path).

---

## Codepaths

| Path | Role |
|------|------|
| `server/utils/upload-pdf-public.ts` | Sanitize name, UUID path, upload to `receipts` |
| `server/api/courses/participant-list-pdf.post.ts` | Roster → HTML → PDF → upload |
| `utils/print-participant-list.ts` | Web print vs native PDF API |
| `utils/openPdf.ts` | Capacitor Browser vs web download |
| `components/CourseSessionRosterModal.vue` | Staff/admin “Teilnehmerliste” action |
