import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireTenantStaff: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  notifyCustomerAppointmentChange: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-tenant-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/require-tenant-auth')>()
  return {
    ...actual,
    requireTenantStaff: mocks.requireTenantStaff,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/notify-customer-appointment-change', () => ({
  notifyCustomerAppointmentChange: mocks.notifyCustomerAppointmentChange,
}))

type EventHandler = (event: object) => Promise<unknown>

const staffActor = {
  id: 'staff-a',
  tenant_id: 'tenant-a',
  role: 'staff',
  email: 'staff@example.com',
  auth_user_id: 'auth-staff-a',
}

describe('P1-10 notify-change IDOR', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.notifyCustomerAppointmentChange.mockReset()
    mocks.notifyCustomerAppointmentChange.mockResolvedValue({ emailSent: false, smsSent: false })
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/appointments/notify-change.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireTenantStaff.mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' }),
    )
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('rejects a body.userId that does not match the appointment', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      appointmentId: 'apt-1',
      userId: 'user-b',
      type: 'cancelled',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  user_id: 'user-a',
                  start_time: '2026-09-09T10:00:00Z',
                  tenant_id: 'tenant-a',
                  staff_id: 'staff-a',
                },
                error: null,
              })),
            })),
          })),
        })),
      })),
    })

    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.notifyCustomerAppointmentChange).not.toHaveBeenCalled()
  })

  it('notifies the appointment owner in the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      appointmentId: 'apt-1',
      userId: 'user-a',
      type: 'cancelled',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  user_id: 'user-a',
                  start_time: '2026-09-09T10:00:00Z',
                  tenant_id: 'tenant-a',
                  staff_id: 'staff-a',
                },
                error: null,
              })),
            })),
          })),
        })),
      })),
    })

    await handler().then((fn) => fn({}))
    expect(mocks.notifyCustomerAppointmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        userId: 'user-a',
        appointmentId: 'apt-1',
      }),
    )
  })

  it('rejects a staff member notifying another instructor\'s appointment', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      appointmentId: 'apt-1',
      type: 'cancelled',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  user_id: 'user-a',
                  start_time: '2026-09-09T10:00:00Z',
                  tenant_id: 'tenant-a',
                  staff_id: 'staff-b',
                },
                error: null,
              })),
            })),
          })),
        })),
      })),
    })

    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.notifyCustomerAppointmentChange).not.toHaveBeenCalled()
  })
})
