/**
 * Session order rules for SARI-linked courses.
 *
 * Enforcement policy (caller decides soft vs hard):
 * - tenants.sari_enabled (SARI Sync aktiv) → hard block, no override
 * - SARI Sync off → soft warning with optional acknowledge
 *
 * Product / domain knowledge:
 * - PGS (Motorrad-Grundkurs): Teile müssen chronologisch in Reihenfolge absolviert werden.
 * - VKU: Teil 1 muss zuerst kommen; Reihenfolge der weiteren Teile ist egal.
 * - Default for other SARI categories: strict chronological (safe).
 */

export type SessionOrderMode = 'strict_chronological' | 'teil1_first' | 'none'

export interface SessionDatePosition {
  position: number
  date: string // YYYY-MM-DD
}

export interface SessionOrderResult {
  ok: boolean
  mode: SessionOrderMode
  warnings: string[]
}

export function getSessionOrderMode(category: string | null | undefined): SessionOrderMode {
  const c = String(category || '').toUpperCase()
  if (c === 'VKU') return 'teil1_first'
  if (c === 'PGS' || c.includes('MOTORRAD') || c.includes('PGS')) return 'strict_chronological'
  if (c) return 'strict_chronological'
  return 'none'
}

function toDateKey(value: string): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  try {
    return new Date(value).toISOString().slice(0, 10)
  } catch {
    return value
  }
}

export function evaluateSessionOrder(
  category: string | null | undefined,
  positions: SessionDatePosition[]
): SessionOrderResult {
  const mode = getSessionOrderMode(category)
  const warnings: string[] = []

  const sorted = [...positions]
    .filter((p) => p.position > 0 && p.date)
    .map((p) => ({ position: p.position, date: toDateKey(p.date) }))
    .sort((a, b) => a.position - b.position)

  if (sorted.length < 2 || mode === 'none') {
    return { ok: true, mode, warnings }
  }

  if (mode === 'strict_chronological') {
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      if (curr.date <= prev.date) {
        warnings.push(
          `Motorrad/PGS: Teil ${curr.position} (${curr.date}) muss nach Teil ${prev.position} (${prev.date}) liegen — Reihenfolge einhalten.`
        )
      }
    }
  } else if (mode === 'teil1_first') {
    const teil1 = sorted.find((p) => p.position === 1)
    if (teil1) {
      const others = sorted.filter((p) => p.position !== 1)
      for (const other of others) {
        if (other.date < teil1.date) {
          warnings.push(
            `VKU: Teil 1 (${teil1.date}) sollte vor Teil ${other.position} (${other.date}) absolviert werden. Die Reihenfolge der weiteren Teile ist egal.`
          )
        }
      }
      for (const other of others) {
        if (other.date === teil1.date) {
          warnings.push(
            `VKU: Teil 1 und Teil ${other.position} liegen am selben Tag (${teil1.date}). Teil 1 sollte zuerst kommen.`
          )
        }
      }
    }
  }

  const unique = [...new Set(warnings)]
  return { ok: unique.length === 0, mode, warnings: unique }
}

export function buildEffectiveSessionDates(
  courseSessions: Array<{ start_time: string; session_number?: number | null }>,
  customSessions: Record<string, any> | null | undefined
): SessionDatePosition[] {
  const sorted = [...(courseSessions || [])].sort((a, b) =>
    String(a.start_time).localeCompare(String(b.start_time))
  )

  const byDate = new Map<string, typeof sorted>()
  for (const s of sorted) {
    const d = toDateKey(s.start_time)
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(s)
  }

  const result: SessionDatePosition[] = []
  let position = 0
  for (const [date] of byDate) {
    position++
    const custom = customSessions?.[String(position)]
    const effectiveDate = custom?.date ? toDateKey(custom.date) : date
    result.push({ position, date: effectiveDate })
  }

  if (customSessions && typeof customSessions === 'object') {
    for (const [key, custom] of Object.entries(customSessions)) {
      const pos = parseInt(key, 10)
      if (!Number.isFinite(pos) || result.some((r) => r.position === pos)) continue
      if (custom?.date) result.push({ position: pos, date: toDateKey(custom.date) })
    }
  }

  return result.sort((a, b) => a.position - b.position)
}
