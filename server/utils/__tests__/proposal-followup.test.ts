import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  NO_SHOW_FOLLOW_UP_MS,
  POTENTIAL_CUSTOMER_FOLLOW_UP_MS,
  buildBookingProposalUpdate,
  createSupabaseFollowUpDb,
  deliverClaimedFollowUp,
  followUpReminderCopy,
  isFollowUpDue,
  isStuckNoShowClaim,
  loadPendingProposalIds,
  mergeHighlightedProposal,
  retainPendingProposals,
  type FollowUpDb,
  type FollowUpSupabase,
} from '../proposal-followup'

const NOW = new Date('2026-06-01T07:00:00.000Z')
const DUE = '2026-06-01T06:00:00.000Z'

function readRepo(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

type MemoryRow = {
  id: string
  tenant_id: string
  status: string
  outcome_type: string
  follow_up_at: string | null
  follow_up_sent_at: string | null
}

function createMemoryDb(row: MemoryRow): FollowUpDb {
  let tail = Promise.resolve()
  const atomic = <T>(fn: () => T): Promise<T> => {
    const run = tail.then(() => fn())
    tail = run.then(() => undefined, () => undefined)
    return run
  }

  return {
    async claim(input) {
      await Promise.resolve()
      return atomic(() => {
        if (row.id !== input.id || row.tenant_id !== input.tenantId) return false
        if (row.follow_up_sent_at) return false
        if (!row.follow_up_at || row.follow_up_at > input.claimAt) return false
        if (row.outcome_type !== 'potential_customer' && row.outcome_type !== 'no_show') return false
        row.follow_up_sent_at = input.claimAt
        return true
      })
    },
    async releaseClaim(input) {
      await atomic(() => {
        if (row.id === input.id && row.tenant_id === input.tenantId && row.follow_up_sent_at === input.claimAt) {
          row.follow_up_sent_at = null
        }
      })
    },
    async scheduleNoShow(input) {
      return atomic(() => {
        if (row.id !== input.id || row.tenant_id !== input.tenantId) return false
        if (row.outcome_type !== 'no_show') return false
        if (row.follow_up_sent_at !== input.claimAt) return false
        row.follow_up_at = input.nextAt
        row.follow_up_sent_at = null
        return true
      })
    },
    async repairNoShowOrphans(nowIso, nextAt) {
      return atomic(() => {
        if (!isStuckNoShowClaim(row, nowIso)) return 0
        row.follow_up_at = nextAt
        row.follow_up_sent_at = null
        return 1
      })
    },
  }
}

function asDue(row: MemoryRow) {
  if (!row.follow_up_at) throw new Error('follow_up_at required')
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    outcome_type: row.outcome_type,
    follow_up_at: row.follow_up_at,
  }
}

function dueProposal(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: 'proposal-1',
    tenant_id: 'tenant-a',
    status: 'accepted',
    outcome_type: 'no_show',
    follow_up_at: DUE,
    follow_up_sent_at: null,
    ...overrides,
  }
}

