/**
 * Source-row snapshot + restore for SARI course transfers.
 * The endpoint cannot wrap cancel+insert in one Postgres transaction via PostgREST,
 * so any target-insert failure must restore the exact pre-transfer source row
 * and verify that restore before returning an error.
 */

export type TransferSourceSnapshot = {
  id: string
  payment_id: string | null
  status: string
  deleted_at: string | null
  notes: string | null
}

export function snapshotTransferSource(row: {
  id: string
  payment_id?: string | null
  status: string
  deleted_at?: string | null
  notes?: string | null
}): TransferSourceSnapshot {
  return {
    id: row.id,
    payment_id: row.payment_id ?? null,
    status: row.status,
    deleted_at: row.deleted_at ?? null,
    notes: row.notes ?? null,
  }
}

export function transferSourceRestorePatch(snapshot: TransferSourceSnapshot, updatedAt: string) {
  return {
    payment_id: snapshot.payment_id,
    status: snapshot.status,
    deleted_at: snapshot.deleted_at,
    notes: snapshot.notes,
    updated_at: updatedAt,
  }
}

export function transferSourceMatchesSnapshot(
  current: {
    payment_id?: string | null
    status?: string | null
    deleted_at?: string | null
    notes?: string | null
  } | null | undefined,
  snapshot: TransferSourceSnapshot,
): boolean {
  if (!current) return false
  return (current.payment_id ?? null) === snapshot.payment_id
    && current.status === snapshot.status
    && (current.deleted_at ?? null) === snapshot.deleted_at
    && (current.notes ?? null) === snapshot.notes
}

export async function restoreTransferredSource(opts: {
  supabase: { from: (table: string) => any }
  snapshot: TransferSourceSnapshot
  updatedAt: string
}): Promise<{ ok: true } | { ok: false; reason: 'update_failed' | 'verify_failed' }> {
  const patch = transferSourceRestorePatch(opts.snapshot, opts.updatedAt)
  const { error } = await opts.supabase
    .from('course_registrations')
    .update(patch)
    .eq('id', opts.snapshot.id)

  if (error) return { ok: false, reason: 'update_failed' }

  const { data: current } = await opts.supabase
    .from('course_registrations')
    .select('payment_id, status, deleted_at, notes')
    .eq('id', opts.snapshot.id)
    .maybeSingle()

  if (!transferSourceMatchesSnapshot(current, opts.snapshot)) {
    return { ok: false, reason: 'verify_failed' }
  }
  return { ok: true }
}

export const TRANSFER_SOURCE_RESTORE_FATAL =
  'Umplanung fehlgeschlagen und die ursprüngliche Anmeldung konnte nicht wiederhergestellt werden. Bitte Support kontaktieren.'
