import { describe, expect, it, vi } from 'vitest'
import {
  claimVoucherFulfillment,
  fixedVoucherFulfillmentKey,
  isUniqueViolation,
} from '../voucher-fulfillment-claim'
import {
  CUSTOM_VOUCHER_QTY_ONE_MESSAGE,
  clampCustomVoucherCartQuantity,
  customVoucherFulfillmentKey,
  parseExactCustomVoucherQuantity,
} from '~/utils/shop-custom-voucher'

const PAYMENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const TENANT = '11111111-1111-4111-8111-111111111111'
const PRODUCT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PRODUCT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function baseInput(overrides: Partial<Parameters<typeof claimVoucherFulfillment>[1]> = {}) {
  return {
    code: 'VG-TEST-001',
    name: 'Gutschein 50',
    description: '[custom-voucher:x]',
    amount_rappen: 5000,
    payment_id: PAYMENT,
    tenant_id: TENANT,
    fulfillment_key: customVoucherFulfillmentKey(PRODUCT_A),
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  }
}

describe('parseExactCustomVoucherQuantity / clamp', () => {
  it('accepts exact integer 1 and optional missing as 1', () => {
    expect(parseExactCustomVoucherQuantity(1)).toEqual({ ok: true, quantity: 1 })
    expect(parseExactCustomVoucherQuantity(undefined)).toEqual({ ok: true, quantity: 1 })
    expect(parseExactCustomVoucherQuantity(null)).toEqual({ ok: true, quantity: 1 })
    expect(parseExactCustomVoucherQuantity('')).toEqual({ ok: true, quantity: 1 })
  })

  it('rejects malformed / excessive / negative quantities', () => {
    for (const raw of [0, 2, -1, 1.5, '2', '1.0', true, false, {}, NaN, Infinity, 'abc']) {
      const parsed = parseExactCustomVoucherQuantity(raw)
      expect(parsed.ok).toBe(false)
      if (!parsed.ok) expect(parsed.message).toBe(CUSTOM_VOUCHER_QTY_ONE_MESSAGE)
    }
  })

  it('required mode rejects missing quantity', () => {
    expect(parseExactCustomVoucherQuantity(undefined, { required: true }).ok).toBe(false)
  })

  it('clampCustomVoucherCartQuantity forces custom vouchers to 1', () => {
    const custom = { is_voucher: true, allow_custom_amount: true }
    expect(clampCustomVoucherCartQuantity(custom, 5)).toBe(1)
    expect(clampCustomVoucherCartQuantity(custom, 0)).toBe(1)
    expect(clampCustomVoucherCartQuantity({ is_voucher: true, allow_custom_amount: false }, 3)).toBe(3)
  })
})

describe('fulfillment key identity', () => {
  it('keeps distinct product lines on distinct keys even with identical display name/amount', () => {
    const a = fixedVoucherFulfillmentKey(PRODUCT_A, 0)
    const b = fixedVoucherFulfillmentKey(PRODUCT_B, 0)
    expect(a).not.toBe(b)
    expect(a).toBe(`voucher:${PRODUCT_A}:line:0`)
    expect(customVoucherFulfillmentKey(PRODUCT_A)).toBe(`custom-voucher:${PRODUCT_A}`)
    expect(customVoucherFulfillmentKey(PRODUCT_A)).not.toBe(fixedVoucherFulfillmentKey(PRODUCT_A, 0))
  })
})

describe('isUniqueViolation', () => {
  it('detects postgres 23505 and index name', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ message: 'duplicate key value violates unique constraint "idx_vouchers_payment_fulfillment_key_unique"' })).toBe(true)
    expect(isUniqueViolation({ code: '23503', message: 'fk' })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})

