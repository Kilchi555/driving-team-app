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
  const { q, company_id } = getQuery(event) as { q?: string; company_id?: string }

  const supabase = getSupabaseAdmin()

  // Load all members of a specific company
  if (company_id && !q) {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, company_id')
      .eq('tenant_id', profile.tenant_id)
      .eq('company_id', company_id)
      .order('first_name')

    if (error) {
      logger.error('❌ Error loading company users:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { users: data || [] }
  }

  // Search users by name or email
  if (!q || !q.trim()) return { users: [] }

  const query = q.trim()

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, role, company_id')
    .eq('tenant_id', profile.tenant_id)
    .in('role', ['student', 'client'])
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error) {
    logger.error('❌ Error searching users:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { users: data || [] }
})
