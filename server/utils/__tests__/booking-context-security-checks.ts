/**
 * Runnable without vitest:
 * node --experimental-strip-types server/utils/__tests__/booking-context-security-checks.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BOOKING_CONTEXT_TTL_MS,
  createBookingContext,
  tenantIdForMarketingTouch,
  verifyBookingContext,
} from '../booking-context.ts'

const SECRET = 'unit-test-booking-context-secret'
const TENANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const TENANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SLUG_A = 'driving-team'
const SLUG_B = 'other-school'
const NOW = 1_700_000_000_000

function contextFor(tenantId: string, slug: string, now = NOW): string {
  const token = createBookingContext({ tenantId, slug, secret: SECRET, now })
  assert.ok(token)
  return token
}

export function runBookingContextSecurityChecks() {
  const contextA = contextFor(TENANT_A, SLUG_A)

  const crossTenant = tenantIdForMarketingTouch({
    bookingContext: contextA,
    secret: SECRET,
    now: NOW,
    tenant_id: TENANT_B,
  } as { bookingContext: string; secret: string; now: number })
  assert.equal(crossTenant, TENANT_A)

  const forgedTenant = tenantIdForMarketingTouch({
    bookingContext: null,
    secret: SECRET,
    now: NOW,
    tenant_id: TENANT_B,
  } as { bookingContext: null; secret: string; now: number })
  assert.equal(forgedTenant, null)

  const parts = contextA.split('.')
  const payload = JSON.parse(Buffer.from(parts[2], 'base64url').toString('utf8')) as { tenant_id: string }
  payload.tenant_id = TENANT_B
  parts[2] = Buffer.from(JSON.stringify(payload)).toString('base64url')
  assert.equal(verifyBookingContext(parts.join('.'), { secret: SECRET, now: NOW }), null)
  assert.equal(tenantIdForMarketingTouch({
    bookingContext: parts.join('.'),
    secret: SECRET,
    now: NOW,
  }), null)

  const forgedParts = contextA.split('.')
  forgedParts[3] = forgedParts[3].startsWith('A')
    ? `B${forgedParts[3].slice(1)}`
    : `A${forgedParts[3].slice(1)}`
  assert.equal(verifyBookingContext(forgedParts.join('.'), { secret: SECRET, now: NOW }), null)

  const verified = verifyBookingContext(contextA, { secret: SECRET, now: NOW })
  assert.equal(verified?.tenantId, TENANT_A)
  assert.equal(verified?.slug, SLUG_A)
  const withForeignSlug = tenantIdForMarketingTouch({
    bookingContext: contextA,
    secret: SECRET,
    now: NOW,
    slug: SLUG_B,
  } as { bookingContext: string; secret: string; now: number })
  assert.equal(withForeignSlug, TENANT_A)

  assert.equal(verifyBookingContext(contextA, {
    secret: SECRET,
    now: NOW + BOOKING_CONTEXT_TTL_MS,
  }), null)
  assert.ok(verifyBookingContext(contextA, {
    secret: SECRET,
    now: NOW + BOOKING_CONTEXT_TTL_MS - 1,
  }))

  const legitimate = tenantIdForMarketingTouch({
    bookingContext: contextFor(TENANT_A, SLUG_A),
    secret: SECRET,
    now: NOW,
  })
  assert.equal(legitimate, TENANT_A)

  const issued = createBookingContext({
    tenantId: TENANT_A,
    slug: SLUG_A,
    secret: SECRET,
    now: NOW,
  })
  assert.equal(verifyBookingContext(issued, { secret: SECRET, now: NOW })?.tenantId, TENANT_A)
  assert.equal(createBookingContext({
    tenantId: TENANT_A,
    slug: SLUG_A,
    secret: '',
    now: NOW,
  }), null)
  assert.equal(createBookingContext({
    tenantId: TENANT_A,
    slug: SLUG_A,
    secret: 'short-secret',
    now: NOW,
  }), null)

  const contextB = contextFor(TENANT_B, SLUG_B)
  assert.equal(tenantIdForMarketingTouch({
    bookingContext: contextB,
    secret: SECRET,
    now: NOW,
    tenant_id: TENANT_A,
  } as { bookingContext: string; secret: string; now: number }), TENANT_B)

  const previousMarketingTenant = process.env.MARKETING_TENANT_ID
  process.env.MARKETING_TENANT_ID = TENANT_B
  try {
    assert.equal(tenantIdForMarketingTouch({
      bookingContext: undefined,
      secret: SECRET,
      now: NOW,
    }), null)
  } finally {
    if (previousMarketingTenant === undefined) delete process.env.MARKETING_TENANT_ID
    else process.env.MARKETING_TENANT_ID = previousMarketingTenant
  }

  const root = resolve(import.meta.dirname, '../../..')
  const initSrc = readFileSync(resolve(root, 'server/api/booking/get-booking-init.get.ts'), 'utf8')
  assert.match(initSrc, /createBookingContext\(\{[\s\S]*tenantId: tenant\.id[\s\S]*slug: tenant\.slug/)
  assert.equal(initSrc.includes('body.tenant_id'), false)
  assert.equal(initSrc.includes('generateRegistrationToken'), false)

  const postSrc = readFileSync(resolve(root, 'server/api/marketing-attribution.post.ts'), 'utf8')
  const touchStart = postSrc.indexOf('const touchTenantId')
  assert.ok(touchStart > 0)
  const touchBlock = postSrc.slice(touchStart, postSrc.indexOf('return { ok: true', touchStart))
  assert.match(touchBlock, /tenantId: touchTenantId/)
  assert.equal(touchBlock.includes('body.tenant_id'), false)
  assert.equal(touchBlock.includes('MARKETING_TENANT_ID'), false)
  assert.match(postSrc, /tenant_id: nullable\(body\.tenant_id\)/)
  assert.equal(postSrc.includes('MARKETING_TENANT_ID'), false)

  const utilSrc = readFileSync(resolve(root, 'server/utils/booking-context.ts'), 'utf8')
  assert.equal(utilSrc.includes('insecure-dev-secret'), false)
  assert.equal(utilSrc.includes('process.env.MARKETING_TENANT_ID'), false)
  assert.equal(utilSrc.includes('body.tenant_id'), false)

  const pluginSrc = readFileSync(resolve(root, 'plugins/booking-session-tracking.client.ts'), 'utf8')
  assert.match(pluginSrc, /booking_context: bookingContext/)
  assert.match(pluginSrc, /__setBookingContext/)
  const pageSrc = readFileSync(resolve(root, 'pages/booking/availability/[slug].vue'), 'utf8')
  assert.match(pageSrc, /__setBookingContext\(payload\.booking_context\)/)

  const legacy = readFileSync(resolve(root, 'apps/website/server/api/save-attribution.post.ts'), 'utf8')
  assert.match(legacy, /getWebsiteTenantId/)
  assert.equal(legacy.includes('booking-context'), false)
}

const isDirectRun = process.argv[1]?.includes('booking-context-security-checks')
if (isDirectRun) {
  runBookingContextSecurityChecks()
  console.log('BOOKING_CONTEXT_SECURITY_CHECKS_OK')
}
