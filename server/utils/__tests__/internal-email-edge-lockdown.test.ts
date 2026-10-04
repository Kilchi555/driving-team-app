import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  authorizeInternalEmail,
  bindPaymentReminder,
  INTERNAL_EMAIL_SECRET_HEADER,
  parseOutboundEmail,
  parseStaffInvite,
  PLATFORM_FROM_EMAIL,
  secretsEqual,
} from '../../../supabase/functions/_shared/internal-email-auth'
import { internalEmailAuthHeaders } from '../internal-email-secret'

const root = path.resolve(__dirname, '../../..')

const payment = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '22222222-2222-2222-2222-222222222222',
  tenant_id: '33333333-3333-3333-3333-333333333333',
  appointment_id: '44444444-4444-4444-4444-444444444444',
  total_amount_rappen: 15000,
  reminder_count: 1,
  payment_status: 'pending',
  payment_method: 'wallee',
}
const user = {
  id: payment.user_id,
  tenant_id: payment.tenant_id,
  email: 'student@example.com',
  first_name: 'Ada',
  last_name: 'Muster',
}
const tenant = { id: payment.tenant_id, name: 'Fahrschule', slug: 'fahrschule' }

describe('internal email secret', () => {
  afterEach(() => {
    delete process.env.SIMY_INTERNAL_EMAIL_SECRET
  })

  it('rejects a missing configured secret and a missing header', async () => {
    expect(await authorizeInternalEmail('anything', undefined)).toBe(false)
    expect(await authorizeInternalEmail('anything', '   ')).toBe(false)
    expect(await authorizeInternalEmail(null, 'correct-secret')).toBe(false)
    expect(await authorizeInternalEmail('   ', 'correct-secret')).toBe(false)
  })

  it('rejects a wrong secret and accepts the matching secret', async () => {
    expect(await authorizeInternalEmail('wrong-secret', 'correct-secret')).toBe(false)
    expect(await authorizeInternalEmail('correct-secret', 'correct-secret')).toBe(true)
    expect(await secretsEqual('a', 'b')).toBe(false)
    expect(await secretsEqual('same-value', 'same-value')).toBe(true)
  })

  it('builds the server header only from the runtime env', () => {
    expect(() => internalEmailAuthHeaders()).toThrowError(expect.objectContaining({ statusCode: 500 }))
    process.env.SIMY_INTERNAL_EMAIL_SECRET = 'server-only-secret'
    expect(internalEmailAuthHeaders()).toEqual({
      [INTERNAL_EMAIL_SECRET_HEADER]: 'server-only-secret',
    })
  })
})

describe('send-email payload', () => {
  it('keeps the platform sender and accepts the two server payload shapes', () => {
    const plain = parseOutboundEmail({
      to: 'student@example.com',
      subject: 'Termin verrechnet',
      body: 'Hallo\nWelt',
    })
    expect(plain.ok).toBe(true)
    if (plain.ok) {
      expect(plain.email.html).toBe('Hallo<br>Welt')
      expect(plain.email.to).toBe('student@example.com')
    }

    const html = parseOutboundEmail({
      email: 'student@example.com',
      subject: 'Zahlungslink',
      html: '<p>Link</p>',
      from: PLATFORM_FROM_EMAIL,
    })
    expect(html.ok).toBe(true)
    if (html.ok) expect(html.email.html).toBe('<p>Link</p>')
  })

  it('rejects a caller-chosen sender and an open relay body', () => {
    expect(parseOutboundEmail({
      to: 'student@example.com',
      subject: 'Hi',
      body: 'Hello',
      from: 'attacker@evil.test',
    }).ok).toBe(false)
    expect(parseOutboundEmail({ to: 'not-an-email', subject: 'Hi', body: 'Hello' }).ok).toBe(false)
    expect(parseOutboundEmail({ to: 'a@b.ch', subject: 'line\nbreak', body: 'Hello' }).ok).toBe(false)
    expect(parseOutboundEmail({ subject: 'Hi', body: 'Hello' }).ok).toBe(false)
  })
})

