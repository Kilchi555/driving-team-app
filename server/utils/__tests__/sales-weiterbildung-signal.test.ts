import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildWeiterbildungSignal, loadSalesWeiterbildungSignal, WEITERBILDUNG_DETAIL, type WeiterbildungCandidate } from '../sales-weiterbildung-signal'

const FORBIDDEN = /weiterbildungskunde|letzter kurs|hat weiterbildung|weiterbildung absolviert|absolviert|teilgenommen|abgeschlossen|bezahlt|nie bei uns|noch nie|neverAttended/i

function row(overrides: WeiterbildungCandidate = {}): WeiterbildungCandidate {
  return {
    id: 'reg-1',
    email: 'info@beispiel-fahrschule.ch',
    phone: '079 111 22 33',
    status: 'confirmed',
    deletedAt: null,
    categoryCode: 'Fahrlehrer',
    courseId: 'course-1',
    courseName: 'Fahrlehrerweiterbildung Motorboot',
    courseStartDate: '2026-05-28T00:00:00Z',
    registrationDate: '2026-04-10T00:00:00Z',
    kind: 'registration',
    ...overrides,
  }
}

function textOf(signal: ReturnType<typeof buildWeiterbildungSignal>): string {
  return JSON.stringify(signal)
}

describe('Fahrlehrer Weiterbildung registration signal', () => {
  it('shows a registration for an exact email match', () => {
    const signal = buildWeiterbildungSignal(
      { email: ' Info@Beispiel-Fahrschule.ch ', name: 'Andere Person', organizationDomain: 'other.ch' } as never,
      [row()],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.registrationStatus).toBe('confirmed')
    expect(signal.registrationYear).toBe(2026)
    expect(signal.courseName).toBe('Fahrlehrerweiterbildung Motorboot')
    expect(signal.courseStartDate).toBe('2026-05-28')
    expect(signal.title).toBe('Fahrlehrerweiterbildung-Anmeldung 2026')
    expect(signal.detail).toBe(WEITERBILDUNG_DETAIL)
    expect(textOf(signal)).not.toMatch(FORBIDDEN)
  })

  it('shows a registration for a normalized phone match when email does not match', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'other@example.ch', phone: '+41 79 111 22 33' },
      [row({ email: 'someone-else@example.com' })],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.detail).toBe('Registrierung vorhanden · Teilnahme nicht bestätigt')
    expect(textOf(signal)).not.toMatch(FORBIDDEN)
  })

  it('does not match on name alone', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'other@example.ch', phone: '0790000000' },
      [row({ email: 'reg@example.com', phone: '0781112233', name: 'Gleiche Person' } as WeiterbildungCandidate)],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('does not match on domain alone', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch' },
      [row({ email: 'sekretariat@beispiel-fahrschule.ch' })],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('does not treat a waitlist row as a registration', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch' },
      [row({ kind: 'waitlist' })],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('ignores a deleted registration', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch' },
      [row({ deletedAt: '2026-05-01T00:00:00Z' })],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('ignores another course category', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch' },
      [row({ categoryCode: 'VKU', courseName: 'Verkehrskunde' })],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('ignores a registration that is not confirmed', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch' },
      [row({ status: 'pending' })],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('returns no negative never-attended claim when nothing matches', () => {
    const signal = buildWeiterbildungSignal({ email: 'nobody@example.ch' }, [row()])
    expect(signal).toEqual({ hasRegistration: false })
    expect(textOf(signal)).not.toMatch(FORBIDDEN)
    expect(textOf(signal)).not.toContain('neverAttended')
  })

  it('summarizes several registrations once, newest course first, without claiming attendance', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch' },
      [
        row({ id: 'old', courseId: 'course-may', courseName: 'Motorboot Mai', courseStartDate: '2026-05-28' }),
        row({ id: 'new', courseId: 'course-july', courseName: 'Motorboot Juli', courseStartDate: '2026-07-02' }),
        row({ id: 'dup', courseId: 'course-july', courseName: 'Motorboot Juli', courseStartDate: '2026-07-02', registrationDate: '2026-04-20' }),
      ],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.registrationCount).toBe(3)
    expect(signal.title).toBe('3 Fahrlehrerweiterbildungen registriert')
    expect(signal.courses.map((course) => course.courseName)).toEqual(['Motorboot Juli', 'Motorboot Mai'])
    expect(signal.courses[0].label).toBe('Motorboot Juli · 02.07.2026')
    expect(signal.detail).toBe(WEITERBILDUNG_DETAIL)
    expect(textOf(signal)).not.toMatch(FORBIDDEN)
  })

  it('A: exact email match shows the registration', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'a@example.com' },
      [row({ email: 'a@example.com', phone: '0791000001', courseName: 'Kurs A' })],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.courseName).toBe('Kurs A')
  })

  it('B: email hit ignores an ambiguous shared phone on another registration', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'a@example.com', phone: '0792000002' },
      [
        row({ id: 'reg-a', email: 'a@example.com', phone: '0792000002', courseId: 'course-a', courseName: 'Kurs A' }),
        row({ id: 'reg-b', email: 'b@example.com', phone: '0792000002', courseId: 'course-b', courseName: 'Kurs B' }),
      ],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.registrationCount).toBe(1)
    expect(signal.courses.map((course) => course.courseName)).toEqual(['Kurs A'])
  })

  it('C: unique phone fallback keeps several registrations of the same email', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'no-match@example.com', phone: '+41 79 300 00 03' },
      [
        row({ id: 'one', email: 'A@Example.com', phone: '0793000003', courseId: 'course-old', courseName: 'Kurs alt', courseStartDate: '2026-05-28' }),
        row({ id: 'two', email: 'a@example.com', phone: '079 300 00 03', courseId: 'course-new', courseName: 'Kurs neu', courseStartDate: '2026-07-02' }),
      ],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.registrationCount).toBe(2)
    expect(signal.courses.map((course) => course.courseName)).toEqual(['Kurs neu', 'Kurs alt'])
  })

  it('D: discards a phone shared by two registration emails', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'no-match@example.com', phone: '0794000004' },
      [
        row({ id: 'a', email: 'a@example.com', phone: '0794000004', courseId: 'a' }),
        row({ id: 'b', email: 'b@example.com', phone: '0794000004', courseId: 'b' }),
      ],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('E: discards a phone shared by four different registration identities', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'no-match@example.com', phone: '0795000005' },
      ['a', 'b', 'c', 'd'].map((name) => row({
        id: name,
        email: `${name}@example.com`,
        phone: '0041 79 500 00 05',
        courseId: `course-${name}`,
        courseName: `Kurs ${name}`,
      })),
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('F: an ambiguous additional phone does not create a signal', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'no-match@example.com', phone: '0796000006', additional_phones: ['0797000007'] },
      [
        row({ id: 'a', email: 'a@example.com', phone: '0797000007', courseId: 'a' }),
        row({ id: 'b', email: 'b@example.com', phone: '0797000007', courseId: 'b' }),
      ],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('G: a unique additional phone can create the fallback signal', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'no-match@example.com', phone: '0798000008', additional_phones: ['+41 79 900 00 09'] },
      [row({ email: 'a@example.com', phone: '0799000009', courseName: 'Kurs aus Zusatznummer' })],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.courseName).toBe('Kurs aus Zusatznummer')
    expect(signal.registrationCount).toBe(1)
  })

  it('discards a phone when one of its registrations has no email', () => {
    const signal = buildWeiterbildungSignal(
      { email: '', phone: '0791110000' },
      [
        row({ id: 'anchored', email: 'a@example.com', phone: '0791110000' }),
        row({ id: 'blank', email: '  ', phone: '0791110000', courseId: 'blank' }),
      ],
    )
    expect(signal).toEqual({ hasRegistration: false })
  })

  it('prefers email matches over a shared phone on other registrations', () => {
    const signal = buildWeiterbildungSignal(
      { email: 'info@beispiel-fahrschule.ch', phone: '079 111 22 33' },
      [
        row({ id: 'email-hit', email: 'info@beispiel-fahrschule.ch', phone: '0780000000', courseName: 'Eigener Kurs' }),
        row({ id: 'phone-hit', email: 'other@example.com', phone: '+41 79 111 22 33', courseId: 'other', courseName: 'Fremder Kurs' }),
      ],
    )
    expect(signal.hasRegistration).toBe(true)
    if (!signal.hasRegistration) return
    expect(signal.registrationCount).toBe(1)
    expect(signal.courseName).toBe('Eigener Kurs')
  })

  it('keeps the sales detail contract and superadmin gate', () => {
    const detailApi = readFileSync(new URL('../../api/tenant-admin/sales/[id].get.ts', import.meta.url), 'utf8')
    const detailPage = readFileSync(new URL('../../../pages/tenant-admin/sales/[id].vue', import.meta.url), 'utf8')
    const contact = readFileSync(new URL('../../api/tenant-admin/sales/[id]/contact.post.ts', import.meta.url), 'utf8')
    expect(detailApi.indexOf('requireSuperAdmin')).toBeGreaterThan(-1)
    expect(detailApi.indexOf('requireSuperAdmin')).toBeLessThan(detailApi.indexOf('loadSalesWeiterbildungSignal'))
    expect(detailPage).toContain('runSalesContactSave')
    expect(detailPage).toContain('initialNextAction')
    expect(detailPage).toContain('additional_phones')
    expect(detailPage).toContain('Frühere Weiterbildung')
    expect(detailPage).not.toMatch(FORBIDDEN)
    expect(contact).toContain('requireSuperAdmin')
    expect(contact).toContain('if (!prospect.eligible)')
    expect(contact).toContain('resolveStoredFollowUp')
  })
})

