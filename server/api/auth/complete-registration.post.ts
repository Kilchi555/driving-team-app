import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Auth token must be valid (user just set password, has fresh session)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody<{
      first_name?: string
      last_name?: string
      phone?: string | null
      role?: string
      admin_level?: string | null
      tenant_id: string
    }>(event)

    if (!body.tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'Missing tenant_id' })
    }

    const supabase = getSupabaseAdmin()

    // Validate tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('id', body.tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid tenant_id' })
    }

    // Whitelist allowed roles for self-registration
    const allowedRoles = ['staff', 'admin']
    const role = body.role === 'sub_admin' ? 'admin' : (body.role || 'staff')
    if (!allowedRoles.includes(role)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
    }

    // Upsert user record — only for the authenticated user's own auth_user_id
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    let result
    if (existingUser) {
      // Update only safe fields — never update tenant_id or role for existing users
      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          first_name: body.first_name || null,
          last_name: body.last_name || null,
          phone: body.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', authUser.id)
        .select('id, email, tenant_id, role')
        .single()

      if (updateError) throw updateError
      result = data
    } else {
      // Create new user record
      const { data, error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUser.id,
          first_name: body.first_name || null,
          last_name: body.last_name || null,
          email: authUser.email,
          phone: body.phone || null,
          role,
          admin_level: body.role === 'sub_admin' ? 'sub_admin' : null,
          is_primary_admin: false,
          is_active: true,
          tenant_id: body.tenant_id,
          created_at: new Date().toISOString()
        })
        .select('id, email, tenant_id, role')
        .single()

      if (insertError) throw insertError
      result = data
    }

    logger.info(`✅ User registration completed for auth_user_id=${authUser.id}`)

    return {
      success: true,
      user: result,
      tenant_slug: tenant.slug
    }

  } catch (err: any) {
    logger.error('❌ Error in complete-registration:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Registration failed' })
  }
})
