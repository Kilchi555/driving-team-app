import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildWebsiteTeaserSlots } from '../website-next-slots'
import { projectPublicWebsiteTenant } from '../website-public-tenant-select'
import {
  formatCourseWhenLabel,
  formatInTenantZone,
  formatSlotDayLabel,
  formatSlotTimeLabel,
  isValidIanaTimeZone,
  parseTenantTimeZoneWrite,
  resolveSlotTimeZone,
  slotLocalDateKey,
} from '~/utils/slot-display-time'

const SUMMER = '2026-10-15T14:00:00.000Z' // CEST, UTC+2 → 16:00
const WINTER = '2026-01-15T14:00:00.000Z' // CET, UTC+1 → 15:00
const BEFORE_FALLBACK = '2026-10-24T14:00:00.000Z' // still CEST
const AFTER_FALLBACK = '2026-10-25T14:00:00.000Z' // CET after the 03:00 → 02:00 change
const BEFORE_SPRING = '2026-03-28T14:00:00.000Z' // CET
const AFTER_SPRING = '2026-03-29T14:00:00.000Z' // CEST after the 02:00 → 03:00 change

function utcClock(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

function src(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), 'utf8')
}

function row(iso: string, id = 'slot-1') {
  return {
    id,
    start_time: iso,
    end_time: new Date(new Date(iso).getTime() + 45 * 60 * 1000).toISOString(),
    duration_minutes: 45,
    category_code: 'B',
  }
}

describe('slot display uses the tenant IANA zone, not the UTC host clock', () => {
  it('shows 16:00 in Zurich for a 14:00 UTC slot in October (CEST, UTC+2)', () => {
    expect(utcClock(SUMMER)).toBe('14:00')
    expect(formatSlotTimeLabel(SUMMER, 'Europe/Zurich')).toBe('16:00')
    expect(formatSlotTimeLabel(SUMMER)).toBe('16:00')
    expect(formatSlotDayLabel(SUMMER, 'Europe/Zurich')).toBe('Do., 15. Okt.')
  })

  it('shows 15:00 in Zurich for the same UTC clock in January (CET, UTC+1)', () => {
    expect(utcClock(WINTER)).toBe('14:00')
    expect(formatSlotTimeLabel(WINTER, 'Europe/Zurich')).toBe('15:00')
    expect(formatSlotTimeLabel(SUMMER, 'Europe/Zurich')).not.toBe(
      formatSlotTimeLabel(WINTER, 'Europe/Zurich'),
    )
  })

  it('follows the Europe/Zurich DST transition instead of a fixed offset', () => {
    expect(formatSlotTimeLabel(BEFORE_FALLBACK, 'Europe/Zurich')).toBe('16:00')
    expect(formatSlotTimeLabel(AFTER_FALLBACK, 'Europe/Zurich')).toBe('15:00')
    expect(formatSlotTimeLabel(BEFORE_SPRING, 'Europe/Zurich')).toBe('15:00')
    expect(formatSlotTimeLabel(AFTER_SPRING, 'Europe/Zurich')).toBe('16:00')
    expect(formatSlotDayLabel(BEFORE_FALLBACK, 'Europe/Zurich')).toBe('Sa., 24. Okt.')
    expect(formatSlotDayLabel(AFTER_FALLBACK, 'Europe/Zurich')).toBe('So., 25. Okt.')
  })

  it('keeps two instants distinct when they share a wall clock across the fallback hour', () => {
    const beforeChange = '2026-10-25T00:30:00.000Z' // 02:30 CEST
    const afterChange = '2026-10-25T01:30:00.000Z' // 02:30 CET
    expect(formatSlotTimeLabel(beforeChange, 'Europe/Zurich')).toBe('02:30')
    expect(formatSlotTimeLabel(afterChange, 'Europe/Zurich')).toBe('02:30')
    expect(beforeChange).not.toBe(afterChange)
  })

  it('uses a configured IANA zone and falls back to Europe/Zurich when none is set', () => {
    expect(resolveSlotTimeZone(null)).toBe('Europe/Zurich')
    expect(resolveSlotTimeZone('  ')).toBe('Europe/Zurich')
    expect(resolveSlotTimeZone('Not/AZone')).toBe('Europe/Zurich')
    expect(formatSlotTimeLabel(SUMMER, 'Not/AZone')).toBe('16:00')
    expect(resolveSlotTimeZone('America/New_York')).toBe('America/New_York')
    expect(formatSlotTimeLabel(SUMMER, 'America/New_York')).toBe('10:00')
  })

  it('parses an explicit offset the same way as a Zulu instant', () => {
    expect(formatSlotTimeLabel('2026-10-15T14:00:00+00:00', 'Europe/Zurich')).toBe('16:00')
  })
})

