import { describe, expect, it, vi, beforeEach } from 'vitest'
import { classifyIcsFeed, SIMY_ERROR_PRODID } from '../ics-feed-classification'
import { probeIcsUrl } from '../probe-ics-url'
import { syncOneExternalCalendar } from '../sync-external-calendars-job'

const SIMY_SUCCESS_EMPTY = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Simy//Driving Lessons Calendar//EN
BEGIN:VTIMEZONE
TZID:Europe/Zurich
END:VTIMEZONE
END:VCALENDAR`

const SIMY_SUCCESS_EVENT = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Simy//Driving Lessons Calendar//EN
BEGIN:VTIMEZONE
TZID:Europe/Zurich
END:VTIMEZONE
BEGIN:VEVENT
UID:evt-1@simy.ch
DTSTART:20260925T100000Z
DTEND:20260925T110000Z
SUMMARY:Lesson
END:VEVENT
END:VCALENDAR`

const SIMY_STUB = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:${SIMY_ERROR_PRODID}
END:VCALENDAR`

const GOOGLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
UID:g1@google.com
DTSTART:20260925T080000Z
DTEND:20260925T090000Z
SUMMARY:Block
END:VEVENT
END:VCALENDAR`

const ICLOUD_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Apple Inc.//iCal 5.0//EN
BEGIN:VEVENT
UID:a1@icloud.com
DTSTART:20260925T120000Z
DTEND:20260925T130000Z
SUMMARY:Busy
END:VEVENT
END:VCALENDAR`

const HTML_WITH_VCAL = `<!DOCTYPE html><html><body>BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example//EN
END:VCALENDAR</body></html>`

describe('classifyIcsFeed', () => {
  it('classifies a real Simy feed with events as success_with_events', () => {
    const result = classifyIcsFeed(SIMY_SUCCESS_EVENT, 'text/calendar')
    expect(result.ok && result.kind).toBe('success_with_events')
  })

  it('classifies a real empty Simy feed as success_empty', () => {
    const result = classifyIcsFeed(SIMY_SUCCESS_EMPTY, 'text/calendar')
    expect(result.ok && result.kind).toBe('success_empty')
  })

  it('rejects the inactive-token stub', () => {
    const result = classifyIcsFeed(SIMY_STUB, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('simy_error_stub')
  })

  it('does not treat the stub and a real empty feed as the same class', () => {
    const empty = classifyIcsFeed(SIMY_SUCCESS_EMPTY, 'text/calendar')
    const stub = classifyIcsFeed(SIMY_STUB, 'text/html')
    expect(empty.ok && empty.kind).not.toBe(stub.ok ? stub.kind : stub.code)
  })

  it('accepts Google and iCloud fixtures', () => {
    expect(classifyIcsFeed(GOOGLE_ICS, 'text/calendar').ok).toBe(true)
    expect(classifyIcsFeed(ICLOUD_ICS, 'text/calendar; charset=utf-8').ok).toBe(true)
  })

  it('rejects HTML that merely contains BEGIN:VCALENDAR', () => {
    const result = classifyIcsFeed(HTML_WITH_VCAL, 'text/html')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('html_disguised_as_ics')
  })

  it('rejects a body that is not a calendar', () => {
    const result = classifyIcsFeed('not a calendar at all, just words and more words', 'text/plain')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('not_vcalendar')
  })

  it('does not include a share token in the stub message', () => {
    const result = classifyIcsFeed(SIMY_STUB, 'text/html')
    const text = result.ok ? '' : `${result.message} ${result.tip || ''}`
    expect(text).not.toMatch(/token=|ics\?|BEGIN:VCALENDAR/)
  })
})

describe('probeIcsUrl classification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetch(status: number, body: string, contentType: string) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, {
      status,
      headers: { 'content-type': contentType },
    })))
  }

  it('returns http_404 without a body class', async () => {
    mockFetch(404, 'missing', 'text/plain')
    const result = await probeIcsUrl('https://calendar.example.test/feed.ics')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('http_404')
  })

  it('returns http_503 without a body class', async () => {
    mockFetch(503, 'down', 'text/plain')
    const result = await probeIcsUrl('https://calendar.example.test/feed.ics')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('http_503')
  })

  it('rejects the Simy stub over HTTP 200', async () => {
    mockFetch(200, SIMY_STUB, 'text/html')
    const result = await probeIcsUrl('https://app.simy.ch/api/calendar/ics')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('simy_error_stub')
      expect(result.message).not.toMatch(/token=/)
      expect(result.url).not.toMatch(/token=/)
    }
  })

  it('accepts a genuine empty Simy feed', async () => {
    mockFetch(200, SIMY_SUCCESS_EMPTY, 'text/calendar')
    const result = await probeIcsUrl('https://calendar.example.test/empty.ics')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.feedKind).toBe('success_empty')
  })
})

describe('syncOneExternalCalendar snapshot safety', () => {
  const calendar = {
    id: 'cal-1',
    tenant_id: 'tenant-1',
    staff_id: 'staff-1',
    calendar_name: 'Fixture',
    ics_url: 'https://calendar.example.test/feed.ics',
    consecutive_failures: 2,
    last_failure_at: null,
  }

  function supabaseRecorder() {
    const ops: Array<{ op: string; table: string; payload?: unknown }> = []
    const from = (table: string) => {
      const builder: Record<string, unknown> = {}
      const chain = () => builder
      builder.select = vi.fn(chain)
      builder.eq = vi.fn(chain)
      builder.delete = vi.fn(() => {
        ops.push({ op: 'delete', table })
        return builder
      })
      builder.update = vi.fn((payload: unknown) => {
        ops.push({ op: 'update', table, payload })
        return builder
      })
      builder.upsert = vi.fn((payload: unknown) => {
        ops.push({ op: 'upsert', table, payload })
        return builder
      })
      builder.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      builder.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
      return builder
    }
    return { from, ops }
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the busy snapshot and does not advance last_sync_at on the stub', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(SIMY_STUB, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })))
    const db = supabaseRecorder()
    const result = await syncOneExternalCalendar(db, calendar, new Map(), { notifyOnFailure: false })
    expect(result.status).toBe('failed')
    expect(db.ops.some((op) => op.op === 'delete')).toBe(false)
    const meta = db.ops.find((op) => op.op === 'update' && op.table === 'external_calendars')
    expect(meta?.payload).toMatchObject({
      consecutive_failures: 3,
    })
    expect(meta?.payload).not.toHaveProperty('last_sync_at')
    expect(JSON.stringify(meta?.payload)).not.toMatch(/EMPTY_CALENDAR|token=/)
  })

  it('replaces the snapshot on a genuine empty feed and clears the error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(SIMY_SUCCESS_EMPTY, {
      status: 200,
      headers: { 'content-type': 'text/calendar' },
    })))
    const db = supabaseRecorder()
    const result = await syncOneExternalCalendar(db, calendar, new Map(), { notifyOnFailure: false })
    expect(result).toEqual({ status: 'synced', events: 0 })
    expect(db.ops.some((op) => op.op === 'delete' && op.table === 'external_busy_times')).toBe(true)
    const meta = db.ops.find((op) => op.op === 'update' && op.table === 'external_calendars' && payloadRecord(op.payload)?.last_sync_at)
    expect(meta?.payload).toMatchObject({
      consecutive_failures: 0,
      last_fetch_error: null,
    })
  })

  it('replaces the snapshot when the feed has events', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(GOOGLE_ICS, {
      status: 200,
      headers: { 'content-type': 'text/calendar' },
    })))
    const db = supabaseRecorder()
    const result = await syncOneExternalCalendar(db, { ...calendar, consecutive_failures: 4 }, new Map(), { notifyOnFailure: false })
    expect(result.status).toBe('synced')
    if (result.status === 'synced') expect(result.events).toBeGreaterThan(0)
    expect(db.ops.some((op) => op.op === 'delete' && op.table === 'external_busy_times')).toBe(true)
    expect(db.ops.some((op) => op.op === 'upsert' && op.table === 'external_busy_times')).toBe(true)
    const meta = db.ops.find((op) => op.op === 'update' && op.table === 'external_calendars' && payloadRecord(op.payload)?.last_sync_at)
    expect(meta?.payload).toMatchObject({ consecutive_failures: 0, last_fetch_error: null })
  })

  it('does not advance last_sync_at on HTTP 503', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    const db = supabaseRecorder()
    const result = await syncOneExternalCalendar(db, calendar, new Map(), { notifyOnFailure: false })
    expect(result.status).toBe('failed')
    expect(db.ops.some((op) => op.op === 'delete')).toBe(false)
    const meta = db.ops.find((op) => op.op === 'update')
    expect(meta?.payload).not.toHaveProperty('last_sync_at')
    expect(payloadRecord(meta?.payload)?.consecutive_failures).toBe(3)
  })
})

function payloadRecord(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  return payload as Record<string, unknown>
}
