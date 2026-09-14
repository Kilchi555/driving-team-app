import { describe, expect, it, vi } from 'vitest'
import { applyCapturedWalleeTopupCredit, completeCapturedWalleePayment } from '../topup-credit'
import { toCharKeyMetadata } from '../payment-metadata'

const TOPUP_PAYMENT = {
  id: '5600666b-d342-4be7-be52-ba51446d6021',
  user_id: '82ce26ad-dca3-4d5a-8f3f-84c83b770ad7',
  tenant_id: '64259d68-195a-4c68-8875-f1b44d962830',
  payment_method: 'wallee',
  description: 'Guthaben aufladen – Sophia Niederbacher',
  total_amount_rappen: 10000,
  lesson_price_rappen: 10000,
  products_price_rappen: 0,
  metadata: { is_topup: true, topup_amount_rappen: 10000 },
  appointment_id: null,
  invoice_id: null,
  course_registration_id: null,
}

type PaymentUpdateQuery = {
  update: (values: Record<string, unknown>) => PaymentUpdateQuery
  eq: (column: string, value: unknown) => PaymentUpdateQuery
  then: (
    resolve: (value: { error: null }) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise<unknown>
}

function rpcClient(handler: (args: Record<string, unknown>) => { data: unknown; error: { message?: string } | null }) {
  return {
    rpc: vi.fn(async (_fn: string, args: Record<string, unknown>) => handler(args)),
    from: vi.fn(() => {
      const result = Promise.resolve({ error: null })
      const query: PaymentUpdateQuery = {
        update: vi.fn(() => query),
        eq: vi.fn(() => query),
        then: (resolve, reject) => result.then(resolve, reject),
      }
      return query
    }),
  }
}

describe('applyCapturedWalleeTopupCredit', () => {
  it('Test 1: object metadata credits exactly once', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    await expect(applyCapturedWalleeTopupCredit(supabase, TOPUP_PAYMENT)).resolves.toEqual({
      kind: 'applied',
      amountRappen: 10000,
      alreadyApplied: false,
      balanceRappen: 10000,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('apply_wallee_topup_deposit', {
      p_payment_id: TOPUP_PAYMENT.id,
      p_user_id: TOPUP_PAYMENT.user_id,
      p_tenant_id: TOPUP_PAYMENT.tenant_id,
      p_amount: 10000,
    })
  })

  it('Test 2: legacy JSON-string metadata still credits', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    const result = await applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      metadata: JSON.stringify({ is_topup: true, topup_amount_rappen: 10000 }),
    })
    expect(result.kind).toBe('applied')
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it('Test 3: char-key metadata still credits', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    const result = await applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      metadata: toCharKeyMetadata({ is_topup: true, topup_amount_rappen: 10000 }),
    })
    expect(result.kind).toBe('applied')
  })

  it('Test 5: a second FULFILL is already_applied', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: false, already_applied: true, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    const result = await applyCapturedWalleeTopupCredit(supabase, TOPUP_PAYMENT)
    expect(result).toMatchObject({ kind: 'applied', alreadyApplied: true, amountRappen: 10000 })
  })

  it('Test 6 (mock only): concurrent credits share the unique RPC', async () => {
    // This serializes two in-process calls against a mock. It does not hit
    // Postgres or the partial unique index; DB uniqueness is owned by the RPC.
    let calls = 0
    const supabase = rpcClient(() => {
      calls += 1
      if (calls === 1) {
        return {
          data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
          error: null,
        }
      }
      return {
        data: [{ applied: false, already_applied: true, amount_rappen: 10000, balance_rappen: 10000 }],
        error: null,
      }
    })
    const [a, b] = await Promise.all([
      applyCapturedWalleeTopupCredit(supabase, TOPUP_PAYMENT),
      applyCapturedWalleeTopupCredit(supabase, TOPUP_PAYMENT),
    ])
    const applied = [a, b].filter(r => r.kind === 'applied')
    expect(applied).toHaveLength(2)
    expect(applied.filter(r => r.kind === 'applied' && !r.alreadyApplied)).toHaveLength(1)
    expect(applied.filter(r => r.kind === 'applied' && r.alreadyApplied)).toHaveLength(1)
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
  })

  it('Test 9: a normal lesson payment is not credited', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'should-not-run' } }))
    await expect(applyCapturedWalleeTopupCredit(supabase, {
      id: 'lesson-1',
      user_id: 'u',
      tenant_id: 't',
      payment_method: 'wallee',
      description: 'Fahrstunde',
      total_amount_rappen: 9500,
      lesson_price_rappen: 9500,
      metadata: {},
      appointment_id: 'appt-1',
    })).resolves.toEqual({ kind: 'not_topup' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('Test 10: garbage metadata is not credited', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'should-not-run' } }))
    await expect(applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      description: 'Fahrstunde',
      metadata: { is_topup: 'yes', topup_amount_rappen: 'lots' },
    })).resolves.toEqual({ kind: 'not_topup' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('Test 11: RPC amount is the stored payment total, never a client override', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    const clientAttempt = { amountRappen: 50000 }
    await applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      metadata: { is_topup: true, topup_amount_rappen: TOPUP_PAYMENT.total_amount_rappen },
      // @ts-expect-error client field must be ignored
      clientAmountRappen: clientAttempt.amountRappen,
    })
    expect(supabase.rpc.mock.calls[0][1]).toEqual({
      p_payment_id: TOPUP_PAYMENT.id,
      p_user_id: TOPUP_PAYMENT.user_id,
      p_tenant_id: TOPUP_PAYMENT.tenant_id,
      p_amount: 10000,
    })
  })

  it('Test 12: existing successful top-ups stay compatible via already_applied', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: false, already_applied: true, amount_rappen: 10000, balance_rappen: 20000 }],
      error: null,
    }))
    await expect(applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      id: 'ef8bd616-existing-success',
      metadata: { is_topup: true, topup_amount_rappen: 10000 },
    })).resolves.toMatchObject({ kind: 'applied', alreadyApplied: true })
  })

  it('does not credit Umair payment_method=credit', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'should-not-run' } }))
    await expect(applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      id: 'f03b5c86-6589-41a0-9d61-b32904c69145',
      payment_method: 'credit',
    })).resolves.toEqual({ kind: 'not_topup' })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('refuses to credit when metadata amount does not match the stored total', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'should-not-run' } }))
    const result = await applyCapturedWalleeTopupCredit(supabase, {
      ...TOPUP_PAYMENT,
      metadata: { is_topup: true, topup_amount_rappen: 99999 },
    })
    expect(result.kind).toBe('invalid_amount')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})

