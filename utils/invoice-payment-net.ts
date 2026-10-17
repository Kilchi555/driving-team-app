export interface InvoicePaymentHistoryRow {
  amount_rappen: number
  status?: string | null
}

/** Completed receipts count positive. A reversal is stored positive and counts negative. */
export function signedInvoicePaymentRappen(row: InvoicePaymentHistoryRow): number {
  const amount = Math.abs(row.amount_rappen || 0)
  if (row.status === 'reversal') return -amount
  if (row.status === 'completed') return amount
  return 0
}

export function netInvoicePaymentsRappen(rows: InvoicePaymentHistoryRow[]): number {
  return rows.reduce((sum, row) => sum + signedInvoicePaymentRappen(row), 0)
}

export function invoicePaymentHistoryLabel(status?: string | null): string {
  if (status === 'reversal') return 'Korrektur'
  if (status === 'completed') return 'Bezahlt'
  if (status === 'refunded') return 'Erstattet'
  if (status === 'failed') return 'Fehlgeschlagen'
  if (status === 'pending') return 'Offen'
  return 'Offen'
}
