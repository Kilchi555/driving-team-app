import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const TENANT_INVOICE_TIMING = new Set(['off', 'immediate'])

/**
 * PUT /api/admin/tenant/course-invoice-timing
 * Writes tenants.default_invoice_timing_mode for the authenticated admin tenant.
 * Client tenant ids are ignored.
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminOnly(event)
  if (!profile.tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'No tenant' })
  }

  const body = await readBody(event)
  const raw = body?.default_invoice_timing_mode
  const mode = typeof raw === 'string' ? raw.trim() : ''
  if (!TENANT_INVOICE_TIMING.has(mode)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ungültige Rechnungsstellung. Erlaubt sind Aus oder Sofort.',
    })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('tenants')
    .update({ default_invoice_timing_mode: mode })
    .eq('id', profile.tenant_id)
    .select('default_invoice_timing_mode')
    .single()

  if (error || !data) {
    logger.error('Error saving course invoice timing default:', error)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern der Kurs-Rechnungsstellung' })
  }

  return {
    success: true,
    default_invoice_timing_mode: data.default_invoice_timing_mode,
  }
})
