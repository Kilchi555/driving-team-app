import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isWalleeCaptureBelowRemaining,
  isWalleeCaptureMatchingRemaining,
  walleeRemainingChf,
  walleeRemainingRappen,
} from '../wallee-remaining-amount'

const partial = {
  total_amount_rappen: 10000,
  credit_used_rappen: 4000,
  payment_status: 'pending',
}

describe('wallee remaining payable', () => {
  it('1. remaining after partial credit is 60 CHF', () => {
    expect(walleeRemainingRappen(partial)).toBe(6000)
    expect(walleeRemainingChf(partial)).toBe(60)
    expect(isWalleeCaptureMatchingRemaining(60, partial)).toBe(true)
    expect(isWalleeCaptureBelowRemaining(60, partial)).toBe(false)
  })

  it('2. full pre-credit total is not the expected capture', () => {
    expect(walleeRemainingChf(partial)).not.toBe(100)
    expect(isWalleeCaptureMatchingRemaining(100, partial)).toBe(false)
    expect(isWalleeCaptureBelowRemaining(100, partial)).toBe(false)
  })

  it('3/4. create-transaction amounts: 60 with credit, 100 without', () => {
    expect(walleeRemainingChf(partial)).toBe(60)
    expect(walleeRemainingChf({
      total_amount_rappen: 10000,
      credit_used_rappen: 0,
      payment_status: 'pending',
    })).toBe(100)
  })

  it('5. full credit remaining is 0', () => {
    expect(walleeRemainingRappen({
      total_amount_rappen: 10000,
      credit_used_rappen: 10000,
      payment_status: 'pending',
    })).toBe(0)
  })

  it('7. convert-to-online CHF amount is remaining, not rappen', () => {
    expect(walleeRemainingChf({
      total_amount_rappen: 10000,
      credit_used_rappen: 4000,
    })).toBe(60)
    expect(walleeRemainingChf({
      total_amount_rappen: 10000,
      credit_used_rappen: 4000,
    })).not.toBe(10000)
    expect(walleeRemainingChf({
      total_amount_rappen: 10000,
      credit_used_rappen: 4000,
    })).not.toBe(6000)
  })
})

describe('wallee remaining source contract', () => {
  it('webhook compares capture to remaining, not pre-credit total', () => {
    const webhook = readFileSync(resolve(process.cwd(), 'server/api/wallee/webhook.post.ts'), 'utf8')
    expect(webhook).toContain('isWalleeCaptureMatchingRemaining')
    expect(webhook).not.toContain('const expectedChf = Number(p.total_amount_rappen || 0) / 100')
    expect(webhook).toContain("error: 'Captured amount does not match remaining payable'")
    expect(webhook).toContain('setResponseStatus(event, 503)')
  })

  it('create-transaction and convert-to-online charge remaining CHF', () => {
    const create = readFileSync(resolve(process.cwd(), 'server/api/wallee/create-transaction.post.ts'), 'utf8')
    expect(create).toContain('walleeRemainingChf')
    expect(create).toContain('walleeRemainingRappen')
    expect(create).toContain("message: 'Ungültiger Zahlungsbetrag'")
    expect(create).toContain('const amount = serverAmountChf')
    const convert = readFileSync(resolve(process.cwd(), 'server/api/payments/convert-to-online.post.ts'), 'utf8')
    expect(convert).toContain('amount: walleeRemainingChf(payment)')
    expect(convert).not.toContain('amount: payment.total_amount_rappen')
  })
})
