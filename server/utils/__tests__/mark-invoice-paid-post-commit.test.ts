import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  initialPostCommitStatuses,
  isDownstreamComplete,
  runMarkInvoicePaidPostCommit,
  stepNeedsWork,
} from '../mark-invoice-paid-post-commit'

const tenantId = '11111111-1111-4111-8111-111111111111'
const invoiceId = '22222222-2222-4222-8222-222222222222'
const actorId = '33333333-3333-4333-8333-333333333333'
const userId = '44444444-4444-4444-8444-444444444444'
const paymentId = '55555555-5555-4555-8555-555555555555'

function createSupabaseMock(opts: {
  tracking?: Record<string, any> | null
  trackingUnavailable?: boolean
  payments?: any[]
  creditAppliedRappen?: number
  existingTx?: any
  walletFailOnce?: boolean
  staffPosFailOnce?: boolean
  paymentsSyncFailOnce?: boolean
}) {
  let tracking = opts.tracking === undefined ? null : opts.tracking
  let walletFails = opts.walletFailOnce === true
  let staffFails = opts.staffPosFailOnce === true
  let paymentsFail = opts.paymentsSyncFailOnce === true
  let creditApplied = opts.creditAppliedRappen || 0
  const existingTx = opts.existingTx || null
  const staffPayment = {
    id: paymentId,
    tenant_id: tenantId,
    metadata: { source: 'staff_product_sale' },
  }

  const from = vi.fn((table: string) => {
    if (table === 'invoice_settlement_post_commit') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (opts.trackingUnavailable) {
                  return { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }
                }
                return { data: tracking, error: null }
              },
            }),
          }),
        }),
        insert: (payload: any) => ({
          select: () => ({
            maybeSingle: async () => {
              if (opts.trackingUnavailable) {
                return { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }
              }
              tracking = {
                invoice_id: payload.invoice_id,
                tenant_id: payload.tenant_id,
                payments_sync_status: payload.payments_sync_status,
                staff_pos_status: payload.staff_pos_status,
                wallet_credit_status: payload.wallet_credit_status,
                attempts: 0,
              }
              return { data: tracking, error: null }
            },
          }),
        }),
        update: (patch: any) => ({
          eq: () => ({
            eq: async () => {
              if (tracking) tracking = { ...tracking, ...patch }
              return { data: tracking, error: null }
            },
          }),
        }),
      }
    }

    if (table === 'payments') {
      return {
        update: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => {
                if (paymentsFail) {
                  paymentsFail = false
                  return { error: { message: 'payments_sync_boom' } }
                }
                return { error: null }
              },
            }),
          }),
        }),
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: opts.payments || [staffPayment], error: null }),
          }),
        }),
      }
    }

    if (table === 'invoice_items') {
      return {
        select: () => ({
          eq: () => ({
            not: async () => ({ data: [], error: null }),
            // credit lines
            then: undefined,
          }),
          // for credit_to_wallet path used by applyInvoiceCreditOnPaid
        }),
      }
    }

    if (table === 'invoices') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: invoiceId,
                  user_id: userId,
                  tenant_id: tenantId,
                  payment_status: 'paid',
                  credit_applied_rappen: creditApplied,
                  invoice_number: 'RE-TEST',
                },
                error: null,
              }),
            }),
          }),
        }),
        update: (patch: any) => ({
          eq: () => ({
            eq: () => ({
              eq: async () => {
                if (typeof patch.credit_applied_rappen === 'number') {
                  creditApplied = patch.credit_applied_rappen
                }
                return { error: null }
              },
            }),
          }),
        }),
      }
    }

    if (table === 'credit_transactions') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  eq: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: existingTx, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: async () => {
          if (walletFails) {
            // wallet path fails before insert in our mock orchestration; handled below
          }
          return { error: null }
        },
      }
    }

    if (table === 'student_credits') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'c1', balance_rappen: 0 }, error: null }),
            }),
          }),
        }),
        upsert: async () => {
          if (walletFails) {
            walletFails = false
            return { error: { message: 'wallet_boom' } }
          }
          return { error: null }
        },
      }
    }

    // Default chainable stub
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      not: () => chain,
      is: () => chain,
      neq: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      update: () => chain,
      insert: async () => ({ error: null }),
      upsert: async () => ({ error: null }),
    }
    return chain
  })

  // Specialize invoice_items for credit lines
  const rawFrom = from.getMockImplementation()!
  from.mockImplementation((table: string) => {
    if (table === 'invoice_items') {
      return {
        select: () => ({
          eq: (_col: string, val: any) => {
            if (val === true || _col === 'credit_to_wallet') {
              return Promise.resolve({
                data: [{ credit_to_wallet: true, credit_amount_rappen: 5000 }],
                error: null,
              })
            }
            return {
              not: async () => ({ data: [], error: null }),
              eq: () => Promise.resolve({
                data: [{ credit_to_wallet: true, credit_amount_rappen: 5000 }],
                error: null,
              }),
            }
          },
        }),
      }
    }
    return rawFrom(table)
  })

  return {
    from,
    _state: {
      get tracking() { return tracking },
      get staffFails() { return staffFails },
      setStaffFails(v: boolean) { staffFails = v },
    },
  }
}

