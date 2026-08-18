/**
 * POST /api/student-credits/process-withdrawal-wallee
 *
 * Disabled: Guthaben-Auszahlungen dürfen nicht via Wallee gegen eine
 * Lektionszahlung gebucht werden. Admins markieren IBAN-Überweisungen
 * über /api/admin/complete-withdrawal.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Guthaben-Auszahlungen über Wallee sind deaktiviert. Bitte als Banküberweisung markieren.',
  })
})
