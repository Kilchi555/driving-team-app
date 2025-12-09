// composables/useInstructorInvitations.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useCurrentUser } from '~/composables/useCurrentUser'

interface ExternalInstructor {
  id?: string
  name: string
  email: string
  phone?: string
  specialties?: string[]
  hourly_rate_rappen?: number
  notes?: string
}

interface InstructorInvitation {
  id: string
  instructor_name: string
  instructor_email: string
  instructor_phone: string | null
  course_id: string
  invited_by: string
  invitation_status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitation_token: string
  expires_at: string
  created_at: string
}

export const useInstructorInvitations = () => {
  const supabase = getSupabase()
  const { currentUser } = useCurrentUser()
  
  const isInviting = ref(false)
  const invitations = ref<InstructorInvitation[]>([])
  const error = ref<string | null>(null)

  // Send invitation to external instructor
  const inviteExternalInstructor = async (
    instructorData: ExternalInstructor,
    courseId: string,
    courseDetails: { name: string; description?: string; start_date?: string }
  ) => {
    if (!currentUser.value?.tenant_id) throw new Error('Kein Tenant verfügbar')

    isInviting.value = true
    error.value = null

    try {
      // 1. Create invitation token
      const invitationToken = generateInvitationToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      // 2. Store invitation in database
      const { data: invitation, error: inviteError } = await supabase
        .from('instructor_invitations')
        .insert({
          instructor_name: instructorData.name,
          instructor_email: instructorData.email,
          instructor_phone: instructorData.phone || null,
          course_id: courseId,
          invited_by: currentUser.value.id,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          tenant_id: currentUser.value.tenant_id
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // 3. Send invitation email
      await sendInstructorInvitationEmail({
        instructor: instructorData,
        course: courseDetails,
        invitationToken,
        expiresAt
      })

      logger.debug('✅ Instructor invitation sent:', invitation.id)
      return invitation

    } catch (err: any) {
      console.error('Error inviting instructor:', err)
      error.value = `Fehler beim Einladen: ${err.message}`
      throw err
    } finally {
      isInviting.value = false
    }
  }

  // Load invitations for a course
  const loadInvitations = async (courseId: string) => {
    try {
      const { data, error: loadError } = await supabase
        .from('instructor_invitations')
        .select('*')
        .eq('course_id', courseId)
        .eq('tenant_id', currentUser.value?.tenant_id)
        .order('created_at', { ascending: false })

      if (loadError) throw loadError
      invitations.value = data || []

    } catch (err: any) {
      console.error('Error loading invitations:', err)
      error.value = 'Fehler beim Laden der Einladungen'
    }
  }

  // Accept invitation (for external instructor interface)
  const acceptInvitation = async (token: string, instructorDetails: ExternalInstructor) => {
    try {
      const { data, error: acceptError } = await supabase
        .from('instructor_invitations')
        .update({
          invitation_status: 'accepted',
          instructor_details: instructorDetails
        })
        .eq('invitation_token', token)
        .eq('invitation_status', 'pending')
        .select()
        .single()

      if (acceptError) throw acceptError
      return data

    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      throw err
    }
  }

  // Helper functions
  const generateInvitationToken = () => {
    return 'instr_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36)
  }

  const sendInstructorInvitationEmail = async (params: {
    instructor: ExternalInstructor
    course: { name: string; description?: string; start_date?: string }
    invitationToken: string
    expiresAt: Date
  }) => {
    // For now, log the email content (later integrate with email service)
    const emailContent = `
Hallo ${params.instructor.name},

Sie wurden als externer Instruktor für den Kurs "${params.course.name}" eingeladen.

Kurs-Details:
- Name: ${params.course.name}
- Beschreibung: ${params.course.description || 'Keine Beschreibung'}
- Start: ${params.course.start_date || 'Wird noch festgelegt'}

Um die Einladung anzunehmen, klicken Sie bitte auf folgenden Link:
${window.location.origin}/instructor-invitation/${params.invitationToken}

Diese Einladung läuft ab am: ${params.expiresAt.toLocaleDateString('de-CH')}

Mit freundlichen Grüssen
Ihr Fahrschul-Team
    `

    logger.debug('📧 Instructor invitation email:', emailContent)
    
    // TODO: Integrate with actual email service
    // For now, we just log and simulate success
    return { success: true, message: 'E-Mail-Einladung versendet (simuliert)' }
  }

  const getInvitationStatus = (invitation: InstructorInvitation) => {
    if (new Date(invitation.expires_at) < new Date()) {
      return 'expired'
    }
    return invitation.invitation_status
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ausstehend'
      case 'accepted': return 'Angenommen'
      case 'declined': return 'Abgelehnt'
      case 'expired': return 'Abgelaufen'
      default: return 'Unbekannt'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400'
      case 'accepted': return 'text-green-400'
      case 'declined': return 'text-red-400'
      case 'expired': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  return {
    isInviting,
    invitations,
    error,
    inviteExternalInstructor,
    loadInvitations,
    acceptInvitation,
    getInvitationStatus,
    getStatusText,
    getStatusColor
  }
}




















