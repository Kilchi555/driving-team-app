import { describe, expect, it, vi, afterEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getHeader: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    getHeader: mocks.getHeader,
  }
})

describe('P1-01 assertCronRequest fail-closed', () => {
  afterEach(() => {
    mocks.getHeader.mockReset()
    delete process.env.CRON_SECRET
  })

  async function load() {
    return (await import('../cron-auth')).assertCronRequest
  }

  it('rejects when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET
    mocks.getHeader.mockReturnValue('Bearer anything')
    const fn = await load()
    try {
      fn({} as never)
      throw new Error('expected 401')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401 })
    }
  })

  it('rejects x-vercel-cron without a valid bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'x-vercel-cron') return '1'
      return undefined
    })
    const fn = await load()
    try {
      fn({} as never)
      throw new Error('expected 401')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401 })
    }
  })

  it('rejects the wrong bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'authorization') return 'Bearer wrong'
      return undefined
    })
    const fn = await load()
    try {
      fn({} as never)
      throw new Error('expected 401')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401 })
    }
  })

  it('rejects a missing Authorization header when the secret is configured', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockReturnValue(undefined)
    const fn = await load()
    try {
      fn({} as never)
      throw new Error('expected 401')
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401 })
    }
  })

  it('accepts a valid bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'authorization') return 'Bearer test-cron-secret'
      return undefined
    })
    const fn = await load()
    expect(() => fn({} as never)).not.toThrow()
  })
})

describe('isInternalSecretRequest', () => {
  afterEach(() => {
    mocks.getHeader.mockReset()
    delete process.env.CRON_SECRET
    delete process.env.INTERNAL_API_SECRET
  })

  async function loadInternal() {
    return (await import('../require-staff-or-internal')).isInternalSecretRequest
  }

  it('rejects x-vercel-cron without an internal secret header', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'x-vercel-cron') return '1'
      return undefined
    })
    const fn = await loadInternal()
    expect(fn({} as never)).toBe(false)
  })

  it('accepts a matching x-internal-secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'x-internal-secret') return 'test-cron-secret'
      return undefined
    })
    const fn = await loadInternal()
    expect(fn({} as never)).toBe(true)
  })
})
