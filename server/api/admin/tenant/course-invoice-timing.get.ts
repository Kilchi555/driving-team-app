import { defineEventHandler, createError } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * GET /api/admin/tenant/course-invoice-timing
 * Returns tenants.default_invoice_timing_mode for the authenticated admin tenant.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminOnly(event)
  if (!profile.tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'No tenant' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenants')
    .select('default_invoice_timing_mode')
    .eq('id', profile.tenant_id)
    .single()

  if (error || !data) {
    logger.error('Error loading course invoice timing default:', error)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Kurs-Rechnungsstellung' })
  }

  return {
    default_invoice_timing_mode: data.default_invoice_timing_mode,
  }
})
