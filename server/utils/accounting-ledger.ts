import { isAccountingPlEntry } from '~/server/utils/accounting'

export type LedgerAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export type LedgerAccountSeed = {
  number: string
  name: string
  type: LedgerAccountType
  is_system?: boolean
}

export type LedgerLineDraft = {
  account_number: string
  debit_rappen: number
  credit_rappen: number
}

export type LedgerEntryInput = {
  type: 'income' | 'expense' | string
  amount_rappen: number
  document_kind?: string | null
  is_paid?: boolean | null
  linked_payment_id?: string | null
  vat_amount_rappen?: number | null
  vat_rate?: number | null
  category_name?: string | null
  category_account_number?: string | null
  payment_account_number?: string | null
  storno_of_id?: string | null
}

/** Schweizer KMU-Rahmen (Käfer-Klassen), Fahrschul-relevante Konten. Anpassbar pro Mandant. */
export const KMU_DEFAULT_ACCOUNTS: LedgerAccountSeed[] = [
  { number: '1000', name: 'Kasse', type: 'asset', is_system: true },
  { number: '1020', name: 'Bank', type: 'asset', is_system: true },
  { number: '1100', name: 'Debitoren', type: 'asset', is_system: true },
  { number: '1170', name: 'Vorsteuer MWST', type: 'asset', is_system: true },
  { number: '1500', name: 'Fahrzeuge / Sachanlagen', type: 'asset' },
  { number: '2000', name: 'Kreditoren', type: 'liability', is_system: true },
  { number: '2200', name: 'Geschuldete MWST', type: 'liability', is_system: true },
  { number: '2270', name: 'Sozialversicherungen', type: 'liability' },
  { number: '2800', name: 'Eigenkapital', type: 'equity', is_system: true },
  { number: '3000', name: 'Fahrstunden / Termine', type: 'income' },
  { number: '3010', name: 'Kurse', type: 'income' },
  { number: '3200', name: 'Produkte & Materialien', type: 'income' },
  { number: '3900', name: 'Übriger Ertrag', type: 'income' },
  { number: '5000', name: 'Löhne', type: 'expense' },
  { number: '5700', name: 'Sozialversicherungsaufwand', type: 'expense' },
  { number: '6000', name: 'Raumaufwand', type: 'expense' },
  { number: '6200', name: 'Fahrzeugaufwand', type: 'expense' },
  { number: '6300', name: 'Versicherungen', type: 'expense' },
  { number: '6400', name: 'Werbeaufwand', type: 'expense' },
  { number: '6500', name: 'Verwaltungsaufwand', type: 'expense' },
  { number: '6570', name: 'Informatik', type: 'expense' },
  { number: '6600', name: 'Aus- und Weiterbildung', type: 'expense' },
  { number: '6800', name: 'Steuern und Abgaben', type: 'expense' },
  { number: '6850', name: 'Eigenverbrauch / Privat', type: 'expense' },
  { number: '6900', name: 'Übriger Betriebsaufwand', type: 'expense' },
  { number: '6910', name: 'Kassendifferenz', type: 'expense' },
  { number: '9000', name: 'Eröffnungsbilanz', type: 'equity', is_system: true },
]

export const SYSTEM_ACCOUNT_NUMBERS = new Set(
  KMU_DEFAULT_ACCOUNTS.filter(a => a.is_system).map(a => a.number),
)

export const CATEGORY_TO_ACCOUNT: Record<string, string> = {
  'Termine': '3000',
  'Kurse': '3010',
  'Produkte & Materialien': '3200',
  'Sonstige Einnahmen': '3900',
  'Lohnaufwand': '5000',
  'Fahrzeugkosten': '6200',
  'Miete & Raumkosten': '6000',
  'Versicherungen': '6300',
  'Marketing & Werbung': '6400',
  'Büro & Verwaltung': '6500',
  'IT & Software': '6570',
  'Aus- & Weiterbildung': '6600',
  'Steuern & Abgaben': '6800',
  'Eigenverbrauch / Privat': '6850',
  'Kassendifferenz': '6910',
  'Sonstige Ausgaben': '6900',
}

export function accountClassFromNumber(number: string): number {
  const n = Number.parseInt(String(number).replace(/\D/g, '').slice(0, 1) || '0', 10)
  return n >= 1 && n <= 9 ? n : 9
}

export function defaultAccountForCategory(name?: string | null, type?: string | null): string {
  if (name && CATEGORY_TO_ACCOUNT[name]) return CATEGORY_TO_ACCOUNT[name]
  return type === 'income' ? '3900' : '6900'
}

export function ledgerLinesBalanced(lines: LedgerLineDraft[]): boolean {
  const debit = lines.reduce((s, l) => s + (l.debit_rappen || 0), 0)
  const credit = lines.reduce((s, l) => s + (l.credit_rappen || 0), 0)
  return debit === credit && debit >= 0
}

export function reverseLedgerLines(lines: LedgerLineDraft[]): LedgerLineDraft[] {
  return lines.map(l => ({
    account_number: l.account_number,
    debit_rappen: l.credit_rappen,
    credit_rappen: l.debit_rappen,
  }))
}

