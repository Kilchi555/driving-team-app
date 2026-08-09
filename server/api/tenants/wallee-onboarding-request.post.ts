// server/api/tenants/wallee-onboarding-request.post.ts
// Tenant requests Wallee onboarding. No form data needed — simy.ch team
// will contact the tenant and share the Wallee signup link directly.

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  buildBrandedEmailShell,
  displayName,
  emailCtaButton,
  emailDetailBox,
  emailDetailRow,
  emailSignature,
  emailStatusBox,
  escapeHtml,
} from '~/server/utils/branded-email'

const SIMY_PRIMARY = '#6000BD'
const ADMIN_TENANTS_URL = 'https://app.simy.ch/tenant-admin/tenants'

function buildTeamNotifyHtml(opts: {
  tenantName: string
  contactEmail: string
  contactPhone: string
  address: string
  tenantId: string
  receivedAt: string
}): string {
  const detailRows = [
    emailDetailRow('Unternehmen', escapeHtml(opts.tenantName)),
    emailDetailRow(
      'E-Mail',
      `<a href="mailto:${escapeHtml(opts.contactEmail)}" style="color:${SIMY_PRIMARY};text-decoration:none">${escapeHtml(opts.contactEmail)}</a>`,
    ),
    emailDetailRow('Telefon', escapeHtml(opts.contactPhone || '—')),
    emailDetailRow('Adresse', escapeHtml(opts.address || '—')),
    emailDetailRow('Tenant ID', `<code style="font-size:12px;background:#eef2ff;padding:2px 6px;border-radius:4px">${escapeHtml(opts.tenantId)}</code>`),
    emailDetailRow('Eingegangen', escapeHtml(opts.receivedAt)),
  ].join('')

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 8px">
      <strong>${displayName(opts.tenantName)}</strong> möchte Online-Zahlungen freischalten.
    </p>
    ${emailDetailBox(SIMY_PRIMARY, detailRows)}
    ${emailStatusBox({
      bg: '#fef3c7',
      border: '#f59e0b',
      titleColor: '#92400e',
      bodyColor: '#78350f',
      title: 'Nächster Schritt',
      bodyHtml: 'Wallee-Anmeldelink an den Tenant schicken, damit das Konto eingerichtet werden kann.',
    })}
    ${emailCtaButton(ADMIN_TENANTS_URL, 'Tenant in der Verwaltung öffnen', SIMY_PRIMARY)}
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;text-align:center">
      Oder direkt antworten an
      <a href="mailto:${escapeHtml(opts.contactEmail)}" style="color:${SIMY_PRIMARY}">${escapeHtml(opts.contactEmail)}</a>
    </p>
  `

  return buildBrandedEmailShell({
    title: 'Online-Zahlungen',
    subtitle: 'Neuer Onboarding-Wunsch',
    tenantName: 'Simy',
    primaryColor: SIMY_PRIMARY,
    documentTitle: `Wallee-Anfrage: ${opts.tenantName}`,
    bodyHtml,
  })
}

function buildTenantConfirmHtml(tenantName: string): string {
  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">Hallo,</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">
      wir haben deine Anfrage für <strong>${displayName(tenantName)}</strong> erhalten.
    </p>
    ${emailStatusBox({
      bg: '#ecfdf5',
      border: '#10b981',
      titleColor: '#065f46',
      bodyColor: '#047857',
      title: 'Was passiert als Nächstes?',
      bodyHtml: 'Unser Team meldet sich in Kürze per E-Mail mit dem Anmeldelink, damit du Online-Zahlungen (TWINT, Karte, Apple&nbsp;&amp;&nbsp;Google&nbsp;Pay) freischalten kannst.',
    })}
    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 8px">
      Bei Fragen erreichst du uns unter
      <a href="mailto:info@simy.ch" style="color:${SIMY_PRIMARY};font-weight:600">info@simy.ch</a>.
    </p>
    ${emailSignature('Pascal · Simy', 'info@simy.ch', SIMY_PRIMARY)}
  `

  return buildBrandedEmailShell({
    title: 'Anfrage erhalten',
    subtitle: `Online-Zahlungen · ${displayName(tenantName)}`,
    tenantName: 'Simy',
    primaryColor: SIMY_PRIMARY,
    documentTitle: 'Online-Zahlungen – Anfrage erhalten',
    bodyHtml,
  })
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }

  const tenantId = authUser.tenant_id as string
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Tenant ID missing' })

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, contact_phone, address, wallee_onboarding_status')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })

  if (tenant.wallee_onboarding_status === 'active') {
    throw createError({ statusCode: 409, statusMessage: 'Online-Zahlungen sind bereits aktiv.' })
  }
  if (tenant.wallee_onboarding_status === 'pending' || tenant.wallee_onboarding_status === 'pending_uid') {
    throw createError({ statusCode: 409, statusMessage: 'Dein Antrag wurde bereits eingereicht.' })
  }
  // not_started / skipped → allow new application

  await supabase
    .from('tenants')
    .update({
      wallee_onboarding_status: 'pending',
      wallee_applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)

  const receivedAt = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })

  // Notify simy team
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch',
      to: 'info@simy.ch',
      replyTo: tenant.contact_email || undefined,
      subject: `Online-Zahlungen: ${tenant.name}`,
      html: buildTeamNotifyHtml({
        tenantName: tenant.name,
        contactEmail: tenant.contact_email || '',
        contactPhone: tenant.contact_phone || '',
        address: tenant.address || '',
        tenantId,
        receivedAt,
      }),
    })
  } catch (e: any) {
    console.error('⚠️ Team-E-Mail fehlgeschlagen (non-fatal):', e.message)
  }

  // Confirmation to tenant
  try {
    const { sendEmail } = await import('~/server/utils/email')
    await sendEmail({
      to: tenant.contact_email,
      fromName: 'Simy',
      subject: 'Online-Zahlungen – wir melden uns in Kürze',
      html: buildTenantConfirmHtml(tenant.name),
    })
  } catch (e: any) {
    console.error('⚠️ Tenant-Bestätigung fehlgeschlagen (non-fatal):', e.message)
  }

  return { success: true, message: 'Anfrage eingegangen. Wir melden uns per E-Mail mit dem Wallee-Link.' }
})
