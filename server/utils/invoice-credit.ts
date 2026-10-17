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

/**
 * Credits the customer wallet for flagged invoice lines after full payment.
 * Idempotent via invoices.credit_applied_rappen and credit_transactions.reference_id.
 */
export async function applyInvoiceCreditOnPaid(opts: {
  supabase: any
  invoiceId: string
  tenantId: string
  userId: string
  actorUserId?: string | null
}): Promise<{ applied_rappen: number; skipped: boolean }> {
  const { supabase, invoiceId, tenantId, userId, actorUserId } = opts

  if (!invoiceId || !tenantId || !userId) {
    return { applied_rappen: 0, skipped: true }
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, user_id, tenant_id, payment_status, credit_applied_rappen, invoice_number')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (invoiceError || !invoice) {
    logger.warn('applyInvoiceCreditOnPaid: invoice missing', invoiceError?.message)
    return { applied_rappen: 0, skipped: true }
  }

  if (invoice.payment_status !== 'paid') {
    return { applied_rappen: 0, skipped: true }
  }

  if ((invoice.credit_applied_rappen || 0) > 0) {
    return { applied_rappen: 0, skipped: true }
  }

  const { data: existingTx } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('reference_id', invoiceId)
    .eq('reference_type', 'invoice')
    .in('transaction_type', ['deposit', 'credit_product_purchase'])
    .limit(1)
    .maybeSingle()

  if (existingTx) {
    return { applied_rappen: 0, skipped: true }
  }

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('product_id, credit_to_wallet, credit_amount_rappen, total_price_rappen, quantity, product_name')
    .eq('invoice_id', invoiceId)
    .eq('credit_to_wallet', true)

  if (itemsError) {
    logger.warn('applyInvoiceCreditOnPaid: items load failed', itemsError.message)
    return { applied_rappen: 0, skipped: true }
  }

  const amountRappen = sumInvoiceCreditRappen(items || [])
  if (amountRappen <= 0) {
    return { applied_rappen: 0, skipped: true }
  }

  const invoiceNumber = invoice.invoice_number || invoiceId
  // Ledger, balance, and the invoice stamp are one database function.
  // This call does not make the earlier invoice settlement part of that transaction.
  const { data, error } = await supabase.rpc('apply_invoice_product_credit', {
    p_actor_user_id: actorUserId || null,
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_invoice_id: invoiceId,
    p_amount: amountRappen,
    p_note: `Guthaben aus Rechnung ${invoiceNumber}`,
  })

  if (error || !data || data.ok !== true) {
    logger.error('applyInvoiceCreditOnPaid: wallet transaction failed', error)
    throw new Error('Guthaben-Buchung konnte nicht protokolliert werden')
  }
  if (data.already_applied === true) {
    return { applied_rappen: 0, skipped: true }
  }

  logger.info(`Invoice credit applied: invoice=${invoiceId} amount=${amountRappen}`)
  return { applied_rappen: amountRappen, skipped: false }
}
