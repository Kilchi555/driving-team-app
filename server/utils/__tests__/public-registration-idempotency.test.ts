import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  insertInquiryProposal,
  parseSubmissionId,
  type InquiryProposalAdmin,
  type InquiryProposalRow,
} from '../inquiry-submission'
import {
  pendingUserNotificationPlan,
  upsertPendingRegistrationUser,
  type PendingUserAdmin,
  type PendingUserProfile,
} from '../pending-registration-user'
import {
  consumeCompletedRegisterSubmission,
  finishRegisterSubmission,
  rememberSubmissionId,
  REGISTER_FORM_STORAGE_KEY,
  REGISTER_SUBMISSION_COMPLETED_KEY,
  REGISTER_SUBMISSION_STORAGE_KEY,
  type KeyValueStore,
} from '~/utils/register-form-submission'

const TENANT = 'tenant-gemperli'
const OTHER_TENANT = 'tenant-other'
const SUBMISSION_A = '11111111-1111-4111-8111-111111111111'
const SUBMISSION_B = '22222222-2222-4222-8222-222222222222'
const SUBMISSION_C = '33333333-3333-4333-8333-333333333333'

type MemUser = Record<string, unknown> & {
  id: string
  tenant_id: string
  email: string | null
  phone: string | null
  onboarding_status: string | null
  auth_user_id: string | null
}

type MemProposal = Record<string, unknown> & {
  id: string
  tenant_id: string
  submission_id?: string
}

function createMemoryDb() {
  const users: MemUser[] = []
  const proposals: MemProposal[] = []
  let proposalSeq = 0

  const usersAdmin = {
    from: (): ReturnType<PendingUserAdmin['from']> => ({
      select: () => {
        const filters: Record<string, string> = {}
        const chain = {
          eq(column: string, value: string) {
            filters[column] = value
            return chain
          },
          async maybeSingle() {
            const found = users.find((row) =>
              Object.entries(filters).every(([key, value]) => row[key] === value),
            )
            return {
              data: found
                ? {
                    id: found.id,
                    onboarding_status: found.onboarding_status,
                    auth_user_id: found.auth_user_id,
                  }
                : null,
              error: null,
            }
          },
        }
        return chain
      },
      update: (payload: PendingUserProfile) => ({
        async eq(column: string, value: string) {
          const row = users.find((item) => item[column] === value)
          if (row) Object.assign(row, payload)
          return { error: null }
        },
      }),
      async insert(payload: PendingUserProfile & { id: string }) {
        const email = typeof payload.email === 'string' ? payload.email : null
        const phone = typeof payload.phone === 'string' ? payload.phone : null
        const tenantId = String(payload.tenant_id)
        const emailClash = email
          ? users.find((row) => row.email === email && row.tenant_id === tenantId)
          : undefined
        const phoneClash = phone
          ? users.find((row) => row.phone === phone && row.tenant_id === tenantId)
          : undefined
        if (emailClash || phoneClash) {
          return { error: { code: '23505', message: 'users_email_tenant_unique' } }
        }
        users.push({
          onboarding_status: 'pending',
          auth_user_id: null,
          email: null,
          phone: null,
          ...payload,
          id: String(payload.id),
          tenant_id: tenantId,
        })
        return { error: null }
      },
    }),
  } as PendingUserAdmin

  const proposalsAdmin = {
    from: (): ReturnType<InquiryProposalAdmin['from']> => ({
      insert: (row: InquiryProposalRow) => ({
        select: () => ({
          async single() {
            if (row.submission_id) {
              const clash = proposals.find(
                (item) => item.tenant_id === row.tenant_id && item.submission_id === row.submission_id,
              )
              if (clash) {
                return { data: null, error: { code: '23505', message: 'booking_proposals_tenant_submission_uidx' } }
              }
            }
            proposalSeq += 1
            const saved: MemProposal = {
              ...row,
              id: `proposal-${proposalSeq}`,
              tenant_id: row.tenant_id,
              ...(row.submission_id ? { submission_id: row.submission_id } : {}),
            }
            proposals.push(saved)
            return { data: { id: saved.id }, error: null }
          },
        }),
      }),
      select: () => {
        const filters: Record<string, string> = {}
        const chain = {
          eq(column: string, value: string) {
            filters[column] = value
            return chain
          },
          async maybeSingle() {
            const found = proposals.find((row) =>
              Object.entries(filters).every(([key, value]) => row[key] === value),
            )
            return { data: found ? { id: found.id } : null, error: null }
          },
        }
        return chain
      },
    }),
  } as InquiryProposalAdmin

  return { users, proposals, usersAdmin, proposalsAdmin }
}

