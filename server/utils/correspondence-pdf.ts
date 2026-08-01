// server/utils/correspondence-pdf.ts
// Formal letter PDF — same DIN 5008 / CH window-envelope shell as invoices,
// without line items, totals, payment terms, or Swiss QR.

import PDFDocument from 'pdfkit'

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    }
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

export interface CorrespondencePdfData {
  referenceNumber: string
  letterDate: string
  documentTitle?: string
  subject: string
  salutation?: string | null
  body: string
  closing?: string | null
  theirReference?: string | null
  tenantName: string
  tenantStreet?: string
  tenantZip?: string
  tenantCity?: string
  tenantEmail?: string
  tenantContactPerson?: string
  tenantLogoBase64?: string | null
  customerName: string
  billingCompanyName?: string
  billingStreet?: string
  billingZip?: string
  billingCity?: string
  windowSide?: 'left' | 'right'
  /** Optional signer name under closing (staff who sent) */
  signerName?: string | null
}

/** Layout constants shared with invoice-pdf (DIN Form B / CH C5–C6 window). */
const mmToPt = (v: number) => v * 2.8346
const MARGIN = 50
const INK = '#111827'
const MUTED = '#6b7280'
const LINE = '#d1d5db'
const ADDR_SHIFT_Y = 20
const ADDR_SHIFT_X = 20

