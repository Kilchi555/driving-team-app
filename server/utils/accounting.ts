export const ACCOUNTING_MATERIAL_FIELDS = [
  'amount_rappen',
  'entry_date',
  'description',
  'category_id',
  'vat_rate',
  'vat_amount_rappen',
  'document_kind',
] as const

export const ACCOUNTING_OPERATIONAL_FIELDS = [
  'receipt_url',
  'receipt_filename',
  'creditor_name',
  'creditor_iban',
  'payment_reference',
  'is_paid',
  'paid_date',
  'external_reference',
  'qr_data',
  'notes',
] as const

export const ACCOUNTING_GRACE_MS = 24 * 60 * 60 * 1000

export const PRIVATE_EXPENSE_CATEGORY_NAME = 'Eigenverbrauch / Privat'
export const CASH_DIFF_CATEGORY_NAME = 'Kassendifferenz'
export const LOHN_CATEGORY_NAME = 'Lohnaufwand'

export const DEFAULT_ACCOUNTING_CATEGORIES = [
  { name: 'Termine', type: 'income' as const, color: '#10b981' },
  { name: 'Kurse', type: 'income' as const, color: '#059669' },
  { name: 'Produkte & Materialien', type: 'income' as const, color: '#34d399' },
  { name: 'Sonstige Einnahmen', type: 'income' as const, color: '#6ee7b7' },
  { name: 'Lohnaufwand', type: 'expense' as const, color: '#ef4444' },
  { name: 'Fahrzeugkosten', type: 'expense' as const, color: '#f97316' },
  { name: 'Miete & Raumkosten', type: 'expense' as const, color: '#f59e0b' },
  { name: 'Versicherungen', type: 'expense' as const, color: '#eab308' },
  { name: 'Marketing & Werbung', type: 'expense' as const, color: '#84cc16' },
  { name: 'Büro & Verwaltung', type: 'expense' as const, color: '#06b6d4' },
  { name: 'IT & Software', type: 'expense' as const, color: '#6366f1' },
  { name: 'Aus- & Weiterbildung', type: 'expense' as const, color: '#8b5cf6' },
  { name: 'Steuern & Abgaben', type: 'expense' as const, color: '#ec4899' },
  { name: PRIVATE_EXPENSE_CATEGORY_NAME, type: 'expense' as const, color: '#ea580c' },
  { name: CASH_DIFF_CATEGORY_NAME, type: 'expense' as const, color: '#a8a29e' },
  { name: 'Sonstige Ausgaben', type: 'expense' as const, color: '#94a3b8' },
] as const

export const ACCOUNTING_DOCUMENT_KINDS = [
  { value: 'expense', label: 'Ausgabe', type: 'expense' as const },
  { value: 'spesen', label: 'Spesen', type: 'expense' as const },
  { value: 'creditor', label: 'Kreditor', type: 'expense' as const },
  { value: 'debtor', label: 'Debitor', type: 'income' as const },
  { value: 'contract', label: 'Vertrag', type: 'expense' as const },
] as const

export type AccountingDocumentKind = typeof ACCOUNTING_DOCUMENT_KINDS[number]['value']

export function isAccountingDocumentKind(value: unknown): value is AccountingDocumentKind {
  return typeof value === 'string' && ACCOUNTING_DOCUMENT_KINDS.some(k => k.value === value)
}

export function documentKindToEntryType(kind: AccountingDocumentKind): 'income' | 'expense' {
  return ACCOUNTING_DOCUMENT_KINDS.find(k => k.value === kind)?.type ?? 'expense'
}

export function documentKindLabel(kind?: string | null): string {
  return ACCOUNTING_DOCUMENT_KINDS.find(k => k.value === kind)?.label ?? 'Ausgabe'
}

/** Verträge sind Ablage und gehören nicht in Einnahmen/Ausgaben/MWST. */
export function isAccountingPlEntry(entry: { document_kind?: string | null; external_reference?: string | null }): boolean {
  if (entry.document_kind === 'contract') return false
  if (entry.external_reference === 'opening-bank') return false
  return true
}

export function inferDocumentKind(entry: {
  document_kind?: string | null
  type?: string | null
  submitted_by_user_id?: string | null
}): AccountingDocumentKind {
  if (isAccountingDocumentKind(entry.document_kind)) return entry.document_kind
  if (entry.submitted_by_user_id) return 'spesen'
  return entry.type === 'income' ? 'debtor' : 'expense'
}

