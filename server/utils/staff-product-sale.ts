/**
 * Staff POS product sale rules.
 * Money, credit, and eligibility are decided here and again inside
 * public.staff_pos_sale. Client prices and credit amounts are rejected.
 * Invoice VAT amounts are not written here. The RPC finds the integer
 * net and calculate_invoice_vat writes the invoice total.
 */
import { computeVatAmountRappen } from '~/server/utils/invoice-vat'
import { mergePaymentMetadata, normalizePaymentMetadata } from '~/server/utils/payment-metadata'
import { buildWalleeTaxedLineItem } from '~/server/utils/wallee-line-item'

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
  is_active?: boolean | null
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
    && customer.is_active === true
}

export function customerRejectionCode(
  customer: CustomerRow | null | undefined,
  tenantId: string,
): string | null {
  if (!customer) return 'invalid_customer'
  if (customer.tenant_id !== tenantId) return 'foreign_tenant'
  if (customer.deleted_at != null) return 'deleted_customer'
  if (customer.is_active !== true) return 'inactive_customer'
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

/**
 * Integer search for the cart net the invoice trigger can reproduce.
 * Not an invoice-total writer. staff_pos_sale evaluates the same
 * ROUND(numeric) expression, and calculate_invoice_vat remains the
 * only amount authority.
 *
 * vatRateHundredths: 810 means 8.10%. Ties round away from zero.
 */
export function findExactCartNet(
  grossRappen: number,
  vatRateHundredths: number,
): { net: number; vat: number } | null {
  if (!Number.isInteger(grossRappen) || grossRappen < 0) return null
  if (!Number.isInteger(vatRateHundredths) || vatRateHundredths < 0 || vatRateHundredths > 10000) {
    return null
  }
  const gross = BigInt(grossRappen)
  const rate = BigInt(vatRateHundredths)
  const floorNet = (gross * 10000n) / (10000n + rate)
  let found: bigint | null = null
  for (const candidate of [floorNet - 1n, floorNet, floorNet + 1n]) {
    if (candidate < 0n) continue
    const vat = roundHalfAwayFromZero(candidate * rate, 10000n)
    if (candidate + vat === gross) {
      if (found !== null) return null
      found = candidate
    }
  }
  if (found === null) return null
  const vat = roundHalfAwayFromZero(found * rate, 10000n)
  return { net: Number(found), vat: Number(vat) }
}

/** Percent text such as "8.10" or "0". Rejects null, negative, and values above 100. */
export function parseVatRateHundredths(rate: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(rate.trim())
  if (!match) return null
  const whole = Number(match[1])
  const fraction = (match[2] ?? '').padEnd(2, '0')
  if (!Number.isInteger(whole) || !/^\d{2}$/.test(fraction)) return null
  const hundredths = whole * 100 + Number(fraction)
  if (hundredths < 0 || hundredths > 10000) return null
  return hundredths
}

/** Application-boundary check. Does not coerce invalid rates to 0. */
export function requirePosVatRateHundredths(raw: unknown): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) {
      throw new StaffProductSaleError('invalid_vat_rate', 400, 'MwSt-Satz ist ungültig')
    }
    raw = raw.toFixed(2)
  }
  if (typeof raw !== 'string') {
    throw new StaffProductSaleError('invalid_vat_rate', 400, 'MwSt-Satz ist ungültig')
  }
  const hundredths = parseVatRateHundredths(raw)
  if (hundredths == null) {
    throw new StaffProductSaleError('invalid_vat_rate', 400, 'MwSt-Satz ist ungültig')
  }
  return hundredths
}

/**
 * Split one header net across line grosses. The last lines receive the
 * leftover rappen, never more than their own gross. This is not a
 * per-line VAT inversion.
 */
export function allocatePositionNets(
  lines: Array<{ price_rappen: number; quantity: number }>,
  netRappen: number,
): number[] {
  if (!Number.isInteger(netRappen) || netRappen < 0) {
    throw new StaffProductSaleError('no_exact_net', 400, 'Für diesen Preis gibt es keinen passenden Nettobetrag')
  }
  const grosses = lines.map((line) => {
    if (!Number.isInteger(line.price_rappen) || !Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new StaffProductSaleError('invalid_total', 400, 'Ungültiger Betrag')
    }
    const gross = line.price_rappen * line.quantity
    if (!Number.isSafeInteger(gross) || gross <= 0) {
      throw new StaffProductSaleError('invalid_total', 400, 'Ungültiger Betrag')
    }
    return BigInt(gross)
  })
  const cart = grosses.reduce((sum, gross) => sum + gross, 0n)
  const net = BigInt(netRappen)
  if (net > cart) {
    throw new StaffProductSaleError('vat_allocation_failed', 400, 'MwSt-Aufteilung ist ungültig')
  }
  const bases = grosses.map((gross) => (net * gross) / cart)
  let leftover = net - bases.reduce((sum, base) => sum + base, 0n)
  for (let index = bases.length - 1; index >= 0 && leftover > 0n; index -= 1) {
    const room = grosses[index] - bases[index]
    if (room > 0n) {
      const take = room < leftover ? room : leftover
      bases[index] += take
      leftover -= take
    }
  }
  if (leftover !== 0n) {
    throw new StaffProductSaleError('vat_allocation_failed', 400, 'MwSt-Aufteilung ist ungültig')
  }
  return bases.map((base) => Number(base))
}

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator
  const remainder = numerator % denominator
  if (remainder * 2n >= denominator) return quotient + 1n
  return quotient
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