export async function generateCorrespondencePdf(data: CorrespondencePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width
    const H = doc.page.height
    const margin = MARGIN
    const ink = INK
    const muted = MUTED
    const line = LINE

    const windowSide = data.windowSide === 'right' ? 'right' : 'left'
    const winWidth = mmToPt(85)
    const winX = (windowSide === 'right' ? (W - mmToPt(20) - winWidth) : mmToPt(20)) + ADDR_SHIFT_X
    const winTop = mmToPt(50) + ADDR_SHIFT_Y
    const senderY = mmToPt(45) + ADDR_SHIFT_Y

    doc.rect(0, 0, W, H).fill('white')

    // ── Header: Logo left, document title + reference right ─────────────────
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

    const title = (data.documentTitle || 'BRIEF').toUpperCase()
    const titleSize = title.length > 14 ? 14 : 18
    doc.fontSize(titleSize).fillColor(ink).font('Helvetica-Bold')
      .text(title, margin, 18, { width: W - margin * 2, align: 'right', characterSpacing: 1 })
    doc.fontSize(10).fillColor(muted).font('Helvetica')
      .text(data.referenceNumber, margin, 40, { width: W - margin * 2, align: 'right' })

    if (!logoRendered) {
      doc.fontSize(11).fillColor(ink).font('Helvetica-Bold')
        .text(data.tenantName || title, margin, 28, { width: 220 })
    }

    doc.moveTo(margin, mmToPt(40)).lineTo(W - margin, mmToPt(40))
      .strokeColor(line).lineWidth(0.6).stroke()

    // ── Sender line above window ─────────────────────────────────────────────
    const senderParts = [
      data.tenantName,
      data.tenantStreet,
      [data.tenantZip, data.tenantCity].filter(Boolean).join(' '),
    ].filter(Boolean)
    doc.fontSize(7).fillColor(muted).font('Helvetica')
      .text(senderParts.join(' · '), winX, senderY, { width: winWidth })
    const senderLineW = Math.min(winWidth, doc.widthOfString(senderParts.join(' · ')) + 2)
    doc.moveTo(winX, senderY + 10).lineTo(winX + senderLineW, senderY + 10)
      .strokeColor(muted).lineWidth(0.4).stroke()

    // ── Recipient in window ──────────────────────────────────────────────────
    let addrY = winTop + 2
    const addrMainName = data.billingCompanyName || data.customerName
    doc.fontSize(11).fillColor(ink).font('Helvetica-Bold')
      .text(addrMainName, winX, addrY, { width: winWidth })
    addrY += 14

    doc.font('Helvetica').fontSize(10).fillColor(ink)
    if (data.billingStreet) {
      doc.text(data.billingStreet, winX, addrY, { width: winWidth })
      addrY += 13
    }
    if (data.billingZip || data.billingCity) {
      doc.text(`${data.billingZip || ''} ${data.billingCity || ''}`.trim(), winX, addrY, { width: winWidth })
      addrY += 13
    }

    // ── Meta opposite the window ─────────────────────────────────────────────
    const metaGap = mmToPt(12)
    const metaX = windowSide === 'right' ? margin : (winX + winWidth + metaGap)
    const metaW = windowSide === 'right'
      ? Math.max(80, winX - metaGap - margin)
      : (W - margin - metaX)
    const metaTop = winTop
    const metaRows: [string, string][] = [
      ['Datum', formatDate(data.letterDate)],
    ]
    if (data.theirReference) metaRows.push(['Ihr Zeichen', data.theirReference])
    metaRows.push(['Unser Zeichen', data.referenceNumber])
    if (data.tenantContactPerson) metaRows.push(['Kontaktperson', data.tenantContactPerson])
    if (data.tenantEmail) metaRows.push(['Kontakt', data.tenantEmail])
    metaRows.forEach(([label, value], i) => {
      const y = metaTop + i * 22
      doc.fontSize(7).fillColor(muted).font('Helvetica')
        .text(label.toUpperCase(), metaX, y, { width: metaW, characterSpacing: 0.4 })
      doc.fontSize(9).fillColor(ink).font('Helvetica-Bold')
        .text(value, metaX, y + 10, { width: metaW })
    })

    const winBottom = winTop + mmToPt(45)
    let belowWindowY = winBottom - 32

    if (data.billingCompanyName && data.customerName && data.customerName !== data.billingCompanyName) {
      doc.fontSize(7).fillColor(muted).font('Helvetica')
        .text('KONTAKTPERSON', winX, belowWindowY, { width: winWidth, characterSpacing: 0.4 })
      belowWindowY += 10
      doc.fontSize(9).fillColor(ink).font('Helvetica')
        .text(data.customerName, winX, belowWindowY, { width: winWidth })
      belowWindowY += 14
    }

    const contentTop = Math.max(mmToPt(100) + ADDR_SHIFT_Y, belowWindowY + 6)
    const contentWidth = W - margin * 2
    let y = contentTop

    // ── Subject ──────────────────────────────────────────────────────────────
    doc.fontSize(7).fillColor(muted).font('Helvetica')
      .text('BETREFF', margin, y, { width: contentWidth, characterSpacing: 0.4 })
    y += 11
    doc.fontSize(11).fillColor(ink).font('Helvetica-Bold')
      .text(data.subject, margin, y, { width: contentWidth })
    y += doc.heightOfString(data.subject, { width: contentWidth }) + 16

    const drawPageFooter = () => {
      doc.moveTo(0, H - 32).lineTo(W, H - 32).strokeColor(line).lineWidth(0.5).stroke()
      doc.fontSize(8).fillColor(muted).font('Helvetica')
        .text(`${data.tenantName} · ${data.referenceNumber}`, 0, H - 24, { width: W, align: 'center' })
      doc.fontSize(7).fillColor(muted).font('Helvetica')
        .text('powered by Simy.ch', 0, H - 14, { width: W, align: 'center' })
    }

    const ensureSpace = (needed: number) => {
      if (y + needed > H - 48) {
        drawPageFooter()
        doc.addPage()
        doc.rect(0, 0, W, H).fill('white')
        y = margin
      }
    }

    // ── Salutation ───────────────────────────────────────────────────────────
    const salutation = (data.salutation || '').trim()
    if (salutation) {
      ensureSpace(24)
      doc.fontSize(10).fillColor(ink).font('Helvetica')
        .text(salutation, margin, y, { width: contentWidth })
      y += doc.heightOfString(salutation, { width: contentWidth }) + 14
    }

    // ── Body paragraphs ──────────────────────────────────────────────────────
    const paragraphs = (data.body || '')
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)

    for (const paragraph of paragraphs) {
      const text = paragraph.replace(/\n/g, ' ')
      doc.fontSize(10).fillColor('#374151').font('Helvetica')
      const h = doc.heightOfString(text, { width: contentWidth, align: 'left' })
      ensureSpace(h + 12)
      doc.text(text, margin, y, { width: contentWidth, align: 'left' })
      y += h + 12
    }

    // ── Closing + signature ──────────────────────────────────────────────────
    const closing = (data.closing || 'Freundliche Grüsse').trim()
    ensureSpace(60)
    y += 8
    doc.fontSize(10).fillColor(ink).font('Helvetica')
      .text(closing, margin, y, { width: contentWidth })
    y += doc.heightOfString(closing, { width: contentWidth }) + 28

    if (data.signerName) {
      doc.fontSize(10).fillColor(ink).font('Helvetica')
        .text(data.signerName, margin, y, { width: contentWidth })
      y += 14
    }
    doc.fontSize(9).fillColor(muted).font('Helvetica')
      .text(data.tenantName, margin, y, { width: contentWidth })

    drawPageFooter()
    doc.end()
  })
}
