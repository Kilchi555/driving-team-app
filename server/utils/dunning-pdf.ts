// server/utils/dunning-pdf.ts
// Mahnschreiben-PDF: gleiche Vorlage wie die Rechnungs-PDF, nur Titel + Texte anders.

import { generateInvoicePdf, type InvoicePdfData } from '~/server/utils/invoice-pdf'
import { formatDateCH } from '~/server/utils/invoice-dunning'

export interface DunningPdfData {
  stage: number
  stageLabel: string
  invoiceNumber: string
  invoiceDate: string
  originalDueDate: string
  newDueDate: string
  overdueDays: number
  bodyText: string
  outstandingRappen: number
  feeRappen: number
  interestRappen: number
  totalDueRappen: number
  tenantName: string
  tenantStreet?: string
  tenantZip?: string
  tenantCity?: string
  tenantEmail?: string
  tenantLogoBase64?: string | null
  customerName: string
  billingCompanyName?: string
  billingStreet?: string
  billingZip?: string
  billingCity?: string
  billingEmail?: string
  staffName?: string
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  scorRef?: string | null
  creditorName?: string
  primaryColor?: string
}

/** Extrahiert den Brieftext aus body_text oder body_html (ohne CSS/Chrome). */
export function extractDunningLetterText(bodyText?: string | null, bodyHtml?: string | null): string {
  const plain = (bodyText || '').trim()
  // Wenn body_text wie CSS/HTML aussieht, ignorieren
  const looksLikeCss = /\{[\s\S]*\}/.test(plain) || /<\/?[a-z][\s\S]*>/i.test(plain) || /^body\s*\{/i.test(plain)
  if (plain && !looksLikeCss) return plain

  if (!bodyHtml) return plain && !looksLikeCss ? plain : ''

  const paragraphs: string[] = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(bodyHtml)) !== null) {
    const text = m[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
    if (!text || text.length < 8) continue
    if (/Swiss QR|QR-IBAN|Offen inkl|Empfänger:|Referenz:|powered by|Zahlungsübersicht/i.test(text)) continue
    if (/^CHF\s/.test(text) && text.length < 20) continue
    paragraphs.push(text)
  }
  return paragraphs.join('\n\n').trim()
}

export async function generateDunningPdf(data: DunningPdfData): Promise<Buffer> {
  const letterText = extractDunningLetterText(data.bodyText)

  const items: InvoicePdfData['items'] = [
    {
      product_name: `Offener Betrag · Rechnung ${data.invoiceNumber}`,
      product_description: `Urspr. fällig am ${formatDateCH(data.originalDueDate)} · ${Math.max(0, data.overdueDays)} Tage überfällig`,
      quantity: 1,
      unit_price_rappen: data.outstandingRappen,
      total_price_rappen: data.outstandingRappen,
    },
  ]
  if (data.feeRappen > 0) {
    items.push({
      product_name: `Mahngebühr · ${data.stageLabel}`,
      quantity: 1,
      unit_price_rappen: data.feeRappen,
      total_price_rappen: data.feeRappen,
    })
  }
  if (data.interestRappen > 0) {
    items.push({
      product_name: 'Verzugszins',
      quantity: 1,
      unit_price_rappen: data.interestRappen,
      total_price_rappen: data.interestRappen,
    })
  }

  return generateInvoicePdf({
    documentTitle: data.stageLabel,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: data.invoiceDate,
    dueDate: data.newDueDate,
    tenantName: data.tenantName,
    tenantStreet: data.tenantStreet,
    tenantZip: data.tenantZip,
    tenantCity: data.tenantCity,
    tenantEmail: data.tenantEmail,
    tenantLogoBase64: data.tenantLogoBase64,
    customerName: data.customerName,
    billingCompanyName: data.billingCompanyName,
    billingStreet: data.billingStreet,
    billingZip: data.billingZip,
    billingCity: data.billingCity,
    billingEmail: data.billingEmail,
    items,
    subtotalRappen: data.totalDueRappen,
    totalRappen: data.totalDueRappen,
    introText: letterText || null,
    paymentTerms: `Bitte überweise den Betrag bis ${formatDateCH(data.newDueDate)} unter Angabe der Rechnungsnummer ${data.invoiceNumber}.`,
    footerText: data.staffName
      ? `Freundliche Grüsse\n${data.staffName}\n${data.tenantName}`
      : null,
    qrCodeDataUrl: data.qrCodeDataUrl,
    qrIban: data.qrIban,
    scorRef: data.scorRef,
    creditorName: data.creditorName,
    primaryColor: data.primaryColor,
    // Brief + Zahlteil nicht auf dieselbe Seite quetschen
    qrOnSeparatePage: true,
  })
}

export function dunningPdfFilename(stageLabel: string, invoiceNumber: string): string {
  const safeStage = stageLabel.replace(/[^\wÄÖÜäöüéèêàâ .-]/g, '').replace(/\s+/g, '_')
  const safeInv = invoiceNumber.replace(/[^\w.-]/g, '_')
  return `${safeStage}_${safeInv}.pdf`
}
