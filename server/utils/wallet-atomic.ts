import { logger } from '~/utils/logger'

export class InsufficientAvailableCreditError extends Error {
  constructor(message = 'Kein verfügbares Guthaben') {
    super(message)
    this.name = 'InsufficientAvailableCreditError'
  }
}

function isInsufficient(error: { message?: string } | null | undefined): boolean {
  return /insufficient_available_credit|invalid_amount/i.test(error?.message || '')
}

function isMissingRpc(error: { message?: string } | null | undefined): boolean {
  return /could not find the function|schema cache|PGRST202|does not exist/i.test(error?.message || '')
}

function firstRpcRow(data: unknown): { balance_rappen?: number; pending_withdrawal_rappen?: number } | null {
  if (Array.isArray(data)) return data[0] || null
  if (data && typeof data === 'object') return data as { balance_rappen?: number; pending_withdrawal_rappen?: number }
  return null
}

export async function deductStudentCredit(
  supabase: any,
  opts: { userId: string; tenantId: string; amountRappen: number }
): Promise<{ balance_rappen: number; pending_withdrawal_rappen: number }> {
  const { data, error } = await supabase.rpc('deduct_student_credit', {
    p_user_id: opts.userId,
    p_tenant_id: opts.tenantId,
    p_amount: opts.amountRappen,
  })
  const row = firstRpcRow(data)
  if (error || !row) {
    if (isInsufficient(error)) throw new InsufficientAvailableCreditError()
    throw new Error(error?.message || 'Guthaben konnte nicht abgezogen werden')
  }
  return {
    balance_rappen: Number(row.balance_rappen) || 0,
    pending_withdrawal_rappen: Number(row.pending_withdrawal_rappen) || 0,
  }
}

export async function incrementStudentCredit(
  supabase: any,
  opts: { userId: string; tenantId: string; amountRappen: number }
): Promise<{ balance_rappen: number; pending_withdrawal_rappen: number }> {
  const { data, error } = await supabase.rpc('increment_balance', {
    p_user_id: opts.userId,
    p_tenant_id: opts.tenantId,
    p_amount: opts.amountRappen,
  })
  const row = firstRpcRow(data)
  if (error || !row) {
    if (isInsufficient(error)) throw new InsufficientAvailableCreditError()
    throw new Error(error?.message || 'Guthaben konnte nicht gutgeschrieben werden')
  }
  return {
    balance_rappen: Number(row.balance_rappen) || 0,
    pending_withdrawal_rappen: Number(row.pending_withdrawal_rappen) || 0,
  }
}

export async function addPendingWithdrawal(
  supabase: any,
  opts: { creditId: string; amountRappen: number }
): Promise<{ balance_rappen: number; pending_withdrawal_rappen: number }> {
  const { data, error } = await supabase.rpc('add_pending_withdrawal', {
    p_credit_id: opts.creditId,
    p_amount: opts.amountRappen,
  })
  const row = firstRpcRow(data)
  if (error || !row) {
    if (isInsufficient(error)) throw new InsufficientAvailableCreditError()
    throw new Error(error?.message || 'Auszahlung konnte nicht eingefroren werden')
  }
  return {
    balance_rappen: Number(row.balance_rappen) || 0,
    pending_withdrawal_rappen: Number(row.pending_withdrawal_rappen) || 0,
  }
}

export async function incrementDiscountUsageAtomic(
  supabase: any,
  discountId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('increment_discount_usage', {
    p_discount_id: discountId,
  })
  if (error) {
    if (isMissingRpc(error)) {
      logger.warn('increment_discount_usage RPC missing — failing closed')
    }
    return false
  }
  return data === true
}

export async function incrementVoucherCodeRedemptionAtomic(
  supabase: any,
  voucherCodeId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('increment_voucher_code_redemption', {
    p_voucher_code_id: voucherCodeId,
  })
  if (error) {
    if (isMissingRpc(error)) {
      logger.warn('increment_voucher_code_redemption RPC missing — failing closed')
    }
    return false
  }
  return data === true
}

export async function decrementDiscountUsageAtomic(
  supabase: any,
  discountId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('decrement_discount_usage', {
    p_discount_id: discountId,
  })
  if (error) return false
  return data === true
}

export async function decrementVoucherCodeRedemptionAtomic(
  supabase: any,
  voucherCodeId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('decrement_voucher_code_redemption', {
    p_voucher_code_id: voucherCodeId,
  })
  if (error) return false
  return data === true
}

export class VoucherRedeemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VoucherRedeemError'
  }
}

function mapRedeemError(error: { message?: string } | null | undefined): never {
  const msg = error?.message || ''
  if (/held_by_other/i.test(msg)) {
    throw new VoucherRedeemError('Dieser Gutschein wird gerade in einer anderen Zahlung verwendet. Warte, bis die Zahlung abgeschlossen oder abgebrochen ist.')
  }
  if (/already_redeemed|duplicate key|voucher_redemptions_voucher_user/i.test(msg)) {
    throw new VoucherRedeemError('Sie haben diesen Gutschein bereits eingelöst')
  }
  if (/voucher_exhausted/i.test(msg)) {
    throw new VoucherRedeemError('Dieser Gutschein wurde bereits vollständig eingelöst')
  }
  if (isInsufficient(error)) throw new InsufficientAvailableCreditError()
  throw new Error(msg || 'Gutschein konnte nicht eingelöst werden')
}

export async function redeemPromoForWallet(
  supabase: any,
  opts: { userId: string; tenantId: string; voucherId: string; amountRappen: number }
): Promise<{ old_balance: number; new_balance: number }> {
  const { data, error } = await supabase.rpc('redeem_promo_for_wallet', {
    p_user_id: opts.userId,
    p_tenant_id: opts.tenantId,
    p_voucher_id: opts.voucherId,
    p_amount: opts.amountRappen,
  })
  const row = firstRpcRow(data) as { old_balance?: number; new_balance?: number } | null
  if (error || !row) mapRedeemError(error)
  return {
    old_balance: Number(row!.old_balance) || 0,
    new_balance: Number(row!.new_balance) || 0,
  }
}

export async function redeemGiftCardForWallet(
  supabase: any,
  opts: { userId: string; tenantId: string; code: string }
): Promise<{ old_balance: number; new_balance: number; amount_rappen: number }> {
  const { data, error } = await supabase.rpc('redeem_gift_card_for_wallet', {
    p_user_id: opts.userId,
    p_tenant_id: opts.tenantId,
    p_code: opts.code,
  })
  const row = firstRpcRow(data) as { old_balance?: number; new_balance?: number; amount_rappen?: number } | null
  if (error || !row) mapRedeemError(error)
  return {
    old_balance: Number(row!.old_balance) || 0,
    new_balance: Number(row!.new_balance) || 0,
    amount_rappen: Number(row!.amount_rappen) || 0,
  }
}
