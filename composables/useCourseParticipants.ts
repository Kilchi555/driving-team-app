// composables/useCourseParticipants.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useSmsService } from '~/composables/useSmsService'

interface CourseRegistration {
  id: string
  course_id: string
  tenant_id: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  registration_date: string
  status: 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'completed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_id?: string
  amount_paid_rappen: number
  discount_applied_rappen: number
  registered_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

interface WaitlistEntry {
  id: string
  course_id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  position: number
  added_date: string
  status: 'waiting' | 'offered' | 'accepted' | 'declined' | 'expired'
  last_notification_sent?: string
  offer_expires_at?: string
  created_at: string
  updated_at: string
}

export const useCourseParticipants = () => {
  const supabase = getSupabase()
  const { currentUser } = useCurrentUser()
  const { sendSms } = useSmsService()
  
  const registrations = ref<CourseRegistration[]>([])
  const waitlist = ref<WaitlistEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Load registrations for a course
  const loadRegistrations = async (courseId: string) => {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: loadError } = await supabase
        .from('course_registrations')
        .select(`
          *,
          user:users(first_name, last_name, email, phone),
          registered_by_user:users!course_registrations_registered_by_fkey(first_name, last_name)
        `)
        .eq('course_id', courseId)
        .eq('tenant_id', currentUser.value?.tenant_id)
        .order('registration_date', { ascending: true })

      if (loadError) throw loadError
      registrations.value = data || []

    } catch (err: any) {
      console.error('Error loading registrations:', err)
      error.value = 'Fehler beim Laden der Anmeldungen'
    } finally {
      isLoading.value = false
    }
  }

  // Load waitlist for a course
  const loadWaitlist = async (courseId: string) => {
    try {
      const { data, error: loadError } = await supabase
        .from('course_waitlist')
        .select('*')
        .eq('course_id', courseId)
        .eq('tenant_id', currentUser.value?.tenant_id)
        .order('position', { ascending: true })

      if (loadError) throw loadError
      waitlist.value = data || []

    } catch (err: any) {
      console.error('Error loading waitlist:', err)
      error.value = 'Fehler beim Laden der Warteliste'
    }
  }

  // Register participant for course
  const registerParticipant = async (
    courseId: string,
    participantData: {
      user_id?: string
      first_name: string
      last_name: string
      email: string
      phone?: string
      notes?: string
    },
    adminRegistration = false
  ) => {
    if (!currentUser.value?.tenant_id) throw new Error('Kein Tenant verfügbar')

    try {
      // Check if course is full
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('max_participants, current_participants')
        .eq('id', courseId)
        .single()

      if (courseError) throw courseError

      const isFull = course.current_participants >= course.max_participants

      if (isFull && !adminRegistration) {
        // Add to waitlist
        return await addToWaitlist(courseId, participantData)
      }

      // Create registration
      const registrationData = {
        course_id: courseId,
        tenant_id: currentUser.value.tenant_id,
        ...participantData,
        status: adminRegistration ? 'confirmed' : 'pending',
        registered_by: adminRegistration ? currentUser.value.id : null
      }

      const { data: registration, error: regError } = await supabase
        .from('course_registrations')
        .insert(registrationData)
        .select()
        .single()

      if (regError) throw regError

      // Update course participant count
      await updateParticipantCount(courseId)

      // Send confirmation SMS/Email
      if (participantData.phone) {
        await sendRegistrationConfirmation(registration, course)
      }

      return registration

    } catch (err: any) {
      console.error('Error registering participant:', err)
      throw err
    }
  }

  // Add participant to waitlist
  const addToWaitlist = async (
    courseId: string,
    participantData: {
      first_name: string
      last_name: string
      email: string
      phone?: string
    }
  ) => {
    if (!currentUser.value?.tenant_id) throw new Error('Kein Tenant verfügbar')

    // Get next position in waitlist
    const { data: lastEntry, error: posError } = await supabase
      .from('course_waitlist')
      .select('position')
      .eq('course_id', courseId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (lastEntry?.position || 0) + 1

    const { data: waitlistEntry, error: waitlistError } = await supabase
      .from('course_waitlist')
      .insert({
        course_id: courseId,
        tenant_id: currentUser.value.tenant_id,
        ...participantData,
        position: nextPosition
      })
      .select()
      .single()

    if (waitlistError) throw waitlistError

    // Send waitlist notification
    if (participantData.phone) {
      await sendWaitlistNotification(waitlistEntry)
    }

    return waitlistEntry
  }

  // Move participant from waitlist to registration
  const promoteFromWaitlist = async (waitlistId: string) => {
    try {
      const { data: waitlistEntry, error: getError } = await supabase
        .from('course_waitlist')
        .select('*')
        .eq('id', waitlistId)
        .single()

      if (getError) throw getError

      // Create registration
      const registration = await registerParticipant(
        waitlistEntry.course_id,
        {
          first_name: waitlistEntry.first_name,
          last_name: waitlistEntry.last_name,
          email: waitlistEntry.email,
          phone: waitlistEntry.phone
        },
        true // Admin registration
      )

      // Remove from waitlist
      await supabase
        .from('course_waitlist')
        .update({ status: 'accepted' })
        .eq('id', waitlistId)

      return registration

    } catch (err: any) {
      console.error('Error promoting from waitlist:', err)
      throw err
    }
  }

  // Cancel registration
  const cancelRegistration = async (registrationId: string) => {
    const { data, error: cancelError } = await supabase
      .from('course_registrations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .eq('tenant_id', currentUser.value?.tenant_id)
      .select()
      .single()

    if (cancelError) throw cancelError

    // Update participant count
    if (data) {
      await updateParticipantCount(data.course_id)
      
      // Try to promote someone from waitlist
      await tryPromoteFromWaitlist(data.course_id)
    }

    return data
  }

  // Helper functions
  const updateParticipantCount = async (courseId: string) => {
    const { data: count, error: countError } = await supabase
      .from('course_registrations')
      .select('id', { count: 'exact' })
      .eq('course_id', courseId)
      .in('status', ['confirmed', 'pending'])

    if (countError) {
      console.error('Error counting participants:', countError)
      return
    }

    await supabase
      .from('courses')
      .update({ current_participants: count || 0 })
      .eq('id', courseId)
  }

  const tryPromoteFromWaitlist = async (courseId: string) => {
    // Get first person from waitlist
    const { data: nextInLine, error: waitlistError } = await supabase
      .from('course_waitlist')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (waitlistError || !nextInLine) return

    try {
      await promoteFromWaitlist(nextInLine.id)
    } catch (err) {
      console.error('Error auto-promoting from waitlist:', err)
    }
  }

  const sendRegistrationConfirmation = async (registration: any, course: any) => {
    const message = `Hallo ${registration.first_name}! Ihre Anmeldung für "${course.name}" wurde bestätigt. Details folgen per E-Mail.`
    
    try {
      // Get tenant sender name
      let senderName = 'Fahrschule'
      if (currentUser.value?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, twilio_from_sender')
          .eq('id', currentUser.value.tenant_id)
          .single()
        
        if (tenantData?.twilio_from_sender) {
          senderName = tenantData.twilio_from_sender
        } else if (tenantData?.name) {
          senderName = tenantData.name
        }
      }
      
      await sendSms(registration.phone, message, senderName)
    } catch (err) {
      console.warn('Could not send confirmation SMS:', err)
    }
  }

  const sendWaitlistNotification = async (waitlistEntry: any) => {
    const message = `Hallo ${waitlistEntry.first_name}! Der gewünschte Kurs ist ausgebucht. Sie stehen auf Position ${waitlistEntry.position} der Warteliste.`
    
    try {
      // Get tenant sender name
      let senderName = 'Fahrschule'
      if (currentUser.value?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, twilio_from_sender')
          .eq('id', currentUser.value.tenant_id)
          .single()
        
        if (tenantData?.twilio_from_sender) {
          senderName = tenantData.twilio_from_sender
        } else if (tenantData?.name) {
          senderName = tenantData.name
        }
      }
      
      await sendSms(waitlistEntry.phone, message, senderName)
    } catch (err) {
      console.warn('Could not send waitlist SMS:', err)
    }
  }

  // Computed
  const confirmedRegistrations = computed(() => 
    registrations.value.filter(reg => reg.status === 'confirmed')
  )

  const pendingRegistrations = computed(() => 
    registrations.value.filter(reg => reg.status === 'pending')
  )

  const paidRegistrations = computed(() => 
    registrations.value.filter(reg => reg.payment_status === 'paid')
  )

  const unpaidRegistrations = computed(() => 
    registrations.value.filter(reg => reg.payment_status === 'pending')
  )

  return {
    registrations,
    waitlist,
    isLoading,
    error,
    confirmedRegistrations,
    pendingRegistrations,
    paidRegistrations,
    unpaidRegistrations,
    loadRegistrations,
    loadWaitlist,
    registerParticipant,
    addToWaitlist,
    promoteFromWaitlist,
    cancelRegistration,
    updateParticipantCount
  }
}




