describe('booking proposal status update', () => {
  it('clears follow-up when accepted without an outcome', () => {
    const patch = buildBookingProposalUpdate({
      status: 'accepted',
      outcomeType: null,
      now: NOW,
    })
    expect(patch.status).toBe('accepted')
    expect(patch.follow_up_at).toBeNull()
    expect(patch.follow_up_sent_at).toBeNull()
    expect(patch).not.toHaveProperty('outcome_type')
  })

  it('clears follow-up for outcomes that do not schedule a reminder', () => {
    for (const outcomeType of ['booking_confirmed', 'consultation_only', 'not_interested'] as const) {
      const patch = buildBookingProposalUpdate({ status: 'accepted', outcomeType, now: NOW })
      expect(patch.status).toBe('accepted')
      expect(patch.outcome_type).toBe(outcomeType)
      expect(patch.follow_up_at).toBeNull()
      expect(patch.follow_up_sent_at).toBeNull()
    }
  })

  it('schedules one reminder in 30 days for potential_customer and keeps accepted', () => {
    const patch = buildBookingProposalUpdate({
      status: 'accepted',
      outcomeType: 'potential_customer',
      now: NOW,
    })
    expect(patch.status).toBe('accepted')
    expect(patch.outcome_type).toBe('potential_customer')
    expect(patch.follow_up_at).toBe(new Date(NOW.getTime() + POTENTIAL_CUSTOMER_FOLLOW_UP_MS).toISOString())
    expect(patch.follow_up_sent_at).toBeNull()
  })

  it('schedules the next day for no_show and keeps accepted', () => {
    const patch = buildBookingProposalUpdate({
      status: 'accepted',
      outcomeType: 'no_show',
      now: NOW,
    })
    expect(patch.status).toBe('accepted')
    expect(patch.outcome_type).toBe('no_show')
    expect(patch.follow_up_at).toBe(new Date(NOW.getTime() + NO_SHOW_FOLLOW_UP_MS).toISOString())
    expect(patch.follow_up_sent_at).toBeNull()
  })

  it('does not clear an existing follow-up for non-closing statuses without an outcome', () => {
    for (const status of ['pending', 'contacted', 'rejected', 'expired'] as const) {
      const patch = buildBookingProposalUpdate({ status, outcomeType: null, now: NOW })
      expect(patch).not.toHaveProperty('follow_up_at')
      expect(patch).not.toHaveProperty('follow_up_sent_at')
    }
  })
})

describe('follow-up due selection', () => {
  it('still processes accepted no_show rows', () => {
    expect(isFollowUpDue({
      outcome_type: 'no_show',
      follow_up_at: DUE,
      follow_up_sent_at: null,
    }, NOW)).toBe(true)
  })

  it('does not treat a sent potential_customer reminder as due again', () => {
    expect(isFollowUpDue({
      outcome_type: 'potential_customer',
      follow_up_at: DUE,
      follow_up_sent_at: NOW.toISOString(),
    }, new Date(NOW.getTime() + 60 * 24 * 60 * 60 * 1000))).toBe(false)
  })
})

