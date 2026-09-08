import type { SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appointmentConversionOrderId,
  appointmentMetaEventId,
  becameBindingConfirmed,
  courseConversionOrderId,
  courseMetaEventId,
  hasGoogleClickId,
  isBindingConfirmedAppointment,
  isBindingConfirmedRegistration,
  isEligibleForGooglePrimaryBookingConversion,
  isEligibleForMetaPurchaseConversion,
  isProductiveEventTypeCode,
  isUniqueViolation,
} from '../binding-booking'
import {
  claimGoogleAdsConversionUpload,
  recordAndUploadConversion,
  recordAndUploadCourseConversion,
} from '../google-ads-conversion'
import { claimMetaCapiUpload, recordAndSendCapiEvent } from '../meta-capi'
import { uploadProposalDerivedBookingConversion } from '../proposal-booking-conversion'
import {
  reportBindingAppointmentConversion,
  reportBindingAppointmentConversionSafely,
  reportBindingCourseConversion,
  resolveNewCustomerState,
} from '../binding-booking-conversion'

vi.mock('../google-ads-conversion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../google-ads-conversion')>()
  return {
    ...actual,
    recordAndUploadConversion: vi.fn().mockResolvedValue(undefined),
    recordAndUploadCourseConversion: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../meta-capi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../meta-capi')>()
  return {
    ...actual,
    recordAndSendCapiEvent: vi.fn().mockResolvedValue(undefined),
    sendCapiEvent: vi.fn().mockResolvedValue({ sent: true }),
  }
})

vi.mock('../conversion-value', () => ({
  resolveBookingConversionValue: vi.fn().mockResolvedValue({
    value_chf: 180,
    source: 'lesson',
    category: 'B',
  }),
}))

const APPT = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const TENANT_A = '33333333-3333-4333-8333-333333333333'
const TENANT_B = '44444444-4444-4444-8444-444444444444'
const COURSE = '55555555-5555-4555-8555-555555555555'

type QueryResult = {
  data?: unknown
  error?: { code?: string; message?: string } | null
  count?: number
}

type QueryChain = {
  select: (...args: unknown[]) => QueryChain
  eq: (...args: unknown[]) => QueryChain
  in: (...args: unknown[]) => QueryChain
  is: (...args: unknown[]) => QueryChain
  or: (...args: unknown[]) => QueryChain
  neq: (...args: unknown[]) => QueryChain
  order: (...args: unknown[]) => QueryChain
  limit: (...args: unknown[]) => QueryChain
  insert: (...args: unknown[]) => QueryChain
  update: (...args: unknown[]) => QueryChain
  single: () => Promise<QueryResult>
  maybeSingle: () => Promise<QueryResult>
  then: (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>
}

function chainable(terminal: QueryResult): QueryChain {
  const q = {} as QueryChain
  const wrap = () => q
  q.select = wrap
  q.eq = wrap
  q.in = wrap
  q.is = wrap
  q.or = wrap
  q.neq = wrap
  q.order = wrap
  q.limit = wrap
  q.insert = wrap
  q.update = wrap
  q.single = async () => terminal
  q.maybeSingle = async () => terminal
  q.then = (resolve, reject) => Promise.resolve(terminal).then(resolve, reject)
  return q
}

function historyClient(opts: {
  appointmentCount?: number
  appointmentError?: { message: string } | null
  registrationCount?: number
  registrationError?: { message: string } | null
}): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'appointments') {
        return chainable({
          data: null,
          error: opts.appointmentError ?? null,
          count: opts.appointmentCount ?? 0,
        })
      }
      return chainable({
        data: null,
        error: opts.registrationError ?? null,
        count: opts.registrationCount ?? 0,
      })
    },
  } as unknown as SupabaseClient
}

const newCustomerClient = () => historyClient({ appointmentCount: 0, registrationCount: 0 })

