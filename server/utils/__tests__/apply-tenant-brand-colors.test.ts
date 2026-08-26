import { describe, expect, it } from 'vitest'
import { applyTenantBrandColors, shouldSyncEventTypeColor } from '../apply-tenant-brand-colors'

describe('shouldSyncEventTypeColor', () => {
  it('syncs Simy template colors', () => {
    expect(shouldSyncEventTypeColor('#6366f1')).toBe(true)
    expect(shouldSyncEventTypeColor('#0EA5E9')).toBe(true)
  })

  it('syncs the previous tenant palette so a new logo replaces the last brand colors', () => {
    expect(shouldSyncEventTypeColor('#3D4A64', '#3D4A64')).toBe(true)
    expect(shouldSyncEventTypeColor('#C9D1D4', ['#3D4A64', '#C9D1D4', '#ECF1FA'])).toBe(true)
  })

  it('keeps a custom event-type color', () => {
    expect(shouldSyncEventTypeColor('#C45A12', ['#3D4A64', '#C9D1D4'])).toBe(false)
  })
})

function mockSupabase(opts: {
  previousPrimary?: string | null
  previousSecondary?: string | null
  eventTypes: Array<{ id: string; default_color: string }>
}) {
  const calls: Array<{ table: string; op: string; payload?: Record<string, unknown>; ids?: string[] }> = []
  return {
    calls,
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          return {
            eq: async () => {
              calls.push({ table, op: 'update', payload })
              return { error: null }
            },
            in: async (_col: string, ids: string[]) => {
              calls.push({ table, op: 'update', payload, ids })
              return { error: null }
            },
          }
        },
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: {
                    primary_color: opts.previousPrimary ?? null,
                    secondary_color: opts.previousSecondary ?? null,
                    accent_color: null,
                  },
                }),
                then(resolve: (value: { data: typeof opts.eventTypes }) => unknown) {
                  return Promise.resolve(resolve({ data: opts.eventTypes }))
                },
              }
            },
          }
        },
      }
    },
  }
}

describe('applyTenantBrandColors', () => {
  it('writes tenant + website colors and stock or previous event types', async () => {
    const supabase = mockSupabase({
      previousPrimary: '#3D4A64',
      previousSecondary: '#C9D1D4',
      eventTypes: [
        { id: 'stock', default_color: '#6366f1' },
        { id: 'old-brand', default_color: '#3D4A64' },
        { id: 'old-secondary', default_color: '#C9D1D4' },
        { id: 'custom', default_color: '#C45A12' },
      ],
    })

    await applyTenantBrandColors(supabase, 'tenant-1', {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    })

    const tenantUpdate = supabase.calls.find((c) => c.table === 'tenants')
    expect(tenantUpdate?.payload.primary_color).toBe('#112233')

    const websiteUpdate = supabase.calls.find((c) => c.table === 'website_tenants')
    expect(websiteUpdate?.payload.primary_color).toBe('#112233')

    const eventUpdate = supabase.calls.find((c) => c.table === 'event_types')
    expect(eventUpdate?.ids).toEqual(['stock', 'old-brand', 'old-secondary'])
    expect(eventUpdate?.payload.default_color).toBe('#112233')
  })
})
