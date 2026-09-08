import { describe, expect, it } from 'vitest'
import { sanitizePublicCourseSessions } from '~/server/utils/public-course-sessions'

describe('sanitizePublicCourseSessions', () => {
  it('strips sari_session_id and instructor PII', () => {
    const sanitized = sanitizePublicCourseSessions([
      {
        id: 'sess-1',
        start_time: '2026-09-10T08:00:00.000Z',
        end_time: '2026-09-10T16:00:00.000Z',
        session_number: 1,
        sari_session_id: '99999',
        tenant_id: 'tenant-secret',
        instructor_email: 'hidden@example.com',
        instructor_phone: '+4100000',
        allow_individual_booking: true,
        individual_price_rappen: 15000,
        individual_booking_requires_confirmation: false,
        individual_booking_confirmation_text: null,
        current_participants: 2,
        max_participants: 12,
      },
    ])

    expect(sanitized).toHaveLength(1)
    expect(sanitized[0].id).toBe('sess-1')
    expect(sanitized[0].current_participants).toBe(2)
    expect(sanitized[0].max_participants).toBe(12)
    expect(sanitized[0].sari_session_id).toBeUndefined()
    expect(sanitized[0].tenant_id).toBeUndefined()
    expect(sanitized[0].instructor_email).toBeUndefined()
    expect(sanitized[0].instructor_phone).toBeUndefined()
  })
})
