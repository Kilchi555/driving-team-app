import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateRegistrationToken } from '../registration-token'
import { authorizeRegistrationDocumentUpload } from '../registration-upload-authz'
import {
  REGISTRATION_UPLOAD_GRANT_PURPOSE,
  REGISTRATION_UPLOAD_GRANT_TTL_MS,
  createRegistrationUploadGrant,
  signRegistrationUploadGrant,
  verifyRegistrationUploadGrant,
} from '../registration-upload-grant'

const SECRET = 'registration-upload-grant-test-secret-32b'
const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'
const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const NOW = 1_800_000_000_000

const savedEnv: Record<string, string | undefined> = {}

function owner(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_A,
    tenant_id: TENANT_A,
    created_at: new Date(NOW).toISOString(),
    onboarding_status: 'completed',
    ...overrides,
  }
}

function grantFor(userId = USER_A, tenantId = TENANT_A, now = NOW) {
  const token = createRegistrationUploadGrant({ userId, tenantId, now })
  if (!token) throw new Error('expected grant')
  return token
}

function foreignStaff() {
  return { role: 'staff', tenantId: TENANT_B, dbUserId: 'staff-b' }
}

beforeEach(() => {
  savedEnv.NUXT_REGISTRATION_TOKEN_SECRET = process.env.NUXT_REGISTRATION_TOKEN_SECRET
  savedEnv.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  savedEnv.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY
  process.env.NUXT_REGISTRATION_TOKEN_SECRET = SECRET
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.SUPABASE_SECRET_KEY
})

