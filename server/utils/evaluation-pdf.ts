// server/utils/evaluation-pdf.ts
// Generiert das HTML für den Bewertungs-PDF-Export (wird via Puppeteer gerendert)

import type { ExtendedTenantBranding } from './tenant-branding'

export interface EvaluationCriterionPdf {
  name: string
  rating: number
  ratingLabel: string
  ratingColor: string
  note?: string | null
}

export interface EvaluationCategoryPdf {
  name: string
  color: string
  averageRating: number
  criteria: EvaluationCriterionPdf[]
}

export interface EvaluationLessonPdf {
  date: string
  type: string
  averageRating: number | null
  staffNote?: string | null
  evaluationCount: number
}

export interface EvaluationPdfData {
  student: {
    firstName: string
    lastName: string
  }
  generatedAt: string
  summary: {
    totalLessons: number
    evaluatedLessons: number
    totalRatings: number
    averageRating: number
    excellentCount: number // rating >= 5
  }
  categories: EvaluationCategoryPdf[]
  lessons: EvaluationLessonPdf[]
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.padEnd(6, '0'), 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r}, ${g}, ${b}`
}

function darken(hex: string, amount = 30): string {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.padEnd(6, '0'), 16)
  const r = Math.max(0, ((num >> 16) & 255) - amount)
  const g = Math.max(0, ((num >> 8) & 255) - amount)
  const b = Math.max(0, (num & 255) - amount)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

function ratingBarWidth(rating: number, max = 6): string {
  return `${Math.round((rating / max) * 100)}%`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function generateEvaluationPdfHtml(
  data: EvaluationPdfData,
  branding: ExtendedTenantBranding,
  logoDataUrl: string | null
): string {
  const primary = branding.primaryColor
  const secondary = branding.secondaryColor
  const primaryRgb = hexToRgb(primary)
  const primaryDark = darken(primary, 40)

  const studentName = `${escapeHtml(data.student.firstName)} ${escapeHtml(data.student.lastName)}`
  const tenantName = escapeHtml(branding.tenantName)

  // --- Category rows ---
  const categoryRows = data.categories.map(cat => {
    const avg = cat.averageRating.toFixed(1)
    const barWidth = ratingBarWidth(cat.averageRating)
    const catColor = cat.color || primary
    return `
      <div class="category-row">
        <div class="category-dot" style="background:${escapeHtml(catColor)}"></div>
        <div class="category-name">${escapeHtml(cat.name)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${barWidth};background:${escapeHtml(catColor)}"></div>
        </div>
        <div class="category-score">${avg} / 6</div>
      </div>`
  }).join('')

  // --- Criteria detail sections ---
  const criteriaDetail = data.categories.map(cat => {
    const catColor = cat.color || primary
    const rows = cat.criteria.map(c => {
      const badgeBg = c.ratingColor || primary
      return `
        <tr class="criteria-row">
          <td class="criteria-name">${escapeHtml(c.name)}</td>
          <td class="criteria-note">${c.note ? escapeHtml(c.note) : ''}</td>
          <td class="criteria-badge-cell">
            <span class="criteria-badge" style="background:${escapeHtml(badgeBg)}">${c.rating} – ${escapeHtml(c.ratingLabel)}</span>
          </td>
        </tr>`
    }).join('')

    return `
      <div class="criteria-section">
        <div class="criteria-section-header" style="border-left-color:${escapeHtml(catColor)}">
          <span class="criteria-section-dot" style="background:${escapeHtml(catColor)}"></span>
          ${escapeHtml(cat.name)}
        </div>
        <table class="criteria-table">
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }).join('')

  // --- Lesson history rows ---
  const lessonRows = data.lessons.map((l, i) => {
    const avgCell = l.averageRating !== null
      ? `<span class="lesson-avg">${l.averageRating.toFixed(1)}</span>`
      : `<span class="lesson-no-eval">–</span>`
    const noteCell = l.staffNote
      ? `<div class="lesson-note">"${escapeHtml(l.staffNote)}"</div>`
      : ''
    const rowClass = i % 2 === 0 ? 'lesson-row even' : 'lesson-row odd'
    return `
      <tr class="${rowClass}">
        <td class="lesson-date">${escapeHtml(l.date)}</td>
        <td class="lesson-type">${escapeHtml(l.type)}</td>
        <td class="lesson-count">${l.evaluationCount}</td>
        <td class="lesson-avg-cell">${avgCell}${noteCell}</td>
      </tr>`
  }).join('')

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="${tenantName}" class="header-logo" />`
    : `<div class="header-logo-fallback">${tenantName.substring(0, 2).toUpperCase()}</div>`

  const taglineHtml = branding.brandTagline
    ? `<div class="header-tagline">${escapeHtml(branding.brandTagline)}</div>`
    : ''

  const contactLine = [branding.contactEmail, branding.contactPhone, branding.websiteUrl]
    .filter(Boolean)
    .join(' · ')

  const noCategories = data.categories.length === 0
  const noLessons = data.lessons.length === 0

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 210mm;
    font-family: 'Inter', Arial, sans-serif;
    font-size: 10pt;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    padding: 0;
    background: #fff;
  }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%);
    padding: 24px 32px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .header-logo {
    height: 44px;
    max-width: 140px;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }
  .header-logo-fallback {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255,255,255,0.25);
    color: #fff;
    font-size: 18pt;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .header-info { flex: 1; }
  .header-title {
    font-size: 16pt;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.3px;
  }
  .header-tagline {
    font-size: 8pt;
    color: rgba(255,255,255,0.75);
    margin-top: 2px;
  }
  .header-right {
    text-align: right;
  }
  .header-student {
    font-size: 14pt;
    font-weight: 700;
    color: #fff;
  }
  .header-date {
    font-size: 8pt;
    color: rgba(255,255,255,0.75);
    margin-top: 3px;
  }

  /* ── Body ── */
  .body { padding: 24px 32px 32px; }

  /* ── Section headings ── */
  .section-title {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    margin-bottom: 10px;
    margin-top: 22px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }
  .section-title:first-child { margin-top: 0; }

  /* ── Summary tiles ── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 4px;
  }
  .summary-tile {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    text-align: center;
  }
  .summary-value {
    font-size: 22pt;
    font-weight: 800;
    color: ${primary};
    line-height: 1;
  }
  .summary-label {
    font-size: 7.5pt;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
  }

  /* ── Category bars ── */
  .categories-list { display: flex; flex-direction: column; gap: 8px; }
  .category-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .category-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .category-name {
    width: 130px;
    font-size: 9pt;
    font-weight: 600;
    color: #334155;
    flex-shrink: 0;
  }
  .bar-track {
    flex: 1;
    height: 10px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0s;
  }
  .category-score {
    width: 50px;
    text-align: right;
    font-size: 9pt;
    font-weight: 700;
    color: #334155;
    flex-shrink: 0;
  }

  /* ── Criteria detail ── */
  .criteria-section { margin-bottom: 14px; }
  .criteria-section-header {
    font-size: 9pt;
    font-weight: 700;
    color: #1e293b;
    padding: 6px 10px;
    border-left: 3px solid ${primary};
    background: #f8fafc;
    border-radius: 0 6px 6px 0;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .criteria-section-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .criteria-table {
    width: 100%;
    border-collapse: collapse;
  }
  .criteria-row td {
    padding: 5px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  .criteria-row:last-child td { border-bottom: none; }
  .criteria-name {
    font-size: 8.5pt;
    font-weight: 600;
    color: #334155;
    width: 45%;
  }
  .criteria-note {
    font-size: 8pt;
    color: #64748b;
    font-style: italic;
    width: 40%;
  }
  .criteria-badge-cell {
    text-align: right;
    width: 15%;
    white-space: nowrap;
  }
  .criteria-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 7.5pt;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

  /* ── Lesson history ── */
  .lesson-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  .lesson-table th {
    text-align: left;
    font-weight: 600;
    color: #64748b;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 6px 8px;
    border-bottom: 2px solid #e2e8f0;
  }
  .lesson-row.even td { background: #f8fafc; }
  .lesson-row.odd td { background: #fff; }
  .lesson-row td {
    padding: 6px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }
  .lesson-date { color: #334155; font-weight: 600; white-space: nowrap; }
  .lesson-type { color: #64748b; }
  .lesson-count { color: #64748b; text-align: center; }
  .lesson-avg {
    display: inline-block;
    background: rgba(${primaryRgb}, 0.12);
    color: ${primary};
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 8pt;
  }
  .lesson-no-eval { color: #94a3b8; }
  .lesson-note {
    font-size: 7.5pt;
    color: #64748b;
    font-style: italic;
    margin-top: 2px;
  }
  .lesson-avg-cell { vertical-align: middle; }

  /* ── Footer ── */
  .footer {
    margin-top: 28px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #94a3b8;
  }
  .footer-brand { font-weight: 600; color: #64748b; }

  /* ── Empty states ── */
  .empty-state {
    text-align: center;
    padding: 20px;
    color: #94a3b8;
    font-size: 8.5pt;
    font-style: italic;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px dashed #e2e8f0;
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    ${logoHtml}
    <div class="header-info">
      <div class="header-title">Fahrstunden-Auswertung</div>
      ${taglineHtml}
    </div>
    <div class="header-right">
      <div class="header-student">${studentName}</div>
      <div class="header-date">Erstellt am ${escapeHtml(data.generatedAt)} · ${tenantName}</div>
    </div>
  </div>

  <div class="body">

    <!-- Übersicht -->
    <div class="section-title">Übersicht</div>
    <div class="summary-grid">
      <div class="summary-tile">
        <div class="summary-value">${data.summary.evaluatedLessons}</div>
        <div class="summary-label">Bewertete Lektionen</div>
      </div>
      <div class="summary-tile">
        <div class="summary-value" style="color:${primary}">${data.summary.averageRating > 0 ? data.summary.averageRating.toFixed(1) : '–'}</div>
        <div class="summary-label">Durchschnittsbewertung</div>
      </div>
      <div class="summary-tile">
        <div class="summary-value">${data.summary.excellentCount}</div>
        <div class="summary-label">Kriterien auf "Gut"-Niveau</div>
      </div>
    </div>

    <!-- Kategorien -->
    ${data.categories.length > 0 ? `
    <div class="section-title">Kategorien</div>
    <div class="categories-list">
      ${categoryRows}
    </div>` : ''}

    <!-- Kriterien Detail -->
    ${data.categories.length > 0 ? `
    <div class="section-title">Bewertungsdetails</div>
    ${noCategories ? `<div class="empty-state">Noch keine Bewertungen vorhanden</div>` : criteriaDetail}
    ` : ''}

    <!-- Lektionen-Verlauf -->
    ${data.lessons.length > 0 ? `
    <div class="section-title">Lektionen-Verlauf</div>
    ${noLessons ? `<div class="empty-state">Noch keine Lektionen vorhanden</div>` : `
    <table class="lesson-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Lektionstyp</th>
          <th style="text-align:center">Bewert.</th>
          <th>Durchschnitt</th>
        </tr>
      </thead>
      <tbody>${lessonRows}</tbody>
    </table>`}
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <span class="footer-brand">${tenantName}${branding.contactEmail ? ` · ${escapeHtml(branding.contactEmail)}` : ''}${branding.contactPhone ? ` · ${escapeHtml(branding.contactPhone)}` : ''}</span>
      <span>Dieses Dokument wurde automatisch generiert · ${escapeHtml(data.generatedAt)}</span>
    </div>

  </div>
</div>
</body>
</html>`
}