describe('teaser slot matches the instant that a booking stores', () => {
  const bookingUrl = 'https://app.simy.ch/booking/availability/simych'

  it('labels the slot in Zurich and leaves the canonical start_time untouched', () => {
    const slots = buildWebsiteTeaserSlots([row(SUMMER)], bookingUrl, 'Europe/Zurich')
    expect(slots).toHaveLength(1)
    expect(slots[0].time_label).toBe('16:00')
    expect(slots[0].start_time).toBe(SUMMER)
    expect(slots[0].end_time).toBe('2026-10-15T14:45:00.000Z')
    expect(formatSlotTimeLabel(slots[0].start_time, 'Europe/Zurich')).toBe(slots[0].time_label)
    expect(slots[0].book_url).toContain('date=2026-10-15')

    // guest-book / create-appointment persist the slot instant, not the label.
    const bookedStart = slots[0].start_time
    expect(bookedStart).toBe(SUMMER)
    expect(new Date(bookedStart).toISOString()).toBe(SUMMER)
  })

  it('keeps the same correspondence in winter and across the DST change', () => {
    const slots = buildWebsiteTeaserSlots(
      [row(WINTER, 'w'), row(BEFORE_FALLBACK, 'a'), row(AFTER_FALLBACK, 'b'), row(AFTER_SPRING, 'c')],
      bookingUrl,
      null,
    )
    expect(slots.map((s) => [s.id, s.time_label, s.start_time])).toEqual([
      ['w', '15:00', WINTER],
      ['a', '16:00', BEFORE_FALLBACK],
      ['b', '15:00', AFTER_FALLBACK],
      ['c', '16:00', AFTER_SPRING],
    ])
    for (const slot of slots) {
      expect(formatSlotTimeLabel(slot.start_time, 'Europe/Zurich')).toBe(slot.time_label)
      expect(slotLocalDateKey(slot.start_time, 'Europe/Zurich')).toBe(slot.start_time.slice(0, 10))
    }
  })

  it('keeps the book-link date on the canonical UTC day the booking page matches', () => {
    const boundary = [
      '2026-10-15T05:00:00.000Z', // 07:00 CEST
      '2026-10-15T17:45:00.000Z', // 19:45 CEST
      '2026-01-15T06:00:00.000Z', // 07:00 CET
      '2026-01-15T18:45:00.000Z', // 19:45 CET
    ]
    for (const iso of boundary) {
      expect(slotLocalDateKey(iso, 'Europe/Zurich')).toBe(iso.slice(0, 10))
    }
    const shown = buildWebsiteTeaserSlots(boundary.map((iso, i) => row(iso, `b${i}`)), bookingUrl)
    expect(shown.map((s) => s.time_label)).toEqual(['07:00', '19:45', '07:00', '19:45'])
    expect(shown.every((s) => s.book_url.includes(`date=${s.start_time.slice(0, 10)}`))).toBe(true)
  })

  it('hides clocks outside 07:00–20:00 school time without shifting the stored instant', () => {
    const early = '2026-10-15T04:00:00.000Z' // 06:00 CEST
    const late = '2026-10-15T18:00:00.000Z' // 20:00 CEST
    const nextMorning = '2026-10-15T22:30:00.000Z' // 00:30 CEST the next day
    expect(formatSlotDayLabel(nextMorning, 'Europe/Zurich')).toBe('Fr., 16. Okt.')
    const slots = buildWebsiteTeaserSlots(
      [row(early, 'early'), row(SUMMER, 'ok'), row(late, 'late'), row(nextMorning, 'night')],
      bookingUrl,
    )
    expect(slots.map((s) => s.id)).toEqual(['ok'])
    expect(slots[0].start_time).toBe(SUMMER)
  })
})

