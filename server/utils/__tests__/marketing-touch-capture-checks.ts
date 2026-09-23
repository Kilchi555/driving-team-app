/**
 * Runnable without vitest: node --experimental-strip-types
 * server/utils/__tests__/marketing-touch-capture-checks.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MARKETING_TOUCH_CLASSES,
  classifyMarketingTouch,
  describeMarketingConversion,
  isIdentifiableTouch,
  marketingTouchIdempotencyKey,
  pickConversionTouch,
  referrerHost,
  runAttributionTouchAfterLegacy,
} from '../marketing-touch-class.ts'

const TENANT = '33333333-3333-4333-8333-333333333333'
const OTHER = '44444444-4444-4444-8444-444444444444'
const SESSION = '1786359489006_c279w4lft'
const LATER = '1790026306730_gy1ktaabx'

function key(observation: Parameters<typeof classifyMarketingTouch>[0], sessionId = SESSION, tenantId = TENANT) {
  const touchClass = classifyMarketingTouch(observation)
  return marketingTouchIdempotencyKey({ tenantId, sessionId, touchClass, observation: observation || {} })
}

function assertLegacyErrorDoesNotBlockTouch(source: string, touchCall: string) {
  const attemptAt = source.indexOf('runAttributionTouchAfterLegacy')
  const touchAt = source.indexOf(touchCall)
  const legacyReturnAt = source.indexOf("return { ok: false, reason: 'db_error' }")
  assert.ok(attemptAt > 0)
  assert.ok(touchAt > attemptAt)
  assert.ok(legacyReturnAt > touchAt)
}

export async function runMarketingTouchCaptureChecks() {
  assert.equal(classifyMarketingTouch({ gclid: 'g' }), 'PAID_GOOGLE')
  assert.equal(classifyMarketingTouch({ gbraid: 'b' }), 'PAID_GOOGLE')
  assert.equal(classifyMarketingTouch({ wbraid: 'w' }), 'PAID_GOOGLE')
  assert.equal(classifyMarketingTouch({ utm_source: 'google', utm_medium: 'cpc' }), 'PAID_GOOGLE')
  assert.equal(classifyMarketingTouch({ utm_source: 'google' }), 'OTHER_REFERRER')
  assert.equal(classifyMarketingTouch({ utm_source: 'google', utm_medium: 'organic' }), 'ORGANIC_CONFIRMED')

  assert.equal(classifyMarketingTouch({ fbclid: 'f' }), 'PAID_META')
  assert.equal(classifyMarketingTouch({ fbc: 'fb.1.1.abc' }), 'PAID_META')
  assert.equal(classifyMarketingTouch({ fbp: 'fb.1.1.browser' }), 'NO_MARKETING_SIGNAL')
  assert.equal(classifyMarketingTouch({ utm_source: 'facebook', utm_medium: 'paid_social' }), 'PAID_META')
  assert.equal(classifyMarketingTouch({ utm_source: 'facebook' }), 'OTHER_REFERRER')
  assert.equal(classifyMarketingTouch({ utm_source: 'instagram', utm_medium: 'organic' }), 'ORGANIC_CONFIRMED')

  assert.equal(classifyMarketingTouch({ utm_source: 'chatgpt.com' }), 'CHATGPT')
  assert.equal(classifyMarketingTouch({ referrer: 'https://chatgpt.com/c/private?q=secret' }), 'CHATGPT')
  assert.equal(classifyMarketingTouch({ referrer: 'https://chat.openai.com/share/abc' }), 'CHATGPT')
  assert.equal(referrerHost('https://chatgpt.com/c/private?q=secret'), 'chatgpt.com')

  assert.equal(classifyMarketingTouch({ utm_source: 'direct', utm_medium: 'none' }), 'DIRECT_CONFIRMED')
  assert.equal(classifyMarketingTouch({ utm_source: 'drivingteam_direct', utm_medium: 'referral' }), 'NO_MARKETING_SIGNAL')
  assert.equal(classifyMarketingTouch({ referrer: 'https://www.google.com/search?q=fahrschule' }), 'ORGANIC_CONFIRMED')
  assert.equal(classifyMarketingTouch({ referrer: 'https://example.com/page' }), 'OTHER_REFERRER')
  assert.equal(classifyMarketingTouch({
    referrer: 'https://drivingteam.ch/kurse',
    firstPartyHost: 'drivingteam.ch',
  }), 'NO_MARKETING_SIGNAL')
  assert.equal(isIdentifiableTouch(classifyMarketingTouch({
    referrer: 'https://drivingteam.ch/kurse',
    firstPartyHost: 'drivingteam.ch',
  })), false)
  assert.equal(classifyMarketingTouch({
    referrer: 'https://www.drivingteam.ch/',
    firstPartyHost: 'drivingteam.ch',
  }), 'NO_MARKETING_SIGNAL')
  assert.equal(classifyMarketingTouch({
    referrer: 'https://example.com/',
    firstPartyHost: 'drivingteam.ch',
  }), 'OTHER_REFERRER')
  assert.equal(isIdentifiableTouch('OTHER_REFERRER'), true)
  assert.equal(classifyMarketingTouch({
    referrer: 'https://www.google.com/search?q=fahrschule',
    firstPartyHost: 'drivingteam.ch',
  }), 'ORGANIC_CONFIRMED')
  assert.equal(classifyMarketingTouch({
    gclid: 'g',
    referrer: 'https://drivingteam.ch/kurse',
    firstPartyHost: 'drivingteam.ch',
  }), 'PAID_GOOGLE')
  assert.equal(classifyMarketingTouch({
    fbclid: 'f',
    referrer: 'https://www.drivingteam.ch/kurse',
    firstPartyHost: 'drivingteam.ch',
  }), 'PAID_META')
  assert.equal(classifyMarketingTouch({
    referrer: 'https://other-school.example/start',
    firstPartyHost: 'drivingteam.ch',
  }), 'OTHER_REFERRER')
  const paidThenSelf = pickConversionTouch([
    { id: 'self', tenant_id: TENANT, attribution_class: 'NO_MARKETING_SIGNAL' as const, touch_at: '2026-08-10T11:00:00.000Z' },
    { id: 'paid', tenant_id: TENANT, attribution_class: 'PAID_GOOGLE' as const, touch_at: '2026-08-10T10:00:00.000Z' },
  ], TENANT, '2026-08-10T12:00:00.000Z')
  assert.equal(paidThenSelf.touch?.id, 'paid')
  assert.equal(paidThenSelf.touchClass, 'PAID_GOOGLE')
  assert.equal(classifyMarketingTouch({}), 'NO_MARKETING_SIGNAL')
  assert.equal(classifyMarketingTouch(null), 'NO_MARKETING_SIGNAL')
  assert.equal(MARKETING_TOUCH_CLASSES.includes('UNKNOWN' as never), false)

  const google = { gclid: 'g', landing_page: '/vku-kurs-lachen/' }
  const stable = key(google)
  assert.equal(key(google), stable)
  assert.notEqual(key(google, SESSION, OTHER), stable)
  assert.notEqual(key({ gclid: 'other' }), stable)
  assert.notEqual(key({ ...google, landing_page: '/other/' }), stable)
  assert.equal(key({ referrer: 'https://www.google.com/search?q=a' }), key({ referrer: 'www.google.com' }))
  assert.notEqual(key({ referrer: 'https://www.google.com/' }), key({ referrer: 'https://www.bing.com/' }))

  const first = { id: 't1', tenant_id: TENANT, attribution_class: 'PAID_GOOGLE' as const, touch_at: '2026-08-10T10:58:09.006Z' }
  const second = { id: 't2', tenant_id: TENANT, attribution_class: 'PAID_META' as const, touch_at: '2026-09-21T12:00:00.000Z' }
  const foreign = { id: 't3', tenant_id: OTHER, attribution_class: 'PAID_GOOGLE' as const, touch_at: '2026-08-01T00:00:00.000Z' }
  const picked = pickConversionTouch([second, foreign, first], TENANT, '2026-09-21T18:00:00.000Z')
  assert.equal(picked.touch?.id, 't1')
  assert.equal(picked.touchClass, 'PAID_GOOGLE')
  const none = pickConversionTouch([
    { id: 'n', tenant_id: TENANT, attribution_class: 'NO_MARKETING_SIGNAL' as const, touch_at: '2026-09-21T12:00:00.000Z' },
  ], TENANT, '2026-09-21T18:00:00.000Z')
  assert.equal(none.touch, null)
  assert.equal(none.touchClass, 'NO_MARKETING_SIGNAL')
  const unknown = pickConversionTouch([], TENANT, '2026-09-21T18:00:00.000Z')
  assert.equal(unknown.touchClass, null)
  assert.notEqual(SESSION, LATER)

  const bookingNew = describeMarketingConversion({ event: 'appointment', customerState: 'new', touchClass: 'PAID_GOOGLE' })
  assert.deepEqual(bookingNew, {
    conversion_type: 'booking',
    signal_state: 'credited',
    customer_state: 'new',
    credit_touch: true,
  })
  const existing = describeMarketingConversion({ event: 'appointment', customerState: 'existing', touchClass: 'PAID_GOOGLE' })
  assert.equal(existing.conversion_type, 'follow_up')
  assert.equal(existing.customer_state, 'existing')
  assert.equal(existing.credit_touch, true)
  const accountOnly = describeMarketingConversion({ event: 'appointment', customerState: 'new', touchClass: 'DIRECT_CONFIRMED' })
  assert.equal(accountOnly.conversion_type, 'booking')
  assert.equal(accountOnly.customer_state, 'new')
  const courseExisting = describeMarketingConversion({ event: 'course', customerState: 'existing', touchClass: 'DIRECT_CONFIRMED' })
  assert.equal(courseExisting.conversion_type, 'follow_up')
  const inquiry = describeMarketingConversion({ event: 'inquiry', customerState: 'new', touchClass: 'PAID_GOOGLE' })
  assert.equal(inquiry.conversion_type, 'inquiry')
  const noSignal = describeMarketingConversion({ event: 'course', customerState: 'new', touchClass: 'NO_MARKETING_SIGNAL' })
  assert.equal(noSignal.signal_state, 'no_marketing_signal')
  assert.equal(noSignal.credit_touch, false)
  assert.equal(noSignal.conversion_type, 'course')
  const missing = describeMarketingConversion({ event: 'appointment', customerState: 'unknown', touchClass: null })
  assert.equal(missing.signal_state, 'unknown')
  assert.equal(missing.customer_state, 'unknown')
  assert.equal(missing.conversion_type, 'booking')
  const cancelledWouldNotCall = describeMarketingConversion({ event: 'appointment', customerState: 'new', touchClass: null })
  assert.equal(cancelledWouldNotCall.customer_state, 'new')

  const root = resolve(import.meta.dirname, '../../..')
  const classA = readFileSync(resolve(root, 'server/utils/marketing-touch-class.ts'), 'utf8')
  const classB = readFileSync(resolve(root, 'apps/website/server/utils/marketing-touch-class.ts'), 'utf8')
  assert.equal(classA, classB)
  const record = readFileSync(resolve(root, 'server/utils/marketing-conversion-record.ts'), 'utf8')
  assert.equal(record.includes('acquisition_source'), false)
  assert.match(record, /update\(\{ acquisition_touch_id: input\.touchId \}\)/)
  assert.match(record, /customerState !== 'new'/)
  const firstTouch = readFileSync(resolve(root, 'server/utils/first-touch-acquisition.ts'), 'utf8')
  assert.equal(firstTouch.includes('marketing_touches'), false)
  assert.equal(firstTouch.includes('acquisition_touch_id'), false)
  const save = readFileSync(resolve(root, 'apps/website/server/api/save-attribution.post.ts'), 'utf8')
  assert.equal(save.includes('user_id'), false)
  assert.match(save, /marketing_attributions/)
  assert.match(save, /getWebsiteTenantId/)
  assert.ok(save.includes('tenant_id: nullable(body?.tenant_id)'))
  assertLegacyErrorDoesNotBlockTouch(save, 'persistWebsiteMarketingTouch')
  const appSave = readFileSync(resolve(root, 'server/api/marketing-attribution.post.ts'), 'utf8')
  assertLegacyErrorDoesNotBlockTouch(appSave, 'persistMarketingTouch')
  assert.match(appSave, /tenantId: touchTenantId/)
  const touchStart = appSave.indexOf('const touchTenantId')
  const touchBlock = appSave.slice(touchStart, appSave.indexOf('return { ok: true', touchStart))
  assert.equal(touchBlock.includes('body.tenant_id'), false)

  const stored: string[] = []
  const legacyOk = await runAttributionTouchAfterLegacy({
    legacyError: null,
    writeTouch: async () => {
      stored.push('touch')
      return 'touch-1'
    },
    onLegacyError: () => { throw new Error('legacy callback') },
    onTouchError: () => { throw new Error('touch callback') },
  })
  assert.equal(legacyOk.legacyFailed, false)
  assert.equal(legacyOk.touchFailed, false)
  assert.equal(legacyOk.touchResult, 'touch-1')
  assert.deepEqual(stored, ['touch'])

  const legacyDown = await runAttributionTouchAfterLegacy({
    legacyError: 'upsert failed',
    writeTouch: async () => {
      stored.push('touch-after-legacy-error')
      return 'touch-2'
    },
    onLegacyError: (message) => {
      assert.equal(message, 'upsert failed')
    },
    onTouchError: () => { throw new Error('touch callback') },
  })
  assert.equal(legacyDown.legacyFailed, true)
  assert.equal(legacyDown.touchFailed, false)
  assert.equal(legacyDown.touchResult, 'touch-2')
  assert.deepEqual(stored, ['touch', 'touch-after-legacy-error'])

  const touchDown = await runAttributionTouchAfterLegacy({
    legacyError: null,
    writeTouch: async () => {
      throw new Error('touch insert failed')
    },
    onLegacyError: () => { throw new Error('legacy callback') },
    onTouchError: (error) => {
      assert.equal(error instanceof Error ? error.message : '', 'touch insert failed')
    },
  })
  assert.equal(touchDown.legacyFailed, false)
  assert.equal(touchDown.touchFailed, true)
  assert.equal(touchDown.touchResult, undefined)
  const proposal = readFileSync(resolve(root, 'server/api/booking/submit-proposal.post.ts'), 'utf8')
  assert.equal(proposal.includes('reportBindingAppointmentConversion'), false)
  assert.match(proposal, /event: 'inquiry'/)
}

const isDirectRun = process.argv[1]?.includes('marketing-touch-capture-checks')
if (isDirectRun) {
  runMarketingTouchCaptureChecks().then(() => {
    console.log('MARKETING_TOUCH_CAPTURE_CHECKS_OK')
  })
}
