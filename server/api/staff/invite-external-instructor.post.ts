import { createClient } from '@supabase/supabase-js'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

    const body = await readBody(event)
    const { email, first_name, last_name, tenant_id } = body

    if (!email || !first_name || !last_name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    const effectiveTenantId =
      profile.role === 'super_admin' && tenant_id ? tenant_id : profile.tenant_id

    if (!effectiveTenantId) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
    }

    if (
      profile.role !== 'super_admin' &&
      tenant_id &&
      tenant_id !== profile.tenant_id
    ) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
    }

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

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('tenant_id', effectiveTenantId)
      .single()

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'User with this email already exists'
      })
    }

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

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        first_name,
        last_name,
        email,
        role: 'externer_instruktor',
        tenant_id: effectiveTenantId,
        is_active: true
      })
      .select('id, email, first_name, last_name, role, tenant_id, is_active')
      .single()

    if (userError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw createError({
        statusCode: 400,
        statusMessage: `User creation error: ${userError.message}`
      })
    }

    const { error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${process.env.NUXT_PUBLIC_BASE_URL || process.env.NUXT_PUBLIC_SITE_URL}/login/set-password`
      }
    })

    if (inviteError) {
      console.warn('Failed to send invitation email:', inviteError.message)
    }

    return {
      success: true,
      user: userData
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to invite instructor'
    })
  }
})
