// server/api/admin/cron-status.get.ts
// Super-admin only: cron job status + automatic payment pipeline overview.
// Service role is used AFTER authentication — never publicly.

import { getSupabaseAdmin } from '~/utils/supabase'
import { requireSuperAdmin } from '~/server/utils/admin-f01-access'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  try {
    const supabase = getSupabaseAdmin()
    const now = new Date()

    let cronLogs: any[] = []
    try {
      const { data: logs, error: logsError } = await supabase
        .from('cron_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!logsError && logs) {
        cronLogs = logs
      }
    } catch (err) {
      console.warn('⚠️ cron_logs table may not exist:', err)
    }

    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, automatic_payment_processed, payment_status, created_at, wallee_transaction_id, tenant_id')
      .eq('payment_status', 'authorized')
      .eq('automatic_payment_processed', false)
      .not('scheduled_payment_date', 'is', null)

    const { data: overduePayments } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, automatic_payment_processed, payment_status, created_at, wallee_transaction_id, tenant_id')
      .eq('payment_status', 'authorized')
      .eq('automatic_payment_processed', false)
      .not('scheduled_payment_date', 'is', null)
      .lt('scheduled_payment_date', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    const { data: waitingAuthPayments } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_authorization_date, payment_status, created_at, tenant_id')
      .eq('payment_status', 'pending')
      .eq('automatic_payment_consent', true)
      .not('scheduled_authorization_date', 'is', null)
      .lte('scheduled_authorization_date', now.toISOString())

    const { data: processedPayments } = await supabase
      .from('payments')
      .select('id, appointment_id, automatic_payment_processed_at, payment_status, created_at, tenant_id')
      .eq('automatic_payment_processed', true)
      .order('automatic_payment_processed_at', { ascending: false })
      .limit(10)

    // Aggregate via count queries — avoid loading every payment row into memory
    const [
      { count: total },
      { count: pending },
      { count: authorized },
      { count: completed },
      { count: withAutomaticConsent },
      { count: processed },
    ] = await Promise.all([
      supabase.from('payments').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'authorized'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'completed'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('automatic_payment_consent', true),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('automatic_payment_processed', true),
    ])

    const stats = {
      total: total || 0,
      pending: pending || 0,
      authorized: authorized || 0,
      completed: completed || 0,
      withAutomaticConsent: withAutomaticConsent || 0,
      processed: processed || 0,
    }

    return {
      success: true,
      timestamp: now.toISOString(),
      cronJobs: {
        'cleanup-expired-invitations': {
          path: '/api/cron/cleanup-expired-invitations',
          schedule: '0 2 * * *',
          description: 'Removes expired invitation links',
          nextRun: getNextCronTime('0 2 * * *'),
        },
        'calculate-availability': {
          path: '/api/cron/calculate-availability',
          schedule: '0 2 * * *',
          description: 'Recalculates available booking slots for all staff members',
          nextRun: getNextCronTime('0 2 * * *'),
        },
        'sync-sari-courses': {
          path: '/api/cron/sync-sari-courses',
          schedule: '0 * * * *',
          description: 'Syncs courses from SARI system',
          nextRun: getNextCronTime('0 * * * *'),
        },
        'process-automatic-payments': {
          path: '/api/cron/process-automatic-payments',
          schedule: '0 * * * *',
          description: 'Captures authorized payments and authorizes pending payments',
          nextRun: getNextCronTime('0 * * * *'),
          pendingPayments: pendingPayments?.length || 0,
          overduePayments: overduePayments?.length || 0,
          waitingAuth: waitingAuthPayments?.length || 0,
          recentProcessed: processedPayments?.length || 0,
        },
        'sync-external-calendars': {
          path: '/api/cron/sync-external-calendars',
          schedule: '0 0 * * *',
          description: 'Syncs external calendar integrations',
          nextRun: getNextCronTime('0 0 * * *'),
        },
      },
      pendingPayments: pendingPayments || [],
      overduePayments: overduePayments || [],
      waitingAuthPayments: waitingAuthPayments || [],
      recentProcessedPayments: processedPayments || [],
      paymentStats: stats,
      cronLogs: cronLogs,
      vercel: {
        cronConfigured: true,
        cronFile: 'vercel.json',
        note: 'Cron jobs are configured in vercel.json. Check Vercel dashboard for execution logs.',
      },
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('❌ Error checking cron status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check cron status',
    })
  }
})

function getNextCronTime(cronExpression: string): string {
  const now = new Date()
  const next = new Date(now)

  if (cronExpression === '0 * * * *') {
    next.setHours(now.getHours() + 1, 0, 0, 0)
  } else if (cronExpression === '0 0 * * *') {
    next.setDate(now.getDate() + 1)
    next.setHours(0, 0, 0, 0)
  } else if (cronExpression === '0 2 * * *') {
    next.setHours(2, 0, 0, 0)
    if (next <= now) {
      next.setDate(now.getDate() + 1)
    }
  }

  return next.toISOString()
}