/** Ausgaben, Spesen und Kreditoren brauchen einen Originalbeleg (OR 957a). */
export function requiresAccountingReceipt(entry: {
  type?: string | null
  document_kind?: string | null
  storno_of_id?: string | null
  linked_payment_id?: string | null
  category?: { name?: string | null } | null
  category_name?: string | null
}): boolean {
  if (entry.storno_of_id || entry.linked_payment_id) return false
  const kind = inferDocumentKind(entry)
  if (kind === 'contract' || kind === 'debtor') return false
  if ((entry.type ?? documentKindToEntryType(kind)) !== 'expense') return false
  const name = (entry.category?.name ?? entry.category_name ?? '').trim()
  if (name === LOHN_CATEGORY_NAME || name === CASH_DIFF_CATEGORY_NAME) return false
  return true
}

export const ACCOUNTING_PDF_DISCLAIMER =
  'Dieser Bericht ersetzt keinen beglaubigten Jahresabschluss. Simy Buchhaltung ist ein digitales Hilfsmittel und ersetzt keine Steuer- oder Rechtsberatung. Die Verantwortung für Buchführung und Steuererklärungen liegt beim Unternehmen. Belege 10 Jahre aufbewahren (OR Art. 958f).'

export function isPrivateExpenseCategory(name?: string | null): boolean {
  return (name ?? '').trim() === PRIVATE_EXPENSE_CATEGORY_NAME
}

export function isWithinAccountingGrace(createdAt?: string | null, now = Date.now()): boolean {
  if (!createdAt) return false
  const ts = new Date(createdAt).getTime()
  if (Number.isNaN(ts)) return false
  return now - ts < ACCOUNTING_GRACE_MS
}

export function canEditAccountingMaterial(entry: {
  locked_at?: string | null
  linked_payment_id?: string | null
  storno_of_id?: string | null
  created_at?: string | null
}, now = Date.now()): boolean {
  if (entry.locked_at || entry.linked_payment_id || entry.storno_of_id) return false
  return isWithinAccountingGrace(entry.created_at, now)
}

export function canSoftDeleteAccountingEntry(entry: {
  locked_at?: string | null
  linked_payment_id?: string | null
  storno_of_id?: string | null
  created_at?: string | null
}, now = Date.now()): boolean {
  return canEditAccountingMaterial(entry, now)
}

export function valuesDiffer(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return false
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)
  }
  return String(a) !== String(b)
}

export function changedMaterialFields(
  existing: Record<string, unknown>,
  updates: Record<string, unknown>,
): string[] {
  return ACCOUNTING_MATERIAL_FIELDS.filter(field => (
    field in updates && valuesDiffer(existing[field], updates[field])
  ))
}

export function computeSimpleBookIncome(params: {
  paymentsIncomeRappen: number
  entries: Array<{
    type: string
    amount_rappen: number
    linked_payment_id?: string | null
    document_kind?: string | null
  }>
}): { paymentsIncomeRappen: number; manualIncomeRappen: number; totalIncomeRappen: number } {
  const manualIncomeRappen = params.entries
    .filter(e => e.type === 'income' && !e.linked_payment_id && isAccountingPlEntry(e))
    .reduce((sum, e) => sum + (e.amount_rappen ?? 0), 0)
  return {
    paymentsIncomeRappen: params.paymentsIncomeRappen,
    manualIncomeRappen,
    totalIncomeRappen: params.paymentsIncomeRappen + manualIncomeRappen,
  }
}

export function invoiceOutstandingRappen(inv: {
  total_amount_rappen?: number | null
  paid_amount_rappen?: number | null
  payment_status?: string | null
  status?: string | null
  document_kind?: string | null
}): number {
  if (inv.document_kind === 'quote') return 0
  const status = (inv.status ?? '').toLowerCase()
  const pay = (inv.payment_status ?? '').toLowerCase()
  if (['draft', 'cancelled', 'canceled', 'void', 'storno'].includes(status)) return 0
  if (pay === 'paid') return 0
  return Math.max(0, (inv.total_amount_rappen ?? 0) - (inv.paid_amount_rappen ?? 0))
}

export function computeNetAssets(parts: {
  cashRappen: number
  bankRappen: number
  receivablesRappen: number
  payablesRappen: number
}): number {
  return parts.cashRappen + parts.bankRappen + parts.receivablesRappen - parts.payablesRappen
}

export function cashDifferenceRappen(countedRappen: number, bookRappen: number): number {
  return countedRappen - bookRappen
}