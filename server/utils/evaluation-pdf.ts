// server/utils/evaluation-pdf.ts
// Generiert das HTML für den Bewertungs-PDF-Export (wird via Puppeteer gerendert)

import type { ExtendedTenantBranding } from './tenant-branding'

export interface EvaluationCriterionPdf {
  name: string
  categoryName: string
  rating: number
  ratingLabel: string
  ratingColor: string
  note?: string | null
}

export interface EvaluationLessonPdf {
  date: string
  durationMinutes: number
  type: string
  staffName?: string | null
  staffNote?: string | null
  criteria: EvaluationCriterionPdf[]
}

export interface EvaluationPdfData {
  student: {
    firstName: string
    lastName: string
  }
  generatedAt: string
  summary: {
    totalDurationMinutes: number
    evaluatedLessons: number
  }
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
  const primaryDark = darken(primary, 40)
  const primaryRgb = hexToRgb(primary)

  const studentName = `${escapeHtml(data.student.firstName)} ${escapeHtml(data.student.lastName)}`
  const tenantName = escapeHtml(branding.tenantName)

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="${tenantName}" class="header-logo" />`
    : `<div class="header-logo-fallback">${tenantName.substring(0, 2).toUpperCase()}</div>`

  const taglineHtml = branding.brandTagline
    ? `<div class="header-tagline">${escapeHtml(branding.brandTagline)}</div>`
    : ''

  // 45 min as the standard lesson unit (Swiss driving school norm)
  const STANDARD_LESSON_MIN = 45
  const lessonEquivalent = data.summary.totalDurationMinutes / STANDARD_LESSON_MIN
  const lessonEquivalentDisplay = Number.isInteger(lessonEquivalent)
    ? lessonEquivalent.toString()
    : lessonEquivalent.toFixed(1)
  const evaluatedLessons = data.lessons.filter(l => l.criteria.length > 0)

  const lessonBlocks = evaluatedLessons.map((lesson, idx) => {
    const durationLabel = lesson.durationMinutes ? `${lesson.durationMinutes} Min.` : ''
    const typeLabel = lesson.type ? `Kategorie ${escapeHtml(lesson.type)}` : ''
    const staffLabel = lesson.staffName ? escapeHtml(lesson.staffName) : ''
    const metaLine = [durationLabel, typeLabel, staffLabel].filter(Boolean).join(' · ')

    const staffNoteHtml = lesson.staffNote
      ? `<div class="lesson-staff-note">"${escapeHtml(lesson.staffNote)}"</div>`
      : ''

    const criteriaRows = lesson.criteria.map(c => {
      const badgeBg = c.ratingColor || primary
      return `
        <tr class="criteria-row">
          <td class="criteria-name-cell">${escapeHtml(c.name)}</td>
          <td class="criteria-cat-cell">${escapeHtml(c.categoryName)}</td>
          <td class="criteria-note-cell">${c.note ? escapeHtml(c.note) : ''}</td>
          <td class="criteria-badge-cell">
            <span class="criteria-badge" style="background:${escapeHtml(badgeBg)}">${escapeHtml(c.ratingLabel)}</span>
          </td>
        </tr>`
    }).join('')

    const divider = idx < evaluatedLessons.length - 1 ? '<div class="lesson-divider"></div>' : ''

    return `
      <div class="lesson-block">
        <div class="lesson-header">
          <div class="lesson-date-badge">${escapeHtml(lesson.date)}</div>
          ${metaLine ? `<div class="lesson-meta">${metaLine}</div>` : ''}
        </div>
        ${staffNoteHtml}
        <table class="criteria-table">
          <thead>
            <tr>
              <th class="th-topic">Thema</th>
              <th class="th-cat">Kategorie</th>
              <th class="th-note">Notiz</th>
              <th class="th-rating">Bewertung</th>
            </tr>
          </thead>
          <tbody>${criteriaRows}</tbody>
        </table>
      </div>
      ${divider}`
  }).join('')

  const emptyState = evaluatedLessons.length === 0
    ? `<div class="empty-state">Noch keine bewerteten Lektionen vorhanden</div>`
    : ''

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

  .page { width: 210mm; background: #fff; }

  /* ── Header ── */
  .header {
    background: linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%);
    padding: 22px 32px 18px;
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .header-logo {
    height: 40px;
    max-width: 130px;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }
  .header-logo-fallback {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255,255,255,0.25);
    color: #fff;
    font-size: 17pt;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .header-info { flex: 1; }
  .header-title {
    font-size: 15pt;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.3px;
  }
  .header-tagline {
    font-size: 8pt;
    color: rgba(255,255,255,0.75);
    margin-top: 2px;
  }
  .header-right { text-align: right; }
  .header-student {
    font-size: 13pt;
    font-weight: 700;
    color: #fff;
  }
  .header-date {
    font-size: 7.5pt;
    color: rgba(255,255,255,0.75);
    margin-top: 3px;
  }

  /* ── Body ── */
  .body { padding: 22px 32px 32px; }

  /* ── Summary strip ── */
  .summary-strip {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .summary-tile {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 20px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .summary-value {
    font-size: 20pt;
    font-weight: 800;
    color: ${primary};
    line-height: 1;
  }
  .summary-label {
    font-size: 8pt;
    color: #64748b;
    font-weight: 500;
  }

  /* ── Section heading ── */
  .section-title {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    margin-bottom: 14px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }

  /* ── Lesson block ── */
  .lesson-block { margin-bottom: 0; }
  .lesson-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 16px 0;
  }

  .lesson-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .lesson-date-badge {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1e293b;
    background: rgba(${primaryRgb}, 0.08);
    border-left: 3px solid ${primary};
    padding: 4px 10px;
    border-radius: 0 6px 6px 0;
  }
  .lesson-meta {
    font-size: 8pt;
    color: #64748b;
    font-weight: 500;
  }
  .lesson-staff-note {
    font-size: 8pt;
    color: #64748b;
    font-style: italic;
    margin-bottom: 8px;
    padding-left: 4px;
  }

  /* ── Criteria table ── */
  .criteria-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  .criteria-table thead th {
    text-align: left;
    font-weight: 600;
    color: #94a3b8;
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 8px;
    border-bottom: 1px solid #e2e8f0;
  }
  .th-topic { width: 35%; }
  .th-cat   { width: 22%; }
  .th-note  { width: 28%; }
  .th-rating { width: 15%; text-align: right; }

  .criteria-row td {
    padding: 5px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .criteria-row:last-child td { border-bottom: none; }

  .criteria-name-cell {
    font-weight: 600;
    color: #334155;
  }
  .criteria-cat-cell {
    color: #64748b;
    font-size: 8pt;
  }
  .criteria-note-cell {
    color: #64748b;
    font-style: italic;
    font-size: 8pt;
  }
  .criteria-badge-cell { text-align: right; white-space: nowrap; }
  .criteria-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 7.5pt;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

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

  /* ── Empty state ── */
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
    <div class="summary-strip">
      <div class="summary-tile">
        <div class="summary-value">${lessonEquivalentDisplay}</div>
        <div class="summary-label">Fahrstunden (à 45 Min.)</div>
      </div>
    </div>

    <!-- Lektionen -->
    <div class="section-title">Lektionen chronologisch</div>

    ${emptyState}
    ${lessonBlocks}

    <!-- Footer -->
    <div class="footer">
      <span class="footer-brand">${tenantName}${branding.contactEmail ? ` · ${escapeHtml(branding.contactEmail)}` : ''}${branding.contactPhone ? ` · ${escapeHtml(branding.contactPhone)}` : ''}</span>
      <span>Automatisch generiert · ${escapeHtml(data.generatedAt)}</span>
    </div>

  </div>
</div>
</body>
</html>`
}
