/**
 * Online-booking idempotency lifecycle.
 *
 * book_online_appointment marks the key `completed` and stores a success
 * snapshot inside the RPC. Post-RPC work (discount/gift-card lock) can still
 * fail; abortCheckoutAfterBenefitLockFail then cancels the rows and MUST
 * transition the key to `failed` with a cleared snapshot.
 *
 * Replay of the same key:
 *   completed → return the stored success snapshot (true idempotency)
 *   claiming / failed → do not return success; a retry may create a new txn
 */

export type BookingIdempotencyStatus = 'claiming' | 'completed' | 'failed'

export type IdempotencyReplayDecision =
  | { kind: 'replay_success'; snapshot: unknown }
  | { kind: 'retry_create' }

export function decideIdempotencyReplay(opts: {
  status: string | null | undefined
  snapshot?: unknown
}): IdempotencyReplayDecision {
  if (opts.status === 'completed') {
    return { kind: 'replay_success', snapshot: opts.snapshot }
  }
  return { kind: 'retry_create' }
}

export function abortedIdempotencyPatch(nowIso = new Date().toISOString()) {
  return {
    status: 'failed' as const,
    response_snapshot: null,
    updated_at: nowIso,
  }
}

export function releasedSlotPatch(nowIso = new Date().toISOString()) {
  return {
    is_available: true,
    appointment_id: null,
    reserved_by_session: null,
    reserved_until: null,
    updated_at: nowIso,
  }
}

export function abortInvalidatesSuccessReplay(opts: {
  status: string | null | undefined
  snapshot: unknown
}): boolean {
  return opts.status !== 'completed' && decideIdempotencyReplay(opts).kind !== 'replay_success'
}
