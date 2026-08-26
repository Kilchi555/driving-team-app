import { escapeAttr, escapeHtml } from '~/server/utils/branded-email'

export type MeetingType = 'in_person' | 'phone' | 'online'

export type MeetingLocationInput = {
  name?: string | null
  address?: string | null
  meeting_url?: string | null
} | null | undefined

export type MeetingInviteInput = {
  meeting_type?: string | null
  meeting_link?: string | null
} | null | undefined

const MAX_MEETING_URL_LENGTH = 2048

/** Accept https URLs only. Empty / junk becomes undefined. */
export function sanitizeMeetingUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_MEETING_URL_LENGTH) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return undefined
    if (parsed.username || parsed.password) return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

export function normalizeMeetingType(raw: unknown): MeetingType | undefined {
  if (raw === 'in_person' || raw === 'phone' || raw === 'online') return raw
  return undefined
}

export function meetingLinkAnchor(url: string, color: string): string {
  const safe = sanitizeMeetingUrl(url)
  if (!safe) return ''
  return `<a href="${escapeAttr(safe)}" style="color:${escapeAttr(color)}">${escapeHtml(safe)}</a>`
}

/**
 * Invite meeting_type wins when explicit (phone / in_person / online).
 * A stored location.meeting_url is the static fallback and implies online.
 * Do not infer online/phone from the location name — that mislabels "Telefon"
 * locations and can hide real addresses in confirmation mail.
 */
export function resolveAppointmentMeeting(input: {
  location?: MeetingLocationInput
  invite?: MeetingInviteInput
}): { meetingType?: MeetingType; meetingLink?: string } {
  const inviteType = normalizeMeetingType(input.invite?.meeting_type)
  const inviteLink = sanitizeMeetingUrl(input.invite?.meeting_link)
  const locationLink = sanitizeMeetingUrl(input.location?.meeting_url)

  if (inviteType === 'phone') {
    return { meetingType: 'phone' }
  }
  if (inviteType === 'in_person') {
    return { meetingType: 'in_person' }
  }
  if (inviteLink) {
    return { meetingType: 'online', meetingLink: inviteLink }
  }
  if (locationLink) {
    return { meetingType: 'online', meetingLink: locationLink }
  }
  if (inviteType === 'online') {
    return { meetingType: 'online' }
  }
  return {}
}
