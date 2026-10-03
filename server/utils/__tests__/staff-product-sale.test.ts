import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  STAFF_POS_MAX_QUANTITY,
  StaffProductSaleError,
  buildSaleMetadata,
  creditFromSaleSnapshot,
  creditRappenForProduct,
  creditsImmediately,
  customerRejectionCode,
  isEligiblePosCustomer,
  isEligiblePosProduct,
  lineGrossRappen,
  parseStaffPosLines,
  parseStaffPosMethod,
  partitionWebhookPayments,
  paymentStatusFor,
  staffPosPaymentProvider,
  planInvoiceSend,
  allocatePositionNets,
  autoDraftAmountsFromPayments,
  findExactCartNet,
  mergeStaffPosVatSnapshot,
  parseVatRateHundredths,
  requirePosVatRateHundredths,
  snapshotProduct,
  staffPosAllocatedLines,
  staffPosWalleeLineItems,
  sumGrossRappen,
  webhookMayCredit,
} from '../staff-product-sale'
import { executeStaffProductSale } from '../staff-product-sale-orchestrator'
import { applyStaffProductSaleCredits } from '../staff-product-sale-credit'
import { staffProductSaleTitle } from '~/utils/staff-product-sale-display'

const tenant = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const customer = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const productId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const key = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const actor = { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', tenant_id: tenant }

const activeClient = {
  id: customer,
  tenant_id: tenant,
  role: 'client',
  deleted_at: null,
  is_active: true,
}

function catalog(overrides: Record<string, unknown> = {}) {
  return {
    id: productId,
    tenant_id: tenant,
    name: 'Abo',
    price_rappen: 85000,
    is_active: true,
    is_voucher: false,
    is_credit_product: false,
    credit_amount_rappen: null,
    ...overrides,
  }
}

describe('customer authorization', () => {
  it('accepts a client in the same tenant', () => {
    expect(isEligiblePosCustomer(activeClient, tenant)).toBe(true)
    expect(customerRejectionCode(activeClient, tenant)).toBeNull()
  })

  it('rejects a foreign tenant', () => {
    const row = { ...activeClient, tenant_id: other }
    expect(isEligiblePosCustomer(row, tenant)).toBe(false)
    expect(customerRejectionCode(row, tenant)).toBe('foreign_tenant')
  })

  it('rejects a deleted client', () => {
    const row = { ...activeClient, deleted_at: '2026-01-01' }
    expect(isEligiblePosCustomer(row, tenant)).toBe(false)
    expect(customerRejectionCode(row, tenant)).toBe('deleted_customer')
  })

  it('rejects an inactive client even when the search API is skipped', () => {
    const row = { ...activeClient, is_active: false }
    expect(isEligiblePosCustomer(row, tenant)).toBe(false)
    expect(customerRejectionCode(row, tenant)).toBe('inactive_customer')
  })

  it('rejects a staff user', () => {
    expect(customerRejectionCode({ ...activeClient, role: 'staff' }, tenant)).toBe('invalid_customer_role')
  })

  it('rejects an admin user', () => {
    expect(customerRejectionCode({ ...activeClient, role: 'admin' }, tenant)).toBe('invalid_customer_role')
  })
})

describe('product authorization and price authority', () => {
  it('accepts an active own product', () => {
    expect(isEligiblePosProduct(catalog(), tenant)).toBe(true)
  })

  it('rejects a foreign product', () => {
    expect(isEligiblePosProduct(catalog({ tenant_id: other }), tenant)).toBe(false)
  })

  it('rejects an inactive product', () => {
    expect(isEligiblePosProduct(catalog({ is_active: false }), tenant)).toBe(false)
  })

  it('rejects a voucher', () => {
    expect(isEligiblePosProduct(catalog({ is_voucher: true }), tenant)).toBe(false)
  })

  it('accepts quantity 1 and 100 and rejects 0 and negative', () => {
    expect(parseStaffPosLines([{ product_id: productId, quantity: 1 }])[0].quantity).toBe(1)
    expect(parseStaffPosLines([{ product_id: productId, quantity: STAFF_POS_MAX_QUANTITY }])[0].quantity).toBe(100)
    expect(() => parseStaffPosLines([{ product_id: productId, quantity: 0 }])).toThrow(StaffProductSaleError)
    expect(() => parseStaffPosLines([{ product_id: productId, quantity: -1 }])).toThrow(StaffProductSaleError)
  })

  it('rejects a manipulated price or total', () => {
    expect(() => parseStaffPosLines([{ product_id: productId, quantity: 1, price_rappen: 1 }])).toThrow(/price_rappen/)
    expect(() => parseStaffPosLines([{ product_id: productId, quantity: 1, total_amount_rappen: 1 }])).toThrow(StaffProductSaleError)
  })

  it('prices a credit product from credit_amount, not the sale price', () => {
    const product = catalog({ is_credit_product: true, credit_amount_rappen: 95000, price_rappen: 85000 })
    expect(creditRappenForProduct(product, 2)).toBe(190000)
    expect(lineGrossRappen(product.price_rappen, 2)).toBe(170000)
    const snap = snapshotProduct(product, 2)
    expect(snap.credit_amount_rappen).toBe(95000)
    expect(snap.price_rappen).toBe(85000)
  })

  it('guards integer overflow', () => {
    expect(() => lineGrossRappen(2_000_000, 100)).toThrow(StaffProductSaleError)
    expect(() => sumGrossRappen([{ price_rappen: 4_000_000, quantity: 2 }])).toThrow(StaffProductSaleError)
  })
})

describe('payment and credit matrix', () => {
  it('completes cash immediately and credits', () => {
    expect(paymentStatusFor('cash')).toBe('completed')
    expect(creditsImmediately('cash')).toBe(true)
  })

  it('keeps deferred pending, without invoice, and credits immediately', () => {
    expect(paymentStatusFor('deferred')).toBe('pending')
    expect(creditsImmediately('deferred')).toBe(true)
  })

  it('keeps invoice pending and credits immediately', () => {
    expect(paymentStatusFor('invoice')).toBe('pending')
    expect(creditsImmediately('invoice')).toBe(true)
  })

  it('does not credit invoice-send or online before confirmation', () => {
    expect(creditsImmediately('invoice_send')).toBe(false)
    expect(creditsImmediately('wallee')).toBe(false)
    expect(paymentStatusFor('wallee')).toBe('pending')
  })

  it('stores the VAT snapshot without dropping the sale fields', () => {
    const metadata = mergeStaffPosVatSnapshot(buildSaleMetadata({
      idempotencyKey: key,
      method: 'cash',
      products: [snapshotProduct(catalog(), 1)],
    }), { vatRate: 8.1, grossRappen: 10810, netRappen: 10000 })
    expect(metadata).toMatchObject({
      source: 'staff_product_sale',
      idempotency_key: key,
      fulfillment: 'cash',
      vat_rate: 8.1,
      gross_rappen: 10810,
      net_rappen: 10000,
    })
    expect(metadata.products).toEqual([
      expect.objectContaining({ product_id: productId, price_rappen: 85000 }),
    ])
  })

  it('stores the server snapshot and idempotency key', () => {
    const metadata = buildSaleMetadata({
      idempotencyKey: key,
      method: 'cash',
      products: [snapshotProduct(catalog({ is_credit_product: true, credit_amount_rappen: 100 }), 1)],
    })
    expect(metadata.source).toBe('staff_product_sale')
    expect(metadata.idempotency_key).toBe(key)
    expect(metadata).not.toHaveProperty('price')
  })
})

describe('invoice send plan', () => {
  const now = Date.parse('2026-10-01T12:00:00.000Z')

  it('sends when nothing was sent', () => {
    expect(planInvoiceSend({ sentAt: null, claimAt: null, nowMs: now }).action).toBe('send')
  })

  it('skips a second mail after a confirmed send and still allows credit', () => {
    expect(planInvoiceSend({ sentAt: '2026-10-01T11:00:00.000Z', claimAt: null, nowMs: now }).action)
      .toBe('skip_send_apply_credit')
  })

  it('waits on a fresh claim so two retries do not both send', () => {
    expect(planInvoiceSend({
      sentAt: null,
      claimAt: '2026-10-01T11:59:30.000Z',
      nowMs: now,
    }).action).toBe('wait')
  })
})

describe('orchestrator', () => {
  function harness(
    rpcImpl: (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
    extra: Record<string, unknown> = {},
  ) {
    const rpc = vi.fn(rpcImpl)
    return {
      rpc,
      run: (body: Record<string, unknown>) => executeStaffProductSale({
        rpc,
        actor,
        body,
        sendInvoice: async () => ({ sent: true }),
        startWallee: async () => ({ transactionId: 'tx-1', paymentUrl: 'https://pay.example/1' }),
        ...extra,
      }),
    }
  }

  const body = {
    customer_id: customer,
    idempotency_key: key,
    items: [{ product_id: productId, quantity: 2 }],
  }

  it('creates a completed cash sale once and does not credit again', async () => {
    const { rpc, run } = harness(async (args) => {
      const items = args.p_items as Array<{ product_id: string; quantity: number }>
      expect(items[0]).toEqual({ product_id: productId, quantity: 2 })
      return {
        ok: true,
        payment_id: 'pay-1',
        payment_status: 'completed',
        payment_method: 'cash',
        credit_applied: true,
        total_rappen: 170000,
        invoice_id: null,
      }
    })
    const result = await run({ ...body, payment_method: 'cash' })
    expect(result.payment_status).toBe('completed')
    expect(result.invoice_id).toBeNull()
    expect(result.credit_applied).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0][0].p_action).toBe('create')
    expect(rpc.mock.calls[0][0].p_method).toBe('cash')
  })

  it('replays the same idempotency key without a second create', async () => {
    const rpc = vi.fn(async () => ({
      ok: true,
      replayed: true,
      payment_id: 'pay-1',
      payment_status: 'completed',
      payment_method: 'cash',
      credit_applied: true,
      total_rappen: 100,
    }))
    await executeStaffProductSale({ rpc, actor, body: { ...body, payment_method: 'cash' } })
    await executeStaffProductSale({ rpc, actor, body: { ...body, payment_method: 'cash' } })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0][0].p_idempotency_key).toBe(key)
    expect(rpc.mock.calls[1][0].p_idempotency_key).toBe(key)
  })

  it('creates deferred pending with credit and without an invoice', async () => {
    const { rpc, run } = harness(async () => ({
      ok: true,
      payment_id: 'pay-2',
      payment_status: 'pending',
      payment_method: 'deferred',
      credit_applied: true,
      invoice_id: null,
      total_rappen: 1000,
    }))
    const result = await run({ ...body, payment_method: 'deferred' })
    expect(result.payment_status).toBe('pending')
    expect(result.invoice_id).toBeNull()
    expect(result.credit_applied).toBe(true)
    expect(rpc.mock.calls[0][0].p_method).toBe('deferred')
  })

  it('creates an unsent invoice and credits inside the sale', async () => {
    const sendInvoice = vi.fn()
    const { rpc, run } = harness(async () => ({
      ok: true,
      payment_id: 'pay-3',
      payment_status: 'pending',
      payment_method: 'invoice',
      invoice_id: 'inv-1',
      credit_applied: true,
      total_rappen: 1000,
    }), { sendInvoice })
    const result = await run({ ...body, payment_method: 'invoice' })
    expect(result.invoice_id).toBe('inv-1')
    expect(result.invoice_sent).toBe(false)
    expect(result.credit_applied).toBe(true)
    expect(sendInvoice).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('credits invoice-send only after the send succeeds', async () => {
    const sendInvoice = vi.fn(async () => ({ sent: true }))
    const actions: string[] = []
    const { run } = harness(async (args) => {
      actions.push(args.p_action)
      if (args.p_action === 'create') {
        return { ok: true, payment_id: 'pay-4', payment_status: 'pending', invoice_id: 'inv-2', credit_applied: false, total_rappen: 1000 }
      }
      if (args.p_action === 'claim_send') {
        return { ok: true, claimed: true, claim_token: 'claim-1', invoice_id: 'inv-2', payment_id: 'pay-4' }
      }
      if (args.p_action === 'apply_credit') {
        return { ok: true, credit_applied: true, payment_id: 'pay-4' }
      }
      return { ok: true, payment_id: 'pay-4' }
    }, { sendInvoice })
    const result = await run({ ...body, payment_method: 'invoice_send' })
    expect(sendInvoice).toHaveBeenCalledTimes(1)
    expect(result.invoice_sent).toBe(true)
    expect(result.credit_applied).toBe(true)
    expect(actions.filter((action) => action === 'apply_credit')).toHaveLength(1)
  })

  it('keeps the invoice and withholds credit when send fails', async () => {
    const sendInvoice = vi.fn(async () => ({ sent: false, reason: 'send_failed' }))
    const actions: string[] = []
    const { run } = harness(async (args) => {
      actions.push(args.p_action)
      if (args.p_action === 'create') {
        return { ok: true, payment_id: 'pay-5', invoice_id: 'inv-3', credit_applied: false, payment_status: 'pending', total_rappen: 1000 }
      }
      if (args.p_action === 'claim_send') {
        return { ok: true, claimed: true, claim_token: 'claim-2', invoice_id: 'inv-3', payment_id: 'pay-5' }
      }
      return { ok: true, released: true, payment_id: 'pay-5' }
    }, { sendInvoice })
    const result = await run({ ...body, payment_method: 'invoice_send' })
    expect(result.invoice_sent).toBe(false)
    expect(result.credit_applied).toBe(false)
    expect(result.retry_same_key).toBe(true)
    expect(result.invoice_id).toBe('inv-3')
    expect(actions).toContain('release_send')
    expect(actions).not.toContain('apply_credit')
  })

  it('retries a sent invoice without a second mail or a second credit call beyond the idempotent apply', async () => {
    const sendInvoice = vi.fn()
    const actions: string[] = []
    const { run } = harness(async (args) => {
      actions.push(args.p_action)
      if (args.p_action === 'create') {
        return { ok: true, replayed: true, payment_id: 'pay-5', invoice_id: 'inv-3', credit_applied: false, payment_status: 'pending', total_rappen: 1000 }
      }
      if (args.p_action === 'claim_send') {
        return { ok: true, claimed: false, already_sent: true, invoice_id: 'inv-3', payment_id: 'pay-5' }
      }
      return { ok: true, credit_applied: true, replayed: true, payment_id: 'pay-5' }
    }, { sendInvoice })
    const result = await run({ ...body, payment_method: 'invoice_send' })
    expect(sendInvoice).not.toHaveBeenCalled()
    expect(result.invoice_sent).toBe(true)
    expect(result.credit_applied).toBe(true)
    expect(actions.filter((action) => action === 'apply_credit')).toHaveLength(1)
  })

  it('starts online payment without credit', async () => {
    const startWallee = vi.fn(async (input: { paymentId: string; vatRatePercent: number; totalRappen: number }) => {
      expect(input.paymentId).toBe('pay-6')
      expect(input.vatRatePercent).toBe(8.1)
      expect(input.totalRappen).toBe(5000)
      return { transactionId: 'tx-9', paymentUrl: 'https://pay.example/9' }
    })
    const actions: string[] = []
    const { run } = harness(async (args) => {
      actions.push(args.p_action)
      if (args.p_action === 'create') {
        return {
          ok: true,
          payment_id: 'pay-6',
          payment_status: 'pending',
          credit_applied: false,
          total_rappen: 5000,
          vat_rate: 8.1,
          gross_rappen: 5000,
          net_rappen: 4625,
          products: [{ name: 'Abo', quantity: 2, price_rappen: 2500 }],
          customer_email: 'a@example.com',
          customer_name: 'Ada',
        }
      }
      if (args.p_action === 'claim_wallee') {
        return { ok: true, claimed: true, claim_token: 'w-1', payment_id: 'pay-6' }
      }
      return { ok: true, payment_id: 'pay-6', wallee_transaction_id: 'tx-9' }
    }, { startWallee })
    const result = await run({ ...body, payment_method: 'online' })
    expect(result.payment_status).toBe('pending')
    expect(result.credit_applied).toBe(false)
    expect(result.payment_url).toBe('https://pay.example/9')
    expect(actions).not.toContain('apply_credit')
    expect(startWallee).toHaveBeenCalledTimes(1)
  })

  it('rejects manipulated client totals before the RPC', async () => {
    const rpc = vi.fn()
    await expect(executeStaffProductSale({
      rpc,
      actor,
      body: { ...body, payment_method: 'cash', total_amount_rappen: 1 },
    })).rejects.toMatchObject({ code: 'client_price_rejected' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('maps a foreign customer from the RPC', async () => {
    const rpc = vi.fn(async () => {
      throw new Error('invalid_customer')
    })
    await expect(executeStaffProductSale({
      rpc,
      actor,
      body: { ...body, payment_method: 'cash' },
    })).rejects.toMatchObject({ code: 'invalid_customer' })
  })
})

describe('webhook credit', () => {
  const sale = {
    id: 'pay-6',
    tenant_id: tenant,
    user_id: customer,
    payment_status: 'pending',
    metadata: { source: 'staff_product_sale' },
  }

  it('keeps legacy payments on the old path', () => {
    const { staffProductSales, legacy } = partitionWebhookPayments([
      sale,
      { id: 'lesson', metadata: { source: 'shop' } },
      { id: 'appointment', metadata: null },
    ])
    expect(staffProductSales.map((row) => row.id)).toEqual(['pay-6'])
    expect(legacy.map((row) => row.id)).toEqual(['lesson', 'appointment'])
  })

  it('does not credit before confirmation and credits once the webhook confirms', () => {
    expect(webhookMayCredit(sale)).toBe(false)
    expect(webhookMayCredit(sale, 'completed')).toBe(true)
    expect(webhookMayCredit({ ...sale, tenant_id: null }, 'completed')).toBe(false)
  })

  it('calls the payment credit RPC once per confirmed staff sale', async () => {
    const rpc = vi.fn(async () => ({ data: { ok: true, credit_applied: true, replayed: false }, error: null }))
    await applyStaffProductSaleCredits({ rpc }, [sale, { id: 'lesson', metadata: {} }], 'completed')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0][0]).toBe('staff_pos_sale')
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_action: 'apply_credit',
      p_payment_id: 'pay-6',
      p_actor_user_id: null,
    })
  })

  it('does not credit a pending staff sale', async () => {
    const rpc = vi.fn()
    await applyStaffProductSaleCredits({ rpc }, [sale], 'pending')
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('customer history title', () => {
  it('does not require an appointment label', () => {
    expect(staffProductSaleTitle({
      appointment: null,
      metadata: { products: [{ name: 'Abo', quantity: 2, price_rappen: 100 }] },
    })).toBe('2× Abo')
  })

  it('keeps appointment titles', () => {
    expect(staffProductSaleTitle({
      appointment: { event_type_label: 'Fahrstunde', type: 'B' },
    })).toBe('Fahrstunde · Kat. B')
  })
})

describe('migration and legacy guards', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
  const migration1 = read('migrations/20261001_bar_product_sale_schema_preflight.sql')
  const migration2 = read('migrations/20261001_staff_pos_payment_rpc.sql')

  it('does not modify migration 1', () => {
    const hash = createHash('sha256').update(migration1).digest('hex')
    expect(hash).toBe('d51059e4ef996f3d7de15c0ca26619141e0f24262a6e04f710c11f3eacde1220')
    expect(migration1).toContain('IF NEW.appointment_id IS NULL THEN')
    expect(migration1).not.toContain('staff_pos_sale')
  })

  it('limits migration 2 to the RPC and grants', () => {
    expect(migration2).toContain('SECURITY DEFINER')
    expect(migration2).toContain("SET search_path TO pg_catalog, public")
    expect(migration2).toContain('GRANT EXECUTE ON FUNCTION public.staff_pos_sale')
    expect(migration2).toContain('REVOKE ALL ON FUNCTION public.staff_pos_sale')
    expect(migration2).toContain('transaction_source')
    expect(migration2).toContain("'product_sale'")
    expect(migration2).toContain('credit_to_wallet')
    expect(migration2).toContain('false')
    expect(migration2).toContain('unique_violation')
    expect(migration2).toContain("RAISE EXCEPTION 'invalid_vat_rate'")
    expect(migration2).toContain("RAISE EXCEPTION 'no_exact_net'")
    expect(migration2).toContain("RAISE EXCEPTION 'invoice_total_mismatch'")
    expect(migration2).toContain('ROUND((v_candidate::numeric * v_vat_rate / 100)::numeric)')
    expect(migration2.match(/SELECT default_vat_rate/g)).toHaveLength(1)
    expect(migration2).toContain("'vat_rate', v_payment.metadata->'vat_rate'")
    expect(migration2).not.toContain('COALESCE(default_vat_rate')
    expect(migration2).not.toContain('v_gross * v_vat_rate / (100 + v_vat_rate)')
    expect(migration2).toContain('pg_advisory_xact_lock')
    expect(migration2).toContain("'credit_product_purchase'")
    expect(migration2).toContain("'payment'")
    expect(migration2).not.toMatch(/ALTER\s+TABLE/i)
    expect(migration2).not.toMatch(/CREATE\s+(UNIQUE\s+)?INDEX/i)
    expect(migration2).not.toMatch(/INSERT\s+INTO\s+(public\.)?product_sales/i)
    expect(migration2).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.book_payment_to_accounting/i)
    expect(migration2).not.toMatch(/FUNCTION\s+public\.create_cash_transaction_from_payment/i)
    expect(migration2).not.toMatch(/\bCOMMIT\b/)
  })

  it('leaves the legacy POS and the old Wallee product path in place', () => {
    const legacy = read('server/api/admin/product-sales/staff-pos.post.ts')
    const webhook = read('server/api/wallee/webhook.post.ts')
    const customers = read('server/utils/get-filtered-students.ts')
    expect(legacy).toContain("from('product_sales')")
    expect(legacy).toContain('pos-${sale.id}')
    expect(webhook).toContain('processAnonymousSale')
    expect(webhook).toContain('processVouchersAndCredits(legacy)')
    expect(webhook).toContain('applyStaffProductSaleCredits')
    expect(customers).toContain('restrictToAssigned')
  })
})

describe('sale snapshot credit', () => {
  it('keeps the sold credit after the live product amount changes', () => {
    const sold = [{ is_credit_product: true, credit_amount_rappen: 95000, quantity: 1 }]
    expect(creditFromSaleSnapshot(sold)).toBe(95000)
  })

  it('rejects a zero credit snapshot for a credit product', () => {
    expect(() => creditFromSaleSnapshot([
      { is_credit_product: true, credit_amount_rappen: 0, quantity: 1 },
    ])).toThrow(StaffProductSaleError)
  })

  it('credits nothing for a non-credit line', () => {
    expect(creditFromSaleSnapshot([
      { is_credit_product: false, credit_amount_rappen: 0, quantity: 1 },
    ])).toBe(0)
  })
})

describe('payment provider domain', () => {
  it('stores wallee only for online and null for cash, invoice, and deferred', () => {
    expect(staffPosPaymentProvider('wallee')).toBe('wallee')
    expect(staffPosPaymentProvider('cash')).toBeNull()
    expect(staffPosPaymentProvider('invoice')).toBeNull()
    expect(staffPosPaymentProvider('invoice_send')).toBeNull()
    expect(staffPosPaymentProvider('deferred')).toBeNull()
  })
})

describe('tenant sale matrix', () => {
  const productA = catalog()
  const customerB = { ...activeClient, tenant_id: other }
  const productB = catalog({ tenant_id: other })

  it('accepts staff tenant A with customer A and product A', () => {
    expect(isEligiblePosCustomer(activeClient, tenant)).toBe(true)
    expect(isEligiblePosProduct(productA, tenant)).toBe(true)
  })

  it('rejects tenant B customer and tenant B product for tenant A staff', () => {
    expect(isEligiblePosCustomer(customerB, tenant)).toBe(false)
    expect(isEligiblePosProduct(productB, tenant)).toBe(false)
    expect(isEligiblePosCustomer(activeClient, other)).toBe(false)
    expect(isEligiblePosProduct(productA, other)).toBe(false)
  })
})

describe('method alias', () => {
  it('maps the email link to wallee', () => {
    expect(parseStaffPosMethod('online')).toBe('wallee')
  })
})

describe('VAT integer net', () => {
  const rate = (text: string) => {
    const hundredths = parseVatRateHundredths(text)
    expect(hundredths).not.toBeNull()
    return hundredths as number
  }

  it('keeps a 0% cart unchanged', () => {
    expect(findExactCartNet(85000, rate('0'))).toEqual({ net: 85000, vat: 0 })
  })

  it('matches 8.10% on 108.10 CHF', () => {
    expect(findExactCartNet(10810, rate('8.10'))).toEqual({ net: 10000, vat: 810 })
  })

  it('matches 7.70% on 100 rappen', () => {
    expect(findExactCartNet(100, rate('7.70'))).toEqual({ net: 93, vat: 7 })
  })

  it('matches 8.10% on 101 rappen', () => {
    expect(findExactCartNet(101, rate('8.10'))).toEqual({ net: 93, vat: 8 })
  })

  it('aborts 100 rappen at 8.10%', () => {
    expect(findExactCartNet(100, rate('8.10'))).toBeNull()
  })

  it('aborts 7 rappen at 8.10%', () => {
    expect(findExactCartNet(7, rate('8.10'))).toBeNull()
  })

  it('aborts 7 rappen at 7.70%', () => {
    expect(findExactCartNet(7, rate('7.70'))).toBeNull()
  })

  it('solves quantity from the line gross', () => {
    expect(findExactCartNet(100, rate('8.10'))).toBeNull()
    expect(findExactCartNet(200, rate('8.10'))).toEqual({ net: 185, vat: 15 })
    expect(allocatePositionNets([{ price_rappen: 100, quantity: 2 }], 185)).toEqual([185])
  })

  it('solves eight 1-rappen units from the header gross once', () => {
    const perUnit = findExactCartNet(1, rate('8.10'))
    expect(perUnit).toEqual({ net: 1, vat: 0 })
    expect(findExactCartNet(8, rate('8.10'))).toEqual({ net: 7, vat: 1 })
    expect((perUnit?.net || 0) * 8).not.toBe(7)
    expect(allocatePositionNets(
      Array.from({ length: 8 }, () => ({ price_rappen: 1, quantity: 1 })),
      7,
    ).reduce((sum, net) => sum + net, 0)).toBe(7)
  })

  it('allocates 2 + 6 from one header net', () => {
    const header = findExactCartNet(8, rate('8.10'))
    expect(header).toEqual({ net: 7, vat: 1 })
    const nets = allocatePositionNets([
      { price_rappen: 2, quantity: 1 },
      { price_rappen: 6, quantity: 1 },
    ], header!.net)
    expect(nets.reduce((sum, net) => sum + net, 0)).toBe(header!.net)
    expect(findExactCartNet(2, rate('8.10'))!.net + findExactCartNet(6, rate('8.10'))!.net).not.toBe(header!.net)
  })

  it('rejects NULL, negative, and rates above 100 before any insert', () => {
    expect(() => requirePosVatRateHundredths(null)).toThrow(StaffProductSaleError)
    expect(() => requirePosVatRateHundredths(undefined)).toThrow(StaffProductSaleError)
    expect(() => requirePosVatRateHundredths(Number.NaN)).toThrow(StaffProductSaleError)
    expect(() => requirePosVatRateHundredths(-1)).toThrow(StaffProductSaleError)
    expect(() => requirePosVatRateHundredths('-0.01')).toThrow(StaffProductSaleError)
    expect(() => requirePosVatRateHundredths(100.01)).toThrow(StaffProductSaleError)
    expect(() => requirePosVatRateHundredths('101')).toThrow(StaffProductSaleError)
    expect(requirePosVatRateHundredths(0)).toBe(0)
    expect(requirePosVatRateHundredths('8.10')).toBe(810)
    expect(requirePosVatRateHundredths('100')).toBe(10000)
  })

  it('keeps a changed tenant rate off an existing snapshot', () => {
    const stored = mergeStaffPosVatSnapshot({
      source: 'staff_product_sale',
      idempotency_key: key,
      fulfillment: 'wallee',
      products: [{ product_id: productId, name: 'Abo', quantity: 1, price_rappen: 10810 }],
    }, { vatRate: 8.1, grossRappen: 10810, netRappen: 10000 })
    const currentTenantRate = 0
    const draft = autoDraftAmountsFromPayments([{
      metadata: stored,
      total_amount_rappen: 10810,
      discount_amount_rappen: 0,
      amount_paid_rappen: 0,
    }], currentTenantRate)
    expect(draft).toMatchObject({
      subtotal_rappen: 10000,
      vat_rate: 8.1,
      vat_amount_rappen: 810,
      total_amount_rappen: 10810,
    })
    const lines = staffPosAllocatedLines(stored)
    expect(lines?.reduce((sum, line) => sum + line.netRappen, 0)).toBe(10000)
    expect(lines?.[0].vatRate).toBe(8.1)
  })

  it('still adds tenant VAT for a non-POS payment', () => {
    expect(autoDraftAmountsFromPayments([{
      total_amount_rappen: 10000,
      discount_amount_rappen: 0,
      amount_paid_rappen: 0,
    }], 8.1)).toMatchObject({
      subtotal_rappen: 10000,
      vat_rate: 8.1,
      vat_amount_rappen: 810,
      total_amount_rappen: 10810,
    })
  })

  it('passes the stored percent to Wallee and keeps the gross CHF amount', () => {
    const taxed = staffPosWalleeLineItems(
      [{ name: 'Abo', quantity: 1, price_rappen: 10810 }],
      8.1,
    )
    expect(taxed[0].taxRate).toBe(8.1)
    expect(taxed[0].amountIncludingTax).toBe(108.1)
    const exempt = staffPosWalleeLineItems(
      [{ name: 'Abo', quantity: 1, price_rappen: 85000 }],
      0,
    )
    expect(exempt[0].taxRate).toBe(0)
    expect(exempt[0].amountIncludingTax).toBe(850)
  })
})

describe('VAT replay and Wallee gate', () => {
  const body = {
    customer_id: customer,
    idempotency_key: key,
    items: [{ product_id: productId, quantity: 1 }],
    payment_method: 'online',
  }

  it('starts Wallee with the stored snapshot after replay', async () => {
    const startWallee = vi.fn(async (input: { vatRatePercent: number }) => {
      expect(input.vatRatePercent).toBe(8.1)
      return { transactionId: 'tx-2', paymentUrl: 'https://pay.example/2' }
    })
    await executeStaffProductSale({
      rpc: async (args) => {
        if (args.p_action === 'create') {
          return {
            ok: true,
            replayed: true,
            payment_id: 'pay-9',
            payment_status: 'pending',
            total_rappen: 10810,
            vat_rate: 8.1,
            gross_rappen: 10810,
            net_rappen: 10000,
            products: [{ name: 'Abo', quantity: 1, price_rappen: 10810 }],
            customer_email: 'a@example.com',
            customer_name: 'Ada',
          }
        }
        if (args.p_action === 'claim_wallee') {
          return { ok: true, claimed: true, claim_token: 'w-2', payment_id: 'pay-9' }
        }
        return { ok: true, payment_id: 'pay-9' }
      },
      actor,
      body,
      startWallee,
    })
    expect(startWallee).toHaveBeenCalledTimes(1)
  })

  it('does not start Wallee when the sale has no exact net', async () => {
    const startWallee = vi.fn()
    await expect(executeStaffProductSale({
      rpc: async () => {
        throw new Error('no_exact_net')
      },
      actor,
      body,
      startWallee,
    })).rejects.toMatchObject({ code: 'no_exact_net' })
    expect(startWallee).not.toHaveBeenCalled()
  })

  it('does not start Wallee when the stored rate is missing', async () => {
    const startWallee = vi.fn()
    const result = await executeStaffProductSale({
      rpc: async (args) => {
        if (args.p_action === 'create') {
          return {
            ok: true,
            payment_id: 'pay-10',
            payment_status: 'pending',
            total_rappen: 10810,
            customer_email: 'a@example.com',
            customer_name: 'Ada',
            products: [],
          }
        }
        if (args.p_action === 'claim_wallee') {
          return { ok: true, claimed: true, claim_token: 'w-3', payment_id: 'pay-10' }
        }
        return { ok: true, released: true, payment_id: 'pay-10' }
      },
      actor,
      body,
      startWallee,
    })
    expect(startWallee).not.toHaveBeenCalled()
    expect(result.payment_url).toBeNull()
    expect(result.warning).toBe('MwSt-Satz des Verkaufs fehlt')
  })

  it('treats a zero credit snapshot as a failed credit, not a silent success', async () => {
    await expect(executeStaffProductSale({
      rpc: async () => {
        throw new Error('zero_credit_snapshot')
      },
      actor,
      body,
    })).rejects.toMatchObject({ code: 'zero_credit_snapshot', statusCode: 409 })
  })
})

describe('remediation SQL contract', () => {
  const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
  const sql = read('migrations/20261003_staff_pos_credit_remediation.sql')
  const applyCredit = sql.slice(sql.indexOf('apply_credit uses the sale snapshot only'))

  it('requires an active client in the sale tenant', () => {
    expect(sql).toContain('AND role = \'client\'')
    expect(sql).toContain('AND deleted_at IS NULL')
    expect(sql).toContain('AND is_active IS TRUE')
    expect(sql).toContain('AND tenant_id = v_tenant')
  })

  it('credits later payments from the snapshot and rejects a zero credit product snapshot', () => {
    expect(applyCredit).toContain("v_item->>'credit_amount_rappen'")
    expect(applyCredit).toContain("RAISE EXCEPTION 'zero_credit_snapshot'")
    expect(applyCredit).not.toContain('FROM public.products')
  })

  it('stores wallee only for online sales', () => {
    expect(sql).toContain("CASE WHEN p_method = 'wallee' THEN 'wallee' ELSE NULL END")
    expect(sql).not.toContain("'deferred'::")
  })

  it('books staff product sales as Produkte & Materialien and leaves appointments as Termine', () => {
    expect(sql).toContain("WHEN NEW.metadata->>'source' = 'staff_product_sale' THEN 'Produkte & Materialien'")
    expect(sql).toContain("ELSE 'Termine'")
    expect(sql).toContain('WHERE NOT EXISTS')
  })

  it('keeps idempotency locks and closes client writes', () => {
    expect(sql).toContain('pg_advisory_xact_lock')
    expect(sql).toContain('unique_violation')
    expect(sql).toContain('DROP POLICY IF EXISTS "products_public_read"')
    expect(sql).toContain('show_in_shop IS TRUE')
    expect(sql).toContain('DROP POLICY IF EXISTS "credit_transactions_update_staff"')
    expect(sql).toContain('DROP POLICY IF EXISTS "sc_update_staff"')
    expect(sql).toContain('REVOKE ALL ON TABLE public.student_credits FROM anon')
    expect(sql).toContain('REVOKE ALL ON TABLE public.credit_transactions FROM authenticated')
    expect(sql).toContain('GRANT SELECT ON TABLE public.student_credits TO authenticated')
    expect(sql).not.toContain('GRANT ALL')
  })
})
