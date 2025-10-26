import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, first_name, last_name, tenant_id } = body

    if (!email || !first_name || !last_name || !tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    // Create Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('tenant_id', tenant_id)
      .single()

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User with this email already exists'
      })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role: 'externer_instruktor'
      }
    })

    if (authError) {
      throw createError({
        statusCode: 400,
        statusMessage: `Auth error: ${authError.message}`
      })
    }

    // Create user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        first_name,
        last_name,
        email,
        role: 'externer_instruktor',
        tenant_id,
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw createError({
        statusCode: 400,
        statusMessage: `User creation error: ${userError.message}`
      })
    }

    // Send invitation email
    const { error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${process.env.NUXT_PUBLIC_SITE_URL}/login/set-password`
      }
    })

    if (inviteError) {
      console.warn('Failed to send invitation email:', inviteError.message)
    }

    return {
      success: true,
      user: userData,
      message: 'External instructor created and invitation sent'
    }

  } catch (error: any) {
    console.error('Error creating external instructor:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
