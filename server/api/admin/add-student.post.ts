// server/api/admin/add-student.post.ts
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: Rate Limiting (30 requests per minute per user)
    const authUser = (await getSupabase().auth.getUser()).data.user
    if (authUser) {
      const rateLimitResult = await checkRateLimit(authUser.id, 30)
      if (!rateLimitResult.success) {
        throw createError({
          statusCode: 429,
          statusMessage: 'Too many requests. Please try again later.'
        })
      }
    }

    const body = await readBody(event)
    logger.debug('📝 Add student request:', { email: body.email, phone: body.phone })

    // Get auth user and validate
    const supabase = getSupabase()
    const { data: { user: authUserData } } = await supabase.auth.getUser()
    
    if (!authUserData) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Get user profile and tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUserData.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User has no tenant assigned'
      })
    }

    const tenantId = userProfile.tenant_id

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // Check for duplicates - phone
    if (body.phone) {
      const { data: existingPhone } = await supabaseAdmin
        .from('users')
        .select('id, email, auth_user_id')
        .eq('tenant_id', tenantId)
        .eq('phone', body.phone)
        .single()

      if (existingPhone) {
        throw createError({
          statusCode: 409,
          statusMessage: 'DUPLICATE_PHONE',
          data: { existingUser: existingPhone }
        })
      }
    }

    // Check for duplicates - email
    if (body.email && body.email.trim() !== '') {
      const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id, phone, auth_user_id')
        .eq('tenant_id', tenantId)
        .eq('email', body.email.trim())
        .neq('email', '')
        .single()

      if (existingEmail) {
        throw createError({
          statusCode: 409,
          statusMessage: 'DUPLICATE_EMAIL',
          data: { existingUser: existingEmail }
        })
      }
    }

    // Generate UUID and token
    const userId = crypto.randomUUID()
    const onboardingToken = crypto.randomUUID()
    const tokenExpires = new Date()
    tokenExpires.setDate(tokenExpires.getDate() + 7) // 7 days valid

    // Prepare category array
    const categoryArray = body.category
      ? (Array.isArray(body.category) ? body.category : [body.category])
      : []

    // Insert new student (using service role)
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        auth_user_id: null, // Set after onboarding
        tenant_id: tenantId,
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        email: body.email && body.email.trim() !== '' ? body.email.trim() : null,
        phone: body.phone && body.phone.trim() !== '' ? body.phone.trim() : null,
        birthdate: body.birthdate || null,
        street: body.street || null,
        street_nr: body.street_nr || null,
        zip: body.zip || null,
        city: body.city || null,
        category: categoryArray,
        assigned_staff_id: body.assigned_staff_id || null,
        role: 'client',
        is_active: false, // Inactive until onboarding complete
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: tokenExpires.toISOString()
      }])

    if (insertError) {
      logger.error('Add student - Insert error:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create student: ${insertError.message}`
      })
    }

    logger.debug('✅ Student created with ID:', userId)

    // Return student data
    const studentData = {
      id: userId,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || null,
      phone: body.phone || null,
      role: 'client',
      is_active: false,
      onboarding_status: 'pending',
      onboarding_token: onboardingToken,
      onboarding_token_expires: tokenExpires.toISOString(),
      onboardingLink: `https://simy.ch/onboarding/${onboardingToken}`
    }

    return {
      success: true,
      data: studentData
    }
  } catch (error: any) {
    logger.error('Add student API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to add student'
    })
  }
})

