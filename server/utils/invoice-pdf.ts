// server/utils/invoice-pdf.ts
// Generiert eine professionelle PDF-Rechnung im Swiss-Invoice-Stil

import PDFDocument from 'pdfkit'

function formatChf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Parse hex color to RGB components
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export interface InvoicePdfData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  tenantName: string
  tenantStreet?: string
  tenantZip?: string
  tenantCity?: string
  tenantEmail?: string
  customerName: string
  billingStreet?: string
  billingZip?: string
  billingCity?: string
  billingEmail?: string
  items: {
    product_name: string
    appointment_date?: string | null
    quantity: number
    unit_price_rappen: number
    total_price_rappen: number
  }[]
  subtotalRappen: number
  totalRappen: number
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  creditorName?: string
  note?: string
  primaryColor?: string
  secondaryColor?: string
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const primary = data.primaryColor || '#1E40AF'
    const [pr, pg, pb] = hexToRgb(primary)

    const W = doc.page.width   // 595
    const H = doc.page.height  // 842
    const margin = 50

    // ── Hero header strip ────────────────────────────────────────────────────
    doc.rect(0, 0, W, 100).fill(primary)

    // Diagonal accent stripe
    doc.save()
      .moveTo(W - 140, 0).lineTo(W, 0).lineTo(W, 100).lineTo(W - 200, 100)
      .fill(`rgb(${Math.min(pr + 30, 255)}, ${Math.min(pg + 30, 255)}, ${Math.min(pb + 30, 255)})`)
    doc.restore()

    // "RECHNUNG" title
    doc.fontSize(28).fillColor('white').font('Helvetica-Bold')
      .text('RECHNUNG', margin, 30, { characterSpacing: 4 })

    doc.fontSize(10).fillColor('rgba(255,255,255,0.7)').font('Helvetica')
      .text(data.tenantName, margin, 66)

    // Invoice number right side
    doc.fontSize(11).fillColor('rgba(255,255,255,0.65)').font('Helvetica')
      .text(data.invoiceNumber, 0, 28, { width: W - margin, align: 'right' })

    doc.fontSize(22).fillColor('white').font('Helvetica-Bold')
      .text(formatChf(data.totalRappen), 0, 50, { width: W - margin, align: 'right' })

    // ── Dark meta strip ──────────────────────────────────────────────────────
    doc.rect(0, 100, W, 36).fill('#1e293b')

    const metaItems = [
      ['Rechnungsdatum', formatDate(data.invoiceDate)],
      ['Fällig am', formatDate(data.dueDate)],
      ...(data.tenantEmail ? [['Kontakt', data.tenantEmail]] : []),
    ]

    metaItems.forEach(([label, value], i) => {
      const x = margin + i * 170
      doc.fontSize(8).fillColor('rgba(255,255,255,0.5)').font('Helvetica')
        .text(label.toUpperCase(), x, 108, { characterSpacing: 0.5 })
      doc.fontSize(9).fillColor('white').font('Helvetica-Bold')
        .text(value, x, 119)
    })

    // ── Address area ─────────────────────────────────────────────────────────
    const addrTop = 158

    // Sender small line
    const senderParts = [data.tenantName, data.tenantStreet, [data.tenantZip, data.tenantCity].filter(Boolean).join(' ')].filter(Boolean)
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
      .text(senderParts.join(' · '), margin, addrTop, { width: 220 })

    // Recipient block
    doc.rect(margin, addrTop + 12, 210, 78).fill('#f8fafc').stroke('#e2e8f0')
    doc.fontSize(11).fillColor('#1e293b').font('Helvetica-Bold')
      .text(data.customerName, margin + 12, addrTop + 22, { width: 186 })
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')

    let addrY = addrTop + 36
    if (data.billingStreet) {
      doc.text(data.billingStreet, margin + 12, addrY, { width: 186 })
      addrY += 13
    }
    if (data.billingZip || data.billingCity) {
      doc.text(`${data.billingZip || ''} ${data.billingCity || ''}`.trim(), margin + 12, addrY, { width: 186 })
      addrY += 13
    }
    if (data.billingEmail) {
      doc.fillColor('#64748b').text(data.billingEmail, margin + 12, addrY, { width: 186 })
    }

    // ── Items table ──────────────────────────────────────────────────────────
    const tableTop = addrTop + 105
    const colPos = [margin, 330, 410, 490]
    const tableWidth = W - margin * 2

    // Table header
    doc.rect(margin, tableTop, tableWidth, 24).fill(primary)
    doc.fontSize(8).fillColor('white').font('Helvetica-Bold')

    const headers = ['POSITION', 'ANZ.', 'EINZELPREIS', 'TOTAL']
    const headerAligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right', 'right']
    const colWidths = [280, 50, 80, 85]
    headers.forEach((h, i) => {
      doc.text(h, colPos[i] + 8, tableTop + 8, { width: colWidths[i], align: headerAligns[i], characterSpacing: 0.5 })
    })

    let rowY = tableTop + 24
    data.items.forEach((item, idx) => {
      const hasDate = !!item.appointment_date
      const rowH = hasDate ? 30 : 22
      const bg = idx % 2 === 0 ? 'white' : '#f8fafc'

      doc.rect(margin, rowY, tableWidth, rowH).fill(bg)

      doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
        .text(item.product_name, colPos[0] + 8, rowY + 5, { width: 268, ellipsis: true })

      if (hasDate) {
        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica')
          .text(item.appointment_date!, colPos[0] + 8, rowY + 17, { width: 268 })
      }

      const vCenter = rowY + (rowH - 9) / 2
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(String(item.quantity), colPos[1] + 8, vCenter, { width: 34, align: 'center' })
        .text(formatChf(item.unit_price_rappen), colPos[2] + 8, vCenter, { width: 72, align: 'right' })

      doc.fillColor('#1e293b').font('Helvetica-Bold')
        .text(formatChf(item.total_price_rappen), colPos[3] + 8, vCenter, { width: 69, align: 'right' })

      // Bottom border
      doc.moveTo(margin, rowY + rowH).lineTo(margin + tableWidth, rowY + rowH)
        .strokeColor('#e2e8f0').lineWidth(0.5).stroke()

      rowY += rowH
    })

    // Total row
    doc.rect(margin, rowY, tableWidth, 34).fill(primary)
    doc.fontSize(10).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
      .text('Gesamtbetrag', colPos[0] + 8, rowY + 11, { width: 390, align: 'right' })
    doc.fontSize(14).fillColor('white').font('Helvetica-Bold')
      .text(formatChf(data.totalRappen), colPos[3] + 8, rowY + 8, { width: 69, align: 'right' })

    rowY += 34

    // ── Payment note ─────────────────────────────────────────────────────────
    rowY += 14
    doc.rect(margin, rowY, tableWidth, 36).fill(`rgb(${pr}, ${pg}, ${pb}, 0.07)`)
      .strokeColor(primary).lineWidth(0.5).stroke()
    doc.rect(margin, rowY, 4, 36).fill(primary)

    doc.fontSize(8.5).fillColor('#1e293b').font('Helvetica-Bold')
      .text('Zahlungsart: Rechnung', margin + 14, rowY + 7)
    doc.fontSize(8).fillColor('#475569').font('Helvetica')
      .text(
        `Bitte überweise den Betrag bis ${formatDate(data.dueDate)} unter Angabe der Rechnungsnummer ${data.invoiceNumber}.`,
        margin + 14, rowY + 19, { width: tableWidth - 20 }
      )

    rowY += 50

    // ── Swiss QR-Rechnung ────────────────────────────────────────────────────
    if (data.qrCodeDataUrl) {
      const base64Match = data.qrCodeDataUrl.match(/^data:image\/\w+;base64,(.+)$/)
      if (base64Match) {
        const qrBuffer = Buffer.from(base64Match[1], 'base64')

        // Dashed separator
        doc.moveTo(margin, rowY).lineTo(margin + tableWidth, rowY)
          .strokeColor('#cbd5e1').lineWidth(1).dash(5, { space: 4 }).stroke()
        doc.undash()

        rowY += 12

        // Section label
        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica-Bold')
          .text('SWISS QR-RECHNUNG', margin, rowY, { characterSpacing: 1.5 })

        rowY += 14

        // QR code box
        const qrSize = 95
        doc.rect(margin, rowY, qrSize + 16, qrSize + 24).fill('white').strokeColor('#e2e8f0').lineWidth(1).stroke()
        doc.image(qrBuffer, margin + 8, rowY + 8, { width: qrSize, height: qrSize })

        // Swiss cross (centered below QR)
        const crossX = margin + 8 + (qrSize - 22) / 2
        doc.rect(crossX, rowY + 8 + (qrSize - 22) / 2, 22, 22).fill('white')
        doc.rect(crossX + 1, rowY + 8 + (qrSize - 22) / 2 + 1, 20, 20).fill('#FF0000')
        doc.rect(crossX + 8, rowY + 8 + (qrSize - 22) / 2 + 3, 4, 14).fill('white')
        doc.rect(crossX + 3, rowY + 8 + (qrSize - 22) / 2 + 8, 14, 4).fill('white')

        // Swiss cross label
        doc.fontSize(6.5).fillColor('#64748b').font('Helvetica')
          .text('Swiss Cross', margin, rowY + qrSize + 10, { width: qrSize + 16, align: 'center' })

        // QR details
        const qrTextX = margin + qrSize + 30
        const qrTextW = W - margin - qrTextX

        doc.fontSize(8.5).fillColor('#64748b').font('Helvetica')
          .text('Per Banking-App oder TWINT scannen und direkt bezahlen.', qrTextX, rowY, { width: qrTextW })

        let qrY = rowY + 18
        if (data.qrIban) {
          doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica').text('QR-IBAN', qrTextX, qrY)
          doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold')
            .text(data.qrIban, qrTextX, qrY + 10, { width: qrTextW })
          qrY += 25
        }
        if (data.creditorName || data.tenantName) {
          doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica').text('Empfänger', qrTextX, qrY)
          doc.fontSize(8).fillColor('#1e293b').font('Helvetica-Bold')
            .text(data.creditorName || data.tenantName, qrTextX, qrY + 10, { width: qrTextW })
          qrY += 25
        }
        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica').text('Zahlbetrag', qrTextX, qrY)
        doc.fontSize(16).fillColor(primary).font('Helvetica-Bold')
          .text(formatChf(data.totalRappen), qrTextX, qrY + 10)
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.rect(0, H - 40, W, 40).fill('#f8fafc')
    doc.moveTo(0, H - 40).lineTo(W, H - 40).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text(`${data.tenantName} · powered by Simy · ${data.invoiceNumber}`, 0, H - 26, { width: W, align: 'center' })

    doc.end()
  })
}