function splitVat(gross: number, vatAmount: number | null | undefined, vatRate: number | null | undefined) {
  let vat = Math.max(0, Math.round(vatAmount ?? 0))
  if (!vat && vatRate && vatRate > 0 && gross > 0) {
    vat = Math.round(gross - gross / (1 + vatRate / 100))
  }
  if (vat > gross) vat = 0
  return { net: gross - vat, vat }
}

function line(account_number: string, debit_rappen: number, credit_rappen: number): LedgerLineDraft {
  return { account_number, debit_rappen, credit_rappen }
}

/**
 * Baut Soll/Haben aus dem aktuellen Buchungskopf.
 * Bezahlte Kreditoren gehen direkt an Bank/Kasse (kein zweistufiges AP-Clearing in v1).
 */
export function proposeLedgerLines(entry: LedgerEntryInput): LedgerLineDraft[] {
  if (entry.storno_of_id) return []
  if (!isAccountingPlEntry(entry)) return []
  const gross = Math.round(entry.amount_rappen ?? 0)
  if (gross <= 0) return []

  const { net, vat } = splitVat(gross, entry.vat_amount_rappen, entry.vat_rate)
  const pl = entry.category_account_number
    || defaultAccountForCategory(entry.category_name, entry.type)
  const payment = entry.payment_account_number || '1020'
  const settled = entry.is_paid === true || !!entry.linked_payment_id

  if (entry.type === 'expense') {
    const lines = [line(pl, net, 0)]
    if (vat > 0) lines.push(line('1170', vat, 0))
    lines.push(line(settled ? payment : '2000', 0, gross))
    return lines.filter(l => l.debit_rappen > 0 || l.credit_rappen > 0)
  }

  if (entry.type === 'income') {
    const lines = [line(settled ? payment : '1100', gross, 0)]
    lines.push(line(pl, 0, net))
    if (vat > 0) lines.push(line('2200', 0, vat))
    return lines.filter(l => l.debit_rappen > 0 || l.credit_rappen > 0)
  }

  return []
}

export function resolveLineAccountIds(
  lines: LedgerLineDraft[],
  accountsByNumber: Map<string, { id: string }>,
): Array<{ account_id: string; debit_rappen: number; credit_rappen: number }> {
  return lines.map((l) => {
    const acc = accountsByNumber.get(l.account_number)
    if (!acc) throw new Error(`Konto ${l.account_number} fehlt im Kontenplan`)
    return { account_id: acc.id, debit_rappen: l.debit_rappen, credit_rappen: l.credit_rappen }
  })
}

export type TrialBalanceRow = {
  account_id: string
  number: string
  name: string
  type: LedgerAccountType
  class: number
  debit_rappen: number
  credit_rappen: number
  balance_rappen: number
}

export function accountBalanceRappen(type: LedgerAccountType, debit: number, credit: number): number {
  if (type === 'asset' || type === 'expense') return debit - credit
  return credit - debit
}

export function buildTrialBalance(
  accounts: Array<{ id: string; number: string; name: string; type: LedgerAccountType; class: number }>,
  lines: Array<{ account_id: string; debit_rappen: number; credit_rappen: number }>,
): TrialBalanceRow[] {
  const byId = new Map<string, { debit: number; credit: number }>()
  for (const row of lines) {
    const cur = byId.get(row.account_id) ?? { debit: 0, credit: 0 }
    cur.debit += row.debit_rappen
    cur.credit += row.credit_rappen
    byId.set(row.account_id, cur)
  }
  return accounts
    .map((a) => {
      const sums = byId.get(a.id) ?? { debit: 0, credit: 0 }
      return {
        account_id: a.id,
        number: a.number,
        name: a.name,
        type: a.type,
        class: a.class,
        debit_rappen: sums.debit,
        credit_rappen: sums.credit,
        balance_rappen: accountBalanceRappen(a.type, sums.debit, sums.credit),
      }
    })
    .filter(r => r.debit_rappen !== 0 || r.credit_rappen !== 0 || SYSTEM_ACCOUNT_NUMBERS.has(r.number))
    .sort((a, b) => a.number.localeCompare(b.number, 'de'))
}

export function statementsFromTrial(rows: TrialBalanceRow[]) {
  const assets = rows.filter(r => r.type === 'asset').reduce((s, r) => s + r.balance_rappen, 0)
  const liabilities = rows.filter(r => r.type === 'liability').reduce((s, r) => s + r.balance_rappen, 0)
  const equity = rows.filter(r => r.type === 'equity').reduce((s, r) => s + r.balance_rappen, 0)
  const income = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.balance_rappen, 0)
  const expense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.balance_rappen, 0)
  return {
    assets_rappen: assets,
    liabilities_rappen: liabilities,
    equity_rappen: equity,
    income_rappen: income,
    expense_rappen: expense,
    result_rappen: income - expense,
    balanced: assets === liabilities + equity + (income - expense),
  }
}