/**
 * Same domain as online booking: only Wallee is a payment_provider value.
 * Cash, invoice, and deferred store NULL so the column default `wallee` is not applied.
 */
export function staffPosPaymentProvider(method: StaffPosMethod): 'wallee' | null {
  return method === 'wallee' ? 'wallee' : null
}

export interface SaleCreditSnapshotLine {
  is_credit_product?: boolean | null
  credit_amount_rappen?: number | null
  quantity?: number | null
}

/**
 * Credit for a sale that was already priced. Reads only the stored snapshot.
 * A credit-product line with a missing or non-positive amount is an error.
 */
export function creditFromSaleSnapshot(lines: SaleCreditSnapshotLine[]): number {
  let total = 0
  for (const line of lines) {
    if (line.is_credit_product !== true) continue
    const quantity = Number(line.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > STAFF_POS_MAX_QUANTITY) {
      throw new StaffProductSaleError('invalid_quantity', 400, 'Menge muss eine ganze Zahl sein')
    }
    const unit = Number(line.credit_amount_rappen)
    if (!Number.isInteger(unit) || unit <= 0) {
      throw new StaffProductSaleError('zero_credit_snapshot', 409, 'Guthaben-Snapshot ist ungültig')
    }
    const lineCredit = unit * quantity
    if (!Number.isSafeInteger(lineCredit) || total + lineCredit > INT4_MAX) {
      throw new StaffProductSaleError('overflow', 400, 'Gutschrift ist zu hoch')
    }
    total += lineCredit
  }
  return total
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

export function mergeStaffPosVatSnapshot(
  metadata: unknown,
  snapshot: { vatRate: number; grossRappen: number; netRappen: number },
): Record<string, unknown> {
  return mergePaymentMetadata(metadata, {
    vat_rate: snapshot.vatRate,
    gross_rappen: snapshot.grossRappen,
    net_rappen: snapshot.netRappen,
  })
}

export type StaffPosVatSnapshot = {
  vatRate: number
  grossRappen: number
  netRappen: number
  vatRappen: number
}

/** Stored sale snapshot. Incomplete metadata is not a rate of 0. */
export function readStaffPosVatSnapshot(metadata: unknown): StaffPosVatSnapshot | null {
  const meta = normalizePaymentMetadata(metadata)
  if (meta.source !== STAFF_PRODUCT_SALE_SOURCE) return null
  const vatRate = Number(meta.vat_rate)
  const grossRappen = Number(meta.gross_rappen)
  const netRappen = Number(meta.net_rappen)
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return null
  if (!Number.isInteger(grossRappen) || !Number.isInteger(netRappen)) return null
  if (grossRappen < 0 || netRappen < 0 || netRappen > grossRappen) return null
  return { vatRate, grossRappen, netRappen, vatRappen: grossRappen - netRappen }
}

export type AutoDraftMoney = {
  subtotal_rappen: number
  vat_rate: number
  vat_amount_rappen: number
  discount_amount_rappen: number
  total_amount_rappen: number
}

type AutoDraftPayment = {
  metadata?: unknown
  total_amount_rappen?: number | null
  discount_amount_rappen?: number | null
  voucher_discount_rappen?: number | null
  credit_used_rappen?: number | null
  amount_paid_rappen?: number | null
}

/**
 * Appointment drafts keep the existing tenant-rate calculation.
 * A staff product sale with a stored snapshot contributes that gross
 * price once. VAT is not added on top of it.
 */
export function autoDraftAmountsFromPayments(
  payments: AutoDraftPayment[],
  tenantVatRate: number,
): AutoDraftMoney {
  const snapshotted: Array<{ payment: AutoDraftPayment; snapshot: StaffPosVatSnapshot }> = []
  const rest: AutoDraftPayment[] = []
  for (const payment of payments) {
    const snapshot = readStaffPosVatSnapshot(payment.metadata)
    if (snapshot) snapshotted.push({ payment, snapshot })
    else rest.push(payment)
  }

  const normal = legacyAutoDraftAmounts(rest, tenantVatRate)
  if (snapshotted.length === 0) return normal

  let posNet = 0
  let posVat = 0
  let posGross = 0
  let posDiscount = 0
  const rates = new Set<number>()
  for (const row of snapshotted) {
    posNet += row.snapshot.netRappen
    posVat += row.snapshot.vatRappen
    posGross += row.snapshot.grossRappen
    posDiscount += Number(row.payment.discount_amount_rappen || 0)
      + Number(row.payment.voucher_discount_rappen || 0)
      + Number(row.payment.credit_used_rappen || 0)
      + Math.max(0, Number(row.payment.amount_paid_rappen) || 0)
    rates.add(row.snapshot.vatRate)
  }
  const uniqueRate = rates.size === 1 ? [...rates][0] : null
  return {
    subtotal_rappen: normal.subtotal_rappen + posNet,
    vat_rate: rest.length === 0 && uniqueRate != null ? uniqueRate : normal.vat_rate,
    vat_amount_rappen: normal.vat_amount_rappen + posVat,
    discount_amount_rappen: normal.discount_amount_rappen + posDiscount,
    total_amount_rappen: normal.total_amount_rappen + posGross - posDiscount,
  }
}

function legacyAutoDraftAmounts(payments: AutoDraftPayment[], tenantVatRate: number): AutoDraftMoney {
  const grossOf = (payment: AutoDraftPayment) =>
    Number(payment.total_amount_rappen || 0)
    + Number(payment.discount_amount_rappen || 0)
    + Number(payment.voucher_discount_rappen || 0)
  const subtotal = payments.reduce((sum, payment) => sum + grossOf(payment), 0)
  const totalDiscounts = payments.reduce(
    (sum, payment) => sum + Number(payment.discount_amount_rappen || 0) + Number(payment.voucher_discount_rappen || 0),
    0,
  )
  const totalCredits = payments.reduce((sum, payment) => sum + Number(payment.credit_used_rappen || 0), 0)
  const totalAlreadyPaid = payments.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.amount_paid_rappen) || 0),
    0,
  )
  const netAfter = subtotal - totalDiscounts - totalCredits - totalAlreadyPaid
  const vatAmount = computeVatAmountRappen(Math.max(0, netAfter), tenantVatRate)
  return {
    subtotal_rappen: subtotal,
    vat_rate: tenantVatRate,
    vat_amount_rappen: vatAmount,
    discount_amount_rappen: totalDiscounts + totalCredits + totalAlreadyPaid,
    total_amount_rappen: netAfter + vatAmount,
  }
}

