/**
 * Tenant-scoped invoice linking.
 * Payment claims and source stamps never trust a client tenant id.
 * Callers pass the tenant already resolved on the server.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const INVOICE_SOURCE_TABLES = [
  'course_registrations',
  'room_bookings',
  'vehicle_bookings',
] as const

export type InvoiceSourceTable = (typeof INVOICE_SOURCE_TABLES)[number]

export class PaymentClaimRejectedError extends Error {
  constructor(message = 'Payment claim rejected') {
    super(message)
    this.name = 'PaymentClaimRejectedError'
  }
}

export function uniquePaymentIds(paymentIds: string[] | null | undefined): string[] {
  if (!paymentIds?.length) return []
  return [...new Set(paymentIds.map((id) => String(id || '').trim()).filter(Boolean))]
}

export type PaymentClaimSnapshot = {
  id: string
  payment_status: string | null
  payment_method: string | null
}

/**
 * Read payments for this tenant only. Rejects missing, foreign, and already linked rows
 * before an invoice is inserted.
 */
export async function loadClaimablePayments(opts: {
  supabase: SupabaseClient
  tenantId: string
  paymentIds: string[]
}): Promise<Map<string, PaymentClaimSnapshot>> {
  const expectedIds = uniquePaymentIds(opts.paymentIds)
  const prior = new Map<string, PaymentClaimSnapshot>()
  if (!expectedIds.length) return prior

  const { data, error } = await opts.supabase
    .from('payments')
    .select('id, invoice_id, payment_status, payment_method')
    .in('id', expectedIds)
    .eq('tenant_id', opts.tenantId)

  if (error) {
    throw new PaymentClaimRejectedError(error.message || 'Failed to read payments')
  }

  const rows = (data || []) as Array<{
    id: string
    invoice_id: string | null
    payment_status: string | null
    payment_method: string | null
  }>

  const claimable = rows.filter((row) => row.invoice_id == null)
  if (rows.length !== expectedIds.length || claimable.length !== expectedIds.length) {
    throw new PaymentClaimRejectedError('Payment claim rejected')
  }

  for (const row of rows) {
    prior.set(row.id, {
      id: row.id,
      payment_status: row.payment_status,
      payment_method: row.payment_method,
    })
  }
  return prior
}

export type PaymentClaimResult = {
  expectedIds: string[]
  claimedIds: string[]
  complete: boolean
}

/**
 * Conditional claim. A payment is updated only when it belongs to tenantId,
 * is one of the requested ids, and still has invoice_id IS NULL.
 */
export async function claimPaymentsForInvoice(opts: {
  supabase: SupabaseClient
  tenantId: string
  invoiceId: string
  paymentIds: string[]
  now?: string
}): Promise<PaymentClaimResult> {
  const expectedIds = uniquePaymentIds(opts.paymentIds)
  if (!expectedIds.length) {
    return { expectedIds, claimedIds: [], complete: true }
  }

  const now = opts.now || new Date().toISOString()
  const { data, error } = await opts.supabase
    .from('payments')
    .update({
      invoice_id: opts.invoiceId,
      payment_status: 'invoiced',
      payment_method: 'invoice',
      updated_at: now,
    })
    .in('id', expectedIds)
    .eq('tenant_id', opts.tenantId)
    .is('invoice_id', null)
    .select('id')

  if (error) {
    throw new PaymentClaimRejectedError(error.message || 'Failed to claim payments')
  }

  const claimedIds = ((data || []) as Array<{ id: string }>).map((row) => row.id)
  const claimedSet = new Set(claimedIds)
  const complete = expectedIds.every((id) => claimedSet.has(id)) && claimedSet.size === expectedIds.length

  return { expectedIds, claimedIds, complete }
}

export async function releasePaymentClaims(opts: {
  supabase: SupabaseClient
  tenantId: string
  invoiceId: string
  claimedIds: string[]
  prior: Map<string, PaymentClaimSnapshot>
}): Promise<void> {
  const now = new Date().toISOString()
  for (const id of opts.claimedIds) {
    const prev = opts.prior.get(id)
    const { error } = await opts.supabase
      .from('payments')
      .update({
        invoice_id: null,
        payment_status: prev?.payment_status ?? 'pending',
        payment_method: prev?.payment_method ?? 'invoice',
        updated_at: now,
      })
      .eq('id', id)
      .eq('tenant_id', opts.tenantId)
      .eq('invoice_id', opts.invoiceId)
    if (error) {
      console.warn('⚠️ Failed to release payment claim:', error.message)
    }
  }
}

export async function deleteTenantInvoice(opts: {
  supabase: SupabaseClient
  tenantId: string
  invoiceId: string
}): Promise<void> {
  const { error: itemsError } = await opts.supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', opts.invoiceId)
    .eq('tenant_id', opts.tenantId)
  if (itemsError) {
    console.warn('⚠️ Failed to delete unclaimed invoice items:', itemsError.message)
  }

  const { error: invoiceError } = await opts.supabase
    .from('invoices')
    .delete()
    .eq('id', opts.invoiceId)
    .eq('tenant_id', opts.tenantId)
  if (invoiceError) {
    console.warn('⚠️ Failed to delete unclaimed invoice:', invoiceError.message)
  }
}

export function isInvoiceSourceTable(table: string): table is InvoiceSourceTable {
  return (INVOICE_SOURCE_TABLES as readonly string[]).includes(table)
}

/**
 * Stamp invoice_id on a course registration, room booking, or vehicle booking
 * only inside the verified tenant and only while invoice_id is still null.
 */
export async function stampInvoiceSourceRow(opts: {
  supabase: SupabaseClient
  table: string
  sourceId: string
  tenantId: string
  invoiceId: string
}): Promise<{ stamped: boolean; error: { message: string } | null }> {
  if (!isInvoiceSourceTable(opts.table)) {
    return { stamped: false, error: { message: 'Unsupported invoice source' } }
  }

  const { data, error } = await opts.supabase
    .from(opts.table)
    .update({ invoice_id: opts.invoiceId })
    .eq('id', opts.sourceId)
    .eq('tenant_id', opts.tenantId)
    .is('invoice_id', null)
    .select('id')

  if (error) {
    return { stamped: false, error: { message: error.message || 'Failed to stamp invoice source' } }
  }

  const stamped = ((data || []) as Array<{ id: string }>).some((row) => row.id === opts.sourceId)
  return { stamped, error: null }
}
