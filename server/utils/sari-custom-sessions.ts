/**
 * SARI session swap resolution.
 *
 * Public payloads never carry sari_session_id. The browser references a course
 * session by its public course_sessions.id; the server resolves the internal
 * SARI id from the database. Replacement matches by VALUE, never by index, so
 * the order of the ids inside courses.sari_course_id does not have to match the
 * order of course_sessions.
 *
 * The legacy positional fallback is kept for course_registrations rows that were
 * persisted before this change (in-flight Wallee payments) and for the
 * authenticated admin transfer path, which still sends internal SARI ids.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type CourseSessionSariRow = {
  id?: string | null
  sari_session_id?: string | number | null
  start_time?: string | null
}

/** One entry of course_registrations.custom_sessions, keyed by day position. */
export type CustomSessionEntry = {
  /** Public shape: course_sessions.id of the sessions being replaced. */
  originalSessionIds?: unknown
  /** Public shape: course_sessions.id of the newly chosen sessions. */
  sessionIds?: unknown
  sessionId?: unknown
  /** Legacy shape: internal SARI ids. Never produced by browser payloads. */
  originalSariIds?: unknown
  sariSessionIds?: unknown
  sariSessionId?: unknown
}

export type CustomSessionsMap = Record<string, CustomSessionEntry | null | undefined>

/** Maps a public course_sessions.id to its internal sari_session_id. */
export type SariSessionResolver = (publicSessionId: string) => string | undefined

function toIdList(...values: unknown[]): string[] {
  const out: string[] = []
  for (const value of values) {
    if (value == null) continue
    const items = Array.isArray(value) ? value : [value]
    for (const item of items) {
      if (item == null) continue
      const str = String(item).trim()
      if (str) out.push(str)
    }
  }
  return out
}

/** Builds the public-session-id -> sari_session_id lookup for a set of rows. */
export function buildSariSessionMap(
  sessions: CourseSessionSariRow[] | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const session of sessions || []) {
    if (!session?.id) continue
    if (session.sari_session_id == null) continue
    const sariId = String(session.sari_session_id).trim()
    if (sariId) map.set(String(session.id), sariId)
  }
  return map
}

/**
 * Loads the public-session-id -> sari_session_id mapping straight from the DB,
 * scoped to the tenant. Tenant scoping is the security control: a client cannot
 * pull a session of another tenant into its own enrollment.
 */
export async function loadSariSessionMap(
  supabase: SupabaseClient,
  publicSessionIds: string[],
  tenantId: string,
): Promise<Map<string, string>> {
  const ids = [...new Set(publicSessionIds.filter(Boolean))]
  if (ids.length === 0 || !tenantId) return new Map()

  const { data } = await supabase
    .from('course_sessions')
    .select('id, sari_session_id')
    .in('id', ids)
    .eq('tenant_id', tenantId)

  return buildSariSessionMap(data as CourseSessionSariRow[] | null)
}

/** Every public session id referenced by a custom_sessions map. */
export function collectPublicSessionIds(
  customSessions: CustomSessionsMap | null | undefined,
): string[] {
  const ids: string[] = []
  for (const entry of Object.values(customSessions || {})) {
    if (!entry) continue
    ids.push(...toIdList(entry.originalSessionIds))
    ids.push(...toIdList(entry.sessionIds, entry.sessionId))
  }
  return [...new Set(ids)]
}

export type ResolvedSwap = {
  originalSariIds: string[]
  newSariIds: string[]
  /** Public session ids that could not be resolved (wrong tenant / not SARI). */
  unresolvedSessionIds: string[]
  /** True when the entry carried internal SARI ids instead of public refs. */
  usedLegacyShape: boolean
}

/** Resolves a single custom_sessions entry into internal SARI ids. */
export function resolveCustomSessionEntry(
  entry: CustomSessionEntry | null | undefined,
  resolve: SariSessionResolver,
): ResolvedSwap {
  const unresolvedSessionIds: string[] = []
  const mapIds = (publicIds: string[]) => {
    const out: string[] = []
    for (const publicId of publicIds) {
      const sariId = resolve(publicId)
      if (sariId) out.push(sariId)
      else unresolvedSessionIds.push(publicId)
    }
    return out
  }

  const publicOriginals = toIdList(entry?.originalSessionIds)
  const publicNew = toIdList(entry?.sessionIds, entry?.sessionId)

  if (publicOriginals.length > 0 || publicNew.length > 0) {
    return {
      originalSariIds: mapIds(publicOriginals),
      newSariIds: mapIds(publicNew),
      unresolvedSessionIds,
      usedLegacyShape: false,
    }
  }

  return {
    originalSariIds: toIdList(entry?.originalSariIds),
    newSariIds: toIdList(entry?.sariSessionIds, entry?.sariSessionId),
    unresolvedSessionIds,
    usedLegacyShape: true,
  }
}

