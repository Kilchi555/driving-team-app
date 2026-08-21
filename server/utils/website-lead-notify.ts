/**
 * Tell the tenant immediately when someone submits the public website form.
 * Email always; SMS if a phone is on file (no WhatsApp send API).
 */
import { sendEmail } from '~/server/utils/email'
import { sendSMS } from '~/server/utils/sms'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { whatsappUrlFromPhone } from '~/server/utils/website-premium'
import {
  buildBrandedEmailShell,
  displayName,
  emailCtaButton,
  emailDetailBox,
  emailDetailRow,
  escapeAttr,
  escapeHtml,
} from '~/server/utils/branded-email'
import { logger } from '~/utils/logger'

export async function notifyTenantWebsiteLead(opts: {
  tenantId: string
  firstName: string
  lastName?: string | null
  email: string
  phone?: string | null
  message?: string | null
  category?: string | null
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const [{ data: tenant }, { data: admins }] = await Promise.all([
      supabase
        .from('tenants')
        .select(
          'name, contact_email, contact_phone, phone, primary_color, from_email, resend_domain_verified, logo_wide_url, logo_url, logo_square_url',
        )
        .eq('id', opts.tenantId)
        .maybeSingle(),
      supabase
        .from('users')
        .select('email, phone, first_name')
        .eq('tenant_id', opts.tenantId)
        .in('role', ['admin', 'tenant_admin'])
        .eq('is_active', true),
    ])

    const name = `${opts.firstName} ${opts.lastName || ''}`.trim() || opts.email
    const tenantName = tenant?.name || 'Website'
    const primaryColor = tenant?.primary_color || '#0f766e'
    const inboxUrl = 'https://app.simy.ch/admin/website'
    const waCustomer = whatsappUrlFromPhone(opts.phone)
    const mailto = `mailto:${encodeURIComponent(opts.email)}?subject=${encodeURIComponent(`Deine Anfrage bei ${tenantName}`)}`

    const emails = Array.from(
      new Set(
        [
          tenant?.contact_email,
          ...(admins || []).map((a: any) => a.email),
        ]
          .map((e) => String(e || '').trim().toLowerCase())
          .filter((e) => e.includes('@')),
      ),
    )

    if (emails.length) {
      const rawLogo = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
      const logoUrl = rawLogo?.startsWith('data:') ? null : rawLogo
      const detailRows = [
        emailDetailRow('Name', escapeHtml(name)),
        emailDetailRow(
          'E-Mail',
          `<a href="${escapeAttr(mailto)}" style="color:${primaryColor};">${escapeHtml(opts.email)}</a>`,
        ),
        opts.phone ? emailDetailRow('Telefon', escapeHtml(opts.phone)) : '',
        opts.category && opts.category !== 'contact'
          ? emailDetailRow('Thema', escapeHtml(opts.category))
          : '',
        opts.message ? emailDetailRow('Nachricht', escapeHtml(opts.message)) : '',
      ]
        .filter(Boolean)
        .join('')

      const replyHtml = waCustomer
        ? emailCtaButton(waCustomer, 'Per WhatsApp antworten', primaryColor)
        : emailCtaButton(mailto, 'Per E-Mail antworten', primaryColor)

      const html = buildBrandedEmailShell({
        title: 'Neue Website-Anfrage',
        subtitle: escapeHtml(name),
        tenantName,
        primaryColor,
        logoUrl,
        documentTitle: `Neue Anfrage: ${name}`,
        bodyHtml: `
          <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
            Jemand hat das Formular auf der Website von <strong>${displayName(tenantName)}</strong> ausgefüllt.
          </p>
          ${emailDetailBox(primaryColor, detailRows)}
          ${replyHtml}
          ${emailCtaButton(inboxUrl, 'Alle Anfragen öffnen', primaryColor)}
        `,
      })

      await sendEmail({
        to: emails,
        subject: `Neue Anfrage: ${name}`,
        fromName: tenantName,
        fromEmail: tenant?.from_email ?? null,
        domainVerified: tenant?.resend_domain_verified ?? false,
        html,
      })
    }

    const phones = Array.from(
      new Set(
        [tenant?.contact_phone || tenant?.phone, ...(admins || []).map((a: any) => a.phone)]
          .map((p) => String(p || '').trim())
          .filter(Boolean),
      ),
    )
    const smsText = `Neue Website-Anfrage: ${name}${opts.phone ? ` · ${opts.phone}` : ''} · ${opts.email}. ${inboxUrl}`
    for (const phone of phones.slice(0, 3)) {
      try {
        await sendSMS({ to: phone, message: smsText.slice(0, 300), senderName: tenantName })
      } catch (err: any) {
        logger.warn('[website-lead] SMS skipped', err?.message || err)
      }
    }
  } catch (err: any) {
    logger.warn('[website-lead] notify failed (non-blocking)', err?.message || err)
  }
}
