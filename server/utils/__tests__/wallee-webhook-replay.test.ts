import { describe, expect, it } from 'vitest'
import {
  classifyWalleeWebhookTimestamp,
  parseWalleeWebhookTimestamp,
  shouldShortCircuitWalleeWebhook,
  WALLEE_WEBHOOK_MAX_AGE_MS,
  WALLEE_WEBHOOK_MAX_FUTURE_MS
} from '../wallee-webhook-replay'

const now = new Date('2026-09-01T10:00:00.000Z')

describe('parseWalleeWebhookTimestamp', () => {
  it('parses ISO strings', () => {
    expect(parseWalleeWebhookTimestamp('2026-09-01T10:00:00.000Z')?.toISOString()).toBe(
      '2026-09-01T10:00:00.000Z'
    )
  })

  it('parses unix seconds and milliseconds', () => {
    const iso = '2026-09-01T10:00:00.000Z'
    const ms = Date.parse(iso)
    expect(parseWalleeWebhookTimestamp(ms)?.toISOString()).toBe(iso)
    expect(parseWalleeWebhookTimestamp(ms / 1000)?.toISOString()).toBe(iso)
  })

  it('returns null for garbage', () => {
    expect(parseWalleeWebhookTimestamp('not-a-date')).toBeNull()
    expect(parseWalleeWebhookTimestamp(null)).toBeNull()
  })
})

describe('classifyWalleeWebhookTimestamp', () => {
  it('marks missing timestamps', () => {
    expect(classifyWalleeWebhookTimestamp(undefined, now)).toBe('missing')
  })

  it('accepts a fresh event', () => {
    expect(classifyWalleeWebhookTimestamp(now.toISOString(), now)).toBe('ok')
  })

  it('marks events older than 15 minutes as stale', () => {
    const old = new Date(now.getTime() - WALLEE_WEBHOOK_MAX_AGE_MS - 1000)
    expect(classifyWalleeWebhookTimestamp(old.toISOString(), now)).toBe('stale')
  })

  it('marks clocks more than 5 minutes in the future', () => {
    const future = new Date(now.getTime() + WALLEE_WEBHOOK_MAX_FUTURE_MS + 1000)
    expect(classifyWalleeWebhookTimestamp(future.toISOString(), now)).toBe('future')
  })
})

describe('shouldShortCircuitWalleeWebhook', () => {
  it('skips a state that already succeeded', () => {
    expect(
      shouldShortCircuitWalleeWebhook({
        timeClass: 'ok',
        alreadyProcessedSameState: true,
        isInternal: false
      })
    ).toEqual({ skip: true, reason: 'already_processed' })
  })

  it('still processes a stale first delivery so Wallee retries are not dropped', () => {
    expect(
      shouldShortCircuitWalleeWebhook({
        timeClass: 'stale',
        alreadyProcessedSameState: false,
        isInternal: false
      })
    ).toEqual({ skip: false })
  })

  it('skips impossible future timestamps unless internal', () => {
    expect(
      shouldShortCircuitWalleeWebhook({
        timeClass: 'future',
        alreadyProcessedSameState: false,
        isInternal: false
      })
    ).toEqual({ skip: true, reason: 'future_timestamp' })
    expect(
      shouldShortCircuitWalleeWebhook({
        timeClass: 'future',
        alreadyProcessedSameState: false,
        isInternal: true
      })
    ).toEqual({ skip: false })
  })
})
