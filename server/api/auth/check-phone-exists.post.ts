import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { phone, tenantId } = body

    if (!phone || !tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'phone und tenantId erforderlich' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { exists: false, isPending: false }
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: user, error } = await supabase
      .from('users')
      .select('id, auth_user_id, first_name, onboarding_token')
      .eq('phone', phone.trim())
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.warn('check-phone-exists DB error:', error)
      return { exists: false, isPending: false }
    }

    if (!user) {
      return { exists: false, isPending: false }
    }

    // Pending = no auth_user_id yet AND has onboarding token
    const isPending = !user.auth_user_id && !!user.onboarding_token

    return {
      exists: true,
      isPending,
      isActive: !!user.auth_user_id,
      firstName: user.first_name || null,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Prüfen der Telefonnummer' })
  }
})
