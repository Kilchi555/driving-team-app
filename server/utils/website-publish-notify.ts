/**
 * Notify Simy superadmins when a tenant publishes (or re-publishes) their website.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

const FALLBACK_NOTIFY = process.env.SIMY_WEBSITE_NOTIFY_EMAIL || 'info@simy.ch'

export async function notifySuperadminsWebsitePublished(opts: {
  tenantId: string
  tenantName: string
  tenantSlug: string
  subdomain: string
  liveUrl: string
  previewUrl: string
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { data: supers } = await supabase
      .from('users')
      .select('email')
      .in('role', ['super_admin', 'superadmin'])
      .eq('is_active', true)
      .not('email', 'is', null)

    const emails = Array.from(
      new Set(
        (supers || [])
          .map((u: any) => String(u.email || '').trim().toLowerCase())
          .filter((e: string) => e.includes('@')),
      ),
    )

    const to = emails.length ? emails : [FALLBACK_NOTIFY]
    const reviewUrl = `https://app.simy.ch/tenant-admin/websites/${opts.tenantId}`

    await sendEmail({
      to,
      subject: `Website published: ${opts.tenantName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0c1222">
          <h2 style="margin:0 0 12px">Tenant hat Website veröffentlicht</h2>
          <p><strong>${opts.tenantName}</strong> (${opts.tenantSlug}) ist live und zur Prüfung bereit.</p>
          <ul>
            <li><a href="${opts.liveUrl}">Live</a></li>
            <li><a href="${opts.previewUrl}">Preview</a></li>
            <li><a href="${reviewUrl}">Superadmin prüfen</a></li>
          </ul>
          <p style="color:#5b6577;font-size:13px">Die Site ist sofort öffentlich. Bitte kurz auf Content/SEO/Brand checken.</p>
        </div>
      `,
    })
  } catch (err: any) {
    logger.warn('Website publish notify failed (non-blocking):', err?.message || err)
  }
}
