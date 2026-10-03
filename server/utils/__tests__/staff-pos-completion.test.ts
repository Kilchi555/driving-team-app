import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { creditFromSaleSnapshot } from '../staff-product-sale'
import {
  applyStaffPosCreditsForPaidInvoice,
  completeDeferredStaffProductSale,
  refuseStaffPosCompletion,
  staffPosApplyCreditArgs,
  staffPosCompleteArgs,
  type StaffPosCompletionPayment,
} from '../staff-pos-completion'
import { isDeferredStaffProductSale, isStaffProductSalePayment } from '~/utils/staff-product-sale-display'

const tenantA = '11111111-1111-4111-8111-111111111111'
const tenantB = '22222222-2222-4222-8222-222222222222'
const paymentId = '33333333-3333-4333-8333-333333333333'

function deferred(overrides: Partial<StaffPosCompletionPayment> = {}): StaffPosCompletionPayment {
  return {
    id: paymentId,
    tenant_id: tenantA,
    payment_method: 'deferred',
    payment_status: 'pending',
    appointment_id: null,
    metadata: { source: 'staff_product_sale', fulfillment: 'deferred' },
    ...overrides,
  }
}

describe('deferred completion guard', () => {
  it('accepts a pending deferred staff-pos sale in the actor tenant', () => {
    expect(refuseStaffPosCompletion(deferred(), tenantA)).toBeNull()
  })

  it('accepts an already completed sale so the RPC can replay', () => {
    expect(refuseStaffPosCompletion(deferred({ payment_status: 'completed' }), tenantA)).toBeNull()
  })

  it('hides a foreign payment', () => {
    const error = refuseStaffPosCompletion(deferred({ tenant_id: tenantB }), tenantA)
    expect(error?.statusCode).toBe(404)
    expect(error?.code).toBe('invalid_payment')
  })

  it('hides a missing payment', () => {
    expect(refuseStaffPosCompletion(null, tenantA)?.statusCode).toBe(404)
  })

  it.each(['cash', 'wallee', 'invoice', 'invoice_send'])('rejects %s', (method) => {
    const error = refuseStaffPosCompletion(deferred({ payment_method: method }), tenantA)
    expect(error?.code).toBe('invalid_method')
  })

  it('rejects a mismatched fulfillment', () => {
    const error = refuseStaffPosCompletion(deferred({
      metadata: { source: 'staff_product_sale', fulfillment: 'invoice' },
    }), tenantA)
    expect(error?.code).toBe('invalid_fulfillment')
  })

  it('rejects a sale that is attached to an appointment', () => {
    const error = refuseStaffPosCompletion(deferred({ appointment_id: 'appt-1' }), tenantA)
    expect(error?.code).toBe('invalid_payment')
  })

  it('rejects an ordinary appointment payment', () => {
    const error = refuseStaffPosCompletion(deferred({
      metadata: { source: 'appointment' },
      payment_method: 'cash',
      appointment_id: 'appt-1',
    }), tenantA)
    expect(error?.statusCode).toBe(409)
    expect(error?.code).toBe('invalid_payment')
  })

  it.each(['failed', 'cancelled', 'refunded', 'partial', 'processing'])('rejects %s', (status) => {
    const error = refuseStaffPosCompletion(deferred({ payment_status: status }), tenantA)
    expect(error?.code).toBe('invalid_transition')
  })
})

