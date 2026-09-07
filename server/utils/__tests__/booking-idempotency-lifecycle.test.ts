import { describe, expect, it } from 'vitest'
import {
  abortInvalidatesSuccessReplay,
  abortedIdempotencyPatch,
  decideIdempotencyReplay,
} from '../booking-idempotency-lifecycle'

const successSnapshot = {
  replayed: false,
  appointment: { id: 'appt-1', status: 'confirmed' },
  payment: { id: 'pay-1', payment_status: 'pending' },
}

describe('booking idempotency lifecycle (blocker 4)', () => {
  it('successful completed key replays the stored snapshot', () => {
    expect(decideIdempotencyReplay({
      status: 'completed',
      snapshot: successSnapshot,
    })).toEqual({ kind: 'replay_success', snapshot: successSnapshot })
  })

  it('failure before completion does not replay success', () => {
    expect(decideIdempotencyReplay({ status: 'claiming' }).kind).toBe('retry_create')
    expect(decideIdempotencyReplay({ status: 'failed', snapshot: successSnapshot }).kind)
      .toBe('retry_create')
  })

  it('abort patch clears the success snapshot and marks failed', () => {
    const patch = abortedIdempotencyPatch('2026-09-07T08:00:00.000Z')
    expect(patch.status).toBe('failed')
    expect(patch.response_snapshot).toBeNull()
    expect(abortInvalidatesSuccessReplay({
      status: patch.status,
      snapshot: patch.response_snapshot,
    })).toBe(true)
  })

  it('replay after abort cannot return the aborted booking as successful', () => {
    const afterAbort = abortedIdempotencyPatch()
    const replay = decideIdempotencyReplay({
      status: afterAbort.status,
      snapshot: afterAbort.response_snapshot ?? successSnapshot,
    })
    expect(replay.kind).toBe('retry_create')
    expect(replay).not.toEqual({ kind: 'replay_success', snapshot: successSnapshot })
  })

  it('retry after abort is allowed to create a new transaction (same key, failed status)', () => {
    expect(decideIdempotencyReplay({ status: 'failed' })).toEqual({ kind: 'retry_create' })
  })
})
