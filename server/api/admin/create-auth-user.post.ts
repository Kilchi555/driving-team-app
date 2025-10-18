// server/api/admin/create-auth-user.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, email, password, firstName, lastName } = body

    if (!userId || !email || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: userId, email, password'
      })
    }

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: `Auth creation failed: ${authError.message}`
      })
    }

    // Update users table with auth_user_id
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: authData.user.id })
      .eq('id', userId)

    if (updateError) {
      console.error('User update error:', updateError)
      throw createError({
        statusCode: 400,
        statusMessage: `User update failed: ${updateError.message}`
      })
    }

    return {
      success: true,
      authUserId: authData.user.id,
      message: 'Auth user created successfully'
    }

  } catch (error: any) {
    console.error('Create auth user error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