describe('staff invitation input', () => {
  it('accepts a simy.ch https link and rejects foreign or caller-chosen senders', () => {
    expect(parseStaffInvite({
      email: 'lehrer@example.com',
      firstName: 'Kim',
      lastName: 'Meier',
      tenantName: 'Schule',
      inviteLink: 'https://app.simy.ch/register/staff?token=abc',
    }).ok).toBe(true)

    expect(parseStaffInvite({
      email: 'lehrer@example.com',
      firstName: 'Kim',
      lastName: 'Meier',
      tenantName: 'Schule',
      inviteLink: 'https://evil.test/register/staff?token=abc',
    }).ok).toBe(false)

    expect(parseStaffInvite({
      email: 'lehrer@example.com',
      firstName: 'Kim',
      lastName: 'Meier',
      inviteLink: 'https://app.simy.ch/register/staff?token=abc',
      fromEmail: 'attacker@evil.test',
    }).ok).toBe(false)
  })
})

describe('payment reminder binding', () => {
  it('derives the recipient from the payment and rejects a crossed tenant or user', () => {
    const bound = bindPaymentReminder(payment, user, tenant, {})
    expect(bound).toMatchObject({
      ok: true,
      email: 'student@example.com',
      userId: payment.user_id,
      tenantId: payment.tenant_id,
      reminderNumber: 2,
      amountRappen: 15000,
    })

    expect(bindPaymentReminder(payment, user, tenant, {
      userId: '99999999-9999-9999-9999-999999999999',
    }).ok).toBe(false)
    expect(bindPaymentReminder(payment, user, tenant, {
      tenantId: '88888888-8888-8888-8888-888888888888',
    }).ok).toBe(false)

    const otherTenantUser = { ...user, tenant_id: '88888888-8888-8888-8888-888888888888' }
    expect(bindPaymentReminder(payment, otherTenantUser, tenant).ok).toBe(false)
    expect(bindPaymentReminder(payment, { ...user, email: null }, tenant).ok).toBe(false)
    expect(bindPaymentReminder({ ...payment, user_id: null }, user, tenant).ok).toBe(false)
    expect(bindPaymentReminder({ ...payment, payment_status: 'completed' }, user, tenant).ok).toBe(false)
  })
})

describe('browser and source lockdown', () => {
  const secret = 'SIMY_INTERNAL_EMAIL_SECRET'

  it('removes the browser relay and does not place the secret in client source', () => {
    expect(existsSync(path.join(root, 'composables/useEmailService.ts'))).toBe(false)
    const nuxtConfig = readFileSync(path.join(root, 'nuxt.config.ts'), 'utf8')
    const publicBlock = nuxtConfig.split('public:')[1] ?? ''
    expect(publicBlock.includes(secret)).toBe(false)
    expect(nuxtConfig.includes('runtimeConfig.public')).toBe(false)
  })

  it('does not log provider keys or request bodies in the edge functions', () => {
    const files = [
      'supabase/functions/send-email/index.ts',
      'supabase/functions/send-staff-invitation-email/index.ts',
      'supabase/functions/send-payment-reminder/index.ts',
      'supabase/functions/_shared/internal-email-auth.ts',
    ]
    for (const file of files) {
      const source = readFileSync(path.join(root, file), 'utf8')
      expect(source.includes('substring(0, 10)')).toBe(false)
      expect(source.includes('JSON.stringify(requestBody')).toBe(false)
      expect(source.includes('console.log(resend')).toBe(false)
      expect(source.includes('--no-verify-jwt')).toBe(false)
      expect(source.includes(secret + " = '")).toBe(false)
    }
  })

  it('sends the internal header from the authorized server callers', () => {
    const callers = [
      'server/api/payments/settle-and-email.post.ts',
      'server/api/email/send-wallee-payment-link.post.ts',
      'server/utils/send-adjustment-notification.ts',
    ]
    for (const file of callers) {
      const source = readFileSync(path.join(root, file), 'utf8')
      expect(source.includes('internalEmailAuthHeaders()')).toBe(true)
      expect(source.includes("functions.invoke('send-email'")).toBe(true)
      expect(source.includes(secret)).toBe(false)
    }
    const settle = readFileSync(path.join(root, 'server/api/payments/settle-and-email.post.ts'), 'utf8')
    expect(settle.includes("['admin', 'tenant_admin', 'superadmin']")).toBe(true)
    const wallee = readFileSync(path.join(root, 'server/api/email/send-wallee-payment-link.post.ts'), 'utf8')
    expect(wallee.includes('requireStaffOrInternal')).toBe(true)
  })
})
