import { randomBytes } from 'node:crypto'
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { validateEmail } from '~/server/utils/validators'
import { isAccountantAccess, normalizeAccountantEmail, accountantAccessLabel } from '~/server/utils/accountant'

function appBaseUrl(event: Parameters<typeof getHeader>[0]) {
  const envBase = process.env.NUXT_PUBLIC_SITE_URL || process.env.NUXT_PUBLIC_APP_URL
  const host = getHeader(event, 'host')
  const proto = getHeader(event, 'x-forwarded-proto') || 'https'
  if (envBase) return envBase.replace(/\/$/, '')
  if (host && !host.includes('localhost')) return `${proto}://${host}`
  return 'https://app.simy.ch'
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] as string))
}

function inviteEmailHtml(params: { tenantName: string; accessLabel: string; link: string; existing: boolean }) {
  const action = params.existing ? 'Anmelden' : 'Konto erstellen'
  const name = escapeHtml(params.tenantName)
  return `
    <p>Sie wurden als Treuhänder für <strong>${name}</strong> eingeladen.</p>
    <p>Zugang: <strong>${params.accessLabel}</strong></p>
    <p>Sie sehen Buchhaltung, MWST und Lohn. ${params.existing ? 'Melden Sie sich mit Ihrem bestehenden Konto an.' : 'Erstellen Sie Ihr Konto über den Link.'}</p>
    <p><a href="${params.link}">${action}</a></p>
    <p style="color:#64748b;font-size:12px">Dieser Zugang kann vom Admin jederzeit angepasst oder entzogen werden.</p>
  `
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminOnly(event)
  const body = await readBody(event)
  const email = normalizeAccountantEmail(body?.email)
  const access = body?.access
  if (!validateEmail(email).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Gültige E-Mail erforderlich' })
  }
  if (!isAccountantAccess(access)) {
    throw createError({ statusCode: 400, statusMessage: 'Zugang muss read oder write sein' })
  }

  const supabase = getSupabaseAdmin()
  const { data: existingGrant } = await supabase
    .from('accountant_grants')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('email', email)
    .is('revoked_at', null)
    .maybeSingle()
  if (existingGrant) {
    throw createError({ statusCode: 409, statusMessage: 'Dieser Treuhänder hat bereits Zugang' })
  }

  const { data: sameTenantUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('tenant_id', profile.tenant_id)
    .eq('email', email)
    .is('deleted_at', null)
    .maybeSingle()
  if (sameTenantUser) {
    throw createError({ statusCode: 409, statusMessage: 'Diese E-Mail gehört bereits zu einem Benutzer dieses Mandanten' })
  }

  const { data: accountantUser } = await supabase
    .from('users')
    .select('id, role, email')
    .eq('email', email)
    .eq('role', 'accountant')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (!accountantUser) {
    const { data: otherUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    if (otherUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail ist bereits als anderer Benutzer registriert. Bitte eine separate Treuhänder-Adresse verwenden.',
      })
    }
  }

  const token = randomBytes(24).toString('hex')
  const { data: grant, error } = await supabase
    .from('accountant_grants')
    .insert({
      tenant_id: profile.tenant_id,
      email,
      access,
      invite_token: token,
      invited_by: profile.id,
      user_id: accountantUser?.id ?? null,
    })
    .select('id, email, access, invited_at, accepted_at, user_id')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, slug')
    .eq('id', profile.tenant_id)
    .single()

  const base = appBaseUrl(event)
  const existing = !!accountantUser
  const link = existing
    ? (tenant?.slug ? `${base}/${tenant.slug}` : `${base}/login`)
    : `${base}/register/accountant?token=${token}`

  try {
    await sendEmail({
      to: email,
      subject: `Treuhänder-Zugang – ${tenant?.name || 'Simy'}`,
      html: inviteEmailHtml({
        tenantName: tenant?.name || 'Mandant',
        accessLabel: accountantAccessLabel(access),
        link,
        existing,
      }),
    })
  } catch (err: unknown) {
    return {
      success: true,
      data: grant,
      warning: 'Einladung gespeichert, E-Mail konnte nicht gesendet werden.',
      invite_link: link,
    }
  }

  return { success: true, data: grant }
})
