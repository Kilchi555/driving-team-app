// composables/useRoomReservations.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'

interface RoomBooking {
  id: string
  room_id: string
  tenant_id: string
  start_time: string
  end_time: string
  purpose: string
  course_id?: string
  course_session_id?: string
  booked_by: string
  external_contact_name?: string
  external_contact_email?: string
  external_contact_phone?: string
  status: 'confirmed' | 'cancelled' | 'completed'
  notes?: string
  created_at: string
  updated_at: string
}

interface Room {
  id: string
  tenant_id: string
  name: string
  location: string
  capacity: number
  description?: string
  equipment?: any
  is_public: boolean
  hourly_rate_rappen: number
  requires_reservation: boolean
  is_active: boolean
}

export const useRoomReservations = () => {
  const supabase = getSupabase()
  const { currentUser } = useCurrentUser()
  
  const rooms = ref<Room[]>([])
  const bookings = ref<RoomBooking[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Load available rooms (public + tenant rooms)
  const loadRooms = async () => {
    console.log('🔄 loadRooms called')
    
    isLoading.value = true
    error.value = null

    try {
      const { data, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('location', { ascending: true })

      if (roomsError) throw roomsError
      
      console.log('✅ Rooms loaded:', data?.length || 0, 'items')
      console.log('🏢 Rooms data:', data)
      
      rooms.value = data || []

    } catch (err: any) {
      console.error('❌ Error loading rooms:', err)
      error.value = 'Fehler beim Laden der Räume'
    } finally {
      isLoading.value = false
    }
  }

  // Check room availability for a time slot
  const checkRoomAvailability = async (
    roomId: string, 
    startTime: string, 
    endTime: string,
    excludeBookingId?: string
  ) => {
    try {
      let query = supabase
        .from('room_bookings')
        .select('id, start_time, end_time, purpose')
        .eq('room_id', roomId)
        .eq('status', 'confirmed')
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
      console.error('Error checking room availability:', err)
      return { available: false, conflicts: [] }
    }
  }

  // Create room booking
  const createRoomBooking = async (bookingData: {
    room_id: string
    start_time: string
    end_time: string
    purpose: string
    course_id?: string
    course_session_id?: string
    external_contact_name?: string
    external_contact_email?: string
    external_contact_phone?: string
    notes?: string
  }) => {
    if (!currentUser.value?.tenant_id) throw new Error('Kein Tenant verfügbar')

    // Check availability first
    const availability = await checkRoomAvailability(
      bookingData.room_id,
      bookingData.start_time,
      bookingData.end_time
    )

    if (!availability.available) {
      throw new Error(`Raum ist bereits belegt: ${availability.conflicts.map(c => c.purpose).join(', ')}`)
    }

    const { data, error: createError } = await supabase
      .from('room_bookings')
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

  // Load bookings for a room
  const loadRoomBookings = async (roomId: string, startDate?: Date, endDate?: Date) => {
    try {
      let query = supabase
        .from('room_bookings')
        .select(`
          *,
          room:rooms(name, location),
          booked_by_user:users!room_bookings_booked_by_fkey(first_name, last_name)
        `)
        .eq('room_id', roomId)
        .eq('status', 'confirmed')

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
      console.error('Error loading room bookings:', err)
      return []
    }
  }

  // Cancel room booking
  const cancelRoomBooking = async (bookingId: string) => {
    const { data, error: cancelError } = await supabase
      .from('room_bookings')
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

  // Get room utilization statistics
  const getRoomUtilization = async (roomId: string, days: number = 30) => {
    const startDate = new Date()
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

    try {
      const { data: bookings, error: statsError } = await supabase
        .from('room_bookings')
        .select('start_time, end_time, purpose')
        .eq('room_id', roomId)
        .eq('status', 'confirmed')
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())

      if (statsError) throw statsError

      const totalHours = bookings?.reduce((sum, booking) => {
        const start = new Date(booking.start_time)
        const end = new Date(booking.end_time)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0) || 0

      const availableHours = days * 12 // Assume 12 hours per day available
      const utilizationPercent = availableHours > 0 ? (totalHours / availableHours) * 100 : 0

      return {
        totalBookings: bookings?.length || 0,
        totalHours: Math.round(totalHours * 10) / 10,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        bookings: bookings || []
      }

    } catch (err: any) {
      console.error('Error calculating room utilization:', err)
      return {
        totalBookings: 0,
        totalHours: 0,
        utilizationPercent: 0,
        bookings: []
      }
    }
  }

  // Computed
  const publicRooms = computed(() => 
    rooms.value.filter(room => room.is_public)
  )

  const tenantRooms = computed(() => 
    rooms.value.filter(room => room.tenant_id === currentUser.value?.tenant_id)
  )

  const availableRooms = computed(() => 
    rooms.value.filter(room => 
      room.is_public || room.tenant_id === currentUser.value?.tenant_id
    )
  )

  return {
    rooms,
    bookings,
    isLoading,
    error,
    publicRooms,
    tenantRooms,
    availableRooms,
    loadRooms,
    checkRoomAvailability,
    createRoomBooking,
    loadRoomBookings,
    cancelRoomBooking,
    getRoomUtilization
  }
}
