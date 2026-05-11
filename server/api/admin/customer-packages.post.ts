import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { action, id, userId, packageId, notes, expiresAt } = body
  const supabase = getSupabaseAdmin()

  // REVOKE / TOGGLE active
  if (action === 'revoke' && id) {
    const { data: cp } = await supabase
      .from('customer_packages')
      .select('is_active')
      .eq('id', id)
      .eq('tenant_id', authUser.tenant_id)
      .single()

    const { error } = await supabase
      .from('customer_packages')
      .update({ is_active: !cp?.is_active })
      .eq('id', id)
      .eq('tenant_id', authUser.tenant_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // ASSIGN package to customer (manual / admin)
  if (!userId || !packageId) {
    throw createError({ statusCode: 400, statusMessage: 'userId and packageId required' })
  }

  // Load package to get lessons_count
  const { data: pkg } = await supabase
    .from('lesson_packages')
    .select('lessons_count, valid_days, name')
    .eq('id', packageId)
    .eq('tenant_id', authUser.tenant_id)
    .single()

  if (!pkg) throw createError({ statusCode: 404, statusMessage: 'Package not found' })

  const expiryDate = expiresAt
    ? new Date(expiresAt).toISOString()
    : pkg.valid_days
      ? new Date(Date.now() + pkg.valid_days * 86400000).toISOString()
      : null

  const { data: cp, error } = await supabase
    .from('customer_packages')
    .insert({
      tenant_id: authUser.tenant_id,
      user_id: userId,
      package_id: packageId,
      lessons_total: pkg.lessons_count,
      lessons_used: 0,
      expires_at: expiryDate,
      assigned_by: authUser.id,
      notes: notes || null,
      is_active: true
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  logger.info(`✅ Package "${pkg.name}" assigned to user ${userId} by admin ${authUser.id}`)
  return { success: true, customerPackage: cp }
})
