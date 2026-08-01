/**
 * DEBUG: Send Wave-1 terminology smoke emails (welcome / proposal / course).
 *
 * POST /api/debug/send-wave1-terminology-smoke
 * Body: { to?: string }  // default info@simy.ch
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { sendEmail } from '~/server/utils/email'
import { sendWelcomeEmail } from '~/server/utils/send-welcome-email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import {
  buildBrandedEmailShell,
  displayName,
  emailDetailBox,
  emailDetailRow,
  emailSignature,
  emailStatusBox,
  escapeHtml,
} from '~/server/utils/branded-email'

const GEM = '660b72a9-c67b-4763-85d7-b7ba6605e59e'
const SIMY = 'fdf9db57-9787-4cc4-ab61-d330c726c391'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({}))
  const to = (typeof body?.to === 'string' && body.to.includes('@'))
    ? body.to.trim()
    : 'info@simy.ch'

  const supabase = getSupabaseAdmin()
  const results: Array<{ kind: string; tenant: string; ok: boolean; error?: string }> = []

  async function sendOne(kind: string, tenantLabel: string, fn: () => Promise<void>) {
    try {
      await fn()
      results.push({ kind, tenant: tenantLabel, ok: true })
    } catch (e: any) {
      results.push({ kind, tenant: tenantLabel, ok: false, error: e?.message || String(e) })
      logger.warn(`⚠️ Smoke failed ${kind}/${tenantLabel}:`, e?.message)
    }
  }

  for (const [tenantId, label] of [[GEM, 'Gemperli'], [SIMY, 'Simy']] as const) {
    const terms = await getTenantTerminology(supabase, tenantId)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, business_type, contact_email, logo_wide_url, logo_url, logo_square_url')
      .eq('id', tenantId)
      .single()

    const tenantName = tenant?.name || terms.businessNoun
    const primaryColor = tenant?.primary_color || '#2563eb'
    const rawLogo = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const logoUrl = rawLogo?.startsWith?.('data:') ? null : rawLogo

    await sendOne('welcome-client', label, () => sendWelcomeEmail({
      role: 'client',
      to,
      firstName: 'Pascal',
      tenantId,
      tenantName,
      tenantSlug: tenant?.slug,
      tenantPrimaryColor: primaryColor,
      businessType: tenant?.business_type,
    }))

    await sendOne('welcome-staff', label, () => sendWelcomeEmail({
      role: 'staff',
      to,
      firstName: 'Pascal',
      tenantId,
      tenantName,
      tenantSlug: tenant?.slug,
      tenantPrimaryColor: primaryColor,
      businessType: tenant?.business_type,
    }))

    await sendOne('booking-proposal', label, () => sendEmail({
      to,
      subject: `[TEST] Buchungsanfrage – ${tenantName}`,
      senderName: tenantName,
      html: buildBrandedEmailShell({
        title: 'Buchungsanfrage eingereicht',
        tenantName,
        primaryColor,
        logoUrl,
        bodyHtml: `
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo Pascal,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">vielen Dank für deine Buchungsanfrage! (Design-Smoke)</p>
          ${emailDetailBox(primaryColor, [
            emailDetailRow(terms.categoryLabel, 'Demo'),
            emailDetailRow('Dauer', '60 Minuten'),
            emailDetailRow('Standort', 'Test'),
            emailDetailRow(terms.staff, 'Max Muster'),
          ].join(''))}
          ${emailSignature(tenantName, tenant?.contact_email, primaryColor)}
        `,
      }),
    }))

    await sendOne('course-enrollment', label, () => sendEmail({
      to,
      subject: `[TEST] Anmeldebestätigung – ${tenantName}`,
      senderName: tenantName,
      html: buildBrandedEmailShell({
        title: 'Anmeldebestätigung',
        tenantName,
        primaryColor,
        logoUrl,
        bodyHtml: `
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo Pascal,</p>
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">deine Kursanmeldung ist bestätigt. (Design-Smoke)</p>
          ${emailStatusBox({
            bg: '#eff6ff',
            border: '#3b82f6',
            titleColor: '#1e40af',
            bodyColor: '#1e40af',
            title: `Anmeldung durch ${escapeHtml(tenantName)}`,
            bodyHtml: `Sie wurden durch ${displayName(tenantName)} für diesen Kurs angemeldet. Bei Fragen wenden Sie sich direkt an uns.`,
          })}
          ${emailStatusBox({
            bg: '#dcfce7',
            border: '#22c55e',
            titleColor: '#166534',
            bodyColor: '#166534',
            title: 'Zahlung: bereits bezahlt',
            bodyHtml: `Die Zahlung wurde von ${displayName(tenantName)} als erledigt markiert. Ihr Platz ist gesichert.`,
          })}
          <p style="font-size:12px;color:#6b7280;margin:16px 0 0;">Label-Check: staff=<strong>${escapeHtml(terms.staff)}</strong>, client=<strong>${escapeHtml(terms.client)}</strong>, appointment=<strong>${escapeHtml(terms.appointment)}</strong>, businessNoun=<strong>${escapeHtml(terms.businessNoun)}</strong></p>
          ${emailSignature(tenantName, tenant?.contact_email, primaryColor)}
        `,
      }),
    }))
  }

  return { success: true, to, results }
})
