/**
 * Maps a settlement RPC failure to an HTTP error.
 * A null payload is a failure. It is not an empty sibling list.
 * The RPC body owns the transaction; this function does not write.
 */
export function settlementFailure(
  error: { message?: string; code?: string } | null | undefined,
  data: unknown,
  notFoundMessage = 'Zahlung nicht gefunden',
): { statusCode: number; statusMessage: string } | null {
  if (!error && data != null && typeof data === 'object' && (data as { ok?: boolean }).ok === true) {
    return null
  }

  const message = String(error?.message || '')
  if (message.includes('invalid_idempotency_key')) {
    return { statusCode: 400, statusMessage: 'Zahlungsaktion ist ungültig' }
  }
  if (message.includes('idempotency_amount_mismatch')) {
    return {
      statusCode: 409,
      statusMessage: 'Diese Zahlungsaktion wurde bereits mit einem anderen Betrag verarbeitet.',
    }
  }
  if (message.includes('duplicate_bank_import') || error?.code === '23505') {
    return {
      statusCode: 409,
      statusMessage: 'Diese Bank-Transaktion wurde bereits importiert und verbucht.',
    }
  }
  if (message.includes('staff_pos_payment')) {
    return {
      statusCode: 409,
      statusMessage: 'Staff-POS-Zahlungen werden nicht über diesen Abschluss verbucht.',
    }
  }
  if (message.includes('forbidden')) {
    return { statusCode: 403, statusMessage: 'Forbidden' }
  }
  if (
    message.includes('payment_not_found')
    || message.includes('invoice_not_found')
    || message.includes('invoice_not_in_tenant')
  ) {
    return { statusCode: 404, statusMessage: notFoundMessage }
  }
  return { statusCode: 500, statusMessage: 'Fehler beim Aktualisieren der Zahlung' }
}
