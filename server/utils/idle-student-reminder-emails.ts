import {
  buildBrandedEmailShell,
  emailCtaButton,
  emailDetailBox,
  emailDetailRow,
  emailSignature,
  escapeHtml
} from '~/server/utils/branded-email'
import type { StudentAppointmentActivity } from '~/utils/student-appointment-activity'

export interface IdleStudentRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  assigned_staff_id?: string | null
  assigned_staff_ids?: string[] | null
}

export function studentDisplayName(student: IdleStudentRow): string {
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || 'ohne Namen'
}

export function formatLastLessonLabel(
  activity: StudentAppointmentActivity | undefined,
  now: Date = new Date()
): string {
  if (!activity?.lastStartTime) return 'Noch kein Termin'
  const last = new Date(activity.lastStartTime)
  const days = Math.max(0, Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000)))
  const date = last.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' })
  if (days <= 0) return date
  if (days === 1) return `${date} (vor 1 Tag)`
  return `${date} (vor ${days} Tagen)`
}

function logoUrl(tenant: { logo_wide_url?: string | null, logo_url?: string | null, logo_square_url?: string | null }) {
  return tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
}

export function buildIdleStudentClientSms(opts: {
  firstName: string | null
  bookingUrl: string
}): string {
  const name = (opts.firstName || '').trim() || 'du'
  return `Hallo ${name}, schon länger kein Termin mehr gehabt. Jetzt buchen: ${opts.bookingUrl}`
}

export function buildIdleStudentClientEmail(opts: {
  student: IdleStudentRow
  activity: StudentAppointmentActivity | undefined
  tenantName: string
  primaryColor: string
  logoUrls: { logo_wide_url?: string | null, logo_url?: string | null, logo_square_url?: string | null }
  bookingUrl: string
  accountUrl: string
  contactEmail?: string | null
  idleDays: number
  clientsPlural: string
}): { subject: string, html: string } {
  const firstName = opts.student.first_name || 'du'
  const lastLabel = formatLastLessonLabel(opts.activity)
  const subject = `Zeit für deinen nächsten Termin bei ${opts.tenantName}?`

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">Hallo ${escapeHtml(firstName)},</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">
      du hast schon länger keinen Termin mehr gehabt. Deine Ausbildung ist noch offen — wir würden uns freuen, den nächsten Termin mit dir zu planen.
    </p>
    ${emailDetailBox(opts.primaryColor, [
      emailDetailRow('Letzter Termin', escapeHtml(lastLabel)),
      emailDetailRow('Pause', `seit mindestens ${opts.idleDays} Tagen`)
    ].join(''))}
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 8px">
      Du kannst direkt online buchen oder dich in dein Konto einloggen:
    </p>
    ${emailCtaButton(opts.bookingUrl, 'Termin buchen', opts.primaryColor)}
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;text-align:center">
      <a href="${escapeHtml(opts.accountUrl)}" style="color:${opts.primaryColor};text-decoration:none">Zum Konto</a>
    </p>
    ${emailSignature(opts.tenantName, opts.contactEmail, opts.primaryColor)}
  `

  return {
    subject,
    html: buildBrandedEmailShell({
      title: 'Nächster Termin?',
      tenantName: opts.tenantName,
      primaryColor: opts.primaryColor,
      logoUrl: logoUrl(opts.logoUrls),
      bodyHtml,
      documentTitle: subject
    })
  }
}

function digestRowsHtml(
  students: IdleStudentRow[],
  activityById: Record<string, StudentAppointmentActivity>,
  staffNameById: Record<string, string>,
  now: Date,
  showStaff: boolean
): string {
  const rows = students.map((student) => {
    const name = escapeHtml(studentDisplayName(student))
    const last = escapeHtml(formatLastLessonLabel(activityById[student.id], now))
    const phone = student.phone ? escapeHtml(student.phone) : '–'
    const staff = showStaff
      ? escapeHtml(
          [student.assigned_staff_id, ...(student.assigned_staff_ids || [])]
            .filter(Boolean)
            .map((id) => staffNameById[id as string])
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(', ') || '–'
        )
      : ''
    return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px">${name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${last}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${phone}</td>
      ${showStaff ? `<td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${staff}</td>` : ''}
    </tr>`
  }).join('')

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Name</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Letzter Termin</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Telefon</th>
        ${showStaff ? '<th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase">Staff</th>' : ''}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
}

export function buildIdleStudentDigestEmail(opts: {
  recipientFirstName: string
  students: IdleStudentRow[]
  activityById: Record<string, StudentAppointmentActivity>
  staffNameById?: Record<string, string>
  showStaff: boolean
  tenantName: string
  primaryColor: string
  logoUrls: { logo_wide_url?: string | null, logo_url?: string | null, logo_square_url?: string | null }
  listUrl: string
  idleDays: number
  clientsPlural: string
  now?: Date
}): { subject: string, html: string } {
  const now = opts.now || new Date()
  const count = opts.students.length
  const subject = `${count} ${opts.clientsPlural} ohne Termin seit ${opts.idleDays} Tagen`
  const greeting = opts.recipientFirstName ? `Hallo ${escapeHtml(opts.recipientFirstName)},` : 'Hallo,'

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">${greeting}</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 8px">
      Diese ${escapeHtml(opts.clientsPlural)} haben seit mindestens ${opts.idleDays} Tagen keinen Termin mehr und die Prüfung ist noch nicht bestanden:
    </p>
    ${digestRowsHtml(opts.students, opts.activityById, opts.staffNameById || {}, now, opts.showStaff)}
    ${emailCtaButton(opts.listUrl, 'Liste öffnen', opts.primaryColor)}
    ${emailSignature(opts.tenantName, null, opts.primaryColor)}
  `

  return {
    subject,
    html: buildBrandedEmailShell({
      title: 'Lange ohne Termin',
      tenantName: opts.tenantName,
      primaryColor: opts.primaryColor,
      logoUrl: logoUrl(opts.logoUrls),
      bodyHtml,
      documentTitle: subject
    })
  }
}