function profile(firstName: string): PendingUserProfile {
  return {
    first_name: firstName,
    last_name: 'Ashkenazy',
    email: 'alexia@example.com',
    phone: '+41000000001',
    tenant_id: TENANT,
    role: 'client',
    onboarding_status: 'pending',
    is_active: true,
  }
}

let userSeq = 0

async function runSubmission(
  db: ReturnType<typeof createMemoryDb>,
  submissionId: string,
  firstName = 'Alexia',
) {
  const write = await upsertPendingRegistrationUser(db.usersAdmin, {
    tenantId: TENANT,
    email: 'alexia@example.com',
    phone: '+41000000001',
    profile: profile(firstName),
    newUserId: `user-${++userSeq}`,
  })
  if (!write.ok) throw new Error(`unexpected conflict: ${write.conflict}`)
  const notifications = pendingUserNotificationPlan(write.created)
  const proposal = await insertInquiryProposal(db.proposalsAdmin, {
    tenant_id: TENANT,
    submission_id: submissionId,
    email: 'alexia@example.com',
    first_name: firstName,
    notes: 'Ehemalige Schülerin\nKategorien: B Automatik',
    status: 'pending',
  })
  return { write, notifications, proposal }
}

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

describe('public registration submission idempotency', () => {
  it('A. first submission creates one pending user, one proposal, one new-user notification', async () => {
    const db = createMemoryDb()
    const result = await runSubmission(db, SUBMISSION_A)

    expect(result.write.created).toBe(true)
    expect(result.notifications.notifyAdminNewUser).toBe(true)
    expect(result.notifications.sendCustomerRegistrationReceipt).toBe(true)
    expect(result.proposal.created).toBe(true)
    expect(db.users).toHaveLength(1)
    expect(db.proposals).toHaveLength(1)
    expect(db.users[0]?.onboarding_status).toBe('pending')
    expect(db.users[0]?.auth_user_id).toBeNull()
  })

  it('B. the same submission id twice keeps one proposal and does not notify again', async () => {
    const db = createMemoryDb()
    const first = await runSubmission(db, SUBMISSION_A)
    const second = await runSubmission(db, SUBMISSION_A, 'Alexia')

    expect(second.write.created).toBe(false)
    expect(second.notifications.notifyAdminNewUser).toBe(false)
    expect(second.notifications.sendCustomerRegistrationReceipt).toBe(false)
    expect(second.proposal.created).toBe(false)
    expect(second.proposal.id).toBe(first.proposal.id)
    expect(second.write.userId).toBe(first.write.userId)
    expect(db.users).toHaveLength(1)
    expect(db.proposals).toHaveLength(1)
  })

  it('C. the same submission three times still stores one proposal and one new-user notification', async () => {
    const db = createMemoryDb()
    const results = []
    for (let i = 0; i < 3; i += 1) results.push(await runSubmission(db, SUBMISSION_A))

    expect(results.filter((result) => result.write.created)).toHaveLength(1)
    expect(results.filter((result) => result.notifications.notifyAdminNewUser)).toHaveLength(1)
    expect(results.filter((result) => result.proposal.created)).toHaveLength(1)
    expect(new Set(results.map((result) => result.proposal.id)).size).toBe(1)
    expect(db.proposals).toHaveLength(1)
  })

  it('D. an existing pending user can be updated by a new submission without a second new-user mail', async () => {
    const db = createMemoryDb()
    await runSubmission(db, SUBMISSION_A, 'Alexia')
    const next = await runSubmission(db, SUBMISSION_B, 'Alexia-Updated')

    expect(next.write.created).toBe(false)
    expect(next.notifications.notifyAdminNewUser).toBe(false)
    expect(next.proposal.created).toBe(true)
    expect(db.users).toHaveLength(1)
    expect(db.users[0]?.first_name).toBe('Alexia-Updated')
    expect(db.proposals).toHaveLength(2)
  })

  it('E. the same person and similar form data with a new submission id is a new inquiry', async () => {
    const db = createMemoryDb()
    const first = await runSubmission(db, SUBMISSION_A)
    const second = await runSubmission(db, SUBMISSION_C)

    expect(second.write.created).toBe(false)
    expect(second.notifications.notifyAdminNewUser).toBe(false)
    expect(second.proposal.created).toBe(true)
    expect(second.proposal.id).not.toBe(first.proposal.id)
    expect(db.proposals.map((row) => row.submission_id)).toEqual([SUBMISSION_A, SUBMISSION_C])
  })

  it('F. two parallel requests with the same submission id create one user and one proposal', async () => {
    const db = createMemoryDb()
    const results = await Promise.all([
      runSubmission(db, SUBMISSION_A),
      runSubmission(db, SUBMISSION_A),
    ])

    expect(results.filter((result) => result.write.created)).toHaveLength(1)
    expect(results.filter((result) => result.proposal.created)).toHaveLength(1)
    expect(results[0]?.proposal.id).toBe(results[1]?.proposal.id)
    expect(results[0]?.write.userId).toBe(results[1]?.write.userId)
    expect(db.users).toHaveLength(1)
    expect(db.proposals).toHaveLength(1)
  })

  it('does not treat another tenant with the same submission id as a replay', async () => {
    const db = createMemoryDb()
    const first = await insertInquiryProposal(db.proposalsAdmin, {
      tenant_id: TENANT,
      submission_id: SUBMISSION_A,
      email: 'alexia@example.com',
    })
    const other = await insertInquiryProposal(db.proposalsAdmin, {
      tenant_id: OTHER_TENANT,
      submission_id: SUBMISSION_A,
      email: 'alexia@example.com',
    })

    expect(first.created).toBe(true)
    expect(other.created).toBe(true)
    expect(other.id).not.toBe(first.id)
    expect(db.proposals).toHaveLength(2)
  })

  it('keeps insert-each-time behavior when no submission id is sent', async () => {
    const db = createMemoryDb()
    const first = await insertInquiryProposal(db.proposalsAdmin, {
      tenant_id: TENANT,
      email: 'legacy@example.com',
    })
    const second = await insertInquiryProposal(db.proposalsAdmin, {
      tenant_id: TENANT,
      email: 'legacy@example.com',
    })

    expect(first.created).toBe(true)
    expect(second.created).toBe(true)
    expect(second.id).not.toBe(first.id)
  })

  it('rejects a malformed submission id and treats blank as absent', () => {
    expect(parseSubmissionId(null)).toBeNull()
    expect(parseSubmissionId('')).toBeNull()
    expect(parseSubmissionId('  ')).toBeNull()
    expect(parseSubmissionId(SUBMISSION_A)).toBe(SUBMISSION_A)
    expect(() => parseSubmissionId('not-a-uuid')).toThrowError(
      expect.objectContaining({ statusCode: 400, statusMessage: 'Invalid submission_id' }),
    )
  })

  it('returns a conflict when a parallel insert hits an active account', async () => {
    const db = createMemoryDb()
    db.users.push({
      id: 'active-1',
      tenant_id: TENANT,
      email: 'alexia@example.com',
      phone: '+41000000001',
      onboarding_status: 'completed',
      auth_user_id: 'auth-1',
    })

    const write = await upsertPendingRegistrationUser(db.usersAdmin, {
      tenantId: TENANT,
      email: 'alexia@example.com',
      phone: '+41000000001',
      profile: profile('Alexia'),
      newUserId: 'user-race',
    })

    expect(write).toEqual({ ok: false, conflict: 'email' })
    expect(db.users).toHaveLength(1)
  })
})

