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
}): Promise<void> {
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
