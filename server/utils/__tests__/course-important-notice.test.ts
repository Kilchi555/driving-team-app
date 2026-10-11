import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildCourseImportantNoticeListItems,
  parseCourseImportantNoticeItems,
  resolveCourseCategoryNoticeLookup,
  serializeCourseImportantNoticeItems,
} from '~/server/utils/course-important-notice'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

describe('resolveCourseCategoryNoticeLookup', () => {
  it('prefers course_category_id over legacy category code', () => {
    expect(
      resolveCourseCategoryNoticeLookup({
        course_category_id: 'cat-uuid',
        category: 'VKU',
      }),
    ).toEqual({ by: 'id', value: 'cat-uuid' })
  })

  it('falls back to legacy category code when FK is null', () => {
    expect(
      resolveCourseCategoryNoticeLookup({
        course_category_id: null,
        category: 'PGS',
      }),
    ).toEqual({ by: 'code', value: 'PGS' })
  })

  it('returns null when neither FK nor code is set (empty hints → email defaults)', () => {
    expect(resolveCourseCategoryNoticeLookup({ course_category_id: null, category: null })).toBeNull()
    expect(resolveCourseCategoryNoticeLookup({ course_category_id: '', category: '  ' })).toBeNull()
    expect(resolveCourseCategoryNoticeLookup(null)).toBeNull()
  })

  it('does not let course A id collide with course B code lookup intent', () => {
    const a = resolveCourseCategoryNoticeLookup({
      course_category_id: 'cat-a',
      category: null,
    })
    const b = resolveCourseCategoryNoticeLookup({
      course_category_id: 'cat-b',
      category: 'SHARED_CODE',
    })
    expect(a).toEqual({ by: 'id', value: 'cat-a' })
    expect(b).toEqual({ by: 'id', value: 'cat-b' })
    expect(a?.value).not.toBe(b?.value)
  })
})

describe('course important notice serialize/parse', () => {
  it('serializes ordered non-empty items as newline text', () => {
    expect(
      serializeCourseImportantNoticeItems([
        '  Erster Hinweis  ',
        '',
        'Zweiter Hinweis',
        '   ',
      ]),
    ).toBe('Erster Hinweis\nZweiter Hinweis')
  })

  it('parses plain-text lines and preserves order', () => {
    expect(parseCourseImportantNoticeItems('A\nB\nC')).toEqual(['A', 'B', 'C'])
  })

  it('parses legacy <li> HTML', () => {
    expect(
      parseCourseImportantNoticeItems('<ul><li>Eins</li><li>Zwei</li></ul>'),
    ).toEqual(['Eins', 'Zwei'])
  })

  it('treats null/empty as no items', () => {
    expect(parseCourseImportantNoticeItems(null)).toEqual([])
    expect(parseCourseImportantNoticeItems('')).toEqual([])
    expect(parseCourseImportantNoticeItems('   ')).toEqual([])
  })

  it('allows duplicate hints (no silent dedupe)', () => {
    expect(serializeCourseImportantNoticeItems(['Same', 'Same'])).toBe('Same\nSame')
    expect(parseCourseImportantNoticeItems('Same\nSame')).toEqual(['Same', 'Same'])
  })
})