afterEach(() => {
  if (savedEnv.NUXT_REGISTRATION_TOKEN_SECRET === undefined) delete process.env.NUXT_REGISTRATION_TOKEN_SECRET
  else process.env.NUXT_REGISTRATION_TOKEN_SECRET = savedEnv.NUXT_REGISTRATION_TOKEN_SECRET
  if (savedEnv.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  else process.env.SUPABASE_SERVICE_ROLE_KEY = savedEnv.SUPABASE_SERVICE_ROLE_KEY
  if (savedEnv.SUPABASE_SECRET_KEY === undefined) delete process.env.SUPABASE_SECRET_KEY
  else process.env.SUPABASE_SECRET_KEY = savedEnv.SUPABASE_SECRET_KEY
})

describe('registration upload grant', () => {
  it('A. accepts a valid grant for the registered user and tenant', () => {
    const token = grantFor()
    const verified = verifyRegistrationUploadGrant(token, NOW + 1000)
    expect(verified.status).toBe('valid')
    if (verified.status !== 'valid') return
    expect(verified.claims.userId).toBe(USER_A)
    expect(verified.claims.tenantId).toBe(TENANT_A)
    expect(verified.claims.purpose).toBe(REGISTRATION_UPLOAD_GRANT_PURPOSE)
    expect(verified.claims.exp).toBe(NOW + REGISTRATION_UPLOAD_GRANT_TTL_MS)

    const decision = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      requestTenantId: TENANT_A,
      uploadGrant: token,
      session: null,
      now: NOW + 1000,
    })
    expect(decision).toEqual({ allow: true, via: 'grant', documentTenantId: TENANT_A })
  })

  it('replays the same grant inside the TTL for several category uploads', () => {
    const token = grantFor()
    expect(verifyRegistrationUploadGrant(token, NOW + 1000).status).toBe('valid')
    expect(verifyRegistrationUploadGrant(token, NOW + 2000).status).toBe('valid')
  })

  it('B. treats an expired grant as absent and keeps the existing auth result', () => {
    const token = grantFor()
    expect(verifyRegistrationUploadGrant(token, NOW + REGISTRATION_UPLOAD_GRANT_TTL_MS).status).toBe('expired')

    const anonymous = authorizeRegistrationDocumentUpload({
      documentOwner: owner({ onboarding_status: 'completed' }),
      uploadGrant: token,
      session: null,
      now: NOW + REGISTRATION_UPLOAD_GRANT_TTL_MS,
    })
    expect(anonymous).toMatchObject({ allow: false, statusCode: 401, statusMessage: 'Authentication required' })

    const foreign = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      uploadGrant: token,
      session: foreignStaff(),
      now: NOW + REGISTRATION_UPLOAD_GRANT_TTL_MS,
    })
    expect(foreign).toMatchObject({ allow: false, statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  })

  it('C. rejects a malformed grant without describing the signature', () => {
    const decision = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      uploadGrant: 'not-a-grant',
      session: foreignStaff(),
      now: NOW,
    })
    expect(decision).toEqual({ allow: false, statusCode: 403, statusMessage: 'Forbidden' })
    expect(JSON.stringify(decision)).not.toContain(TENANT_A)
    expect(JSON.stringify(decision)).not.toContain('hmac')
  })

  it('D/F/H. a grant authorizes only its own user, tenant, and purpose', () => {
    const tokenA = grantFor()
    const wrongUser = authorizeRegistrationDocumentUpload({
      documentOwner: owner({ id: USER_B }),
      requestTenantId: TENANT_A,
      uploadGrant: tokenA,
      session: { role: 'admin', tenantId: TENANT_A, dbUserId: 'admin-a' },
      now: NOW,
    })
    expect(wrongUser).toEqual({ allow: false, statusCode: 403, statusMessage: 'Forbidden' })

    const wrongPurpose = signRegistrationUploadGrant({
      userId: USER_A,
      tenantId: TENANT_A,
      purpose: 'other',
      exp: NOW + 60_000,
    })
    const purposeDecision = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      uploadGrant: wrongPurpose,
      session: null,
      now: NOW,
    })
    expect(purposeDecision).toEqual({ allow: false, statusCode: 403, statusMessage: 'Forbidden' })

    const foreignWithGrant = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      requestTenantId: TENANT_A,
      uploadGrant: tokenA,
      session: foreignStaff(),
      now: NOW,
    })
    expect(foreignWithGrant).toEqual({ allow: true, via: 'grant', documentTenantId: TENANT_A })

    const foreignGrantOnOtherUser = authorizeRegistrationDocumentUpload({
      documentOwner: owner({ id: USER_B, tenant_id: TENANT_B }),
      requestTenantId: TENANT_B,
      uploadGrant: tokenA,
      session: foreignStaff(),
      now: NOW,
    })
    expect(foreignGrantOnOtherUser).toEqual({ allow: false, statusCode: 403, statusMessage: 'Forbidden' })
  })

  it('E/K. a request tenant that differs from the document owner is rejected', () => {
    const token = grantFor()
    const decision = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      requestTenantId: TENANT_B,
      uploadGrant: token,
      session: null,
      now: NOW,
    })
    expect(decision).toMatchObject({
      allow: false,
      statusCode: 403,
      statusMessage: 'Zugriff verweigert: Tenant-Isolation verletzt',
    })
  })

  it('G. a foreign privileged session without a grant stays forbidden', () => {
    for (const role of ['admin', 'staff', 'tenant_admin']) {
      const decision = authorizeRegistrationDocumentUpload({
        documentOwner: owner(),
        session: { role, tenantId: TENANT_B, dbUserId: 'other' },
        now: NOW,
      })
      expect(decision).toMatchObject({ allow: false, statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
    }
  })

  it('I/J. same-tenant staff and the owning customer keep the session path', () => {
    const staff = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      session: { role: 'staff', tenantId: TENANT_A, dbUserId: 'staff-a' },
      now: NOW,
    })
    expect(staff).toEqual({ allow: true, via: 'session', documentTenantId: TENANT_A })

    const customer = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      session: { role: 'client', tenantId: TENANT_A, dbUserId: USER_A },
      now: NOW,
    })
    expect(customer).toEqual({ allow: true, via: 'session', documentTenantId: TENANT_A })
  })

  it('L. the document tenant stays the owner tenant when a foreign session is present', () => {
    const decision = authorizeRegistrationDocumentUpload({
      documentOwner: owner(),
      requestTenantId: TENANT_A,
      uploadGrant: grantFor(),
      session: { role: 'tenant_admin', tenantId: TENANT_B, dbUserId: 'admin-b' },
      now: NOW,
    })
    expect(decision.allow).toBe(true)
    if (!decision.allow) return
    expect(decision.documentTenantId).toBe(TENANT_A)
    expect(decision.documentTenantId).not.toBe(TENANT_B)
  })

  it('rejects a tampered user id or tenant id inside an otherwise valid grant', () => {
    const token = grantFor()
    const [body, sig] = token.split('.')
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    const swappedUser = Buffer.from(JSON.stringify({ ...claims, userId: USER_B }), 'utf8').toString('base64url')
    const swappedTenant = Buffer.from(JSON.stringify({ ...claims, tenantId: TENANT_B }), 'utf8').toString('base64url')
    expect(verifyRegistrationUploadGrant(`${swappedUser}.${sig}`, NOW).status).toBe('invalid')
    expect(verifyRegistrationUploadGrant(`${swappedTenant}.${sig}`, NOW).status).toBe('invalid')
    expect(verifyRegistrationUploadGrant(`${body}.${sig.slice(0, -1)}x`, NOW).status).toBe('invalid')
    expect(verifyRegistrationUploadGrant(generateRegistrationToken(TENANT_A), NOW).status).toBe('invalid')
  })

  it('rejects a signature whose lifetime exceeds the upload TTL', () => {
    const token = signRegistrationUploadGrant({
      userId: USER_A,
      tenantId: TENANT_A,
      purpose: REGISTRATION_UPLOAD_GRANT_PURPOSE,
      exp: NOW + REGISTRATION_UPLOAD_GRANT_TTL_MS + 60_000,
    })
    expect(verifyRegistrationUploadGrant(token, NOW).status).toBe('invalid')
  })

  it('does not mint or accept a grant without a server secret', () => {
    const token = grantFor()
    delete process.env.NUXT_REGISTRATION_TOKEN_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.SUPABASE_SECRET_KEY
    expect(createRegistrationUploadGrant({ userId: USER_A, tenantId: TENANT_A, now: NOW })).toBeNull()
    expect(verifyRegistrationUploadGrant(token, NOW).status).toBe('invalid')
  })

  it('keeps the anonymous registration window and does not open it for completed accounts', () => {
    const pending = authorizeRegistrationDocumentUpload({
      documentOwner: owner({ onboarding_status: 'pending' }),
      session: null,
      now: NOW + 1000,
    })
    expect(pending).toEqual({ allow: true, via: 'session', documentTenantId: TENANT_A })

    const completed = authorizeRegistrationDocumentUpload({
      documentOwner: owner({ onboarding_status: 'completed' }),
      session: null,
      now: NOW + 1000,
    })
    expect(completed).toMatchObject({ allow: false, statusCode: 401 })
  })
})

