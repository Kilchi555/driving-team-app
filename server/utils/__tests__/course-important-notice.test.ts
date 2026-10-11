import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildCourseImportantNoticeListItems,
  parseCourseImportantNoticeItems,
  serializeCourseImportantNoticeItems,
} from '~/server/utils/course-important-notice'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

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
    expect(src).toContain('email_important_notice')
    expect(src).toContain("title: 'Wichtig!'")
    expect(src).toContain("bg: '#fef3c7'")
  })

  it('category load returns all columns including email_important_notice', () => {
    const src = read('server/api/admin/course-categories/index.get.ts')
    expect(src).toContain(".select('*')")
    expect(src).toContain(".eq('tenant_id', profile.tenant_id)")
  })
})