describe('register form submission cache', () => {
  it('reuses one submission id until the submission finishes', () => {
    const session = memoryStore()
    const first = rememberSubmissionId(session, () => SUBMISSION_A)
    const second = rememberSubmissionId(session, () => SUBMISSION_B)

    expect(first).toBe(SUBMISSION_A)
    expect(second).toBe(SUBMISSION_A)
  })

  it('after success does not restore the cached form as sendable', () => {
    const session = memoryStore({ [REGISTER_SUBMISSION_STORAGE_KEY]: SUBMISSION_A })
    const local = memoryStore({ [REGISTER_FORM_STORAGE_KEY]: '{"firstName":"Alexia"}' })

    finishRegisterSubmission(session, local)
    expect(local.getItem(REGISTER_FORM_STORAGE_KEY)).toBeNull()
    expect(session.getItem(REGISTER_SUBMISSION_STORAGE_KEY)).toBeNull()
    expect(session.getItem(REGISTER_SUBMISSION_COMPLETED_KEY)).toBe('1')

    const skipped = consumeCompletedRegisterSubmission(session, local)
    expect(skipped).toBe(true)
    expect(local.getItem(REGISTER_FORM_STORAGE_KEY)).toBeNull()
    expect(session.getItem(REGISTER_SUBMISSION_COMPLETED_KEY)).toBeNull()

    const next = rememberSubmissionId(session, () => SUBMISSION_B)
    expect(next).toBe(SUBMISSION_B)
  })
})

