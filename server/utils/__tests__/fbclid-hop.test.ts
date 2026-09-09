import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  becameBindingConfirmed,
  isEligibleForMetaPurchaseConversion,
  isUniqueViolation,
} from '../binding-booking'
import { hasMetaClickId } from '../meta-capi'
import {
  applyFirstClassClickIds,
  buchenQueryHasAttribution,
  buildBuchenRedirectUrl,
  constructFbcFromFbclid,
  createAnalyticsSessionId,
  incomingClickRefreshesLandingPage,
  mergeAttributionFields,
  readOrCreateAnalyticsSessionId,
  recoverClickIds,
  resolveBookingRedirectClickIds,
  resolveFbcForIncomingFbclid,
  ANALYTICS_SESSION_ID_PATTERN,
  ANALYTICS_SESSION_STORAGE_KEY,
} from '../booking-attribution-hop'

describe('attribution merge (click IDs)', () => {
  it('keeps fbclid when a later pageview is UTM-only', () => {
    const merged = mergeAttributionFields(
      { fbclid: 'ABC', fbc: 'fb.1.1.ABC', utm_source: 'facebook' },
      { fbclid: null, utm_source: 'direct', utm_medium: 'none' },
    )
    expect(merged.fbclid).toBe('ABC')
    expect(merged.fbc).toBe('fb.1.1.ABC')
  })

  it('keeps gclid when a later pageview is UTM-only', () => {
    const merged = mergeAttributionFields(
      { gclid: 'XYZ', utm_source: 'google', utm_medium: 'cpc' },
      { gclid: null, utm_source: 'direct', utm_medium: 'none' },
    )
    expect(merged.gclid).toBe('XYZ')
  })

  it('does not invent click IDs from empty incoming', () => {
    const merged = mergeAttributionFields(
      { utm_source: 'facebook' },
      { fbclid: null, gclid: '', fbc: null },
    )
    expect(merged.fbclid).toBeUndefined()
    expect(merged.gclid).toBeUndefined()
  })

  it('fills blanks from booking_redirects without overwriting a newer client fbclid', () => {
    const clientAndSession = { fbclid: 'ABC', gclid: null as string | null }
    const redirectRow = { fbclid: 'STALE', gclid: 'XYZ' }
    const merged = mergeAttributionFields(redirectRow, clientAndSession)
    expect(merged.fbclid).toBe('ABC')
    expect(merged.gclid).toBe('XYZ')
  })
})

describe('fbc construction', () => {
  it('builds fb.1.{ts}.{fbclid} from a valid fbclid', () => {
    expect(constructFbcFromFbclid('ABC', 1_700_000_000_000)).toBe('fb.1.1700000000000.ABC')
  })

  it('does not invent fbc from empty fbclid', () => {
    expect(constructFbcFromFbclid('')).toBeNull()
    expect(constructFbcFromFbclid('   ')).toBeNull()
  })
})

describe('booking_redirects persistence', () => {
  it('persists body fbclid when the stored row has none', () => {
    const row = resolveBookingRedirectClickIds(
      { fbclid: 'ABC', utm_source: 'facebook' },
      { utm_source: 'facebook' },
    )
    expect(row.fbclid).toBe('ABC')
  })

  it('does not overwrite stored fbclid with null from a wiped client blob', () => {
    const row = resolveBookingRedirectClickIds(
      { fbclid: null, utm_source: 'facebook', utm_medium: 'paid_social' },
      { fbclid: 'ABC', fbc: 'fb.1.1.ABC' },
    )
    expect(row.fbclid).toBe('ABC')
    expect(row.fbc).toBe('fb.1.1.ABC')
  })
})

describe('SSR /buchen', () => {
  it('copies inbound fbclid onto the booking-app URL', () => {
    const dest = buildBuchenRedirectUrl(
      { fbclid: 'ABC', category: 'B' },
      'https://app.simy.ch/booking/availability/driving-team',
    )
    const url = new URL(dest)
    expect(url.searchParams.get('fbclid')).toBe('ABC')
    expect(buchenQueryHasAttribution({ fbclid: 'ABC' })).toBe(true)
  })

  it('copies inbound gclid onto the booking-app URL', () => {
    const dest = buildBuchenRedirectUrl(
      { gclid: 'XYZ' },
      'https://app.simy.ch/booking/availability/driving-team',
    )
    expect(new URL(dest).searchParams.get('gclid')).toBe('XYZ')
  })

  it('does not SSR-redirect when /buchen has no click ID or session blob', () => {
    expect(buchenQueryHasAttribution({ category: 'B' })).toBe(false)
    expect(buchenQueryHasAttribution({})).toBe(false)
  })
})

