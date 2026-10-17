/**
 * Prospect website VAT resolution for shell tenants.
 * Does not silently default ambiguous `generic` to 8.1%.
 * Selection is stored on prospect.analysis.vat_selection (JSONB) — no migration.
 */
import { isChVatExemptEducationBusinessType } from '~/server/utils/invoice-vat'

/** Swiss statutory rates used in the product (percent). */
export const PROSPECT_ALLOWED_VAT_RATES = [0, 2.6, 3.8, 8.1] as const

export type ProspectAllowedVatRate = (typeof PROSPECT_ALLOWED_VAT_RATES)[number]

export type ProspectVatSelection = {
  rate_percent: ProspectAllowedVatRate
  source: 'education_default' | 'tenant_existing' | 'explicit_selection'
  selected_at?: string
}

export type ProspectVatResolution =
  | { ok: true; rate: ProspectAllowedVatRate; selection: ProspectVatSelection }
  | { ok: false; reason: 'selection_required' | 'invalid_rate' }

export function isAllowedProspectVatRate(value: unknown): value is ProspectAllowedVatRate {
  if (value === null || value === undefined || value === '') return false
  if (typeof value !== 'number' && typeof value !== 'string') return false
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return false
  return (PROSPECT_ALLOWED_VAT_RATES as readonly number[]).includes(n)
}

export function readProspectVatSelection(
  analysis: { vat_selection?: unknown } | null | undefined,
): ProspectVatSelection | null {
  const raw = analysis?.vat_selection
  if (!raw || typeof raw !== 'object') return null
  const rate = (raw as { rate_percent?: unknown }).rate_percent
  if (!isAllowedProspectVatRate(rate)) return null
  const sourceRaw = String((raw as { source?: unknown }).source || 'explicit_selection')
  const source: ProspectVatSelection['source'] =
    sourceRaw === 'education_default' || sourceRaw === 'tenant_existing' || sourceRaw === 'explicit_selection'
      ? sourceRaw
      : 'explicit_selection'
  const selectedAt = (raw as { selected_at?: unknown }).selected_at
  return {
    rate_percent: rate,
    source,
    ...(typeof selectedAt === 'string' && selectedAt ? { selected_at: selectedAt } : {}),
  }
}

function selectionFromCaller(
  selection: unknown,
  nowIso?: string,
): { resolved: ProspectVatSelection | null; invalid: boolean } {
  if (selection == null || selection === '') {
    return { resolved: null, invalid: false }
  }
  if (isAllowedProspectVatRate(selection) || (typeof selection === 'string' && isAllowedProspectVatRate(Number(selection)))) {
    const rate = (typeof selection === 'string' ? Number(selection) : selection) as ProspectAllowedVatRate
    return {
      resolved: {
        rate_percent: rate,
        source: 'explicit_selection',
        ...(nowIso ? { selected_at: nowIso } : {}),
      },
      invalid: false,
    }
  }
  if (typeof selection === 'object') {
    const asSel = readProspectVatSelection({ vat_selection: selection })
    if (asSel) return { resolved: asSel, invalid: false }
    const nested = readProspectVatSelection(selection as { vat_selection?: unknown })
    if (nested) return { resolved: nested, invalid: false }
    if ('rate_percent' in (selection as object) || 'vat_selection' in (selection as object)) {
      return { resolved: null, invalid: true }
    }
    return { resolved: null, invalid: false }
  }
  return { resolved: null, invalid: true }
}

/**
 * Resolve VAT for a prospect shell:
 * 1. Existing tenant default_vat_rate when already set to an allowed rate
 * 2. Explicit analysis.vat_selection / caller selection
 * 3. Education business types → 0%
 * 4. Otherwise selection required (no silent 8.1% for generic)
 */
export function resolveProspectVatRate(opts: {
  businessType: string | null | undefined
  existingTenantVatRate?: number | null
  /** Raw rate, vat_selection object, or analysis containing vat_selection */
  selection?: unknown
  nowIso?: string
}): ProspectVatResolution {
  const existing = opts.existingTenantVatRate
  if (existing != null && isAllowedProspectVatRate(existing)) {
    return {
      ok: true,
      rate: existing,
      selection: {
        rate_percent: existing,
        source: 'tenant_existing',
      },
    }
  }

  const fromCaller = selectionFromCaller(opts.selection, opts.nowIso)
  if (fromCaller.invalid) return { ok: false, reason: 'invalid_rate' }
  if (fromCaller.resolved) {
    return { ok: true, rate: fromCaller.resolved.rate_percent, selection: fromCaller.resolved }
  }

  if (isChVatExemptEducationBusinessType(opts.businessType)) {
    return {
      ok: true,
      rate: 0,
      selection: {
        rate_percent: 0,
        source: 'education_default',
      },
    }
  }

  return { ok: false, reason: 'selection_required' }
}

export function mergeVatSelectionIntoAnalysis(
  analysis: Record<string, unknown> | null | undefined,
  selection: ProspectVatSelection,
): Record<string, unknown> {
  return {
    ...(analysis || {}),
    vat_selection: selection,
  }
}
