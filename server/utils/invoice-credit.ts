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

function isUniqueViolation(err: { code?: string } | null | undefined): boolean {
  return err?.code === '23505'
}

/**
 * Credits the customer wallet for flagged invoice lines after full payment.
 *
 * Idempotency markers (durable):
 * - invoices.credit_applied_rappen > 0
 * - completed credit_transactions for this invoice reference
 * - partial unique index credit_transactions_invoice_deposit_uidx (migration file;
 *   when applied, concurrent duplicate ledger inserts fail closed)
 *
 * Crash / concurrency honesty:
 * - Ledger insert unique conflict → treat as already applied (stamp invoice, skip).
 * - A crash after wallet upsert and before ledger insert can still double-credit on
 *   retry until the unique index is applied AND/OR an atomic SQL helper exists.
 *   This function does not claim exactly-once wallet mutation under that crash window.
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

  if (invoice.user_id && invoice.user_id !== userId) {
    throw new Error('Rechnung gehört nicht zum angegebenen Benutzer')
  }

  if (invoice.payment_status !== 'paid') {
    return { applied_rappen: 0, skipped: true }
  }

  if ((invoice.credit_applied_rappen || 0) > 0) {
    return { applied_rappen: 0, skipped: true }
  }

  const { data: existingTx } = await supabase
    .from('credit_transactions')
    .select('id, amount_rappen')
    .eq('tenant_id', tenantId)
    .eq('reference_id', invoiceId)
    .eq('reference_type', 'invoice')
    .in('transaction_type', ['deposit', 'credit_product_purchase'])
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle()

  if (existingTx) {
    const stampAmount = Math.max(0, Number(existingTx.amount_rappen) || 0)
    if (stampAmount > 0) {
      await supabase
        .from('invoices')
        .update({
          credit_applied_rappen: stampAmount,
          credit_applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .eq('credit_applied_rappen', 0)
    }
    return { applied_rappen: 0, skipped: true }
  }

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('product_id, credit_to_wallet, credit_amount_rappen, total_price_rappen, quantity, product_name')
    .eq('invoice_id', invoiceId)
    .eq('credit_to_wallet', true)

  if (itemsError) {
    logger.warn('applyInvoiceCreditOnPaid: items load failed', itemsError.message)
    throw new Error('Guthaben-Positionen konnten nicht geladen werden')
  }

  const amountRappen = sumInvoiceCreditRappen(items || [])
  if (amountRappen <= 0) {
    return { applied_rappen: 0, skipped: true }
  }

  const { data: currentCredit } = await supabase
    .from('student_credits')
    .select('id, balance_rappen')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const currentBalance = currentCredit?.balance_rappen || 0
  const newBalance = currentBalance + amountRappen
  const now = new Date().toISOString()
  const invoiceNumber = invoice.invoice_number || invoiceId

  const { error: creditError } = await supabase
    .from('student_credits')
    .upsert({
      user_id: userId,
      tenant_id: tenantId,
      balance_rappen: newBalance,
      notes: `Guthaben aus Rechnung ${invoiceNumber}`,
      updated_at: now,
    }, { onConflict: 'user_id,tenant_id' })

  if (creditError) {
    logger.error('applyInvoiceCreditOnPaid: wallet update failed', creditError)
    throw new Error('Guthaben konnte nicht gutgeschrieben werden')
  }

  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      transaction_type: 'deposit',
      amount_rappen: amountRappen,
      balance_before_rappen: currentBalance,
      balance_after_rappen: newBalance,
      payment_method: 'invoice',
      reference_id: invoiceId,
      reference_type: 'invoice',
      created_by: actorUserId || null,
      notes: `Guthaben aus Rechnung ${invoiceNumber}`,
      status: 'completed',
      created_at: now,
    })

  if (txError) {
    if (isUniqueViolation(txError)) {
      // Concurrent retry already wrote the ledger; do not fail the settlement path.
      await supabase
        .from('invoices')
        .update({
          credit_applied_rappen: amountRappen,
          credit_applied_at: now,
          updated_at: now,
        })
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .eq('credit_applied_rappen', 0)
      return { applied_rappen: 0, skipped: true }
    }
    logger.error('applyInvoiceCreditOnPaid: transaction log failed', txError)
    throw new Error('Guthaben-Buchung konnte nicht protokolliert werden')
  }

  const { error: stampError } = await supabase
    .from('invoices')
    .update({
      credit_applied_rappen: amountRappen,
      credit_applied_at: now,
      updated_at: now,
    })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .eq('credit_applied_rappen', 0)

  if (stampError) {
    logger.warn('applyInvoiceCreditOnPaid: invoice stamp failed', stampError.message)
  }

  logger.info(`Invoice credit applied: invoice=${invoiceId} amount=${amountRappen}`)
  return { applied_rappen: amountRappen, skipped: false }
}
