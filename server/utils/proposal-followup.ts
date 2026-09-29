/**
 * Booking-proposal follow-up rules.
 *
 * Queue status (`booking_proposals.status`) and follow-up
 * (`outcome_type` + `follow_up_at` + `follow_up_sent_at`) are independent.
 * `status = 'accepted'` with a future follow-up is valid and must still send.
 */

export const FOLLOW_UP_OUTCOMES = ['potential_customer', 'no_show'] as const
export const NO_FOLLOW_UP_OUTCOMES = ['booking_confirmed', 'consultation_only', 'not_interested'] as const

export type FollowUpOutcome = (typeof FOLLOW_UP_OUTCOMES)[number]
export type NoFollowUpOutcome = (typeof NO_FOLLOW_UP_OUTCOMES)[number]

export const POTENTIAL_CUSTOMER_FOLLOW_UP_MS = 30 * 24 * 60 * 60 * 1000
export const NO_SHOW_FOLLOW_UP_MS = 24 * 60 * 60 * 1000

export type ProposalStatus = 'pending' | 'contacted' | 'accepted' | 'rejected' | 'expired'

export type FollowUpColumns = {
  follow_up_at: string | null
  follow_up_sent_at: null
}

type FollowUpResult = {
  data: Array<{ id: string; tenant_id?: string | null; follow_up_sent_at?: string | null }> | null
  error: { message: string } | null
}

type FollowUpQuery = PromiseLike<FollowUpResult> & {
  update: (patch: Record<string, unknown>) => FollowUpQuery
  select: (columns: string) => FollowUpQuery
  eq: (column: string, value: unknown) => FollowUpQuery
  is: (column: string, value: null) => FollowUpQuery
  in: (column: string, values: readonly string[]) => FollowUpQuery
  lte: (column: string, value: string) => FollowUpQuery
  not: (column: string, operator: string, value: null) => FollowUpQuery
}

export type FollowUpSupabase = {
  from: (table: string) => FollowUpQuery
}

export function isFollowUpOutcome(value: string | null | undefined): value is FollowUpOutcome {
  return value === 'potential_customer' || value === 'no_show'
}

export function isNoFollowUpOutcome(value: string | null | undefined): value is NoFollowUpOutcome {
  return value === 'booking_confirmed' || value === 'consultation_only' || value === 'not_interested'
}

/**
 * Columns to write together with a status update.
 * Empty object means: leave any existing follow-up untouched.
 */
export function followUpColumnsForStatusUpdate(input: {
  status: ProposalStatus
  outcomeType?: string | null
  now?: Date
}): FollowUpColumns | Record<string, never> {
  const now = input.now ?? new Date()
  const outcomeType = input.outcomeType || null

  if (outcomeType === 'potential_customer') {
    return {
      follow_up_at: new Date(now.getTime() + POTENTIAL_CUSTOMER_FOLLOW_UP_MS).toISOString(),
      follow_up_sent_at: null,
    }
  }

  if (outcomeType === 'no_show') {
    return {
      follow_up_at: new Date(now.getTime() + NO_SHOW_FOLLOW_UP_MS).toISOString(),
      follow_up_sent_at: null,
    }
  }

  if (isNoFollowUpOutcome(outcomeType)) {
    return { follow_up_at: null, follow_up_sent_at: null }
  }

  // Closing without an outcome must not keep a previously planned reminder.
  if (!outcomeType && input.status === 'accepted') {
    return { follow_up_at: null, follow_up_sent_at: null }
  }

  return {}
}

export function buildBookingProposalUpdate(input: {
  status: ProposalStatus
  outcomeType?: string | null
  adminNotes?: string | null
  now?: Date
}): Record<string, unknown> {
  const outcomeType = input.outcomeType || null
  return {
    status: input.status,
    admin_notes: input.adminNotes ?? null,
    ...(outcomeType ? { outcome_type: outcomeType } : {}),
    ...followUpColumnsForStatusUpdate({
      status: input.status,
      outcomeType,
      now: input.now,
    }),
  }
}