describe('follow-up delivery claim', () => {
  it('sends an accepted no_show reminder', async () => {
    const row = dueProposal({ status: 'accepted', outcome_type: 'no_show' })
    let sends = 0
    const result = await deliverClaimedFollowUp({
      proposal: asDue(row),
      now: NOW,
      db: createMemoryDb(row),
      send: async () => { sends += 1 },
    })
    expect(result).toBe('sent')
    expect(sends).toBe(1)
  })

  it('does not send the same potential_customer reminder twice', async () => {
    const row = dueProposal({ outcome_type: 'potential_customer' })
    const db = createMemoryDb(row)
    let sends = 0
    const send = async () => { sends += 1 }

    expect(await deliverClaimedFollowUp({ proposal: asDue(row), now: NOW, db, send })).toBe('sent')
    expect(row.follow_up_sent_at).toBe(NOW.toISOString())
    expect(await deliverClaimedFollowUp({
      proposal: asDue(row),
      now: new Date(NOW.getTime() + 60_000),
      db,
      send,
    })).toBe('skipped')
    expect(sends).toBe(1)
    expect(isFollowUpDue(row, new Date(NOW.getTime() + 40 * 24 * 60 * 60 * 1000))).toBe(false)
  })

  it('lets only one of two parallel workers claim the same row', async () => {
    const row = dueProposal({ outcome_type: 'potential_customer' })
    const db = createMemoryDb(row)
    let sends = 0
    const send = async () => {
      sends += 1
    }
    const [first, second] = await Promise.all([
      deliverClaimedFollowUp({ proposal: asDue(row), now: NOW, db, send }),
      deliverClaimedFollowUp({ proposal: asDue(row), now: NOW, db, send }),
    ])
    expect([first, second].sort()).toEqual(['sent', 'skipped'])
    expect(sends).toBe(1)
  })

  it('schedules the next no_show day and allows a later run to send again', async () => {
    const row = dueProposal({ outcome_type: 'no_show' })
    const db = createMemoryDb(row)
    let sends = 0
    const send = async () => { sends += 1 }

    expect(await deliverClaimedFollowUp({ proposal: asDue(row), now: NOW, db, send })).toBe('sent')
    expect(row.follow_up_sent_at).toBeNull()
    expect(row.follow_up_at).toBe(new Date(NOW.getTime() + NO_SHOW_FOLLOW_UP_MS).toISOString())
    expect(isFollowUpDue(row, NOW)).toBe(false)

    const nextDay = new Date(NOW.getTime() + NO_SHOW_FOLLOW_UP_MS)
    expect(isFollowUpDue(row, nextDay)).toBe(true)
    expect(await deliverClaimedFollowUp({ proposal: asDue(row), now: nextDay, db, send })).toBe('sent')
    expect(sends).toBe(2)
  })

  it('releases the claim when sending fails so a later run can retry', async () => {
    const row = dueProposal({ outcome_type: 'potential_customer' })
    const db = createMemoryDb(row)
    let sends = 0
    await expect(deliverClaimedFollowUp({
      proposal: asDue(row),
      now: NOW,
      db,
      send: async () => {
        sends += 1
        throw new Error('smtp down')
      },
    })).rejects.toThrow('smtp down')
    expect(row.follow_up_sent_at).toBeNull()

    expect(await deliverClaimedFollowUp({
      proposal: asDue(row),
      now: NOW,
      db,
      send: async () => { sends += 1 },
    })).toBe('sent')
    expect(sends).toBe(2)
  })

  it('reschedules a stuck no_show claim without sending', async () => {
    const row = dueProposal({
      outcome_type: 'no_show',
      follow_up_sent_at: '2026-06-01T07:00:00.000Z',
    })
    const db = createMemoryDb(row)
    const nextAt = new Date(NOW.getTime() + NO_SHOW_FOLLOW_UP_MS).toISOString()
    expect(isStuckNoShowClaim(row, NOW.toISOString())).toBe(true)
    expect(await db.repairNoShowOrphans(NOW.toISOString(), nextAt)).toBe(1)
    expect(row.follow_up_sent_at).toBeNull()
    expect(row.follow_up_at).toBe(nextAt)
    expect(isFollowUpDue(row, NOW)).toBe(false)
  })
})

describe('supabase claim filters', () => {
  function recordingClient(result: { data: { id: string }[] | null; error: { message: string } | null }) {
    const calls: Array<{ method: string; args: unknown[] }> = []
    const builder: Record<string, unknown> & { then: Promise<typeof result>['then'] } = {
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    }
    for (const method of ['update', 'select', 'eq', 'is', 'in', 'lte', 'not']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args })
        return builder
      }
    }
    return { calls, from: () => builder }
  }

  it('claims with one conditional update and only when one row matches', async () => {
    const client = recordingClient({ data: [{ id: 'proposal-1' }], error: null })
    const db = createSupabaseFollowUpDb(client as unknown as FollowUpSupabase)
    const claimed = await db.claim({
      id: 'proposal-1',
      tenantId: 'tenant-a',
      outcomeType: 'no_show',
      followUpAt: DUE,
      claimAt: NOW.toISOString(),
    })
    expect(claimed).toBe(true)
    expect(client.calls[0]).toEqual({ method: 'update', args: [{ follow_up_sent_at: NOW.toISOString() }] })
    expect(client.calls).toContainEqual({ method: 'eq', args: ['tenant_id', 'tenant-a'] })
    expect(client.calls).toContainEqual({ method: 'is', args: ['follow_up_sent_at', null] })
    expect(client.calls).toContainEqual({ method: 'in', args: ['outcome_type', ['potential_customer', 'no_show']] })
    expect(client.calls).toContainEqual({ method: 'lte', args: ['follow_up_at', NOW.toISOString()] })
    expect(client.calls).not.toContainEqual({ method: 'eq', args: ['status', 'pending'] })

    const lost = recordingClient({ data: [], error: null })
    const lostDb = createSupabaseFollowUpDb(lost as unknown as FollowUpSupabase)
    expect(await lostDb.claim({
      id: 'proposal-1',
      tenantId: 'tenant-a',
      outcomeType: 'no_show',
      followUpAt: DUE,
      claimAt: NOW.toISOString(),
    })).toBe(false)
  })
})

