import PDFDocument from 'pdfkit'
import { ACCOUNTING_PDF_DISCLAIMER } from '~/server/utils/accounting'
import {
  VAT_PDF_DISCLAIMER,
  type VatQuarterResult,
  vatStatusLabel,
} from '~/server/utils/accounting-vat'
import type { VatTenantMeta } from '~/server/utils/accounting-vat-data'

function chf(rappen: number): string {
  const sign = rappen < 0 ? '-' : ''
  return `${sign}CHF ${Math.abs(rappen / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('de-CH') } catch { return iso }
}

export function buildVatQuarterPdf(params: {
  tenant: VatTenantMeta
  quarter: VatQuarterResult
}): Promise<Buffer> {
  const { tenant, quarter } = params
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })

  const GRAY = '#64748b'
  const DARK = '#1e293b'
  const LIGHT = '#f8fafc'
  const BORDER = '#e2e8f0'

  const drawFooter = () => {
    doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
      .text(`${VAT_PDF_DISCLAIMER} ${ACCOUNTING_PDF_DISCLAIMER}`, 50, 760, { align: 'center', width: 495 })
  }
  doc.on('pageAdded', drawFooter)

  doc.rect(0, 0, 595, 80).fill('#1e293b')
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text(`MWST-Abrechnung Q${quarter.quarter} ${quarter.year}`, 50, 24)
  doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
    .text(tenant.name, 50, 52)
  doc.fillColor('rgba(255,255,255,0.5)')
    .text(`Erstellt am ${new Date().toLocaleDateString('de-CH')}`, 360, 52, { align: 'right', width: 185 })

  let y = 100
  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text(`Periode ${fmtDate(quarter.date_from)} – ${fmtDate(quarter.date_to)} · ESTV-Frist ${fmtDate(quarter.deadline)} · ${vatStatusLabel(quarter.status)}`, 50, y, { width: 495 })
  y += 16
  doc.text(`UID ${tenant.uid_number || 'nicht hinterlegt'} · MWST-pflichtig: ${tenant.mwst_obligated ? 'ja' : 'nein'} · Standard-Satz ${tenant.default_vat_rate}%`, 50, y, { width: 495 })
  y += 24

  const kpis = [
    { label: 'Umsatzsteuer', value: chf(quarter.output_vat_rappen), color: '#0f766e' },
    { label: 'Vorsteuer', value: chf(quarter.input_vat_rappen), color: '#0369a1' },
    { label: quarter.payable_rappen >= 0 ? 'Zahlbar' : 'Guthaben', value: chf(quarter.payable_rappen), color: quarter.payable_rappen >= 0 ? '#b45309' : '#047857' },
  ]
  kpis.forEach((k, i) => {
    const x = 50 + i * 168
    doc.roundedRect(x, y, 155, 55, 6).fill(LIGHT).stroke(BORDER)
    doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(k.label.toUpperCase(), x + 12, y + 10)
    doc.fillColor(k.color).fontSize(16).font('Helvetica-Bold').text(k.value, x + 12, y + 26)
  })
  y += 75

  const row = (cols: string[], bold = false) => {
    if (y > 720) { doc.addPage(); y = 50 }
    const widths = [180, 105, 105, 105]
    const xs = [50, 230, 335, 440]
    doc.fillColor(DARK).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica')
    cols.forEach((c, i) => {
      doc.text(c, xs[i], y, { width: widths[i] - 8, align: i === 0 ? 'left' : 'right' })
    })
    y += 16
  }

  doc.rect(50, y, 495, 24).fill('#1e293b')
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('Umsätze nach Satz (effektive Methode)', 62, y + 7)
  y += 32
  row(['Satz / Art', 'Netto', 'MWST', 'Brutto'], true)
  doc.rect(50, y - 2, 495, 1).fill(BORDER); y += 4

  for (const line of quarter.taxable) {
    row([`${line.rate.toFixed(1)} %`, chf(line.net_rappen), chf(line.vat_rappen), chf(line.gross_rappen)])
  }
  row(['Befreit / 0 % (z. B. Ausbildung Art. 21 MWSTG)', chf(quarter.exempt_turnover_rappen), chf(0), chf(quarter.exempt_turnover_rappen)])
  doc.rect(50, y, 495, 1).fill(BORDER); y += 4
  row(['Total Umsatz', '', '', chf(quarter.total_turnover_rappen)], true)
  y += 16

  doc.rect(50, y, 495, 24).fill('#1e293b')
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('Vorsteuer', 62, y + 7)
  y += 32
  row(['Anerkannt (Ausgabe mit Beleg)', '', chf(quarter.input_vat_rappen), ''], true)
  row(['Gesperrt (ohne Beleg oder Privat)', '', chf(quarter.input_vat_blocked_rappen), ''])
  y += 20

  doc.roundedRect(50, y, 495, 56, 6).fill(quarter.payable_rappen >= 0 ? '#fff7ed' : '#ecfdf5').stroke(BORDER)
  doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('ZAHLBARE MWST (Umsatzsteuer − Vorsteuer)', 62, y + 10)
  doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold').text(chf(quarter.payable_rappen), 62, y + 26)
  y += 72

  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text('Hinweis: Fahrschul-Ausbildungsleistungen sind oft von der MWST befreit (Art. 21 MWSTG). Die Pflicht entsteht in der Regel ab CHF 100’000 Umsatz. Abgabefrist: 60 Tage nach Quartalsende.', 50, y, { width: 495 })

  drawFooter()
  doc.end()
  return pdfReady
}
