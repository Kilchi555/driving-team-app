/**
 * Staff POS product sale rules.
 * Money, credit, and eligibility are decided here and again inside
 * public.staff_pos_sale. Client prices and credit amounts are rejected.
 */

export const STAFF_PRODUCT_SALE_SOURCE = 'staff_product_sale'
export const STAFF_POS_METHODS = ['cash', 'deferred', 'invoice', 'invoice_send', 'wallee'] as const
export type StaffPosMethod = (typeof STAFF_POS_METHODS)[number]

export const STAFF_POS_MAX_QUANTITY = 100
export const STAFF_POS_MAX_LINES = 20
export const STAFF_POS_MAX_TOTAL_RAPPEN = 5_000_000
export const INT4_MAX = 2_147_483_647
export const STAFF_POS_ROLES = ['admin', 'staff', 'super_admin'] as const
export const SEND_CLAIM_TTL_MS = 120_000

const MONEY_KEYS = [
  'price_rappen',
  'unit_price_rappen',
  'total_price_rappen',
  'total_amount_rappen',
  'total',
  'credit_amount_rappen',
  'credit_rappen',
] as const

export class StaffProductSaleError extends Error {
  code: string
  statusCode: number

  constructor(code: string, statusCode: number, message: string) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

export interface StaffPosLineInput {
  product_id: string
  quantity: number
}

export interface StaffPosProductSnapshot {
  product_id: string
  name: string
  quantity: number
  price_rappen: number
  is_credit_product: boolean
  credit_amount_rappen: number
}

export interface CatalogProduct {
  id: string
  tenant_id: string
  name: string
  price_rappen: number
  is_active: boolean
  is_voucher: boolean
  is_credit_product: boolean
  credit_amount_rappen: number | null
}

export interface CustomerRow {
  id: string
  tenant_id: string
  role: string
  deleted_at: string | null
}

export function isStaffPosRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_POS_ROLES as readonly string[]).includes(role)
}

export function isEligiblePosCustomer(
  customer: CustomerRow | null | undefined,
  tenantId: string,
): boolean {
  if (!customer) return false
  return customer.tenant_id === tenantId
    && customer.role === 'client'
    && customer.deleted_at == null
}

export function customerRejectionCode(
  customer: CustomerRow | null | undefined,
  tenantId: string,
): string | null {
  if (!customer) return 'invalid_customer'
  if (customer.tenant_id !== tenantId) return 'foreign_tenant'
  if (customer.deleted_at != null) return 'deleted_customer'
  if (customer.role !== 'client') return 'invalid_customer_role'
  return null
}

export function isEligiblePosProduct(
  product: CatalogProduct | null | undefined,
  tenantId: string,
): boolean {
  if (!product) return false
  return product.tenant_id === tenantId
    && product.is_active === true
    && product.is_voucher !== true
    && Number.isInteger(product.price_rappen)
    && product.price_rappen > 0
}

export function assertNoClientMoney(value: unknown, label = 'body'): void {
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  for (const key of MONEY_KEYS) {
    if (key in record) {
      throw new StaffProductSaleError(
        'client_price_rejected',
        400,
        `${label} must not include ${key}`,
      )
    }
  }
}

export function parseStaffPosLines(items: unknown): StaffPosLineInput[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > STAFF_POS_MAX_LINES) {
    throw new StaffProductSaleError('invalid_items', 400, 'Mindestens ein Produkt ist erforderlich')
  }
  return items.map((raw, index) => {
    assertNoClientMoney(raw, `items[${index}]`)
    if (!raw || typeof raw !== 'object') {
      throw new StaffProductSaleError('invalid_items', 400, 'Ungültige Position')
    }
    const row = raw as Record<string, unknown>
    const extra = Object.keys(row).filter((key) => key !== 'product_id' && key !== 'quantity')
    if (extra.length > 0) {
      throw new StaffProductSaleError('client_price_rejected', 400, 'Positionen dürfen nur Produkt und Menge enthalten')
    }
    const productId = String(row.product_id || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
      throw new StaffProductSaleError('invalid_product', 400, 'Ungültiges Produkt')
    }
    const quantity = row.quantity
    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
      throw new StaffProductSaleError('invalid_quantity', 400, 'Menge muss eine ganze Zahl sein')
    }
    if (quantity < 1 || quantity > STAFF_POS_MAX_QUANTITY) {
      throw new StaffProductSaleError('invalid_quantity', 400, `Menge muss zwischen 1 und ${STAFF_POS_MAX_QUANTITY} liegen`)
    }
    return { product_id: productId, quantity }
  })
}

export function parseStaffPosMethod(value: unknown): StaffPosMethod {
  if (value === 'online') return 'wallee'
  if (typeof value === 'string' && (STAFF_POS_METHODS as readonly string[]).includes(value)) {
    return value as StaffPosMethod
  }
  throw new StaffProductSaleError('invalid_method', 400, 'Ungültige Zahlungsart')
}

export function lineGrossRappen(priceRappen: number, quantity: number): number {
  if (!Number.isInteger(priceRappen) || !Number.isInteger(quantity)) {
    throw new StaffProductSaleError('overflow', 400, 'Ungültiger Betrag')
  }
  const total = priceRappen * quantity
  if (!Number.isSafeInteger(total) || total > INT4_MAX || total > STAFF_POS_MAX_TOTAL_RAPPEN) {
    throw new StaffProductSaleError('overflow', 400, 'Betrag ist zu hoch')
  }
  return total
}

