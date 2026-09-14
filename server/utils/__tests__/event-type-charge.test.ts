import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isChargeableEventType } from '../event-type-charge'

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type ChargeClient = Parameters<typeof isChargeableEventType>[0]

type EventTypeQuery = {
  select: () => EventTypeQuery
  eq: (col?: string, val?: unknown) => EventTypeQuery
  maybeSingle: () => Promise<{ data: { require_payment: boolean } | null; error: null }>
}

function eventTypeClient(row: { require_payment: boolean } | null): ChargeClient {
  const chain: EventTypeQuery = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: row, error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as ChargeClient
}

describe('isChargeableEventType — require_payment, not hardcoded lesson|exam|theory', () => {
  it('24. custom require_payment=true event type is chargeable', async () => {
    const supabase = eventTypeClient({ require_payment: true })
    await expect(isChargeableEventType(supabase, 't1', 'workshop')).resolves.toBe(true)
  })

  it('25. custom require_payment=false event type is not treated as in-app payment', async () => {
    const supabase = eventTypeClient({ require_payment: false })
    await expect(isChargeableEventType(supabase, 't1', 'workshop')).resolves.toBe(false)
    await expect(isChargeableEventType(supabase, 't1', 'consulting')).resolves.toBe(false)
  })

  it('looks up tenant-scoped code, not code alone', async () => {
    const maybeSingle = vi.fn(async () => ({ data: { require_payment: true }, error: null }))
    const eqs: Array<[string, unknown]> = []
    const chain: EventTypeQuery = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        eqs.push([col, val])
        return chain
      },
      maybeSingle,
    }
    const supabase = { from: vi.fn(() => chain) } as unknown as ChargeClient
    await isChargeableEventType(supabase, 'tenant-a', 'lesson')
    expect(eqs).toEqual([
      ['tenant_id', 'tenant-a'],
      ['code', 'lesson'],
    ])
  })
})

describe('confirmation / reminder chargeable wiring', () => {
  it('confirmation dispatch uses isChargeableEventType, not hardcoded lesson|exam|theory for price', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/dispatch-appointment-confirmation.ts'), 'utf8')
    expect(src).toContain('isChargeableEventType')
    expect(src).not.toMatch(/const BILLABLE_TYPES = new Set\(\['lesson', 'exam', 'theory'\]\)/)
  })

  it('appointment reminders use tenant require_payment for payment section', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/cron/send-appointment-reminders.get.ts'), 'utf8')
    expect(src).toContain('require_payment')
    expect(src).toContain('eventTypeChargeableMap')
    expect(src).not.toMatch(/const BILLABLE_TYPES = new Set\(\['lesson', 'exam', 'theory'\]\)/)
  })
})
