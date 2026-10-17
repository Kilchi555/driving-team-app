/**
 * Normalize errors from POST /api/appointments/save for staff UI.
 * ofetch/h3 often puts the German text on statusMessage while data only has { code }.
 */
export function appointmentSaveErrorMessage(err: unknown): string {
  const e = (err && typeof err === 'object') ? err as Record<string, any> : {}
  const data = (e.data && typeof e.data === 'object') ? e.data as Record<string, any> : {}
  const code = data.code || data?.data?.code || e.code

  if (code === 'NO_PRICE_RULE') {
    return (
      data.message ||
      data.statusMessage ||
      e.statusMessage ||
      'Der Preis für diese Buchung konnte nicht ermittelt werden. Bitte prüfe, ob für diese Kategorie ein gültiger Theoriepreis hinterlegt ist.'
    )
  }

  return (
    data.message ||
    data.statusMessage ||
    e.statusMessage ||
    (typeof e.message === 'string' ? e.message : '') ||
    'Fehler beim Speichern des Termins'
  )
}