describe('binding booking semantics', () => {
  it('treats confirmed as binding regardless of payment', () => {
    expect(isBindingConfirmedAppointment('confirmed')).toBe(true)
    expect(isBindingConfirmedAppointment('pending')).toBe(false)
    expect(isBindingConfirmedRegistration('confirmed')).toBe(true)
    expect(isBindingConfirmedRegistration('pending')).toBe(false)
  })

  it('fires only on the transition into confirmed', () => {
    expect(becameBindingConfirmed(null, 'confirmed')).toBe(true)
    expect(becameBindingConfirmed('pending', 'confirmed')).toBe(true)
    expect(becameBindingConfirmed('confirmed', 'confirmed')).toBe(false)
    expect(becameBindingConfirmed('confirmed', 'cancelled')).toBe(false)
    expect(becameBindingConfirmed(null, 'pending')).toBe(false)
  })

  it('uses the unit-economics skip list for productive types', () => {
    expect(isProductiveEventTypeCode('lesson')).toBe(true)
    expect(isProductiveEventTypeCode('exam')).toBe(true)
    expect(isProductiveEventTypeCode('vacation')).toBe(false)
    expect(isProductiveEventTypeCode('staff_meeting')).toBe(false)
    expect(isProductiveEventTypeCode(null)).toBe(true)
  })

  it('uses appointment UUID and course_ registration identities', () => {
    expect(appointmentConversionOrderId(APPT)).toBe(APPT)
    expect(courseConversionOrderId(COURSE)).toBe(`course_${COURSE}`)
    expect(appointmentMetaEventId(APPT)).toBe(`capi_${APPT}`)
    expect(courseMetaEventId(COURSE)).toBe(`capi_course_${COURSE}`)
    expect(courseConversionOrderId(COURSE)).not.toBe(APPT)
  })

  it('fails closed for Google Primary and Meta Purchase', () => {
    expect(isEligibleForGooglePrimaryBookingConversion({
      newCustomerState: 'new',
      hasGoogleClickId: true,
    })).toBe(true)
    expect(isEligibleForGooglePrimaryBookingConversion({
      newCustomerState: 'existing',
      hasGoogleClickId: true,
    })).toBe(false)
    expect(isEligibleForGooglePrimaryBookingConversion({
      newCustomerState: 'unknown',
      hasGoogleClickId: true,
    })).toBe(false)
    expect(isEligibleForMetaPurchaseConversion({
      newCustomerState: 'new',
      hasMetaClickId: true,
    })).toBe(true)
    expect(isEligibleForMetaPurchaseConversion({
      newCustomerState: 'unknown',
      hasMetaClickId: true,
    })).toBe(false)
    expect(hasGoogleClickId({ gclid: 'g' })).toBe(true)
  })
})

describe('resolveNewCustomerState', () => {
  it('is new when this tenant has no prior confirmed productive booking', async () => {
    await expect(resolveNewCustomerState(newCustomerClient(), {
      tenantId: TENANT_A,
      userId: USER,
      excludeAppointmentId: APPT,
    })).resolves.toBe('new')
  })

  it('is existing when a confirmed productive appointment already exists', async () => {
    await expect(resolveNewCustomerState(historyClient({ appointmentCount: 1 }), {
      tenantId: TENANT_A,
      userId: USER,
      excludeAppointmentId: APPT,
    })).resolves.toBe('existing')
  })

  it('treats a prior confirmed course as existing customer for a later lesson', async () => {
    await expect(resolveNewCustomerState(historyClient({
      appointmentCount: 0,
      registrationCount: 1,
    }), {
      tenantId: TENANT_A,
      userId: USER,
      excludeAppointmentId: APPT,
    })).resolves.toBe('existing')
  })

  it('fails closed when history lookup errors', async () => {
    await expect(resolveNewCustomerState(historyClient({
      appointmentError: { message: 'db down' },
    }), {
      tenantId: TENANT_A,
      userId: USER,
    })).resolves.toBe('unknown')
  })

  it('isolates history by tenant', async () => {
    const tenantScoped: string[] = []
    const client = {
      from(table: string) {
        const q = chainable({ data: null, error: null, count: 0 })
        const originalEq = q.eq
        q.eq = (...args: unknown[]) => {
          if (args[0] === 'tenant_id') tenantScoped.push(`${table}:${String(args[1])}`)
          return originalEq(...args)
        }
        return q
      },
    } as unknown as SupabaseClient
    await resolveNewCustomerState(client, {
      tenantId: TENANT_B,
      userId: USER,
      excludeAppointmentId: APPT,
    })
    expect(tenantScoped).toContain(`appointments:${TENANT_B}`)
    expect(tenantScoped).toContain(`course_registrations:${TENANT_B}`)
    expect(tenantScoped.some(v => v.endsWith(TENANT_A))).toBe(false)
  })
})

