/**
 * Swiss CHF string parsing for paid-price validation.
 *
 * Explicit CHF 0 is valid (free amount). Empty / invalid / negative values
 * must NOT collapse to 0 — that is how paid offers silently became CHF 0.
 */

export type ParsePriceChfError = 'EMPTY' | 'INVALID' | 'NEGATIVE'

export type ParsePriceChfResult =
  | { ok: true; chf: number }
  | { ok: false; error: ParsePriceChfError }

function lastSeparatorIndex(value: string): { comma: number; dot: number } {
  return {
    comma: value.lastIndexOf(','),
    dot: value.lastIndexOf('.'),
  }
}

/**
 * Normalize Swiss / EU decimal input:
 * - "80,5" → "80.5"
 * - "1'200.50" / "1 200,50" → "1200.50"
 * - "1.200,50" → "1200.50"
 * - "1,200.50" → "1200.50"
 */
export function normalizeSwissDecimalString(raw: string): string {
  const trimmed = raw.trim().replace(/\u00a0/g, ' ').replace(/'/g, '').replace(/\s/g, '')
  if (!trimmed) return ''

  const { comma, dot } = lastSeparatorIndex(trimmed)
  if (comma === -1 && dot === -1) return trimmed

  if (comma !== -1 && dot === -1) {
    const parts = trimmed.split(',')
    if (parts.length === 2 && parts[1].length <= 2) return `${parts[0]}.${parts[1]}`
    return trimmed.replace(/,/g, '')
  }

  if (dot !== -1 && comma === -1) {
    const parts = trimmed.split('.')
    if (parts.length > 2) return trimmed.replace(/\./g, '')
    return trimmed
  }

  if (comma > dot) {
    return trimmed.replace(/\./g, '').replace(',', '.')
  }
  return trimmed.replace(/,/g, '')
}

export function parsePriceChf(raw: unknown): ParsePriceChfResult {
  if (raw == null) return { ok: false, error: 'EMPTY' }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, error: 'INVALID' }
    if (raw < 0) return { ok: false, error: 'NEGATIVE' }
    return { ok: true, chf: raw }
  }
  if (typeof raw !== 'string') return { ok: false, error: 'INVALID' }

  const normalized = normalizeSwissDecimalString(raw)
  if (!normalized) return { ok: false, error: 'EMPTY' }

  const chf = Number(normalized)
  if (!Number.isFinite(chf)) return { ok: false, error: 'INVALID' }
  if (chf < 0) return { ok: false, error: 'NEGATIVE' }
  return { ok: true, chf }
}

/**
 * Paid offers cannot be CHF 0. Explicit free uses require_payment=false, not a zero paid price.
 */
export function parsePaidPriceChf(raw: unknown): ParsePriceChfResult {
  const parsed = parsePriceChf(raw)
  if (!parsed.ok) return parsed
  if (parsed.chf === 0) return { ok: false, error: 'INVALID' }
  return parsed
}

export function chfToRappen(chf: number): number {
  return Math.round(chf * 100)
}
