import { createError } from 'h3'

const SUBMISSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type InquiryProposalRow = Record<string, unknown> & {
  tenant_id: string
  submission_id?: string
}

export type InsertedInquiryProposal = {
  id: string
  created: boolean
}

type DbError = { code?: string | number; message?: string } | null

type ProposalQuery = {
  insert: (row: InquiryProposalRow) => {
    select: (columns?: string) => {
      single: () => Promise<{ data: { id: string } | null; error: DbError }>
    }
  }
  select: (columns?: string) => {
    eq: (column: string, value: string) => ProposalFilter
  }
}

type ProposalFilter = {
  eq: (column: string, value: string) => ProposalFilter
  maybeSingle: () => Promise<{ data: { id: string } | null; error: DbError }>
}

export type InquiryProposalAdmin = {
  from: (table: 'booking_proposals') => ProposalQuery
}

/**
 * Blank means "caller did not opt into idempotency" (legacy inserts).
 * A present but invalid value is rejected so a typo cannot skip the unique index.
 */
export function parseSubmissionId(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission_id' })
  }
  const value = raw.trim()
  if (!value) return null
  if (!SUBMISSION_ID_RE.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid submission_id' })
  }
  return value.toLowerCase()
}

function isUniqueViolation(error: DbError): boolean {
  return String(error?.code || '') === '23505'
}

/**
 * Insert the proposal first. The unique index on (tenant_id, submission_id)
 * is the race guard: two parallel requests cannot both create a row.
 * A SELECT-then-INSERT would let both see "missing" and both insert.
 * The loser of 23505 loads the winner and must not send a second notification.
 */
export async function insertInquiryProposal(
  admin: InquiryProposalAdmin,
  row: InquiryProposalRow,
): Promise<InsertedInquiryProposal> {
  const submissionId = row.submission_id ?? null
  const { data, error } = await admin
    .from('booking_proposals')
    .insert(row)
    .select('id')
    .single()

  if (!error && data?.id) {
    return { id: data.id, created: true }
  }

  if (isUniqueViolation(error) && submissionId) {
    const { data: existing, error: lookupError } = await admin
      .from('booking_proposals')
      .select('id')
      .eq('tenant_id', row.tenant_id)
      .eq('submission_id', submissionId)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }
    if (existing?.id) {
      return { id: existing.id, created: false }
    }
  }

  throw error || new Error('Failed to create inquiry')
}