describe('Fahrlehrer Weiterbildung lookup', () => {
  function client(tables: Record<string, unknown[]>) {
    const calls: { table: string; eq: Array<[string, unknown]>; is: Array<[string, unknown]> }[] = []
    return {
      calls,
      from(table: string) {
        const call = { table, eq: [] as Array<[string, unknown]>, is: [] as Array<[string, unknown]> }
        calls.push(call)
        const builder = {
          select() { return builder },
          eq(column: string, value: unknown) {
            call.eq.push([column, value])
            return builder
          },
          in() { return builder },
          is(column: string, value: unknown) {
            call.is.push([column, value])
            return builder
          },
          then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
            return Promise.resolve(resolve({ data: tables[table] || [], error: null }))
          },
        }
        return builder
      },
    }
  }

  it('queries only confirmed, non-deleted Fahrlehrer registrations', async () => {
    const supabase = client({
      course_categories: [{ id: 'cat-fl' }],
      courses: [{ id: 'course-1', name: 'Motorboot', course_start_date: '2026-07-02' }],
      course_registrations: [{
        id: 'reg-1',
        email: 'info@beispiel-fahrschule.ch',
        phone: null,
        status: 'confirmed',
        deleted_at: null,
        registration_date: '2026-04-12',
        course_id: 'course-1',
      }],
    })
    const signal = await loadSalesWeiterbildungSignal({ email: 'info@beispiel-fahrschule.ch' }, supabase as never)
    expect(signal.hasRegistration).toBe(true)
    expect(supabase.calls.find((call) => call.table === 'course_categories')?.eq).toEqual([['code', 'Fahrlehrer']])
    expect(supabase.calls.find((call) => call.table === 'course_registrations')?.eq).toEqual([['status', 'confirmed']])
    expect(supabase.calls.find((call) => call.table === 'course_registrations')?.is).toEqual([['deleted_at', null]])
  })

  it('does not scan registrations when the prospect has no email or phone', async () => {
    const supabase = client({})
    const signal = await loadSalesWeiterbildungSignal({ email: '  ', phone: '' }, supabase as never)
    expect(signal).toEqual({ hasRegistration: false })
    expect(supabase.calls).toEqual([])
  })
})
