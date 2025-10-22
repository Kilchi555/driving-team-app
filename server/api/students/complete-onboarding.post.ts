// server/api/students/complete-onboarding.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const { token, password, email, birthdate, category, street, street_nr, zip, city, documentUrls } = await readBody(event)

    if (!token || !password || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Find user by token
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (userError || !user) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired token'
      })
    }

    // 2. Check token expiration
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token has expired'
      })
    }

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Mark email as confirmed
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name
      }
    })

    if (authError) {
      console.error('Auth user creation error:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to create account: ${authError.message}`
      })
    }

    // 4. Update user record with all data
    // Ensure category stored as array
    const categoryValue = Array.isArray(category) ? category : (category ? [category] : [])

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authData.user.id,
        email: email,
        birthdate: birthdate,
        category: categoryValue,
        street: street,
        street_nr: street_nr,
        zip: zip,
        city: city,
        is_active: true,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date().toISOString(),
        onboarding_token: null, // Invalidate token
        onboarding_token_expires: null,
        accepted_terms_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('User update error:', updateError)
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to update profile: ${updateError.message}`
      })
    }

    return {
      success: true,
      message: 'Onboarding completed successfully',
      userId: user.id,
      authUserId: authData.user.id
    }

  } catch (error: any) {
    console.error('Complete onboarding error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Onboarding completion failed'
    })
  }
})

