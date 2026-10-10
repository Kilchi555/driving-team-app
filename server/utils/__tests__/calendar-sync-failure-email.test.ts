import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.hoisted(() => vi.fn(async () => ({ messageId: 'msg-1' })))

vi.mock('~/server/utils/email', () => ({
  sendEmail,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function supabaseWithAdmin() {
  const tables: string[] = []
  const from = (table: string) => {
    tables.push(table)
    const builder: Record<string, unknown> = {}
    const chain = () => builder
    builder.select = vi.fn(chain)
    builder.eq = vi.fn(chain)
    builder.not = vi.fn(chain)
    builder.limit = vi.fn(chain)
    builder.update = vi.fn(chain)
    builder.single = vi.fn(async () => ({
      data: {
        name: 'Fahrschule Beispiel',
        from_email: 'admin@schule.example',
        resend_domain_verified: true,
        primary_color: '#112233',
        logo_wide_url: null,
        logo_url: null,
        logo_square_url: null,
      },
      error: null,
    }))
    builder.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [{ email: 'admin@schule.example' }, { email: 'owner@schule.example' }],
        error: null,
      }).then(resolve)
    return builder
  }
  return { from, tables }
}

describe('calendar sync failure email recipient', () => {
  beforeEach(() => {
    sendEmail.mockClear()
  })

  it('sends only to info@simy.ch and never to tenant admins', async () => {
    const { CALENDAR_SYNC_FAILURE_EMAIL, notifyAdminBrokenCalendar } = await import('../sync-external-calendars-job')
    const db = supabaseWithAdmin()
    await notifyAdminBrokenCalendar(db, {
      id: 'cal-1',
      tenant_id: 'tenant-1',
      calendar_name: 'Alt Kalender',
      consecutive_failures: 2,
      failure_notified_at: null,
    }, 'simy_error_stub')

    expect(CALENDAR_SYNC_FAILURE_EMAIL).toBe('info@simy.ch')
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const options = sendEmail.mock.calls[0][0]
    expect(options.to).toBe('info@simy.ch')
    expect(options.to).not.toBe('admin@schule.example')
    expect(JSON.stringify(options.to)).not.toContain('schule.example')
    expect(db.tables).not.toContain('users')
    expect(options.subject).toContain('Alt Kalender')
    expect(options.html).toContain('simy_error_stub')
    expect(options.html).not.toMatch(/token=|https?:\/\//)
  })
})