export type DueFollowUpRow = {
  outcome_type: string | null
  follow_up_at: string | null
  follow_up_sent_at: string | null
}

/** Mirrors the follow-up cron SELECT. Queue status is intentionally not an input. */
export function isFollowUpDue(row: DueFollowUpRow, now: Date): boolean {
  if (!isFollowUpOutcome(row.outcome_type)) return false
  if (!row.follow_up_at) return false
  if (row.follow_up_sent_at) return false
  return row.follow_up_at <= now.toISOString()
}

export function isStuckNoShowClaim(row: DueFollowUpRow, nowIso: string): boolean {
  return row.outcome_type === 'no_show'
    && row.follow_up_sent_at != null
    && row.follow_up_at != null
    && row.follow_up_at <= nowIso
}

type ClaimInput = {
  id: string
  tenantId: string
  outcomeType: string
  followUpAt: string
  claimAt: string
}

export type FollowUpDb = {
  /** Single conditional update. True only when this caller won the row. */
  claim(input: ClaimInput): Promise<boolean>
  releaseClaim(input: { id: string; tenantId: string; claimAt: string }): Promise<void>
  /** Advance a won no_show claim to the next day and clear the claim so tomorrow can send. */
  scheduleNoShow(input: { id: string; tenantId: string; claimAt: string; nextAt: string }): Promise<boolean>
  /**
   * no_show rows claimed but not advanced (process died after claim).
   * Reschedule only — do not send. Avoids a second mail when the first send may have succeeded.
   */
  repairNoShowOrphans(nowIso: string, nextAt: string): Promise<number>
}

export type FollowUpDelivery = 'sent' | 'skipped' | 'sent_pending_reschedule'

export async function deliverClaimedFollowUp(args: {
  proposal: { id: string; tenant_id: string; outcome_type: string; follow_up_at: string }
  now: Date
  db: FollowUpDb
  send: () => Promise<void>
}): Promise<FollowUpDelivery> {
  const claimAt = args.now.toISOString()
  const claimed = await args.db.claim({
    id: args.proposal.id,
    tenantId: args.proposal.tenant_id,
    outcomeType: args.proposal.outcome_type,
    followUpAt: args.proposal.follow_up_at,
    claimAt,
  })
  if (!claimed) return 'skipped'

  try {
    await args.send()
  } catch (sendError) {
    await args.db.releaseClaim({
      id: args.proposal.id,
      tenantId: args.proposal.tenant_id,
      claimAt,
    })
    throw sendError
  }

  if (args.proposal.outcome_type !== 'no_show') return 'sent'

  const nextAt = new Date(args.now.getTime() + NO_SHOW_FOLLOW_UP_MS).toISOString()
  const scheduled = await args.db.scheduleNoShow({
    id: args.proposal.id,
    tenantId: args.proposal.tenant_id,
    claimAt,
    nextAt,
  })
  return scheduled ? 'sent' : 'sent_pending_reschedule'
}

