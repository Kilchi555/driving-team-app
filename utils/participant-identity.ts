export type ParticipantIdentitySource = {
  birthdate?: string | null
  license_number?: string | null
  sari_faberid?: string | null
} | null | undefined

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim()
  return trimmed || null
}

/** Display equality only: ignore spaces/dots so the same number is not shown twice. */
function sameDisplayNumber(a: string, b: string): boolean {
  return a.replace(/[\s.]/g, '') === b.replace(/[\s.]/g, '')
}

/** Geburtsdatum from the course registration only. */
export function participantBirthdate(participant: ParticipantIdentitySource): string | null {
  return trimOrNull(participant?.birthdate)
}

/**
 * LFA display label from the registration only:
 * `license_number` → `sari_faberid` → empty.
 * If both exist and differ, both are shown (they are not the same field).
 */
export function participantDisplayLicenseLabel(participant: ParticipantIdentitySource): string | null {
  const licenseNumber = trimOrNull(participant?.license_number)
  const sariFaberid = trimOrNull(participant?.sari_faberid)

  if (licenseNumber && sariFaberid && !sameDisplayNumber(licenseNumber, sariFaberid)) {
    return `LFA ${licenseNumber} · SARI ${sariFaberid}`
  }
  if (licenseNumber) return `LFA ${licenseNumber}`
  if (sariFaberid) return `LFA ${sariFaberid}`
  return null
}

/** Formats YYYY-MM-DD without timezone shift. */
export function formatParticipantBirthdate(value: string | null | undefined): string {
  if (!value) return '—'
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}.${match[2]}.${match[1]}`
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('de-CH')
}

export function participantIdentityLine(participant: ParticipantIdentitySource): string | null {
  const birthdate = participantBirthdate(participant)
  const license = participantDisplayLicenseLabel(participant)
  const parts = [
    birthdate ? formatParticipantBirthdate(birthdate) : null,
    license,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
