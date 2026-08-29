# Admin Excel import (client-side exceljs)

**When to use:** SheetJS/`xlsx` CVE noise; Vercel serverless size after adding Excel parsers; admin Datenverwaltung cannot open `.xlsx`; empty workbook errors; course enrollment UI swallows German 409 text.

Verified against source (Aug 2026). Commit `18effe10`.

---

## Intent

Parse admin Excel uploads **in the browser** with `exceljs` so Nitro/server bundles stay under Vercel’s ~250 MB limit, and drop the vulnerable `xlsx` (SheetJS) dependency from the admin import path.

---

## Contract

Client helper: `utils/parse-xlsx-rows.client.ts` → `parseXlsxRows(ArrayBuffer)`.

| Behavior | Detail |
|----------|--------|
| Library | Dynamic `import('exceljs')` — only loaded when an `.xlsx` is chosen |
| Sheet | First worksheet only |
| Header | Row 1 → column keys (trimmed strings) |
| Rows | Object maps; fully empty rows skipped |
| Cells | Dates → ISO string; rich text / formula `result` flattened to string |
| Empty file | `{ header: [], rows: [] }` — UI shows “Die Excel-Datei ist leer.” |

CSV/TSV still parse in-page without exceljs.

---

## Surfaces

| Surface | Behavior |
|---------|----------|
| `pages/admin/data-management.vue` | Drag/drop or file picker → `parseXlsx` → `isParsingFile` spinner; no server upload of the workbook for parsing |
| `components/customer/CourseEnrollmentModal.vue` | Surfaces API `statusMessage` on conflicts (incl. German **409** text) instead of a generic failure |

Accepted extensions remain `.csv`, `.tsv`, `.xlsx`.

---

## Pitfalls

1. **Do not re-add `xlsx` on the server** for this flow — bundle size + advisory risk. Keep parsing client-side.
2. **Large workbooks** — Parsing blocks the UI briefly; spinner (`isParsingFile`) disables re-clicks.
3. **First sheet only** — Multi-sheet workbooks ignore sheet 2+.
4. **Formula cells** — Uses ExcelJS `result` when present; uncalculated formulas may look empty.
5. **409 on courses** — Enrollment conflict messages live on `error.data.statusMessage` / H3 `statusMessage`; UI must prefer those over a hardcoded string.

---

## Smoke test

1. Admin → Datenverwaltung → drop a small `.xlsx` with header + rows → column map and row count appear.
2. Empty workbook → German empty-file error.
3. Network tab: no server round-trip required to parse the workbook (only later import APIs if used).
4. Course enrollment conflict → toast/modal shows the API’s German 409 message.

---

## Codepaths

| Path | Role |
|------|------|
| `utils/parse-xlsx-rows.client.ts` | exceljs table parse |
| `pages/admin/data-management.vue` | File UI + CSV/XLSX loaders |
| `utils/__tests__/…` / `server/utils/__tests__/parse-xlsx-rows.test.ts` | Parser tests (if present) |
| `components/customer/CourseEnrollmentModal.vue` | 409 / statusMessage surfacing |
| `package.json` | `exceljs` dependency; no admin `xlsx` import |
