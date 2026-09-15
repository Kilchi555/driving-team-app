import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  applyCreditToPayment,
  capStaffAppointmentCredit,
} from '../apply-credit-to-payment'

const PAY = '66666666-6666-6666-6666-666666666666'
const TENANT = '11111111-1111-1111-1111-111111111111'
const ACTOR = '44444444-4444-4444-4444-444444444444'

describe('capStaffAppointmentCredit', () => {
  it('1. normal credit uses the requested amount when wallet and payable allow it', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 30000,
      payableRappen: 17550,
      alreadyUsedRappen: 0,
      requestedRappen: 5000,
    })).toBe(5000)
  })

  it('2. wallet cap', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 3000,
      payableRappen: 17550,
      alreadyUsedRappen: 0,
      requestedRappen: 8000,
    })).toBe(3000)
  })

  it('3. payable cap — never debit more than payable', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 30000,
      payableRappen: 17550,
      alreadyUsedRappen: 0,
      requestedRappen: 30000,
    })).toBe(17550)
  })

  it('4. requested cap', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 10000,
      payableRappen: 17550,
      alreadyUsedRappen: 5000,
      requestedRappen: 8000,
    })).toBe(8000)
  })

  it('5. pending withdrawal is already removed from availableWallet', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: Math.max(0, 10000 - 8000),
      payableRappen: 17550,
      alreadyUsedRappen: 0,
      requestedRappen: 5000,
    })).toBe(2000)
  })

  it('6. zero wallet', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 0,
      payableRappen: 17550,
      alreadyUsedRappen: 0,
      requestedRappen: 5000,
    })).toBe(0)
  })

  it('7. zero payable', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 30000,
      payableRappen: 0,
      alreadyUsedRappen: 0,
      requestedRappen: 5000,
    })).toBe(0)
  })

  it('8. insufficient wallet still returns the leftover, not an error amount', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 1,
      payableRappen: 17550,
      alreadyUsedRappen: 0,
      requestedRappen: 5000,
    })).toBe(1)
  })

  it('14. already fully credited payment', () => {
    expect(capStaffAppointmentCredit({
      availableWalletRappen: 30000,
      payableRappen: 17550,
      alreadyUsedRappen: 17550,
      requestedRappen: 5000,
    })).toBe(0)
  })
})

describe('locked wallet debit (concurrency model)', () => {
  it('9. two 8000 requests against 10000 yield 8000 then 2000, never 16000', () => {
    let wallet = 10000
    const pending = 0
    const applyLocked = (requested: number, payable: number, already: number) => {
      const available = Math.max(0, wallet - pending)
      const use = capStaffAppointmentCredit({
        availableWalletRappen: available,
        payableRappen: payable,
        alreadyUsedRappen: already,
        requestedRappen: requested,
      })
      if (use > 0) wallet -= use
      return use
    }
    expect(applyLocked(8000, 20000, 0)).toBe(8000)
    expect(applyLocked(8000, 20000, 0)).toBe(2000)
    expect(wallet).toBe(0)
  })
})

describe('applyCreditToPayment wrapper', () => {
  it('10/11. duplicate same payment returns existing row and does not invent a second debit', async () => {
    const existing = {
      payment_id: PAY,
      credit_used_rappen: 5000,
      remaining_amount_rappen: 12550,
      payment_status: 'pending',
      credit_to_use_rappen: 0,
      credit_transaction_id: 'tx-1',
      applied: false,
    }
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: [existing], error: null }),
    }
    const first = await applyCreditToPayment(supabase, {
      paymentId: PAY,
      tenantId: TENANT,
      requestedRappen: 5000,
      actorUserId: ACTOR,
    })
    const second = await applyCreditToPayment(supabase, {
      paymentId: PAY,
      tenantId: TENANT,
      requestedRappen: 5000,
      actorUserId: ACTOR,
    })
    expect(first.credit_used_rappen).toBe(5000)
    expect(second.credit_used_rappen).toBe(5000)
    expect(second.applied).toBe(false)
    expect(second.credit_transaction_id).toBe('tx-1')
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
    expect(supabase.rpc).toHaveBeenCalledWith('apply_credit_to_payment', {
      p_payment_id: PAY,
      p_tenant_id: TENANT,
      p_requested_rappen: 5000,
      p_actor_user_id: ACTOR,
    })
  })

  it('12. tenant mismatch / invalid payment is surfaced', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'payment_not_found' } }),
    }
    await expect(applyCreditToPayment(supabase, {
      paymentId: PAY,
      tenantId: TENANT,
      requestedRappen: 5000,
      actorUserId: ACTOR,
    })).rejects.toThrow(/payment_not_found/)
  })

  it('13. invalid payment with empty payload fails closed', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    await expect(applyCreditToPayment(supabase, {
      paymentId: PAY,
      tenantId: TENANT,
      requestedRappen: 5000,
      actorUserId: ACTOR,
    })).rejects.toThrow(/Guthaben konnte nicht/)
  })
})

describe('apply_credit_to_payment SQL contract', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'migrations/20260915_apply_credit_to_payment.sql'),
    'utf8',
  )

  it('locks payment and wallet, caps, uses atomic debit, and is idempotent per payment', () => {
    expect(src).toContain('CREATE UNIQUE INDEX IF NOT EXISTS credit_tx_staff_appointment_credit_payment_uidx')
    expect(src).toContain("transaction_type = 'staff_appointment_credit'")
    expect(src).toContain('FOR UPDATE')
    expect(src).toContain('sc.balance_rappen - COALESCE(sc.pending_withdrawal_rappen, 0) >= v_use')
    expect(src).toContain('AND tenant_id = p_tenant_id')
    expect(src).toContain('LEAST(v_available, v_capacity, v_requested)')
    expect(src).toContain('GRANT EXECUTE ON FUNCTION public.apply_credit_to_payment')
    expect(src).toContain('REVOKE ALL ON FUNCTION public.apply_credit_to_payment')
    expect(src).toContain('WHEN unique_violation THEN')
    expect(src).not.toContain('CREATE OR REPLACE FUNCTION public.deduct_student_credit')
    expect(src).not.toContain('CREATE OR REPLACE FUNCTION public.increment_balance')
  })
})