describe('full hop: landing → UTM-only → /buchen → booking_redirects', () => {
  it('keeps fbclid=ABC through merge, URL, and redirect persistence', () => {
    const landing = mergeAttributionFields(
      null,
      { fbclid: 'ABC', utm_source: 'facebook', fbc: constructFbcFromFbclid('ABC', 1) },
    )
    const afterUtm = mergeAttributionFields(
      landing,
      { fbclid: null, utm_source: 'facebook', utm_medium: 'paid_social', landing_page: '/lastwagen/' },
    )
    expect(afterUtm.fbclid).toBe('ABC')

    const appUrl = applyFirstClassClickIds(
      'https://app.simy.ch/booking/availability/driving-team',
      afterUtm,
    )
    expect(new URL(appUrl).searchParams.get('fbclid')).toBe('ABC')

    const buchenToApp = buildBuchenRedirectUrl({ fbclid: afterUtm.fbclid })
    expect(new URL(buchenToApp).searchParams.get('fbclid')).toBe('ABC')

    const redirectRow = resolveBookingRedirectClickIds(
      { fbclid: null, utm_source: 'facebook' },
      afterUtm,
    )
    expect(redirectRow.fbclid).toBe('ABC')
    expect(redirectRow.fbc).toBe('fb.1.1.ABC')

    const recovered = recoverClickIds([
      { utm_source: 'facebook' },
      afterUtm,
      { fbclid: new URL(appUrl).searchParams.get('fbclid') },
    ])
    expect(recovered.fbclid).toBe('ABC')
  })

  it('does not regress gclid on the same hop', () => {
    const afterUtm = mergeAttributionFields(
      { gclid: 'XYZ', utm_source: 'google' },
      { utm_source: 'direct', utm_medium: 'none' },
    )
    const appUrl = applyFirstClassClickIds(
      'https://app.simy.ch/booking/availability/driving-team',
      afterUtm,
    )
    expect(afterUtm.gclid).toBe('XYZ')
    expect(new URL(appUrl).searchParams.get('gclid')).toBe('XYZ')
  })
})

describe('#170 conversion semantics (predicates unchanged by hop-fix)', () => {
  it('confirmed + new + click ID is eligible; hold/cancelled/repeat/history-unknown are not', () => {
    expect(becameBindingConfirmed(null, 'confirmed')).toBe(true)
    expect(becameBindingConfirmed('pending', 'confirmed')).toBe(true)
    expect(becameBindingConfirmed(null, 'pending')).toBe(false)
    expect(becameBindingConfirmed('confirmed', 'cancelled')).toBe(false)
    expect(isEligibleForMetaPurchaseConversion({ newCustomerState: 'new', hasMetaClickId: true })).toBe(true)
    expect(isEligibleForMetaPurchaseConversion({ newCustomerState: 'existing', hasMetaClickId: true })).toBe(false)
    expect(isEligibleForMetaPurchaseConversion({ newCustomerState: 'unknown', hasMetaClickId: true })).toBe(false)
  })

  it('does not convert again on an already-confirmed save', () => {
    expect(becameBindingConfirmed('confirmed', 'confirmed')).toBe(false)
    expect(isUniqueViolation({ code: '23505', message: 'duplicate key value violates unique constraint' })).toBe(true)
  })
})

describe('Meta click-ID gate', () => {
  it('accepts fbclid or fbc and rejects fbp-only', () => {
    expect(hasMetaClickId({ fbclid: 'ABC', fbc: null })).toBe(true)
    expect(hasMetaClickId({ fbclid: null, fbc: 'fb.1.1.ABC' })).toBe(true)
    expect(hasMetaClickId({ fbclid: null, fbc: null })).toBe(false)
  })
})

describe('stale fbc after a new fbclid', () => {
  it('A — new fbclid replaces stored fbc from a previous click', () => {
    const fbc = resolveFbcForIncomingFbclid({
      incomingFbclid: 'NEW',
      storedFbclid: 'OLD',
      storedFbc: 'fb.1.1.OLD',
      nowMs: 9,
    })
    expect(fbc).toBe('fb.1.9.NEW')
  })

  it('B — new fbclid with no stored fbc still derives fbc', () => {
    const fbc = resolveFbcForIncomingFbclid({
      incomingFbclid: 'NEW',
      storedFbclid: null,
      storedFbc: null,
      nowMs: 9,
    })
    expect(fbc).toBe('fb.1.9.NEW')
  })

  it('C — UTM-only merge keeps stored fbclid and fbc', () => {
    const merged = mergeAttributionFields(
      { fbclid: 'OLD', fbc: 'fb.1.1.OLD', utm_source: 'facebook' },
      { fbclid: null, fbc: null, utm_source: 'google', utm_medium: 'cpc' },
    )
    expect(merged.fbclid).toBe('OLD')
    expect(merged.fbc).toBe('fb.1.1.OLD')
    expect(resolveFbcForIncomingFbclid({ incomingFbclid: null, storedFbc: 'fb.1.1.OLD' })).toBeNull()
  })

  it('D — empty/null incoming fbclid does not derive a replacement fbc', () => {
    expect(resolveFbcForIncomingFbclid({
      incomingFbclid: '',
      storedFbclid: 'OLD',
      storedFbc: 'fb.1.1.OLD',
    })).toBeNull()
    expect(resolveFbcForIncomingFbclid({
      incomingFbclid: null,
      storedFbclid: 'OLD',
      storedFbc: 'fb.1.1.OLD',
    })).toBeNull()
  })

  it('E — cookie/dt_attr fbc that already encodes the new fbclid is kept', () => {
    expect(resolveFbcForIncomingFbclid({
      incomingFbclid: 'NEW',
      storedFbclid: 'OLD',
      storedFbc: 'fb.1.1.OLD',
      cookieFbc: 'fb.1.99.NEW',
      nowMs: 1,
    })).toBe('fb.1.99.NEW')
    expect(resolveFbcForIncomingFbclid({
      incomingFbclid: 'NEW',
      explicitFbc: 'fb.1.50.NEW',
      storedFbc: 'fb.1.1.OLD',
      nowMs: 1,
    })).toBe('fb.1.50.NEW')
  })
})