describe('registration upload wiring', () => {
  const page = readFileSync(resolve(process.cwd(), 'pages/register/[tenant].vue'), 'utf8')
  const registerClient = readFileSync(resolve(process.cwd(), 'server/api/auth/register-client.post.ts'), 'utf8')
  const upload = readFileSync(resolve(process.cwd(), 'server/api/auth/upload-document.post.ts'), 'utf8')
  const customerUpload = readFileSync(resolve(process.cwd(), 'server/api/customer/upload-document.post.ts'), 'utf8')

  it('the public page sends the string tenant id and the in-memory grant', () => {
    const uploadAt = page.indexOf("'/api/auth/upload-document'")
    const uploadBlock = page.slice(uploadAt, uploadAt + 800)
    expect(uploadAt).toBeGreaterThan(0)
    expect(uploadBlock).toContain('tenantId: activeTenantId,')
    expect(uploadBlock).not.toContain('activeTenantId.value')
    expect(uploadBlock).toContain("typeof data.uploadGrant === 'string'")
    expect(uploadBlock).toContain('uploadGrant: data.uploadGrant')
    const persist = page.slice(page.indexOf('Auto-save form data to localStorage'))
    expect(persist).not.toContain('uploadGrant')
  })

  it('register-client signs the grant from the stored user row', () => {
    expect(registerClient).toContain("select('id, tenant_id')")
    expect(registerClient).toContain('createRegistrationUploadGrant({ userId: data.id, tenantId: data.tenant_id })')
    expect(registerClient).not.toContain('createRegistrationUploadGrant({ userId: pendingUserId')
    expect(registerClient).not.toContain('createRegistrationUploadGrant({ userId: userProfile.id')
    expect(registerClient.match(/uploadGrant/g)?.length).toBeGreaterThan(1)
  })

  it('the auth upload keeps the owner tenant and the customer upload is unchanged', () => {
    expect(upload).toContain('authorizeRegistrationDocumentUpload')
    expect(upload).toContain('tenantId = decision.documentTenantId')
    expect(upload).toContain("const bucket = 'user-documents'")
    expect(customerUpload).not.toContain('uploadGrant')
    expect(customerUpload).not.toContain('registration-upload-grant')
  })
})
