// server/utils/csv-parse.ts
// Leichtgewichtiger CSV-Parser (ohne externe Dependency) plus Helfer für
// Schweizer Zahlenformate/Datumsformate, wie sie in Bank-Kontoauszügen
// (PostFinance, UBS, Raiffeisen, ZKB, Neon, Yuh, Wise, …) vorkommen.

export function detectDelimiter(sample: string): string {
  const candidates = [';', ',', '\t']
  let best = ';'
  let bestCount = -1
  for (const d of candidates) {
    const count = sample.split(d).length - 1
    if (count > bestCount) { best = d; bestCount = count }
  }
  return best
}

export function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'; i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map(s => s.trim())
}

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
  delimiter: string
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/^\uFEFF/, '') // BOM entfernen (Excel-Exporte)
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0)

  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter)
  const rows = lines.slice(1).map(l => splitCsvLine(l, delimiter))
  return { headers, rows, delimiter }
}

/**
 * Parst einen Betrag in gängigen Schweizer/europäischen Notationen:
 * "1'234.50", "1'234,50", "1234.50", "1234,50", "-50.00", "CHF 50.00"
 */
export function parseSwissAmount(raw: string): number {
  if (!raw) return 0
  let s = raw.trim().replace(/CHF|EUR|USD/gi, '').trim()
  s = s.replace(/'/g, '').replace(/\s/g, '')
  // Wenn sowohl "," als auch "." vorkommen: das letzte Vorkommen ist das Dezimaltrennzeichen
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma > -1) {
    // Nur Komma vorhanden → als Dezimaltrennzeichen behandeln
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

/**
 * Parst gängige Datumsformate in Bank-CSV-Exporten zu 'YYYY-MM-DD'.
 * Unterstützt: YYYY-MM-DD, DD.MM.YYYY, DD.MM.YY, DD/MM/YYYY.
 */
export function parseFlexibleDate(raw: string): string {
  if (!raw) return ''
  const s = raw.trim()

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${year}-${month}-${day}`
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (m) {
    const day = m[1].padStart(2, '0')
    const month = m[2].padStart(2, '0')
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${year}-${month}-${day}`
  }

  return ''
}

export interface ColumnMapping {
  date: string
  amount?: string      // einzelne Betragsspalte (positiv = Gutschrift)
  credit?: string       // separate Gutschrift-Spalte
  debit?: string        // separate Lastschrift-Spalte (nur zum Erkennen/Ausschließen)
  reference?: string
  description?: string
  debtor_name?: string
  transaction_id?: string
}

const HEADER_PATTERNS: Record<keyof ColumnMapping, RegExp> = {
  date: /^(buchungsdatum|valuta(datum)?|datum|date|trade\s?date|booking\s?date)/i,
  credit: /gutschrift|^haben$|credit|eingang/i,
  debit: /lastschrift|belastung|^soll$|debit|ausgang/i,
  amount: /^betrag$|^amount$|^montant$|^amount\s?\(chf\)$/i,
  reference: /referenz|reference|esr[-\s]?nr|qr[-\s]?referenz|zahlungsreferenz/i,
  description: /buchungstext|verwendungszweck|zahlungszweck|mitteilung|beschreibung|purpose|description|details|^text$/i,
  debtor_name: /auftraggeber|zahlungspflichtiger|payer|absender|^name$/i,
  transaction_id: /buchungsnr|transaktionsnr|transaction\s?id|avis[-\s]?nr/i,
}

/**
 * Schätzt anhand üblicher Spaltenbezeichnungen in Schweizer Bank-CSV-Exporten
 * eine sinnvolle Standard-Zuordnung. Der Admin kann/soll diese im UI überprüfen
 * und bei Bedarf korrigieren, bevor der Import ausgeführt wird.
 */
export function suggestColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {}
  for (const header of headers) {
    for (const key of Object.keys(HEADER_PATTERNS) as (keyof ColumnMapping)[]) {
      if (mapping[key]) continue
      if (HEADER_PATTERNS[key].test(header)) {
        mapping[key] = header
      }
    }
  }
  return mapping
}