/**
 * Number of sessions per day position, ordered chronologically. Only used by the
 * legacy positional fallback.
 */
function sessionsPerPosition(
  courseSessions: CourseSessionSariRow[] | null | undefined,
  totalSariIds: number,
): number[] {
  const sessions = [...(courseSessions || [])]
    .filter(s => !!s?.start_time)
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))

  if (sessions.length > 0) {
    const byDate = new Map<string, number>()
    for (const session of sessions) {
      const date = String(session.start_time).split('T')[0]
      byDate.set(date, (byDate.get(date) || 0) + 1)
    }
    return [...byDate.values()]
  }

  // VKU is typically 4 sessions across 2 days.
  if (totalSariIds === 4) return [2, 2]
  return Array(totalSariIds).fill(1)
}

export type SwapReplacement = { from: string; to: string }

export type ApplySwapsResult = {
  /** The SARI session ids to enroll into, after applying every swap. */
  sariSessionIds: string[]
  replacements: SwapReplacement[]
  /** Public session ids that could not be resolved — caller should reject. */
  unresolvedSessionIds: string[]
  /** SARI ids that were not present in the base list. */
  notFoundSariIds: string[]
  /** Day positions that fell back to the legacy positional heuristic. */
  legacyPositionalPositions: string[]
}

/**
 * Applies every custom_sessions swap onto the course's base SARI id list.
 * Deterministic: originals are located by value.
 */
export function applySariSessionSwaps(
  baseSariSessionIds: string[],
  customSessions: CustomSessionsMap | null | undefined,
  resolve: SariSessionResolver,
  courseSessions?: CourseSessionSariRow[] | null,
): ApplySwapsResult {
  const sariSessionIds = baseSariSessionIds.map(id => String(id))
  const replacements: SwapReplacement[] = []
  const unresolvedSessionIds: string[] = []
  const notFoundSariIds: string[] = []
  const legacyPositionalPositions: string[] = []

  if (!customSessions || typeof customSessions !== 'object') {
    return { sariSessionIds, replacements, unresolvedSessionIds, notFoundSariIds, legacyPositionalPositions }
  }

  for (const [position, entry] of Object.entries(customSessions)) {
    const resolved = resolveCustomSessionEntry(entry, resolve)
    unresolvedSessionIds.push(...resolved.unresolvedSessionIds)

    const { originalSariIds, newSariIds } = resolved
    if (newSariIds.length === 0) continue

    // A public-shape payload whose original could not be resolved must never
    // fall through to the positional heuristic — that would write a blind index.
    if (originalSariIds.length === 0 && !resolved.usedLegacyShape) {
      continue
    }

    if (originalSariIds.length > 0) {
      const pairs = Math.min(originalSariIds.length, newSariIds.length)
      for (let i = 0; i < pairs; i++) {
        const from = originalSariIds[i]
        const to = newSariIds[i]
        const idx = sariSessionIds.findIndex(id => id === from)
        if (idx >= 0) {
          sariSessionIds[idx] = to
          replacements.push({ from, to })
        } else {
          notFoundSariIds.push(from)
        }
      }
      continue
    }

    // Legacy positional fallback — only for rows persisted without originals.
    legacyPositionalPositions.push(position)
    const perPosition = sessionsPerPosition(courseSessions, sariSessionIds.length)
    const posNum = parseInt(position, 10)
    let startIdx = 0
    for (let p = 0; p < posNum - 1 && p < perPosition.length; p++) {
      startIdx += perPosition[p]
    }
    for (let i = 0; i < newSariIds.length && startIdx + i < sariSessionIds.length; i++) {
      replacements.push({ from: sariSessionIds[startIdx + i], to: newSariIds[i] })
      sariSessionIds[startIdx + i] = newSariIds[i]
    }
  }

  return { sariSessionIds, replacements, unresolvedSessionIds, notFoundSariIds, legacyPositionalPositions }
}
