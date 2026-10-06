import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { WALLEE_TWINT_PAYMENT_METHOD_ID } from '~/utils/wallee-fee'
import { stampActiveWalleeCompletionFeeKind } from '~/server/utils/wallee-fee-kind'

const TWINT = WALLEE_TWINT_PAYMENT_METHOD_ID
const STANDARD_METHOD = 1460949183649

function txWithMethod(paymentMethod: number) {
  return {
    state: 'FULFILL',
    paymentConnectorConfiguration: {
      paymentMethodConfiguration: { paymentMethod },
    },
  }
}

function fakeSupabase(initialMetadata: unknown) {
  const updates: Array<Record<string, unknown>> = []
  let reads = 0
  const supabase = {
    from(table: string) {
      if (table !== 'payments') throw new Error(`unexpected table ${table}`)
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => {
                  reads += 1
                  return { data: { metadata: initialMetadata }, error: null }
                },
              }
            },
          }
        },
        update(payload: Record<string, unknown>) {
          updates.push(payload)
          return {
            eq: async () => ({ error: null }),
          }
        },
      }
    },
  }
  return { supabase, updates, get reads() { return reads } }
}

async function stamp(opts: {
  metadata?: unknown
  statusBefore?: string | null
  tx?: unknown
  paymentId?: string
}) {
  const store = fakeSupabase(opts.metadata ?? { foo: 'bar', existing_key: 'value' })
  const payment = { id: opts.paymentId ?? 'pay-1', metadata: opts.metadata ?? { foo: 'bar', existing_key: 'value' } }
  await stampActiveWalleeCompletionFeeKind({
    supabase: store.supabase,
    payment,
    tx: opts.tx === undefined ? txWithMethod(STANDARD_METHOD) : opts.tx,
    spaceId: 1,
    sdkConfig: {},
    statusBefore: opts.statusBefore === undefined ? 'pending' : opts.statusBefore,
  })
  return { ...store, payment }
}

describe('stampActiveWalleeCompletionFeeKind', () => {
  it('stores standard for a non-TWINT payment method id', async () => {
    const { updates } = await stamp({ tx: txWithMethod(STANDARD_METHOD), statusBefore: 'processing' })
    expect(updates).toHaveLength(1)
    expect(updates[0].metadata).toMatchObject({
      foo: 'bar',
      existing_key: 'value',
      wallee_fee_kind: 'standard',
      wallee_payment_method_id: STANDARD_METHOD,
    })
    expect(typeof (updates[0].metadata as { wallee_payment_method_id: unknown }).wallee_payment_method_id).toBe('number')
  })

  it('stores twint for the trusted TWINT payment method id', async () => {
    const { updates } = await stamp({ tx: txWithMethod(TWINT) })
    expect(updates).toHaveLength(1)
    expect(updates[0].metadata).toMatchObject({
      wallee_fee_kind: 'twint',
      wallee_payment_method_id: TWINT,
    })
    expect((updates[0].metadata as { wallee_payment_method_id: unknown }).wallee_payment_method_id).toBe(1457546097639)
  })

  it('keeps existing metadata keys', async () => {
    const { updates } = await stamp({
      metadata: { foo: 'bar', existing_key: 'value', nested_note: 'keep' },
    })
    expect(updates[0].metadata).toMatchObject({
      foo: 'bar',
      existing_key: 'value',
      nested_note: 'keep',
      wallee_fee_kind: 'standard',
      wallee_payment_method_id: STANDARD_METHOD,
    })
  })

  it('does not overwrite an existing standard or twint kind', async () => {
    const standard = await stamp({
      metadata: { foo: 'bar', wallee_fee_kind: 'standard', wallee_payment_method_id: 42 },
      tx: txWithMethod(TWINT),
    })
    expect(standard.updates).toHaveLength(0)

    const twint = await stamp({
      metadata: { existing_key: 'value', wallee_fee_kind: 'twint', wallee_payment_method_id: TWINT },
      tx: txWithMethod(STANDARD_METHOD),
    })
    expect(twint.updates).toHaveLength(0)
  })

  it('does not classify an already completed or paid payment', async () => {
    const completed = await stamp({
      statusBefore: 'completed',
      metadata: { foo: 'bar' },
      tx: txWithMethod(TWINT),
    })
    expect(completed.reads).toBe(0)
    expect(completed.updates).toHaveLength(0)

    const paid = await stamp({
      statusBefore: 'paid',
      metadata: {},
      tx: txWithMethod(STANDARD_METHOD),
    })
    expect(paid.reads).toBe(0)
    expect(paid.updates).toHaveLength(0)
  })

  it('classifies any other positive payment method id as standard', async () => {
    const { updates } = await stamp({ tx: txWithMethod(1) })
    expect(updates[0].metadata).toMatchObject({
      wallee_fee_kind: 'standard',
      wallee_payment_method_id: 1,
    })
  })

  it('does not invent a kind or method id when the transaction has none', async () => {
    const { updates, reads } = await stamp({
      tx: { state: 'FULFILL' },
      metadata: { foo: 'bar', client_wallee_fee_kind: 'twint' },
    })
    expect(reads).toBe(1)
    expect(updates).toHaveLength(0)
  })

  it('ignores a client-supplied kind and uses the transaction method id', async () => {
    const { updates } = await stamp({
      metadata: { wallee_fee_kind: 'twint-please', wallee_payment_method_id: TWINT },
      tx: txWithMethod(STANDARD_METHOD),
    })
    expect(updates[0].metadata).toMatchObject({
      wallee_fee_kind: 'standard',
      wallee_payment_method_id: STANDARD_METHOD,
    })
  })
})

describe('process.post active Wallee completion stamps the fee kind', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/payments/process.post.ts'), 'utf8')

  it('stamps inside the course capture completion and after the generic capture completion', () => {
    const fulfillStart = src.indexOf('async function fulfillOrThrowExistingCourseWalleeCapture')
    const handlerStart = src.indexOf('export default defineEventHandler')
    const fulfillBody = src.slice(fulfillStart, handlerStart)
    expect(fulfillBody.indexOf('const statusBefore = opts.payment?.payment_status')).toBeGreaterThan(0)
    expect(fulfillBody.indexOf('const statusBefore')).toBeLessThan(fulfillBody.indexOf('tryFulfillCourseFromCapturedWalleeTx'))
    expect(fulfillBody).toContain('stampActiveWalleeCompletionFeeKind')

    const genericAt = src.indexOf('await completeCapturedWalleePayment')
    const stampAfter = src.indexOf('stampActiveWalleeCompletionFeeKind', genericAt)
    const returnAfter = src.indexOf("paymentStatus: 'completed'", genericAt)
    expect(genericAt).toBeGreaterThan(handlerStart)
    expect(stampAfter).toBeGreaterThan(genericAt)
    expect(stampAfter).toBeLessThan(returnAfter)
    expect(src.match(/stampActiveWalleeCompletionFeeKind/g)).toHaveLength(3)
  })

  it('does not take the fee kind from the request body', () => {
    expect(src).not.toMatch(/body\.(wallee_fee_kind|wallee_payment_method_id|paymentMethodId)/)
  })
})
