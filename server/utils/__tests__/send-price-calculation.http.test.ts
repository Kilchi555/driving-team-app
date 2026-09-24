import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  send: vi.fn(),
  Resend: vi.fn(function Resend(this: { emails: { send: typeof mocks.send } }) {
    this.emails = { send: mocks.send }
  }),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('resend', () => ({
  Resend: mocks.Resend,
}))

const validBody = {
  email: 'test@example.com',
  category: 'B',
  lessonsCount: 10,
  totalCost: 1000,
  calculationDetails: 'details',
}

async function loadHandler() {
  vi.resetModules()
  const mod = await import('../../api/booking/send-price-calculation.post')
  return mod.default as (event: unknown) => Promise<unknown>
}

describe('POST /api/booking/send-price-calculation Resend init', () => {
  beforeEach(() => {
    mocks.readBody.mockReset()
    mocks.send.mockReset()
    mocks.Resend.mockClear()
    delete process.env.RESEND_API_KEY
  })

  it('imports without constructing Resend when the key is absent', async () => {
    await loadHandler()
    expect(mocks.Resend).not.toHaveBeenCalled()
  })

  it('returns 503 on request when RESEND_API_KEY is absent', async () => {
    mocks.readBody.mockResolvedValue(validBody)
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'E-Mail-Dienst ist nicht konfiguriert',
    })
    expect(mocks.Resend).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('constructs Resend inside the request when a key is present and does not send for real', async () => {
    process.env.RESEND_API_KEY = 're_test_not_a_real_key'
    mocks.readBody.mockResolvedValue(validBody)
    mocks.send.mockResolvedValue({ data: { id: 'msg_test' }, error: null })
    const handler = await loadHandler()
    await expect(handler({})).resolves.toEqual({
      success: true,
      message: 'Email erfolgreich versendet',
    })
    expect(mocks.Resend).toHaveBeenCalledTimes(1)
    expect(mocks.Resend).toHaveBeenCalledWith('re_test_not_a_real_key')
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(mocks.send.mock.calls[0][0].to).toBe('test@example.com')
    delete process.env.RESEND_API_KEY
  })
})
