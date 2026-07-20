// server/utils/dunning-pdf.ts
// Professionelles PDF-Mahnschreiben (Zahlungserinnerung / 1. / 2. Mahnung)
// im gleichen visuellen Stil wie die Rechnungs-PDFs.

import PDFDocument from 'pdfkit'
import { formatChf, formatDateCH } from '~/server/utils/invoice-dunning'

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

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
  customerName: string
  billingCompanyName?: string
  billingStreet?: string
  billingZip?: string
  billingCity?: string
  staffName?: string
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  scorRef?: string | null
  creditorName?: string
  primaryColor?: string
}

function accentForStage(stage: number, brand: string): string {
  if (stage >= 3) return '#DC2626'
  if (stage === 2) return '#D97706'
  return brand || '#1E40AF'
}

export async function generateDunningPdf(data: DunningPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const brand = data.primaryColor || '#1E40AF'
    const accent = accentForStage(data.stage, brand)
    const [ar, ag, ab] = hexToRgb(accent)
    const W = doc.page.width
    const margin = 50

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 100).fill(accent)
    doc.save()
      .moveTo(W - 140, 0).lineTo(W, 0).lineTo(W, 100).lineTo(W - 200, 100)
      .fill(`rgb(${Math.min(ar + 30, 255)}, ${Math.min(ag + 30, 255)}, ${Math.min(ab + 30, 255)})`)
    doc.restore()

    doc.fontSize(11).fillOpacity(0.75).fillColor('white').font('Helvetica')
      .text(data.stageLabel.toUpperCase(), margin, 28, { characterSpacing: 1.2 })
    doc.fillOpacity(1).fontSize(22).font('Helvetica-Bold')
      .text(`Rechnung ${data.invoiceNumber}`, margin, 48)

    doc.fillOpacity(0.75).fontSize(10).font('Helvetica')
      .text('Zu zahlen', 0, 28, { width: W - margin, align: 'right' })
    doc.fillOpacity(1).fontSize(18).font('Helvetica-Bold')
      .text(formatChf(data.totalDueRappen), 0, 48, { width: W - margin, align: 'right' })

    // ── Meta strip ──────────────────────────────────────────────────────────
    doc.rect(0, 100, W, 40).fill('#1e293b')
    const meta = [
      ['Rechnungsdatum', formatDateCH(data.invoiceDate)],
      ['Urspr. Fälligkeit', formatDateCH(data.originalDueDate)],
      ['Neues Zahlungsziel', formatDateCH(data.newDueDate)],
    ]
    meta.forEach(([label, value], i) => {
      const x = margin + i * 165
      doc.fillOpacity(0.7).fontSize(7).fillColor('white').font('Helvetica')
        .text(label.toUpperCase(), x, 108, { characterSpacing: 0.4 })
      doc.fillOpacity(1).fontSize(10).font('Helvetica-Bold')
        .text(value, x, 120)
    })

    // ── Addresses ───────────────────────────────────────────────────────────
    const addrTop = 160
    const senderParts = [
      data.tenantName,
      data.tenantStreet,
      [data.tenantZip, data.tenantCity].filter(Boolean).join(' '),
    ].filter(Boolean)
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
      .text(senderParts.join(' · '), margin, addrTop, { width: 300 })

    doc.rect(margin, addrTop + 12, 220, 78).fill('#f8fafc').stroke('#e2e8f0')
    let addrY = addrTop + 22
    const addrMain = data.billingCompanyName || data.customerName
    doc.fontSize(11).fillColor('#1e293b').font('Helvetica-Bold')
      .text(addrMain, margin + 12, addrY, { width: 196 })
    addrY += 14
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
    if (data.billingCompanyName && data.customerName && data.customerName !== data.billingCompanyName) {
      doc.text(data.customerName, margin + 12, addrY, { width: 196 })
      addrY += 12
    }
    if (data.billingStreet) {
      doc.text(data.billingStreet, margin + 12, addrY, { width: 196 })
      addrY += 12
    }
    if (data.billingZip || data.billingCity) {
      doc.text(`${data.billingZip || ''} ${data.billingCity || ''}`.trim(), margin + 12, addrY, { width: 196 })
    }

    // Right-side reference box
    const refX = margin + 260
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text('REFERENZ', refX, addrTop + 16, { characterSpacing: 0.5 })
    doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold')
      .text(data.invoiceNumber, refX, addrTop + 28)
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text('ÜBERFÄLLIG SEIT', refX, addrTop + 50, { characterSpacing: 0.5 })
    doc.fontSize(10).fillColor(accent).font('Helvetica-Bold')
      .text(`${Math.max(0, data.overdueDays)} Tage`, refX, addrTop + 62)

    // ── Title + body ────────────────────────────────────────────────────────
    let y = addrTop + 110
    doc.fontSize(14).fillColor('#0f172a').font('Helvetica-Bold')
      .text(data.stageLabel, margin, y)
    y += 22

    const paragraphs = (data.bodyText || '').split(/\n{2,}/).filter(Boolean)
    doc.font('Helvetica').fontSize(10).fillColor('#334155')
    for (const p of paragraphs) {
      const h = doc.heightOfString(p.trim(), { width: W - 2 * margin, lineGap: 3 })
      if (y + h > 620) {
        doc.addPage()
        y = margin
      }
      doc.text(p.trim(), margin, y, { width: W - 2 * margin, lineGap: 3, align: 'left' })
      y += h + 12
    }

    // ── Amount summary ──────────────────────────────────────────────────────
    y += 8
    if (y > 580) {
      doc.addPage()
      y = margin
    }

    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text('ZAHLUNGSÜBERSICHT', margin, y, { characterSpacing: 0.6 })
    y += 14

    const rows: [string, string, boolean?][] = [
      ['Offener Rechnungsbetrag', formatChf(data.outstandingRappen)],
    ]
    if (data.feeRappen > 0) rows.push(['Mahngebühr', formatChf(data.feeRappen)])
    if (data.interestRappen > 0) rows.push(['Verzugszins', formatChf(data.interestRappen)])
    rows.push(['Total zu zahlen', formatChf(data.totalDueRappen), true])
    rows.push(['Zahlbar bis', formatDateCH(data.newDueDate), true])

    for (const [label, value, emphasize] of rows) {
      if (emphasize) {
        doc.rect(margin, y - 2, W - 2 * margin, 22).fill('#f8fafc')
        doc.font('Helvetica-Bold').fontSize(11).fillColor(accent)
      } else {
        doc.font('Helvetica').fontSize(10).fillColor('#475569')
      }
      doc.text(label, margin + 10, y + 3)
      doc.text(value, margin, y + 3, { width: W - 2 * margin - 10, align: 'right' })
      y += emphasize ? 26 : 20
    }

    // ── QR code ─────────────────────────────────────────────────────────────
    if (data.qrCodeDataUrl) {
      y += 16
      if (y > 640) {
        doc.addPage()
        y = margin
      }
      doc.moveTo(margin, y).lineTo(W - margin, y).strokeColor('#e2e8f0').lineWidth(1).stroke()
      y += 14
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
        .text('SWISS QR-RECHNUNG', margin, y, { characterSpacing: 0.6 })
      y += 14

      try {
        const base64 = data.qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, '')
        const qrBuf = Buffer.from(base64, 'base64')
        doc.image(qrBuf, margin, y, { width: 110, height: 110 })
      } catch { /* QR optional */ }

      const qx = margin + 130
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text('Mit Banking-App oder TWINT scannen und bezahlen.', qx, y, { width: 280 })
      let qy = y + 20
      if (data.qrIban) {
        doc.fontSize(8).fillColor('#94a3b8').text('QR-IBAN', qx, qy)
        doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
          .text(data.qrIban, qx, qy + 11)
        qy += 28
      }
      if (data.creditorName) {
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text('Empfänger', qx, qy)
        doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
          .text(data.creditorName, qx, qy + 11)
        qy += 28
      }
      if (data.scorRef) {
        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text('Referenz', qx, qy)
        doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold')
          .text(data.scorRef, qx, qy + 11, { width: 280 })
      }
      y += 120
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footerY = 800
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text(
        [
          data.tenantName,
          data.staffName ? `Absender: ${data.staffName}` : null,
          data.tenantEmail,
        ].filter(Boolean).join('  ·  '),
        margin,
        footerY,
        { width: W - 2 * margin, align: 'center' }
      )

    doc.end()
  })
}

/** Dateiname für Anhang / Download, z.B. Zahlungserinnerung_RE-2026-0013.pdf */
export function dunningPdfFilename(stageLabel: string, invoiceNumber: string): string {
  const safeStage = stageLabel.replace(/[^\wÄÖÜäöüéèêàâ .-]/g, '').replace(/\s+/g, '_')
  const safeInv = invoiceNumber.replace(/[^\w.-]/g, '_')
  return `${safeStage}_${safeInv}.pdf`
}