describe('binding booking conversion matrix A-P', () => {
  beforeEach(() => {
    vi.mocked(recordAndUploadConversion).mockClear().mockResolvedValue(undefined)
    vi.mocked(recordAndUploadCourseConversion).mockClear().mockResolvedValue(undefined)
    vi.mocked(recordAndSendCapiEvent).mockClear().mockResolvedValue(undefined)
  })

  const baseAppointment = {
    appointmentId: APPT,
    userId: USER,
    tenantId: TENANT_A,
    eventTypeCode: 'lesson',
    categoryCode: 'B',
    gclid: 'gclid-1',
    fbclid: 'fbclid-1',
    conversionValueChf: 180,
    hashedEmail: 'hash_e',
    hashedPhone: 'hash_p',
  }

  it('A — confirmed + payment pending creates one binding conversion', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: null,
    })
    expect(report.newCustomerState).toBe('new')
    expect(recordAndUploadConversion).toHaveBeenCalledTimes(1)
    expect(recordAndSendCapiEvent).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordAndUploadConversion).mock.calls[0][0].appointment_id).toBe(APPT)
    expect(vi.mocked(recordAndSendCapiEvent).mock.calls[0][0].event_id).toBe(`capi_${APPT}`)
  })

  it('B/P — later payment on an already-confirmed appointment does not convert again', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: 'confirmed',
    })
    expect(report.reason).toBe('already_confirmed')
    expect(recordAndUploadConversion).not.toHaveBeenCalled()
    expect(recordAndSendCapiEvent).not.toHaveBeenCalled()
  })

  it('C — pay-before-confirm hold is not a conversion', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'pending',
      previousStatus: null,
    })
    expect(report.reason).toBe('not_binding_confirmed')
    expect(recordAndUploadConversion).not.toHaveBeenCalled()
    expect(recordAndSendCapiEvent).not.toHaveBeenCalled()
  })

  it('D — hold becoming confirmed creates one conversion', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: 'pending',
    })
    expect(report.newCustomerState).toBe('new')
    expect(recordAndUploadConversion).toHaveBeenCalledTimes(1)
    expect(recordAndSendCapiEvent).toHaveBeenCalledTimes(1)
  })

  it('E — duplicate confirmation attempt does not create a second reporter pass after already-confirmed', async () => {
    await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: 'pending',
    })
    await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: 'confirmed',
    })
    expect(recordAndUploadConversion).toHaveBeenCalledTimes(1)
    expect(recordAndSendCapiEvent).toHaveBeenCalledTimes(1)
  })

  it('F — CRM proposal booking_confirmed is not a booking conversion', async () => {
    const result = await uploadProposalDerivedBookingConversion({
      proposal: {
        id: 'proposal-1',
        tenant_id: TENANT_A,
        gclid: 'gclid-1',
        gbraid: null,
        wbraid: null,
        fbclid: 'fbclid-1',
        fbc: null,
        fbp: null,
        email: 'a@b.ch',
        phone: '+41791234567',
      },
    })
    expect(result).toBe('skipped_crm_outcome_only')
    expect(recordAndUploadConversion).not.toHaveBeenCalled()
    expect(recordAndSendCapiEvent).not.toHaveBeenCalled()
  })

  it('G — inquiry helpers stay distinct from booking conversion in source', () => {
    const proposalApi = readFileSync(resolve(process.cwd(), 'server/api/booking/submit-proposal.post.ts'), 'utf8')
    expect(proposalApi).toContain('recordAndUploadInquiryConversion')
    expect(proposalApi).toContain("event_name: 'Lead'")
    expect(proposalApi).not.toContain('reportBindingAppointmentConversion')
    expect(proposalApi).not.toMatch(/event_name:\s*'Purchase'/)
  })

  it('H — existing customer suppresses Google Primary and Meta Purchase', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: historyClient({ appointmentCount: 1 }),
      status: 'confirmed',
      previousStatus: null,
    })
    expect(report.newCustomerState).toBe('existing')
    expect(recordAndUploadConversion).not.toHaveBeenCalled()
    expect(recordAndSendCapiEvent).not.toHaveBeenCalled()
  })

  it('I — confirmed course with pending payment is one course conversion', async () => {
    const report = await reportBindingCourseConversion({
      supabase: newCustomerClient(),
      registrationId: COURSE,
      userId: USER,
      tenantId: TENANT_A,
      status: 'confirmed',
      gclid: 'gclid-1',
      fbclid: 'fbclid-1',
      conversionValueChf: 250,
    })
    expect(report.newCustomerState).toBe('new')
    expect(recordAndUploadCourseConversion).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordAndUploadCourseConversion).mock.calls[0][0].registration_id).toBe(COURSE)
    expect(recordAndSendCapiEvent).toHaveBeenCalledTimes(1)
    expect(vi.mocked(recordAndSendCapiEvent).mock.calls[0][0].event_id).toBe(`capi_course_${COURSE}`)
    expect(vi.mocked(recordAndSendCapiEvent).mock.calls[0][0].appointment_id).toBe(`course_${COURSE}`)
  })

  it('J — confirmed course after a confirmed lesson is not a new customer', async () => {
    const report = await reportBindingCourseConversion({
      supabase: historyClient({ appointmentCount: 1 }),
      registrationId: COURSE,
      userId: USER,
      tenantId: TENANT_A,
      status: 'confirmed',
      gclid: 'gclid-1',
      fbclid: 'fbclid-1',
      conversionValueChf: 250,
    })
    expect(report.newCustomerState).toBe('existing')
    expect(recordAndUploadCourseConversion).not.toHaveBeenCalled()
    expect(recordAndSendCapiEvent).not.toHaveBeenCalled()
  })

  it('K — cancellation is not a new booking conversion', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'cancelled',
      previousStatus: 'confirmed',
    })
    expect(report.reason).toBe('not_binding_confirmed')
    expect(recordAndUploadConversion).not.toHaveBeenCalled()
  })

  it('L — tracking API failure does not reject the booking reporter', async () => {
    vi.mocked(recordAndUploadConversion).mockRejectedValueOnce(new Error('google down'))
    vi.mocked(recordAndSendCapiEvent).mockRejectedValueOnce(new Error('meta down'))
    await expect(reportBindingAppointmentConversionSafely({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: null,
    })).resolves.toMatchObject({
      google: 'failed',
      meta: 'failed',
      newCustomerState: 'new',
    })
  })

  it('M — tenant B is still new when tenant A already has history', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      tenantId: TENANT_B,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: null,
    })
    expect(report.newCustomerState).toBe('new')
    expect(recordAndUploadConversion).toHaveBeenCalledTimes(1)
  })

  it('O — repeated confirmed save does not convert again', async () => {
    const report = await reportBindingAppointmentConversion({
      ...baseAppointment,
      supabase: newCustomerClient(),
      status: 'confirmed',
      previousStatus: 'confirmed',
    })
    expect(report.google).toBe('not_attempted')
    expect(recordAndUploadConversion).not.toHaveBeenCalled()
  })
})

