import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { courseId, participant } = body

    logger.debug('Enrollment API called with:', { courseId, participant })

    if (!courseId || !participant) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Course ID and participant data are required'
      })
    }

    const supabase = getSupabase()
    
    // Get the current user to determine tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Get user profile to get tenant_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', participant.email)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    let userId = existingUser?.id

    // Create user if doesn't exist
    if (!userId) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          first_name: participant.first_name,
          last_name: participant.last_name,
          email: participant.email,
          phone: participant.phone || null,
          role: 'student',
          tenant_id: userProfile.tenant_id,
          is_active: true
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create user'
        })
      }

      userId = newUser.id
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .single()

    if (existingEnrollment) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User is already enrolled in this course'
      })
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_registrations')
      .insert({
        course_id: courseId,
        user_id: userId,
        status: 'confirmed',
        registered_at: new Date().toISOString(),
        tenant_id: userProfile.tenant_id
      })
      .select()
      .single()

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create enrollment'
      })
    }

    return {
      success: true,
      enrollment,
      userId
    }

  } catch (error: any) {
    console.error('Enrollment error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
