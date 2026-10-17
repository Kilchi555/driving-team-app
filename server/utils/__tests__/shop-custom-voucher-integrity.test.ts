import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CUSTOM_VOUCHER_QTY_ONE_MESSAGE,
  CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE,
  canAddCustomVoucherToCart,
  clampCustomVoucherCartQuantity,
  customVoucherCheckoutLimitError,
  customVoucherFulfillmentKey,
  customVoucherUnitCount,
  isCustomAmountVoucher,
  parseExactCustomVoucherQuantity,
  resolveCustomVoucherDisplayName,
} from '~/utils/shop-custom-voucher'
import { parseFeatureEnabled, splitShopCatalog } from '../shop-voucher-feature'
import { sanitizeString } from '../validators'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getHeader: vi.fn(() => '198.51.100.10'),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUserWithDbId: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUserWithDbId: mocks.getAuthenticatedUserWithDbId,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-4111-8111-111111111111'
const CUSTOM_VOUCHER = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const FIXED_PRODUCT = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const FOREIGN_PRODUCT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PAYMENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

type PaymentProductMeta = {
  id: string
  quantity: number
  unit_price_rappen: number
  name?: string
  display_name?: string
  product_template_name?: string
  description?: string
  recipient_name?: string
  fulfillment_key?: string
  is_custom_amount_voucher?: boolean
}

type EventHandler = (event: object) => Promise<unknown>

const fakeEvent = {
  node: { req: { headers: {}, socket: { remoteAddress: '198.51.100.10' } } },
}

function thenable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.in = vi.fn(chain)
  builder.insert = vi.fn(async () => result)
  builder.update = vi.fn(async () => result)
  builder.maybeSingle = vi.fn(async () => result)
  builder.single = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

describe('shop custom voucher helpers', () => {
  it('identifies custom-amount vouchers by flags, not UUID alone', () => {
    expect(isCustomAmountVoucher({ id: CUSTOM_VOUCHER, is_voucher: true, allow_custom_amount: true })).toBe(true)
    expect(isCustomAmountVoucher({ id: CUSTOM_VOUCHER, is_voucher: true, allow_custom_amount: false })).toBe(false)
    expect(isCustomAmountVoucher({ id: FIXED_PRODUCT, is_voucher: false, allow_custom_amount: false })).toBe(false)
  })

  it('rejects a second custom voucher in the cart without mutating state', () => {
    const existing = [{
      id: CUSTOM_VOUCHER,
      is_voucher: true,
      allow_custom_amount: true,
      quantity: 1,
    }]
    const gate = canAddCustomVoucherToCart(existing)
    expect(gate.ok).toBe(false)
    expect(gate.message).toBe(CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE)
    expect(existing).toHaveLength(1)
    expect(existing[0].quantity).toBe(1)
  })

  it('counts quantity>1 as multiple custom voucher units', () => {
    expect(customVoucherUnitCount([{
      is_voucher: true,
      allow_custom_amount: true,
      quantity: 2,
    }])).toBe(2)
    expect(customVoucherCheckoutLimitError([{
      is_voucher: true,
      allow_custom_amount: true,
      quantity: 2,
    }])).toBe(CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE)
  })

  it('preserves recipient-facing display name separately from template name', () => {
    const display = resolveCustomVoucherDisplayName(
      { name: 'Gutschein für Anna - CHF 50.00', display_name: 'Gutschein für Anna - CHF 50.00' },
      'Individueller Gutschein',
      sanitizeString,
    )
    expect(display).toBe('Gutschein für Anna - CHF 50.00')
    expect(display).not.toBe('Individueller Gutschein')
  })

  it('guest feature flag parsing + catalog split keep tenant products isolated by construction', () => {
    expect(parseFeatureEnabled(JSON.stringify({ enabled: true }))).toBe(true)
    expect(parseFeatureEnabled(JSON.stringify({ enabled: false }))).toBe(false)
    const { catalog, customVoucherProduct } = splitShopCatalog([
      { id: 'a', is_voucher: false, allow_custom_amount: false },
      { id: CUSTOM_VOUCHER, is_voucher: true, allow_custom_amount: true },
    ])
    expect(customVoucherProduct?.id).toBe(CUSTOM_VOUCHER)
    expect(catalog.map(p => p.id)).toEqual(['a'])
  })
})

