/**
 * POST /api/admin/invoices/link-company
 *
 * Sets invoices.company_id once, for one unlinked company invoice in the
 * caller's tenant. Does not overwrite an existing company, does not accept a
 * client tenant id, and does not write payment or amount columns.
 *
 * public.calculate_invoice_vat and public.update_invoice_status run on every
 * invoice UPDATE. The write is refused unless those triggers would leave
 * amounts and payment status unchanged, and the saved row is checked again.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import type { H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { readImpersonatorCookie } from '~/server/utils/account-switch'
import {
  ALREADY_LINKED_MESSAGE,
  AUDIT_FAILED_MESSAGE,
  COMPANY_NOT_FOUND_MESSAGE,
  CONCURRENT_CHANGE_MESSAGE,
  INVOICE_LINK_READ_COLUMNS,
  INVOICE_LINK_VERIFY_COLUMNS,
  INVOICE_NOT_FOUND_MESSAGE,
  TRIGGER_CHANGED_MESSAGE,
  assessCompanyInvoiceLink,
  buildCompanyLinkAuditDetails,
  invoicePreservationMatches,
  parseCompanyInvoiceLinkBody,
  utcDateString,
  type LinkableInvoiceRow,
} from '~/server/utils/company-invoice-link'

const AUDIT_ACTION = 'invoice.company_link'

function refusal(statusCode: number, message: string): never {
  throw createError({ statusCode, statusMessage: message, message })
}

function impersonationDetails(event: H3Event): Record<string, string> {
  try {
    const impersonator = readImpersonatorCookie(event)
    if (!impersonator) return {}
    return {
      impersonated_by: impersonator.actorUserId,
      impersonation_session_id: impersonator.sessionId,
    }
  } catch {
    return {}
  }
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const parsed = parseCompanyInvoiceLinkBody(await readBody(event))
  if (!parsed.ok) refusal(400, parsed.message)

  const supabase = getSupabaseAdmin()
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(INVOICE_LINK_READ_COLUMNS)
    .eq('id', parsed.value.invoiceId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (invoiceError) throw mapSupabaseError(invoiceError, 'link-company-invoice')
  if (!invoice || invoice.tenant_id !== profile.tenant_id) refusal(404, INVOICE_NOT_FOUND_MESSAGE)

  const row = invoice as LinkableInvoiceRow
  const decision = assessCompanyInvoiceLink(row, parsed.value.expectedUpdatedAt, utcDateString())
  if (!decision.ok) refusal(decision.refusal.statusCode, decision.refusal.message)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, tenant_id')
    .eq('id', parsed.value.companyId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (companyError) throw mapSupabaseError(companyError, 'link-company-invoice')
  if (!company || company.tenant_id !== profile.tenant_id) refusal(404, COMPANY_NOT_FOUND_MESSAGE)

  const linkedAt = new Date().toISOString()
  const { data: updatedRows, error: updateError } = await supabase
    .from('invoices')
    .update({ company_id: company.id, updated_at: linkedAt })
    .eq('id', row.id)
    .eq('tenant_id', profile.tenant_id)
    .is('company_id', null)
    .eq('updated_at', row.updated_at)
    .eq('document_kind', 'invoice')
    .eq('billing_type', 'company')
    .eq('status', row.status)
    .eq('payment_status', row.payment_status)
    .eq('subtotal_rappen', row.subtotal_rappen)
    .eq('vat_rate', row.vat_rate)
    .eq('vat_amount_rappen', row.vat_amount_rappen)
    .eq('discount_amount_rappen', row.discount_amount_rappen)
    .eq('total_amount_rappen', row.total_amount_rappen)
    .eq('paid_amount_rappen', row.paid_amount_rappen)
    .eq('due_date', row.due_date)
    .select(INVOICE_LINK_VERIFY_COLUMNS)

  if (updateError) throw mapSupabaseError(updateError, 'link-company-invoice')

  const updated = (updatedRows || []) as LinkableInvoiceRow[]
  if (updated.length !== 1) {
    const { data: current, error: rereadError } = await supabase
      .from('invoices')
      .select('id, company_id, updated_at')
      .eq('id', row.id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    if (rereadError) throw mapSupabaseError(rereadError, 'link-company-invoice')
    if (current?.company_id) refusal(409, ALREADY_LINKED_MESSAGE)
    refusal(409, CONCURRENT_CHANGE_MESSAGE)
  }

  const saved = updated[0]
  if (saved.company_id !== company.id || !invoicePreservationMatches(row, saved)) {
    const { data: reverted, error: revertError } = await supabase
      .from('invoices')
      .update({ company_id: null, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('tenant_id', profile.tenant_id)
      .eq('company_id', company.id)
      .eq('updated_at', linkedAt)
      .select('id, company_id')
    if (revertError) throw mapSupabaseError(revertError, 'link-company-invoice')
    const revertedRow = (reverted || [])[0] as { company_id?: string | null } | undefined
    if (!revertedRow || revertedRow.company_id) {
      refusal(500, 'Zuordnung konnte nicht geprüft werden. Bitte die Rechnung kontrollieren.')
    }
    refusal(500, TRIGGER_CHANGED_MESSAGE)
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    user_id: profile.id,
    auth_user_id: profile.auth_user_id,
    action: AUDIT_ACTION,
    resource_type: 'invoice',
    resource_id: row.id,
    status: 'success',
    details: {
      ...buildCompanyLinkAuditDetails(row.id, company.id, null),
      ...impersonationDetails(event),
    },
    tenant_id: profile.tenant_id,
  })

  if (auditError) {
    const { data: reverted, error: revertError } = await supabase
      .from('invoices')
      .update({ company_id: null, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('tenant_id', profile.tenant_id)
      .eq('company_id', company.id)
      .eq('updated_at', linkedAt)
      .select('id, company_id')
    if (revertError) throw mapSupabaseError(revertError, 'link-company-invoice')
    const revertedRow = (reverted || [])[0] as { company_id?: string | null } | undefined
    if (!revertedRow || revertedRow.company_id) {
      refusal(500, 'Zuordnung konnte nicht geprüft werden. Bitte die Rechnung kontrollieren.')
    }
    refusal(500, AUDIT_FAILED_MESSAGE)
  }

  return {
    success: true,
    invoice_id: row.id,
    previous_company_id: null,
    company_id: company.id,
  }
})
