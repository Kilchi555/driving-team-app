export const MANUAL_TOPUP_MAX_RAPPEN = 1_000_000
export const MANUAL_TOPUP_NOTE_MIN = 3
export const MANUAL_TOPUP_NOTE_MAX = 500

export type ManualTopupParse =
  | { ok: true; amountRappen: number; note: string }
  | { ok: false; error: string }

export function parseManualCreditTopup(input: {
  amountRappen: unknown
  note: unknown
}): ManualTopupParse {
  const amount = input.amountRappen
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    return { ok: false, error: 'Betrag muss ein ganzer Rappenbetrag sein.' }
  }
  if (amount <= 0) {
    return { ok: false, error: 'Betrag muss grösser als 0 sein.' }
  }
  if (amount > MANUAL_TOPUP_MAX_RAPPEN) {
    return { ok: false, error: 'Betrag darf höchstens CHF 10000.00 sein.' }
  }

  if (typeof input.note !== 'string') {
    return { ok: false, error: 'Vermerk ist erforderlich.' }
  }
  const note = input.note.trim()
  if (note.length < MANUAL_TOPUP_NOTE_MIN) {
    return { ok: false, error: `Vermerk muss mindestens ${MANUAL_TOPUP_NOTE_MIN} Zeichen haben.` }
  }
  if (note.length > MANUAL_TOPUP_NOTE_MAX) {
    return { ok: false, error: `Vermerk darf höchstens ${MANUAL_TOPUP_NOTE_MAX} Zeichen haben.` }
  }

  return { ok: true, amountRappen: amount, note }
}
