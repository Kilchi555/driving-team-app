/**
 * DEBUG / one-off: Send the tenant affiliate intro email.
 *
 * POST /api/debug/send-tenant-affiliate-intro
 * Body: { recipient_email: string, first_name?: string, tenant_name?: string }
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { sendEmail } from '~/server/utils/email'
import { buildTenantAffiliateIntroEmail } from '~/server/utils/tenant-affiliate-intro-email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const recipientEmail = typeof body?.recipient_email === 'string' ? body.recipient_email.trim() : ''
  if (!recipientEmail || !recipientEmail.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'recipient_email is required' })
  }

  const supabase = getSupabaseAdmin()
  const tenantId = typeof body?.tenant_id === 'string' ? body.tenant_id.trim() : null
  const terms = tenantId
    ? await getTenantTerminology(supabase, tenantId)
    : undefined

  const { subject, html } = buildTenantAffiliateIntroEmail({
    firstName: body?.first_name || 'Pascal',
    tenantName: body?.tenant_name || null,
    ctaUrl: body?.cta_url || null,
    terms,
  })

  const testSubject = subject.startsWith('[TEST]') ? subject : `[TEST] ${subject}`

  await sendEmail({
    to: recipientEmail,
    subject: testSubject,
    senderName: 'Pascal von Simy',
    html,
  })

  logger.debug('📧 Tenant affiliate intro sent to', recipientEmail)

  return { success: true, to: recipientEmail, subject: testSubject }
})
