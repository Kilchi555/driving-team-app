import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getHeader: vi.fn(),
  readBody: vi.fn(),
  dispatch: vi.fn(),
  startManual: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/auth')>()
  return { ...actual, getAuthenticatedUser: mocks.getUser }
})

vi.mock('~/server/utils/prospect-discovery-automation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/prospect-discovery-automation')>()
  return {
    ...actual,
    dispatchCronProspectDiscovery: mocks.dispatch,
    startManualProspectDiscovery: mocks.startManual,
    readProspectAutomation: mocks.read,
    saveProspectAutomationSettings: mocks.save,
  }
})

type EventHandler = (event: object) => Promise<Record<string, unknown>>

const SUPER = { role: 'super_admin', db_user_id: '11111111-1111-4111-8111-111111111111' }
const TENANT_ADMIN = { role: 'admin', db_user_id: '22222222-2222-4222-8222-222222222222' }
const CLIENT = { role: 'client', db_user_id: '33333333-3333-4333-8333-333333333333' }

async function cronHandler() {
  return (await import('../../api/cron/discover-website-prospects.get')).default as EventHandler
}

async function runHandler() {
  return (await import('../../api/tenant-admin/website-prospects/automation/run.post')).default as EventHandler
}

async function getHandler() {
  return (await import('../../api/tenant-admin/website-prospects/automation.get')).default as EventHandler
}

async function putHandler() {
  return (await import('../../api/tenant-admin/website-prospects/automation.put')).default as EventHandler
}