describe('post-commit status helpers', () => {
  it('marks all steps not_required for partial payments', () => {
    expect(initialPostCommitStatuses(true)).toEqual({
      payments_sync_status: 'not_required',
      staff_pos_status: 'not_required',
      wallet_credit_status: 'not_required',
    })
    expect(isDownstreamComplete(initialPostCommitStatuses(true))).toBe(true)
  })

  it('requires pending steps for full settlement', () => {
    const s = initialPostCommitStatuses(false)
    expect(stepNeedsWork(s.staff_pos_status)).toBe(true)
    expect(isDownstreamComplete(s)).toBe(false)
  })
})

describe('runMarkInvoicePaidPostCommit recovery', () => {
  it('completes payments, staff-pos, and wallet when all succeed', async () => {
    const supabase = createSupabaseMock({})
    const staffPosRpc = vi.fn(async () => ({ ok: true, credit_applied: true, replayed: false }))

    supabase.from.mockImplementation((table: string) => {
      if (table === 'invoice_items') {
        const creditResult = {
          data: [{ credit_to_wallet: true, credit_amount_rappen: 5000 }],
          error: null,
        }
        return {
          select: () => ({
            eq: (col: string) => {
              if (col === 'invoice_id') {
                return {
                  eq: () => Promise.resolve(creditResult),
                  not: async () => ({ data: [], error: null }),
                }
              }
              return Promise.resolve(creditResult)
            },
          }),
        }
      }
      if (table === 'invoice_settlement_post_commit') {
        let tracking: any = null
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: tracking, error: null }),
              }),
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              maybeSingle: async () => {
                tracking = { ...payload, attempts: 0 }
                return { data: tracking, error: null }
              },
            }),
          }),
          update: (patch: any) => ({
            eq: () => ({
              eq: async () => {
                tracking = { ...(tracking || {}), ...patch }
                return { error: null }
              },
            }),
          }),
        }
      }
      if (table === 'payments') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => ({
                in: async () => ({ error: null }),
              }),
            }),
          }),
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [{ id: paymentId, tenant_id: tenantId, metadata: { source: 'staff_product_sale' } }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'invoices') {
        let creditApplied = 0
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: invoiceId,
                    user_id: userId,
                    tenant_id: tenantId,
                    payment_status: 'paid',
                    credit_applied_rappen: creditApplied,
                    invoice_number: 'RE-1',
                  },
                  error: null,
                }),
              }),
            }),
          }),
          update: (patch: any) => ({
            eq: () => ({
              eq: () => ({
                eq: async () => {
                  if (patch.credit_applied_rappen) creditApplied = patch.credit_applied_rappen
                  return { error: null }
                },
              }),
            }),
          }),
        }
      }
      if (table === 'credit_transactions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => ({
                    eq: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: null, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: async () => ({ error: null }),
        }
      }
      if (table === 'student_credits') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { balance_rappen: 0 }, error: null }),
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        }
      }
      return createSupabaseMock({}).from(table)
    })

    const result = await runMarkInvoicePaidPostCommit({
      supabase,
      invoiceId,
      tenantId,
      actorUserId: actorId,
      userId,
      isPartial: false,
      paidAt: new Date().toISOString(),
      now: new Date().toISOString(),
      resumedFromAlreadySettled: false,
      staffPosRpc,
    })

    expect(result.downstream_complete).toBe(true)
    expect(result.payments_sync.status).toBe('completed')
    expect(result.staff_pos.status).toBe('completed')
    expect(result.wallet_credit.status).toBe('completed')
    expect(staffPosRpc).toHaveBeenCalledTimes(1)
  })

  it('resumes staff-pos after failure without re-requiring core settlement', async () => {
    let staffCalls = 0
    let tracking: any = {
      invoice_id: invoiceId,
      tenant_id: tenantId,
      payments_sync_status: 'completed',
      staff_pos_status: 'failed',
      wallet_credit_status: 'completed',
      attempts: 1,
    }

    const supabase: any = {
      from: (table: string) => {
        if (table === 'invoice_settlement_post_commit') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: tracking, error: null }),
                }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => ({
                eq: async () => {
                  tracking = { ...tracking, ...patch }
                  return { error: null }
                },
              }),
            }),
          }
        }
        if (table === 'payments') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: paymentId, tenant_id: tenantId, metadata: { source: 'staff_product_sale' } }],
                  error: null,
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    const staffPosRpc = vi.fn(async () => {
      staffCalls += 1
      return { ok: true, credit_applied: true, replayed: staffCalls > 1, credit_rappen: 100 }
    })

    const result = await runMarkInvoicePaidPostCommit({
      supabase,
      invoiceId,
      tenantId,
      actorUserId: actorId,
      userId,
      isPartial: false,
      paidAt: new Date().toISOString(),
      now: new Date().toISOString(),
      resumedFromAlreadySettled: true,
      staffPosRpc,
    })

    expect(result.resumed_from_already_settled).toBe(true)
    expect(result.payments_sync.status).toBe('completed')
    expect(result.wallet_credit.status).toBe('completed')
    expect(result.staff_pos.status).toBe('completed')
    expect(result.downstream_complete).toBe(true)
    expect(staffPosRpc).toHaveBeenCalledTimes(1)
    expect(tracking.staff_pos_status).toBe('completed')
  })

  it('does not re-run completed staff-pos when only wallet failed', async () => {
    let tracking: any = {
      invoice_id: invoiceId,
      tenant_id: tenantId,
      payments_sync_status: 'completed',
      staff_pos_status: 'completed',
      wallet_credit_status: 'failed',
      attempts: 1,
    }

    const supabase: any = {
      from: (table: string) => {
        if (table === 'invoice_settlement_post_commit') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: tracking, error: null }),
                }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => ({
                eq: async () => {
                  tracking = { ...tracking, ...patch }
                  return { error: null }
                },
              }),
            }),
          }
        }
        if (table === 'invoices') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: invoiceId,
                      user_id: userId,
                      tenant_id: tenantId,
                      payment_status: 'paid',
                      credit_applied_rappen: 0,
                      invoice_number: 'RE-1',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'credit_transactions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    in: () => ({
                      eq: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
            insert: async () => ({ error: null }),
          }
        }
        if (table === 'student_credits') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { balance_rappen: 0 }, error: null }),
                }),
              }),
            }),
            upsert: async () => ({ error: null }),
          }
        }
        if (table === 'invoice_items') {
          return {
            select: () => ({
              eq: (col: string) => {
                if (col === 'invoice_id') {
                  return {
                    eq: () => Promise.resolve({
                      data: [{ credit_to_wallet: true, credit_amount_rappen: 2500 }],
                      error: null,
                    }),
                  }
                }
                return Promise.resolve({
                  data: [{ credit_to_wallet: true, credit_amount_rappen: 2500 }],
                  error: null,
                })
              },
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      },
    }

    const staffPosRpc = vi.fn()
    const result = await runMarkInvoicePaidPostCommit({
      supabase,
      invoiceId,
      tenantId,
      actorUserId: actorId,
      userId,
      isPartial: false,
      paidAt: new Date().toISOString(),
      now: new Date().toISOString(),
      resumedFromAlreadySettled: true,
      staffPosRpc,
    })

    expect(staffPosRpc).not.toHaveBeenCalled()
    expect(result.staff_pos.status).toBe('completed')
    expect(result.wallet_credit.status).toBe('completed')
    expect(result.downstream_complete).toBe(true)
  })

  it('skips all downstream work for partial payments', async () => {
    const staffPosRpc = vi.fn()
    const supabase: any = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        insert: (payload: any) => ({
          select: () => ({
            maybeSingle: async () => ({ data: { ...payload, attempts: 0 }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }

    const result = await runMarkInvoicePaidPostCommit({
      supabase,
      invoiceId,
      tenantId,
      actorUserId: actorId,
      userId,
      isPartial: true,
      paidAt: new Date().toISOString(),
      now: new Date().toISOString(),
      resumedFromAlreadySettled: false,
      staffPosRpc,
    })

    expect(result.downstream_complete).toBe(true)
    expect(result.payments_sync.status).toBe('not_required')
    expect(result.staff_pos.status).toBe('not_required')
    expect(result.wallet_credit.status).toBe('not_required')
    expect(staffPosRpc).not.toHaveBeenCalled()
  })

  it('still runs idempotent side effects when tracking table is unavailable', async () => {
    const staffPosRpc = vi.fn(async () => ({ ok: true, credit_applied: true, replayed: true }))
    const supabase: any = {
      from: (table: string) => {
        if (table === 'invoice_settlement_post_commit') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { code: 'PGRST205', message: 'Could not find the table' },
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'payments') {
          return {
            update: () => ({
              eq: () => ({
                eq: () => ({
                  in: async () => ({ error: null }),
                }),
              }),
            }),
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [], error: null }),
              }),
            }),
          }
        }
        if (table === 'invoice_items') {
          return {
            select: () => ({
              eq: () => ({
                not: async () => ({ data: [], error: null }),
              }),
            }),
          }
        }
        if (table === 'invoices') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: invoiceId,
                      user_id: userId,
                      tenant_id: tenantId,
                      payment_status: 'paid',
                      credit_applied_rappen: 100,
                      invoice_number: 'RE-1',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(table)
      },
    }

    const result = await runMarkInvoicePaidPostCommit({
      supabase,
      invoiceId,
      tenantId,
      actorUserId: actorId,
      userId,
      isPartial: false,
      paidAt: new Date().toISOString(),
      now: new Date().toISOString(),
      resumedFromAlreadySettled: true,
      staffPosRpc,
    })

    expect(result.tracking_unavailable).toBe(true)
    expect(result.payments_sync.status).toBe('completed')
    expect(result.staff_pos.status).toBe('completed')
    expect(result.wallet_credit.status).toBe('completed')
  })
})

