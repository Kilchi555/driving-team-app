import { describe, expect, it } from 'vitest'
import {
  buildInvoiceLineTemplates,
  filterInvoiceLineTemplates,
  groupInvoiceLineTemplates,
} from '../invoice-line-templates'

const terms = { appointment: 'Fahrstunde' }

describe('buildInvoiceLineTemplates', () => {
  it('builds services from categories × event types with prices', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      categories: [
        { id: 1, code: 'B', name: 'Kat. B', is_active: true },
        { id: 2, code: 'A', name: 'Kat. A', is_active: true },
      ],
      pricingRules: [
        { category_code: 'B', rule_type: 'base_price', price_per_minute_rappen: 200, base_duration_minutes: 45 },
        { category_code: 'B', rule_type: 'theory', price_per_minute_rappen: 100, base_duration_minutes: 45 },
        { category_code: 'A', rule_type: 'base_price', price_per_minute_rappen: 220, base_duration_minutes: 45 },
      ],
      eventTypes: [
        { code: 'lesson', name: 'Fahrstunde', default_duration_minutes: 45 },
        { code: 'theory', name: 'Theorieunterricht', default_duration_minutes: 45 },
        { code: 'break', name: 'Pause', default_duration_minutes: 15 },
      ],
    })

    const names = templates.map((t) => t.name)
    expect(names).toContain('Fahrstunde · Kat. B')
    expect(names).toContain('Theorieunterricht · Kat. B')
    expect(names).toContain('Fahrstunde · Kat. A')
    expect(names).not.toContain('Pause · Kat. B')

    const lessonB = templates.find((t) => t.id === 'service:lesson:B')
    expect(lessonB?.price_rappen).toBe(9000)
    expect(lessonB?.kind).toBe('service')
    expect(lessonB?.product_id).toBeUndefined()

    const theoryB = templates.find((t) => t.id === 'service:theory:B')
    expect(theoryB?.price_rappen).toBe(4500)
  })

  it('skips event types that have no own price (does not inherit lesson ppm)', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      categories: [{ id: 1, code: 'A', name: 'Kategorie A', is_active: true }],
      pricingRules: [
        { category_code: 'A', rule_type: 'base_price', price_per_minute_rappen: 211, base_duration_minutes: 45 },
      ],
      eventTypes: [
        { code: 'lesson', name: 'Fahrstunde', default_duration_minutes: 45 },
        { code: 'ferien', name: 'Ferien', default_duration_minutes: 480 },
        { code: 'other', name: 'Sonstiges', default_duration_minutes: 45 },
        { code: 'nothelfer-begruessung', name: 'Nothelfer-Begrüssung', default_duration_minutes: 30 },
        { code: 'exam', name: 'Prüfung', default_duration_minutes: 90 },
      ],
    })

    const names = templates.map((t) => t.name)
    expect(names).toEqual(['Fahrstunde · Kategorie A'])
    expect(templates[0].price_rappen).toBe(9500)
  })

  it('includes a non-lesson event type only when it has an event_price rule', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      categories: [{ id: 1, code: 'A', name: 'Kategorie A', is_active: true }],
      pricingRules: [
        { category_code: 'A', rule_type: 'base_price', price_per_minute_rappen: 200, base_duration_minutes: 45 },
        {
          category_code: 'A',
          event_type_code: 'exam',
          rule_type: 'event_price',
          price_per_minute_rappen: 250,
          base_duration_minutes: 90,
        },
      ],
      eventTypes: [
        { code: 'lesson', name: 'Fahrstunde', default_duration_minutes: 45 },
        { code: 'exam', name: 'Prüfung', default_duration_minutes: 90 },
        { code: 'ferien', name: 'Ferien', default_duration_minutes: 480 },
      ],
    })

    expect(templates.map((t) => t.id).sort()).toEqual(['service:exam:A', 'service:lesson:A'])
    expect(templates.find((t) => t.id === 'service:exam:A')?.price_rappen).toBe(22500)
  })

  it('shows the configured block price, not truncated minutes × duration', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      categories: [
        { id: 1, code: 'B', name: 'Kat. B', is_active: true },
        { id: 2, code: 'A', name: 'Kat. A', is_active: true },
      ],
      pricingRules: [
        { category_code: 'B', rule_type: 'theory', price_per_minute_rappen: 188, base_duration_minutes: 45 },
        { category_code: 'A', rule_type: 'theory', price_per_minute_rappen: 188.8889, base_duration_minutes: 45 },
      ],
      eventTypes: [{ code: 'theory', name: 'Theorieunterricht', default_duration_minutes: 45 }],
    })

    expect(templates.find((t) => t.id === 'service:theory:B')?.price_rappen).toBe(8500)
    expect(templates.find((t) => t.id === 'service:theory:A')?.price_rappen).toBe(8500)
  })

  it('hides parent categories when leaf children exist', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      categories: [
        { id: 1, code: 'B', name: 'B', is_active: true },
        { id: 2, code: 'B-Auto', name: 'B Automatik', parent_category_id: 1, is_active: true },
      ],
      pricingRules: [
        { category_code: 'B', rule_type: 'base_price', price_per_minute_rappen: 200, base_duration_minutes: 45 },
        { category_code: 'B-Auto', rule_type: 'base_price', price_per_minute_rappen: 180, base_duration_minutes: 45 },
      ],
      eventTypes: [{ code: 'lesson', name: 'Fahrstunde', default_duration_minutes: 45 }],
    })

    expect(templates.map((t) => t.name)).toEqual(['Fahrstunde · B Automatik'])
    expect(templates[0].price_rappen).toBe(8100)
  })

  it('includes course types, courses and products', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      courseCategories: [
        { id: 'cc1', name: 'Verkehrskunde', default_price_rappen: 19000, is_active: true },
      ],
      courses: [
        {
          id: 'c1',
          name: 'VKU September',
          course_start_date: '2026-09-12',
          price_per_participant_rappen: 19000,
          is_active: true,
        },
      ],
      products: [
        { id: 'p1', name: 'Lernfahrausweis', description: 'LFA', price_rappen: 5500, is_active: true },
      ],
    })

    expect(templates.find((t) => t.id === 'course-type:cc1')?.price_rappen).toBe(19000)
    expect(templates.find((t) => t.id === 'course:c1')?.name).toBe('VKU September')

    const withSessions = buildInvoiceLineTemplates({
      terms,
      courses: [
        {
          id: 'c3',
          name: 'VKU mit Teilen',
          price_per_participant_rappen: 19000,
          is_active: true,
          sessions: [
            { session_number: 2, start_time: '2026-09-13T08:00:00+02:00', end_time: '2026-09-13T12:00:00+02:00' },
            { session_number: 1, start_time: '2026-09-12T08:00:00+02:00', end_time: '2026-09-12T12:00:00+02:00' },
          ],
        },
      ],
    })
    const sessionRow = withSessions.find((t) => t.id === 'course:c3')
    expect(sessionRow?.description).toMatch(/2 Teile/)
    expect(sessionRow?.details?.split('\n')[0]).toMatch(/^Teil 1 · .*12\.09\.2026/)
    expect(sessionRow?.details?.split('\n')[1]).toMatch(/^Teil 2 · .*13\.09\.2026/)

    const messy = buildInvoiceLineTemplates({
      terms,
      courses: [
        {
          id: 'c4',
          name: 'Motorradkurs',
          price_per_participant_rappen: 49900,
          is_active: true,
          sessions: [
            { session_number: -100002, start_time: '2026-08-22T07:30:00+02:00', end_time: '2026-08-22T11:30:00+02:00' },
            { session_number: -100001, start_time: '2026-08-08T07:30:00+02:00', end_time: '2026-08-08T11:30:00+02:00' },
            { session_number: 1, start_time: '2026-08-15T07:30:00+02:00', end_time: '2026-08-15T11:30:00+02:00' },
          ],
        },
      ],
    })
    const lines = messy.find((t) => t.id === 'course:c4')?.details?.split('\n') || []
    expect(lines[0]).toMatch(/^Teil 1 · .*08\.08\.2026/)
    expect(lines[1]).toMatch(/^Teil 2 · .*15\.08\.2026/)
    expect(lines[2]).toMatch(/^Teil 3 · .*22\.08\.2026/)
    expect(messy.find((t) => t.id === 'course:c4')?.details).not.toMatch(/-10000/)

    const withoutPrice = buildInvoiceLineTemplates({
      terms,
      courseCategories: [
        { id: 'cc0', name: 'Fahrlehrerweiterbildungen', default_price_rappen: 0, is_active: true },
        { id: 'cc1', name: 'Verkehrskunde', default_price_rappen: 19000, is_active: true },
        { id: 'cc2', name: 'Motorradkurse', default_price_rappen: 49900, is_active: true },
      ],
      courses: [
        { id: 'c2', name: 'VKU ohne Preis', course_category_id: 'cc1', is_active: true },
      ],
    })
    expect(withoutPrice.map((t) => t.name)).toEqual(['Verkehrskunde', 'Motorradkurse', 'VKU ohne Preis'])
    expect(withoutPrice.find((t) => t.id === 'course:c2')?.price_rappen).toBe(19000)
    const product = templates.find((t) => t.id === 'product:p1')
    expect(product?.product_id).toBe('p1')
    expect(product?.group).toBe('Produkte')
  })

  it('adds category-less event_price rules', () => {
    const templates = buildInvoiceLineTemplates({
      terms: { appointment: 'Sitzung' },
      pricingRules: [
        { event_type_code: 'session', rule_type: 'event_price', price_per_minute_rappen: 300, base_duration_minutes: 60 },
      ],
      eventTypes: [{ code: 'session', name: 'Coaching-Session', default_duration_minutes: 60 }],
    })

    const row = templates.find((t) => t.id === 'service:session:_')
    expect(row?.name).toBe('Coaching-Session')
    expect(row?.price_rappen).toBe(18000)
  })
})