describe('preview and published website paths', () => {
  it('formats preview and published teasers with the tenant zone and renders that label', () => {
    const loader = src('server/utils/website-next-slots.ts')
    const previewApi = src('server/api/public/website/[subdomain]/next-slots.get.ts')
    const enrich = src('server/utils/website-enrich-landing.ts')
    const published = src('apps/website/server/api/next-slots.get.ts')
    const widget = src('apps/website/components/UpcomingSlotsSection.vue')

    expect(loader).toContain('formatSlotTimeLabel')
    expect(loader).toContain('start.slice(0, 10)')
    expect(loader).not.toContain('iso.slice(11, 16)')
    expect(previewApi).toContain('timeZone: tenant.timezone')
    expect(enrich).toContain('timeZone: tenant.timezone')
    expect(published).toContain('formatSlotTimeLabel')
    expect(published).toContain('resolveSlotTimeZone')
    expect(published).not.toContain('iso.slice(11, 16)')

    for (const page of ['pages/s/[subdomain]/index.vue', 'pages/s/[subdomain]/[slug].vue']) {
      expect(src(page)).toContain('s.time_label')
    }
    expect(widget).toContain('s.time_label')
  })

  it('loads the trusted tenant zone in preview and published, inside each project root', () => {
    const published = src('apps/website/server/api/next-slots.get.ts')
    const appCopy = src('utils/slot-display-time.ts')
    const websiteCopy = src('apps/website/server/utils/slot-display-time.ts')
    expect(published).toContain("from '../utils/slot-display-time'")
    expect(published).not.toContain('../../../../utils/slot-display-time')
    expect(websiteCopy).toBe(appCopy)
    expect(published).toContain('resolveSlotTimeZone(zoneError ? null : tenantZone?.timezone)')
    const sari = src('apps/website/server/utils/registration-sari-membership.ts')
    const register = src('apps/website/server/api/courses/register.post.ts')
    expect(register).toContain("from '~/server/utils/registration-sari-membership'")
    expect(sari).toContain(".from('registration_sari_memberships')")
    expect(sari).toContain('Registration cannot be deleted while a SARI membership exists')
    expect(sari).not.toContain('../../../../')
  })

  it('formats booking-page labels from the tenant zone and still stores the UTC instant', () => {
    const booking = src('pages/booking/availability/[slug].vue')
    const guest = src('server/api/booking/guest-book.post.ts')
    const created = src('server/api/booking/create-appointment.post.ts')
    const init = src('server/api/booking/get-booking-init.get.ts')

    expect(booking).toContain('resolveSlotTimeZone(currentTenant.value?.timezone)')
    expect(booking).toContain('formatSlotTimeLabel(dateTimeString, bookingTimeZone.value)')
    expect(booking).toContain('formatSlotTimeLabel(slot.start_time, bookingTimeZone.value)')
    expect(booking).toContain('formatSlotTimeLabel(slotIso, bookingTimeZone.value)')
    expect(booking).toContain('start_time: slotIso')
    expect(booking).toContain('start_time: selectedSlot.value.start_time')
    expect(booking).toContain("String(s.start_time || '').slice(0, 10) === hint")
    expect(booking).not.toContain('slotTimeLocal')
    expect(booking).not.toContain("timeZone: 'Europe/Zurich', day:")
    expect(booking).not.toContain("timeZone: 'Europe/Zurich' }")
    // Slot construction still converts a Zurich wall clock into the stored UTC instant.
    expect(booking).toContain("timeZone: 'Europe/Zurich'")
    expect(guest).toContain('start_time: slot.start_time')
    expect(created).toContain('start_time: slot.start_time')
    expect(init).toContain('timezone')
    expect(init).not.toContain('timezone:')
  })

  it('renders course cards from the server label and keeps timezone out of public JSON', () => {
    const enrich = src('server/utils/website-enrich-landing.ts')
    expect(enrich).toContain('formatCourseWhenLabel(startsAt, tenant.timezone)')
    for (const page of ['pages/s/[subdomain]/index.vue', 'pages/s/[subdomain]/[slug].vue']) {
      const text = src(page)
      expect(text).toContain('c.when_label')
      expect(text).not.toContain('formatCourseDate')
      expect(text).not.toContain('toLocaleDateString')
      expect(text).not.toContain('toLocaleTimeString')
    }
    const projected = projectPublicWebsiteTenant({
      name: 'Simy',
      timezone: 'America/New_York',
      booking_policy: { secret: true },
    })
    expect(projected).not.toHaveProperty('timezone')
    expect(projected).not.toHaveProperty('booking_policy')
  })
})

