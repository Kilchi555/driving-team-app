import { formatCourseSessionLine } from '~/utils/format-course-sessions'
import {
  assignSessionDayPositions,
  partialEnrollmentBadgeLabel,
  registrationAttendsTeil,
  type RegistrationAttendance,
} from '~/utils/course-session-attendance'

export type ParticipantListPerson = RegistrationAttendance & {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  partial_label?: string | null
}

export type ParticipantListSession = {
  session_number?: number | null
  teil?: number | null
  start_time?: string | null
  end_time?: string | null
  instructor_type?: string | null
  external_instructor_name?: string | null
  staff_id?: string | null
  staff?: { first_name?: string | null; last_name?: string | null } | null
}

export type ParticipantListCourse = {
  name: string
  course_sessions?: ParticipantListSession[] | null
  sessions?: ParticipantListSession[] | null
}

export type ParticipantListBrand = {
  color?: string | null
  tenant?: string | null
  logoUrl?: string | null
}

export type StaffLookup = {
  id: string
  first_name?: string | null
  last_name?: string | null
}

function escapeHtml(s: unknown) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Opens a print-ready participant list (same layout as admin courses).
 * Returns false if the browser blocked the popup or there is nothing to print.
 */
export function printParticipantList(options: {
  course: ParticipantListCourse
  participants: ParticipantListPerson[]
  brand?: ParticipantListBrand
  availableStaff?: StaffLookup[]
}): boolean {
  const { course, participants, brand, availableStaff = [] } = options
  if (!course?.name || !participants?.length) return false

  const color = brand?.color || '#1E40AF'
  const tenant = brand?.tenant || 'Unternehmen'
  const logoUrl = brand?.logoUrl || ''

  const sessionsWithTeil = assignSessionDayPositions(
    [...(course.course_sessions || course.sessions || [])]
      .filter((s): s is ParticipantListSession & { start_time: string } => !!s?.start_time),
  )

  const sessionHeaders = sessionsWithTeil.map((s, i) => {
    const teil = s.teil ?? i + 1
    const line = formatCourseSessionLine(
      { session_number: teil, start_time: s.start_time, end_time: s.end_time },
      i,
    )
    const short = line.replace(/^Teil\s+(\d+)\s*·\s*/i, 'T$1<br>')

    let instructorName = ''
    if (s.instructor_type === 'external' && s.external_instructor_name) {
      instructorName = String(s.external_instructor_name).trim()
    } else if (s.staff?.first_name || s.staff?.last_name) {
      instructorName = `${s.staff.first_name || ''} ${s.staff.last_name || ''}`.trim()
    } else if (s.staff_id) {
      const staffMember = availableStaff.find((st) => st.id === s.staff_id)
      if (staffMember) {
        instructorName = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim()
      }
    }

    return {
      n: teil,
      teil,
      sessionNumber: s.session_number ?? null,
      short,
      line,
      instructorName: instructorName || 'Kursleiter',
    }
  })

  const stand = new Date().toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const sessionColWidth = sessionHeaders.length > 0
    ? Math.max(88, Math.min(130, Math.floor(360 / sessionHeaders.length)))
    : 110

  const theadSessions = sessionHeaders.length > 0
    ? sessionHeaders.map((h) =>
        `<th class="sig" style="width:${sessionColWidth}px" title="${escapeHtml(h.line)}">${h.short}</th>`,
      ).join('')
    : '<th class="sig" style="width:120px">Unterschrift</th>'

  const rows = participants.map((p, i) => {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—'
    const phone = p.phone || '—'
    const email = p.email || ''
    const partialLabel = p.partial_label || partialEnrollmentBadgeLabel(p)
    const sigCells = sessionHeaders.length > 0
      ? sessionHeaders.map((h) => {
          const attends = registrationAttendsTeil(p, h.teil, h.sessionNumber)
          if (!attends) {
            return `<td class="sig sig-absent" title="Kommt nicht zu diesem Teil"><span class="absent-mark">kommt nicht</span></td>`
          }
          return `<td class="sig"><div class="sig-line"></div></td>`
        }).join('')
      : `<td class="sig"><div class="sig-line"></div></td>`
    return `<tr>
      <td class="num">${i + 1}</td>
      <td class="name">
        <div class="name-main">${escapeHtml(name)}</div>
        ${email ? `<div class="name-sub">${escapeHtml(email)}</div>` : ''}
        ${partialLabel ? `<div class="name-partial">${escapeHtml(partialLabel)}</div>` : ''}
      </td>
      <td class="phone">${escapeHtml(phone)}</td>
      ${sigCells}
    </tr>`
  }).join('')

  const sessionLegend = sessionHeaders.length > 1
    ? `<div class="sessions">
        ${sessionHeaders.map((h) => `<span class="chip">📅 ${escapeHtml(h.line)}</span>`).join('')}
      </div>`
    : sessionHeaders.length === 1
      ? `<div class="sessions"><span class="chip">📅 ${escapeHtml(sessionHeaders[0].line)}</span></div>`
      : ''

  const instructorRows = (sessionHeaders.length > 0
    ? sessionHeaders
    : [{ n: 1, line: 'Kurs', short: 'Kurs', instructorName: 'Kursleiter' }]
  ).map((h) => `
    <tr>
      <td class="teil">${escapeHtml(h.line)}</td>
      <td class="leiter">${escapeHtml(h.instructorName)}</td>
      <td class="leiter-sig"><div class="sig-line"></div></td>
    </tr>
  `).join('')

  const instructorBlock = `
    <div class="instructor-block">
      <p class="instructor-title">Kursleiter — Unterschrift pro Kursteil</p>
      <table class="instructor-table">
        <thead>
          <tr>
            <th>Kursteil</th>
            <th>Kursleiter</th>
            <th>Unterschrift</th>
          </tr>
        </thead>
        <tbody>${instructorRows}</tbody>
      </table>
    </div>`

  const logoHtml = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(tenant)}" />`
    : `<div class="logo-fallback" style="background:${escapeHtml(color)}">${escapeHtml(tenant.charAt(0).toUpperCase())}</div>`

  const win = window.open('', '_blank')
  if (!win) return false

  win.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Teilnehmerliste: ${escapeHtml(course.name)}</title>
  <style>
    :root { --brand: ${escapeHtml(color)}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      background: #e5e7eb;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 12mm 12mm;
      background: #fff;
      box-shadow: 0 1px 8px rgba(0,0,0,.08);
    }
    @media screen {
      body { padding: 16px 0 32px; }
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 3px solid var(--brand);
      margin-bottom: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .logo { height: 42px; max-width: 180px; object-fit: contain; }
    .logo-fallback {
      width: 42px; height: 42px; border-radius: 10px; color: #fff;
      font-weight: 700; font-size: 18px; display: flex; align-items: center; justify-content: center;
    }
    .brand-text { min-width: 0; }
    .brand-name { font-size: 13px; font-weight: 700; color: #111827; line-height: 1.2; }
    .brand-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .doc-meta { text-align: right; color: #6b7280; font-size: 11px; line-height: 1.45; }
    .title {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #111827;
    }
    .subtitle { margin: 0 0 12px; color: #4b5563; font-size: 12px; }
    .sessions {
      display: flex; flex-wrap: wrap; gap: 6px;
      margin: 0 0 16px;
    }
    .chip {
      display: inline-block;
      background: color-mix(in srgb, var(--brand) 10%, #fff);
      border: 1px solid color-mix(in srgb, var(--brand) 28%, #e5e7eb);
      color: #1f2937;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    thead { display: table-header-group; }
    tbody { display: table-row-group; }
    tbody tr { page-break-inside: avoid; break-inside: avoid; }
    thead th {
      background: color-mix(in srgb, var(--brand) 12%, #fff);
      color: #374151;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 9px 8px;
      border-bottom: 2px solid var(--brand);
      text-align: left;
      vertical-align: bottom;
    }
    th.sig, td.sig { text-align: center; }
    th.sig { font-size: 9px; line-height: 1.25; text-transform: none; letter-spacing: 0; font-weight: 700; color: #111827; }
    tbody td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #f9fafb; }
    td.num { width: 28px; color: #9ca3af; text-align: center; font-weight: 600; }
    td.name { width: auto; }
    .name-main { font-weight: 650; font-size: 12.5px; color: #111827; }
    .name-sub { font-size: 10px; color: #6b7280; margin-top: 2px; word-break: break-all; }
    .name-partial {
      display: inline-block;
      margin-top: 3px;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fcd34d;
    }
    td.phone { width: 110px; color: #374151; white-space: nowrap; }
    .sig-line {
      height: 28px;
      border-bottom: 1.5px solid #9ca3af;
      margin: 0 4px;
    }
    td.sig-absent {
      background: #f3f4f6 !important;
      vertical-align: middle;
    }
    .absent-mark {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: #9ca3af;
      text-transform: uppercase;
      line-height: 1.2;
      padding: 6px 2px;
    }
    .instructor-block {
      margin-top: 18px;
      padding: 14px 16px;
      border: 1.5px solid color-mix(in srgb, var(--brand) 35%, #e5e7eb);
      border-radius: 10px;
      background: color-mix(in srgb, var(--brand) 5%, #fff);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .instructor-title {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--brand);
    }
    .instructor-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .instructor-table th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #6b7280;
      text-align: left;
      padding: 0 8px 6px;
      font-weight: 700;
      border: none;
      background: transparent;
    }
    .instructor-table td {
      padding: 8px;
      border: none;
      border-top: 1px solid color-mix(in srgb, var(--brand) 18%, #e5e7eb);
      vertical-align: middle;
      background: transparent !important;
    }
    .instructor-table .teil {
      width: 38%;
      font-size: 11px;
      color: #374151;
      font-weight: 600;
    }
    .instructor-table .leiter {
      width: 32%;
      font-size: 12px;
      font-weight: 700;
      color: #111827;
    }
    .instructor-table .leiter-sig {
      width: 30%;
    }
    .instructor-table .sig-line {
      height: 26px;
      margin: 0;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      color: #9ca3af;
      font-size: 10px;
    }
    @page { size: A4 portrait; margin: 12mm; }
    @media print {
      html, body {
        width: auto;
        height: auto;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      thead { display: table-header-group; }
      tbody tr { page-break-inside: avoid; break-inside: avoid; }
      tbody tr:nth-child(even) td { background: #f3f4f6 !important; }
      thead th { background: color-mix(in srgb, var(--brand) 14%, #fff) !important; }
      .instructor-block { background: color-mix(in srgb, var(--brand) 5%, #fff) !important; }
      td.sig-absent { background: #e5e7eb !important; }
      .name-partial { background: #fef3c7 !important; border-color: #fcd34d !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        ${logoHtml}
        <div class="brand-text">
          <div class="brand-name">${escapeHtml(tenant)}</div>
          <div class="brand-label">Teilnehmerliste</div>
        </div>
      </div>
      <div class="doc-meta">
        Stand: ${escapeHtml(stand)}<br>
        ${participants.length} Teilnehmer
      </div>
    </div>

    <h1 class="title">${escapeHtml(course.name)}</h1>
    <p class="subtitle">Teilnehmer und Kursleiter unterschreiben bei jedem Kursteil.</p>
    ${sessionLegend}

    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th>Name</th>
          <th style="width:110px">Telefon</th>
          ${theadSessions}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    ${instructorBlock}

    <div class="footer">
      <span>${escapeHtml(tenant)}</span>
      <span>Gedruckt am ${escapeHtml(stand)}</span>
    </div>
  </div>
</body>
</html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
  return true
}
