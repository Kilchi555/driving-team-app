import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Completes name/phone on a profile that already exists for this auth user.
 * Role, tenant, and every other privileged field come from the invitation or
 * bootstrap that created the row. This endpoint never inserts a user.
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody<{
      first_name?: unknown
      last_name?: unknown
      phone?: unknown
    }>(event)

    const supabase = getSupabaseAdmin()

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (existingError) throw existingError

    if (!existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Kein Benutzerprofil vorhanden. Konten werden nur über die Einladung angelegt.',
      })
    }

    const firstName = typeof body?.first_name === 'string' ? body.first_name : null
    const lastName = typeof body?.last_name === 'string' ? body.last_name : null
    const phone = typeof body?.phone === 'string' ? body.phone : null

    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)
      .eq('auth_user_id', authUser.id)
      .select('id, email, tenant_id, role')
      .single()

    if (updateError) throw updateError

    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', existingUser.tenant_id)
      .maybeSingle()

    logger.info(`✅ User registration completed for auth_user_id=${authUser.id}`)

    return {
      success: true,
      user: data,
      tenant_slug: tenant?.slug ?? null,
    }
  } catch (err: any) {
    logger.error('❌ Error in complete-registration:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Registration failed' })
  }
})
