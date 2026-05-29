/**
 * POST /api/admin/email-domain/setup
 * Registers a custom from-email domain in Resend, saves DNS records + domain ID to the tenant.
 * The tenant must then add the DNS records to their domain registrar.
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

interface SetupBody {
  fromEmail: string // e.g. "info@driving-team.ch"
}

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile?.tenant_id || !['admin', 'owner', 'super_admin'].includes(profile.role ?? '')) {
    throw createError({ statusCode: 403, statusMessage: 'Admin required' })
  }

  const body = await readBody<SetupBody>(event)
  const { fromEmail } = body ?? {}

  // Validate email format
  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  const domain = fromEmail.split('@')[1].toLowerCase()

  // Call Resend API to register domain
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) throw createError({ statusCode: 500, statusMessage: 'RESEND_API_KEY not configured' })

  const resendRes = await $fetch<any>('https://api.resend.com/domains', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: { name: domain },
  }).catch((err: any) => {
    // Resend returns 409 if domain already registered
    if (err?.response?.status === 409) return null
    throw createError({ statusCode: 502, statusMessage: `Resend error: ${err?.data?.message || err.message}` })
  })

  let domainId: string
  let dnsRecords: any[]

  if (resendRes) {
    domainId = resendRes.id
    dnsRecords = resendRes.records ?? []
  } else {
    // Domain already exists – fetch it
    const listRes = await $fetch<any>('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    })
    const existing = (listRes?.data ?? []).find((d: any) => d.name === domain)
    if (!existing) throw createError({ statusCode: 502, statusMessage: 'Domain konnte nicht registriert werden' })
    domainId = existing.id

    // Fetch records from detail endpoint
    const detailRes = await $fetch<any>(`https://api.resend.com/domains/${domainId}`, {
      headers: { Authorization: `Bearer ${resendApiKey}` },
    })
    dnsRecords = detailRes?.records ?? []
  }

  // Save to tenant
  await supabase
    .from('tenants')
    .update({
      from_email: fromEmail,
      resend_domain_id: domainId,
      resend_domain_verified: false,
    })
    .eq('id', profile.tenant_id)

  return {
    success: true,
    domainId,
    domain,
    dnsRecords,
  }
})
