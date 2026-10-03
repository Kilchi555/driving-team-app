import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSariUnenrollBlocked, isSariUnenrollIdempotent } from '~/utils/sariClient'
import {
  deleteConfirmedSariMembership,
  isConfirmedSariEnrollDuplicate,
  parsePositiveSariSessionId,
  recordConfirmedSariMembershipWithRetry,
  SARI_MEMBERSHIP_SOURCE,
  type RegistrationSariMembership,
} from '~/server/utils/registration-sari-membership'

type TransferChange = {
  oldSariIds: string[]
  targetSariSessionIds: string[]
}

/**
 * A transfer moves one or more course parts (Teile), not every membership on
 * the registration. Ids proven to belong only to parts that stay put may remain.
 * Every other stored membership must be named by oldSariIds. Otherwise the
 * transfer stops before any SARI call.
 */
export function assertTransferMembershipCoverage(args: {
  memberships: Array<{ sari_session_id: number }>
  changes: Array<{ oldSariIds: string[] }>
  retainedMembershipIds?: number[]
}): void {
  const covered = new Set<number>()
  for (const change of args.changes) {
    for (const sid of change.oldSariIds) {
      const parsed = parsePositiveSariSessionId(sid)
      if (parsed != null) covered.add(parsed)
    }
  }
  const retained = new Set(args.retainedMembershipIds || [])
  for (const membership of args.memberships) {
    if (covered.has(membership.sari_session_id) || retained.has(membership.sari_session_id)) continue
    throw createError({
      statusCode: 409,
      statusMessage: 'SARI-Membership konnte dem zu verschiebenden Teil nicht eindeutig zugeordnet werden',
    })
  }
}

export function collectPositionSariIds(
  positionMap: Map<number, Array<{ sari_session_id?: unknown }>>,
  customSessions: Record<string, { sariSessionIds?: unknown; sariSessionId?: unknown }>,
): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>()
  const add = (position: number, value: unknown) => {
    const parsed = parsePositiveSariSessionId(value)
    if (parsed == null) return
    if (!map.has(position)) map.set(position, new Set())
    map.get(position)!.add(parsed)
  }
  for (const [position, sessions] of positionMap) {
    for (const session of sessions || []) add(position, session?.sari_session_id)
  }
  for (const [key, custom] of Object.entries(customSessions || {})) {
    const position = Number(key)
    if (!Number.isInteger(position) || position <= 0 || !custom) continue
    if (Array.isArray(custom.sariSessionIds)) {
      for (const id of custom.sariSessionIds) add(position, id)
    }
    add(position, custom.sariSessionId)
  }
  return map
}

export function retainedMembershipIdsForUnmovedParts(args: {
  memberships: Array<{ sari_session_id: number }>
  movedPositions: number[]
  idsByPosition: Map<number, Set<number>>
}): number[] {
  const moved = new Set(args.movedPositions)
  const retained: number[] = []
  for (const membership of args.memberships) {
    const positions: number[] = []
    for (const [position, ids] of args.idsByPosition) {
      if (ids.has(membership.sari_session_id)) positions.push(position)
    }
    if (positions.length > 0 && positions.every((position) => !moved.has(position))) {
      retained.push(membership.sari_session_id)
    }
  }
  return retained
}

/**
 * Unenroll the old SARI seats first, but keep their membership rows until the
 * target snapshots exist. A failed target enroll leaves the old rows and does
 * not touch custom_sessions (the caller saves those only after this resolves).
 */
export async function applySariSessionTransfer(args: {
  supabase: SupabaseClient
  sari: {
    enrollStudent: (courseId: number, faberid: string, birthdate: string) => Promise<void>
    unenrollStudent: (courseId: number | string, faberid: string) => Promise<void>
  }
  tenantId: string
  registrationId: string
  faberid: string
  birthdate: string
  changes: TransferChange[]
  memberships: RegistrationSariMembership[]
  retainedMembershipIds?: number[]
}): Promise<void> {
  assertTransferMembershipCoverage({
    memberships: args.memberships,
    changes: args.changes,
    retainedMembershipIds: args.retainedMembershipIds,
  })
  const membershipIds = new Set(args.memberships.map((membership) => membership.sari_session_id))
  const removedOldIds: number[] = []

  for (const change of args.changes) {
    for (const sid of change.oldSariIds) {
      if (change.targetSariSessionIds.includes(sid)) continue
      const numericId = parsePositiveSariSessionId(sid)
      if (numericId == null || !membershipIds.has(numericId) || removedOldIds.includes(numericId)) continue
      try {
        await args.sari.unenrollStudent(numericId, args.faberid)
      } catch (err: any) {
        if (!isSariUnenrollIdempotent(err?.message)) {
          throw createError({
            statusCode: isSariUnenrollBlocked(err?.message) ? 409 : 502,
            statusMessage: err?.message || `SARI-Abmeldung für ${numericId} fehlgeschlagen`,
          })
        }
      }
      removedOldIds.push(numericId)
    }
  }

  const targetIds: number[] = []
  for (const change of args.changes) {
    for (const sid of change.targetSariSessionIds) {
      if (change.oldSariIds.includes(sid)) continue
      const numericId = parsePositiveSariSessionId(sid)
      if (numericId == null) {
        throw createError({ statusCode: 400, statusMessage: `Ungültige SARI-Session-ID: ${sid}` })
      }
      if (!targetIds.includes(numericId)) targetIds.push(numericId)
    }
  }

  for (const numericId of targetIds) {
    try {
      await args.sari.enrollStudent(numericId, args.faberid, args.birthdate || '')
    } catch (err: any) {
      if (!isConfirmedSariEnrollDuplicate(err?.message)) {
        throw createError({
          statusCode: 502,
          statusMessage: `SARI-Anmeldung fehlgeschlagen (Test war ok): ${err?.message || 'unbekannt'}`,
        })
      }
    }
    await recordConfirmedSariMembershipWithRetry({
      supabase: args.supabase,
      tenantId: args.tenantId,
      registrationId: args.registrationId,
      sariSessionId: numericId,
      courseSessionId: null,
      source: SARI_MEMBERSHIP_SOURCE.transferSession,
    })
  }

  for (const numericId of removedOldIds) {
    await deleteConfirmedSariMembership({
      supabase: args.supabase,
      tenantId: args.tenantId,
      registrationId: args.registrationId,
      sariSessionId: numericId,
    })
  }
}
