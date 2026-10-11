import { logger } from '~/utils/logger'

export type InvoiceCreditProduct = {
  id: string
  is_credit_product?: boolean | null
  credit_amount_rappen?: number | null
  name?: string | null
}

export type InvoiceCreditLine = {
  product_id?: string | null
  credit_to_wallet?: boolean | null
  credit_amount_rappen?: number | null
  total_price_rappen?: number | null
  quantity?: number | null
}

export type ApplyInvoiceWalletCreditRpcResult = {
  ok?: boolean
  outcome?: string
  applied_rappen?: number
  skipped?: boolean
  credit_applied_rappen?: number
  ledger_id?: string | null
  balance_before_rappen?: number
  balance_after_rappen?: number
}

export function toInvoiceRappen(value: unknown): number {
  const num = Number(value) || 0
  if (!Number.isFinite(num)) return 0
  if (!Number.isInteger(num)) return Math.round(num * 100)
  return num
}

/**
 * Snapshot the wallet credit for one invoice line.
 * Credit products use credit_amount_rappen × qty; other flagged lines use the net line total.
 */
export function resolveInvoiceLineCreditRappen(
  item: InvoiceCreditLine,
  product?: InvoiceCreditProduct | null
): number {
  if (!item.credit_to_wallet) return 0

  const qty = Number(item.quantity)
  const quantity = Number.isFinite(qty) && qty > 0 ? qty : 1

  if (product?.is_credit_product && (product.credit_amount_rappen || 0) > 0) {
    return Math.round((product.credit_amount_rappen || 0) * quantity)
  }

  if ((item.credit_amount_rappen || 0) > 0) {
    return Math.round(item.credit_amount_rappen || 0)
  }

  return Math.max(0, toInvoiceRappen(item.total_price_rappen))
}

export function sumInvoiceCreditRappen(items: InvoiceCreditLine[]): number {
  return items.reduce((sum, item) => {
    if (!item.credit_to_wallet) return sum
    return sum + Math.max(0, Math.round(item.credit_amount_rappen || 0))
  }, 0)
}

function isMissingRpc(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST202') return true
  return /could not find the function|schema cache|PGRST202|does not exist/i.test(error.message || '')
}

function firstRpcPayload(
  data: ApplyInvoiceWalletCreditRpcResult | ApplyInvoiceWalletCreditRpcResult[] | null
): ApplyInvoiceWalletCreditRpcResult | null {
  if (Array.isArray(data)) {
    const row = data[0]
    return row && typeof row === 'object' ? row : null
  }
  if (data && typeof data === 'object') return data
  return null
}

function mapRpcFailureMessage(error: { message?: string } | null | undefined): string {
  const message = error?.message || ''
  if (/user_mismatch|ledger_mismatch/i.test(message)) {
    return 'Rechnung gehört nicht zum angegebenen Benutzer oder widerspricht dem Ledger'
  }
  if (/invoice_not_found/i.test(message)) {
    return 'Rechnung für Gutschrift nicht gefunden'
  }
  if (/invoice_not_paid/i.test(message)) {
    return 'Gutschrift nur für bezahlte Rechnungen möglich'
  }
  if (/service_role_only|42501/i.test(message)) {
    return 'Guthaben-Gutschrift nicht autorisiert'
  }
  return message || 'Guthaben konnte nicht gutgeschrieben werden'
}

/**
 * Credits the customer wallet for flagged invoice lines after full payment.
 *
 * Financial mutation lives entirely in `apply_invoice_wallet_credit` (one DB
 * transaction: invoice lock, wallet lock, ledger insert, balance increment,
 * credit_applied stamp). This TypeScript wrapper does not read-modify-write
 * the wallet and fails closed if the RPC is missing.
 *
 * Idempotency (database):
 * - invoices.credit_applied_rappen > 0
 * - completed credit_transactions for (tenant_id, invoice reference)
 * - partial unique index credit_transactions_invoice_deposit_uidx
 *
 * Exactly-once wallet credit for a given paid invoice is guaranteed only after
 * the migration that creates apply_invoice_wallet_credit (+ unique index) is
 * applied. Until then this function throws rather than falling back to RMW.
 */
export async function applyInvoiceCreditOnPaid(opts: {
  supabase: any
  invoiceId: string
  tenantId: string
  userId: string
  actorUserId?: string | null
}): Promise<{ applied_rappen: number; skipped: boolean; outcome?: string; ledger_id?: string | null }> {
  const { supabase, invoiceId, tenantId, userId, actorUserId } = opts

  if (!invoiceId || !tenantId || !userId) {
    return { applied_rappen: 0, skipped: true, outcome: 'missing_args' }
  }

  const { data, error } = await supabase.rpc('apply_invoice_wallet_credit', {
    p_tenant_id: tenantId,
    p_invoice_id: invoiceId,
    p_user_id: userId,
    p_actor_user_id: actorUserId || null,
  })

  if (error) {
    if (isMissingRpc(error)) {
      logger.error('applyInvoiceCreditOnPaid: apply_invoice_wallet_credit RPC missing — fail closed', {
        invoiceId,
        tenantId,
        message: error.message,
      })
      throw new Error('Guthaben-Gutschrift nicht verfügbar (RPC fehlt)')
    }
    logger.error('applyInvoiceCreditOnPaid: RPC failed', {
      invoiceId,
      tenantId,
      message: error.message,
      code: error.code,
    })
    throw new Error(mapRpcFailureMessage(error))
  }

  const row = firstRpcPayload(data)
  if (!row || row.ok !== true) {
    logger.error('applyInvoiceCreditOnPaid: RPC returned unexpected payload', { invoiceId, data })
    throw new Error('Guthaben-Gutschrift lieferte kein gültiges Ergebnis')
  }

  const applied = Math.max(0, Number(row.applied_rappen) || 0)
  const skipped = row.skipped === true || applied === 0
  const outcome = typeof row.outcome === 'string' ? row.outcome : (skipped ? 'skipped' : 'applied')

  if (outcome === 'applied') {
    logger.info(`Invoice credit applied: invoice=${invoiceId} amount=${applied}`)
  }

  return {
    applied_rappen: applied,
    skipped,
    outcome,
    ledger_id: row.ledger_id ?? null,
  }
}
