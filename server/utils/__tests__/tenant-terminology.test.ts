/**
 * Unit tests for branch terminology used in emails / SMS.
 * Run: npx vitest run server/utils/__tests__/tenant-terminology.test.ts
 */

import { describe, expect, it, vi } from 'vitest'
import {
  getTerminologyDefaults,
  mergeTerminology,
} from '../../../composables/useTerminology'
import {
  getTenantTerminology,
  terminologyFromTenant,
} from '../tenant-terminology'
import { generateAppointmentDeletedEmail } from '../email'

describe('getTerminologyDefaults', () => {
  it('returns driving_school for null/undefined/unknown', () => {
    expect(getTerminologyDefaults(null).staff).toBe('Fahrlehrer')
    expect(getTerminologyDefaults(undefined).appointment).toBe('Fahrstunde')
    expect(getTerminologyDefaults('unknown_type').businessNoun).toBe('Fahrschule')
  })

  it('returns consulting labels', () => {
    const t = getTerminologyDefaults('consulting')
    expect(t.staff).toBe('Berater')
    expect(t.appointment).toBe('Beratung')
    expect(t.appointmentsPlural).toBe('Beratungen')
    expect(t.businessNoun).toBe('Consulting-Unternehmen')
  })

  it('returns mental_coach labels', () => {
    const t = getTerminologyDefaults('mental_coach')
    expect(t.staff).toBe('Coach')
    expect(t.appointment).toBe('Sitzung')
    expect(t.businessNoun).toBe('Coaching-Praxis')
  })
})

describe('mergeTerminology', () => {
  it('returns code defaults when ui_labels is null', () => {
    const t = mergeTerminology('consulting', null)
    expect(t.staff).toBe('Berater')
    expect(t.appointment).toBe('Beratung')
    expect(t.businessNoun).toBe('Consulting-Unternehmen')
  })

  it('returns driving_school defaults without override', () => {
    const t = mergeTerminology('driving_school', null)
    expect(t.staff).toBe('Fahrlehrer')
    expect(t.appointment).toBe('Fahrstunde')
    expect(t.client).toBe('Schüler')
  })

  it('merges DB ui_labels over defaults', () => {
    const t = mergeTerminology('driving_school', { client: 'Benutzer' })
    expect(t.client).toBe('Benutzer')
    expect(t.staff).toBe('Fahrlehrer')
    expect(t.appointment).toBe('Fahrstunde')
  })

  it('ignores empty / non-string ui_labels values', () => {
    const t = mergeTerminology('consulting', {
      staff: '  ',
      appointment: 'Session',
      // @ts-expect-error intentional bad shape
      client: 42,
    })
    expect(t.staff).toBe('Berater')
    expect(t.appointment).toBe('Session')
    expect(t.client).toBe('Kunde')
  })
})

describe('terminologyFromTenant', () => {
  it('resolves mental_coach without live tenant', () => {
    const t = terminologyFromTenant({ business_type: 'mental_coach' })
    expect(t.staff).toBe('Coach')
    expect(t.appointment).toBe('Sitzung')
  })

  it('applies ui_labels when present', () => {
    const t = terminologyFromTenant({
      business_type: 'consulting',
      ui_labels: { staff: 'Senior Berater' },
    })
    expect(t.staff).toBe('Senior Berater')
    expect(t.appointment).toBe('Beratung')
  })

  it('falls back to driving_school for null tenant', () => {
    expect(terminologyFromTenant(null).businessNoun).toBe('Fahrschule')
  })
})

describe('getTenantTerminology', () => {
  function mockSupabase(opts: {
    businessType?: string | null
    uiLabels?: Record<string, string> | null
    throwOnTenant?: boolean
  }) {
    const from = vi.fn((table: string) => {
      if (opts.throwOnTenant && table === 'tenants') {
        throw new Error('db down')
      }
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => {
          if (table === 'tenants') {
            return { data: opts.businessType === undefined ? null : { business_type: opts.businessType } }
          }
          if (table === 'business_type_presets') {
            return { data: opts.uiLabels ? { ui_labels: opts.uiLabels } : null }
          }
          return { data: null }
        },
      }
      return chain
    })
    return { from }
  }

  it('returns driving_school when tenantId missing', async () => {
    const t = await getTenantTerminology({ from: vi.fn() }, null)
    expect(t.staff).toBe('Fahrlehrer')
  })

  it('loads business_type + preset ui_labels', async () => {
    const supabase = mockSupabase({
      businessType: 'driving_school',
      uiLabels: { client: 'Benutzer', staff: 'Fahrlehrer' },
    })
    const t = await getTenantTerminology(supabase, 'tenant-1')
    expect(t.client).toBe('Benutzer')
    expect(t.staff).toBe('Fahrlehrer')
    expect(t.appointment).toBe('Fahrstunde')
  })

  it('returns consulting defaults when preset missing', async () => {
    const supabase = mockSupabase({ businessType: 'consulting', uiLabels: null })
    const t = await getTenantTerminology(supabase, 'tenant-2')
    expect(t.staff).toBe('Berater')
    expect(t.appointmentsPlural).toBe('Beratungen')
  })

  it('falls back on error', async () => {
    const supabase = mockSupabase({ throwOnTenant: true })
    const t = await getTenantTerminology(supabase, 'tenant-x')
    expect(t.businessNoun).toBe('Fahrschule')
  })
})

