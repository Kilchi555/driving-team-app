export function isWithinPerUserLimit(
  used: number | null | undefined,
  maxPerUser: number | null | undefined
): boolean {
  if (maxPerUser == null || Number(maxPerUser) <= 0) return true
  return (used ?? 0) < Number(maxPerUser)
}

export function extractDiscountCodeFromReason(reason: string | null | undefined): string | null {
  if (!reason) return null
  const match = String(reason).trim().match(/(?:^|\s)Code:\s*([A-Za-z0-9_-]+)/i)
  return match?.[1]?.toUpperCase() || null
}

export function discountSaleReasonMatchesCode(
  reason: string | null | undefined,
  code: string
): boolean {
  if (!reason || !code) return false
  const extracted = extractDiscountCodeFromReason(reason)
  const normalizedCode = code.trim().toUpperCase()
  if (extracted) return extracted === normalizedCode
  return reason.trim().toUpperCase() === normalizedCode
}

export function perUserLimitMessage(maxPerUser: number): string {
  if (maxPerUser <= 1) return 'Dieser Code kann nur einmal pro Kunde eingelöst werden'
  return `Dieser Code kann nur ${maxPerUser}× pro Kunde eingelöst werden`
}

export function perUserLimitHint(maxPerUser: number | null | undefined): string | null {
  if (maxPerUser == null || Number(maxPerUser) <= 0) return null
  if (Number(maxPerUser) === 1) return '1× pro Kunde'
  return `${Number(maxPerUser)}× pro Kunde`
}

const IGNORED_SALE_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'voided'])

export function countMatchingDiscountUsages(
  rows: Array<{
    discount_reason?: string | null
    appointment_id?: string | null
    status?: string | null
    discount_amount_rappen?: number | null
  }>,
  code: string,
  excludeAppointmentId?: string | null
): number {
  return rows.filter((row) => {
    if ((row.discount_amount_rappen ?? 0) <= 0) return false
    if (row.status && IGNORED_SALE_STATUSES.has(String(row.status).toLowerCase())) return false
    if (excludeAppointmentId && row.appointment_id === excludeAppointmentId) return false
    return discountSaleReasonMatchesCode(row.discount_reason, code)
  }).length
}
