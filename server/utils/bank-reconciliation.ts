// server/utils/bank-reconciliation.ts
// Gemeinsame Matching-Logik für den Zahlungsabgleich (CAMT- und CSV-Import).
// Ordnet eingehende Bank-Zahlungen offenen Rechnungen zu.

import { generateReference } from '~/server/utils/swiss-qr'

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
}

export interface MatchResult {
  entry: MatchableEntry
  match_type: 'exact_ref' | 'invoice_number' | 'amount_name' | 'ambiguous' | 'none'
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

/**
 * Matcht eine Liste von Bank-Zahlungseinträgen gegen die offenen Rechnungen eines
 * Tenants. Priorität: exakte QR-Zahlungsreferenz (QRR/SCOR) > Rechnungsnummer als
 * Referenz-Substring (Legacy) > Rechnungsnummer im Freitext > Betrag+Name (fuzzy) >
 * nur Betrag (sehr unsicher, wird bei mehreren Kandidaten als "ambiguous" markiert).
 */
export function matchEntriesToInvoices(
  entries: MatchableEntry[],
  invoices: OpenInvoiceForMatching[],
  tenantQrIban: string,
): MatchResult[] {
  const results: MatchResult[] = entries.map(entry => {
    let bestMatch: MatchResult = { entry, match_type: 'none', confidence: 0 }
    let amountOnlyCandidates = 0

    for (const inv of invoices) {
      const invNum = (inv.invoice_number || '').replace(/\s/g, '').toUpperCase()
      const custName = (inv.billing_contact_person || inv.billing_company_name || '').toLowerCase()
      const amtExact = Math.abs(inv.total_amount_rappen - entry.amount_rappen) <= 1

      // 0. Exakte, für diese Rechnung erwartete QR-Zahlungsreferenz (QRR/SCOR)
      const expectedRef = invNum ? generateReference(inv.invoice_number, tenantQrIban).ref : ''
      if (expectedRef && entry.reference === expectedRef) {
        const confidence = amtExact ? 99 : 80
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            entry,
            match_type: 'exact_ref',
            confidence,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_total: inv.total_amount_rappen,
            customer_name: inv.billing_contact_person || inv.billing_company_name || '',
            invoice_status: inv.status,
            invoice_payment_status: inv.payment_status,
          }
          continue
        }
      }

      // 1. Referenz enthält die Rechnungsnummer als Substring (Legacy-/Fallback-Fall)
      const refClean = entry.reference.replace(/[^A-Z0-9]/g, '')
      const invNumClean = invNum.replace(/[^A-Z0-9]/g, '')
      if (refClean && invNumClean && (refClean === invNumClean || refClean.includes(invNumClean) || invNumClean.includes(refClean))) {
        const confidence = amtExact ? 95 : 72
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            entry,
            match_type: 'exact_ref',
            confidence,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_total: inv.total_amount_rappen,
            customer_name: inv.billing_contact_person || inv.billing_company_name || '',
            invoice_status: inv.status,
            invoice_payment_status: inv.payment_status,
          }
        }
      }

      // 2. Rechnungsnummer im freien Text (Zahlungszweck)
      const remit = entry.remittance_info.replace(/\s/g, '').toUpperCase()
      if (invNumClean && remit.includes(invNumClean)) {
        const confidence = amtExact ? 90 : 65
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            entry,
            match_type: 'invoice_number',
            confidence,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_total: inv.total_amount_rappen,
            customer_name: inv.billing_contact_person || inv.billing_company_name || '',
            invoice_status: inv.status,
            invoice_payment_status: inv.payment_status,
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
            bestMatch = {
              entry,
              match_type: 'amount_name',
              confidence,
              invoice_id: inv.id,
              invoice_number: inv.invoice_number,
              invoice_total: inv.total_amount_rappen,
              customer_name: inv.billing_contact_person || inv.billing_company_name || '',
              invoice_status: inv.status,
              invoice_payment_status: inv.payment_status,
            }
          }
        }
      }

      // 4. Nur Betrag (sehr niedrige Konfidenz) — nur als letzter, schwacher Kandidat
      if (amtExact && bestMatch.confidence < 40) {
        amountOnlyCandidates++
        if (amountOnlyCandidates === 1) {
          bestMatch = {
            entry,
            match_type: 'amount_name',
            confidence: 35,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_total: inv.total_amount_rappen,
            customer_name: inv.billing_contact_person || inv.billing_company_name || '',
            invoice_status: inv.status,
            invoice_payment_status: inv.payment_status,
          }
        }
      }
    }

    // Mehrere offene Rechnungen mit identischem Betrag und ohne stärkeres
    // Unterscheidungsmerkmal → nicht raten, sondern explizit als mehrdeutig
    // kennzeichnen und die Auswahl dem Admin überlassen.
    if (bestMatch.confidence === 35 && amountOnlyCandidates > 1) {
      bestMatch = { entry, match_type: 'ambiguous', confidence: 30 }
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
