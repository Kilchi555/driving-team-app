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

/** Scoring-basierte Header-Erkennung — Banken nennen Spalten unterschiedlich. */
const HEADER_SCORERS: Record<keyof ColumnMapping, Array<{ re: RegExp; score: number }>> = {
  date: [
    { re: /^buchungsdatum$/i, score: 40 },
    { re: /^datum$/i, score: 35 },
    { re: /^(date|trade\s?date|booking\s?date)/i, score: 25 },
    // Valuta = Wertstellungsdatum — nur Fallback, wenn kein Buchungsdatum da ist
    { re: /^valuta(datum)?$/i, score: 10 },
  ],
  credit: [
    { re: /gutschrift\s*(chf|eur)?$/i, score: 30 },
    { re: /gutschrift|^haben$|credit|eingang/i, score: 20 },
  ],
  debit: [
    { re: /belastung\s*(chf|eur)?$/i, score: 30 },
    { re: /lastschrift|^soll$|debit|ausgang/i, score: 20 },
  ],
  amount: [
    { re: /^betrag$|^amount$|^montant$|^amount\s?\(chf\)$/i, score: 30 },
    { re: /betrag\s*detail/i, score: 5 }, // oft leer bei ZKB — schwacher Kandidat
  ],
  // Zahlungsreferenz (QRR/SCOR) — nicht die bankinterne Buchungs-ID
  reference: [
    { re: /^(referenznummer|zahlungsreferenz|qr[-\s]?referenz|esr[-\s]?nr)$/i, score: 40 },
    { re: /zahlungsreferenz|qr[-\s]?referenz|esr[-\s]?nr/i, score: 30 },
    { re: /^referenz(nummer)?$/i, score: 20 },
    { re: /reference/i, score: 10 },
  ],
  description: [
    { re: /^(zahlungszweck|verwendungszweck|mitteilung)$/i, score: 40 },
    { re: /zahlungszweck|verwendungszweck|mitteilung/i, score: 30 },
    { re: /^buchungstext$/i, score: 20 },
    { re: /beschreibung|purpose|description|^text$/i, score: 10 },
  ],
  debtor_name: [
    { re: /^(details|auftraggeber|zahlungspflichtiger)$/i, score: 40 },
    { re: /auftraggeber|zahlungspflichtiger|payer|absender/i, score: 25 },
    { re: /^details$/i, score: 30 },
    { re: /^name$/i, score: 10 },
  ],
  // Bankinterne IDs (ZKB-Referenz, AcctSvcrRef, …) → nur für Deduplizierung
  transaction_id: [
    { re: /zkb[-\s]?referenz|acct.?svcr|buchungsnr|transaktionsnr|transaction\s?id|avis[-\s]?nr/i, score: 40 },
    { re: /bank[-\s]?referenz|buchungs[-\s]?id/i, score: 25 },
  ],
}

/**
 * Schätzt anhand üblicher Spaltenbezeichnungen in Schweizer Bank-CSV-Exporten
 * eine sinnvolle Standard-Zuordnung. Der Admin kann/soll diese im UI überprüfen
 * und bei Bedarf korrigieren, bevor der Import ausgeführt wird.
 *
 * Bei mehreren Treffern (z.B. ZKB: "ZKB-Referenz" vs. "Referenznummer") gewinnt
 * der spezifischere Score — bankinterne IDs landen bei transaction_id.
 */
export function suggestColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const best: Partial<Record<keyof ColumnMapping, { header: string; score: number }>> = {}

  for (const header of headers) {
    const h = header.trim()
    if (!h) continue

    for (const key of Object.keys(HEADER_SCORERS) as (keyof ColumnMapping)[]) {
      let score = 0
      for (const { re, score: s } of HEADER_SCORERS[key]) {
        if (re.test(h)) score = Math.max(score, s)
      }
      // "ZKB-Referenz" / ähnliche Bank-IDs nie als Zahlungsreferenz vorschlagen
      if (key === 'reference' && /zkb[-\s]?referenz|acct.?svcr|buchungsnr/i.test(h)) continue
      // "Details" nicht als Mitteilung, wenn wir es als Zahler nutzen
      if (key === 'description' && /^details$/i.test(h)) continue

      if (score > 0 && (!best[key] || score > best[key]!.score)) {
        best[key] = { header: h, score }
      }
    }
  }

  const mapping: Partial<ColumnMapping> = {}
  for (const key of Object.keys(best) as (keyof ColumnMapping)[]) {
    mapping[key] = best[key]!.header
  }
  return mapping
}

/** Entfernt Leerzeichen und normalisiert für Referenzvergleiche. */
export function cleanPaymentRef(raw: string): string {
  return (raw || '').replace(/\s/g, '').toUpperCase()
}

/**
 * Erkennt, ob ein String wie eine Schweizer Zahlungsreferenz aussieht
 * (26-stellige QRR oder RF… SCOR) — nicht wie eine Bank-Buchungs-ID (Z2620…).
 */
export function looksLikePaymentReference(raw: string): boolean {
  const cleaned = cleanPaymentRef(raw)
  if (!cleaned) return false
  if (/^RF\d{2}[A-Z0-9]+$/i.test(cleaned)) return true
  if (/^\d{26}$/.test(cleaned)) return true
  return false
}

/**
 * Extrahiert QRR/SCOR aus beliebigem Freitext (z.B. ZKB-Buchungstext
 * "Gutschrift QRR: 00 00000 00000 00000 02026 0029").
 */