describe('completeCapturedWalleePayment', () => {
  it('Test 7: recover path credits a top-up before completing', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    const result = await completeCapturedWalleePayment(supabase, TOPUP_PAYMENT, {
      statusGuard: 'pending',
    })
    expect(result).toMatchObject({ ok: true, isTopup: true, alreadyApplied: false })
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(supabase.from).toHaveBeenCalledWith('payments')
  })

  it('Test 8 (mock only): recover + webhook together still only credit once', async () => {
    // Mock serialization of two callers. The production unique index / ON CONFLICT
    // is what prevents a double wallet increment.
    let calls = 0
    const supabase = rpcClient(() => {
      calls += 1
      return {
        data: [{
          applied: calls === 1,
          already_applied: calls !== 1,
          amount_rappen: 10000,
          balance_rappen: 10000,
        }],
        error: null,
      }
    })
    const [webhook, recover] = await Promise.all([
      applyCapturedWalleeTopupCredit(supabase, TOPUP_PAYMENT),
      completeCapturedWalleePayment(supabase, TOPUP_PAYMENT, { statusGuard: 'pending' }),
    ])
    expect(webhook).toMatchObject({ kind: 'applied' })
    expect(recover.ok).toBe(true)
    const firstTime = [webhook, recover].filter((r) => (
      ('kind' in r && r.kind === 'applied' && !r.alreadyApplied)
      || ('isTopup' in r && r.isTopup && r.alreadyApplied === false)
    ))
    expect(firstTime.length).toBe(1)
  })

  it('does not complete a top-up when the credit RPC fails', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'amount_mismatch' } }))
    const result = await completeCapturedWalleePayment(supabase, TOPUP_PAYMENT)
    expect(result).toMatchObject({ ok: false, isTopup: true })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('credits a completed Wallee top-up that has no deposit (Sophia replay)', async () => {
    const supabase = rpcClient(() => ({
      data: [{ applied: true, already_applied: false, amount_rappen: 10000, balance_rappen: 10000 }],
      error: null,
    }))
    const result = await completeCapturedWalleePayment(supabase, {
      ...TOPUP_PAYMENT,
      payment_status: 'completed',
    })
    expect(result).toMatchObject({ ok: true, isTopup: true, alreadyApplied: false })
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it('does not credit a shop payment that spoofs the top-up description', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'should-not-run' } }))
    const result = await completeCapturedWalleePayment(supabase, {
      id: 'shop-1',
      user_id: 'u',
      tenant_id: 't',
      payment_method: 'wallee',
      description: 'Guthaben aufladen – Produktkauf',
      total_amount_rappen: 10000,
      lesson_price_rappen: 0,
      products_price_rappen: 10000,
      metadata: { products: [{ id: 'p1' }] },
      appointment_id: null,
    })
    expect(result).toEqual({ ok: true, isTopup: false })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('completes a normal payment without a wallet RPC', async () => {
    const supabase = rpcClient(() => ({ data: null, error: { message: 'should-not-run' } }))
    const result = await completeCapturedWalleePayment(supabase, {
      id: 'lesson-1',
      user_id: 'u',
      tenant_id: 't',
      payment_method: 'wallee',
      description: 'Fahrstunde',
      total_amount_rappen: 9500,
      metadata: {},
      appointment_id: 'appt-1',
    })
    expect(result).toEqual({ ok: true, isTopup: false })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('payments')
  })
})
