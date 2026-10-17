/**
 * Atomic voucher fulfillment claim for Wallee webhooks.
 * Relies on UNIQUE (payment_id, fulfillment_key) — see migrations/20261014_vouchers_fulfillment_key_unique.sql
 */

export type VoucherFulfillmentClaimInput = {
  code: string
  name: string
  description?: string | null
  amount_rappen: number
  recipient_name?: string | null
  recipient_email?: string | null
  buyer_name?: string | null
  buyer_email?: string | null
  payment_id: string
  tenant_id: string
  fulfillment_key: string
  valid_until: string
}

export type VoucherFulfillmentClaimResult = {
  /** True when this caller inserted the row; false when a concurrent/prior claim won. */
  claimed: boolean
  voucher: { id: string; code: string } | null
  error?: string
}

type SupabaseLike = {
  // Minimal PostgREST-shaped client used by claim inserts/selects.
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: { id: string; code: string } | null; error: { code?: string; message?: string } | null }>
      }
    }
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { id: string; code: string } | null; error: { code?: string; message?: string } | null }>
        }
      }
    }
  }
}

export function isUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === '23505') return true
  const msg = String(error.message || '')
  return /duplicate key|unique constraint|idx_vouchers_payment_fulfillment_key/i.test(msg)
}

/**
 * Insert voucher with fulfillment_key. On unique conflict, load the existing row (idempotent).
 * Does not send email — caller handles side effects only when claimed === true.
 */
export async function claimVoucherFulfillment(
  supabase: SupabaseLike,
  input: VoucherFulfillmentClaimInput,
): Promise<VoucherFulfillmentClaimResult> {
  const insertPayload = {
    code: input.code,
    name: input.name,
    description: input.description || null,
    amount_rappen: input.amount_rappen,
    recipient_name: input.recipient_name || null,
    recipient_email: input.recipient_email || null,
    buyer_name: input.buyer_name || null,
    buyer_email: input.buyer_email || null,
    payment_id: input.payment_id,
    valid_until: input.valid_until,
    is_active: true,
    tenant_id: input.tenant_id,
    fulfillment_key: input.fulfillment_key,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('vouchers')
    .insert(insertPayload)
    .select('id, code')
    .single()

  if (!insertError && inserted?.id) {
    return { claimed: true, voucher: { id: inserted.id, code: inserted.code } }
  }

  if (isUniqueViolation(insertError)) {
    const { data: existing, error: selectError } = await supabase
      .from('vouchers')
      .select('id, code')
      .eq('payment_id', input.payment_id)
      .eq('fulfillment_key', input.fulfillment_key)
      .maybeSingle()

    if (selectError) {
      return { claimed: false, voucher: null, error: selectError.message || 'select after conflict failed' }
    }
    if (existing?.id) {
      return { claimed: false, voucher: { id: existing.id, code: existing.code } }
    }
    // Unique on `code` alone could also 23505 — treat as failed claim without duplicate issuance.
    return {
      claimed: false,
      voucher: null,
      error: insertError?.message || 'unique violation without fulfillment_key row',
    }
  }

  return {
    claimed: false,
    voucher: null,
    error: insertError?.message || 'voucher insert failed',
  }
}

/** Build a stable non-custom voucher key that does not collide distinct product lines by display name alone. */
export function fixedVoucherFulfillmentKey(productId: string, lineIndex: number): string {
  return `voucher:${productId}:line:${lineIndex}`
}
