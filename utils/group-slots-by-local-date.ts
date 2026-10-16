import { slotLocalDateKey } from '~/utils/slot-display-time'

/**
 * Group bookable slots by the calendar day the customer sees.
 * The key is slotLocalDateKey, which uses the tenant IANA zone
 * (missing or invalid → Europe/Zurich). start_time is not rewritten.
 */
export function groupSlotsByTenantLocalDate<T extends { start_time: string }>(
  slots: readonly T[],
  timeZone?: string | null,
): Array<{ dayKey: string; slots: T[] }> {
  const days = new Map<string, T[]>()
  for (const slot of slots) {
    const dayKey = slotLocalDateKey(slot.start_time, timeZone)
    const group = days.get(dayKey)
    if (group) group.push(slot)
    else days.set(dayKey, [slot])
  }
  return Array.from(days.entries())
    .map(([dayKey, group]) => ({
      dayKey,
      slots: [...group].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      ),
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}
