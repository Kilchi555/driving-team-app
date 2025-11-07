// server/api/admin/cron-status.get.ts
// Admin endpoint to check cron job status and execution history

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
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
    
    // Check pending automatic payments
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, automatic_payment_processed, payment_status, created_at')
      .eq('automatic_payment_consent', true)
      .eq('automatic_payment_processed', false)
      .not('scheduled_payment_date', 'is', null)
      .lte('scheduled_payment_date', now.toISOString())
    
    // Check overdue payments (should have been processed but weren't)
    const { data: overduePayments, error: overdueError } = await supabase
      .from('payments')
      .select('id, appointment_id, scheduled_payment_date, automatic_payment_processed, payment_status, created_at')
      .eq('automatic_payment_consent', true)
      .eq('automatic_payment_processed', false)
      .not('scheduled_payment_date', 'is', null)
      .lt('scheduled_payment_date', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // 1 hour ago
    
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
      .select('payment_status, automatic_payment_processed')
    
    const stats = {
      total: paymentStats?.length || 0,
      pending: paymentStats?.filter(p => p.payment_status === 'pending').length || 0,
      completed: paymentStats?.filter(p => p.payment_status === 'completed').length || 0,
      withAutomaticConsent: paymentStats?.filter(p => (p as any).automatic_payment_consent === true).length || 0,
      processed: paymentStats?.filter(p => p.automatic_payment_processed === true).length || 0
    }
    
    return {
      success: true,
      timestamp: now.toISOString(),
      cronJobs: {
        'process-automatic-payments': {
          path: '/api/cron/process-automatic-payments',
          schedule: '0 * * * *', // Every hour
          description: 'Processes automatic payments scheduled for the current time',
          nextRun: getNextCronTime('0 * * * *'),
          pendingPayments: pendingPayments?.length || 0,
          overduePayments: overduePayments?.length || 0,
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
  
  const now = new Date()
  const next = new Date(now)
  
  if (cronExpression === '0 * * * *') {
    // Next hour
    next.setHours(now.getHours() + 1, 0, 0, 0)
  } else if (cronExpression === '0 0 * * *') {
    // Next midnight
    next.setDate(now.getDate() + 1)
    next.setHours(0, 0, 0, 0)
  }
  
  return next.toISOString()
}

