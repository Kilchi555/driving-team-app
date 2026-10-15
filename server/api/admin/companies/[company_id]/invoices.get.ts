/**
 * GET /api/admin/companies/:company_id/invoices
 *
 * Invoices with a direct invoices.company_id relationship to one company in
 * the caller's tenant. Billing-name matches and the employee's current
 * users.company_id are not company invoices and are not returned.
 *
 * The admin client bypasses RLS. public.companies currently has RLS enabled
 * and no policies, so the company check cannot use the user-scoped client.
 * Authority stays the authenticated profile: both queries filter that
 * tenant_id, and a client-supplied tenant id is never read.
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'

const COMPANY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const INVOICE_COLUMNS = 'id, invoice_number, invoice_date, total_amount_rappen, payment_status, status'
const MAX_INVOICES = 500

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const companyId = String(getRouterParam(event, 'company_id') || '').trim()
  if (!COMPANY_UUID_RE.test(companyId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Firmen-ID', message: 'Ungültige Firmen-ID' })
  }

  const supabase = getSupabaseAdmin()
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  if (companyError) throw mapSupabaseError(companyError, 'company-invoices')
  if (!company) throw createError({ statusCode: 404, statusMessage: 'Firma nicht gefunden', message: 'Firma nicht gefunden' })

  const { data, error, count } = await supabase
    .from('invoices_with_details')
    .select(INVOICE_COLUMNS, { count: 'exact' })
    .eq('company_id', company.id)
    .eq('tenant_id', profile.tenant_id)
    .eq('document_kind', 'invoice')
    .order('created_at', { ascending: false })
    .limit(MAX_INVOICES)

  if (error) throw mapSupabaseError(error, 'company-invoices')

  const invoices = data || []
  if ((count ?? invoices.length) > invoices.length) {
    throw createError({ statusCode: 500, statusMessage: 'Rechnungsliste unvollständig', message: 'Rechnungsliste unvollständig' })
  }

  return { invoices }
})