describe('idempotent claim before provider call', () => {
  it('N — unique violation lets only the first claim win', async () => {
    const winner = await claimGoogleAdsConversionUpload(
      { from: () => chainable({ data: { id: 'claim-1' }, error: null }) },
      {
        appointment_id: APPT,
        order_id: APPT,
        conversion_action_id: '123',
        conversion_value_chf: 180,
        conversion_date_time: new Date().toISOString(),
      },
    )
    expect(winner).toEqual({ kind: 'won', rowId: 'claim-1' })

    const loser = await claimGoogleAdsConversionUpload(
      {
        from: () => chainable({
          data: { id: 'claim-1', upload_status: 'success', upload_attempts: 1 },
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }),
      },
      {
        appointment_id: APPT,
        order_id: APPT,
        conversion_action_id: '123',
        conversion_value_chf: 180,
        conversion_date_time: new Date().toISOString(),
      },
    )
    expect(loser.kind).toBe('skip')
  })

  it('does not blindly resend a pending claim', async () => {
    const pending = await claimGoogleAdsConversionUpload(
      {
        from: () => chainable({
          data: { id: 'claim-1', upload_status: 'pending', upload_attempts: 0 },
          error: { code: '23505', message: 'duplicate key' },
        }),
      },
      {
        appointment_id: APPT,
        order_id: APPT,
        conversion_action_id: '123',
        conversion_value_chf: 180,
        conversion_date_time: new Date().toISOString(),
      },
    )
    expect(pending).toEqual({ kind: 'skip', reason: 'pending' })
  })

  it('retries a failed claim according to policy', async () => {
    const retry = await claimGoogleAdsConversionUpload(
      {
        from: () => chainable({
          data: { id: 'claim-1', upload_status: 'failed', upload_attempts: 1 },
          error: { code: '23505', message: 'duplicate key' },
        }),
      },
      {
        appointment_id: APPT,
        order_id: APPT,
        conversion_action_id: '123',
        conversion_value_chf: 180,
        conversion_date_time: new Date().toISOString(),
      },
    )
    expect(retry).toEqual({ kind: 'retry', rowId: 'claim-1' })
  })

  it('Meta claim is keyed by event_name + event_id', async () => {
    const won = await claimMetaCapiUpload(
      { from: () => chainable({ data: { id: 'meta-1' }, error: null }) },
      {
        appointment_id: APPT,
        pixel_id: 'px',
        event_name: 'Purchase',
        event_id: `capi_${APPT}`,
        conversion_value_chf: 180,
        conversion_date_time: new Date().toISOString(),
      },
    )
    expect(won.kind).toBe('won')
  })

  it('detects postgres unique violations', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ message: 'duplicate key value violates unique constraint "x"' })).toBe(true)
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
  })
})