describe('buildCourseImportantNoticeListItems (email yellow area)', () => {
  it('returns empty for 0 hints so caller can use fallbacks', () => {
    expect(buildCourseImportantNoticeListItems(null)).toBe('')
    expect(buildCourseImportantNoticeListItems('')).toBe('')
    expect(buildCourseImportantNoticeListItems('  \n  ')).toBe('')
  })

  it('renders a single hint as one escaped <li>', () => {
    const html = buildCourseImportantNoticeListItems('Gültiger Ausweis mitnehmen')
    expect(html).toContain('<li>Gültiger Ausweis mitnehmen</li>')
    expect(html.match(/<li>/g)?.length).toBe(1)
  })

  it('renders multiple hints in order as a bullet list', () => {
    const html = buildCourseImportantNoticeListItems(
      'AUDIT_HINT_ALPHA_111\nAUDIT_HINT_BETA_222\nAUDIT_HINT_GAMMA_333',
    )
    const alpha = html.indexOf('AUDIT_HINT_ALPHA_111')
    const beta = html.indexOf('AUDIT_HINT_BETA_222')
    const gamma = html.indexOf('AUDIT_HINT_GAMMA_333')
    expect(alpha).toBeGreaterThan(-1)
    expect(beta).toBeGreaterThan(alpha)
    expect(gamma).toBeGreaterThan(beta)
    expect(html.match(/<li>/g)?.length).toBe(3)
  })

  it('escapes HTML / special characters in plain-text hints', () => {
    const html = buildCourseImportantNoticeListItems(
      '<script>alert(1)</script>\nPreis < CHF 100 & "ok"',
    )
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('Preis &lt; CHF 100 &amp; &quot;ok&quot;')
  })

  it('preserves legacy <li> markup without re-wrapping', () => {
    const raw = '<li>Legacy eins</li><li>Legacy zwei</li>'
    expect(buildCourseImportantNoticeListItems(raw)).toBe(raw)
  })
})

describe('save/load/email wiring contract (source)', () => {
  it('whitelists email_important_notice on category save', () => {
    const src = read('server/api/admin/course-categories/save.post.ts')
    expect(src).toContain("'email_important_notice'")
  })

  it('admin UI maps list ↔ email_important_notice and documents yellow confirmation area', () => {
    const src = read('pages/admin/courses.vue')
    expect(src).toContain('emailImportantNoticeItems')
    expect(src).toContain('importantNoticeToString')
    expect(src).toContain('email_important_notice')
    expect(src).toContain('gelben Bereich der Anmeldebestätigung')
  })

  it('confirmation email uses shared builder for yellow Wichtig! section', () => {
    const src = read('server/api/emails/send-course-enrollment-confirmation.post.ts')
    expect(src).toContain('buildCourseImportantNoticeListItems')
    expect(src).toContain('resolveCourseCategoryNoticeLookup')
    expect(src).toContain('email_important_notice')
    expect(src).toContain('course_category_id')
    expect(src).toContain("title: 'Wichtig!'")
    expect(src).toContain("bg: '#fef3c7'")
  })

  it('confirmation email prefers FK lookup and keeps tenant_id filter', () => {
    const src = read('server/api/emails/send-course-enrollment-confirmation.post.ts')
    expect(src).toContain("eq('tenant_id', tenant.id)")
    expect(src).toContain("eq('id', categoryLookup.value)")
    expect(src).toContain("eq('code', categoryLookup.value)")
    // Must not only gate on legacy courses.category (root cause of Test 2 defaults)
    expect(src).not.toMatch(/if \(course\?\.category && tenant\?\.id\)/)
  })

  it('category load returns all columns including email_important_notice', () => {
    const src = read('server/api/admin/course-categories/index.get.ts')
    expect(src).toContain(".select('*')")
    expect(src).toContain(".eq('tenant_id', profile.tenant_id)")
  })

  it('cash / wallee / admin paths still share the same confirmation endpoint', () => {
    const callers = [
      'server/api/courses/enroll-cash.post.ts',
      'server/utils/fulfill-course-wallee-payment.ts',
      'server/utils/admin-course-enroll.ts',
    ]
    for (const file of callers) {
      expect(read(file)).toContain('/api/emails/send-course-enrollment-confirmation')
    }
    // SARI enrollment confirmation helpers remain unused by runtime callers
    // (dedicated templates exist but cash/wallee/admin use the shared endpoint).
    const sariEnroll = read('server/api/sari/enroll-student.post.ts')
    expect(sariEnroll).not.toContain('generateSARIEnrollmentConfirmationEmail')
  })
})
