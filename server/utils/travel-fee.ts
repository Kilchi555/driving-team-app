/**
 * Per-km travel (Anfahrt) billing.
 * Settings live in tenant_settings (category=pricing, key=travel_fee).
 * Calendar totals add the fee as a resource surcharge; payment metadata stores
 * the breakdown so invoices keep the same total.
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { roundToNearest5Rappen } from '~/utils/rounding'

export type TravelFeeApplyMode = 'address_only' | 'offsite'

export type TravelFeeSettings = {
  enabled: boolean
  rappen_per_km: number
  max_rappen: number
  free_km: number
  apply: TravelFeeApplyMode
  origin_location_id: string | null
}

export type TravelFeeCalculation = {
  km: number
  billable_km: number
  fee_rappen: number
  capped: boolean
}

export type TravelFeeMeta = {
  km: number
  billable_km: number
  fee_rappen: number
  capped: boolean
  label: string
}

export type TravelFeeApplyInput = {
  apply: TravelFeeApplyMode
  originLocationId: string | null
  locationId: string | null
  locationType: string | null
  locationName: string | null
  hasDestinationAddress: boolean
}

export const DEFAULT_TRAVEL_FEE_SETTINGS: TravelFeeSettings = {
  enabled: false,
  rappen_per_km: 150,
  max_rappen: 7500,
  free_km: 0,
  apply: 'address_only',
  origin_location_id: null,
}

const MOBILE_LOCATION_RE = /hausbesuch|home\s*visit|zuhause|beim\s+kunden|kunde\s*vor\s*ort|mobil(e|er)?\s*(termin|besuch)?/i
const REMOTE_LOCATION_RE = /telefon|phone|online|zoom|teams|video\s*call|videocall/i

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function parseStoredConfig(raw: unknown): Record<string, unknown> {
  if (raw == null) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }
  return {}
}

export function parseTravelFeeSettings(raw: unknown): TravelFeeSettings {
  const value = parseStoredConfig(raw)
  const apply = value.apply === 'offsite' ? 'offsite' : 'address_only'
  const origin = typeof value.origin_location_id === 'string' && value.origin_location_id.trim()
    ? value.origin_location_id.trim()
    : null

  return {
    enabled: value.enabled === true,
    rappen_per_km: clampInt(value.rappen_per_km, DEFAULT_TRAVEL_FEE_SETTINGS.rappen_per_km, 0, 100_000),
    max_rappen: clampInt(value.max_rappen, DEFAULT_TRAVEL_FEE_SETTINGS.max_rappen, 0, 10_000_000),
    free_km: clampNumber(value.free_km, 0, 0, 500),
    apply,
    origin_location_id: origin,
  }
}

export function isRemoteLocationName(name: string | null | undefined): boolean {
  return REMOTE_LOCATION_RE.test(String(name || ''))
}

export function isTravelDestinationName(name: string | null | undefined): boolean {
  return MOBILE_LOCATION_RE.test(String(name || ''))
}

export function isRemoteLocationType(locationType: string | null | undefined): boolean {
  const type = String(locationType || '').toLowerCase()
  return type === 'online' || type === 'phone' || type === 'virtual' || type === 'remote'
}

export function shouldApplyTravelFee(input: TravelFeeApplyInput): boolean {
  if (isRemoteLocationType(input.locationType) || isRemoteLocationName(input.locationName)) {
    return false
  }
  if (input.hasDestinationAddress) return true
  if (String(input.locationType || '').toLowerCase() === 'pickup') return true
  if (isTravelDestinationName(input.locationName)) return true
  if (
    input.apply === 'offsite' &&
    input.locationId &&
    input.originLocationId &&
    input.locationId !== input.originLocationId
  ) {
    return true
  }
  return false
}

export function calculateTravelFee(km: number, settings: Pick<TravelFeeSettings, 'rappen_per_km' | 'max_rappen' | 'free_km'>): TravelFeeCalculation {
  const distanceKm = Number.isFinite(km) && km > 0 ? km : 0
  const roundedKm = Math.round(distanceKm * 10) / 10
  const billableKm = Math.max(0, Math.round((roundedKm - settings.free_km) * 10) / 10)
  const raw = Math.round(billableKm * settings.rappen_per_km)
  const capped = settings.max_rappen > 0 && raw > settings.max_rappen
  const limited = capped ? settings.max_rappen : raw
  return {
    km: roundedKm,
    billable_km: billableKm,
    fee_rappen: roundToNearest5Rappen(limited),
    capped,
  }
}

export function formatTravelFeeLabel(calc: TravelFeeCalculation): string {
  const kmLabel = calc.km.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
  return calc.capped
    ? `Anfahrt (${kmLabel} km, max.)`
    : `Anfahrt (${kmLabel} km)`
}

export function destinationAddressFromUnknown(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>
    for (const key of ['address', 'formatted_address', 'formattedAddress']) {
      const part = rec[key]
      if (typeof part === 'string' && part.trim()) return part.trim()
    }
  }
  return null
}

export async function loadTravelFeeSettings(tenantId: string): Promise<TravelFeeSettings> {
  if (!tenantId) return { ...DEFAULT_TRAVEL_FEE_SETTINGS }

  const { data } = await getSupabaseAdmin()
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', tenantId)
    .eq('category', 'pricing')
    .eq('setting_key', 'travel_fee')
    .maybeSingle()

  return parseTravelFeeSettings(data?.setting_value)
}

export function travelFeeMetaFromSurcharges(surcharges: unknown): TravelFeeMeta | null {
  if (!Array.isArray(surcharges)) return null
  const travel = surcharges.find((item) => item && typeof item === 'object' && (item as any).type === 'travel')
  if (!travel || typeof travel !== 'object') return null
  const rappen = Number((travel as any).rappen)
  if (!Number.isFinite(rappen) || rappen <= 0) return null
  const km = Number((travel as any).km)
  return {
    km: Number.isFinite(km) ? km : 0,
    billable_km: Number((travel as any).billable_km) || 0,
    fee_rappen: Math.round(rappen),
    capped: (travel as any).capped === true,
    label: typeof (travel as any).label === 'string' ? (travel as any).label : formatTravelFeeLabel({
      km: Number.isFinite(km) ? km : 0,
      billable_km: 0,
      fee_rappen: Math.round(rappen),
      capped: (travel as any).capped === true,
    }),
  }
}
