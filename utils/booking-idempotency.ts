const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getOrCreateBookingIdempotencyKey(slotId: string): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('UUID v4 is required for booking idempotency')
  }
  if (typeof sessionStorage === 'undefined') {
    return crypto.randomUUID()
  }
  const storageKey = `simy.booking.idempotency.${slotId}`
  try {
    const existing = sessionStorage.getItem(storageKey)
    if (existing && UUID_V4_RE.test(existing)) return existing
    const key = crypto.randomUUID()
    sessionStorage.setItem(storageKey, key)
    return key
  } catch {
    return crypto.randomUUID()
  }
}
