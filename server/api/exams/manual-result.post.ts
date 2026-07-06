/**
 * POST /api/exams/manual-result
 *
 * Manually record an exam result for a student without a linked appointment.
 * Used when the instructor did not accompany the student to the exam.
 *
 * Body: { user_id, category, passed, exam_date?, notes? }
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: actor } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!actor || !['admin', 'staff'].includes(actor.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { user_id, category, passed, exam_date, notes } = body

  if (!user_id || !category || typeof passed !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'user_id, category and passed are required' })
  }

  // Verify the student belongs to same tenant
  const { data: student } = await supabase
    .from('users')
    .select('id, tenant_id, exam_passed_categories')
    .eq('id', user_id)
    .eq('tenant_id', actor.tenant_id)
    .single()

  if (!student) throw createError({ statusCode: 404, statusMessage: 'Student not found' })

  // Insert manual exam result
  const { error: insertErr } = await supabase
    .from('exam_results')
    .insert({
      user_id,
      category,
      passed,
      exam_date: exam_date || new Date().toISOString(),
      notes: notes || null,
      tenant_id: actor.tenant_id,
      is_manual: true,
    })

  if (insertErr) {
    logger.error('❌ manual-result insert error:', insertErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save exam result' })
  }

  // Update exam_passed_categories on user if passed
  if (passed) {
    const normalizedCategory = category.trim().split(' ')[0]
    const { error: rpcErr } = await supabase.rpc('append_exam_passed_category', {
      p_user_id: user_id,
      p_category: normalizedCategory,
    })
    if (rpcErr) logger.warn('⚠️ Could not update exam_passed_categories:', rpcErr.message)
    else logger.debug('✅ exam_passed_categories updated:', user_id, normalizedCategory)
  }

  return { success: true }
})
