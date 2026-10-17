/**
 * GET /api/admin/invoices/unlinked-company
 *
 * Historical company invoices in the caller's tenant whose company_id is null.
 * Membership and exact billing-name hits are returned as non-authoritative
 * suggestions. This handler does not write.
 */
import { defineEventHandler } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import {
  INVOICE_LINK_READ_COLUMNS,
  SUGGESTION_COMPANY_LIMIT,
  UNLINKED_LIST_LIMIT,
  assessCompanyInvoiceLink,
  buildCompanyLinkSuggestions,
  utcDateString,
  type LinkableInvoiceRow,
} from '~/server/utils/company-invoice-link'

const PUBLIC_COLUMNS = [
  'id',
  'invoice_number',
  'invoice_date',
  'created_at',
  'updated_at',
  'billing_company_name',
  'billing_city',
  'billing_zip',
  'billing_type',
  'document_kind',
] as const

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const asOfDate = utcDateString()

  const { data, error, count } = await supabase
    .from('invoices')
    .select(INVOICE_LINK_READ_COLUMNS, { count: 'exact' })
    .eq('tenant_id', profile.tenant_id)
    .is('company_id', null)
    .eq('document_kind', 'invoice')
    .eq('billing_type', 'company')
    .order('created_at', { ascending: true })
    .limit(UNLINKED_LIST_LIMIT)

  if (error) throw mapSupabaseError(error, 'unlinked-company-invoices')

  const invoices = (data || []) as LinkableInvoiceRow[]
  const userIds = [...new Set(invoices.map((row) => row.user_id).filter((id): id is string => !!id))]

  const { data: companies, error: companyError, count: companyCount } = await supabase
    .from('companies')
    .select('id, name, created_at', { count: 'exact' })
    .eq('tenant_id', profile.tenant_id)
    .order('name', { ascending: true })
    .limit(SUGGESTION_COMPANY_LIMIT)

  if (companyError) throw mapSupabaseError(companyError, 'unlinked-company-invoices')

  let membershipByUser = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('tenant_id', profile.tenant_id)
      .in('id', userIds)
    if (userError) throw mapSupabaseError(userError, 'unlinked-company-invoices')
    membershipByUser = new Map((users || []).map((user: { id: string; company_id: string | null }) => [user.id, user.company_id]))
  }

  const companyRows = (companies || []) as Array<{ id: string; name: string; created_at: string | null }>
  const suggestionsIncomplete = companyCount == null
    ? companyRows.length >= SUGGESTION_COMPANY_LIMIT
    : companyCount > companyRows.length

  const visible = invoices.map((row) => {
    const decision = assessCompanyInvoiceLink(row, row.updated_at || '', asOfDate)
    const suggestionInput = {
      billingCompanyName: row.billing_company_name,
      invoiceCreatedAt: row.created_at,
      membershipCompanyId: row.user_id ? membershipByUser.get(row.user_id) : null,
      companies: companyRows,
    }
    const projected: Record<string, unknown> = {}
    for (const column of PUBLIC_COLUMNS) projected[column] = row[column] ?? null
    return {
      ...projected,
      link_allowed: decision.ok,
      link_block_reason: decision.ok ? null : decision.refusal.message,
      suggestions: buildCompanyLinkSuggestions(suggestionInput),
    }
  })

  const total = count ?? null
  return {
    invoices: visible,
    total,
    truncated: total == null ? invoices.length >= UNLINKED_LIST_LIMIT : total > invoices.length,
    suggestions_incomplete: suggestionsIncomplete,
    suggestions_authoritative: false,
  }
})
