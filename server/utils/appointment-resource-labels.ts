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

export function flattenAppointment(value: any): any | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export function formatResourceSubtitle(
  vehicleLabel?: string | null,
  roomName?: string | null
): string | null {
  const parts = [vehicleLabel || null, roomName ? `Raum ${roomName}` : null].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

export async function attachResourceLabelsToAppointments<T extends {
  type?: string | null
  category_code?: string | null
  location_id?: string | null
  vehicle_mode?: string | null
  room_id?: string | null
  vehicle_label?: string | null
  room_name?: string | null
}>(
  supabase: SupabaseClient,
  tenantId: string,
  appointments: Array<T | null | undefined>
): Promise<T[]> {
  const rows = appointments.filter((a): a is T => !!a)
  for (const apt of rows) {
    const labels = await loadAppointmentResourceLabels(supabase, {
      tenantId,
      categoryCode: apt.category_code || apt.type,
      locationId: apt.location_id,
      vehicleMode: apt.vehicle_mode,
      roomId: apt.room_id,
    })
    apt.vehicle_label = labels.vehicleLabel
    apt.room_name = labels.roomName
  }
  return rows
}
