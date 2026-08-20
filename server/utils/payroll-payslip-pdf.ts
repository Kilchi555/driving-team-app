import PDFDocument from 'pdfkit'
import {
  PAYSLIP_DISCLAIMER,
  employeeDeductionRappen,
  employerContributionRappen,
  employerCostRappen,
  formatAhvNumber,
  payoutRappen,
  payrollMonthLabel,
  type PayrollRunSnapshot,
} from '~/server/utils/payroll'

export type PayslipEmployee = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  ahv_number?: string | null
  iban?: string | null
  employment_type?: string | null
}

export type PayslipTenant = {
  name?: string | null
  legal_company_name?: string | null
  uid_number?: string | null
  invoice_street?: string | null
  invoice_street_nr?: string | null
  invoice_zip?: string | null
  invoice_city?: string | null
}

export type PayslipRun = PayrollRunSnapshot & {
  year: number
  month: number
  hours_worked?: number | null
  vacation_hours?: number | null
  status?: string | null
  paid_at?: string | null
}

function chf(rappen: number): string {
  const sign = rappen < 0 ? '-' : ''
  return `${sign}CHF ${Math.abs(rappen / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function street(tenant: PayslipTenant): string {
  return [tenant.invoice_street, tenant.invoice_street_nr].filter(Boolean).join(' ').trim()
}

function cityLine(tenant: PayslipTenant): string {
  return [tenant.invoice_zip, tenant.invoice_city].filter(Boolean).join(' ').trim()
}

function drawPayslipPage(doc: InstanceType<typeof PDFDocument>, params: {
  tenant: PayslipTenant
  employee: PayslipEmployee
  run: PayslipRun
}) {
  const { tenant, employee, run } = params
  const monthLabel = payrollMonthLabel(run.year, run.month)
  const employer = tenant.legal_company_name || tenant.name || 'Arbeitgeber'
  const employeeName = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || 'Mitarbeiter'
  const draft = (run.status ?? 'draft') !== 'paid'
  const GRAY = '#64748b'
  const DARK = '#1e293b'
  const BORDER = '#e2e8f0'

  doc.rect(0, 0, 595, 80).fill('#1e293b')
  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
    .text('Lohnabrechnung', 50, 24)
  doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
    .text(monthLabel, 50, 52)
  doc.fillColor('rgba(255,255,255,0.5)')
    .text(draft ? 'ENTWURF' : 'Bezahlt', 360, 52, { align: 'right', width: 185 })

  if (draft) {
    doc.save()
    doc.fillColor('#ef4444').opacity(0.08).fontSize(72).font('Helvetica-Bold')
    doc.rotate(-24, { origin: [300, 420] })
    doc.text('ENTWURF', 80, 380, { width: 500, align: 'center' })
    doc.restore()
  }

  let y = 100
  doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text('Arbeitgeber', 50, y)
  doc.font('Helvetica-Bold').fontSize(9).text('Mitarbeiter', 320, y)
  y += 14
  doc.font('Helvetica').fontSize(9).fillColor(DARK).text(employer, 50, y, { width: 250 })
  doc.text(employeeName, 320, y, { width: 225 })
  y += 13
  const addr = [street(tenant), cityLine(tenant)].filter(Boolean)
  if (addr.length) {
    doc.fillColor(GRAY).text(addr.join(', '), 50, y, { width: 250 })
  }
  if (employee.email) doc.fillColor(GRAY).text(employee.email, 320, y, { width: 225 })
  y += 13
  if (tenant.uid_number) doc.fillColor(GRAY).text(`UID ${tenant.uid_number}`, 50, y, { width: 250 })
  doc.fillColor(GRAY).text(`AHV-Nr. ${formatAhvNumber(employee.ahv_number)}`, 320, y, { width: 225 })
  y += 13
  if (employee.iban) doc.fillColor(GRAY).text(`IBAN ${employee.iban}`, 320, y, { width: 225 })
  if (run.hours_worked != null || run.vacation_hours != null) {
    const parts = [
      run.hours_worked != null ? `Stunden ${run.hours_worked}` : null,
      run.vacation_hours != null && run.vacation_hours > 0 ? `Ferien ${run.vacation_hours} h` : null,
    ].filter(Boolean)
    doc.fillColor(GRAY).text(parts.join(' · '), 50, y, { width: 250 })
  }
  y += 22

  const row = (label: string, value: string, opts: { bold?: boolean; color?: string; indent?: boolean } = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5)
      .fillColor(opts.color ?? DARK)
      .text(label, 62 + (opts.indent ? 12 : 0), y, { width: 300 })
    doc.text(value, 370, y, { width: 155, align: 'right' })
    y += 16
  }

  doc.rect(50, y, 495, 24).fill('#1e293b')
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('Lohn und Abzüge Mitarbeiter', 62, y + 7)
  y += 32
  row('Bruttolohn', chf(run.gross_rappen ?? 0), { bold: true })
  row('AHV / IV / EO', `− ${chf(run.ahv_employee_rappen ?? 0)}`, { indent: true, color: '#b91c1c' })
  row('ALV', `− ${chf(run.alv_employee_rappen ?? 0)}`, { indent: true, color: '#b91c1c' })
  row('NBU', `− ${chf(run.nbu_employee_rappen ?? 0)}`, { indent: true, color: '#b91c1c' })
  row('BVG', `− ${chf(run.bvg_employee_rappen ?? 0)}`, { indent: true, color: '#b91c1c' })
  doc.rect(50, y, 495, 1).fill(BORDER); y += 6
  row('Abzüge total', `− ${chf(employeeDeductionRappen(run))}`, { color: '#b91c1c' })
  row('Nettolohn', chf(run.net_rappen ?? 0), { bold: true })
  if ((run.monthly_spesen_rappen ?? 0) > 0) {
    row('Spesen (nicht AHV-pflichtig)', `+ ${chf(run.monthly_spesen_rappen ?? 0)}`, { indent: true, color: '#0369a1' })
  }
  if ((run.child_allowance_rappen ?? 0) > 0) {
    row('Kinderzulage', `+ ${chf(run.child_allowance_rappen ?? 0)}`, { indent: true, color: '#0369a1' })
  }
  y += 4
  doc.roundedRect(50, y, 495, 44, 6).fill('#ecfdf5').stroke('#a7f3d0')
  doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('AUSZAHLUNG', 62, y + 8)
  doc.fillColor('#047857').fontSize(16).font('Helvetica-Bold').text(chf(payoutRappen(run)), 62, y + 20)
  y += 60

  doc.rect(50, y, 495, 24).fill('#1e293b')
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('Arbeitgeberbeiträge (zusätzlich, nicht vom Lohn abgezogen)', 62, y + 7)
  y += 32
  row('AHV / IV / EO Firma', chf(run.ahv_employer_rappen ?? 0), { indent: true })
  row('ALV Firma', chf(run.alv_employer_rappen ?? 0), { indent: true })
  row('BU Firma', chf(run.bu_employer_rappen ?? 0), { indent: true })
  row('BVG Firma', chf(run.bvg_employer_rappen ?? 0), { indent: true })
  doc.rect(50, y, 495, 1).fill(BORDER); y += 6
  row('Beiträge Firma', chf(employerContributionRappen(run)))
  row('Gesamtkosten Firma', chf(employerCostRappen(run)), { bold: true })
  y += 20

  if (run.paid_at) {
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
      .text(`Als bezahlt markiert am ${new Date(run.paid_at).toLocaleDateString('de-CH')}`, 50, y)
    y += 16
  }

  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
    .text(PAYSLIP_DISCLAIMER, 50, Math.max(y, 740), { width: 495, align: 'center' })
}

export function buildPayslipPdf(params: {
  tenant: PayslipTenant
  employee: PayslipEmployee
  run: PayslipRun
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })
  drawPayslipPage(doc, params)
  doc.end()
  return pdfReady
}

export function buildMonthPayslipsPdf(params: {
  tenant: PayslipTenant
  slips: Array<{ employee: PayslipEmployee; run: PayslipRun }>
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)))
  })
  params.slips.forEach((slip, i) => {
    if (i > 0) doc.addPage()
    drawPayslipPage(doc, { tenant: params.tenant, employee: slip.employee, run: slip.run })
  })
  doc.end()
  return pdfReady
}