describe('shop create-payment custom voucher integrity', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getAuthenticatedUserWithDbId.mockReset()
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(null)
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
  })

  async function createPaymentHandler(): Promise<EventHandler> {
    return (await import('../../api/shop/create-payment.post')).default as EventHandler
  }

  function mockCreatePayment(opts: {
    products: Array<Record<string, unknown>>
    onInsert?: (payload: Record<string, unknown>) => void
  }) {
    const insert = vi.fn(async (payload: Record<string, unknown>) => {
      opts.onInsert?.(payload)
      return {
        data: {
          id: PAYMENT,
          total_amount_rappen: payload.total_amount_rappen,
          payment_status: 'pending',
          tenant_id: TENANT,
          payment_method: 'wallee',
        },
        error: null,
      }
    })

    const from = vi.fn((table: string) => {
      if (table === 'tenants') {
        return thenable({ data: { id: TENANT, is_active: true }, error: null })
      }
      if (table === 'products') {
        return thenable({ data: opts.products, error: null })
      }
      if (table === 'payments') {
        const builder = thenable({
          data: {
            id: PAYMENT,
            total_amount_rappen: 5000,
            payment_status: 'pending',
            tenant_id: TENANT,
            payment_method: 'wallee',
          },
          error: null,
        })
        builder.insert = (payload: Record<string, unknown>) => {
          const result = insert(payload)
          return {
            select: () => ({
              single: async () => result,
            }),
          }
        }
        return builder
      }
      return thenable({ data: null, error: null })
    })

    mocks.getSupabaseAdmin.mockReturnValue({ from })
    return { insert }
  }

  const customDbProduct = {
    id: CUSTOM_VOUCHER,
    name: 'Individueller Gutschein',
    price_rappen: 0,
    is_voucher: true,
    allow_custom_amount: true,
    min_amount_rappen: 100,
    max_amount_rappen: 100000,
    is_active: true,
    show_in_shop: true,
    tenant_id: TENANT,
  }

  const fixedDbProduct = {
    id: FIXED_PRODUCT,
    name: '10er Abo',
    price_rappen: 90000,
    is_voucher: false,
    allow_custom_amount: false,
    is_active: true,
    show_in_shop: true,
    tenant_id: TENANT,
  }

  it('1) one valid custom voucher: payment amount and preserved display fields agree', async () => {
    let inserted: Record<string, unknown> | null = null
    mockCreatePayment({
      products: [customDbProduct],
      onInsert: (payload) => { inserted = payload },
    })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 5000,
      products_price_rappen: 5000,
      discount_amount_rappen: 0,
      metadata: {
        products: [{
          id: CUSTOM_VOUCHER,
          quantity: 1,
          unit_price_rappen: 5000,
          name: 'Gutschein für Anna - CHF 50.00',
          display_name: 'Gutschein für Anna - CHF 50.00',
          description: 'Geburtstag',
          recipient: 'Anna',
        }],
      },
    })

    const result = await (await createPaymentHandler())(fakeEvent) as { data: { total_amount_rappen: number } }
    expect(result.data.total_amount_rappen).toBe(5000)
    expect(inserted?.total_amount_rappen).toBe(5000)
    const meta = inserted?.metadata as { products: PaymentProductMeta[] }
    expect(meta.products).toHaveLength(1)
    expect(meta.products[0].quantity).toBe(1)
    expect(meta.products[0].unit_price_rappen).toBe(5000)
    expect(meta.products[0].name).toBe('Gutschein für Anna - CHF 50.00')
    expect(meta.products[0].display_name).toBe('Gutschein für Anna - CHF 50.00')
    expect(meta.products[0].product_template_name).toBe('Individueller Gutschein')
    expect(meta.products[0].description).toBe('Geburtstag')
    expect(meta.products[0].recipient_name).toBe('Anna')
    expect(meta.products[0].fulfillment_key).toBe(customVoucherFulfillmentKey(CUSTOM_VOUCHER))
    expect(meta.products[0].is_custom_amount_voucher).toBe(true)
  })

  it('3) rejects manipulated requests with multiple custom vouchers', async () => {
    mockCreatePayment({ products: [customDbProduct] })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 15000,
      products_price_rappen: 15000,
      discount_amount_rappen: 0,
      metadata: {
        products: [
          { id: CUSTOM_VOUCHER, quantity: 1, unit_price_rappen: 5000, name: 'A' },
          { id: CUSTOM_VOUCHER, quantity: 1, unit_price_rappen: 10000, name: 'B' },
        ],
      },
    })

    await expect((await createPaymentHandler())(fakeEvent)).rejects.toMatchObject({
      statusCode: 400,
      message: CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE,
    })
  })

  it('3b) rejects custom voucher quantity > 1', async () => {
    mockCreatePayment({ products: [customDbProduct] })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 10000,
      products_price_rappen: 10000,
      discount_amount_rappen: 0,
      metadata: {
        products: [{ id: CUSTOM_VOUCHER, quantity: 2, unit_price_rappen: 5000 }],
      },
    })

    await expect((await createPaymentHandler())(fakeEvent)).rejects.toMatchObject({
      statusCode: 400,
      // qty>1 trips unit-count limit before the exact-qty parser.
      message: CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE,
    })
  })

  it('3c) rejects direct API manipulation of malformed custom voucher quantities', async () => {
    // Values that inflate unit-count (>1) hit the checkout limit; others hit exact-qty parse.
    const cases: Array<{ quantity: unknown; message: string }> = [
      { quantity: 2, message: CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE },
      { quantity: 99, message: CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE },
      { quantity: '2', message: CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE },
      { quantity: 0, message: CUSTOM_VOUCHER_QTY_ONE_MESSAGE },
      { quantity: -1, message: CUSTOM_VOUCHER_QTY_ONE_MESSAGE },
      { quantity: 1.5, message: CUSTOM_VOUCHER_QTY_ONE_MESSAGE },
      { quantity: true, message: CUSTOM_VOUCHER_QTY_ONE_MESSAGE },
      { quantity: 'abc', message: CUSTOM_VOUCHER_QTY_ONE_MESSAGE },
      { quantity: '1.0', message: CUSTOM_VOUCHER_QTY_ONE_MESSAGE },
    ]
    for (const { quantity, message } of cases) {
      vi.resetModules()
      mocks.getAuthenticatedUserWithDbId.mockResolvedValue(null)
      mockCreatePayment({ products: [customDbProduct] })
      mocks.readBody.mockResolvedValue({
        tenant_id: TENANT,
        total_amount_rappen: 5000,
        products_price_rappen: 5000,
        discount_amount_rappen: 0,
        metadata: {
          products: [{ id: CUSTOM_VOUCHER, quantity, unit_price_rappen: 5000 }],
        },
      })
      await expect((await createPaymentHandler())(fakeEvent)).rejects.toMatchObject({
        statusCode: 400,
        message,
      })
    }
  })

  it('3d) client updateQuantity clamp cannot raise custom voucher above 1', () => {
    expect(clampCustomVoucherCartQuantity({
      is_voucher: true,
      allow_custom_amount: true,
      quantity: 1,
    }, 5)).toBe(1)
    expect(parseExactCustomVoucherQuantity(5).ok).toBe(false)
  })

  it('4) rejects amounts below min and above max bounds', async () => {
    mockCreatePayment({ products: [customDbProduct] })

    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 50,
      products_price_rappen: 50,
      discount_amount_rappen: 0,
      metadata: { products: [{ id: CUSTOM_VOUCHER, quantity: 1, unit_price_rappen: 50 }] },
    })
    await expect((await createPaymentHandler())(fakeEvent)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Ungültiger Gutscheinbetrag',
    })

    vi.resetModules()
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(null)
    mockCreatePayment({ products: [customDbProduct] })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 200000,
      products_price_rappen: 200000,
      discount_amount_rappen: 0,
      metadata: { products: [{ id: CUSTOM_VOUCHER, quantity: 1, unit_price_rappen: 200000 }] },
    })
    await expect((await createPaymentHandler())(fakeEvent)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Ungültiger Gutscheinbetrag',
    })
  })

  it('5) rejects unknown / cross-tenant product UUIDs', async () => {
    // DB returns only tenant products; foreign id is absent from productById
    mockCreatePayment({ products: [customDbProduct] })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 5000,
      products_price_rappen: 5000,
      discount_amount_rappen: 0,
      metadata: { products: [{ id: FOREIGN_PRODUCT, quantity: 1, unit_price_rappen: 5000 }] },
    })
    await expect((await createPaymentHandler())(fakeEvent)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Ungültiges Produkt'),
    })
  })

  it('6) client-supplied price cannot alter fixed product price', async () => {
    let inserted: Record<string, unknown> | null = null
    mockCreatePayment({
      products: [fixedDbProduct],
      onInsert: (payload) => { inserted = payload },
    })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 1,
      products_price_rappen: 1,
      discount_amount_rappen: 0,
      metadata: {
        products: [{ id: FIXED_PRODUCT, quantity: 1, unit_price_rappen: 1, price_rappen: 1 }],
      },
    })

    const result = await (await createPaymentHandler())(fakeEvent) as { data: { total_amount_rappen: number } }
    expect(result.data.total_amount_rappen).toBe(90000)
    expect(inserted?.total_amount_rappen).toBe(90000)
    const meta = inserted?.metadata as { products: PaymentProductMeta[] }
    expect(meta.products[0].unit_price_rappen).toBe(90000)
  })

  it('7) recipient/message survive payment metadata sanitization', async () => {
    let inserted: Record<string, unknown> | null = null
    mockCreatePayment({
      products: [customDbProduct],
      onInsert: (payload) => { inserted = payload },
    })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 2500,
      products_price_rappen: 2500,
      discount_amount_rappen: 0,
      metadata: {
        products: [{
          id: CUSTOM_VOUCHER,
          quantity: 1,
          unit_price_rappen: 2500,
          name: 'Gutschein für Max',
          description: 'Viel Erfolg bei der Prüfung',
          recipient_name: 'Max',
        }],
      },
    })

    await (await createPaymentHandler())(fakeEvent)
    const product = (inserted?.metadata as { products: PaymentProductMeta[] }).products[0]
    expect(product.name).toBe('Gutschein für Max')
    expect(product.description).toBe('Viel Erfolg bei der Prüfung')
    expect(product.recipient_name).toBe('Max')
    expect(product.product_template_name).toBe('Individueller Gutschein')
  })

  it('9) ordinary products still work alongside a single custom voucher', async () => {
    let inserted: Record<string, unknown> | null = null
    mockCreatePayment({
      products: [customDbProduct, fixedDbProduct],
      onInsert: (payload) => { inserted = payload },
    })
    mocks.readBody.mockResolvedValue({
      tenant_id: TENANT,
      total_amount_rappen: 95000,
      products_price_rappen: 95000,
      discount_amount_rappen: 0,
      metadata: {
        products: [
          { id: FIXED_PRODUCT, quantity: 1 },
          {
            id: CUSTOM_VOUCHER,
            quantity: 1,
            unit_price_rappen: 5000,
            name: 'Gutschein CHF 50.00',
          },
        ],
      },
    })

    const result = await (await createPaymentHandler())(fakeEvent) as { data: { total_amount_rappen: number } }
    expect(result.data.total_amount_rappen).toBe(95000)
    const products = (inserted?.metadata as { products: PaymentProductMeta[] }).products
    expect(products).toHaveLength(2)
    expect(products.find(p => p.id === FIXED_PRODUCT)?.unit_price_rappen).toBe(90000)
    expect(products.find(p => p.id === CUSTOM_VOUCHER)?.unit_price_rappen).toBe(5000)
  })
})

