import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/staff/save-guide-content
 *
 * Allows staff members to save the teaching guide (staff_content) for an
 * evaluation criterion.
 *
 * Body:
 *   - criterion_id: string (UUID)
 *   - staff_content: object (JSON)
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || !['staff', 'admin', 'tenant_admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Staff access required' })
  }

  const body = await readBody<{ criterion_id: string; staff_content: any }>(event)
  const { criterion_id, staff_content } = body

  if (!criterion_id) throw createError({ statusCode: 400, statusMessage: 'Missing criterion_id' })

  // Verify the criterion belongs to this tenant (or is a global criterion)
  const { data: criterion, error: fetchError } = await supabase
    .from('evaluation_criteria')
    .select('id, tenant_id')
    .eq('id', criterion_id)
    .single()

  if (fetchError || !criterion) {
    throw createError({ statusCode: 404, statusMessage: 'Criterion not found' })
  }

  // Only allow editing criteria of own tenant or global criteria
  if (criterion.tenant_id && criterion.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Cannot edit criteria of another tenant' })
  }

  const { error: updateError } = await supabase
    .from('evaluation_criteria')
    .update({ staff_content })
    .eq('id', criterion_id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: updateError.message })
  }

  return { success: true }
})
