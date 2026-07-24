// server/utils/invoice-pdf.ts
// Generiert eine professionelle PDF-Rechnung im Swiss-Invoice-Stil (weiss, DIN-Fenster)

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

export interface InvoicePdfData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  /** Dokumenttitel im Header, Standard: RECHNUNG */
  documentTitle?: string
  tenantName: string
  tenantStreet?: string
  tenantZip?: string
  tenantCity?: string
  tenantEmail?: string
  tenantLogoBase64?: string | null   // base64 PNG/JPEG ohne data:-Prefix
  tenantLogoFormat?: 'png' | 'jpeg'
  customerName: string
  billingCompanyName?: string
  billingStreet?: string
  billingZip?: string
  billingCity?: string
  billingEmail?: string
  items: {
    product_name: string
    appointment_date?: string | null
    appointment_duration_minutes?: number | null
    product_description?: string | null
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
  /** MwSt-Satz in Prozent, z.B. 8.1 — aus tenants.default_vat_rate / Rechnung */
  vatRate?: number
  vatAmountRappen?: number
  totalRappen: number
  qrCodeDataUrl?: string | null
  qrIban?: string | null
  scorRef?: string | null
  creditorName?: string
  note?: string
  introText?: string | null
  paymentTerms?: string | null
  footerText?: string | null
  primaryColor?: string
  secondaryColor?: string
  /**
   * Couvert-Fensterposition: 'left' (DIN/CH-Standard) oder 'right'.
   * Steuert Empfängeradresse + Absenderzeile; Meta-Daten liegen auf der Gegenseite.
   */
  windowSide?: 'left' | 'right'
  /**
   * If true, the Swiss QR payment slip is always drawn on its own last page
   * (used for Zahlungserinnerung / Mahnung so the letter is never cramped above the slip).
   */
  qrOnSeparatePage?: boolean
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width   // 595
    const H = doc.page.height  // 842
    const margin = 50
    const ink = '#111827'
    const muted = '#6b7280'
    const line = '#d1d5db'

    // Der Swiss-QR-Zahlteil wird immer an einer fixen Position vom Seitenende
    // aus gezeichnet (siehe unten), unabhängig davon, wie viel Inhalt darüber
    // steht. Wir berechnen slipY schon hier, damit wir vor dem Zeichnen von
    // "Zahlungsbedingungen"/Abschlusstext prüfen können, ob noch genug Platz
    // bis zum Zahlteil bleibt — z.B. bei Mahnschreiben mit langem Brieftext
    // (introText), der den restlichen Inhalt weiter nach unten schiebt als
    // bei einer normalen Rechnung.
    const mmToPt = (v: number) => v * 2.8346
    const slipH = data.qrCodeDataUrl ? mmToPt(105) : 0
    const slipY = H - slipH

    // ── DIN 5008 Form B / CH-Fensterbrief (C5/C6) ───────────────────────────
    // Absenderzeile knapp über dem Fenster; Empfängeradresse im Fensterschlitz.
    // Typisches Fenster: ~20mm vom Rand, oben ~50mm, ca. 85×45mm.
    // Seite (links/rechts) kommt aus tenants.invoice_window_side.
    // +20pt Y / +20pt X: leicht nach unten und rechts für Couvertfenster.
    const windowSide = data.windowSide === 'right' ? 'right' : 'left'
    const winWidth = mmToPt(85)
    const addrShiftY = 20
    const addrShiftX = 20
    const winX = (windowSide === 'right' ? (W - mmToPt(20) - winWidth) : mmToPt(20)) + addrShiftX
    const winTop = mmToPt(50) + addrShiftY
    const senderY = mmToPt(45) + addrShiftY

    // Weisser Seitengrund (explizit, falls Drucker/Viewer Defaults setzt)
    doc.rect(0, 0, W, H).fill('white')

    // ── Header: Logo links, Dokumenttitel + Betrag rechts ────────────────────
    let logoRendered = false
    if (data.tenantLogoBase64) {
      try {
        const logoBuffer = Buffer.from(data.tenantLogoBase64, 'base64')
        const dims = getImageDimensions(logoBuffer)
        let logoW = 0
        let logoH = 0
        if (dims && dims.width > 0 && dims.height > 0) {
          const scale = Math.min(150 / dims.width, 36 / dims.height)
          logoW = Math.round(dims.width * scale)
          logoH = Math.round(dims.height * scale)
        }
        if (logoW > 0 && logoH > 0) {
          const logoY = Math.round(16 + (36 - logoH) / 2)
          doc.image(logoBuffer, margin, logoY, { width: logoW, height: logoH })
          logoRendered = true
        } else {
          doc.image(logoBuffer, margin, 16, { fit: [150, 36], valign: 'center' })
          logoRendered = true
        }
      } catch { /* Logo optional */ }
    }

    const title = (data.documentTitle || 'RECHNUNG').toUpperCase()
    const titleSize = title.length > 14 ? 14 : 18
    doc.fontSize(titleSize).fillColor(ink).font('Helvetica-Bold')
      .text(title, margin, 18, { width: W - margin * 2, align: 'right', characterSpacing: 1 })
    doc.fontSize(10).fillColor(muted).font('Helvetica')
      .text(data.invoiceNumber, margin, 40, { width: W - margin * 2, align: 'right' })
    doc.fontSize(12).fillColor(ink).font('Helvetica-Bold')
      .text(formatChf(data.totalRappen), margin, 54, { width: W - margin * 2, align: 'right' })

    // Fallback-Titel links nur wenn kein Logo gerendert wurde
    if (!logoRendered) {
      doc.fontSize(11).fillColor(ink).font('Helvetica-Bold')
        .text(data.tenantName || title, margin, 28, { width: 220 })
    }

    // Dünne Trennlinie unter dem Header (oberhalb Fensterzone)
    doc.moveTo(margin, mmToPt(40)).lineTo(W - margin, mmToPt(40))
      .strokeColor(line).lineWidth(0.6).stroke()

    // ── Absender (klein, über dem Fenster) ───────────────────────────────────
    const senderParts = [
      data.tenantName,
      data.tenantStreet,
      [data.tenantZip, data.tenantCity].filter(Boolean).join(' '),
    ].filter(Boolean)
    doc.fontSize(7).fillColor(muted).font('Helvetica')
      .text(senderParts.join(' · '), winX, senderY, { width: winWidth })
    // Unterstreichung Absender (DIN-üblich)
    const senderLineW = Math.min(winWidth, doc.widthOfString(senderParts.join(' · ')) + 2)
    doc.moveTo(winX, senderY + 10).lineTo(winX + senderLineW, senderY + 10)
      .strokeColor(muted).lineWidth(0.4).stroke()

    // ── Empfängeradresse (Fensterzone, ohne Hintergrundfläche) ───────────────
    let addrY = winTop + 2
    const addrMainName = data.billingCompanyName || data.customerName
    doc.fontSize(11).fillColor(ink).font('Helvetica-Bold')
      .text(addrMainName, winX, addrY, { width: winWidth })
    addrY += 14

    doc.font('Helvetica').fontSize(10).fillColor(ink)
    if (data.billingCompanyName && data.customerName && data.customerName !== data.billingCompanyName) {
      // Kontaktperson gehört in den Fensterschlitz (nicht daneben)
      doc.text(data.customerName, winX, addrY, { width: winWidth })
      addrY += 13
    }
    if (data.billingStreet) {
      doc.text(data.billingStreet, winX, addrY, { width: winWidth })
      addrY += 13
    }
    if (data.billingZip || data.billingCity) {
      doc.text(`${data.billingZip || ''} ${data.billingCity || ''}`.trim(), winX, addrY, { width: winWidth })
      addrY += 13
    }
    // E-Mail bewusst NICHT im Fenster (nur postalische Adresse)

    // Meta-Daten auf der Gegenseite des Fensters (sichtbar ausserhalb Couvert-Schlitz)
    const metaGap = mmToPt(12)
    const metaX = windowSide === 'right' ? margin : (winX + winWidth + metaGap)
    const metaW = windowSide === 'right'
      ? Math.max(80, winX - metaGap - margin)
      : (W - margin - metaX)
    const metaTop = winTop
    const metaRows: [string, string][] = [
      ['Rechnungsdatum', formatDate(data.invoiceDate)],
      ['Fällig am', formatDate(data.dueDate)],
    ]
    if (data.tenantEmail) metaRows.push(['Kontakt', data.tenantEmail])
    metaRows.forEach(([label, value], i) => {
      const y = metaTop + i * 22
      doc.fontSize(7).fillColor(muted).font('Helvetica')
        .text(label.toUpperCase(), metaX, y, { width: metaW, characterSpacing: 0.4 })
      doc.fontSize(9).fillColor(ink).font('Helvetica-Bold')
        .text(value, metaX, y + 10, { width: metaW })
    })

    // Inhalt beginnt unterhalb der Fensterzone, damit nichts im Schlitz liegt
    const contentTop = mmToPt(100) + addrShiftY

    // ── Einleitungstext ──────────────────────────────────────────────────────
    let introBlockH = 0
    if (data.introText) {
      doc.fontSize(9).fillColor('#374151').font('Helvetica')
      const introH = doc.heightOfString(data.introText, { width: W - margin * 2 })
      doc.text(data.introText, margin, contentTop, { width: W - margin * 2 })
      introBlockH = introH + 14
    }

    // ── Items table ──────────────────────────────────────────────────────────
    const tableTop = contentTop + introBlockH
    const tableRight = W - margin
    const colPos  = [margin, 300, 385, 455]
    const colWidths = [242, 77, 63, tableRight - colPos[3] - 24]
    const tableWidth = tableRight - margin

    const rawPaymentText = data.paymentTerms ||
      `Bitte überweise den Betrag bis ${formatDate(data.dueDate)} unter Angabe der Rechnungsnummer ${data.invoiceNumber}.`
    const paymentText = rawPaymentText.replace(/\{due_date\}/g, formatDate(data.dueDate))
    doc.fontSize(9).fillColor('#374151').font('Helvetica')
    const paymentTextH = doc.heightOfString(paymentText, { width: tableWidth - 20 })
    const paymentBlockH = Math.max(36, paymentTextH + 26)
    const footerTextH = data.footerText ? doc.heightOfString(data.footerText, { width: W - margin * 2 }) : 0
    const showVat = (data.vatAmountRappen || 0) > 0
    const showDiscount = (data.discountRappen || 0) > 0
    const summaryExtraRows = (showDiscount ? 1 : 0) + (showVat ? 1 : 0) + ((showDiscount || showVat) ? 1 : 0)
    const totalBlockH = 34 + summaryExtraRows * 22
    const closingBlockH = totalBlockH + 14 + paymentBlockH + (data.footerText ? footerTextH + 10 : 0)

    const resolveItemMetaLines = (item: InvoicePdfData['items'][number]): string[] => {
      const desc = (item.product_description || '').trim()
      const descLines = desc.split(/\n+/).map(l => l.trim()).filter(Boolean)
      const isSessionBlock = descLines.length > 1 || /^Teil\s+\d+/i.test(descLines[0] || '')
      if (isSessionBlock) return descLines

      // Legacy: "Kurs · 08.08.2026, 15.08.2026, 22.08.2026"
      const legacy = desc.match(/^Kurs\s*·\s*(.+)$/i)
      if (legacy?.[1]) {
        const dates = legacy[1].split(',').map(s => s.trim()).filter(Boolean)
        if (dates.length > 1) {
          return dates.map((d, i) => `Teil ${i + 1} · ${d}`)
        }
      }

      const formattedDate = formatAppointmentDateTime((item as any).appointment_start_time || item.appointment_date)
      const durationStr = item.appointment_duration_minutes ? `${item.appointment_duration_minutes} Min.` : ''
      const line = [formattedDate, desc, durationStr].filter(Boolean).join(' · ')
      return line ? [line] : []
    }

    const estimateItemRowHeight = (item: InvoicePdfData['items'][number]) => {
      const metaLines = resolveItemMetaLines(item)
      let breakdownCount = 0
      if ((item.lesson_price_rappen || 0) > 0) breakdownCount++
      if ((item.admin_fee_rappen || 0) > 0) breakdownCount++
      if ((item.products_price_rappen || 0) > 0) {
        breakdownCount += item.product_details?.length || 1
      }
      if ((item.discount_amount_rappen || 0) > 0) breakdownCount++
      if ((item.voucher_discount_rappen || 0) > 0) breakdownCount++
      if ((item.credit_used_rappen || 0) > 0) breakdownCount++
      const rowH = 22 + (metaLines.length > 0 ? metaLines.length * 11 + 2 : 0)
      const breakdownH = breakdownCount > 0 ? breakdownCount * 14 + 4 : 0
      return rowH + breakdownH
    }

    const itemsBodyHeight = data.items.reduce((sum, item) => sum + estimateItemRowHeight(item), 0)
    const forceQrSeparate = !!(data.qrCodeDataUrl && data.qrOnSeparatePage)
    const fitsOnSinglePage = !forceQrSeparate
      && tableTop + 24 + itemsBodyHeight + closingBlockH <= (data.qrCodeDataUrl ? slipY - 16 : H - 40 - 16)

    let qrReservedOnCurrentPage = !!data.qrCodeDataUrl && fitsOnSinglePage && !forceQrSeparate
    const getContentBottomLimit = () => (qrReservedOnCurrentPage ? slipY - 16 : H - 40 - 16)

    const headers = ['POSITION', 'ANZ.', 'EINZELPREIS', 'TOTAL']
    const headerAligns: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right', 'right']
    const drawTableHeader = (y: number) => {
      // Weiss: nur Linie statt farbiger Fläche
      doc.moveTo(margin, y + 22).lineTo(margin + tableWidth, y + 22)
        .strokeColor(ink).lineWidth(1).stroke()
      doc.fontSize(8).fillColor(ink).font('Helvetica-Bold')
      headers.forEach((h, i) => {
        doc.text(h, colPos[i] + 8, y + 8, { width: colWidths[i], align: headerAligns[i], characterSpacing: 0.5 })
      })
    }

    const startTableContinuationPage = () => {
      doc.addPage()
      doc.rect(0, 0, W, H).fill('white')
      qrReservedOnCurrentPage = !!data.qrCodeDataUrl && !forceQrSeparate
      drawTableHeader(margin)
      return margin + 24
    }

    drawTableHeader(tableTop)

    let rowY = tableTop + 24
    data.items.forEach((item) => {
      const metaLines = resolveItemMetaLines(item)
      const hasMeta = metaLines.length > 0

      const breakdown: { label: string; amount: number }[] = []
      if ((item.lesson_price_rappen || 0) > 0)
        breakdown.push({ label: 'Fahrstunde', amount: item.lesson_price_rappen! })
      if ((item.admin_fee_rappen || 0) > 0)
        breakdown.push({ label: 'Admin-Gebühr', amount: item.admin_fee_rappen! })
      if ((item.products_price_rappen || 0) > 0) {
        if (item.product_details && item.product_details.length > 0) {
          for (const pd of item.product_details) {
            breakdown.push({ label: pd.name, amount: pd.price_rappen })
          }
        } else {
          breakdown.push({ label: 'Material / Produkte', amount: item.products_price_rappen! })
        }
      }
      if ((item.discount_amount_rappen || 0) > 0)
        breakdown.push({ label: 'Rabatt', amount: -(item.discount_amount_rappen!) })
      if ((item.voucher_discount_rappen || 0) > 0)
        breakdown.push({ label: 'Gutschein', amount: -(item.voucher_discount_rappen!) })
      if ((item.credit_used_rappen || 0) > 0)
        breakdown.push({ label: 'Guthaben verwendet', amount: -(item.credit_used_rappen!) })

      const rowH = 22 + (hasMeta ? metaLines.length * 11 + 2 : 0)
      const breakdownH = breakdown.length > 0 ? breakdown.length * 14 + 4 : 0
      const totalRowH = rowH + breakdownH

      if (rowY + totalRowH + closingBlockH > getContentBottomLimit()) {
        rowY = startTableContinuationPage()
      }

      doc.fontSize(9).fillColor(ink).font('Helvetica-Bold')
        .text(item.product_name, colPos[0] + 8, rowY + 5, { width: colWidths[0], ellipsis: true })

      if (hasMeta) {
        let metaY = rowY + 18
        doc.fontSize(7.5).fillColor(muted).font('Helvetica')
        for (const line of metaLines) {
          doc.text(line, colPos[0] + 8, metaY, { width: colWidths[0] })
          metaY += 11
        }
      }

      const vCenter = rowY + Math.max(5, (22 - 9) / 2)
      doc.fontSize(9).fillColor(muted).font('Helvetica')
        .text(String(item.quantity), colPos[1] + 8, vCenter, { width: colWidths[1], align: 'center' })
        .text(formatChf(item.unit_price_rappen), colPos[2] + 8, vCenter, { width: colWidths[2], align: 'right' })

      doc.fillColor(ink).font('Helvetica-Bold')
        .text(formatChf(item.total_price_rappen), colPos[3] + 8, vCenter, { width: colWidths[3], align: 'right' })

      if (breakdown.length > 0) {
        let bdY = rowY + rowH
        breakdown.forEach(bd => {
          const prefix = bd.amount < 0 ? '-' : ''
          const absAmt = Math.abs(bd.amount)
          doc.fontSize(7.5).fillColor(muted).font('Helvetica')
            .text(bd.label, colPos[0] + 20, bdY + 2, { width: colWidths[0] })
          doc.font('Helvetica-Bold')
            .text(`${prefix}${formatChf(absAmt)}`, colPos[3] + 8, bdY + 2, { width: colWidths[3], align: 'right' })
          bdY += 14
        })
      }

      doc.moveTo(margin, rowY + totalRowH).lineTo(margin + tableWidth, rowY + totalRowH)
        .strokeColor(line).lineWidth(0.5).stroke()

      rowY += totalRowH
    })

    if (rowY + closingBlockH > getContentBottomLimit()) {
      doc.addPage()
      doc.rect(0, 0, W, H).fill('white')
      qrReservedOnCurrentPage = !!data.qrCodeDataUrl && !forceQrSeparate
      rowY = margin
    }

    const drawSummaryRow = (label: string, amount: number, opts?: { bold?: boolean; total?: boolean }) => {
      if (opts?.total) {
        doc.moveTo(margin, rowY).lineTo(margin + tableWidth, rowY)
          .strokeColor(ink).lineWidth(1).stroke()
        doc.moveTo(margin, rowY + 28).lineTo(margin + tableWidth, rowY + 28)
          .strokeColor(ink).lineWidth(1.5).stroke()
        doc.fontSize(10).fillColor(ink).font('Helvetica-Bold')
          .text(label, margin + 8, rowY + 8, { width: tableWidth - colWidths[3] - 24, align: 'right' })
        doc.fontSize(11).fillColor(ink).font('Helvetica-Bold')
          .text(formatChf(amount), colPos[3] + 8, rowY + 8, { width: colWidths[3], align: 'right' })
        rowY += 30
        return
      }
      doc.fontSize(9).fillColor(opts?.bold ? ink : muted).font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, margin + 8, rowY + 6, { width: tableWidth - colWidths[3] - 24, align: 'right' })
      doc.fontSize(9).fillColor(ink).font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(formatChf(amount), colPos[3] + 8, rowY + 6, { width: colWidths[3], align: 'right' })
      rowY += 22
    }

    if (showDiscount || showVat) {
      drawSummaryRow('Zwischensumme', data.subtotalRappen)
    }
    if (showDiscount) {
      drawSummaryRow('Rabatt / Guthaben', -(data.discountRappen || 0))
    }
    if (showVat) {
      const rateLabel = Number.isFinite(Number(data.vatRate))
        ? `MwSt. (${Number(data.vatRate).toFixed(2)}%)`
        : 'MwSt.'
      drawSummaryRow(rateLabel, data.vatAmountRappen || 0)
    }

    drawSummaryRow('Gesamtbetrag', data.totalRappen, { total: true })

    // ── Zahlungsbedingungen (ohne Farbfläche) ────────────────────────────────
    rowY += 14
    doc.moveTo(margin, rowY).lineTo(margin + tableWidth, rowY)
      .strokeColor(line).lineWidth(0.5).stroke()
    doc.fontSize(8.5).fillColor(ink).font('Helvetica-Bold')
      .text('Zahlungsbedingungen', margin, rowY + 8)
    doc.fontSize(9).fillColor('#374151').font('Helvetica')
      .text(paymentText, margin, rowY + 22, { width: tableWidth })
    rowY += paymentBlockH + 10

    if (data.footerText) {
      doc.fontSize(9).fillColor('#374151').font('Helvetica')
        .text(data.footerText, margin, rowY, { width: W - margin * 2 })
      rowY += doc.heightOfString(data.footerText, { width: W - margin * 2 }) + 10
    }

    const drawPageFooter = () => {
      doc.moveTo(0, H - 32).lineTo(W, H - 32).strokeColor(line).lineWidth(0.5).stroke()
      doc.fontSize(8).fillColor(muted).font('Helvetica')
        .text(`${data.tenantName} · ${data.invoiceNumber}`, 0, H - 24, { width: W, align: 'center' })
      doc.fontSize(7).fillColor(muted).font('Helvetica')
        .text('powered by Simy.ch', 0, H - 14, { width: W, align: 'center' })
    }

    // ── Swiss QR-Rechnung – Standard Einzahlungsschein (SPS 2.2) ────────────
    let qrDrawnOnCurrentPage = false
    if (data.qrCodeDataUrl) {
      const base64Match = data.qrCodeDataUrl.match(/^data:image\/\w+;base64,(.+)$/)
      if (base64Match) {
        if (forceQrSeparate || !qrReservedOnCurrentPage) {
          drawPageFooter()
          doc.addPage()
          doc.rect(0, 0, W, H).fill('white')
        }
        qrDrawnOnCurrentPage = true

        const qrBuffer = Buffer.from(base64Match[1], 'base64')
        const mm = mmToPt
        const rcptW    = mm(62)
        const qrLeft   = mm(67)
        const qrTop    = slipY + mm(17)
        const qrSize   = mm(46)

        doc.rect(0, slipY, W, slipH).fill('white')

        doc.moveTo(0, slipY).lineTo(W, slipY)
          .strokeColor('#000').lineWidth(0.5).dash(4, { space: 3 }).stroke().undash()
        doc.moveTo(rcptW, slipY).lineTo(rcptW, H)
          .strokeColor('#000').lineWidth(0.5).dash(4, { space: 3 }).stroke().undash()

        const r = { x: mm(5), y: slipY + mm(5), w: rcptW - mm(10) }
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000')
          .text('Empfangsschein', r.x, r.y, { width: r.w })

        let ry = r.y + mm(7)
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Konto / Zahlbar an', r.x, ry)
        ry += mm(3)
        doc.fontSize(6).font('Helvetica').fillColor('#000')
          .text(data.qrIban || '', r.x, ry, { width: r.w })
        ry += mm(3)
        doc.text(data.creditorName || data.tenantName, r.x, ry, { width: r.w })
        ry += mm(3)
        if (data.tenantStreet) { doc.text(`${data.tenantStreet}${data.tenantZip ? ', ' + data.tenantZip + ' ' + (data.tenantCity || '') : ''}`, r.x, ry, { width: r.w }); ry += mm(3) }

        ry += mm(2)
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Referenznummer', r.x, ry)
        ry += mm(3)
        const refRaw = (data as any).scorRef || ''
        const refFormatted = refRaw.replace(/(\d{2})(\d{5})(\d{5})(\d{5})(\d{5})(\d{5})/, '$1 $2 $3 $4 $5 $6')
        doc.fontSize(6).font('Helvetica').text(refFormatted || refRaw, r.x, ry, { width: r.w })

        ry = slipY + mm(68)
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Währung', r.x, ry)
        doc.text('Betrag', r.x + mm(12), ry)
        ry += mm(3)
        doc.fontSize(8).font('Helvetica').text('CHF', r.x, ry)
        doc.text((data.totalRappen / 100).toFixed(2), r.x + mm(12), ry)

        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000')
          .text('Annahmestelle', r.x, slipY + mm(95), { width: r.w, align: 'right' })

        const zx = rcptW + mm(5)
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000')
          .text('Zahlteil', zx, slipY + mm(5))

        doc.image(qrBuffer, qrLeft, qrTop, { width: qrSize, height: qrSize })

        let zy = qrTop + qrSize + mm(5)
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000')
          .text('Währung', zx, zy)
        doc.text('Betrag', zx + mm(12), zy)
        zy += mm(3)
        doc.fontSize(10).font('Helvetica').text('CHF', zx, zy)
        doc.text((data.totalRappen / 100).toFixed(2), zx + mm(12), zy)

        const infoX = qrLeft + qrSize + mm(5)
        const infoW = W - infoX - mm(5)
        let iy = slipY + mm(5)
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Zahlbar an', infoX, iy)
        iy += mm(3)
        doc.fontSize(7).font('Helvetica')
          .text(data.qrIban || '', infoX, iy, { width: infoW })
        iy += mm(3.5)
        doc.text(data.creditorName || data.tenantName, infoX, iy, { width: infoW })
        iy += mm(3.5)
        if (data.tenantStreet) {
          doc.text(data.tenantStreet, infoX, iy, { width: infoW }); iy += mm(3.5)
        }
        if (data.tenantZip || data.tenantCity) {
          doc.text(`${data.tenantZip || ''} ${data.tenantCity || ''}`.trim(), infoX, iy, { width: infoW }); iy += mm(3.5)
        }
        doc.text('CH', infoX, iy, { width: infoW }); iy += mm(5)

        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Referenznummer', infoX, iy)
        iy += mm(3)
        doc.fontSize(7).font('Helvetica').text(refFormatted || refRaw, infoX, iy, { width: infoW })
        iy += mm(5)

        if (data.invoiceNumber) {
          doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Zusätzliche Informationen', infoX, iy)
          iy += mm(3)
          doc.fontSize(7).font('Helvetica').text(`Rechnung ${data.invoiceNumber}`, infoX, iy, { width: infoW })
          iy += mm(5)
        }

        const debtorName = data.billingCompanyName || data.customerName
        if (debtorName) {
          doc.fontSize(6).font('Helvetica-Bold').fillColor('#000').text('Zahlbar durch', infoX, iy)
          iy += mm(3)
          doc.fontSize(7).font('Helvetica').text(debtorName, infoX, iy, { width: infoW })
          iy += mm(3.5)
          if (data.billingStreet) { doc.text(data.billingStreet, infoX, iy, { width: infoW }); iy += mm(3.5) }
          if (data.billingZip || data.billingCity) {
            doc.text(`${data.billingZip || ''} ${data.billingCity || ''}`.trim(), infoX, iy, { width: infoW })
          }
        }
      }
    }

    if (!qrDrawnOnCurrentPage) {
      drawPageFooter()
    }

    doc.end()
  })
}
