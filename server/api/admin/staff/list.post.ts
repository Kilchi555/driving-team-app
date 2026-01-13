import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!['admin', 'staff'].includes(user.role || '')) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const rateLimitKey = `staff_list:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 30, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const supabase = getSupabaseAdmin()

    const { data: staff, error: err } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'staff'])
      .eq('is_active', true)
      .order('first_name', { ascending: true })

    if (err) throw err

    logger.debug('✅ Staff loaded:', staff?.length || 0)
    return { success: true, data: staff || [], error: null }
  } catch (error: any) {
    logger.error('❌ Error loading staff:', error)
    return { success: false, data: null, error: error.statusMessage || 'Failed' }
  }
})