describe('analytics session id (CodeQL js/insecure-randomness)', () => {
  it('creates a session id when storage is empty and reuses it afterwards', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    }
    const first = readOrCreateAnalyticsSessionId(storage, 1_700_000_000_000)
    const second = readOrCreateAnalyticsSessionId(storage, 1_800_000_000_000)
    expect(first).toMatch(ANALYTICS_SESSION_ID_PATTERN)
    expect(first.startsWith('1700000000000_')).toBe(true)
    expect(second).toBe(first)
    expect(store.get(ANALYTICS_SESSION_STORAGE_KEY)).toBe(first)
  })

  it('mints the existing timestamp_base36 contract without Math.random', () => {
    const id = createAnalyticsSessionId(42)
    expect(id).toMatch(ANALYTICS_SESSION_ID_PATTERN)
    const hop = readFileSync(resolve(process.cwd(), 'server/utils/booking-attribution-hop.ts'), 'utf8')
    const websiteHop = readFileSync(resolve(process.cwd(), 'apps/website/utils/booking-attribution-hop.ts'), 'utf8')
    const websitePlugin = readFileSync(resolve(process.cwd(), 'apps/website/plugins/marketing-attribution.client.ts'), 'utf8')
    const appPlugin = readFileSync(resolve(process.cwd(), 'plugins/booking-session-tracking.client.ts'), 'utf8')
    const goBuchen = readFileSync(resolve(process.cwd(), 'apps/website/server/routes/go/buchen.get.ts'), 'utf8')
    for (const src of [hop, websiteHop, websitePlugin, appPlugin, goBuchen]) {
      expect(src).not.toMatch(/Math\.random\s*\(/)
    }
  })
})

describe('gbraid/wbraid landing_page', () => {
  it('A/B — gbraid-only and wbraid-only refresh landing_page', () => {
    expect(incomingClickRefreshesLandingPage({ gbraid: 'XYZ' })).toBe(true)
    expect(incomingClickRefreshesLandingPage({ wbraid: 'XYZ' })).toBe(true)
    const gbraidMerged = mergeAttributionFields(
      { landing_page: '/old', gclid: 'keep' },
      { gbraid: 'XYZ', landing_page: incomingClickRefreshesLandingPage({ gbraid: 'XYZ' }) ? '/auto-fahrschule/' : '/old' },
    )
    expect(gbraidMerged.landing_page).toBe('/auto-fahrschule/')
    expect(gbraidMerged.gclid).toBe('keep')
    const wbraidMerged = mergeAttributionFields(
      { landing_page: '/old' },
      { wbraid: 'XYZ', landing_page: incomingClickRefreshesLandingPage({ wbraid: 'XYZ' }) ? '/motorrad/' : '/old' },
    )
    expect(wbraidMerged.landing_page).toBe('/motorrad/')
  })

  it('C/D — fbclid and gclid still refresh landing_page', () => {
    expect(incomingClickRefreshesLandingPage({ fbclid: 'ABC' })).toBe(true)
    expect(incomingClickRefreshesLandingPage({ gclid: 'G' })).toBe(true)
  })

  it('E — UTM-only still refreshes landing_page; empty incoming does not', () => {
    expect(incomingClickRefreshesLandingPage({ utm_source: 'google' })).toBe(true)
    expect(incomingClickRefreshesLandingPage({})).toBe(false)
    const kept = mergeAttributionFields(
      { landing_page: '/old', fbclid: 'ABC' },
      { landing_page: incomingClickRefreshesLandingPage({}) ? '/new' : undefined },
    )
    expect(kept.landing_page).toBe('/old')
    expect(kept.fbclid).toBe('ABC')
  })
})
