import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { calculateDistance } from '~/server/utils/geolocation'
import { formatLocationAddress, geocodeAddress, isValidCoord } from '~/server/utils/geocode-address'
import {
  calculateTravelFee,
  destinationAddressFromUnknown,
  formatTravelFeeLabel,
  loadTravelFeeSettings,
  shouldApplyTravelFee,
  type TravelFeeSettings,
} from '~/server/utils/travel-fee'

export type TravelFeeLocationRow = {
  id: string
  name: string | null
  address: string | null
  formatted_address: string | null
  postal_code: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  location_type: string | null
}

export type TravelFeeQuoteInput = {
  locationId?: string | null
  locationType?: string | null
  locationName?: string | null
  destinationAddress?: unknown
  destinationLat?: unknown
  destinationLng?: unknown
  pickupPlz?: string | null
}

export type TravelFeeQuote = {
  enabled: boolean
  applied: boolean
  fee_rappen: number
  km: number
  billable_km: number
  capped: boolean
  label: string | null
  reason: string | null
  origin_label?: string
  destination_label?: string
}

type Coord = { latitude: number; longitude: number; label: string }

export function emptyTravelFeeQuote(extra: Partial<TravelFeeQuote> = {}): TravelFeeQuote {
  return {
    enabled: false,
    applied: false,
    fee_rappen: 0,
    km: 0,
    billable_km: 0,
    capped: false,
    label: null,
    reason: null,
    ...extra,
  }
}

export function swissPlzOrNull(value: unknown): string | null {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  return /^[1-9]\d{3}$/.test(digits) ? digits : null
}

export function destinationFromQuoteInput(input: TravelFeeQuoteInput): string | null {
  return destinationAddressFromUnknown(input.destinationAddress)
    || (swissPlzOrNull(input.pickupPlz) ? `PLZ ${swissPlzOrNull(input.pickupPlz)}, Schweiz` : null)
}

async function coordsFromLocation(loc: TravelFeeLocationRow | null | undefined): Promise<Coord | null> {
  if (!loc) return null
  if (isValidCoord(loc.latitude, loc.longitude)) {
    return { latitude: loc.latitude, longitude: loc.longitude, label: loc.name || loc.city || 'Standort' }
  }
  const address = formatLocationAddress(loc)
  if (!address) return null
  const point = await geocodeAddress(address)
  if (!point) return null

  if (!isValidCoord(loc.latitude, loc.longitude)) {
    await getSupabaseAdmin()
      .from('locations')
      .update({ latitude: point.latitude, longitude: point.longitude, updated_at: new Date().toISOString() })
      .eq('id', loc.id)
      .is('latitude', null)
  }

  return { latitude: point.latitude, longitude: point.longitude, label: loc.name || address }
}

async function resolveOrigin(tenantId: string, settings: TravelFeeSettings, locations: TravelFeeLocationRow[]): Promise<Coord | null> {
  const preferred = settings.origin_location_id
    ? locations.find((l) => l.id === settings.origin_location_id)
    : null
  if (preferred) {
    const fromPreferred = await coordsFromLocation(preferred)
    if (fromPreferred) return fromPreferred
  }

  const hq = locations.find((l) => /haupt|büro|buero|sitz|office|hq/i.test(l.name || ''))
    || locations.find((l) => l.location_type === 'standard')
    || locations[0]
  const fromHq = await coordsFromLocation(hq)
  if (fromHq) return fromHq

  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('address, invoice_street, invoice_street_nr, invoice_zip, invoice_city, postal_code, city')
    .eq('id', tenantId)
    .maybeSingle()

  const invoice = [
    tenant?.invoice_street,
    tenant?.invoice_street_nr,
    tenant?.invoice_zip || tenant?.postal_code,
    tenant?.invoice_city || tenant?.city,
  ].filter(Boolean).join(' ').trim()
  const fallback = invoice || String(tenant?.address || '').trim()
  if (!fallback) return null
  const point = await geocodeAddress(fallback)
  if (!point) return null
  return { latitude: point.latitude, longitude: point.longitude, label: fallback }
}

export async function quoteTravelFee(tenantId: string, input: TravelFeeQuoteInput = {}): Promise<TravelFeeQuote> {
  if (!tenantId) return emptyTravelFeeQuote({ reason: 'disabled' })

  const settings = await loadTravelFeeSettings(tenantId)
  if (!settings.enabled) return emptyTravelFeeQuote({ reason: 'disabled' })

  const locationId = typeof input.locationId === 'string' && input.locationId ? input.locationId : null
  const destinationAddress = destinationFromQuoteInput(input)
  const destLat = Number(input.destinationLat)
  const destLng = Number(input.destinationLng)
  const hasCoords = isValidCoord(destLat, destLng)

  const supabase = getSupabaseAdmin()
  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, address, formatted_address, postal_code, city, latitude, longitude, location_type')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error) throw error

  const selected = locationId
    ? (locations || []).find((l) => l.id === locationId) || null
    : null

  const apply = shouldApplyTravelFee({
    apply: settings.apply,
    originLocationId: settings.origin_location_id,
    locationId,
    locationType: input.locationType || selected?.location_type || (swissPlzOrNull(input.pickupPlz) ? 'pickup' : null),
    locationName: input.locationName || selected?.name || null,
    hasDestinationAddress: !!destinationAddress || hasCoords,
  })

  if (!apply) return emptyTravelFeeQuote({ enabled: true, reason: 'not_applicable' })

  let dest: Coord | null = null
  if (destinationAddress) {
    const point = await geocodeAddress(destinationAddress)
    if (point) dest = { latitude: point.latitude, longitude: point.longitude, label: destinationAddress }
  }
  if (!dest && hasCoords) {
    dest = { latitude: destLat, longitude: destLng, label: destinationAddress || selected?.name || 'Ziel' }
  }
  if (!dest && selected) dest = await coordsFromLocation(selected)
  if (!dest) return emptyTravelFeeQuote({ enabled: true, applied: true, reason: 'destination_unknown' })

  const origin = await resolveOrigin(tenantId, settings, locations || [])
  if (!origin) return emptyTravelFeeQuote({ enabled: true, applied: true, reason: 'origin_unknown' })

  const km = calculateDistance(origin.latitude, origin.longitude, dest.latitude, dest.longitude)
  const calc = calculateTravelFee(km, settings)
  const label = calc.fee_rappen > 0 ? formatTravelFeeLabel(calc) : null

  return {
    enabled: true,
    applied: calc.fee_rappen > 0,
    fee_rappen: calc.fee_rappen,
    km: calc.km,
    billable_km: calc.billable_km,
    capped: calc.capped,
    label,
    reason: calc.fee_rappen > 0 ? null : 'zero_distance',
    origin_label: origin.label,
    destination_label: dest.label,
  }
}
