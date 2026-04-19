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

function formatAppointmentDateTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  let timeStr = dateStr
  if (timeStr.includes(' ') && !timeStr.includes('T')) timeStr = timeStr.replace(' ', 'T')
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) timeStr = timeStr.replace('+00', '+00:00')
  if (!timeStr.includes('+') && !timeStr.includes('Z')) timeStr += '+00:00'
  const utcDate = new Date(timeStr)
  if (isNaN(utcDate.getTime())) return dateStr
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  const datePart = localDate.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timePart = localDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${datePart}, ${timePart}`
}

// Gibt die tatsächliche Bildgrösse zurück (PNG + JPEG)
function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    // PNG: Breite/Höhe bei Byte-Offset 16–23
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    }
    // JPEG: SOF-Marker suchen (FF C0 / FF C1 / FF C2)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) break
        const marker = buffer[offset + 1]
        const segLen = buffer.readUInt16BE(offset + 2)
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
        }
        offset += 2 + segLen
      }
    }
  } catch { /* ignore */ }
  return null
}
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
  tenantLogoBase64?: string | null   // base64 PNG/JPEG ohne data:-Prefix
  tenantLogoFormat?: 'png' | 'jpeg'
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
    lesson_price_rappen?: number
    admin_fee_rappen?: number
    products_price_rappen?: number
    discount_amount_rappen?: number
    voucher_discount_rappen?: number
    credit_used_rappen?: number
    product_details?: { name: string; price_rappen: number }[]
  }[]
  subtotalRappen: number
  discountRappen?: number
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

    // Logo (oben links im Header, falls vorhanden)
    if (data.tenantLogoBase64) {
      try {
        const logoBuffer = Buffer.from(data.tenantLogoBase64, 'base64')
        const dims = getImageDimensions(logoBuffer)
        let logoW = 0
        let logoH = 0
        if (dims && dims.width > 0 && dims.height > 0) {
          const scale = Math.min(160 / dims.width, 40 / dims.height)
          logoW = Math.round(dims.width * scale)
          logoH = Math.round(dims.height * scale)
        }
        if (logoW > 0 && logoH > 0) {
          // Exakte Dimensionen bekannt → kein Stretching
          const logoY = Math.round(14 + (40 - logoH) / 2)
          doc.roundedRect(margin - 6, 8, logoW + 12, 52, 5).fill('white')
          doc.image(logoBuffer, margin, logoY, { width: logoW, height: logoH })
        } else {
          // Fallback: fit erhält Seitenverhältnis, kein explizites height
          doc.roundedRect(margin - 6, 8, 172, 52, 5).fill('white')
          doc.image(logoBuffer, margin, 14, { fit: [160, 40], align: 'left', valign: 'center' })
        }
      } catch { /* Logo optional */ }
    }

    // "RECHNUNG" title (nur wenn kein Logo)
    if (!data.tenantLogoBase64) {
      doc.fontSize(28).fillColor('white').font('Helvetica-Bold')
        .text('RECHNUNG', margin, 30, { characterSpacing: 4 })
    }

    // Invoice number + total (rechts)
    doc.fillOpacity(0.65).fontSize(11).fillColor('white').font('Helvetica')
      .text(data.invoiceNumber, 0, 28, { width: W - margin, align: 'right' })
    doc.fillOpacity(1).fontSize(14).fillColor('white').font('Helvetica-Bold')
      .text(formatChf(data.totalRappen), 0, 50, { width: W - margin, align: 'right' })

    // ── Dark meta strip ──────────────────────────────────────────────────────
    doc.rect(0, 100, W, 36).fill('#1e293b')

    const metaItems: string[][] = [
      [formatDate(data.invoiceDate)],
      ['Fällig am', formatDate(data.dueDate)],
      ...(data.tenantEmail ? [['Kontakt', data.tenantEmail]] : []),
    ]
    // Erste Spalte ohne Label (nur Datum)
    const metaLabels = ['Rechnungsdatum', 'Fällig am', 'Kontakt']
    const metaValues = [formatDate(data.invoiceDate), formatDate(data.dueDate), data.tenantEmail || ''].filter((_, i) => i < (data.tenantEmail ? 3 : 2))
    const metaLabelsFinal = metaLabels.slice(0, data.tenantEmail ? 3 : 2)

    metaLabelsFinal.forEach((label, i) => {
      const x = margin + i * 170
      doc.fillOpacity(0.75).fontSize(8).fillColor('white').font('Helvetica')
        .text(label.toUpperCase(), x, 108, { characterSpacing: 0.5 })
      doc.fillOpacity(1).fontSize(9).fillColor('white').font('Helvetica-Bold')
        .text(metaValues[i], x, 119)
    })

    // ── Address area ─────────────────────────────────────────────────────────
    const addrTop = 158

    // Sender small line
    const senderParts = [data.tenantName, data.tenantStreet, [data.tenantZip, data.tenantCity].filter(Boolean).join(' ')].filter(Boolean)
    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
      .text(senderParts.join(' · '), margin, addrTop, { width: 300 })

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
    // Spalten so dass alles innerhalb von margin..W-margin (50..545) bleibt
    const tableRight = W - margin   // 545
    const colPos  = [margin, 300, 385, 455]   // Startpositionen
    const colWidths = [242, 77, 63, tableRight - colPos[3] - 24]  // last col with right padding

    const tableWidth = tableRight - margin  // 495

    // Table header
    doc.rect(margin, tableTop, tableWidth, 24).fill(primary)
    doc.fontSize(8).fillColor('white').font('Helvetica-Bold')

    const headers = ['POSITION', 'ANZ.', 'EINZELPREIS', 'TOTAL']
    const headerAligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right', 'right']
    headers.forEach((h, i) => {
      doc.text(h, colPos[i] + 8, tableTop + 8, { width: colWidths[i], align: headerAligns[i], characterSpacing: 0.5 })
    })

    let rowY = tableTop + 24
    data.items.forEach((item, idx) => {
      const formattedDate = formatAppointmentDateTime(item.appointment_date)
      const hasDate = !!formattedDate

      // Breakdown berechnen
      const breakdown: { label: string; amount: number; color: string }[] = []
      if ((item.lesson_price_rappen || 0) > 0)
        breakdown.push({ label: 'Fahrstunde', amount: item.lesson_price_rappen!, color: '#64748b' })
      if ((item.admin_fee_rappen || 0) > 0)
        breakdown.push({ label: 'Admin-Gebühr', amount: item.admin_fee_rappen!, color: '#64748b' })
      if ((item.products_price_rappen || 0) > 0) {
        if (item.product_details && item.product_details.length > 0) {
          for (const pd of item.product_details) {
            breakdown.push({ label: pd.name, amount: pd.price_rappen, color: '#64748b' })
          }
        } else {
          breakdown.push({ label: 'Material / Produkte', amount: item.products_price_rappen!, color: '#64748b' })
        }
      }
      if ((item.discount_amount_rappen || 0) > 0)
        breakdown.push({ label: 'Rabatt', amount: - (item.discount_amount_rappen!), color: '#16a34a' })
      if ((item.voucher_discount_rappen || 0) > 0)
        breakdown.push({ label: 'Gutschein', amount: - (item.voucher_discount_rappen!), color: '#16a34a' })
      if ((item.credit_used_rappen || 0) > 0)
        breakdown.push({ label: 'Guthaben verwendet', amount: -(item.credit_used_rappen!), color: '#2563eb' })

      const rowH = hasDate ? 32 : 22
      const breakdownH = breakdown.length > 0 ? breakdown.length * 14 + 4 : 0
      const totalRowH = rowH + breakdownH
      const bg = idx % 2 === 0 ? 'white' : '#f8fafc'

      doc.rect(margin, rowY, tableWidth, totalRowH).fill(bg)

      doc.fontSize(9).fillColor('#1e293b').font('Helvetica-Bold')
        .text(item.product_name, colPos[0] + 8, rowY + 5, { width: colWidths[0], ellipsis: true })

      if (hasDate) {
        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica')
          .text(formattedDate, colPos[0] + 8, rowY + 18, { width: colWidths[0] })
      }

      const vCenter = rowY + (rowH - 9) / 2
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text(String(item.quantity), colPos[1] + 8, vCenter, { width: colWidths[1], align: 'center' })
        .text(formatChf(item.unit_price_rappen), colPos[2] + 8, vCenter, { width: colWidths[2], align: 'right' })

      doc.fillColor('#1e293b').font('Helvetica-Bold')
        .text(formatChf(item.total_price_rappen), colPos[3] + 8, vCenter, { width: colWidths[3], align: 'right' })

      // Breakdown-Zeilen
      if (breakdown.length > 0) {
        let bdY = rowY + rowH
        breakdown.forEach(bd => {
          const prefix = bd.amount < 0 ? '-' : ''
          const absAmt = Math.abs(bd.amount)
          doc.fontSize(7.5).fillColor(bd.color).font('Helvetica')
            .text(bd.label, colPos[0] + 20, bdY + 2, { width: colWidths[0] })
          doc.font('Helvetica-Bold')
            .text(`${prefix}${formatChf(absAmt)}`, colPos[3] + 8, bdY + 2, { width: colWidths[3], align: 'right' })
          bdY += 14
        })
      }

      doc.moveTo(margin, rowY + totalRowH).lineTo(margin + tableWidth, rowY + totalRowH)
        .strokeColor('#e2e8f0').lineWidth(0.5).stroke()

      rowY += totalRowH
    })

    // Total row — komplett innerhalb der Tabelle
    doc.rect(margin, rowY, tableWidth, 34).fill(primary)
    doc.fillOpacity(0.8).fontSize(10).fillColor('white').font('Helvetica')
      .text('Gesamtbetrag', margin + 8, rowY + 11, { width: tableWidth - colWidths[3] - 24, align: 'right' })
    doc.fillOpacity(1).fontSize(11).fillColor('white').font('Helvetica-Bold')
      .text(formatChf(data.totalRappen), colPos[3] + 8, rowY + 11, { width: colWidths[3], align: 'right' })

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

        doc.moveTo(margin, rowY).lineTo(margin + tableWidth, rowY)
          .strokeColor('#cbd5e1').lineWidth(1).dash(5, { space: 4 }).stroke()
        doc.undash()
        rowY += 12

        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica-Bold')
          .text('SWISS QR-RECHNUNG', margin, rowY, { characterSpacing: 1.5 })
        rowY += 14

        const qrSize = 95
        doc.rect(margin, rowY, qrSize + 16, qrSize + 16).fill('white').strokeColor('#e2e8f0').lineWidth(1).stroke()
        doc.image(qrBuffer, margin + 8, rowY + 8, { width: qrSize, height: qrSize })

        const qrTextX = margin + qrSize + 30
        const qrTextW = W - margin - qrTextX

        doc.fontSize(8.5).fillColor('#64748b').font('Helvetica')
          .text('Per Banking-App scannen und direkt bezahlen.', qrTextX, rowY, { width: qrTextW })

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
          // Adresse direkt darunter ohne Titel
          const addrParts = [
            data.tenantStreet,
            [data.tenantZip, data.tenantCity].filter(Boolean).join(' '),
          ].filter(Boolean)
          if (addrParts.length > 0) {
            doc.fontSize(8).fillColor('#1e293b').font('Helvetica')
              .text(addrParts.join(', '), qrTextX, qrY + 21, { width: qrTextW })
            qrY += 12
          }
          qrY += 25
        }
        doc.fontSize(7.5).fillColor('#94a3b8').font('Helvetica').text('Zahlbetrag', qrTextX, qrY)
        doc.fontSize(12).fillColor(primary).font('Helvetica-Bold')
          .text(formatChf(data.totalRappen), qrTextX, qrY + 10)
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.rect(0, H - 40, W, 40).fill('#f8fafc')
    doc.moveTo(0, H - 40).lineTo(W, H - 40).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
      .text(`${data.tenantName} · ${data.invoiceNumber}`, 0, H - 30, { width: W, align: 'center' })
    doc.fillOpacity(0.5).fontSize(7).fillColor('#94a3b8').font('Helvetica')
      .text('powered by Simy.ch', 0, H - 18, { width: W, align: 'center' })
    doc.fillOpacity(1)

    doc.end()
  })
}
