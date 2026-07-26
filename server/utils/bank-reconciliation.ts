// server/utils/bank-reconciliation.ts
// Gemeinsame Matching-Logik für den Zahlungsabgleich (CAMT- und CSV-Import).
// Ordnet eingehende Bank-Zahlungen offenen Rechnungen zu.

import { generateReference } from './swiss-qr'

export interface MatchableEntry {
  amount_rappen: number
  date: string
  reference: string        // bereinigt: keine Leerzeichen, Großbuchstaben
  reference_raw: string
  debtor_name: string
  iban: string
  remittance_info: string
  raw_amount: number
  bank_ref: string | null
  dedupe_key: string
}

export interface OpenInvoiceForMatching {
  id: string
  invoice_number: string
  total_amount_rappen: number
  payment_status: string
  status: string
  billing_contact_person: string | null
  billing_company_name: string | null
  /** Auf der Rechnung gespeicherte/gedruckte Zahlungsreferenz (QRR/SCOR), falls vorhanden */
  payment_reference?: string | null
}

export interface MatchResult {
  entry: MatchableEntry
  match_type: 'exact_ref' | 'invoice_number' | 'amount_name' | 'amount_only' | 'ambiguous' | 'none'
  confidence: number // 0–100
  invoice_id?: string
  invoice_number?: string
  invoice_total?: number
  customer_name?: string
  invoice_status?: string
  invoice_payment_status?: string
  already_imported?: boolean
  already_imported_at?: string
}

/**
 * Bank-eigene Transaktionsreferenz (z.B. AcctSvcrRef, Buchungsnummer) wenn vorhanden,
 * sonst ein Fallback-Schlüssel aus den inhaltlichen Merkmalen der Zahlung. Damit wird
 * ein wiederholter/überlappender Import derselben Buchung erkannt.
 */
export function computeDedupeKey(opts: {
  bankRef?: string | null
  date: string
  amountRappen: number
  reference: string
  debtorName: string
}): string {
  if (opts.bankRef) return `ref:${opts.bankRef}`
  return `fallback:${opts.date}|${opts.amountRappen}|${opts.reference}|${opts.debtorName.trim().toLowerCase()}`
}