describe('independent step failure isolation', () => {
  it('keeps wallet pending/failed when staff-pos fails and does not mark workflow complete', async () => {
    let tracking: any = {
      invoice_id: invoiceId,
      tenant_id: tenantId,
      payments_sync_status: 'completed',
      staff_pos_status: 'pending',
      wallet_credit_status: 'pending',
      attempts: 0,
    }

    const supabase: any = {
      from: (table: string) => {
        if (table === 'invoice_settlement_post_commit') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: tracking, error: null }),
                }),
              }),
            }),
            update: (patch: any) => ({
              eq: () => ({
                eq: async () => {
                  tracking = { ...tracking, ...patch }
                  return { error: null }
                },
              }),
            }),
          }
        }
        if (table === 'payments') {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: paymentId, tenant_id: tenantId, metadata: { source: 'staff_product_sale' } }],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'invoices') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: invoiceId,
                      user_id: userId,
                      tenant_id: tenantId,
                      payment_status: 'paid',
                      credit_applied_rappen: 0,
                      invoice_number: 'RE-1',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'credit_transactions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    in: () => ({
                      eq: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: null, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
            insert: async () => ({ error: null }),
          }
        }
        if (table === 'student_credits') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { balance_rappen: 0 }, error: null }),
                }),
              }),
            }),
            upsert: async () => ({ error: null }),
          }
        }
        if (table === 'invoice_items') {
          return {
            select: () => ({
              eq: (col: string) => {
                if (col === 'invoice_id') {
                  return {
                    eq: () => Promise.resolve({
                      data: [{ credit_to_wallet: true, credit_amount_rappen: 1000 }],
                      error: null,
                    }),
                  }
                }
                return Promise.resolve({
                  data: [{ credit_to_wallet: true, credit_amount_rappen: 1000 }],
                  error: null,
                })
              },
            }),
          }
        }
        throw new Error(table)
      },
    }

    const staffPosRpc = vi.fn(async () => {
      throw new Error('staff_pos_boom')
    })

    const result = await runMarkInvoicePaidPostCommit({
      supabase,
      invoiceId,
      tenantId,
      actorUserId: actorId,
      userId,
      isPartial: false,
      paidAt: new Date().toISOString(),
      now: new Date().toISOString(),
      resumedFromAlreadySettled: false,
      staffPosRpc,
    })

    expect(result.staff_pos.status).toBe('failed')
    expect(result.wallet_credit.status).toBe('completed')
    expect(result.downstream_complete).toBe(false)
    expect(tracking.staff_pos_status).toBe('failed')
    expect(tracking.wallet_credit_status).toBe('completed')
  })
})

describe('handler wiring for post-commit resume', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/invoices/mark-invoice-paid.post.ts'), 'utf8')
  const migration = readFileSync(resolve(process.cwd(), 'migrations/20261011_invoice_settlement_post_commit.sql'), 'utf8')

  it('resumes post-commit on already_settled and does not skip via alreadySettled guard', () => {
    expect(src).toContain('runMarkInvoicePaidPostCommit')
    expect(src).toContain('resumedFromAlreadySettled: alreadySettled')
    expect(src).toContain('downstream_complete')
    expect(src).not.toContain('if (!alreadySettled && !settledIsPartial)')
    expect(src).toContain("rpc('mark_invoice_paid_core'")
    expect(src).not.toContain('Fallback when migration is not yet applied')
  })

  it('ships durable tracking migration without applying it here', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.invoice_settlement_post_commit')
    expect(migration).toContain('credit_transactions_invoice_deposit_uidx')
    expect(migration).toContain('NOT applied by this PR')
  })
})
