// server/api/admin/cron-status.get.ts
// Admin endpoint to check cron job status and execution history

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    // ✅ Use Admin client to bypass RLS
    const supabase = getSupabaseAdmin()
    
    // Get current time
    const now = new Date()
    
    // Check if there's a cron_logs table (for tracking executions)
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
    
    // Check pending automatic payments (authorized, waiting for capture)
    // Zeige ALLE autorisierten Zahlungen mit scheduled_payment_date (auch zukünftige)
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, automatic_payment_processed, payment_status, created_at, wallee_transaction_id')
      .eq('payment_status', 'authorized')
      .eq('automatic_payment_processed', false)
      .not('scheduled_payment_date', 'is', null)
    
    // Check overdue payments (should have been captured but weren't)
    const { data: overduePayments, error: overdueError } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, automatic_payment_processed, payment_status, created_at, wallee_transaction_id')
      .eq('payment_status', 'authorized')
      .eq('automatic_payment_processed', false)
      .not('scheduled_payment_date', 'is', null)
      .lt('scheduled_payment_date', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour ago
    
    // Check payments waiting for authorization
    const { data: waitingAuthPayments, error: waitingAuthError } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_authorization_date, payment_status, created_at')
      .eq('payment_status', 'pending')
      .eq('automatic_payment_consent', true)
      .not('scheduled_authorization_date', 'is', null)
      .lte('scheduled_authorization_date', now.toISOString())
    
    // Get recent automatic payments that were processed
    const { data: processedPayments, error: processedError } = await supabase
      .from('payments')
      .select('id, appointment_id, automatic_payment_processed_at, payment_status, created_at')
      .eq('automatic_payment_processed', true)
      .order('automatic_payment_processed_at', { ascending: false })
      .limit(10)
    
    // Count payments by status
    const { data: paymentStats, error: statsError } = await supabase
      .from('payments')
      .select('payment_status, automatic_payment_processed, automatic_payment_consent')
    
    const stats = {
      total: paymentStats?.length || 0,
      pending: paymentStats?.filter(p => p.payment_status === 'pending').length || 0,
      authorized: paymentStats?.filter(p => p.payment_status === 'authorized').length || 0,
      completed: paymentStats?.filter(p => p.payment_status === 'completed').length || 0,
      withAutomaticConsent: paymentStats?.filter(p => (p as any).automatic_payment_consent === true).length || 0,
      processed: paymentStats?.filter(p => p.automatic_payment_processed === true).length || 0
    }
    
    return {
      success: true,
      timestamp: now.toISOString(),
      cronJobs: {
        'cleanup-expired-invitations': {
          path: '/api/cron/cleanup-expired-invitations',
          schedule: '0 2 * * *', // Daily at 2 AM
          description: 'Removes expired invitation links',
          nextRun: getNextCronTime('0 2 * * *')
        },
        'calculate-availability': {
          path: '/api/cron/calculate-availability',
          schedule: '0 2 * * *', // Daily at 2 AM
          description: 'Recalculates available booking slots for all staff members',
          nextRun: getNextCronTime('0 2 * * *')
        },
        'sync-sari-courses': {
          path: '/api/cron/sync-sari-courses',
          schedule: '0 * * * *', // Every hour
          description: 'Syncs courses from SARI system',
          nextRun: getNextCronTime('0 * * * *')
        },
        'process-automatic-payments': {
          path: '/api/cron/process-automatic-payments',
          schedule: '0 * * * *', // Every hour
          description: 'Captures authorized payments and authorizes pending payments',
          nextRun: getNextCronTime('0 * * * *'),
          pendingPayments: pendingPayments?.length || 0,
          overduePayments: overduePayments?.length || 0,
          waitingAuth: waitingAuthPayments?.length || 0,
          recentProcessed: processedPayments?.length || 0
        },
        'sync-external-calendars': {
          path: '/api/cron/sync-external-calendars',
          schedule: '0 0 * * *', // Daily at midnight
          description: 'Syncs external calendar integrations',
          nextRun: getNextCronTime('0 0 * * *')
        }
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
        note: 'Cron jobs are configured in vercel.json. Check Vercel dashboard for execution logs.'
      }
    }
  } catch (error: any) {
    console.error('❌ Error checking cron status:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to check cron status'
    })
  }
})

// Helper function to calculate next cron run time
function getNextCronTime(cronExpression: string): string {
  // Simple calculation for common patterns
  // "0 * * * *" = every hour at minute 0
  // "0 0 * * *" = daily at midnight
  // "0 2 * * *" = daily at 2 AM
  
  const now = new Date()
  const next = new Date(now)
  
  if (cronExpression === '0 * * * *') {
    // Next hour at minute 0
    next.setHours(now.getHours() + 1, 0, 0, 0)
  } else if (cronExpression === '0 0 * * *') {
    // Next midnight
    next.setDate(now.getDate() + 1)
    next.setHours(0, 0, 0, 0)
  } else if (cronExpression === '0 2 * * *') {
    // Next 2 AM
    next.setHours(2, 0, 0, 0)
    if (next <= now) {
      // If 2 AM has already passed today, schedule for tomorrow
      next.setDate(now.getDate() + 1)
    }
  }
  
  return next.toISOString()
}