describe('prospect automation HTTP authorization', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getUser.mockReset()
    mocks.getHeader.mockReset()
    mocks.readBody.mockReset()
    mocks.dispatch.mockReset()
    mocks.startManual.mockReset()
    mocks.read.mockReset()
    mocks.save.mockReset()
    delete process.env.CRON_SECRET
  })

  it('denies anonymous, tenant admin, and normal user manual triggers', async () => {
    const handler = await runHandler()
    mocks.getUser.mockResolvedValue(null)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })

    mocks.getUser.mockResolvedValue(TENANT_ADMIN)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })

    mocks.getUser.mockResolvedValue(CLIENT)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.startManual).not.toHaveBeenCalled()
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('lets a super admin start the shared manual trigger', async () => {
    mocks.getUser.mockResolvedValue(SUPER)
    mocks.startManual.mockResolvedValue({
      ok: true,
      status: 'completed',
      runId: 'run-1',
      trigger: 'manual',
      city: 'Bern',
      created: 1,
      review: 1,
      scored: 0,
      errors: 0,
      generated: 1,
      emailsSent: 0,
    })
    const handler = await runHandler()
    const result = await handler({})
    expect(mocks.startManual).toHaveBeenCalledWith({ triggeredBy: SUPER.db_user_id })
    expect(result).toMatchObject({ success: true, status: 'completed', emailsSent: 0 })
  })

  it('tells the super admin when a run is already going', async () => {
    mocks.getUser.mockResolvedValue(SUPER)
    mocks.startManual.mockResolvedValue({
      ok: true,
      skipped: 'already_running',
      runId: 'run-1',
      city: null,
      created: 0,
      review: 0,
      scored: 0,
      errors: 0,
      generated: 0,
      emailsSent: 0,
    })
    const handler = await runHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Ein Prospect-Discovery-Lauf läuft bereits.',
    })
  })

  it('hides internal errors when a manual start fails', async () => {
    mocks.getUser.mockResolvedValue(SUPER)
    mocks.startManual.mockRejectedValue(new Error('AIzaSySECRET1234567890'))
    const handler = await runHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Der Prospect-Discovery-Lauf konnte nicht gestartet werden.',
    })
  })

  it('allows only a super admin to read and update settings', async () => {
    const read = await getHandler()
    const update = await putHandler()
    mocks.getUser.mockResolvedValue(null)
    await expect(read({})).rejects.toMatchObject({ statusCode: 401 })
    mocks.getUser.mockResolvedValue(TENANT_ADMIN)
    await expect(update({})).rejects.toMatchObject({ statusCode: 403 })
    mocks.getUser.mockResolvedValue(CLIENT)
    await expect(update({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()

    mocks.getUser.mockResolvedValue(SUPER)
    mocks.read.mockResolvedValue({
      settings: { enabled: false, frequency: 'daily', time: '04:30', timezone: 'Europe/Zurich' },
      activeRun: null,
      lastRun: null,
      lastDispatch: { at: null, result: null },
      persistent: true,
    })
    await expect(read({})).resolves.toMatchObject({ success: true, settings: { enabled: false } })

    mocks.readBody.mockResolvedValue({
      enabled: true,
      frequency: 'daily',
      time: '05:30',
      timezone: 'Europe/Zurich',
      tenant_id: 'tenant-evil',
      emailsSent: 4,
    })
    const saved = await update({})
    expect(saved.settings).toEqual({
      enabled: true,
      frequency: 'daily',
      time: '05:30',
      timezone: 'Europe/Zurich',
    })
    expect(mocks.save).toHaveBeenCalledWith(saved.settings, SUPER.db_user_id)
    expect(JSON.stringify(mocks.save.mock.calls)).not.toContain('tenant-evil')

    mocks.save.mockClear()
    mocks.readBody.mockResolvedValue({ enabled: true, frequency: 'hourly', time: '04:30', timezone: 'Europe/Zurich' })
    await expect(update({})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('fails closed for a missing, wrong, or header-only cron secret', async () => {
    const handler = await cronHandler()
    mocks.getHeader.mockReturnValue('Bearer test-cron-secret')
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })

    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'authorization') return 'Bearer wrong-secret'
      if (name === 'x-vercel-cron') return '1'
      return undefined
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })

    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'x-vercel-cron') return '1'
      return undefined
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.dispatch).not.toHaveBeenCalled()
  })

  it('runs the dispatcher only after a valid cron secret and still forces emailsSent 0', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => (
      name === 'authorization' ? 'Bearer test-cron-secret' : undefined
    ))
    mocks.dispatch.mockResolvedValue({
      ok: true,
      skipped: 'automation_disabled',
      runId: null,
      city: null,
      created: 0,
      review: 0,
      scored: 0,
      errors: 0,
      generated: 0,
      emailsSent: 9,
    })
    const handler = await cronHandler()
    const result = await handler({})
    expect(mocks.dispatch).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ ok: true, skipped: 'automation_disabled', emailsSent: 0 })

    mocks.dispatch.mockRejectedValue(new Error('database unavailable AIzaSySECRET1234567890'))
    const fallback = await handler({})
    expect(fallback).toEqual({ ok: true, skipped: 'automation_disabled', emailsSent: 0 })
    expect(JSON.stringify(fallback)).not.toContain('AIza')
  })

  it('keeps privileged calls behind the server gates', () => {
    const run = readFileSync(resolve(process.cwd(), 'server/api/tenant-admin/website-prospects/automation/run.post.ts'), 'utf8')
    const update = readFileSync(resolve(process.cwd(), 'server/api/tenant-admin/website-prospects/automation.put.ts'), 'utf8')
    const cron = readFileSync(resolve(process.cwd(), 'server/api/cron/discover-website-prospects.get.ts'), 'utf8')
    const runBody = run.slice(run.indexOf('export default'))
    expect(runBody.indexOf('requireSuperAdmin')).toBeLessThan(runBody.indexOf('startManualProspectDiscovery'))
    expect(runBody).not.toContain('readBody')
    expect(update.indexOf('requireSuperAdmin')).toBeLessThan(update.indexOf('parseAutomationSettings'))
    const cronBody = cron.slice(cron.indexOf('export default'))
    expect(cronBody.indexOf('assertCronRequest(event)')).toBeLessThan(cronBody.indexOf('dispatchCronProspectDiscovery('))
    expect(cron).not.toContain('runCronWebsiteProspectDiscovery')
  })
})
