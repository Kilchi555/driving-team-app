/**
 * Turns an uploaded statement into deposit-match previews.
 * Debtor names stay inside the existing dedupe key and are not returned.
 * The uploader is never treated as the depositor.
 */

import { computeDedupeKey } from '~/server/utils/bank-reconciliation'
import { parseCamtXml } from '~/server/utils/camt-parse'
import {
  depositorFromStatementImport,
  matchCreditToDeposits,
  type BankCreditInput,
  type DepositMatchInput,
  type MatchClass,
} from '~/server/utils/cash-bank-deposit'
import {
  enrichCsvPaymentFields,
  parseCsv,
  parseFlexibleDate,
  parseSwissAmount,
  suggestColumnMapping,
  type ColumnMapping,
} from '~/server/utils/csv-parse'

export type StatementLine = BankCreditInput & {
  bankRef: string | null
  reviewText: string
  debtorName: string
}

export type DepositMatchPreview = {
  dedupe_key: string
  amount_rappen: number
  date: string
  currency: string
  direction: BankCreditInput['direction']
  match_class: MatchClass
  deposit_ids: string[]
  bank_ref: string | null
  review_text: string
  reference: string
  remittance: string
  depositor_user_id: null
}

export function redactStatementText(value: string): string {
  return (value || '').replace(/\d{12,19}/g, '[redacted]').slice(0, 180)
}

function asLine(input: {
  date: string
  amountRappen: number
  direction: BankCreditInput['direction']
  currency?: string | null
  reference?: string | null
  remittance?: string | null
  bankRef?: string | null
  debtorName?: string | null
}): StatementLine {
  const reference = input.reference || ''
  const remittance = input.remittance || ''
  return {
    dedupeKey: computeDedupeKey({
      bankRef: input.bankRef,
      date: input.date,
      amountRappen: input.amountRappen,
      reference,
      debtorName: input.debtorName || '',
    }),
    amountRappen: input.amountRappen,
    date: input.date,
    direction: input.direction,
    reference,
    remittance,
    bankRef: input.bankRef || null,
    reviewText: redactStatementText(`${reference} ${remittance}`.trim()),
    debtorName: input.debtorName || '',
    currency: (input.currency ?? '').trim().toUpperCase(),
  }
}

export function creditsFromCsv(csv: string, mapping: ColumnMapping): { lines: StatementLine[]; skippedInvalidDate: number } {
  const { headers, rows } = parseCsv(csv)
  const colIndex = (name?: string) => (name ? headers.indexOf(name) : -1)
  const dateIdx = colIndex(mapping.date)
  const amountIdx = colIndex(mapping.amount)
  const creditIdx = colIndex(mapping.credit)
  const debitIdx = colIndex(mapping.debit)
  const referenceIdx = colIndex(mapping.reference)
  const descriptionIdx = colIndex(mapping.description)
  const debtorNameIdx = colIndex(mapping.debtor_name)
  const transactionIdIdx = colIndex(mapping.transaction_id)
  const currencyIdx = colIndex(mapping.currency)
  if (dateIdx === -1 || (amountIdx === -1 && creditIdx === -1 && debitIdx === -1)) {
    throw new Error('mapping')
  }

  const lines: StatementLine[] = []
  let skippedInvalidDate = 0
  for (const row of rows) {
    const date = parseFlexibleDate(row[dateIdx] || '')
    if (!date) {
      skippedInvalidDate += 1
      continue
    }
    const credit = creditIdx > -1 ? parseSwissAmount(row[creditIdx] || '') : 0
    const debit = debitIdx > -1 ? parseSwissAmount(row[debitIdx] || '') : 0
    let direction: BankCreditInput['direction']
    let amount: number
    if (creditIdx > -1 || debitIdx > -1) {
      if (credit > 0) {
        direction = 'credit'
        amount = credit
      } else if (debit > 0) {
        direction = 'debit'
        amount = debit
      } else {
        continue
      }
    } else {
      const signed = parseSwissAmount(row[amountIdx] || '')
      if (signed === 0) continue
      direction = signed > 0 ? 'credit' : 'debit'
      amount = Math.abs(signed)
    }

    const reference = (referenceIdx > -1 ? row[referenceIdx] || '' : '').trim()
    const description = (descriptionIdx > -1 ? row[descriptionIdx] || '' : '').trim()
    const mappedDebtor = (debtorNameIdx > -1 ? row[debtorNameIdx] || '' : '').trim()
    const bankRef = (transactionIdIdx > -1 ? row[transactionIdIdx] || '' : '').trim() || null
    const enriched = enrichCsvPaymentFields({
      row,
      headers,
      mappedReference: reference,
      mappedDescription: description,
      mappedDebtorName: mappedDebtor,
      skipHeaderIndexes: [dateIdx, amountIdx, creditIdx, debitIdx, transactionIdIdx, debtorNameIdx].filter(i => i > -1),
    })
    const rawCurrency = currencyIdx > -1 ? (row[currencyIdx] || '').trim() : ''
    lines.push(asLine({
      date,
      amountRappen: Math.round(amount * 100),
      direction,
      currency: rawCurrency,
      reference: enriched.reference || enriched.reference_raw,
      remittance: enriched.remittance_info,
      bankRef,
      debtorName: enriched.debtor_name,
    }))
  }
  return { lines, skippedInvalidDate }
}

export function resolveCsvMapping(csv: string, mapping?: Partial<ColumnMapping> | null): ColumnMapping {
  const { headers } = parseCsv(csv)
  const suggested = suggestColumnMapping(headers)
  const resolved: ColumnMapping = {
    date: mapping?.date || suggested.date || '',
    amount: mapping?.amount || suggested.amount,
    credit: mapping?.credit || suggested.credit,
    debit: mapping?.debit || suggested.debit,
    reference: mapping?.reference || suggested.reference,
    description: mapping?.description || suggested.description,
    debtor_name: mapping?.debtor_name || suggested.debtor_name,
    transaction_id: mapping?.transaction_id || suggested.transaction_id,
    currency: mapping?.currency || suggested.currency,
  }
  if (!resolved.date || (!resolved.amount && !resolved.credit && !resolved.debit)) {
    throw new Error('mapping')
  }
  return resolved
}

export function creditsFromCamt(xml: string): { lines: StatementLine[] } {
  const entries = parseCamtXml(xml, { directions: ['CRDT', 'DBIT'], includeNonChf: true, includeReversals: true })
  return {
    lines: entries.map(entry => asLine({
      date: entry.date,
      amountRappen: entry.amount_rappen,
      direction: entry.reversal ? 'reversal' : entry.direction === 'DBIT' ? 'debit' : 'credit',
      currency: entry.currency || '',
      reference: entry.reference,
      remittance: entry.remittance_info,
      bankRef: entry.bank_ref,
      debtorName: entry.debtor_name,
    })),
  }
}

export function previewStatementLines(
  lines: readonly StatementLine[],
  deposits: readonly DepositMatchInput[],
): DepositMatchPreview[] {
  return lines.map(line => {
    const match = matchCreditToDeposits(line, deposits)
    return {
      dedupe_key: line.dedupeKey,
      amount_rappen: line.amountRappen,
      date: line.date,
      currency: line.currency || 'UNKNOWN',
      direction: line.direction,
      match_class: match.matchClass,
      deposit_ids: match.depositIds,
      bank_ref: line.bankRef,
      review_text: line.reviewText,
      reference: redactStatementText(line.reference || ''),
      remittance: redactStatementText(line.remittance || ''),
      depositor_user_id: depositorFromStatementImport(),
    }
  })
}