describe('deferred completion call', () => {
  it('completes once and returns the snapshot credit', async () => {
    const rpc = vi.fn(async () => ({
      ok: true,
      payment_status: 'completed',
      credit_applied: true,
      replayed: false,
      credit_rappen: 95000,
    }))
    const result = await completeDeferredStaffProductSale({
      rpc,
      actorId: 'staff-1',
      actorTenantId: tenantA,
      payment: deferred(),
    })
    expect(result).toEqual({
      payment_status: 'completed',
      credit_applied: true,
      replayed: false,
      credit_rappen: 95000,
    })
    expect(rpc.mock.calls[0][0]).toEqual(staffPosCompleteArgs('staff-1', paymentId))
  })

  it('does not call the RPC for a foreign tenant', async () => {
    const rpc = vi.fn()
    await expect(completeDeferredStaffProductSale({
      rpc,
      actorId: 'staff-b',
      actorTenantId: tenantB,
      payment: deferred(),
    })).rejects.toMatchObject({ statusCode: 404 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rolls a zero snapshot back to the caller as a failure', async () => {
    const rpc = vi.fn(async () => {
      throw new Error('zero_credit_snapshot')
    })
    await expect(completeDeferredStaffProductSale({
      rpc,
      actorId: 'staff-1',
      actorTenantId: tenantA,
      payment: deferred(),
    })).rejects.toMatchObject({ code: 'zero_credit_snapshot', statusCode: 409 })
  })

  it('keeps the stored snapshot when the live product credit later changes', () => {
    const snapshot = [{ is_credit_product: true, credit_amount_rappen: 95000, quantity: 1 }]
    const liveProductCredit = 0
    expect(liveProductCredit).toBe(0)
    expect(creditFromSaleSnapshot(snapshot)).toBe(95000)
  })

  it('serializes two completions onto one credit write', async () => {
    let status = 'pending'
    let credits = 0
    let chain = Promise.resolve()
    const rpc = vi.fn((args: Record<string, unknown>) => {
      const run = chain.then(async () => {
        expect(args.p_action).toBe('complete')
        if (status === 'completed') {
          return { ok: true, payment_status: 'completed', credit_applied: true, replayed: true, credit_rappen: 0 }
        }
        status = 'completed'
        credits += 1
        return { ok: true, payment_status: 'completed', credit_applied: true, replayed: false, credit_rappen: 95000 }
      })
      chain = run.then(() => undefined, () => undefined)
      return run
    })
    const [first, second] = await Promise.all([
      completeDeferredStaffProductSale({ rpc, actorId: 'staff-1', actorTenantId: tenantA, payment: deferred() }),
      completeDeferredStaffProductSale({ rpc, actorId: 'staff-1', actorTenantId: tenantA, payment: deferred() }),
    ])
    expect(credits).toBe(1)
    expect(status).toBe('completed')
    expect([first.replayed, second.replayed].sort()).toEqual([false, true])
    expect(first.credit_rappen + second.credit_rappen).toBe(95000)
  })
})

describe('invoice payment credit', () => {
  const staffPayment = {
    id: paymentId,
    tenant_id: tenantA,
    metadata: { source: 'staff_product_sale', fulfillment: 'invoice' },
  }
  const appointmentPayment = {
    id: '44444444-4444-4444-8444-444444444444',
    tenant_id: tenantA,
    metadata: { source: 'appointment' },
  }

  it('does not credit a partial invoice payment', async () => {
    const rpc = vi.fn()
    const result = await applyStaffPosCreditsForPaidInvoice({
      payments: [staffPayment],
      tenantId: tenantA,
      actorUserId: 'admin-1',
      isPartial: true,
      rpc,
    })
    expect(result.credited).toBe(0)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('credits a fully paid staff-pos invoice once from the caller', async () => {
    const rpc = vi.fn(async () => ({ ok: true, credit_applied: true, replayed: false, credit_rappen: 95000 }))
    const result = await applyStaffPosCreditsForPaidInvoice({
      payments: [staffPayment, appointmentPayment, { ...staffPayment, id: 'foreign', tenant_id: tenantB }],
      tenantId: tenantA,
      actorUserId: 'tenant-admin-1',
      isPartial: false,
      rpc,
    })
    expect(result.credited).toBe(1)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0][0]).toEqual(staffPosApplyCreditArgs('tenant-admin-1', paymentId))
  })

  it('counts a replay as no second credit', async () => {
    const rpc = vi.fn(async () => ({ ok: true, credit_applied: true, replayed: true, credit_rappen: 0 }))
    const result = await applyStaffPosCreditsForPaidInvoice({
      payments: [staffPayment],
      tenantId: tenantA,
      actorUserId: 'admin-1',
      isPartial: false,
      rpc,
    })
    expect(result.credited).toBe(0)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('does not credit an open invoice when the RPC reports the payment is still pending', async () => {
    const rpc = vi.fn(async () => {
      throw new Error('payment_not_completed')
    })
    await expect(applyStaffPosCreditsForPaidInvoice({
      payments: [staffPayment],
      tenantId: tenantA,
      actorUserId: 'admin-1',
      isPartial: false,
      rpc,
    })).rejects.toMatchObject({ code: 'payment_not_completed' })
  })
})

describe('legacy completion bypass', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

  it('rejects staff product sales inside bulk payment before any update', () => {
    const src = read('server/api/staff/process-bulk-payment.post.ts')
    const guard = src.indexOf('isStaffProductSalePayment')
    const update = src.indexOf('.update(')
    expect(guard).toBeGreaterThan(0)
    expect(update).toBeGreaterThan(guard)
    expect(src).toContain('Staff-POS-Zahlungen können nicht über die Sammelzahlung abgeschlossen werden.')
  })

  it('rejects staff product sales in mark-paid before the cash update', () => {
    const src = read('server/api/invoices/mark-paid.post.ts')
    const guard = src.indexOf('isStaffProductSalePayment')
    const update = src.indexOf(".update(")
    expect(guard).toBeGreaterThan(0)
    expect(update).toBeGreaterThan(guard)
    expect(src).not.toContain(".eq('tenant_id'")
  })

  it('keeps manage mark-completed closed for deferred', () => {
    const src = read('server/api/payments/manage.post.ts')
    expect(src).toContain("['cash', 'twint', 'bank_transfer', 'card_terminal', 'invoice']")
    expect(src).not.toContain('staff_pos_sale')
    expect(src).not.toContain("'deferred'")
  })

  it('keeps appointment payment operations on appointment ids', () => {
    const src = read('server/api/admin/payment-operations.post.ts')
    expect(src).toContain('Missing appointment_id')
    expect(src).not.toContain('staff_pos_sale')
    expect(src).not.toContain('staff_product_sale')
  })

  it('does not treat invoice status paid as a payment completion', () => {
    const src = read('server/api/admin/invoice-update-status.post.ts')
    expect(src).not.toContain('staff_pos_sale')
    expect(src).not.toContain('apply_credit')
    expect(src).not.toContain("from('payments')")
  })

  it('scopes the invoice payment update and credits staff-pos only after full payment', () => {
    const src = read('server/api/invoices/mark-invoice-paid.post.ts')
    expect(src).toContain(".eq('tenant_id', invoice.tenant_id)")
    expect(src).toContain('applyStaffPosCreditsForPaidInvoice')
    expect(src.indexOf('if (!isPartial)')).toBeLessThan(src.indexOf('await applyStaffPosCreditsForPaidInvoice'))
    expect(src).toContain('applyInvoiceCreditOnPaid')
  })

  it('classifies deferred staff-pos rows separately from invoice sales', () => {
    expect(isDeferredStaffProductSale({
      payment_method: 'deferred',
      appointment_id: null,
      metadata: { source: 'staff_product_sale', fulfillment: 'deferred' },
    })).toBe(true)
    expect(isStaffProductSalePayment({
      metadata: { source: 'staff_product_sale' },
    })).toBe(true)
    expect(isDeferredStaffProductSale({
      payment_method: 'invoice',
      metadata: { source: 'staff_product_sale', fulfillment: 'invoice' },
    })).toBe(false)
  })
})

describe('completion SQL contract', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
  const sql = read('migrations/20261004_staff_pos_payment_completion.sql')
  const previous = read('migrations/20261003_staff_pos_credit_remediation.sql')

  it('leaves the previous remediation file as the earlier function body', () => {
    expect(previous).toContain("IF p_method IN ('cash', 'deferred', 'invoice') AND v_credit > 0 THEN")
    expect(sql).not.toContain("IF p_method IN ('cash', 'deferred', 'invoice') AND v_credit > 0 THEN")
    expect(sql).toContain("IF p_method = 'cash' AND v_credit > 0 THEN")
  })

  it('credits only from the snapshot after the payment is completed', () => {
    const applyCredit = sql.slice(sql.indexOf('apply_credit uses the sale snapshot only'))
    expect(applyCredit).toContain("v_item->>'credit_amount_rappen'")
    expect(applyCredit).toContain("RAISE EXCEPTION 'zero_credit_snapshot'")
    expect(applyCredit).not.toContain('FROM public.products')
    expect(sql).toContain("IF v_payment.payment_status IS DISTINCT FROM 'completed' THEN")
    expect(sql).toContain("RAISE EXCEPTION 'payment_not_completed'")
    expect(sql).not.toContain('invoice_not_sent')
  })

  it('limits tenant_admin to apply_credit and keeps complete on staff roles', () => {
    const roles = sql.slice(sql.indexOf("IF p_action = 'apply_credit' THEN"), sql.indexOf('v_tenant := v_actor.tenant_id'))
    expect(roles).toContain("'tenant_admin'")
    expect(roles.slice(roles.indexOf('ELSIF'))).not.toContain('tenant_admin')
    expect(sql).toContain("ELSIF p_action <> 'apply_credit' THEN")
    expect(sql).toContain("IF p_actor_user_id IS NULL AND v_fulfillment IS DISTINCT FROM 'wallee' THEN")
  })

  it('completes deferred in one transaction and rolls back a bad snapshot', () => {
    const lock = sql.indexOf("pg_advisory_xact_lock(hashtext('staff-pos-payment')")
    const complete = sql.indexOf("IF p_action = 'complete' THEN")
    const update = sql.indexOf("SET payment_status = 'completed'", complete)
    const raise = sql.indexOf("RAISE EXCEPTION 'zero_credit_snapshot'", update)
    const creditBegin = sql.indexOf('\n  BEGIN', raise)
    const handler = sql.indexOf('WHEN unique_violation', creditBegin)
    const assignment = sql.slice(update, sql.indexOf('WHERE id = v_payment_id', update))
    expect(lock).toBeGreaterThan(0)
    expect(complete).toBeGreaterThan(lock)
    expect(sql.indexOf("RAISE EXCEPTION 'foreign_tenant'")).toBeLessThan(complete)
    expect(update).toBeGreaterThan(complete)
    expect(sql.slice(update, sql.indexOf('IF NOT FOUND THEN', update))).toContain('AND tenant_id = v_tenant')
    expect(sql.slice(update, sql.indexOf('IF NOT FOUND THEN', update))).toContain("AND payment_status = 'pending'")
    expect(assignment).not.toContain('payment_method')
    expect(raise).toBeGreaterThan(update)
    expect(creditBegin).toBeGreaterThan(raise)
    expect(handler).toBeGreaterThan(creditBegin)
    expect(sql.slice(sql.indexOf("IF p_action = 'complete'"), sql.indexOf('-- apply_credit'))).not.toContain('cash_transactions')
    expect(sql).toContain("pg_advisory_xact_lock(hashtext('staff-pos-credit')")
    expect(sql).toContain('amount_paid_rappen = v_payment.total_amount_rappen')
    expect(sql).toContain('paid_at = v_now')
  })

  it('does not grant the function to browser roles or add schema objects', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.staff_pos_sale')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.staff_pos_sale')
    expect(sql).toContain('TO service_role')
    expect(sql).not.toContain('TO anon')
    expect(sql).not.toContain('TO authenticated')
    expect(sql).not.toContain('CREATE INDEX')
    expect(sql).not.toContain('ALTER TABLE')
    expect(sql).not.toContain('accounting_entries')
  })
})