describe('email keyword checklist (deletion template)', () => {
  const base = {
    customerName: 'Pascal Test',
    appointmentDate: '01.08.2026',
    appointmentTime: '10:00',
    staffName: 'Max Muster',
    reason: 'Test',
    tenantName: 'Acme',
  }

  it('driving_school uses Fahrlehrer label', () => {
    const ds = getTerminologyDefaults('driving_school')
    const html = generateAppointmentDeletedEmail({ ...base, staffLabel: ds.staff })
    expect(html).toContain('Fahrlehrer')
    expect(html).not.toContain('>Berater<')
  })

  it('consulting uses Berater label and avoids Fahrlehrer', () => {
    const c = getTerminologyDefaults('consulting')
    const html = generateAppointmentDeletedEmail({ ...base, staffLabel: c.staff })
    expect(html).toContain('Berater')
    expect(html).not.toContain('Fahrlehrer')
  })
})

describe('progressLabel', () => {
  it('driving_school uses Fortschritt, consulting uses Verlauf', () => {
    expect(getTerminologyDefaults('driving_school').progressLabel).toBe('Fortschritt')
    expect(getTerminologyDefaults('consulting').progressLabel).toBe('Verlauf')
    expect(getTerminologyDefaults('tutoring').progressLabel).toBe('Fortschritt')
  })
})

describe('onboarding / payment copy fragments', () => {
  it('builds branch-aware onboarding fallback line', () => {
    const ds = getTerminologyDefaults('driving_school')
    const consulting = getTerminologyDefaults('consulting')
    expect(`Bitte deine ${ds.businessNoun} um einen neuen Link.`).toContain('Fahrschule')
    expect(`Bitte deine ${consulting.businessNoun} um einen neuen Link.`).toContain('Consulting-Unternehmen')
    expect(`Bitte deine ${consulting.businessNoun} um einen neuen Link.`).not.toContain('Fahrschule')
  })

  it('builds branch-aware payment intro plural', () => {
    const ds = getTerminologyDefaults('driving_school')
    const consulting = getTerminologyDefaults('consulting')
    expect(`für folgende ${ds.appointmentsPlural}`).toBe('für folgende Fahrstunden')
    expect(`für folgende ${consulting.appointmentsPlural}`).toBe('für folgende Beratungen')
  })
})

describe('eventTypeLabelMap / appointmentCountLabel', () => {
  it('maps lesson to appointment term', async () => {
    const { eventTypeLabelMap, appointmentCountLabel } = await import('../tenant-terminology')
    const consulting = getTerminologyDefaults('consulting')
    expect(eventTypeLabelMap(consulting).lesson).toBe('Beratung')
    expect(eventTypeLabelMap(null).lesson).toBe('Fahrstunde')
    expect(eventTypeLabelMap(consulting).theory).toBe('Theorieunterricht')
    expect(eventTypeLabelMap(null, { detailedExam: true }).exam).toBe('Prüfungsfahrt inkl. WarmUp und Rückfahrt')
    expect(appointmentCountLabel(consulting, 1)).toBe('1 Beratung')
    expect(appointmentCountLabel(consulting, 3)).toBe('3 Beratungen')
    expect(appointmentCountLabel(undefined, 2)).toBe('2 Fahrstunden')
  })

  it('resolveEventTypeLabel handles fuzzy codes and db names', async () => {
    const { resolveEventTypeLabel } = await import('../tenant-terminology')
    const consulting = getTerminologyDefaults('consulting')
    expect(resolveEventTypeLabel('theory', consulting)).toBe('Theorieunterricht')
    expect(resolveEventTypeLabel('theoriestunde', consulting)).toBe('Theorieunterricht')
    expect(resolveEventTypeLabel('exam', consulting, { dbName: 'Assessment' })).toBe('Assessment')
    expect(resolveEventTypeLabel(null, consulting)).toBe('Beratung')
  })
})
