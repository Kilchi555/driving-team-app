// composables/useVehicleReservations.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'

interface VehicleBooking {
  id: string
  vehicle_id: string
  tenant_id: string
  start_time: string
  end_time: string
  purpose: string
  course_id?: string
  course_session_id?: string
  appointment_id?: string
  booked_by: string
  driver_name?: string
  status: 'confirmed' | 'cancelled' | 'completed' | 'in_use'
  notes?: string
  created_at: string
  updated_at: string
}

interface Vehicle {
  id: string
  tenant_id: string
  name: string
  type: string
  location: string
  description?: string
  requires_reservation: boolean
  is_active: boolean
  marke?: string
  modell?: string
  getriebe?: string
  aufbau?: string
  farbe?: string
}

export const useVehicleReservations = () => {
  const supabase = getSupabase()
  const { currentUser } = useCurrentUser()
  
  const vehicles = ref<Vehicle[]>([])
  const bookings = ref<VehicleBooking[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Load vehicles for current tenant
  const loadVehicles = async (forceTenantId?: string) => {
    const tenantId = forceTenantId || currentUser.value?.tenant_id
    
    console.log('🔄 loadVehicles called', {
      currentUser: currentUser.value,
      forceTenantId,
      effectiveTenantId: tenantId
    })
    
    if (!tenantId) {
      console.warn('⚠️ No tenant_id available, skipping vehicle load')
      return
    }

    console.log('🚗 Loading vehicles for tenant:', tenantId)
    isLoading.value = true
    error.value = null

    try {
      const { data, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('location', { ascending: true })

      if (vehiclesError) throw vehiclesError
      
      console.log('✅ Vehicles loaded:', data?.length || 0, 'items')
      console.log('🚗 Vehicles data:', data)
      
      vehicles.value = data || []

    } catch (err: any) {
      console.error('❌ Error loading vehicles:', err)
      error.value = 'Fehler beim Laden der Fahrzeuge'
    } finally {
      isLoading.value = false
    }
  }

  // Check vehicle availability for a time slot
  const checkVehicleAvailability = async (
    vehicleId: string, 
    startTime: string, 
    endTime: string,
    excludeBookingId?: string
  ) => {
    try {
      let query = supabase
        .from('vehicle_bookings')
        .select('id, start_time, end_time, purpose, driver_name')
        .eq('vehicle_id', vehicleId)
        .in('status', ['confirmed', 'in_use'])
        .or(`start_time.lt.${endTime},end_time.gt.${startTime}`) // Overlapping bookings

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      const { data: conflicts, error: checkError } = await query

      if (checkError) throw checkError

      return {
        available: !conflicts || conflicts.length === 0,
        conflicts: conflicts || []
      }

    } catch (err: any) {
      console.error('Error checking vehicle availability:', err)
      return { available: false, conflicts: [] }
    }
  }

  // Create vehicle booking
  const createVehicleBooking = async (bookingData: {
    vehicle_id: string
    start_time: string
    end_time: string
    purpose: string
    course_id?: string
    course_session_id?: string
    appointment_id?: string
    driver_name?: string
    notes?: string
  }) => {
    if (!currentUser.value?.tenant_id) throw new Error('Kein Tenant verfügbar')

    // Check availability first
    const availability = await checkVehicleAvailability(
      bookingData.vehicle_id,
      bookingData.start_time,
      bookingData.end_time
    )

    if (!availability.available) {
      throw new Error(`Fahrzeug ist bereits belegt: ${availability.conflicts.map(c => `${c.purpose} (${c.driver_name || 'Unbekannt'})`).join(', ')}`)
    }

    const { data, error: createError } = await supabase
      .from('vehicle_bookings')
      .insert({
        ...bookingData,
        tenant_id: currentUser.value.tenant_id,
        booked_by: currentUser.value.id,
        status: 'confirmed'
      })
      .select()
      .single()

    if (createError) throw createError
    return data
  }

  // Load bookings for a vehicle
  const loadVehicleBookings = async (vehicleId: string, startDate?: Date, endDate?: Date) => {
    try {
      let query = supabase
        .from('vehicle_bookings')
        .select(`
          *,
          vehicle:vehicles(name, type, location),
          booked_by_user:users!vehicle_bookings_booked_by_fkey(first_name, last_name)
        `)
        .eq('vehicle_id', vehicleId)
        .in('status', ['confirmed', 'in_use'])

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('end_time', endDate.toISOString())
      }

      const { data, error: loadError } = await query.order('start_time', { ascending: true })

      if (loadError) throw loadError
      return data || []

    } catch (err: any) {
      console.error('Error loading vehicle bookings:', err)
      return []
    }
  }

  // Cancel vehicle booking
  const cancelVehicleBooking = async (bookingId: string) => {
    const { data, error: cancelError } = await supabase
      .from('vehicle_bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('tenant_id', currentUser.value?.tenant_id)
      .select()
      .single()

    if (cancelError) throw cancelError
    return data
  }

  // Get vehicle utilization statistics
  const getVehicleUtilization = async (vehicleId: string, days: number = 30) => {
    const startDate = new Date()
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    try {
      const { data: bookings, error: statsError } = await supabase
        .from('vehicle_bookings')
        .select('start_time, end_time, purpose')
        .eq('vehicle_id', vehicleId)
        .in('status', ['confirmed', 'completed', 'in_use'])
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())

      if (statsError) throw statsError

      const totalHours = bookings?.reduce((sum, booking) => {
        const start = new Date(booking.start_time)
        const end = new Date(booking.end_time)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0) || 0

      const availableHours = days * 10 // Assume 10 hours per day available
      const utilizationPercent = availableHours > 0 ? (totalHours / availableHours) * 100 : 0

      return {
        totalBookings: bookings?.length || 0,
        totalHours: Math.round(totalHours * 10) / 10,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        bookings: bookings || []
      }

    } catch (err: any) {
      console.error('Error calculating vehicle utilization:', err)
      return {
        totalBookings: 0,
        totalHours: 0,
        utilizationPercent: 0,
        bookings: []
      }
    }
  }

  // Get vehicle type display info
  const getVehicleTypeInfo = (type: string) => {
    const typeMap: Record<string, { icon: string; label: string; color: string }> = {
      'roller': { icon: '🛵', label: 'Roller', color: '#10B981' },
      'motorrad': { icon: '🏍️', label: 'Motorrad', color: '#8B5CF6' },
      'anhanger_be': { icon: '🚚', label: 'Anhänger BE', color: '#F59E0B' },
      'lastwagen_c': { icon: '🚛', label: 'Lastwagen C', color: '#EF4444' },
      'anhanger_ce': { icon: '🚛', label: 'Anhänger CE', color: '#DC2626' }
    }
    return typeMap[type] || { icon: '🚗', label: type, color: '#6B7280' }
  }

  // Computed
  const vehiclesByLocation = computed(() => {
    const grouped = vehicles.value.reduce((acc, vehicle) => {
      if (!acc[vehicle.location]) {
        acc[vehicle.location] = []
      }
      acc[vehicle.location].push(vehicle)
      return acc
    }, {} as Record<string, Vehicle[]>)
    
    return Object.entries(grouped).map(([location, vehicles]) => ({
      location,
      vehicles: vehicles.sort((a, b) => a.name.localeCompare(b.name))
    }))
  })

  const vehiclesByType = computed(() => {
    const grouped = vehicles.value.reduce((acc, vehicle) => {
      if (!acc[vehicle.type]) {
        acc[vehicle.type] = []
      }
      acc[vehicle.type].push(vehicle)
      return acc
    }, {} as Record<string, Vehicle[]>)
    
    return Object.entries(grouped).map(([type, vehicles]) => ({
      type,
      typeInfo: getVehicleTypeInfo(type),
      vehicles: vehicles.sort((a, b) => a.location.localeCompare(b.location))
    }))
  })

  return {
    vehicles,
    bookings,
    isLoading,
    error,
    vehiclesByLocation,
    vehiclesByType,
    loadVehicles,
    checkVehicleAvailability,
    createVehicleBooking,
    loadVehicleBookings,
    cancelVehicleBooking,
    getVehicleUtilization,
    getVehicleTypeInfo
  }
}
