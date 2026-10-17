/**
 * Company association for a new invoice.
 *
 * Only an explicit company id on a company-billed draft is stored, and only
 * after that id is loaded inside the invoice tenant. A billing name, address,
 * or the customer's current users.company_id is not a company id.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const COMPANY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class InvoiceCompanyLinkError extends Error {
  readonly statusCode: 400 | 404 | 503

  constructor(statusCode: 400 | 404 | 503, message: string) {
    super(message)
    this.name = 'InvoiceCompanyLinkError'
    this.statusCode = statusCode
  }
}

export function readExplicitCompanyId(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !COMPANY_UUID_RE.test(value.trim())) {
    throw new InvoiceCompanyLinkError(400, 'Ungültige Firmen-ID')
  }
  return value.trim()
}

/**
 * External resource invoices carry a free-text recipient. They have no
 * company record, so a typed name or a client-supplied id does not link one.
 */
export function externalResourceInvoiceAssociation(input: {
  externalCompanyName?: string | null
  suppliedCompanyId?: unknown
}): { billing_type: 'company' | 'individual'; company_id: null } {
  void input.suppliedCompanyId
  const name = String(input.externalCompanyName || '').trim()
  return {
    billing_type: name ? 'company' : 'individual',
    company_id: null,
  }
}

/** Auto-invoice has a billing-name snapshot and no resolved company id. */
export function autoInvoiceCompanyId(): null {
  return null
}

/**
 * Load one explicit company id inside the invoice tenant.
 * Null and '' stay unlinked. An invalid id, a foreign tenant, an unknown id,
 * or a lookup error fails closed and returns no id.
 */
export async function companyIdInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: unknown,
): Promise<string | null> {
  const explicit = readExplicitCompanyId(companyId)
  if (!explicit) return null

  const { data, error } = await supabase
    .from('companies')
    .select('id, tenant_id')
    .eq('id', explicit)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new InvoiceCompanyLinkError(503, 'Firma konnte nicht geprüft werden')
  if (!data || data.tenant_id !== tenantId) {
    throw new InvoiceCompanyLinkError(404, 'Firma nicht gefunden')
  }
  return data.id
}

export async function companyIdForInvoiceInsert(
  supabase: SupabaseClient,
  tenantId: string,
  draft: { billing_type?: string | null; company_id?: unknown },
): Promise<string | null> {
  if ((draft.billing_type || 'individual') !== 'company') return null
  return companyIdInTenant(supabase, tenantId, draft.company_id)
}
