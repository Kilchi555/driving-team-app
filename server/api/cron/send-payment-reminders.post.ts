// ============================================
// Cron Job: Send Payment Reminders
// ============================================
// Sendet Zahlungs-Erinnerungen 24h vor dem Termin
// Verschiedene Emails je nach Zahlungsmethode & Status

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  // ============ DISABLED - WAITING FOR RPC FUNCTION ============
  // This cron job is temporarily disabled because it has a critical bug:
  // It sends reminders for ALL pending payments, not just those 24h before appointment
  // 
  // TODO: 
  // 1. Run migration: create_payment_reminders_function.sql (creates RPC function)
  // 2. Re-enable this cron job to use the RPC function
  // 3. RPC will filter payments correctly to only those 23-25h before appointment
  
  return {
    success: false,
    message: 'Payment reminders cron job is disabled - waiting for RPC function setup',
    status: 'DISABLED_PENDING_RPC_SETUP'
  }
})
