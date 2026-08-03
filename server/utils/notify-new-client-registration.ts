/**
 * Notify tenant admins when a new client self-registers.
 * Call from every public client registration path (non-blocking / non-fatal).
 */

import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { logger } from '~/utils/logger'
import {
  buildBrandedEmailShell,
  displayName,
  emailCtaButton,
  emailDetailBox,
  emailDetailRow,
  escapeAttr,
  escapeHtml,
} from '~/server/utils/branded-email'

export interface NotifyNewClientRegistrationParams {
  tenantId: string
  clientUserId: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  categories?: string[] | null
  /** e.g. register, booking, shop, onboarding — for subject clarity only */
  source?: string
}

const SOURCE_LABELS: Record<string, string> = {
  register: 'Registrierungsseite',
  booking: 'Buchungsformular',
  shop: 'Shop',
  onboarding: 'Onboarding',
}

export async function notifyTenantAdminsNewClient(
  params: NotifyNewClientRegistrationParams,
): Promise<void> {
  const {
    tenantId,
    clientUserId,
    firstName,
    lastName,
    email,
    phone,
    categories,
    source,
  } = params

  try {
    const supabase = getSupabaseAdmin()

    const [{ data: tenant }, { data: admins }, terms] = await Promise.all([
      supabase
        .from('tenants')
        .select('name, slug, primary_color, from_email, resend_domain_verified, logo_wide_url, logo_url, logo_square_url')
        .eq('id', tenantId)
        .single(),
      supabase
        .from('users')
        .select('email, first_name')
        .eq('tenant_id', tenantId)
        .in('role', ['admin', 'tenant_admin'])
        .eq('is_active', true)
        .not('email', 'is', null),
      getTenantTerminology(supabase, tenantId),
    ])

    const adminEmails = [...new Set(
      (admins || [])
        .map((a) => (a.email || '').toLowerCase().trim())
        .filter(Boolean),
    )]

    if (adminEmails.length === 0) {
      logger.debug('notify-new-client: no admin emails for tenant', { tenantId })
      return
    }

    const tenantName = tenant?.name || terms.businessNoun
    const primaryColor = tenant?.primary_color || '#3B82F6'
    const rawLogo = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const logoUrl = rawLogo?.startsWith('data:') ? null : rawLogo

    const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
    const profileUrl = `${baseUrl}/admin/users/${clientUserId}`

    const clientName = `${firstName} ${lastName}`.trim() || email
    const categoryList = Array.isArray(categories)
      ? categories.filter(Boolean)
      : categories
        ? [String(categories)]
        : []
    const sourceLabel = source ? (SOURCE_LABELS[source] || source) : null

    const detailRows = [
      emailDetailRow(terms.client, escapeHtml(clientName)),
      emailDetailRow('E-Mail', `<a href="mailto:${escapeAttr(email)}" style="color:${primaryColor};">${escapeHtml(email)}</a>`),
      phone ? emailDetailRow('Telefon', escapeHtml(phone)) : '',
      categoryList.length
        ? emailDetailRow('Kategorie', escapeHtml(categoryList.join(', ')))
        : '',
      sourceLabel ? emailDetailRow('Quelle', escapeHtml(sourceLabel)) : '',
    ].filter(Boolean).join('')

    const bodyHtml = `
      <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
        Ein neuer ${escapeHtml(terms.client)} hat sich bei <strong>${displayName(tenantName)}</strong> registriert.
      </p>
      ${emailDetailBox(primaryColor, detailRows)}
      ${emailCtaButton(profileUrl, `${terms.client}-Profil öffnen`, primaryColor)}
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
        Oder öffne: <a href="${escapeAttr(profileUrl)}" style="color:${primaryColor};">${escapeHtml(profileUrl)}</a>
      </p>
    `

    const html = buildBrandedEmailShell({
      title: `Neuer ${escapeHtml(terms.client)}`,
      subtitle: escapeHtml(clientName),
      tenantName,
      primaryColor,
      logoUrl,
      bodyHtml,
      documentTitle: `Neuer ${terms.client}: ${clientName}`,
    })

    await sendEmail({
      to: adminEmails,
      subject: `Neuer ${terms.client}: ${clientName}`,
      fromName: tenantName,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
      html,
    })

    logger.debug('✅ Tenant admins notified about new client registration', {
      tenantId,
      clientUserId,
      adminCount: adminEmails.length,
      source: source || null,
    })
  } catch (err: any) {
    // Never fail registration because of a notification issue
    logger.warn('⚠️ Failed to notify admins about new client (non-critical):', err?.message || err)
  }
}