export type StaffPosAllocatedLine = {
  product_id: string | null
  name: string
  quantity: number
  grossRappen: number
  netRappen: number
  vatRappen: number
  vatRate: number
}

/** Invoice lines for a stored POS snapshot. Null when this is not that payment. */
export function staffPosAllocatedLines(metadata: unknown): StaffPosAllocatedLine[] | null {
  const snapshot = readStaffPosVatSnapshot(metadata)
  if (!snapshot) return null
  const meta = normalizePaymentMetadata(metadata)
  const rawProducts = Array.isArray(meta.products) ? meta.products : []
  let lines = rawProducts.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const row = entry as Record<string, unknown>
    const price = Number(row.price_rappen)
    const quantity = Number(row.quantity)
    if (!Number.isInteger(price) || !Number.isInteger(quantity) || price <= 0 || quantity < 1) return []
    return [{
      product_id: typeof row.product_id === 'string' ? row.product_id : null,
      name: typeof row.name === 'string' && row.name ? row.name : 'Produkt',
      price_rappen: price,
      quantity,
    }]
  })
  const productGross = lines.reduce((sum, line) => sum + line.price_rappen * line.quantity, 0)
  if (productGross !== snapshot.grossRappen) {
    lines = [{
      product_id: null,
      name: 'Produkt',
      price_rappen: snapshot.grossRappen,
      quantity: 1,
    }]
  }
  const nets = allocatePositionNets(lines, snapshot.netRappen)
  return lines.map((line, index) => {
    const grossRappen = line.price_rappen * line.quantity
    return {
      product_id: line.product_id,
      name: line.name,
      quantity: line.quantity,
      grossRappen,
      netRappen: nets[index],
      vatRappen: grossRappen - nets[index],
      vatRate: snapshot.vatRate,
    }
  })
}

/** Wallee line amounts stay gross CHF. taxRate is the stored percent, not a fraction. */
export function staffPosWalleeLineItems(
  products: Array<{ name?: string; quantity?: number; price_rappen?: number }>,
  vatRatePercent: number,
) {
  const lines = products.length
    ? products
    : [{ name: 'Produkt', quantity: 1, price_rappen: 0 }]
  return lines.map((item, index) => buildWalleeTaxedLineItem({
    name: item.name || 'Produkt',
    quantity: item.quantity || 1,
    amountIncludingTaxChf: ((item.price_rappen || 0) * (item.quantity || 1)) / 100,
    vatRatePercent,
    uniqueId: `item-${index + 1}`,
  }))
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
