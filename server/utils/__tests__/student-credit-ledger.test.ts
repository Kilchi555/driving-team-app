import { describe, expect, it } from 'vitest'
import { applyStudentCreditDelta, StudentCreditConflict } from '../student-credit-ledger'

function creditClient(options: { failUpdates?: number } = {}) {
  let balance = 0
  let failed = 0
  const transactions: Array<Record<string, unknown>> = []

  const client = {
    from(table: string) {
      if (table === 'student_credits') {
        return {
          select() {
            return {
              eq() {
                return this
              },
              maybeSingle: async () => ({ data: { id: 'credit-1', balance_rappen: balance }, error: null }),
            }
          },
          update(values: { balance_rappen: number }) {
            return {
              eq() { return this },
              select() { return this },
              maybeSingle: async () => {
                if ((options.failUpdates || 0) > failed) {
                  failed += 1
                  balance += 1
                  return { data: null, error: null }
                }
                balance = values.balance_rappen
                return { data: { balance_rappen: balance }, error: null }
              },
            }
          },
          insert() {
            return { select: () => ({ single: async () => ({ data: null, error: { message: 'should not create' } }) }) }
          },
        }
      }
      return {
        insert(row: Record<string, unknown>) {
          const id = `tx-${transactions.length + 1}`
          transactions.push({ ...row, id })
          return { select: () => ({ single: async () => ({ data: { id }, error: null }) }) }
        },
        delete() {
          return {
            eq(column: string, value: string) {
              if (column === 'id') {
                const index = transactions.findIndex((row) => row.id === value)
                if (index >= 0) transactions.splice(index, 1)
              }
              return { eq: async () => ({ error: null }) }
            },
          }
        },
      }
    },
    transactions,
    get balance() { return balance },
  }
  return client
}

const base = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  deltaRappen: 1500,
  transactionType: 'deposit',
  notes: 'Bar erhalten',
  description: 'Manuelle Guthaben-Aufladung',
  referenceType: 'manual',
  referenceId: null,
  createdBy: 'admin-1',
  paymentMethod: 'manual',
}

describe('applyStudentCreditDelta', () => {
  it('writes the ledger and the new balance together', async () => {
    const client = creditClient()
    const result = await applyStudentCreditDelta(client, base)
    expect(result).toMatchObject({ balanceBeforeRappen: 0, balanceAfterRappen: 1500, transactionId: 'tx-1' })
    expect(client.balance).toBe(1500)
    expect(client.transactions).toHaveLength(1)
    expect(client.transactions[0].notes).toBe('Bar erhalten')
  })

  it('drops the ledger row when the balance changed underneath and reports the conflict', async () => {
    const client = creditClient({ failUpdates: 1 })
    await expect(applyStudentCreditDelta(client, { ...base, maxAttempts: 1 })).rejects.toBeInstanceOf(StudentCreditConflict)
    expect(client.transactions).toHaveLength(0)
  })
})
