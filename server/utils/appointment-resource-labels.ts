import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveBookedVehicleOption, resolveVehicleSettings } from '~/server/utils/vehicle-availability'

export async function loadAppointmentResourceLabels(
  supabase: SupabaseClient,
  opts: {
    tenantId: string
    categoryCode?: string | null
    locationId?: string | null
    vehicleMode?: string | null
    roomId?: string | null
  }
): Promise<{ vehicleLabel: string | null; roomName: string | null }> {
  const [categoryRes, locationRes, roomRes] = await Promise.all([
    opts.categoryCode
      ? supabase
          .from('categories')
          .select('vehicle_settings')
          .eq('tenant_id', opts.tenantId)
          .eq('code', opts.categoryCode)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    opts.locationId
      ? supabase
          .from('locations')
          .select('category_vehicle_settings')
          .eq('id', opts.locationId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    opts.roomId
      ? supabase.from('rooms').select('name').eq('id', opts.roomId).eq('tenant_id', opts.tenantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const settings = resolveVehicleSettings(
    locationRes.data?.category_vehicle_settings,
    categoryRes.data?.vehicle_settings,
    opts.categoryCode || ''
  )
  const option = resolveBookedVehicleOption(settings, opts.vehicleMode)

  return {
    vehicleLabel: option?.label || null,
    roomName: roomRes.data?.name || null,
  }
}
