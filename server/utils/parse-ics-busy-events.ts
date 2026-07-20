/**
 * Parse ICS VEVENTs into busy intervals, expanding RRULE recurrence into concrete
 * occurrences within a time window. Shared by cron + manual external-calendar sync.
 */
import { createRequire } from 'node:module'

// rrule ships dual CJS/ESM; named ESM imports are unreliable under Nitro/tsx.
const require = createRequire(import.meta.url)
const RRuleLib = require('rrule') as typeof import('rrule')
const { RRule, RRuleSet } = RRuleLib

export interface IcsBusyEvent {
  uid?: string
  summary?: string
  location?: string
  start: string // ISO 8601
  end: string // ISO 8601
}

interface RawVEvent {
  uid?: string
  summary?: string
  location?: string
  start?: string
  end?: string
  durationMs?: number
  status?: string
  rrule?: string
  exdates: string[]
  recurrenceId?: string
}

export function parseIcsBusyEvents(
  icsData: string,
  window: { start: Date; end: Date },
): IcsBusyEvent[] {
  const raw = parseRawVEvents(icsData)

  // Overrides (RECURRENCE-ID) replace a specific occurrence of the same UID
  const overrideKeys = new Set<string>()
  for (const ev of raw) {
    if (ev.uid && ev.recurrenceId) {
      overrideKeys.add(overrideKey(ev.uid, ev.recurrenceId))
    }
  }

  const out: IcsBusyEvent[] = []
  const seen = new Set<string>()

  const push = (ev: IcsBusyEvent) => {
    if (!ev.start || !ev.end) return
    const key = `${ev.uid || ''}|${ev.start}|${ev.end}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(ev)
  }

  for (const ev of raw) {
    if (ev.status === 'CANCELLED') continue
    if (!ev.start) continue

    const startMs = new Date(ev.start).getTime()
    if (Number.isNaN(startMs)) continue

    let endIso = ev.end
    if (!endIso && ev.durationMs != null) {
      endIso = new Date(startMs + ev.durationMs).toISOString()
    }
    if (!endIso) continue

    const endMs = new Date(endIso).getTime()
    if (Number.isNaN(endMs) || endMs <= startMs) continue

    const durationMs = endMs - startMs

    // Exception / single instance (no RRULE, or explicit RECURRENCE-ID override)
    if (!ev.rrule || ev.recurrenceId) {
      if (endMs >= window.start.getTime() && startMs <= window.end.getTime()) {
        push({
          uid: ev.uid,
          summary: ev.summary,
          location: ev.location,
          start: toIso(ev.start),
          end: toIso(endIso),
        })
      }
      continue
    }

    // Recurring master: expand into concrete occurrences
    try {
      const set = new RRuleSet()
      const options = RRule.parseString(ev.rrule)
      options.dtstart = new Date(startMs)
      set.rrule(new RRule(options))

      for (const ex of ev.exdates) {
        const exMs = new Date(ex).getTime()
        if (!Number.isNaN(exMs)) set.exdate(new Date(exMs))
      }

      // Include occurrences that may start just before the window but still overlap it
      const betweenStart = new Date(window.start.getTime() - durationMs)
      const occurrences = set.between(betweenStart, window.end, true)

      for (const occ of occurrences) {
        const occStart = occ.getTime()
        const occEnd = occStart + durationMs
        if (occEnd < window.start.getTime() || occStart > window.end.getTime()) continue
        if (ev.uid && overrideKeys.has(overrideKey(ev.uid, new Date(occStart).toISOString()))) {
          continue
        }
        // Also match overrides keyed by the raw recurrence-id string precision
        if (ev.uid && overrideKeys.has(overrideKey(ev.uid, occ.toISOString()))) {
          continue
        }

        push({
          uid: ev.uid,
          summary: ev.summary,
          location: ev.location,
          start: new Date(occStart).toISOString(),
          end: new Date(occEnd).toISOString(),
        })
      }
    } catch (err: any) {
      // Fall back to the master instance only
      if (endMs >= window.start.getTime() && startMs <= window.end.getTime()) {
        push({
          uid: ev.uid,
          summary: ev.summary,
          location: ev.location,
          start: toIso(ev.start),
          end: toIso(endIso),
        })
      }
    }
  }

  return out
}

function overrideKey(uid: string, recurrenceIdIso: string): string {
  const ms = new Date(recurrenceIdIso).getTime()
  return `${uid}|${Number.isNaN(ms) ? recurrenceIdIso : ms}`
}

function toIso(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toISOString()
}

function parseRawVEvents(icsData: string): RawVEvent[] {
  const events: RawVEvent[] = []
  const rawLines = icsData.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []
  for (const raw of rawLines) {
    if (raw.startsWith(' ') || raw.startsWith('\t')) {
      if (lines.length > 0) lines[lines.length - 1] += raw.slice(1)
    } else {
      lines.push(raw)
    }
  }

  let current: RawVEvent | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === 'BEGIN:VEVENT') {
      current = { exdates: [] }
      continue
    }
    if (line === 'END:VEVENT') {
      if (current) events.push(current)
      current = null
      continue
    }
    if (!current) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const prop = line.substring(0, colonIdx)
    const value = line.substring(colonIdx + 1)
    const [name, ...params] = prop.split(';')
    const upperName = name.toUpperCase()

    switch (upperName) {
      case 'UID':
        current.uid = value
        break
      case 'SUMMARY':
        current.summary = unescapeIcsText(value)
        break
      case 'LOCATION':
        current.location = unescapeIcsText(value)
        break
      case 'STATUS':
        current.status = value.toUpperCase()
        break
      case 'RRULE':
        current.rrule = value.trim()
        break
      case 'DURATION':
        current.durationMs = parseIcsDurationMs(value)
        break
      case 'DTSTART': {
        const tzid = params.find(p => p.toUpperCase().startsWith('TZID='))?.split('=')[1]
        const dateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
        current.start = parseICSTimestamp(value, { tzid, dateOnly })
        break
      }
      case 'DTEND': {
        const tzid = params.find(p => p.toUpperCase().startsWith('TZID='))?.split('=')[1]
        const dateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
        current.end = parseICSTimestamp(value, { tzid, dateOnly })
        break
      }
      case 'RECURRENCE-ID': {
        const tzid = params.find(p => p.toUpperCase().startsWith('TZID='))?.split('=')[1]
        const dateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
        current.recurrenceId = parseICSTimestamp(value, { tzid, dateOnly })
        break
      }
      case 'EXDATE': {
        const tzid = params.find(p => p.toUpperCase().startsWith('TZID='))?.split('=')[1]
        const dateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
        for (const part of value.split(',')) {
          const trimmed = part.trim()
          if (!trimmed) continue
          current.exdates.push(parseICSTimestamp(trimmed, { tzid, dateOnly }))
        }
        break
      }
      default:
        break
    }
  }

  return events
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function parseIcsDurationMs(value: string): number | undefined {
  // e.g. PT1H30M, P1DT2H, -PT15M
  const m = value.trim().match(/^(-)?P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i)
  if (!m) return undefined
  const sign = m[1] ? -1 : 1
  const days = parseInt(m[2] || '0', 10)
  const hours = parseInt(m[3] || '0', 10)
  const minutes = parseInt(m[4] || '0', 10)
  const seconds = parseInt(m[5] || '0', 10)
  return sign * (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000
}

function parseICSTimestamp(timestamp: string, opts?: { tzid?: string; dateOnly?: boolean }): string {
  const clean = timestamp.trim()

  if (opts?.dateOnly || (/^\d{8}$/.test(clean) && !clean.includes('T'))) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    // All-day: treat as midnight UTC (display layer converts to Zurich)
    return `${year}-${month}-${day}T00:00:00Z`
  }

  if (/^\d{8}T\d{6}Z$/.test(clean)) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    const hour = clean.substring(9, 11)
    const minute = clean.substring(11, 13)
    const second = clean.substring(13, 15)
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  }

  if (/^\d{8}T\d{6}$/.test(clean)) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    const hour = clean.substring(9, 11)
    const minute = clean.substring(11, 13)
    const second = clean.substring(13, 15)
    const localTimeString = `${year}-${month}-${day}T${hour}:${minute}:${second}`

    if (opts?.tzid) {
      try {
        // Interpret wall-clock as if UTC, then apply (UTC - zone) offset so that
        // e.g. 07:00 Europe/Zurich in summer becomes 05:00Z.
        const dateAsUTC = new Date(`${localTimeString}Z`)
        const utcOffset = getUTCOffsetForTimezone(opts.tzid, dateAsUTC)
        return new Date(dateAsUTC.getTime() + utcOffset).toISOString()
      } catch {
        // fall through
      }
    }

    return `${localTimeString}Z`
  }

  // Last resort: try native Date parse
  const fallback = new Date(clean)
  if (!Number.isNaN(fallback.getTime())) return fallback.toISOString()
  return new Date().toISOString()
}

function getUTCOffsetForTimezone(tzid: string, date: Date): number {
  try {
    const parts = (timeZone: string) => {
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      const [y, m, d, h, min, s] = fmt.format(date).split(/\D+/).filter(Boolean).map(Number)
      return Date.UTC(y, m - 1, d, h === 24 ? 0 : h, min, s)
    }
    return parts('UTC') - parts(tzid)
  } catch {
    return 0
  }
}
