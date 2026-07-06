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
   * Whether this option requires a school vehicle from the fleet.
   * When true, a vehicle_bookings placeholder is created on booking
   * and the slot is filtered out when fleet capacity is exhausted.
   */
  requires_school_vehicle?: boolean
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
 * Check whether a school vehicle is available at a given location for a
 * category and time window, using vehicle_bookings as source of truth.
 *
 * Returns true when the fleet has capacity, false when fully booked.
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
  }: {
    tenantId: string
    locationId: string
    categoryCode: string
    startTime: string
    endTime: string
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

  if (fleetResult.error || fleetResult.count === null || fleetResult.count === 0) return false
  if (blockedResult.error) return false

  return (blockedResult.count ?? 0) < fleetResult.count
}
