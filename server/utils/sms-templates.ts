import { countSmsSegments } from '~/server/utils/sms-quota'

export type SmsMessageLength = 'short' | 'long'

export interface AppointmentSmsTemplateData {
  firstName: string
  /** e.g. "Di 15.3." */
  dateLabel: string
  /** e.g. "14:00" */
  timeLabel: string
  /** Short place label, e.g. "Bern Bahnhof" or pickup address */
  locationLabel?: string | null
  /** Optional deep link / app URL for long variant */
  appLink?: string | null
}

function cleanName(name: string): string {
  return (name || '').trim() || 'du'
}

function cleanLocation(location?: string | null): string {
  return (location || '').replace(/\s+/g, ' ').trim()
}

/** Keep short templates within 1 GSM-7 segment when possible. */
function fitShort(message: string, maxChars = 160): string {
  if (message.length <= maxChars) return message
  return message.slice(0, maxChars - 1).trimEnd() + '…'
}

/** Confirmation SMS — no tenant name (alphanumeric sender already has it). */
export function buildAppointmentConfirmationSms(
  data: AppointmentSmsTemplateData,
  length: SmsMessageLength = 'short',
): string {
  const name = cleanName(data.firstName)
  const when = `${data.dateLabel} ${data.timeLabel}`.trim()
  const loc = cleanLocation(data.locationLabel)

  if (length === 'long') {
    const link = data.appLink?.trim()
    const lines = [
      `Hallo ${name},`,
      `Termin ${when} bestätigt.`,
      loc ? `Ort: ${loc}` : null,
      link || null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  // Short: greeting / when / optional location — target 1 segment
  const lines = [
    `Hallo ${name},`,
    `Termin ${when} bestätigt.`,
    loc ? `Ort: ${loc}` : null,
  ].filter(Boolean) as string[]
  return fitShort(lines.join('\n'))
}

/** Day-before reminder SMS */
export function buildAppointmentReminderSms(
  data: AppointmentSmsTemplateData,
  length: SmsMessageLength = 'short',
): string {
  const name = cleanName(data.firstName)
  const when = `${data.dateLabel} ${data.timeLabel}`.trim()
  const loc = cleanLocation(data.locationLabel)

  if (length === 'long') {
    const link = data.appLink?.trim()
    const lines = [
      `Hallo ${name},`,
      `Erinnerung: Termin morgen ${when}.`,
      loc ? `Ort: ${loc}` : null,
      link || null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  const lines = [
    `Hallo ${name},`,
    `Erinnerung: morgen ${when}.`,
    loc ? `Ort: ${loc}` : null,
  ].filter(Boolean) as string[]
  return fitShort(lines.join('\n'))
}

export function previewAppointmentSms(
  length: SmsMessageLength,
  kind: 'confirmation' | 'reminder' | 'cancelled' | 'rescheduled' = 'confirmation',
): { message: string; segments: number } {
  const sample: AppointmentSmsTemplateData = {
    firstName: 'Max',
    dateLabel: 'Di 15.3.',
    timeLabel: '14:00',
    locationLabel: 'Bahnhofplatz 1, Bern',
    appLink: 'https://app.simy.ch/onboarding/beispiel-token',
  }
  let message: string
  if (kind === 'reminder') message = buildAppointmentReminderSms(sample, length)
  else if (kind === 'cancelled') message = buildAppointmentCancelledSms(sample, length)
  else if (kind === 'rescheduled') message = buildAppointmentRescheduledSms(sample, length)
  else message = buildAppointmentConfirmationSms(sample, length)
  return { message, segments: countSmsSegments(message) }
}

/** Cancellation SMS */
export function buildAppointmentCancelledSms(
  data: AppointmentSmsTemplateData & { reason?: string | null },
  length: SmsMessageLength = 'short',
): string {
  const name = cleanName(data.firstName)
  const when = `${data.dateLabel} ${data.timeLabel}`.trim()
  const reason = (data.reason || '').replace(/\s+/g, ' ').trim()

  if (length === 'long') {
    const link = data.appLink?.trim()
    const lines = [
      `Hallo ${name},`,
      `Termin ${when} abgesagt.`,
      reason ? `Grund: ${reason}` : null,
      link || null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  const lines = [
    `Hallo ${name},`,
    `Termin ${when} abgesagt.`,
    reason ? `Grund: ${reason}` : null,
  ].filter(Boolean) as string[]
  return fitShort(lines.join('\n'))
}

/** Reschedule SMS — timeLabel should be the new time */
export function buildAppointmentRescheduledSms(
  data: AppointmentSmsTemplateData,
  length: SmsMessageLength = 'short',
): string {
  const name = cleanName(data.firstName)
  const when = `${data.dateLabel} ${data.timeLabel}`.trim()
  const loc = cleanLocation(data.locationLabel)

  if (length === 'long') {
    const link = data.appLink?.trim()
    const lines = [
      `Hallo ${name},`,
      `Termin verschoben auf ${when}.`,
      loc ? `Ort: ${loc}` : null,
      link || null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  const lines = [
    `Hallo ${name},`,
    `Termin neu: ${when}.`,
    loc ? `Ort: ${loc}` : null,
  ].filter(Boolean) as string[]
  return fitShort(lines.join('\n'))
}

/** Course session reminder SMS (participant) */
export function buildCourseReminderSms(opts: {
  firstName: string
  courseName: string
  dateLabel: string
  timeLabel?: string | null
  locationLabel?: string | null
  appLink?: string | null
  length?: SmsMessageLength
}): string {
  const name = cleanName(opts.firstName)
  const length = opts.length || 'short'
  const course = (opts.courseName || 'Kurs').replace(/\s+/g, ' ').trim()
  const when = [opts.dateLabel, opts.timeLabel].filter(Boolean).join(' ').trim()
  const loc = cleanLocation(opts.locationLabel)

  if (length === 'long') {
    const link = opts.appLink?.trim()
    const lines = [
      `Hallo ${name},`,
      `Erinnerung: ${course} morgen ${when}.`.trim(),
      loc ? `Ort: ${loc}` : null,
      link || null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  return fitShort(
    [`Hallo ${name},`, `Kurs morgen: ${course}${when ? ` ${when}` : ''}.`, loc ? `Ort: ${loc}` : null]
      .filter(Boolean)
      .join('\n'),
  )
}

/** Payment reminder SMS (open balance after appointment) */
export function buildPaymentReminderSms(opts: {
  firstName: string
  amountChf: string
  count?: number
  appLink?: string | null
  length?: SmsMessageLength
}): string {
  const name = cleanName(opts.firstName)
  const length = opts.length || 'short'
  const count = opts.count && opts.count > 1 ? opts.count : 1
  const amount = (opts.amountChf || '').trim() || '0.00'

  if (length === 'long') {
    const link = opts.appLink?.trim()
    const lines = [
      `Hallo ${name},`,
      count > 1
        ? `${count} offene Zahlungen: CHF ${amount}.`
        : `Offene Zahlung: CHF ${amount}.`,
      link || null,
    ].filter(Boolean)
    return lines.join('\n')
  }

  return fitShort(`Hallo ${name}, offene Zahlung CHF ${amount}.`)
}

