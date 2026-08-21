/** Swiss MWST helpers for quarterly ESTV-style reports (effective method). */

import { isPrivateExpenseCategory } from '~/server/utils/accounting'
import { computeVatAmountRappen } from '~/server/utils/invoice-vat'

export const CH_VAT_REGISTRATION_THRESHOLD_RAPPEN = 10_000_000

export const CH_VAT_KNOWN_RATES = [8.1, 2.6, 3.8] as const

export const VAT_PDF_DISCLAIMER =
  'Diese Übersicht ist eine Arbeitshilfe nach der effektiven Methode und ersetzt keine ESTV-Abrechnung und keine Steuerberatung. Bitte mit dem Treuhänder prüfen. Simy übernimmt keine Haftung für Abrechnungen gegenüber der ESTV.'

export type VatDeadlineStatus = 'ok' | 'soon' | 'due' | 'overdue' | 'not_liable'

export type VatLine = {
  rate: number
  net_rappen: number
  vat_rappen: number
  gross_rappen: number
}

export type VatQuarterInput = {
  invoices: Array<{
    invoice_date?: string | null
    status?: string | null
    vat_rate?: number | null
    vat_amount_rappen?: number | null
    subtotal_rappen?: number | null
    total_amount_rappen?: number | null
  }>
  incomeEntries: Array<{
    entry_date: string
    amount_rappen: number
    vat_rate?: number | null
    vat_amount_rappen?: number | null
    linked_payment_id?: string | null
    payment_has_invoice?: boolean
    storno_of_id?: string | null
    is_reversed?: boolean
  }>
  expenseEntries: Array<{
    entry_date: string
    amount_rappen: number
    vat_rate?: number | null
    vat_amount_rappen?: number | null
    receipt_url?: string | null
    category_name?: string | null
    storno_of_id?: string | null
    is_reversed?: boolean
  }>
  defaultVatRate: number
}

export type VatQuarterResult = {
  quarter: number
  year: number
  date_from: string
  date_to: string
  deadline: string
  days_until_deadline: number
  status: VatDeadlineStatus
  exempt_turnover_rappen: number
  taxable: VatLine[]
  output_vat_rappen: number
  input_vat_rappen: number
  input_vat_blocked_rappen: number
  payable_rappen: number
  total_turnover_rappen: number
}

export function vatQuarterRange(year: number, quarter: number): { from: string; to: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const from = `${year}-${String(startMonth).padStart(2, '0')}-01`
  const end = new Date(year, startMonth + 2, 0)
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
  return { from, to }
}

/** 60 days after quarter end (ESTV). */
export function vatDeadlineDate(year: number, quarter: number): Date {
  const { to } = vatQuarterRange(year, quarter)
  const end = new Date(`${to}T12:00:00`)
  const due = new Date(end)
  due.setDate(due.getDate() + 60)
  due.setHours(23, 59, 59, 0)
  return due
}

export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function vatDeadlineStatus(deadline: Date, obligated: boolean, now = new Date()): VatDeadlineStatus {
  if (!obligated) return 'not_liable'
  const ms = deadline.getTime() - now.getTime()
  const days = Math.ceil(ms / 86_400_000)
  if (days < 0) return 'overdue'
  if (days <= 7) return 'due'
  if (days <= 30) return 'soon'
  return 'ok'
}

export function normalizeVatRate(rate: number | null | undefined, fallback = 0): number {
  const n = Number(rate)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.round(n * 10) / 10
}

export function splitGross(grossRappen: number, rate: number): { net: number; vat: number } {
  if (rate <= 0 || grossRappen === 0) return { net: grossRappen, vat: 0 }
  const vat = Math.round(grossRappen * rate / (100 + rate))
  return { net: grossRappen - vat, vat }
}

function inRange(date: string | null | undefined, from: string, to: string): boolean {
  if (!date) return false
  const d = date.slice(0, 10)
  return d >= from && d <= to
}

function addLine(map: Map<number, VatLine>, rate: number, net: number, vat: number) {
  const key = normalizeVatRate(rate)
  const cur = map.get(key) ?? { rate: key, net_rappen: 0, vat_rappen: 0, gross_rappen: 0 }
  cur.net_rappen += net
  cur.vat_rappen += vat
  cur.gross_rappen += net + vat
  map.set(key, cur)
}

function invoiceClosed(status?: string | null): boolean {
  return ['draft', 'cancelled', 'canceled', 'void', 'storno'].includes((status ?? '').toLowerCase())
}