describe('the same tenant zone labels teaser, booking chips, and course cards', () => {
  const bookingUrl = 'https://app.simy.ch/booking/availability/simych'

  it('renders America/New_York as 10:00 everywhere and leaves the UTC instant unchanged', () => {
    const teaser = buildWebsiteTeaserSlots([row(SUMMER)], bookingUrl, 'America/New_York')
    expect(teaser[0].time_label).toBe('10:00')
    expect(teaser[0].start_time).toBe(SUMMER)
    expect(formatSlotTimeLabel(teaser[0].start_time, 'America/New_York')).toBe(teaser[0].time_label)
    expect(formatCourseWhenLabel(SUMMER, 'America/New_York')).toContain('10:00')
    expect(formatCourseWhenLabel(SUMMER, 'Europe/Zurich')).toContain('16:00')
    expect(formatCourseWhenLabel(WINTER, 'Europe/Zurich')).toContain('15:00')
    expect(teaser[0].book_url).toContain('date=2026-10-15')
  })

  it('does not follow the process or visitor clock when the tenant zone is set', () => {
    const utcLabel = new Intl.DateTimeFormat('de-CH', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(SUMMER))
    expect(utcLabel).toContain('14:00')
    expect(formatCourseWhenLabel(SUMMER, 'Europe/Zurich')).not.toBe(utcLabel)
    expect(formatInTenantZone(SUMMER, null, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).toBe('16:00')
    expect(formatInTenantZone(SUMMER, 'Nope/Zone', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).toBe('16:00')
    expect(formatCourseWhenLabel(SUMMER, '')).toContain('16:00')
  })

  it('keeps a New York evening on the canonical UTC date the booking page matches', () => {
    const evening = '2026-10-15T23:00:00.000Z' // 19:00 in New York, next calendar day in Zurich
    const slots = buildWebsiteTeaserSlots([row(evening, 'ny')], bookingUrl, 'America/New_York')
    expect(slots).toHaveLength(1)
    expect(slots[0].time_label).toBe('19:00')
    expect(slots[0].start_time).toBe(evening)
    expect(slots[0].book_url).toContain('date=2026-10-15')
  })
})

describe('tenant timezone writes accept only a real IANA zone', () => {
  it('stores a valid zone as given and rejects an invalid one', () => {
    expect(parseTenantTimeZoneWrite(undefined)).toEqual({ ok: true, timezone: 'Europe/Zurich' })
    expect(parseTenantTimeZoneWrite('   ')).toEqual({ ok: true, timezone: 'Europe/Zurich' })
    expect(parseTenantTimeZoneWrite(' America/New_York ')).toEqual({ ok: true, timezone: 'America/New_York' })
    expect(parseTenantTimeZoneWrite('Europe/Zurich')).toEqual({ ok: true, timezone: 'Europe/Zurich' })
    expect(parseTenantTimeZoneWrite('Not/AZone').ok).toBe(false)
    expect(isValidIanaTimeZone('UTC')).toBe(true)
    expect(isValidIanaTimeZone('')).toBe(false)
  })

  it('wires that check into registration and admin creation, which are the tenants.timezone writers', () => {
    const register = src('server/api/tenants/register.post.ts')
    const admin = src('server/api/admin/tenants-manage.ts')
    expect(register).toContain('parseTenantTimeZoneWrite(data.timezone)')
    expect(register).toContain('timezone: data.timezone || \'Europe/Zurich\'')
    expect(admin).toContain("hasOwnProperty.call(body, 'timezone')")
    expect(admin).toContain('parseTenantTimeZoneWrite(body.timezone)')
    expect(admin).toContain('statusCode: 400, message: zoneWrite.error')
    const allowed = admin.slice(admin.indexOf('const ALLOWED'), admin.indexOf('] as const'))
    expect(allowed).not.toContain('timezone')
  })
})