export function extractPaymentReference(text: string): string | null {
  if (!text) return null

  const qrrLabeled = text.match(/QRR(?:\s+Instant-Zahlung)?\s*:?\s*([\d\s]+)/i)
  if (qrrLabeled) {
    const digits = qrrLabeled[1].replace(/\D/g, '')
    if (digits.length >= 26) return digits.slice(0, 26)
  }

  const scor = text.match(/\b(RF\d{2}[A-Z0-9]{1,21})\b/i)
  if (scor) return scor[1].toUpperCase()

  // Bare 26-digit blocks (bereits ohne Leerzeichen oder mit)
  const spaced = text.match(/(?<!\d)(\d{2}(?:[\s]\d{5}){4}[\s]\d{4})(?!\d)/)
  if (spaced) {
    const digits = spaced[1].replace(/\D/g, '')
    if (digits.length === 26) return digits
  }

  const compact = cleanPaymentRef(text)
  const bare = compact.match(/(?<![A-Z0-9])(\d{26})(?![A-Z0-9])/)
  if (bare) return bare[1]

  return null
}

/**
 * Extrahiert einen Zahler-Namen aus Bank-Freitext:
 * - "Auftraggeber: Max Muster, Strasse 1, …"
 * - "Details"-Zeile "Max Muster, Strasse 1, PLZ Ort, CH"
 * Bei verketteten Feldern ("a | b | c") wird jedes Segment einzeln geprüft.
 */
export function extractDebtorName(text: string): string | null {
  if (!text) return null

  const segments = text.includes(' | ') ? text.split(' | ') : [text]
  for (const segment of segments) {
    const s = segment.trim()
    if (!s) continue

    const ag = s.match(/Auftraggeber:\s*(.+)/i)
    if (ag) {
      const name = debtorNameFromAddressLine(ag[1])
      if (name) return name
    }

    // Adresszeile ohne Label (typisch ZKB-Spalte "Details") — keine Buchungstexte
    if (!/gutschrift|belastung|einzahlung|ref:|qrr|provisionsabrechnung|rechnung\s+re-/i.test(s)) {
      const name = debtorNameFromAddressLine(s)
      if (name && name.length >= 3) return name
    }
  }

  return null
}

function debtorNameFromAddressLine(line: string): string | null {
  const first = (line.split(',')[0] || '').trim()
  if (!first || first.length < 3) return null
  // Keine reinen Zahlen / Zahlungsreferenzen als Name
  if (/^\d+$/.test(first) || looksLikePaymentReference(first)) return null
  // Bank-Buchungs-IDs (Z2620…, L113P…, BA260…, MO260…) — kein Personenname
  if (/^[A-Z]{1,6}\d[A-Z0-9-]{4,}$/i.test(first)) return null
  // Mindestens ein Buchstabe, der nach einem Namen aussieht
  if (!/[A-Za-zÄÖÜäöü]/.test(first)) return null
  return first.slice(0, 120)
}

export interface EnrichedCsvPaymentFields {
  reference: string
  reference_raw: string
  debtor_name: string
  remittance_info: string
}

/**
 * Spaltenübergreifende Anreicherung: QRR, Zahler und Mitteilung aus der
 * gesamten CSV-Zeile ziehen — unabhängig davon, welche einzelne Spalte
 * der Admin (oder Auto-Mapping) als "Referenz"/"Mitteilung" gewählt hat.
 *
 * Banken streuen dieselben Infos unterschiedlich (ZKB: QRR im Buchungstext,
 * Name in Details, Rechnungsnr. im Zahlungszweck; andere Banken: alles in einer Spalte).
 */
export function enrichCsvPaymentFields(opts: {
  row: string[]
  headers: string[]
  mappedReference?: string
  mappedDescription?: string
  mappedDebtorName?: string
  /** Indizes, die reine Betrags-/Datums-/Saldo-Spalten sind und im Haystack stören */
  skipHeaderIndexes?: number[]
}): EnrichedCsvPaymentFields {
  const {
    row, headers,
    mappedReference = '',
    mappedDescription = '',
    mappedDebtorName = '',
    skipHeaderIndexes = [],
  } = opts

  const skip = new Set(skipHeaderIndexes)
  const textParts: string[] = []
  for (let i = 0; i < row.length; i++) {
    if (skip.has(i)) continue
    const cell = (row[i] || '').trim()
    if (!cell) continue
    // Reine Zahlen/Salden überspringen
    if (/^[\d'.,\s+-]+$/.test(cell) && !/[A-Za-zÄÖÜäöü]/.test(cell)) continue
    textParts.push(cell)
  }
  const haystack = textParts.join(' | ')

  // Referenz: gemappte Spalte nur nutzen wenn sie wie QRR/SCOR aussieht,
  // sonst aus der ganzen Zeile extrahieren (z.B. aus Buchungstext).
  let referenceRaw = ''
  if (looksLikePaymentReference(mappedReference)) {
    referenceRaw = mappedReference.trim()
  } else {
    referenceRaw = extractPaymentReference(haystack)
      || extractPaymentReference(mappedDescription)
      || ''
  }

  // Zahler: gemappte Spalte, sonst Auftraggeber:/Details aus Haystack
  let debtorName = mappedDebtorName.trim()
  if (!debtorName) {
    debtorName = extractDebtorName(haystack) || ''
  } else if (debtorName.includes(',')) {
    // "Name, Strasse, PLZ Ort" → nur Name-Teil für Fuzzy-Match
    debtorName = debtorNameFromAddressLine(debtorName) || debtorName
  }

  // Remittance: alle Textfelder — Matching sucht Rechnungsnr. als Substring
  const remittanceParts = [mappedDescription, haystack].filter(Boolean)
  const remittance_info = [...new Set(remittanceParts)].join(' | ')

  return {
    reference: cleanPaymentRef(referenceRaw),
    reference_raw: referenceRaw || mappedReference || mappedDescription || '',
    debtor_name: debtorName,
    remittance_info,
  }
}
