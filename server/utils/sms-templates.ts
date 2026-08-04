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
  kind: 'confirmation' | 'reminder' = 'confirmation',
): { message: string; segments: number } {
  const sample: AppointmentSmsTemplateData = {
    firstName: 'Max',
    dateLabel: 'Di 15.3.',
    timeLabel: '14:00',
    locationLabel: 'Bahnhofplatz 1, Bern',
    appLink: 'https://app.simy.ch/onboarding/beispiel-token',
  }
  const message = kind === 'reminder'
    ? buildAppointmentReminderSms(sample, length)
    : buildAppointmentConfirmationSms(sample, length)
  return { message, segments: countSmsSegments(message) }
}
