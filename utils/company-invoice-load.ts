export const COMPANY_INVOICE_LOAD_ERROR = 'Rechnungen konnten nicht geladen werden.'

export type CompanyInvoicePhase = 'loading' | 'ready' | 'error'

export interface CompanyInvoiceView<T> {
  phase: CompanyInvoicePhase
  companyId: string
  invoices: T[]
  error: string
}

export interface CompanyInvoiceRequest {
  companyId: string
  generation: number
}

export function companyInvoicesPath(companyId: string): string {
  return `/api/admin/companies/${encodeURIComponent(companyId)}/invoices`
}

export function startCompanyInvoiceRequest(
  companyId: string,
  generation: number,
): { request: CompanyInvoiceRequest; view: CompanyInvoiceView<never> } {
  return {
    request: { companyId, generation },
    view: { phase: 'loading', companyId, invoices: [], error: '' },
  }
}

/**
 * Apply a response only when it still belongs to the selected company.
 * A null return means the caller must leave the current view unchanged.
 */
export function applyCompanyInvoiceResult<T>(
  request: CompanyInvoiceRequest,
  current: { companyId: string | null; generation: number },
  result: { ok: true; invoices: T[] } | { ok: false; error: string },
): CompanyInvoiceView<T> | null {
  if (request.generation !== current.generation) return null
  if (!current.companyId || current.companyId !== request.companyId) return null
  if (!result.ok) {
    return {
      phase: 'error',
      companyId: request.companyId,
      invoices: [],
      error: result.error || COMPANY_INVOICE_LOAD_ERROR,
    }
  }
  return {
    phase: 'ready',
    companyId: request.companyId,
    invoices: result.invoices,
    error: '',
  }
}

export function companyInvoiceLoadErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as {
      data?: { statusMessage?: unknown; message?: unknown }
      statusMessage?: unknown
    }
    const candidates = [record.data?.statusMessage, record.data?.message, record.statusMessage]
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    }
  }
  return COMPANY_INVOICE_LOAD_ERROR
}