describe('registration route wiring', () => {
  const registerClient = readFileSync(resolve(process.cwd(), 'server/api/auth/register-client.post.ts'), 'utf8')
  const inquiry = readFileSync(resolve(process.cwd(), 'server/api/booking/submit-general-inquiry.post.ts'), 'utf8')
  const page = readFileSync(resolve(process.cwd(), 'pages/register/[tenant].vue'), 'utf8')
  const migration = readFileSync(
    resolve(process.cwd(), 'sql_migrations/20260930_booking_proposals_submission_id.sql'),
    'utf8',
  )

  it('G. pending notifications follow the insert result; account registration still notifies', () => {
    const pendingStart = registerClient.indexOf('if (pendingOnly)')
    const accountStart = registerClient.indexOf('// Validate always-required account fields')
    const pendingSrc = registerClient.slice(pendingStart, accountStart)
    const accountSrc = registerClient.slice(accountStart)

    expect(pendingSrc).toContain('pendingUserNotificationPlan(pendingWrite.created)')
    expect(pendingSrc).toContain('if (pendingNotifications.notifyAdminNewUser)')
    expect(pendingSrc).toContain('if (pendingNotifications.sendCustomerRegistrationReceipt && emailNormalized)')
    expect(accountSrc).toContain('sendWelcomeEmail')
    expect(accountSrc).toContain('notifyTenantAdminsNewClient')
    expect(accountSrc).not.toContain('pendingUserNotificationPlan')
  })

  it('sends the inquiry mail only after a newly created proposal', () => {
    const replayAt = inquiry.indexOf('idempotent_replay: true')
    const mailAt = inquiry.indexOf('send-booking-proposal')
    expect(inquiry).toContain('insertInquiryProposal')
    expect(inquiry).toContain('parseSubmissionId(body.submission_id)')
    expect(replayAt).toBeGreaterThan(0)
    expect(mailAt).toBeGreaterThan(replayAt)
  })

  it('the register page reuses one submission id and clears the cache after success', () => {
    expect(page).toContain('if (isSubmitting.value) return')
    expect(page).toContain('rememberSubmissionId(sessionStorage)')
    expect(page).toContain('submission_id: submissionId')
    expect(page).toContain('finishRegisterSubmission(sessionStorage, localStorage)')
    expect(page).toContain('consumeCompletedRegisterSubmission(sessionStorage, localStorage)')
    expect(page).toContain('pendingOnly')
  })

  it('draft migration enforces tenant + submission id without a blanket email unique', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS submission_id uuid')
    expect(migration).toContain('booking_proposals_tenant_submission_uidx')
    expect(migration).toContain('(tenant_id, submission_id)')
    expect(migration).toContain('WHERE submission_id IS NOT NULL')
    expect(migration).not.toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*email\s*\)/i)
  })
})
