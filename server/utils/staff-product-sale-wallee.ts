import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { staffPosWalleeLineItems } from '~/server/utils/staff-product-sale'
import { Wallee } from 'wallee'
import { logger } from '~/utils/logger'

function toAscii(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').trim()
}

export async function startStaffPosWallee(input: {
  tenantId: string
  paymentId: string
  totalRappen: number
  products: Array<{ name?: string; quantity?: number; price_rappen?: number }>
  customerEmail: string
  customerName: string
  vatRatePercent: number
}): Promise<{ transactionId: string | null; paymentUrl: string | null; warning?: string }> {
  const walleeConfig = await getWalleeConfigForTenant(input.tenantId)
  const spaceId = walleeConfig.spaceId
  const sdkConfig = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
  const transactionService = new Wallee.api.TransactionService(sdkConfig)
  const paymentPageService = new Wallee.api.TransactionPaymentPageService(sdkConfig)
  const baseUrl = (process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch').replace(/\/$/, '')

  const sourceLines = input.products.length ? input.products : [{
    name: 'Produkt',
    quantity: 1,
    price_rappen: input.totalRappen,
  }]
  const lineItems = staffPosWalleeLineItems(sourceLines.map((item) => ({
    ...item,
    name: toAscii(item.name || 'Produkt').substring(0, 100) || 'Produkt',
  })), input.vatRatePercent).map((item) => ({
    ...item,
    type: Wallee.model.LineItemType.PRODUCT,
  }))

  const transactionCreate: Wallee.model.TransactionCreate = {
    lineItems,
    currency: 'CHF',
    autoConfirmationEnabled: true,
    chargeRetryEnabled: false,
    customersEmailAddress: input.customerEmail,
    customerId: `staff-pos-${input.paymentId}`.substring(0, 100),
    merchantReference: `payment-${input.paymentId}`.substring(0, 100),
    successUrl: `${baseUrl}/payment/success?payment_id=${input.paymentId}`,
    failedUrl: `${baseUrl}/payment/failed?payment_id=${input.paymentId}`,
  }

  let created: any
  try {
    created = await transactionService.create(spaceId, transactionCreate)
  } catch (err: any) {
    logger.error('Staff POS Wallee create failed', err?.message || err)
    return { transactionId: null, paymentUrl: null, warning: 'Wallee-Zahlung konnte nicht gestartet werden' }
  }

  const transactionId = created?.body?.id ?? created?.id
  if (!transactionId) {
    return { transactionId: null, paymentUrl: null, warning: 'Wallee-Zahlung konnte nicht gestartet werden' }
  }

  let paymentUrl: string | null = null
  try {
    const urlResponse = await paymentPageService.paymentPageUrl(spaceId, transactionId)
    paymentUrl = (urlResponse as any)?.body || (urlResponse as any) || null
  } catch {
    paymentUrl = null
  }
  if (!paymentUrl) {
    paymentUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
  }

  return { transactionId: String(transactionId), paymentUrl }
}
