// server/api/cron/auto-invoice-scheduled.get.ts
// ============================================================
// Scheduled auto-invoice for past uninvoiced invoice-payments.
//
// Runs daily; per-tenant booking_policy decides if today matches
// (off | daily | weekly | monthly) in Europe/Zurich.
// Groups open items into one Sammelrechnung per customer.
// Does NOT change appointment status.
//
// Schedule: every day at 06:20 UTC
// Test mode: ?test_tenant_id=<UUID>
// ============================================================

import { getHeader, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { runScheduledAutoInvoices } from '~/server/utils/auto-invoice-on-complete'
import logger from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on auto-invoice-scheduled')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const testTenantId = typeof query.test_tenant_id === 'string' ? query.test_tenant_id : null
  if (testTenantId) logger.debug(`🧪 TEST MODE: tenant=${testTenantId}`)

  const supabase = getSupabaseAdmin()

  try {
    const result = await runScheduledAutoInvoices({
      supabase,
      testTenantId,
    })

    logger.debug('✅ Scheduled auto-invoice cron done', result)

    return {
      success: true,
      ...result,
      duration_ms: Date.now() - startTime,
    }
  } catch (err: any) {
    logger.error('❌ Scheduled auto-invoice cron failed:', err?.message)
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || 'Scheduled auto-invoice failed',
    })
  }
})
