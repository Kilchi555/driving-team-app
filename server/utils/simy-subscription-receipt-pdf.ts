import { generateInvoicePdf } from '~/server/utils/invoice-pdf'
import { loadTenantLogoForPdf } from '~/server/utils/tenant-logo-for-pdf'
import { logger } from '~/utils/logger'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const SIMY_ISSUER = {
  name: 'Simy IT Systems Kilchenmann',
  street: 'Weiherweg 2',
  zip: '8610',
  city: 'Uster',
  email: 'info@simy.ch',
  contactPerson: 'Pascal Kilchenmann',
  primaryColor: '#6000BD',
  secondaryColor: '#8B2FE8',
}

const SIMY_LOGO_URL = 'https://simy.ch/simy-logo.png'

export interface StripeReceiptLine {
  description: string | null
  amount: number
  quantity?: number | null
}

export interface ReceiptPdfLine {
  product_name: string
  quantity: number
  unit_price_rappen: number
  total_price_rappen: number
}

/** Translate Stripe invoice line copy and drop empty metered $0 rows. */
export function localizeInvoiceLineDescription(description: string | null | undefined): string {
  if (!description) return 'Position'
  let d = description
  d = d.replace(/^Unused time on /i, 'Nicht genutzte Zeit: ')
  d = d.replace(/^Remaining time on /i, 'Anteilige Restzeit: ')
  d = d.replace(/ after (\d{1,2} \w+ \d{4})/i, ' ab $1')
  d = d.replace(/\b1 Fahrlehrer Login\b/gi, 'Extra Fahrlehrer-Seat')
  d = d.replace(/\bGoogle Business Profile Add-on\b/gi, 'Google Business Profile')
  d = d.replace(/Metered SMS Price/gi, 'SMS-Überzug')
  d = d.replace(/\(at CHF ([\d.]+) \/ month\)/gi, '(CHF $1 / Mt.)')
  return d
}

export function receiptLineFromStripe(line: StripeReceiptLine): ReceiptPdfLine | null {
  const amount = line.amount ?? 0
  const qty = Math.max(1, line.quantity || 1)
  const raw = localizeInvoiceLineDescription(line.description)
  if (amount === 0 && /sms|metered/i.test(raw)) return null

  const qtyPrefix = new RegExp(`^${qty}\\s*[×x]\\s*`, 'i')
  const product_name = raw.replace(qtyPrefix, '').trim() || raw
  return {
    product_name,
    quantity: qty,
    unit_price_rappen: Math.round(amount / qty),
    total_price_rappen: amount,
  }
}

export function receiptLinesFromStripe(lines: StripeReceiptLine[]): ReceiptPdfLine[] {
  return lines.map(receiptLineFromStripe).filter((l): l is ReceiptPdfLine => !!l)
}

async function loadSimyLogoBase64(): Promise<string | null> {
  const fromUrl = await loadTenantLogoForPdf(SIMY_LOGO_URL)
  if (fromUrl?.base64) return fromUrl.base64
  try {
    const local = await readFile(resolve(process.cwd(), 'apps/simy/public/simy-logo.png'))
    const converted = await loadTenantLogoForPdf(`data:image/png;base64,${local.toString('base64')}`)
    return converted?.base64 || null
  } catch {
    return null
  }
}

export async function generateSimySubscriptionReceiptPdf(opts: {
  invoiceNumber: string
  paidAt: Date
  customerName: string
  customerStreet?: string
  customerZip?: string
  customerCity?: string
  customerEmail?: string
  items: ReceiptPdfLine[]
  totalRappen: number
  vatAmountRappen?: number
  vatRate?: number
}): Promise<Buffer> {
  const logo = await loadSimyLogoBase64()
  const paidIso = opts.paidAt.toISOString().slice(0, 10)

  return generateInvoicePdf({
    documentTitle: 'QUITTUNG',
    invoiceNumber: opts.invoiceNumber,
    invoiceDate: paidIso,
    dueDate: paidIso,
    dateLabel: 'Quittungsdatum',
    dueLabel: 'Bezahlt am',
    tenantName: SIMY_ISSUER.name,
    tenantStreet: SIMY_ISSUER.street,
    tenantZip: SIMY_ISSUER.zip,
    tenantCity: SIMY_ISSUER.city,
    tenantEmail: SIMY_ISSUER.email,
    tenantContactPerson: SIMY_ISSUER.contactPerson,
    tenantLogoBase64: logo,
    tenantLogoFormat: logo ? 'png' : undefined,
    customerName: opts.customerName,
    billingStreet: opts.customerStreet || '',
    billingZip: opts.customerZip || '',
    billingCity: opts.customerCity || '',
    billingEmail: opts.customerEmail,
    items: opts.items,
    subtotalRappen: opts.totalRappen - (opts.vatAmountRappen || 0),
    vatRate: opts.vatRate || 0,
    vatAmountRappen: opts.vatAmountRappen || 0,
    totalRappen: opts.totalRappen,
    primaryColor: SIMY_ISSUER.primaryColor,
    secondaryColor: SIMY_ISSUER.secondaryColor,
    paymentBlockTitle: ' ',
    paymentTerms: 'Vielen Dank für Ihr Vertrauen!\n\nFreundliche Grüsse\nPascal Kilchenmann',
    introText: 'Wir bestätigen den Eingang Ihrer Simy-Abonnementzahlung.',
  })
}

export async function generateSimySubscriptionReceiptPdfSafe(
  opts: Parameters<typeof generateSimySubscriptionReceiptPdf>[0],
): Promise<Buffer | null> {
  try {
    return await generateSimySubscriptionReceiptPdf(opts)
  } catch (err: any) {
    logger.warn('⚠️ Simy subscription receipt PDF failed (non-fatal):', err?.message || err)
    return null
  }
}
