import { defineEventHandler, getQuery, createError, setResponseHeader } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import PDFDocument from 'pdfkit'

function chf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('de-CH') } catch { return d }
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()

  // Mandanteninfo
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', profile.tenant_id)
    .single()

  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  // Einnahmen aus payments
  const { data: payments } = await supabase
    .from('payments')
    .select('total_amount_rappen, created_at, description')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00Z`)
    .lte('created_at', `${dateTo}T23:59:59Z`)
    .order('created_at')

  // Manuelle Buchungen
  const { data: entries } = await supabase
    .from('accounting_entries')
    .select(`*, category:accounting_categories(name)`)
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .gte('entry_date', dateFrom)
    .lte('entry_date', dateTo)
    .order('entry_date')

  const totalIncomePayments = (payments ?? []).reduce((s, p) => s + (p.total_amount_rappen ?? 0), 0)
  const manualIncome = (entries ?? []).filter(e => e.type === 'income')
  const expenses = (entries ?? []).filter(e => e.type === 'expense')
  const totalManualIncome = manualIncome.reduce((s, e) => s + e.amount_rappen, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount_rappen, 0)
  const totalIncome = totalIncomePayments + totalManualIncome
  const result = totalIncome - totalExpenses

  // PDF generieren
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

  // Header
  doc.rect(0, 0, 595, 80).fill('#1e293b')
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text(`Jahresabschluss ${year}`, 50, 28)
  doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
    .text(tenant?.name ?? '', 50, 54)
  doc.fillColor('rgba(255,255,255,0.5)')
    .text(`Erstellt am ${new Date().toLocaleDateString('de-CH')}`, 400, 54, { align: 'right', width: 145 })

  let y = 105

  // KPI Boxen
  const kpis = [
    { label: 'Einnahmen', value: chf(totalIncome), color: GREEN },
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
    doc.rect(50, y, 495, 24).fill('#1e293b')
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text(title, 62, y + 7)
    y += 30
  }

  const drawRow = (cols: string[], highlight = false, bold = false) => {
    if (highlight) doc.rect(50, y - 2, 495, 18).fill(LIGHT)
    const widths = [90, 230, 110, 65]
    const xs = [50, 140, 370, 480]
    doc.fillColor(DARK).fontSize(8.5).font(bold ? 'Helvetica-Bold' : 'Helvetica')
    cols.forEach((c, i) => {
      const align = i >= 2 ? 'right' : 'left'
      doc.text(c, xs[i] + (align === 'right' ? 0 : 4), y, { width: widths[i] - 8, align })
    })
    y += 16
    if (y > 740) { doc.addPage(); y = 50 }
  }

  // ─── Einnahmen (Zahlungen aus System) ──────────────────────────────────────
  drawSectionHeader(`Einnahmen aus Fahrstunden & Kursen (${(payments ?? []).length} Zahlungen)`)
  drawRow(['Datum', 'Beschreibung', 'Kategorie', 'Betrag'], false, true)
  doc.rect(50, y - 2, 495, 1).fill(BORDER); y += 3

  let runningIncome = 0
  for (const p of (payments ?? [])) {
    const d = new Date(p.created_at).toLocaleDateString('de-CH')
    const amt = p.total_amount_rappen ?? 0
    runningIncome += amt
    drawRow([d, p.description ?? '—', 'Fahrstunden', chf(amt)])
  }

  for (const e of manualIncome) {
    runningIncome += e.amount_rappen
    drawRow([fmtDate(e.entry_date), e.description, e.category?.name ?? '—', chf(e.amount_rappen)])
  }

  doc.rect(50, y, 495, 1).fill(BORDER); y += 4
  drawRow(['', 'Total Einnahmen', '', chf(totalIncome)], false, true)
  y += 12

  // ─── Ausgaben ──────────────────────────────────────────────────────────────
  if (y > 680) { doc.addPage(); y = 50 }
  drawSectionHeader(`Ausgaben (${expenses.length} Buchungen)`)
  drawRow(['Datum', 'Beschreibung', 'Kategorie', 'Betrag'], false, true)
  doc.rect(50, y - 2, 495, 1).fill(BORDER); y += 3

  for (const e of expenses) {
    drawRow([fmtDate(e.entry_date), e.description, e.category?.name ?? '—', chf(e.amount_rappen)])
  }

  doc.rect(50, y, 495, 1).fill(BORDER); y += 4
  drawRow(['', 'Total Ausgaben', '', chf(totalExpenses)], false, true)
  y += 16

  // ─── Ergebnis ──────────────────────────────────────────────────────────────
  if (y > 700) { doc.addPage(); y = 50 }
  doc.rect(50, y, 495, 48).fill(result >= 0 ? '#ecfdf5' : '#fef2f2')
    .roundedRect(50, y, 495, 48, 6).stroke(result >= 0 ? '#a7f3d0' : '#fecaca')
  doc.fillColor(GRAY).fontSize(9).font('Helvetica').text('JAHRESERGEBNIS', 62, y + 8)
  doc.fillColor(result >= 0 ? '#059669' : '#dc2626').fontSize(22).font('Helvetica-Bold')
    .text(chf(result), 62, y + 20)
  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text(`${chf(totalIncome)} Einnahmen − ${chf(totalExpenses)} Ausgaben`, 300, y + 26, { align: 'right', width: 233 })
  y += 65

  // Footer
  doc.fillColor(BORDER).fontSize(7).font('Helvetica')
    .text(`Buchhaltungsbericht ${year} · Erstellt mit Simy · ${new Date().toLocaleDateString('de-CH')}`, 50, 790, { align: 'center', width: 495 })

  doc.end()

  const pdfBuffer = await pdfReady

  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="jahresabschluss_${year}.pdf"`)
  setResponseHeader(event, 'Content-Length', pdfBuffer.length.toString())

  return pdfBuffer
})