function alnumUpper(s: string): string {
  return (s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

function fillMatch(
  entry: MatchableEntry,
  inv: OpenInvoiceForMatching,
  match_type: MatchResult['match_type'],
  confidence: number,
): MatchResult {
  return {
    entry,
    match_type,
    confidence,
    invoice_id: inv.id,
    invoice_number: inv.invoice_number,
    invoice_total: inv.total_amount_rappen,
    customer_name: inv.billing_contact_person || inv.billing_company_name || '',
    invoice_status: inv.status,
    invoice_payment_status: inv.payment_status,
  }
}

/**
 * Matcht eine Liste von Bank-Zahlungseinträgen gegen die offenen Rechnungen eines
 * Tenants. Priorität: exakte QR-Zahlungsreferenz (QRR/SCOR) > gespeicherte
 * payment_reference > QRR enthält Rechnungsziffern > Rechnungsnummer im Freitext >
 * Betrag+Name > nur Betrag (bei mehreren Kandidaten → ambiguous).
 */
export function matchEntriesToInvoices(
  entries: MatchableEntry[],
  invoices: OpenInvoiceForMatching[],
  tenantQrIban: string,
): MatchResult[] {
  const results: MatchResult[] = entries.map(entry => {
    let bestMatch: MatchResult = { entry, match_type: 'none', confidence: 0 }
    let amountOnlyCandidates = 0

    // Gesamter Zahlungstext, alphanumerisch normalisiert (Bindestriche etc. weg)
    const haystack = alnumUpper([entry.reference, entry.reference_raw, entry.remittance_info].join(' '))
    const refClean = alnumUpper(entry.reference)

    for (const inv of invoices) {
      const invNumClean = alnumUpper(inv.invoice_number || '')
      const invDigits = (inv.invoice_number || '').replace(/\D/g, '')
      const custName = (inv.billing_contact_person || inv.billing_company_name || '').toLowerCase()
      const amtExact = Math.abs(inv.total_amount_rappen - entry.amount_rappen) <= 1
      const storedRef = alnumUpper(inv.payment_reference || '')

      // 0. Exakte, für diese Rechnung erwartete QR-Zahlungsreferenz (QRR/SCOR)
      const expectedRef = inv.invoice_number
        ? alnumUpper(generateReference(inv.invoice_number, tenantQrIban).ref)
        : ''
      if (expectedRef && refClean && refClean === expectedRef) {
        const confidence = amtExact ? 99 : 80
        if (confidence > bestMatch.confidence) {
          bestMatch = fillMatch(entry, inv, 'exact_ref', confidence)
          continue
        }
      }

      // 0b. Gespeicherte/gedruckte payment_reference (kann von regenerate abweichen)
      if (storedRef && refClean && (refClean === storedRef || haystack.includes(storedRef))) {
        const confidence = amtExact ? 98 : 78
        if (confidence > bestMatch.confidence) {
          bestMatch = fillMatch(entry, inv, 'exact_ref', confidence)
          continue
        }
      }

      // 1. QRR (25–27 Ziffern) enthält die Ziffern der Rechnungsnummer
      //    (Bank-Refs können anders gepaddet/gekürzt sein als unser generateQRR)
      if (
        /^\d{25,27}$/.test(refClean)
        && invDigits.length >= 6
        && (refClean.includes(invDigits) || refClean.slice(0, -1).endsWith(invDigits) || refClean.endsWith(invDigits))
      ) {
        const confidence = amtExact ? 96 : 74
        if (confidence > bestMatch.confidence) {
          bestMatch = fillMatch(entry, inv, 'exact_ref', confidence)
        }
      }

      // 2. Referenz / Freitext enthält die Rechnungsnummer (RE-2026-0029 ↔ RE20260029)
      if (invNumClean && invNumClean.length >= 4) {
        const inRef = !!(refClean && (refClean === invNumClean || refClean.includes(invNumClean) || invNumClean.includes(refClean)))
        const inText = haystack.includes(invNumClean)
        if (inRef || inText) {
          const confidence = inRef
            ? (amtExact ? 95 : 72)
            : (amtExact ? 90 : 65)
          if (confidence > bestMatch.confidence) {
            bestMatch = fillMatch(entry, inv, inRef ? 'exact_ref' : 'invoice_number', confidence)
          }
        }
      }

      // 3. Betrag + Kundenname (Fuzzy)
      if (amtExact && custName && entry.debtor_name) {
        const debtorLower = entry.debtor_name.toLowerCase()
        const nameParts = custName.split(/\s+/)
        const nameMatch = nameParts.some(part => part.length > 2 && debtorLower.includes(part))
        if (nameMatch) {
          const confidence = 70
          if (confidence > bestMatch.confidence) {
            bestMatch = fillMatch(entry, inv, 'amount_name', confidence)
          }
        }
      }

      // 4. Nur Betrag — merken, aber keine Rechnung vorwählen (zu unsicher)
      if (amtExact && bestMatch.confidence < 40) {
        amountOnlyCandidates++
      }
    }

    // Mehrere offene Rechnungen mit identischem Betrag und ohne stärkeres
    // Unterscheidungsmerkmal → nicht raten, Admin wählt manuell.
    if (bestMatch.confidence < 40 && amountOnlyCandidates > 1) {
      bestMatch = { entry, match_type: 'ambiguous', confidence: 30 }
    } else if (bestMatch.confidence < 40 && amountOnlyCandidates === 1) {
      // Ein Betrags-Treffer reicht nicht zur Vorauswahl — nur Hinweis anzeigen.
      bestMatch = { entry, match_type: 'amount_only', confidence: 35 }
    }

    return bestMatch
  })

  // Duplikate innerhalb dieses Imports: wenn zwei Entries auf dieselbe Rechnung
  // zeigen, wird der schwächere zurückgesetzt statt beide derselben Rechnung
  // zuzuordnen.
  const usedInvoices = new Set<string>()
  const sorted = [...results].sort((a, b) => b.confidence - a.confidence)
  for (const r of sorted) {
    if (r.invoice_id) {
      if (usedInvoices.has(r.invoice_id)) {
        r.confidence = Math.min(r.confidence, 20)
        r.match_type = 'none'
        delete r.invoice_id
      } else {
        usedInvoices.add(r.invoice_id)
      }
    }
  }

  return results
}

/**
 * Markiert bereits importierte Transaktionen (aus bank_import_records) anhand
 * ihres Dedupe-Schlüssels als "already_imported" in den Match-Ergebnissen.
 */
export function flagAlreadyImported(results: MatchResult[], importedKeyMap: Map<string, string>) {
  for (const r of results) {
    if (importedKeyMap.has(r.entry.dedupe_key)) {
      r.already_imported = true
      r.already_imported_at = importedKeyMap.get(r.entry.dedupe_key)
    }
  }
  return results
}