describe('open-request digest', () => {
  it('keeps pending rows and drops accepted rows', () => {
    const rows = [
      { id: 'open', status: 'pending' },
      { id: 'done', status: 'accepted' },
    ]
    expect(retainPendingProposals(rows, new Set(['open']))).toEqual([{ id: 'open', status: 'pending' }])
  })

  it('reloads ids with status pending and no outcome filter', async () => {
    const calls: Array<{ method: string; args: unknown[] }> = []
    const builder: Record<string, unknown> & { then: Promise<{ data: { id: string }[]; error: null }>['then'] } = {
      then: (resolve, reject) => Promise.resolve({ data: [{ id: 'open' }], error: null }).then(resolve, reject),
    }
    for (const method of ['select', 'in', 'eq']) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args })
        return builder
      }
    }
    const ids = await loadPendingProposalIds({ from: () => builder } as unknown as FollowUpSupabase, ['open', 'done'])
    expect(calls).toContainEqual({ method: 'eq', args: ['status', 'pending'] })
    expect(calls.some((call) => call.args[0] === 'outcome_type')).toBe(false)
    expect([...ids]).toEqual(['open'])
  })
})

describe('follow-up mail copy', () => {
  it('describes the no_show stop rule without claiming that accepted status stops it', () => {
    const copy = followUpReminderCopy({
      outcomeType: 'no_show',
      recipientName: 'Ada',
      customerName: 'Kim',
    })
    const text = `${copy.introText} ${copy.footerText}`
    expect(text).toContain('Nicht erreichbar')
    expect(text).toContain('Erinnerung geplant')
    expect(text).not.toMatch(/anderen Status/i)
    expect(text).not.toMatch(/status/i)
  })
})

describe('deep link merge', () => {
  it('appends a highlighted accepted proposal that is not in the open list', () => {
    const pending = [{ id: 'open', status: 'pending' }]
    const highlighted = { id: 'done', status: 'accepted' }
    expect(mergeHighlightedProposal(pending, highlighted)).toEqual([
      { id: 'open', status: 'pending' },
      { id: 'done', status: 'accepted' },
    ])
    expect(mergeHighlightedProposal(pending, { id: 'open', status: 'pending' })).toEqual(pending)
    expect(mergeHighlightedProposal(pending, null)).toEqual(pending)
  })
})

describe('call-site inventory', () => {
  it('status update builds the follow-up patch in one place', () => {
    const src = readRepo('server/api/admin/update-booking-proposal-status.post.ts')
    expect(src).toContain('buildBookingProposalUpdate')
    expect(src).toContain('staff label')
  })

  it('follow-up cron claims before send and does not require pending', () => {
    const src = readRepo('server/api/cron/send-proposal-followup-reminders.get.ts')
    expect(src).toContain('deliverClaimedFollowUp')
    expect(src).toContain('followUpReminderCopy')
    expect(src).not.toContain(".eq('status'")
    expect(src).toContain("in('outcome_type', ['potential_customer', 'no_show'])")
  })

  it('digest rechecks pending and does not filter by outcome', () => {
    const src = readRepo('server/api/cron/send-booking-proposal-reminders.get.ts')
    expect(src).toContain('loadPendingProposalIds')
    expect(src).toContain(".eq('status', 'pending')")
    expect(src).not.toContain('outcome_type')
  })

  it('highlighted proposals stay tenant scoped', () => {
    const src = readRepo('server/api/admin/get-booking-proposals.get.ts')
    expect(src).toContain('mergeHighlightedProposal')
    expect(src).toContain(".eq('tenant_id', tenantId)")
    expect(src).toContain(".eq('staff_id', dbUserId)")
  })
})
