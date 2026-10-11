import { describe, expect, it, vi } from 'vitest'
import { callCreateInvoiceWithSettlement } from '../invoice-create-rpc'

type RpcClient = { rpc: (...args: unknown[]) => Promise<{ data: unknown; error: { message: string; code?: string } | null }> }

describe('callCreateInvoiceWithSettlement', () => {
  it('maps successful RPC payload', async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        invoice_id: 'inv-1',
        invoice_number: 'T-2026-0001',
        paid_amount_rappen: 5000,
        payment_status: 'partial',
        total_amount_rappen: 15000,
        outstanding_rappen: 10000,
      },
      error: null,
    }))

    const result = await callCreateInvoiceWithSettlement({
      supabase: { rpc } as RpcClient,
      actorUserId: 'actor-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      invoice: { total_amount_rappen: 15000 },
      items: [{ product_name: 'A', total_price_rappen: 5000 }],
      settlements: [{
        item_index: 0,
        payment_method: 'cash',
        payment_date: '2026-10-11T00:00:00.000Z',
        amount_rappen: 5000,
        linked_payment_id: null,
        notes: null,
      }],
    })

    expect(result.invoice_id).toBe('inv-1')
    expect(result.outstanding_rappen).toBe(10000)
    expect(rpc).toHaveBeenCalledWith('create_invoice_with_settlement', expect.objectContaining({
      p_actor_user_id: 'actor-1',
      p_idempotency_key: '550e8400-e29b-41d4-a716-446655440000',
    }))
  })

  it('maps forbidden RPC errors to 403', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: 'forbidden_settle_role', code: '42501' },
    }))

    await expect(callCreateInvoiceWithSettlement({
      supabase: { rpc } as RpcClient,
      actorUserId: 'actor-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      invoice: {},
      items: [],
      settlements: [],
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('maps invalid method to 400', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: 'invalid_payment_method' },
    }))

    await expect(callCreateInvoiceWithSettlement({
      supabase: { rpc } as RpcClient,
      actorUserId: 'actor-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      invoice: {},
      items: [],
      settlements: [],
    })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('maps idempotency_conflict to 409', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: 'idempotency_conflict', code: '23505' },
    }))

    await expect(callCreateInvoiceWithSettlement({
      supabase: { rpc } as RpcClient,
      actorUserId: 'actor-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      invoice: { total_amount_rappen: 9999 },
      items: [{ product_name: 'Conflict', total_price_rappen: 9999 }],
      settlements: [{
        item_index: 0,
        payment_method: 'twint',
        payment_date: '2026-10-11T00:00:00.000Z',
        amount_rappen: 9999,
        linked_payment_id: null,
        notes: null,
      }],
    })).rejects.toMatchObject({ statusCode: 409, statusMessage: 'idempotency_conflict' })
  })
})
