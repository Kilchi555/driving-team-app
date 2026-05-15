/**
 * Cron Job: Recalculate Staff Monthly Hours
 *
 * PURPOSE:
 * - Runs on the 1st of every month at 03:00 Zurich time
 * - Recalculates staff_monthly_hours for the last 3 months across ALL tenants
 *   (covers retroactive appointment edits, late payments, etc.)
 *
 * APPOINTMENT COUNTING RULES:
 * - Not cancelled → always counts
 * - Cancelled + payment still pending/completed/paid → counts (no-show fee charged)
 * - Cancelled + payment cancelled/refunded/failed OR no payment → does NOT count
 */
import { defineEventHandler, createError, getHeader, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { recalculateStaffHoursForTenant } from '~/server/services/staff-hours-calculator'
import { logger } from '~/utils/logger'

/** Returns the last 3 calendar months (including current) grouped by year. */
function getLast3MonthsByYear(): Record<number, number[]> {
  const now = new Date()
  const byYear: Record<number, number[]> = {}
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(m)
  }
  return byYear
}

export default defineEventHandler(async (event) => {
  try {
    // ── Security: verify CRON_SECRET ────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && cronSecret.trim() !== '') {
      const authHeader = getHeader(event, 'authorization')
      const vercelCronHeader = getHeader(event, 'x-vercel-cron')
      const isValidSecret = authHeader === `Bearer ${cronSecret}`
      const isVercelCron = vercelCronHeader === '1'
      if (!isValidSecret && !isVercelCron) {
        logger.warn('⚠️ Unauthorized cron access attempt on recalculate-staff-hours')
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized - invalid CRON_SECRET' })
      }
    }

    logger.debug('⏰ Starting staff monthly hours recalculation cron...')
    const startTime = Date.now()

    const supabase = getSupabaseAdmin()

    // ── Get all distinct tenants that have staff members ────────────────────
    const { data: tenants, error: tenantsError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('role', 'staff')
      .not('tenant_id', 'is', null)

    if (tenantsError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to load tenants: ${tenantsError.message}` })
    }

    const uniqueTenantIds = [...new Set((tenants || []).map((u: any) => u.tenant_id as string))]
    logger.debug(`📋 Found ${uniqueTenantIds.length} tenants with staff members`)

    const monthsByYear = getLast3MonthsByYear()

    // Allow manual override via query params: ?year=2026&months=1,2
    const query = getQuery(event)
    if (query.year && query.months) {
      const overrideYear = parseInt(query.year as string)
      const overrideMonths = (query.months as string).split(',').map(Number).filter(m => m >= 1 && m <= 12)
      if (!isNaN(overrideYear) && overrideMonths.length > 0) {
        Object.keys(monthsByYear).forEach(k => delete monthsByYear[parseInt(k)])
        monthsByYear[overrideYear] = overrideMonths
      }
    }

    const yearMonthPairs = Object.entries(monthsByYear).map(([y, months]) => ({
      year: parseInt(y),
      months,
    }))

    const summary = {
      tenants: uniqueTenantIds.length,
      totalUpdated: 0,
      errors: [] as Array<{ tenantId: string; year: number; error: string }>,
    }

    // ── Process each tenant × year combination ───────────────────────────────
    for (const tenantId of uniqueTenantIds) {
      for (const { year, months } of yearMonthPairs) {
        try {
          const { updated } = await recalculateStaffHoursForTenant(
            supabase,
            tenantId,
            year,
            months
          )
          summary.totalUpdated += updated
        } catch (err: any) {
          logger.error(`❌ Failed for tenant ${tenantId} year ${year}:`, err.message)
          summary.errors.push({ tenantId, year, error: err.message })
        }
      }
    }

    const duration = Date.now() - startTime
    logger.info('✅ Staff monthly hours recalculation complete', {
      ...summary,
      duration_ms: duration,
    })

    return {
      success: summary.errors.length === 0,
      tenants: summary.tenants,
      totalUpdated: summary.totalUpdated,
      errors: summary.errors,
      duration_ms: duration,
    }
  } catch (error: any) {
    logger.error('❌ Critical error in recalculate-staff-hours cron:', error.message)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to recalculate staff hours',
    })
  }
})