describe('call-site inventory', () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

  it('proposal CRM outcome no longer uploads a booking conversion', () => {
    const src = read('server/api/admin/update-booking-proposal-status.post.ts')
    expect(src).not.toContain('uploadProposalDerivedBookingConversion')
    expect(src).toContain('staff label')
  })

  it('self-service booking reports only after confirmation', () => {
    const create = read('server/api/booking/create-appointment.post.ts')
    const guest = read('server/api/booking/guest-book.post.ts')
    expect(create).toContain('reportBindingAppointmentConversionSafely')
    expect(create).toContain('if (!holdUntilPaid)')
    expect(create).not.toContain('recordAndUploadConversion')
    expect(guest).toContain('reportBindingAppointmentConversionSafely')
    expect(guest).toContain('if (!holdUntilPaid)')
  })

  it('course cash/wallee/webhook use the audited reporter, not bare sendCapiEvent', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    const wallee = read('server/api/courses/enroll-wallee.post.ts')
    const webhook = read('server/api/wallee/webhook.post.ts')
    expect(cash).toContain('reportBindingCourseConversionSafely')
    expect(cash).not.toContain('sendCapiEvent')
    expect(cash).not.toContain('isFirstCustomerBooking: true')
    expect(wallee).toContain('reportBindingCourseConversionSafely')
    expect(wallee).not.toContain('sendCapiEvent')
    expect(wallee).not.toContain('isFirstCustomerBooking: true')
    expect(webhook).toContain('reportBindingCourseConversionSafely')
    expect(webhook).toContain('becameBindingConfirmed')
    expect(webhook).not.toContain('isFirstCustomerBooking: true')
    expect(webhook).not.toMatch(/sendCapiEvent\(/)
  })

  it('funnel booking_events.completed is not a conversion trigger', () => {
    const create = read('server/api/booking/create-appointment.post.ts')
    expect(create).toContain("event_type', 'completed'")
    expect(create).toContain('link booking_events')
  })

  it('migration claims uniqueness without dropping all successful rows', () => {
    const sql = read('migrations/20260908_binding_booking_conversion_claim.sql')
    expect(sql).toContain('success-preferring')
    expect(sql).toContain('WHEN \'success\' THEN 0')
    expect(sql).toContain('google_ads_conversion_uploads_order_id_uidx')
    expect(sql).toContain('meta_capi_uploads_event_uidx')
    expect(sql).not.toContain('TRUNCATE')
  })
})
