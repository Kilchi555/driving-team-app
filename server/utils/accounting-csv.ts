import {
  inferDocumentKind,
  isAccountingDocumentKind,
  type AccountingDocumentKind,
} from '~/server/utils/accounting'

export const BOOKING_CSV_HEADERS = [
  'datum',
  'typ',
  'beleg_art',
  'betrag_chf',
  'beschreibung',
  'kategorie',
  'konto',
  'mwst_satz',
  'mwst_chf',
  'bezahlt',
  'lieferant',
  'iban',
  'referenz',
  'notiz',
] as const

export type BookingCsvRow = {
  entry_date: string
  type: 'income' | 'expense'
  document_kind: AccountingDocumentKind
  amount_rappen: number
  description: string
  category_name: string | null
  account_number: string | null
  vat_rate: number | null
  vat_amount_rappen: number | null
  is_paid: boolean
  creditor_name: string | null
  creditor_iban: string | null
  payment_reference: string | null
  notes: string | null
}

export function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (/[";,\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function csvRow(cols: unknown[]): string {
  return cols.map(csvEscape).join(';')
}

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const delimiter = src.includes(';') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; continue }
      if (ch === '"') { inQuotes = false; continue }
      cell += ch
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === delimiter) {
      row.push(cell.trim())
      cell = ''
      continue
    }
    if (ch === '\n') {
      row.push(cell.trim())
      if (row.some(c => c !== '')) rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += ch
  }
  row.push(cell.trim())
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

function parseChf(value: string): number | null {
  const n = Number.parseFloat(value.replace("'", '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

function parseDate(value: string): string | null {
  const v = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function truthy(value: string): boolean {
  return ['ja', 'yes', 'true', '1', 'bezahlt'].includes(value.trim().toLowerCase())
}

export function parseBookingCsv(text: string): { rows: BookingCsvRow[]; errors: string[] } {
  const table = parseCsv(text)
  if (table.length < 2) return { rows: [], errors: ['CSV hat keine Datenzeilen'] }
  const header = table[0].map(h => h.toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const required = ['datum', 'betrag_chf', 'beschreibung']
  const missing = required.filter(name => idx(name) < 0)
  if (missing.length) return { rows: [], errors: [`Spalten fehlen: ${missing.join(', ')}`] }

  const rows: BookingCsvRow[] = []
  const errors: string[] = []
  table.slice(1).forEach((cols, i) => {
    const line = i + 2
    const get = (name: string) => {
      const n = idx(name)
      return n >= 0 ? (cols[n] ?? '') : ''
    }
    const date = parseDate(get('datum'))
    const amount = parseChf(get('betrag_chf'))
    const description = get('beschreibung')
    if (!date) { errors.push(`Zeile ${line}: ungültiges Datum`); return }
    if (amount == null || amount < 0) { errors.push(`Zeile ${line}: ungültiger Betrag`); return }
    if (!description) { errors.push(`Zeile ${line}: Beschreibung fehlt`); return }

    const rawType = get('typ').toLowerCase()
    const rawKind = get('beleg_art').toLowerCase()
    let document_kind: AccountingDocumentKind = 'expense'
    if (isAccountingDocumentKind(rawKind)) document_kind = rawKind
    else if (rawKind.includes('kredit')) document_kind = 'creditor'
    else if (rawKind.includes('spes')) document_kind = 'spesen'
    else if (rawKind.includes('debit') || rawType.includes('einn')) document_kind = 'debtor'
    else if (rawKind.includes('vertrag')) document_kind = 'contract'
    else document_kind = inferDocumentKind({ type: rawType.includes('einn') || rawType === 'income' ? 'income' : 'expense' })

    const vatRateRaw = get('mwst_satz')
    const vatChf = get('mwst_chf')
    rows.push({
      entry_date: date,
      type: document_kind === 'debtor' ? 'income' : 'expense',
      document_kind,
      amount_rappen: amount,
      description,
      category_name: get('kategorie') || null,
      account_number: get('konto') || null,
      vat_rate: vatRateRaw ? Number.parseFloat(vatRateRaw.replace(',', '.')) : null,
      vat_amount_rappen: vatChf ? parseChf(vatChf) : null,
      is_paid: truthy(get('bezahlt')),
      creditor_name: get('lieferant') || null,
      creditor_iban: get('iban') || null,
      payment_reference: get('referenz') || null,
      notes: get('notiz') || null,
    })
  })
  return { rows, errors }
}