describe('webhook / products source contracts for custom vouchers', () => {
  it('8) webhook uses atomic fulfillment_key claim and refuses qty>1 custom vouchers', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/wallee/webhook.post.ts'), 'utf8')
    expect(src).toContain('claimVoucherFulfillment')
    expect(src).toContain('fulfillment_key')
    expect(src).toContain('issuedFulfillmentKeys')
    expect(src).toContain('Refusing custom voucher fulfillment with quantity > 1')
    expect(src).toContain('display_name')
    // Must not use name+amount or description-substring duplicate detection.
    expect(src).not.toMatch(/v\.name === displayName && Number\(v\.amount_rappen\) === amountRappen/)
    expect(src).not.toContain('description.includes(`[${fulfillmentKey}]`)')
  })

  it('10) products API exposes voucherCreationEnabled server-side with tenant scope', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/shop/products.get.ts'), 'utf8')
    expect(src).toContain('voucher_creation')
    expect(src).toContain('voucherCreationEnabled')
    expect(src).toContain(".eq('tenant_id', resolvedTenantId")
    expect(src).toContain('customVoucherProduct')
  })

  it('create-payment enforces single custom voucher server-side', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/shop/create-payment.post.ts'), 'utf8')
    expect(src).toContain('customVoucherCheckoutLimitError')
    expect(src).toContain('parseExactCustomVoucherQuantity')
    expect(src).toContain('product_template_name')
    expect(src).toContain('is_custom_amount_voucher')
    expect(src).toContain('fixedVoucherFulfillmentKey')
  })

  it('shop.vue clamps updateQuantity for custom vouchers', () => {
    const src = readFileSync(resolve(process.cwd(), 'pages/shop.vue'), 'utf8')
    expect(src).toContain('clampCustomVoucherCartQuantity')
    expect(src).toContain('isCustomAmountVoucher(item.product as any)')
  })

  it('migration enforces UNIQUE (payment_id, fulfillment_key)', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'migrations/20261014_vouchers_fulfillment_key_unique.sql'),
      'utf8',
    )
    expect(sql).toContain('fulfillment_key')
    expect(sql).toContain('idx_vouchers_payment_fulfillment_key_unique')
    expect(sql).toContain('UNIQUE INDEX')
    expect(sql).toContain('(payment_id, fulfillment_key)')
  })
})
