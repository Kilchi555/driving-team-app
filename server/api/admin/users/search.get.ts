import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/users/search?q=<query>
 * Searches tenant students by name or email (case-insensitive substring).
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { q } = getQuery(event) as { q?: string }

  if (!q || !q.trim()) return []

  const supabase = getSupabaseAdmin()
  const query = q.trim()

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, role')
    .eq('tenant_id', profile.tenant_id)
    .in('role', ['student', 'client'])
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error) {
    logger.error('❌ Error searching users:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return data || []
})
