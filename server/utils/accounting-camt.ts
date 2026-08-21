import { flagAlreadyImported, type MatchableEntry } from '~/server/utils/bank-reconciliation'

export type OpenExpenseForMatching = {
  id: string
  description: string
  amount_rappen: number
  creditor_name: string | null
  creditor_iban: string | null
  payment_reference: string | null
  entry_date: string
}

export type ExpenseMatchType =
  | 'exact_ref'
  | 'iban_amount'
  | 'amount_name'
  | 'amount_text'
  | 'amount_only'
  | 'ambiguous'
  | 'none'

export type ExpenseMatchResult = {
  entry: MatchableEntry
  match_type: ExpenseMatchType
  confidence: number
  entry_id?: string
  description?: string
  creditor_name?: string
  amount_rappen?: number
  already_imported?: boolean
  already_imported_at?: string
}

function alnumUpper(s: string): string {
  return (s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

function normalizeIban(s: string | null | undefined): string {
  return (s || '').replace(/\s/g, '').toUpperCase()
}

function fillMatch(
  entry: MatchableEntry,
  exp: OpenExpenseForMatching,
  match_type: ExpenseMatchType,
  confidence: number,
): ExpenseMatchResult {
  return {
    entry,
    match_type,
    confidence,
    entry_id: exp.id,
    description: exp.description,
    creditor_name: exp.creditor_name ?? '',
    amount_rappen: exp.amount_rappen,
  }
}

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zäöüàéèâ0-9]+/i)
    .filter(w => w.length >= 4 && !['rechnung', 'zahlung', 'betrag', 'referenz'].includes(w))
}

export function matchEntriesToExpenses(
  entries: MatchableEntry[],
  expenses: OpenExpenseForMatching[],
): ExpenseMatchResult[] {
  const results: ExpenseMatchResult[] = entries.map((entry) => {
    let best: ExpenseMatchResult = { entry, match_type: 'none', confidence: 0 }
    let amountOnlyCandidates = 0
    const haystack = alnumUpper([entry.reference, entry.reference_raw, entry.remittance_info].join(' '))
    const refClean = alnumUpper(entry.reference)
    const entryIban = normalizeIban(entry.iban)
    const payee = (entry.debtor_name || '').toLowerCase()

    for (const exp of expenses) {
      const amtExact = Math.abs(exp.amount_rappen - entry.amount_rappen) <= 1
      const storedRef = alnumUpper(exp.payment_reference || '')
      const expIban = normalizeIban(exp.creditor_iban)
      const credName = (exp.creditor_name || '').toLowerCase()

      if (storedRef && refClean && (refClean === storedRef || haystack.includes(storedRef))) {
        const confidence = amtExact ? 98 : 78
        if (confidence > best.confidence) best = fillMatch(entry, exp, 'exact_ref', confidence)
        continue
      }

      if (amtExact && entryIban && expIban && entryIban === expIban) {
        if (90 > best.confidence) best = fillMatch(entry, exp, 'iban_amount', 90)
        continue
      }

      if (amtExact && credName && payee) {
        const parts = credName.split(/\s+/)
        const nameMatch = parts.some(part => part.length > 2 && payee.includes(part))
          || payee.split(/\s+/).some(part => part.length > 2 && credName.includes(part))
        if (nameMatch && 72 > best.confidence) {
          best = fillMatch(entry, exp, 'amount_name', 72)
        }
      }

      if (amtExact) {
        const words = significantWords(exp.description)
        const text = `${entry.remittance_info} ${entry.reference_raw} ${entry.debtor_name}`.toLowerCase()
        const hits = words.filter(w => text.includes(w)).length
        if (hits >= 1 && 68 > best.confidence) {
          best = fillMatch(entry, exp, 'amount_text', hits >= 2 ? 75 : 68)
        }
      }

      if (amtExact && best.confidence < 40) amountOnlyCandidates++
    }

    if (best.confidence < 40 && amountOnlyCandidates > 1) {
      best = { entry, match_type: 'ambiguous', confidence: 30 }
    } else if (best.confidence < 40 && amountOnlyCandidates === 1) {
      best = { entry, match_type: 'amount_only', confidence: 35 }
    }

    return best
  })

  const used = new Set<string>()
  for (const r of [...results].sort((a, b) => b.confidence - a.confidence)) {
    if (!r.entry_id) continue
    if (used.has(r.entry_id)) {
      r.confidence = Math.min(r.confidence, 20)
      r.match_type = 'none'
      delete r.entry_id
    } else {
      used.add(r.entry_id)
    }
  }

  return results
}

export { flagAlreadyImported }
