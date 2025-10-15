import { ref, computed, readonly } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface GeneralResourceBooking {
  id: string
  tenant_id: string
  general_resource_id: string
  course_id?: string
  start_time: string
  end_time: string
  status: 'active' | 'cancelled' | 'completed'
  booked_by?: string
  notes?: string
  created_at: string
  updated_at: string
  
  // Relations
  general_resource?: {
    id: string
    name: string
    resource_type: string
  }
  course?: {
    id: string
    name: string
  }
  booked_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface CreateGeneralResourceBookingData {
  general_resource_id: string
  course_id?: string
  start_time: string
  end_time: string
  notes?: string
}

export interface UpdateGeneralResourceBookingData {
  start_time?: string
  end_time?: string
  status?: 'active' | 'cancelled' | 'completed'
  notes?: string
}

export function useGeneralResourceBookings() {
  const supabase = getSupabase()
  const bookings = ref<GeneralResourceBooking[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeBookings = computed(() => 
    bookings.value.filter(b => b.status === 'active')
  )

  const upcomingBookings = computed(() => 
    activeBookings.value.filter(b => new Date(b.start_time) > new Date())
  )

  const pastBookings = computed(() => 
    bookings.value.filter(b => new Date(b.end_time) < new Date())
  )

  const currentBookings = computed(() => 
    activeBookings.value.filter(b => {
      const now = new Date()
      const start = new Date(b.start_time)
      const end = new Date(b.end_time)
      return start <= now && end >= now
    })
  )

  // Methods
  const loadBookings = async (resourceId?: string, dateRange?: { start: string; end: string }) => {
    if (isLoading.value) return
    
    isLoading.value = true
    error.value = null

    try {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      let query = supabase
        .from('general_resource_bookings')
        .select(`
          *,
          general_resource:general_resource_id(id, name, resource_type),
          course:course_id(id, name),
          booked_by_user:booked_by(id, first_name, last_name)
        `)
        .eq('tenant_id', userProfile.tenant_id)
        .order('start_time', { ascending: true })

      if (resourceId) {
        query = query.eq('general_resource_id', resourceId)
      }

      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start)
          .lte('end_time', dateRange.end)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      bookings.value = data || []
    } catch (err: any) {
      error.value = err.message
      console.error('Error loading general resource bookings:', err)
    } finally {
      isLoading.value = false
    }
  }

  const createBooking = async (data: CreateGeneralResourceBookingData) => {
    try {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { data: booking, error: createError } = await supabase
        .from('general_resource_bookings')
        .insert({
          ...data,
          tenant_id: userProfile.tenant_id,
          booked_by: userProfile.id
        })
        .select(`
          *,
          general_resource:general_resource_id(id, name, resource_type),
          course:course_id(id, name),
          booked_by_user:booked_by(id, first_name, last_name)
        `)
        .single()

      if (createError) throw createError

      // Refresh bookings list
      await loadBookings()

      return booking
    } catch (err: any) {
      error.value = err.message
      console.error('Error creating general resource booking:', err)
      throw err
    }
  }

  const updateBooking = async (id: string, data: UpdateGeneralResourceBookingData) => {
    try {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { data: booking, error: updateError } = await supabase
        .from('general_resource_bookings')
        .update(data)
        .eq('id', id)
        .eq('tenant_id', userProfile.tenant_id)
        .select(`
          *,
          general_resource:general_resource_id(id, name, resource_type),
          course:course_id(id, name),
          booked_by_user:booked_by(id, first_name, last_name)
        `)
        .single()

      if (updateError) throw updateError

      // Update local bookings
      const index = bookings.value.findIndex(b => b.id === id)
      if (index !== -1) {
        bookings.value[index] = booking
      }

      return booking
    } catch (err: any) {
      error.value = err.message
      console.error('Error updating general resource booking:', err)
      throw err
    }
  }

  const cancelBooking = async (id: string) => {
    try {
      return await updateBooking(id, { status: 'cancelled' })
    } catch (err: any) {
      error.value = err.message
      console.error('Error cancelling general resource booking:', err)
      throw err
    }
  }

  const deleteBooking = async (id: string) => {
    try {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      const { error: deleteError } = await supabase
        .from('general_resource_bookings')
        .delete()
        .eq('id', id)
        .eq('tenant_id', userProfile.tenant_id)

      if (deleteError) throw deleteError

      // Remove from local bookings
      bookings.value = bookings.value.filter(b => b.id !== id)

      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error deleting general resource booking:', err)
      throw err
    }
  }

  const checkAvailability = async (resourceId: string, startTime: string, endTime: string, excludeBookingId?: string) => {
    try {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile?.tenant_id) throw new Error('Kein Tenant zugewiesen')

      let query = supabase
        .from('general_resource_bookings')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('general_resource_id', resourceId)
        .eq('status', 'active')
        .lt('start_time', endTime)
        .gt('end_time', startTime)

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      return data.length === 0
    } catch (err: any) {
      error.value = err.message
      console.error('Error checking general resource availability:', err)
      throw err
    }
  }

  return {
    // State
    bookings: readonly(bookings),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    activeBookings,
    upcomingBookings,
    pastBookings,
    currentBookings,
    
    // Methods
    loadBookings,
    createBooking,
    updateBooking,
    cancelBooking,
    deleteBooking,
    checkAvailability
  }
}