export function computeVatQuarter(
  year: number,
  quarter: number,
  input: VatQuarterInput,
  obligated: boolean,
  now = new Date(),
): VatQuarterResult {
  const { from, to } = vatQuarterRange(year, quarter)
  const deadline = vatDeadlineDate(year, quarter)
  const taxable = new Map<number, VatLine>()
  let exempt = 0
  let inputVat = 0
  let inputBlocked = 0
  const defaultRate = normalizeVatRate(input.defaultVatRate, 0)

  for (const inv of input.invoices) {
    if (!inRange(inv.invoice_date, from, to) || invoiceClosed(inv.status)) continue
    const rate = normalizeVatRate(inv.vat_rate, defaultRate)
    if (rate <= 0) {
      exempt += inv.total_amount_rappen ?? inv.subtotal_rappen ?? 0
      continue
    }
    const vat = inv.vat_amount_rappen != null && inv.vat_amount_rappen > 0
      ? inv.vat_amount_rappen
      : computeVatAmountRappen(inv.subtotal_rappen ?? 0, rate)
    const net = inv.subtotal_rappen ?? Math.max(0, (inv.total_amount_rappen ?? 0) - vat)
    addLine(taxable, rate, net, vat)
  }

  for (const e of input.incomeEntries) {
    if (!inRange(e.entry_date, from, to)) continue
    if (e.storno_of_id || e.is_reversed) continue
    if (e.linked_payment_id && e.payment_has_invoice) continue
    const rate = normalizeVatRate(e.vat_rate, defaultRate)
    if (rate <= 0) {
      exempt += e.amount_rappen
      continue
    }
    const split = e.vat_amount_rappen != null && e.vat_amount_rappen > 0
      ? { net: e.amount_rappen - e.vat_amount_rappen, vat: e.vat_amount_rappen }
      : splitGross(e.amount_rappen, rate)
    addLine(taxable, rate, split.net, split.vat)
  }

  for (const e of input.expenseEntries) {
    if (!inRange(e.entry_date, from, to)) continue
    if (e.storno_of_id || e.is_reversed) continue
    const rate = normalizeVatRate(e.vat_rate, 0)
    const vat = e.vat_amount_rappen != null && e.vat_amount_rappen > 0
      ? e.vat_amount_rappen
      : (rate > 0 ? splitGross(e.amount_rappen, rate).vat : 0)
    if (vat <= 0) continue
    if (!e.receipt_url || isPrivateExpenseCategory(e.category_name)) {
      inputBlocked += vat
      continue
    }
    inputVat += vat
  }

  const taxableLines = [...taxable.values()].filter(l => l.rate > 0).sort((a, b) => b.rate - a.rate)
  const output = taxableLines.reduce((s, l) => s + l.vat_rappen, 0)
  const taxableGross = taxableLines.reduce((s, l) => s + l.gross_rappen, 0)
  const yearLiable = obligated

  return {
    quarter,
    year,
    date_from: from,
    date_to: to,
    deadline: formatIsoDate(deadline),
    days_until_deadline: Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000),
    status: vatDeadlineStatus(deadline, yearLiable, now),
    exempt_turnover_rappen: exempt,
    taxable: taxableLines,
    output_vat_rappen: output,
    input_vat_rappen: inputVat,
    input_vat_blocked_rappen: inputBlocked,
    payable_rappen: output - inputVat,
    total_turnover_rappen: exempt + taxableGross,
  }
}

export function currentVatQuarter(now = new Date()): { year: number; quarter: number } {
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 }
}

/** Quarter that is typically being filed (previous quarter until its ESTV deadline). */
export function filingVatQuarter(now = new Date()): { year: number; quarter: number } {
  const cur = currentVatQuarter(now)
  const prevQuarter = cur.quarter === 1 ? 4 : cur.quarter - 1
  const prevYear = cur.quarter === 1 ? cur.year - 1 : cur.year
  const prevDeadline = vatDeadlineDate(prevYear, prevQuarter)
  if (now.getTime() <= prevDeadline.getTime()) return { year: prevYear, quarter: prevQuarter }
  return cur
}

export function vatStatusLabel(status: VatDeadlineStatus): string {
  switch (status) {
    case 'ok': return 'Frist ok'
    case 'soon': return 'Frist in 30 Tagen'
    case 'due': return 'Frist diese Woche'
    case 'overdue': return 'Überfällig'
    case 'not_liable': return 'Nicht MWST-pflichtig'
  }
}

export function computeVatYear(
  year: number,
  input: VatQuarterInput,
  obligated: boolean,
  now = new Date(),
) {
  const quarters = [1, 2, 3, 4].map(q => computeVatQuarter(year, q, input, obligated, now))
  const yearTurnover = quarters.reduce((s, q) => s + q.total_turnover_rappen, 0)
  return {
    year,
    obligated,
    year_turnover_rappen: yearTurnover,
    year_exempt_rappen: quarters.reduce((s, q) => s + q.exempt_turnover_rappen, 0),
    year_output_vat_rappen: quarters.reduce((s, q) => s + q.output_vat_rappen, 0),
    year_input_vat_rappen: quarters.reduce((s, q) => s + q.input_vat_rappen, 0),
    year_input_vat_blocked_rappen: quarters.reduce((s, q) => s + q.input_vat_blocked_rappen, 0),
    year_payable_rappen: quarters.reduce((s, q) => s + q.payable_rappen, 0),
    threshold_rappen: CH_VAT_REGISTRATION_THRESHOLD_RAPPEN,
    threshold_reached: yearTurnover >= CH_VAT_REGISTRATION_THRESHOLD_RAPPEN,
    threshold_ratio: yearTurnover / CH_VAT_REGISTRATION_THRESHOLD_RAPPEN,
    filing: filingVatQuarter(now),
    quarters,
  }
}
