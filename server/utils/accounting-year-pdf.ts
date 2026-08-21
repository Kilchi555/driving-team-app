import PDFDocument from 'pdfkit'
import { ACCOUNTING_PDF_DISCLAIMER, computeSimpleBookIncome } from '~/server/utils/accounting'
import type { getSupabaseAdmin } from '~/server/utils/supabase-admin'

type Admin = ReturnType<typeof getSupabaseAdmin>

function chf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('de-CH') } catch { return d }
}

export async function buildAccountingYearPdf(params: {
  supabase: Admin
  tenantId: string
  tenantName: string
  year: number
}): Promise<Buffer> {
  const { supabase, tenantId, tenantName, year } = params
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_payments_monthly_summary', { p_tenant_id: tenantId, p_year: year })
  if (rpcError) throw new Error(rpcError.message)

  const paymentsIncomeRappen = (rpcData ?? []).reduce((s: number, row: { total_rappen?: number }) => s + Number(row.total_rappen ?? 0), 0)

  const entries: Array<{
    type: string
    amount_rappen: number
    entry_date: string
    description: string
    linked_payment_id?: string | null
    storno_of_id?: string | null
    receipt_url?: string | null
    category?: { name?: string } | null
  }> = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('accounting_entries')
      .select('type, amount_rappen, entry_date, description, linked_payment_id, storno_of_id, receipt_url, category:accounting_categories(name)')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .is('deleted_at', null)
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const chunk = data ?? []
    entries.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }

  const income = computeSimpleBookIncome({ paymentsIncomeRappen, entries })
  const incomeEntries = entries.filter(e => e.type === 'income')
  const expenses = entries.filter(e => e.type === 'expense')
  const missingReceipt = expenses.filter(e => !e.receipt_url && !e.storno_of_id)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount_rappen, 0)
  const result = income.totalIncomeRappen - totalExpenses

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })

  const GRAY = '#64748b'
  const DARK = '#1e293b'
  const GREEN = '#10b981'
  const RED = '#ef4444'
  const LIGHT = '#f8fafc'
  const BORDER = '#e2e8f0'

  const drawFooter = () => {
    doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica')
      .text(ACCOUNTING_PDF_DISCLAIMER, 50, 775, { align: 'center', width: 495 })
  }
  doc.on('pageAdded', drawFooter)

  doc.rect(0, 0, 595, 80).fill('#1e293b')
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text(`Jahresabschluss ${year}`, 50, 28)
  doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
    .text(tenantName, 50, 54)
  doc.fillColor('rgba(255,255,255,0.5)')
    .text(`Erstellt am ${new Date().toLocaleDateString('de-CH')}`, 400, 54, { align: 'right', width: 145 })

  let y = 105
  const kpis = [
    { label: 'Einnahmen', value: chf(income.totalIncomeRappen), color: GREEN },
    { label: 'Ausgaben', value: chf(totalExpenses), color: RED },
    { label: 'Ergebnis', value: chf(result), color: result >= 0 ? GREEN : RED },
  ]
  kpis.forEach((k, i) => {
    const x = 50 + i * 168
    doc.roundedRect(x, y, 155, 55, 6).fill(LIGHT).stroke(BORDER)
    doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(k.label.toUpperCase(), x + 12, y + 10)
    doc.fillColor(k.color).fontSize(16).font('Helvetica-Bold').text(k.value, x + 12, y + 26)
  })
  y += 75

  const drawSectionHeader = (title: string) => {
    if (y > 720) { doc.addPage(); y = 50 }
    doc.rect(50, y, 495, 24).fill('#1e293b')
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 62, y + 7)
    y += 30
  }

  const drawRow = (cols: string[], opts: { bold?: boolean; struck?: boolean } = {}) => {
    if (y > 750) { doc.addPage(); y = 50 }
    const widths = [90, 230, 110, 65]
    const xs = [50, 140, 370, 480]
    doc.fillColor(opts.struck ? '#94a3b8' : DARK).fontSize(8.5).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    cols.forEach((c, i) => {
      const align = i >= 2 ? 'right' : 'left'
      doc.text(c, xs[i] + (align === 'right' ? 0 : 4), y, { width: widths[i] - 8, align, strike: !!opts.struck })
    })
    y += 16
  }

  drawSectionHeader(`Einnahmen (${incomeEntries.length} Buchungen)`)
  drawRow(['Datum', 'Beschreibung', 'Kategorie', 'Betrag'], { bold: true })
  doc.rect(50, y - 2, 495, 1).fill(BORDER); y += 3
  for (const e of incomeEntries) {
    const cat = e.linked_payment_id ? (e.category?.name ?? 'Zahlung') : (e.category?.name ?? '—')
    drawRow([fmtDate(e.entry_date), e.description, cat, chf(e.amount_rappen)], { struck: !!e.storno_of_id })
  }
  doc.rect(50, y, 495, 1).fill(BORDER); y += 4
  drawRow(['', 'Total Einnahmen', '', chf(income.totalIncomeRappen)], { bold: true })
  y += 12

  drawSectionHeader(`Ausgaben (${expenses.length} Buchungen)`)
  drawRow(['Datum', 'Beschreibung', 'Kategorie', 'Betrag'], { bold: true })
  doc.rect(50, y - 2, 495, 1).fill(BORDER); y += 3
  for (const e of expenses) {
    drawRow([fmtDate(e.entry_date), e.description, e.category?.name ?? '—', chf(e.amount_rappen)], { struck: !!e.storno_of_id })
  }
  doc.rect(50, y, 495, 1).fill(BORDER); y += 4
  drawRow(['', 'Total Ausgaben', '', chf(totalExpenses)], { bold: true })
  y += 16

  if (missingReceipt.length > 0) {
    drawSectionHeader(`Buchungen ohne Beleg (${missingReceipt.length}) — steuerlich nicht gesichert`)
    drawRow(['Datum', 'Beschreibung', 'Kategorie', 'Betrag'], { bold: true })
    doc.rect(50, y - 2, 495, 1).fill(BORDER); y += 3
    for (const e of missingReceipt) {
      drawRow([fmtDate(e.entry_date), e.description, e.category?.name ?? '—', chf(e.amount_rappen)])
    }
    y += 12
  }

  if (y > 700) { doc.addPage(); y = 50 }
  doc.rect(50, y, 495, 48).fill(result >= 0 ? '#ecfdf5' : '#fef2f2')
    .roundedRect(50, y, 495, 48, 6).stroke(result >= 0 ? '#a7f3d0' : '#fecaca')
  doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('JAHRESERGEBNIS', 62, y + 8)
  doc.fillColor(result >= 0 ? '#059669' : '#dc2626').fontSize(22).font('Helvetica-Bold')
    .text(chf(result), 62, y + 20)
  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text(`${chf(income.totalIncomeRappen)} Einnahmen − ${chf(totalExpenses)} Ausgaben`, 300, y + 26, { align: 'right', width: 233 })

  drawFooter()
  doc.end()
  return pdfReady
}
