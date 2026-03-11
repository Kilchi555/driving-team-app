/**
 * Cron Job: Process Pending Affiliate Rewards
 *
 * Runs once daily as a fallback in case the Wallee webhook missed triggering
 * the affiliate reward (e.g. app was down, webhook failed).
 *
 * Logic:
 * - Find affiliate_referrals with status = 'pending'
 * - Check if the referred user has at least one completed payment
 * - If yes, trigger /api/affiliate/process-reward (idempotent)
 *
 * Security:
 * ✅ Layer 1: Auth - Vercel CRON_SECRET verification
 * ✅ Layer 2: Rate Limiting - Prevents re-trigger within 60 seconds
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'

export default defineEventHandler(async (event) => {
  const startTime = new Date()
  let processedCount = 0
  let creditedCount = 0

  try {
    if (!verifyCronToken(event)) {
      logger.error('🚨 Unauthorized cron request to process-affiliate-rewards')
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Invalid cron token' })
    }

    const supabase = getSupabaseAdmin()

    const canRun = await checkCronRateLimit(supabase, 'process-affiliate-rewards', 60)
    if (!canRun) {
      logger.warn('⏱️ Rate limited: process-affiliate-rewards ran too recently')
      return { success: true, message: 'Rate limited', processed: 0, credited: 0 }
    }

    // Find all pending referrals
    const { data: pendingReferrals, error } = await supabase
      .from('affiliate_referrals')
      .select('id, referred_user_id, tenant_id')
      .eq('status', 'pending')

    if (error) {
      throw new Error(`Failed to fetch pending referrals: ${error.message}`)
    }

    if (!pendingReferrals || pendingReferrals.length === 0) {
      logger.info('✅ No pending affiliate referrals to process')
      await logCronExecution(supabase, 'process-affiliate-rewards', 'success', {
        startedAt: startTime,
        completedAt: new Date(),
        details: { processed: 0, credited: 0 }
      })
      return { success: true, message: 'No pending referrals', processed: 0, credited: 0 }
    }

    logger.info(`🔍 Found ${pendingReferrals.length} pending affiliate referral(s)`)

    for (const referral of pendingReferrals) {
      processedCount++

      // Check if the referred user has a completed payment linked to an appointment
      const { data: completedPayment } = await supabase
        .from('payments')
        .select('id, appointment_id, tenant_id')
        .eq('user_id', referral.referred_user_id)
        .eq('tenant_id', referral.tenant_id)
        .eq('payment_status', 'completed')
        .not('appointment_id', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!completedPayment) {
        logger.debug(`⏭️ No completed payment yet for referred user ${referral.referred_user_id}`)
        continue
      }

      // Trigger the reward (idempotent – safe to call even if already credited)
      try {
        const result = await $fetch('/api/affiliate/process-reward', {
          method: 'POST',
          body: {
            appointment_id: completedPayment.appointment_id,
            user_id: referral.referred_user_id,
            tenant_id: referral.tenant_id,
          }
        }) as any

        if (result?.credited) {
          creditedCount++
          logger.info(`✅ Affiliate reward credited for referred user ${referral.referred_user_id}`)
        } else {
          logger.debug(`⏭️ Reward not credited (reason: ${result?.reason}) for user ${referral.referred_user_id}`)
        }
      } catch (rewardErr: any) {
        logger.warn(`⚠️ Failed to process reward for referral ${referral.id}:`, rewardErr?.message)
      }
    }

    await logCronExecution(supabase, 'process-affiliate-rewards', 'success', {
      startedAt: startTime,
      completedAt: new Date(),
      details: { processed: processedCount, credited: creditedCount }
    })

    logger.info(`✅ Affiliate rewards cron done: ${processedCount} checked, ${creditedCount} credited`)

    return {
      success: true,
      message: `Processed ${processedCount} referrals, credited ${creditedCount}`,
      processed: processedCount,
      credited: creditedCount
    }

  } catch (error: any) {
    logger.error('❌ process-affiliate-rewards cron error:', error.message)

    try {
      const supabase = getSupabaseAdmin()
      await logCronExecution(getSupabaseAdmin(), 'process-affiliate-rewards', 'error', {
        startedAt: startTime,
        completedAt: new Date(),
        error: error.message
      })
    } catch {}

    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.message })
  }
})
