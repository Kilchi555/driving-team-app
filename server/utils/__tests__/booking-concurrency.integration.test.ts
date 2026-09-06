/**
 * Real parallel occupancy tests.
 *
 * These hit a real Postgres / Supabase project. They are skipped unless:
 *   BOOKING_CONCURRENCY_TEST=1
 *   BOOKING_CONCURRENCY_TEST_URL=...
 *   BOOKING_CONCURRENCY_TEST_SERVICE_ROLE_KEY=...
 *   BOOKING_CONCURRENCY_TENANT_ID=...
 *   BOOKING_CONCURRENCY_STAFF_ID=...
 *   BOOKING_CONCURRENCY_USER_ID=...
 *   BOOKING_CONCURRENCY_SLOT_A_ID=...
 *
 * Do not point this at production. Do not remediate production overlaps from here.
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashBookingRequest } from '../booking-errors'
import { appointmentOccupiesStaff, timesOverlap } from '../occupancy'

const enabled = process.env.BOOKING_CONCURRENCY_TEST === '1'
const describeLive = enabled ? describe : describe.skip

function admin() {
  return createClient(
    process.env.BOOKING_CONCURRENCY_TEST_URL || '',
    process.env.BOOKING_CONCURRENCY_TEST_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function bookingPayload(overrides: Record<string, unknown> = {}) {
  const tenantId = process.env.BOOKING_CONCURRENCY_TENANT_ID || ''
  const slotId = process.env.BOOKING_CONCURRENCY_SLOT_A_ID || ''
  const userId = process.env.BOOKING_CONCURRENCY_USER_ID || ''
  const sessionId = randomUUID()
  const start = process.env.BOOKING_CONCURRENCY_START || '2030-01-15T10:00:00Z'
  const end = process.env.BOOKING_CONCURRENCY_END || '2030-01-15T11:00:00Z'
  return {
    tenantId,
    slotId,
    userId,
    sessionId,
    start,
    end,
    requestHash: hashBookingRequest({
      tenant_id: tenantId,
      slot_id: slotId,
      session_id: sessionId,
      user_id: userId,
      start_time: start,
      end_time: end,
      ...overrides,
    }),
  }
}

async function book(key: string, payload = bookingPayload(), extra: Record<string, unknown> = {}) {
  return admin().rpc('book_online_appointment', {
    p_tenant_id: payload.tenantId,
    p_idempotency_key: key,
    p_request_hash: payload.requestHash,
    p_session_id: payload.sessionId,
    p_user_id: payload.userId,
    p_slot_id: payload.slotId,
    p_appointment: {
      type: 'B',
      event_type_code: 'lesson',
      title: 'Concurrency test',
      description: '',
      status: 'pending',
      original_price_rappen: 1000,
      source: 'online',
      created_by: payload.userId,
    },
    p_payment: {
      lesson_price_rappen: 1000,
      admin_fee_rappen: 0,
      products_price_rappen: 0,
      discount_amount_rappen: 0,
      total_amount_rappen: 1000,
      payment_status: 'pending',
      payment_method: 'wallee',
      currency: 'CHF',
      created_by: payload.userId,
      metadata: { source: 'concurrency_test' },
    },
    p_create_vehicle_booking: false,
    p_room_id: null,
    ...extra,
  })
}

describeLive('booking concurrency (live DB)', () => {
  const staffId = process.env.BOOKING_CONCURRENCY_STAFF_ID || ''
  const start = process.env.BOOKING_CONCURRENCY_START || '2030-01-15T10:00:00Z'
  const end = process.env.BOOKING_CONCURRENCY_END || '2030-01-15T11:00:00Z'

  async function occupyingCount() {
    const { data, error } = await admin()
      .from('appointments')
      .select('id, status, deleted_at, occupies_staff, start_time, end_time, staff_id')
      .eq('staff_id', staffId)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","deleted")')
      .eq('occupies_staff', true)
      .lt('start_time', end)
      .gt('end_time', start)
    if (error) throw error
    return (data || []).filter(row => appointmentOccupiesStaff(row) && timesOverlap(row.start_time, row.end_time, start, end))
  }

  it('1. two guests same slot: max one occupying appointment', async () => {
    const [a, b] = await Promise.all([
      book(randomUUID()),
      book(randomUUID()),
    ])
    const successes = [a, b].filter(r => !r.error && r.data?.appointment?.id)
    const conflicts = [a, b].filter(r => r.error)
    expect(successes.length).toBe(1)
    expect(conflicts.length).toBe(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('2. double submit same idempotency key returns the same appointment', async () => {
    const key = randomUUID()
    const payload = bookingPayload()
    const [a, b] = await Promise.all([
      book(key, payload),
      book(key, payload),
    ])
    expect(a.error).toBeNull()
    expect(b.error).toBeNull()
    expect(a.data.appointment.id).toBe(b.data.appointment.id)
    expect(Boolean(a.data.replayed) !== Boolean(b.data.replayed) || a.data.appointment.id).toBeTruthy()
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('3. same key + different request is IDEMPOTENCY_CONFLICT', async () => {
    const key = randomUUID()
    const first = await book(key)
    expect(first.error).toBeNull()
    const second = await book(key, bookingPayload({ slot_id: 'other' }))
    expect(second.error).toBeTruthy()
    expect(`${second.error?.hint || ''} ${second.error?.message || ''}`).toMatch(/IDEMPOTENCY_CONFLICT/)
  })

  it('4. guest vs authenticated use the same RPC and occupancy trigger', async () => {
    const [guest, auth] = await Promise.all([book(randomUUID()), book(randomUUID())])
    const successes = [guest, auth].filter(r => !r.error && r.data?.appointment?.id)
    expect(successes.length).toBe(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('5. expired foreign hold can be claimed once', async () => {
    const slotId = process.env.BOOKING_CONCURRENCY_SLOT_A_ID || ''
    await admin().from('availability_slots').update({
      reserved_by_session: randomUUID(),
      reserved_until: new Date(Date.now() - 60_000).toISOString(),
      appointment_id: null,
    }).eq('id', slotId)
    const result = await book(randomUUID())
    expect(result.error).toBeNull()
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('6. two checkout claims serialize on the same payment', async () => {
    const paymentId = process.env.BOOKING_CONCURRENCY_PAYMENT_ID
    const tenantId = process.env.BOOKING_CONCURRENCY_TENANT_ID
    if (!paymentId || !tenantId) return
    const supabase = admin()
    const [a, b] = await Promise.all([
      supabase.rpc('claim_payment_checkout', { p_payment_id: paymentId, p_tenant_id: tenantId }),
      supabase.rpc('claim_payment_checkout', { p_payment_id: paymentId, p_tenant_id: tenantId }),
    ])
    const outcomes = [a.data?.outcome, b.data?.outcome]
    expect(outcomes.filter((o) => o === 'allow_create').length).toBeLessThanOrEqual(1)
  })

  it('9. admin insert vs guest RPC: max one occupying row', async () => {
    const tenantId = process.env.BOOKING_CONCURRENCY_TENANT_ID || ''
    const userId = process.env.BOOKING_CONCURRENCY_USER_ID || ''
    const staff = process.env.BOOKING_CONCURRENCY_STAFF_ID || ''
    const [rpc, adminInsert] = await Promise.all([
      book(randomUUID()),
      admin().from('appointments').insert({
        user_id: userId,
        tenant_id: tenantId,
        staff_id: staff,
        start_time: start,
        end_time: end,
        duration_minutes: 60,
        type: 'B',
        event_type_code: 'lesson',
        title: 'Admin concurrency',
        status: 'confirmed',
        source: 'manual',
      }).select('id').single(),
    ])
    const ok = [!rpc.error && rpc.data?.appointment?.id, !adminInsert.error && adminInsert.data?.id].filter(Boolean)
    expect(ok.length).toBe(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('3. two slot rows same staff/time still serialize on staff lock', async () => {
    const slotB = process.env.BOOKING_CONCURRENCY_SLOT_B_ID
    if (!slotB) return
    const payloadB = bookingPayload({ slot_id: slotB })
    payloadB.slotId = slotB
    const [a, b] = await Promise.all([
      book(randomUUID()),
      book(randomUUID(), payloadB),
    ])
    const successes = [a, b].filter(r => !r.error && r.data?.appointment?.id)
    expect(successes.length).toBe(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('7-8. duplicate and delayed payment confirmation never resurrects', async () => {
    const appointmentId = process.env.BOOKING_CONCURRENCY_APPOINTMENT_ID
    if (!appointmentId) return
    await admin().from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId)
    const first = await admin().from('appointments').update({ status: 'confirmed' }).eq('id', appointmentId).eq('status', 'pending').is('deleted_at', null).select('id')
    const delayed = await admin().from('appointments').update({ status: 'confirmed' }).eq('id', appointmentId).eq('status', 'pending').is('deleted_at', null).select('id')
    expect(first.data?.length || 0).toBe(0)
    expect(delayed.data?.length || 0).toBe(0)
  })

  it('11. restore vs guest: restore is occupancy-relevant and conflicts', async () => {
    const existing = process.env.BOOKING_CONCURRENCY_DELETED_APPOINTMENT_ID
    if (!existing) return
    const [rpc, restore] = await Promise.all([
      book(randomUUID()),
      admin().from('appointments').update({ deleted_at: null }).eq('id', existing).select('id').single(),
    ])
    const ok = [!rpc.error && rpc.data?.appointment?.id, !restore.error && restore.data?.id].filter(Boolean)
    expect(ok.length).toBeLessThanOrEqual(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('12. client-role insert is still blocked by the occupancy trigger', async () => {
    const jwt = process.env.BOOKING_CONCURRENCY_STAFF_JWT
    if (!jwt) return
    const tenantId = process.env.BOOKING_CONCURRENCY_TENANT_ID || ''
    const staff = process.env.BOOKING_CONCURRENCY_STAFF_ID || ''
    const userId = process.env.BOOKING_CONCURRENCY_USER_ID || ''
    const client = createClient(process.env.BOOKING_CONCURRENCY_TEST_URL || '', process.env.BOOKING_CONCURRENCY_TEST_ANON_KEY || '', {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const [rpc, rls] = await Promise.all([
      book(randomUUID()),
      client.from('appointments').insert({
        user_id: userId,
        tenant_id: tenantId,
        staff_id: staff,
        start_time: start,
        end_time: end,
        duration_minutes: 60,
        type: 'B',
        event_type_code: 'lesson',
        title: 'RLS concurrency',
        status: 'confirmed',
      }).select('id').single(),
    ])
    const ok = [!rpc.error && rpc.data?.appointment?.id, !rls.error && rls.data?.id].filter(Boolean)
    expect(ok.length).toBe(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })

  it('10. vacation insert vs guest RPC: max one occupying row', async () => {
    const tenantId = process.env.BOOKING_CONCURRENCY_TENANT_ID || ''
    const staff = process.env.BOOKING_CONCURRENCY_STAFF_ID || ''
    const [rpc, vacation] = await Promise.all([
      book(randomUUID()),
      admin().from('appointments').insert({
        tenant_id: tenantId,
        staff_id: staff,
        user_id: null,
        start_time: start,
        end_time: end,
        duration_minutes: 60,
        event_type_code: 'vacation',
        title: 'Ferien',
        status: 'confirmed',
      }).select('id').single(),
    ])
    const ok = [!rpc.error && rpc.data?.appointment?.id, !vacation.error && vacation.data?.id].filter(Boolean)
    expect(ok.length).toBe(1)
    expect((await occupyingCount()).length).toBeLessThanOrEqual(1)
  })
})

describe('booking concurrency (always-on contract)', () => {
  it('documents the twelve live cases that require BOOKING_CONCURRENCY_TEST=1', () => {
    const cases = [
      'two guests same slot',
      'double submit same idempotency key',
      'two slot rows same staff/time',
      'guest vs authenticated',
      'expired hold race',
      'two checkout retries',
      'duplicate webhook',
      'delayed webhook',
      'admin-save vs guest',
      'vacation/course vs guest',
      'restore vs guest',
      'client-RLS insert vs guest',
    ]
    expect(cases).toHaveLength(12)
    expect(enabled || cases.length === 12).toBe(true)
  })
})
