/**
 * Vehicle availability + pricing utility.
 *
 * Uses an options-based model so categories can define any number of
 * vehicle combinations (e.g. school-car + own-trailer, own-car + own-trailer …).
 * Each option carries its own label, description and price impact.
 *
 * vehicle_bookings is the single source of truth for fleet capacity.
 */

export interface VehicleOption {
  /** Unique key stored on the appointment as vehicle_mode */
  key: string
  /** Displayed label, e.g. "Schulauto + Eigenanhänger" */
  label: string
  /** Optional extra description shown below the label */
  description?: string
  /** 'none' = no price change, 'surcharge' = adds to price, 'discount' = subtracts */
  cost_type: 'none' | 'surcharge' | 'discount'
  /** Amount in Rappen */
  cost_rappen: number
  /** true = cost_rappen is per lesson-minute; false = flat amount */
  per_minute: boolean
  /** Pre-selected option in the wizard */
  is_default: boolean
  /**
   * Whether this option uses a school vehicle (placeholder booking).
   * Capacity hiding is controlled separately by enforce_capacity.
   */
  requires_school_vehicle?: boolean
  /**
   * hard capacity: hide slots when no matching school vehicle exists.
   * unset / false: empty fleet is a setup gap; only a booked-out fleet hides slots.
   */
  enforce_capacity?: boolean
}

export interface VehicleSettings {
  /** 'none' = feature disabled, 'options' = show option list */
  mode: 'none' | 'options'
  options?: VehicleOption[]
}

/**
 * Resolve the effective vehicle settings for a given location + category,
 * falling back to the category-level default when the location has no config.
 */
export function resolveVehicleSettings(
  locationVehicleSettings: Record<string, VehicleSettings> | null | undefined,
  categoryVehicleSettings: VehicleSettings | null | undefined,
  categoryCode: string
): VehicleSettings {
  const locSetting = locationVehicleSettings?.[categoryCode]
  if (locSetting?.mode === 'options' && locSetting.options?.length) return locSetting
  if (locSetting?.mode === 'none') return { mode: 'none' }
  if (categoryVehicleSettings?.mode === 'options' && categoryVehicleSettings.options?.length) return categoryVehicleSettings
  return { mode: 'none' }
}

/**
 * Look up the chosen option by its key and compute the net price impact in
 * Rappen for the given lesson duration.
 *
 * Returns a signed integer:
 *   positive → surcharge (add to lesson price)
 *   negative → discount (subtract from lesson price)
 *   0        → no change
 */
export function calculateVehicleCost(
  settings: VehicleSettings,
  optionKey: string,
  durationMinutes: number
): number {
  if (settings.mode !== 'options' || !settings.options?.length) return 0

  const option = settings.options.find(o => o.key === optionKey)
  if (!option || option.cost_type === 'none') return 0

  const base = option.per_minute
    ? Math.round(option.cost_rappen * durationMinutes)
    : option.cost_rappen

  return option.cost_type === 'discount' ? -base : base
}

/**
 * Find the default option for a VehicleSettings object.
 * Falls back to the first option if none is marked as default.
 */
export function getDefaultVehicleOption(settings: VehicleSettings): VehicleOption | null {
  if (settings.mode !== 'options' || !settings.options?.length) return null
  return settings.options.find(o => o.is_default) ?? settings.options[0]
}

/**
 * Chosen vehicle option for a booking request.
 * Unknown keys fall back to the default — callers cannot invent a policy.
 */
export function resolveBookedVehicleOption(
  settings: VehicleSettings,
  vehicleMode?: string | null
): VehicleOption | null {
  if (settings.mode !== 'options' || !settings.options?.length) return null
  if (vehicleMode) {
    const match = settings.options.find(o => o.key === vehicleMode)
    if (match) return match
  }
  return getDefaultVehicleOption(settings)
}

export type SlotVehiclePolicy = {
  requiresSchoolVehicle: boolean
  enforceCapacity: boolean
}

/**
 * Capacity policy comes from stored category/location settings, never from
 * client query flags. vehicleMode only selects which configured option applies.
 */
export function resolveSlotVehiclePolicy(
  locationVehicleSettings: Record<string, VehicleSettings> | null | undefined,
  categoryVehicleSettings: VehicleSettings | null | undefined,
  categoryCode: string,
  vehicleMode?: string | null
): SlotVehiclePolicy {
  const settings = resolveVehicleSettings(
    locationVehicleSettings,
    categoryVehicleSettings,
    categoryCode
  )
  const option = resolveBookedVehicleOption(settings, vehicleMode)
  return {
    requiresSchoolVehicle: !!option?.requires_school_vehicle,
    enforceCapacity: !!option?.requires_school_vehicle && !!option?.enforce_capacity,
  }
}

/**
 * Check whether a school vehicle is available at a given location for a
 * category and time window, using vehicle_bookings as source of truth.
 *
 * Returns true when the fleet has capacity, or when no matching school
 * vehicles are configured (no constraint to enforce). Returns false only
 * when a fleet exists and every matching vehicle is already booked —
 * unless enforceCapacity is on, in which case an empty fleet also blocks.
 *
 * NOTE: Call this only for options where school vehicles are required
 *       (i.e. when the school needs to provide at least one vehicle).
 */
export async function isSchoolVehicleAvailable(
  supabase: any,
  {
    tenantId,
    locationId,
    categoryCode,
    startTime,
    endTime,
    enforceCapacity = false,
  }: {
    tenantId: string
    locationId: string
    categoryCode: string
    startTime: string
    endTime: string
    enforceCapacity?: boolean
  }
): Promise<boolean> {
  const [fleetResult, blockedResult] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('is_active', true)
      .contains('category_codes', [categoryCode]),
    supabase
      .from('vehicle_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('category_code', categoryCode)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', startTime),
  ])

  const fleetCount = fleetResult.error ? 0 : (fleetResult.count ?? 0)
  if (fleetCount <= 0) return !enforceCapacity
  if (blockedResult.error) return false

  return (blockedResult.count ?? 0) < fleetCount
}