describe('filter and group templates', () => {
  it('filters by name and groups by section', () => {
    const templates = buildInvoiceLineTemplates({
      terms,
      categories: [{ id: 1, code: 'B', name: 'Kat. B', is_active: true }],
      pricingRules: [
        { category_code: 'B', rule_type: 'base_price', price_per_minute_rappen: 200, base_duration_minutes: 45 },
      ],
      eventTypes: [{ code: 'lesson', default_duration_minutes: 45 }],
      products: [{ id: 'p1', name: 'Lernfahrausweis', price_rappen: 5500 }],
    })

    expect(filterInvoiceLineTemplates(templates, 'fahrstunde').map((t) => t.kind)).toEqual(['service'])
    expect(filterInvoiceLineTemplates(templates, 'lernfahrausweis').map((t) => t.kind)).toEqual(['product'])
    expect(groupInvoiceLineTemplates(templates).map((g) => g.label)).toEqual(['Dienstleistungen', 'Produkte'])
    expect(filterInvoiceLineTemplates([
      ...templates,
      { id: 'course-type:1', kind: 'course', group: 'Kurse', name: 'Verkehrskunde', price_rappen: 19000 },
    ], '', 16).map((t) => t.group)).toEqual(['Dienstleistungen', 'Kurse', 'Produkte'])
  })
})
