import { describe, expect, it } from 'vitest'
import { bindPublicSlotOfferIdentity } from '../resolve-booking-offer-identity'

const TENANT = 'tenant-a'

type EventTypeRow = {
  tenant_id: string
  code: string
  is_active?: boolean
  public_bookable?: boolean
  require_payment?: boolean
}

function createBindSupabase(eventTypes: EventTypeRow[]) {
  const rows = eventTypes.map((et) => ({
    is_active: true,
    public_bookable: true,
    require_payment: true,
    ...et,
  }))

  return {
    from(table: string) {
      let current = table === 'event_types' ? [...rows] : []
      const chain = {
        select: () => chain,
        eq(col: string, val: unknown) {
          current = current.filter((r) => r[col] === val)
          return chain
        },
        maybeSingle: async () => ({ data: current[0] ?? null, error: null }),
        single: async () => ({
          data: current[0] ?? null,
          error: current[0] ? null : { message: 'not found' },
        }),
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve({ data: current, error: null }).then(resolve, reject)
        },
      }
      return chain
    },
  }
}

const fsTypes: EventTypeRow[] = [
  { tenant_id: TENANT, code: 'lesson', public_bookable: true, require_payment: true },
  { tenant_id: TENANT, code: 'exam', public_bookable: false, require_payment: true },
  { tenant_id: TENANT, code: 'consulting', public_bookable: true, require_payment: false },
  { tenant_id: TENANT, code: 'internal_consulting', public_bookable: false, require_payment: false },
]

describe('bindPublicSlotOfferIdentity', () => {
  it('Attack 1: reserved B lesson slot rejects consulting + B', async () => {
    const supabase = createBindSupabase(fsTypes)
    await expect(bindPublicSlotOfferIdentity(supabase, {
      tenantId: TENANT,
      slotCategoryCode: 'B',
      clientEventTypeCode: 'consulting',
      clientCategoryCode: 'B',
      clientAppointmentType: 'consulting',
    })).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'CATEGORY_SLOT_MISMATCH' },
    })
  })

  it('Attack 2: free consulting cannot attach to a paid B lesson slot', async () => {
    const supabase = createBindSupabase(fsTypes)
    await expect(bindPublicSlotOfferIdentity(supabase, {
      tenantId: TENANT,
      slotCategoryCode: 'B',
      clientEventTypeCode: 'consulting',
      clientCategoryCode: 'B',
    })).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'CATEGORY_SLOT_MISMATCH' },
    })
  })

  it('Attack 5: honest B + lesson is accepted and returns the slot identity', async () => {
    const supabase = createBindSupabase(fsTypes)
    await expect(bindPublicSlotOfferIdentity(supabase, {
      tenantId: TENANT,
      slotCategoryCode: 'B',
      clientEventTypeCode: 'lesson',
      clientCategoryCode: 'B',
      clientAppointmentType: 'lesson',
    })).resolves.toMatchObject({
      eventTypeCode: 'lesson',
      categoryCode: 'B',
      inferredFrom: 'slot_category_lesson',
    })
  })

  it('Attack 4: matching a non-public event-type slot is rejected', async () => {
    const supabase = createBindSupabase(fsTypes)
    await expect(bindPublicSlotOfferIdentity(supabase, {
      tenantId: TENANT,
      slotCategoryCode: 'internal_consulting',
      clientEventTypeCode: 'internal_consulting',
      clientCategoryCode: null,
    })).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'EVENT_TYPE_NOT_PUBLIC' },
    })
  })

  it('does not invent a public booking when the tenant has no lesson type', async () => {
    const supabase = createBindSupabase([
      { tenant_id: TENANT, code: 'consulting', public_bookable: true },
    ])
    await expect(bindPublicSlotOfferIdentity(supabase, {
      tenantId: TENANT,
      slotCategoryCode: 'B',
      clientEventTypeCode: 'consulting',
      clientCategoryCode: 'B',
    })).rejects.toMatchObject({
      statusCode: 400,
      data: { code: 'EVENT_TYPE_UNRESOLVED' },
    })
  })
})