describe('claimVoucherFulfillment', () => {
  it('returns claimed=true on successful insert', async () => {
    const insert = vi.fn(async () => ({
      data: { id: 'v1', code: 'VG-TEST-001' },
      error: null,
    }))
    const supabase = {
      from: vi.fn(() => ({
        insert: (payload: unknown) => {
          expect(payload).toMatchObject({
            payment_id: PAYMENT,
            fulfillment_key: customVoucherFulfillmentKey(PRODUCT_A),
            tenant_id: TENANT,
          })
          return {
            select: () => ({
              single: insert,
            }),
          }
        },
      })),
    }

    const result = await claimVoucherFulfillment(supabase, baseInput())
    expect(result).toEqual({ claimed: true, voucher: { id: 'v1', code: 'VG-TEST-001' } })
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('treats 23505 as already claimed and loads existing row by payment+key', async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "idx_vouchers_payment_fulfillment_key_unique"' },
    }))
    const maybeSingle = vi.fn(async () => ({
      data: { id: 'v-winner', code: 'VG-WINNER' },
      error: null,
    }))
    const eq = vi.fn(function (this: { _eq: unknown[] }, col: string, val: string) {
      this._eq.push([col, val])
      return this
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'vouchers') throw new Error(`unexpected table ${table}`)
        return {
          insert: () => ({
            select: () => ({ single: insert }),
          }),
          select: () => {
            const chain: {
              _eq: Array<[string, string]>
              eq: (col: string, val: string) => unknown
              maybeSingle: typeof maybeSingle
            } = { _eq: [], eq: () => chain, maybeSingle }
            chain.eq = eq.bind(chain)
            return chain
          },
        }
      }),
    }

    const result = await claimVoucherFulfillment(supabase, baseInput({ code: 'VG-LOSER' }))
    expect(result).toEqual({ claimed: false, voucher: { id: 'v-winner', code: 'VG-WINNER' } })
    expect(eq).toHaveBeenCalledWith('payment_id', PAYMENT)
    expect(eq).toHaveBeenCalledWith('fulfillment_key', customVoucherFulfillmentKey(PRODUCT_A))
  })

  it('simulated concurrent claims: only one claimed=true for same payment+key', async () => {
    const rows = new Map<string, { id: string; code: string; payment_id: string; fulfillment_key: string }>()
    let idSeq = 0

    const supabase = {
      from: () => ({
        insert: (payload: {
          code: string
          payment_id: string
          fulfillment_key: string
        }) => ({
          select: () => ({
            single: async () => {
              const key = `${payload.payment_id}::${payload.fulfillment_key}`
              if (rows.has(key)) {
                return {
                  data: null,
                  error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                }
              }
              idSeq += 1
              const row = {
                id: `v-${idSeq}`,
                code: payload.code,
                payment_id: payload.payment_id,
                fulfillment_key: payload.fulfillment_key,
              }
              rows.set(key, row)
              return { data: { id: row.id, code: row.code }, error: null }
            },
          }),
        }),
        select: () => {
          const filters: Record<string, string> = {}
          const chain = {
            eq: (col: string, val: string) => {
              filters[col] = val
              return chain
            },
            maybeSingle: async () => {
              const key = `${filters.payment_id}::${filters.fulfillment_key}`
              const row = rows.get(key)
              return { data: row ? { id: row.id, code: row.code } : null, error: null }
            },
          }
          return chain
        },
      }),
    }

    const keyA = customVoucherFulfillmentKey(PRODUCT_A)
    const keyB = fixedVoucherFulfillmentKey(PRODUCT_B, 0)

    const [c1, c2, c3] = await Promise.all([
      claimVoucherFulfillment(supabase, baseInput({ code: 'A1', fulfillment_key: keyA })),
      claimVoucherFulfillment(supabase, baseInput({ code: 'A2', fulfillment_key: keyA })),
      claimVoucherFulfillment(supabase, baseInput({
        code: 'B1',
        name: 'Gutschein 50', // same display name+amount as custom — must NOT collide
        amount_rappen: 5000,
        fulfillment_key: keyB,
      })),
    ])

    const claimed = [c1, c2, c3].filter(r => r.claimed)
    const duplicates = [c1, c2, c3].filter(r => !r.claimed && r.voucher)
    expect(claimed).toHaveLength(2) // one for keyA, one for keyB
    expect(duplicates).toHaveLength(1) // loser on keyA
    expect(rows.size).toBe(2)
    expect([...rows.keys()].sort()).toEqual([
      `${PAYMENT}::${keyA}`,
      `${PAYMENT}::${keyB}`,
    ].sort())
  })

  it('does not treat distinct keys as duplicates when names/amounts match', async () => {
    const inserted: string[] = []
    const supabase = {
      from: () => ({
        insert: (payload: { fulfillment_key: string; code: string }) => ({
          select: () => ({
            single: async () => {
              inserted.push(payload.fulfillment_key)
              return { data: { id: `id-${inserted.length}`, code: payload.code }, error: null }
            },
          }),
        }),
      }),
    }

    const first = await claimVoucherFulfillment(supabase, baseInput({
      name: 'Gutschein 50',
      amount_rappen: 5000,
      fulfillment_key: fixedVoucherFulfillmentKey(PRODUCT_A, 0),
      code: 'V1',
    }))
    const second = await claimVoucherFulfillment(supabase, baseInput({
      name: 'Gutschein 50',
      amount_rappen: 5000,
      fulfillment_key: fixedVoucherFulfillmentKey(PRODUCT_B, 0),
      code: 'V2',
    }))

    expect(first.claimed).toBe(true)
    expect(second.claimed).toBe(true)
    expect(inserted).toEqual([
      fixedVoucherFulfillmentKey(PRODUCT_A, 0),
      fixedVoucherFulfillmentKey(PRODUCT_B, 0),
    ])
  })
})
