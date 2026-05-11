/**
 * POST /api/discounts/manage
 * Create or update a discount record in the discounts table.
 * (Separate from /api/discounts/save which applies a discount to an appointment.)
 */
import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.tenant_id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = await readBody(event)
    const { id, action, ...discountFields } = body

    const supabase = getSupabaseAdmin()

    // DELETE (soft)
    if (action === 'delete' && id) {
      const { error } = await supabase
        .from('discounts')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id)
        .eq('tenant_id', authUser.tenant_id)
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      logger.debug('🗑️ Discount deleted:', id)
      return { success: true }
    }

    // Always scope to current tenant
    const payload = { ...discountFields, tenant_id: authUser.tenant_id }

    // UPDATE
    if (id) {
      const { data, error } = await supabase
        .from('discounts')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', authUser.tenant_id)
        .select()
        .single()
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      logger.debug('✅ Discount updated:', id)
      return { success: true, data }
    }

    // CREATE
    const { data, error } = await supabase
      .from('discounts')
      .insert(payload)
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    logger.debug('✅ Discount created:', data.id)
    return { success: true, data }

  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to manage discount' })
  }
})
