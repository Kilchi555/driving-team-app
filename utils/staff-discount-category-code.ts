/**
 * License-category code for staff voucher validation.
 *
 * EventModal stores the driving category on formData.type (CategorySelector
 * v-model, e.g. "B Automatik"). appointment_type is the event type
 * (lesson / exam / theory) and must never be sent as categoryCode.
 */
const NON_LICENSE_CATEGORY_CODES = new Set([
  'lesson',
  'practical',
  'theory',
  'exam',
  'consultation',
  'meeting',
  'training',
  'vacation',
  'other',
  'admin',
  'nothelfer',
  'team_invite',
])

export function staffDiscountCategoryCode(
  type: string | null | undefined,
  appointmentType?: string | null,
): string | null {
  const code = String(type || '').trim()
  if (!code) return null
  if (NON_LICENSE_CATEGORY_CODES.has(code.toLowerCase())) return null
  const appt = String(appointmentType || '').trim()
  if (appt && code.toLowerCase() === appt.toLowerCase()) return null
  return code
}
