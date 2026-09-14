/**
 * Staff resource surcharge for appointments/save.
 *
 * Vehicle/room costs for the customer payment come from tenant-scoped
 * vehicle/room rows, never from client resourceSurcharges[].rappen.
 *
 * This is not public vehicle_mode pricing and not rental/billing_pending.
 */
import type { OfferPriceClient } from '~/server/utils/resolve-offer-price'

export type StaffResourceQuoteInput = {
  tenantId: string
  vehicleId?: string | null
  roomId?: string | null
  durationMinutes: number
}

export type StaffResourceQuote = {
  vehicleRappen: number
  roomRappen: number
  totalRappen: number
}

type VehicleOrRoomRow = {
  id?: string | null
  tenant_id?: string | null
  is_active?: boolean | null
  hourly_rate_rappen?: number | string | null
  pricing_tiers?: unknown
}

function validPositiveRappen(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

function hourlyFromDuration(hourlyRateRappen: unknown, durationMinutes: number): number {
  const hourly = validPositiveRappen(hourlyRateRappen)
  if (hourly == null) return 0
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0
  return Math.round(hourly * durationMinutes / 60)
}

function objectLessonRappen(tiers: unknown): number | null {
  if (tiers == null || Array.isArray(tiers) || typeof tiers !== 'object') return null
  return validPositiveRappen((tiers as { lesson?: unknown }).lesson)
}

function arrayLessonRappen(tiers: unknown): number | null {
  if (!Array.isArray(tiers)) return null
  const lesson = tiers.find((tier) =>
    tier
    && typeof tier === 'object'
    && (tier as { type?: unknown }).type === 'lesson'
    && (tier as { enabled?: unknown }).enabled === true
  ) as { rate_rappen?: unknown } | undefined
  return lesson ? validPositiveRappen(lesson.rate_rappen) : null
}

export function vehicleSurchargeFromRow(
  row: VehicleOrRoomRow | null | undefined,
  durationMinutes: number,
): number {
  if (!row || row.is_active === false) return 0
  const objectLesson = objectLessonRappen(row.pricing_tiers)
  if (objectLesson != null) return objectLesson
  const arrayLesson = arrayLessonRappen(row.pricing_tiers)
  if (arrayLesson != null) return arrayLesson
  return hourlyFromDuration(row.hourly_rate_rappen, durationMinutes)
}

export function roomSurchargeFromRow(
  row: VehicleOrRoomRow | null | undefined,
  durationMinutes: number,
): number {
  if (!row || row.is_active === false) return 0
  return hourlyFromDuration(row.hourly_rate_rappen, durationMinutes)
}

async function loadTenantResource(
  supabase: OfferPriceClient,
  table: 'vehicles' | 'rooms',
  tenantId: string,
  id: string,
): Promise<VehicleOrRoomRow | null> {
  const { data, error } = await supabase
    .from(table)
    .select('id, tenant_id, is_active, hourly_rate_rappen, pricing_tiers')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data) return null
  return data as VehicleOrRoomRow
}

export async function quoteStaffResourceSurcharge(
  supabase: OfferPriceClient,
  input: StaffResourceQuoteInput,
): Promise<StaffResourceQuote> {
  const tenantId = String(input.tenantId || '').trim()
  const vehicleId = String(input.vehicleId || '').trim()
  const roomId = String(input.roomId || '').trim()
  const durationMinutes = Number(input.durationMinutes)

  let vehicleRappen = 0
  let roomRappen = 0

  if (tenantId && vehicleId) {
    const vehicle = await loadTenantResource(supabase, 'vehicles', tenantId, vehicleId)
    vehicleRappen = vehicleSurchargeFromRow(vehicle, durationMinutes)
  }
  if (tenantId && roomId) {
    const room = await loadTenantResource(supabase, 'rooms', tenantId, roomId)
    roomRappen = roomSurchargeFromRow(room, durationMinutes)
  }

  return {
    vehicleRappen,
    roomRappen,
    totalRappen: vehicleRappen + roomRappen,
  }
}
