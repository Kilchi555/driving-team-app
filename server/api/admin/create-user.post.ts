import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userData, courseId } = body

    logger.debug('Admin API called with:', { userData, courseId })

    if (!userData || !courseId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User data and course ID are required'
      })
    }

    // Use regular supabase client (will use service role if configured)
    const supabase = getSupabaseAdmin()
    
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Get user profile to get tenant_id AND role
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    // Only admins and staff may create users on behalf of a tenant
    if (!['admin', 'staff', 'super_admin', 'superadmin'].includes(userProfile.role)) {
      logger.warn('⚠️ [create-user] Unauthorized: role not permitted', { role: userProfile.role })
      throw createError({ statusCode: 403, statusMessage: 'Access denied: insufficient role' })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    let userId = existingUser?.id

    // Create user if doesn't exist
    if (!userId) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          phone: userData.phone || null,
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
    console.error('Create user error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})