export function createSupabaseFollowUpDb(supabase: FollowUpSupabase): FollowUpDb {
  return {
    async claim(input) {
      // One UPDATE ... WHERE. Postgres locks the row; a second caller matches 0 rows.
      const { data, error } = await supabase
        .from('booking_proposals')
        .update({ follow_up_sent_at: input.claimAt })
        .eq('id', input.id)
        .eq('tenant_id', input.tenantId)
        .in('outcome_type', [...FOLLOW_UP_OUTCOMES])
        .is('follow_up_sent_at', null)
        .not('follow_up_at', 'is', null)
        .lte('follow_up_at', input.claimAt)
        .select('id')

      if (error) throw error
      return Array.isArray(data) && data.length === 1
    },

    async releaseClaim(input) {
      const { error } = await supabase
        .from('booking_proposals')
        .update({ follow_up_sent_at: null })
        .eq('id', input.id)
        .eq('tenant_id', input.tenantId)
        .eq('follow_up_sent_at', input.claimAt)
        .select('id')

      if (error) throw error
    },

    async scheduleNoShow(input) {
      const { data, error } = await supabase
        .from('booking_proposals')
        .update({ follow_up_at: input.nextAt, follow_up_sent_at: null })
        .eq('id', input.id)
        .eq('tenant_id', input.tenantId)
        .eq('outcome_type', 'no_show')
        .eq('follow_up_sent_at', input.claimAt)
        .select('id')

      if (error) throw error
      return Array.isArray(data) && data.length === 1
    },

    async repairNoShowOrphans(nowIso, nextAt) {
      const listed = await supabase
        .from('booking_proposals')
        .select('id, tenant_id, follow_up_sent_at')
        .eq('outcome_type', 'no_show')
        .not('follow_up_sent_at', 'is', null)
        .lte('follow_up_at', nowIso)

      if (listed.error) throw listed.error

      let repaired = 0
      for (const row of listed.data || []) {
        if (!row.follow_up_sent_at || !row.tenant_id) continue
        const { data, error } = await supabase
          .from('booking_proposals')
          .update({ follow_up_at: nextAt, follow_up_sent_at: null })
          .eq('id', row.id)
          .eq('tenant_id', row.tenant_id)
          .eq('outcome_type', 'no_show')
          .eq('follow_up_sent_at', row.follow_up_sent_at)
          .lte('follow_up_at', nowIso)
          .select('id')
        if (error) throw error
        if (Array.isArray(data) && data.length === 1) repaired++
      }
      return repaired
    },
  }
}

export function followUpReminderCopy(input: {
  outcomeType: string
  recipientName: string
  customerName: string
}): {
  headerText: string
  introTitle: string
  introText: string
  footerText: string
  subject: string
} {
  const isNoShow = input.outcomeType === 'no_show'
  const who = input.recipientName ? ` ${input.recipientName}` : ''
  if (isNoShow) {
    return {
      headerText: 'Tägliche Erinnerung – Nicht erreichbar',
      introTitle: `Hallo${who}! Bitte nochmal versuchen. 📵`,
      introText: 'Dieser Interessent war bisher <strong>nicht erreichbar</strong>. Simy erinnert dich täglich, solange die Anfrage als «Nicht erreichbar» markiert ist und eine Erinnerung geplant ist. Vielleicht klappt es heute!',
      footerText: 'Diese tägliche Erinnerung geht weiter, solange die Anfrage als «Nicht erreichbar» markiert ist und eine Erinnerung geplant ist.',
      subject: `Nochmal versuchen: ${input.customerName} war bisher nicht erreichbar`,
    }
  }
  return {
    headerText: '30-Tage Follow-up Erinnerung',
    introTitle: `Hallo${who}! Zeit für ein Follow-up. 🌱`,
    introText: 'Vor ca. 30 Tagen hast du eine Anfrage als <strong>«Potenzieller Kunde»</strong> markiert. Jetzt wäre ein guter Zeitpunkt, sich wieder zu melden!',
    footerText: 'Diese einmalige Erinnerung wurde verschickt, weil der Interessent als «Potenzieller Kunde» markiert wurde.',
    subject: `Follow-up: ${input.customerName} – vor 30 Tagen als potenzieller Kunde markiert`,
  }
}

export function retainPendingProposals<T extends { id: string }>(
  rows: T[],
  stillPendingIds: ReadonlySet<string>,
): T[] {
  return rows.filter((row) => stillPendingIds.has(row.id))
}

export async function loadPendingProposalIds(
  supabase: FollowUpSupabase,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await supabase
    .from('booking_proposals')
    .select('id')
    .in('id', ids)
    .eq('status', 'pending')
  if (error) throw error
  return new Set((data || []).map((row) => row.id))
}

export function mergeHighlightedProposal<T extends { id: string }>(
  pending: T[],
  highlighted: T | null | undefined,
): T[] {
  if (!highlighted) return pending
  if (pending.some((row) => row.id === highlighted.id)) return pending
  return [...pending, highlighted]
}
