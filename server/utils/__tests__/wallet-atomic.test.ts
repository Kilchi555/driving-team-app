import { describe, expect, it, vi } from 'vitest'
import {
  addPendingWithdrawal,
  deductStudentCredit,
  incrementStudentCredit,
  InsufficientAvailableCreditError,
} from '../wallet-atomic'

function rpcClient(result: { data?: unknown; error?: { message: string } | null }) {
  return { rpc: vi.fn().mockResolvedValue(result) }
}

describe('deductStudentCredit', () => {
  it('returns the updated balances', async () => {
    const supabase = rpcClient({
      data: [{ balance_rappen: 3000, pending_withdrawal_rappen: 2000 }],
      error: null,
    })
    await expect(deductStudentCredit(supabase, {
      userId: 'u',
      tenantId: 't',
      amountRappen: 5000,
    })).resolves.toEqual({
      balance_rappen: 3000,
      pending_withdrawal_rappen: 2000,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('deduct_student_credit', {
      p_user_id: 'u',
      p_tenant_id: 't',
      p_amount: 5000,
    })
  })

  it('maps insufficient_available_credit to a typed error', async () => {
    const supabase = rpcClient({ data: null, error: { message: 'insufficient_available_credit' } })
    await expect(deductStudentCredit(supabase, {
      userId: 'u',
      tenantId: 't',
      amountRappen: 100,
    })).rejects.toBeInstanceOf(InsufficientAvailableCreditError)
  })
})

describe('incrementStudentCredit', () => {
  it('accepts a single-object RPC payload', async () => {
    const supabase = rpcClient({
      data: { balance_rappen: 1200, pending_withdrawal_rappen: 0 },
      error: null,
    })
    await expect(incrementStudentCredit(supabase, {
      userId: 'u',
      tenantId: 't',
      amountRappen: 200,
    })).resolves.toEqual({
      balance_rappen: 1200,
      pending_withdrawal_rappen: 0,
    })
  })
})

describe('redeemPromoForWallet', () => {
  it('maps duplicate redemptions to VoucherRedeemError', async () => {
    const { redeemPromoForWallet, VoucherRedeemError } = await import('../wallet-atomic')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value violates unique constraint "voucher_redemptions_voucher_user_uidx"' },
      }),
    }
    await expect(redeemPromoForWallet(supabase, {
      userId: 'u',
      tenantId: 't',
      voucherId: 'v',
      amountRappen: 1000,
    })).rejects.toBeInstanceOf(VoucherRedeemError)
  })
})

describe('redeemGiftCardForWallet', () => {
  it('maps a live reservation to a clear user message', async () => {
    const { redeemGiftCardForWallet, VoucherRedeemError } = await import('../wallet-atomic')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'held_by_other' },
      }),
    }
    await expect(redeemGiftCardForWallet(supabase, {
      userId: 'u',
      tenantId: 't',
      code: 'GIFT',
    })).rejects.toMatchObject({
      name: 'VoucherRedeemError',
      message: expect.stringMatching(/anderen Zahlung/),
    })
    await expect(redeemGiftCardForWallet(supabase, {
      userId: 'u',
      tenantId: 't',
      code: 'GIFT',
    })).rejects.toBeInstanceOf(VoucherRedeemError)
  })
})

describe('addPendingWithdrawal', () => {
  it('freezes via CAS RPC', async () => {
    const supabase = rpcClient({
      data: [{ balance_rappen: 8000, pending_withdrawal_rappen: 3000 }],
      error: null,
    })
    await expect(addPendingWithdrawal(supabase, {
      creditId: 'c1',
      amountRappen: 3000,
    })).resolves.toEqual({
      balance_rappen: 8000,
      pending_withdrawal_rappen: 3000,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('add_pending_withdrawal', {
      p_credit_id: 'c1',
      p_amount: 3000,
    })
  })
})
