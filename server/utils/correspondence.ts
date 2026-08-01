// Shared helpers for correspondence APIs: auth gate, recipient snapshot, PDF assembly.

import { createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { formatTenantContactPerson } from '~/server/utils/invoice-pdf'
import { loadTenantLogoForPdf, resolveTenantWideLogoUrl } from '~/server/utils/tenant-logo-for-pdf'
import {
  generateCorrespondencePdf,
  type CorrespondencePdfData,
} from '~/server/utils/correspondence-pdf'

export type CorrespondenceStaff = {
  id: string
  tenant_id: string
  role: string
  first_name?: string | null
  last_name?: string | null
}

export async function requireCorrespondenceStaff(event: any): Promise<CorrespondenceStaff> {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, role, first_name, last_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role) || !profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  return profile as CorrespondenceStaff
}

export interface RecipientSnapshot {
  user_id: string | null
  company_id: string | null
  recipient_name: string
  billing_company_name: string
  billing_street: string
  billing_zip: string
  billing_city: string
  billing_email: string
}

export async function resolveRecipientSnapshot(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  opts: { user_id?: string | null; company_id?: string | null }
): Promise<RecipientSnapshot> {
  const userId = opts.user_id || null
  const companyId = opts.company_id || null
  if (!userId && !companyId) {
    throw createError({ statusCode: 400, statusMessage: 'user_id or company_id required' })
  }

  let recipient_name = ''
  let billing_company_name = ''
  let billing_street = ''
  let billing_zip = ''
  let billing_city = ''
  let billing_email = ''

  if (companyId) {
    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name, contact_person, email, street, zip, city, tenant_id')
      .eq('id', companyId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error || !company) {
      throw createError({ statusCode: 404, statusMessage: 'Company not found' })
    }
    billing_company_name = company.name || ''
    recipient_name = (company.contact_person || company.name || '').trim()
    billing_street = company.street || ''
    billing_zip = company.zip || ''
    billing_city = company.city || ''
    billing_email = company.email || ''
  }

  if (userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, street, street_nr, zip, city, tenant_id')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (error || !user) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    recipient_name = fullName || user.email || 'Empfänger'
    if (!companyId) {
      billing_street = [user.street, user.street_nr].filter(Boolean).join(' ')
      billing_zip = user.zip || ''
      billing_city = user.city || ''
      billing_email = user.email || ''
    } else if (!billing_email) {
      billing_email = user.email || ''
    }
  }

  return {
    user_id: userId,
    company_id: companyId,
    recipient_name,
    billing_company_name,
    billing_street,
    billing_zip,
    billing_city,
    billing_email,
  }
}

const TENANT_SELECT =
  'name, legal_company_name, contact_email, contact_person_first_name, contact_person_last_name, invoice_street, invoice_street_nr, invoice_zip, invoice_city, logo_wide_url, invoice_window_side, primary_color, from_email, resend_domain_verified'

export async function buildCorrespondencePdfFromRow(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: {
    reference_number: string
    letter_date: string
    document_title?: string | null
    subject: string
    body: string
    salutation?: string | null
    closing?: string | null
    their_reference?: string | null
    recipient_name?: string | null
    billing_company_name?: string | null
    billing_street?: string | null
    billing_zip?: string | null
    billing_city?: string | null
    tenant_id: string
  },
  opts?: { signerName?: string | null }
): Promise<{ pdfBuffer: Buffer; tenantName: string; tenant: any }> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('id', row.tenant_id)
    .single()

  const logo = await loadTenantLogoForPdf(resolveTenantWideLogoUrl(tenant as any))
  const tenantStreet = [(tenant as any)?.invoice_street?.trim(), (tenant as any)?.invoice_street_nr?.trim()]
    .filter(Boolean)
    .join(' ')
  const tenantName = (tenant as any)?.legal_company_name || (tenant as any)?.name || ''

  const pdfData: CorrespondencePdfData = {
    referenceNumber: row.reference_number,
    letterDate: row.letter_date,
    documentTitle: row.document_title || 'BRIEF',
    subject: row.subject,
    salutation: row.salutation,
    body: row.body,
    closing: row.closing,
    theirReference: row.their_reference,
    tenantName,
    tenantStreet,
    tenantZip: (tenant as any)?.invoice_zip || '',
    tenantCity: (tenant as any)?.invoice_city || '',
    tenantEmail: (tenant as any)?.contact_email || '',
    tenantContactPerson: formatTenantContactPerson(tenant as any),
    tenantLogoBase64: logo?.base64 || null,
    customerName: row.recipient_name || '',
    billingCompanyName: row.billing_company_name || '',
    billingStreet: row.billing_street || '',
    billingZip: row.billing_zip || '',
    billingCity: row.billing_city || '',
    windowSide: (tenant as any)?.invoice_window_side === 'right' ? 'right' : 'left',
    signerName: opts?.signerName || null,
  }

  const pdfBuffer = await generateCorrespondencePdf(pdfData)
  return { pdfBuffer, tenantName, tenant }
}

export function buildCorrespondenceEmailHtml(opts: {
  recipientName: string
  subject: string
  body: string
  referenceNumber: string
  tenantName: string
  primaryColor?: string | null
}): string {
  const brand = opts.primaryColor || '#1E40AF'
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const paragraphs = opts.body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:${brand};padding:20px 24px;">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Brief</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">${escape(opts.subject)}</h1>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:15px;color:#111827;">Guten Tag ${escape(opts.recipientName)},</p>
      ${paragraphs || '<p style="margin:0 0 14px;font-size:15px;color:#374151;">Sie finden den Brief als PDF im Anhang.</p>'}
      <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">Referenz ${escape(opts.referenceNumber)} · ${escape(opts.tenantName)}</p>
    </div>
  </div>
</body></html>`
}

export function todayZurichDate(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
}