export function sumGrossRappen(lines: { price_rappen: number; quantity: number }[]): number {
  let total = 0
  for (const line of lines) {
    total += lineGrossRappen(line.price_rappen, line.quantity)
    if (total > STAFF_POS_MAX_TOTAL_RAPPEN || total > INT4_MAX) {
      throw new StaffProductSaleError('overflow', 400, 'Betrag ist zu hoch')
    }
  }
  if (total <= 0) {
    throw new StaffProductSaleError('invalid_total', 400, 'Betrag muss grösser als 0 sein')
  }
  return total
}

/** Catalog price is gross. VAT is extracted, never added on top. */
export function vatFromGrossRappen(grossRappen: number, vatRatePercent: number): { net: number; vat: number } {
  const rate = Number(vatRatePercent)
  if (!Number.isFinite(rate) || rate <= 0 || grossRappen <= 0) {
    return { net: grossRappen, vat: 0 }
  }
  const vat = Math.round((grossRappen * rate) / (100 + rate))
  const bounded = Math.max(0, Math.min(grossRappen, vat))
  return { vat: bounded, net: grossRappen - bounded }
}

export function creditRappenForProduct(product: {
  is_credit_product?: boolean | null
  credit_amount_rappen?: number | null
}, quantity: number): number {
  if (product.is_credit_product !== true) return 0
  const unit = Number(product.credit_amount_rappen || 0)
  if (!Number.isInteger(unit) || unit <= 0) return 0
  const total = unit * quantity
  if (!Number.isSafeInteger(total) || total > INT4_MAX) {
    throw new StaffProductSaleError('overflow', 400, 'Gutschrift ist zu hoch')
  }
  return total
}

export function creditsImmediately(method: StaffPosMethod): boolean {
  return method === 'cash' || method === 'deferred' || method === 'invoice'
}

export function paymentStatusFor(method: StaffPosMethod): 'completed' | 'pending' {
  return method === 'cash' ? 'completed' : 'pending'
}

export function storedPaymentMethod(method: StaffPosMethod): string {
  if (method === 'invoice_send') return 'invoice'
  return method
}

export function buildSaleMetadata(input: {
  idempotencyKey: string
  method: StaffPosMethod
  products: StaffPosProductSnapshot[]
}): Record<string, unknown> {
  return {
    source: STAFF_PRODUCT_SALE_SOURCE,
    idempotency_key: input.idempotencyKey,
    fulfillment: input.method,
    products: input.products.map((product) => ({
      product_id: product.product_id,
      name: product.name,
      quantity: product.quantity,
      price_rappen: product.price_rappen,
      is_credit_product: product.is_credit_product,
      credit_amount_rappen: product.credit_amount_rappen,
    })),
  }
}

export function snapshotProduct(product: CatalogProduct, quantity: number): StaffPosProductSnapshot {
  if (!isEligiblePosProduct(product, product.tenant_id)) {
    throw new StaffProductSaleError('invalid_product', 400, 'Produkt ist nicht verkaufbar')
  }
  return {
    product_id: product.id,
    name: product.name,
    quantity,
    price_rappen: product.price_rappen,
    is_credit_product: product.is_credit_product === true && (product.credit_amount_rappen || 0) > 0,
    credit_amount_rappen: product.is_credit_product === true ? Math.max(0, Number(product.credit_amount_rappen || 0)) : 0,
  }
}

export interface SendClaimState {
  sentAt: string | null
  claimAt: string | null
  nowMs: number
}

export type InvoiceSendPlan =
  | { action: 'skip_send_apply_credit' }
  | { action: 'wait' }
  | { action: 'send' }

/** Mail is sent only while the invoice has no sent_at and no fresh claim. */
export function planInvoiceSend(state: SendClaimState): InvoiceSendPlan {
  if (state.sentAt) return { action: 'skip_send_apply_credit' }
  if (state.claimAt) {
    const claimMs = Date.parse(state.claimAt)
    if (Number.isFinite(claimMs) && state.nowMs - claimMs < SEND_CLAIM_TTL_MS) {
      return { action: 'wait' }
    }
  }
  return { action: 'send' }
}

export function partitionWebhookPayments<T extends { metadata?: { source?: string } | null }>(payments: T[]) {
  const staffProductSales: T[] = []
  const legacy: T[] = []
  for (const payment of payments || []) {
    if (payment?.metadata?.source === STAFF_PRODUCT_SALE_SOURCE) staffProductSales.push(payment)
    else legacy.push(payment)
  }
  return { staffProductSales, legacy }
}

export function webhookMayCredit(payment: {
  metadata?: { source?: string } | null
  payment_status?: string | null
  tenant_id?: string | null
  user_id?: string | null
  id?: string | null
} | null, resolvedStatus?: string | null): boolean {
  if (!payment?.id || !payment.tenant_id || !payment.user_id) return false
  if (payment.metadata?.source !== STAFF_PRODUCT_SALE_SOURCE) return false
  return (resolvedStatus || payment.payment_status) === 'completed'
}
