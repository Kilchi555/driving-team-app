import { describe, expect, it } from 'vitest'
import {
  quoteStaffResourceSurcharge,
  roomSurchargeFromRow,
  vehicleSurchargeFromRow,
} from '../quote-staff-resource-surcharge'

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'
const VEHICLE = 'vehicle-1'
const ROOM = 'room-1'

function resourceSupabase(opts: {
  vehicles?: Record<string, unknown>[]
  rooms?: Record<string, unknown>[]
}) {
  const vehicles = opts.vehicles || []
  const rooms = opts.rooms || []
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const chain = {
        select: () => chain,
        eq(col: string, val: unknown) {
          filters[col] = val
          return chain
        },
        maybeSingle: async () => {
          const rows = table === 'vehicles' ? vehicles : table === 'rooms' ? rooms : []
          const data = rows.find((r) =>
            r.id === filters.id && r.tenant_id === filters.tenant_id
          ) || null
          return { data, error: null }
        },
      }
      return chain
    },
  }
}

describe('vehicleSurchargeFromRow', () => {
  it('1. no row is 0', () => {
    expect(vehicleSurchargeFromRow(null, 45)).toBe(0)
  })

  it('2. object lesson tier wins over hourly', () => {
    expect(vehicleSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: 10000,
      pricing_tiers: { lesson: 3500 },
    }, 45)).toBe(3500)
  })

  it('3. array lesson tier wins over hourly', () => {
    expect(vehicleSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: 10000,
      pricing_tiers: [
        { type: 'hourly', enabled: true, rate_rappen: 10000 },
        { type: 'lesson', enabled: true, rate_rappen: 4200 },
      ],
    }, 45)).toBe(4200)
  })

  it('4. hourly 10000 / 45 min is 7500', () => {
    expect(vehicleSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: 10000,
      pricing_tiers: [],
    }, 45)).toBe(7500)
  })

  it('disabled or invalid array lesson falls through to hourly', () => {
    expect(vehicleSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: 10000,
      pricing_tiers: [{ type: 'lesson', enabled: false, rate_rappen: 9999 }],
    }, 45)).toBe(7500)
  })

  it('14. inactive vehicle is 0', () => {
    expect(vehicleSurchargeFromRow({
      is_active: false,
      hourly_rate_rappen: 10000,
      pricing_tiers: { lesson: 3500 },
    }, 45)).toBe(0)
  })

  it('negative / NaN rates are 0', () => {
    expect(vehicleSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: -100,
      pricing_tiers: { lesson: -5 },
    }, 45)).toBe(0)
  })
})

describe('roomSurchargeFromRow', () => {
  it('5. hourly 10000 / 45 min is 7500', () => {
    expect(roomSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: 10000,
      pricing_tiers: { lesson: 9999 },
    }, 45)).toBe(7500)
  })

  it('6. room pricing_tiers.lesson is ignored', () => {
    expect(roomSurchargeFromRow({
      is_active: true,
      hourly_rate_rappen: 0,
      pricing_tiers: { lesson: 5000 },
    }, 45)).toBe(0)
  })

  it('15. inactive room is 0', () => {
    expect(roomSurchargeFromRow({
      is_active: false,
      hourly_rate_rappen: 10000,
    }, 45)).toBe(0)
  })
})

describe('quoteStaffResourceSurcharge', () => {
  it('1. no vehicle/room is 0', async () => {
    const quote = await quoteStaffResourceSurcharge(resourceSupabase({}), {
      tenantId: TENANT,
      durationMinutes: 45,
    })
    expect(quote).toEqual({ vehicleRappen: 0, roomRappen: 0, totalRappen: 0 })
  })

  it('7. vehicle + room sum', async () => {
    const quote = await quoteStaffResourceSurcharge(resourceSupabase({
      vehicles: [{
        id: VEHICLE,
        tenant_id: TENANT,
        is_active: true,
        hourly_rate_rappen: 10000,
        pricing_tiers: [],
      }],
      rooms: [{
        id: ROOM,
        tenant_id: TENANT,
        is_active: true,
        hourly_rate_rappen: 10000,
      }],
    }), {
      tenantId: TENANT,
      vehicleId: VEHICLE,
      roomId: ROOM,
      durationMinutes: 45,
    })
    expect(quote.vehicleRappen).toBe(7500)
    expect(quote.roomRappen).toBe(7500)
    expect(quote.totalRappen).toBe(15000)
  })

  it('12. foreign vehicle tenant is 0', async () => {
    const quote = await quoteStaffResourceSurcharge(resourceSupabase({
      vehicles: [{
        id: VEHICLE,
        tenant_id: OTHER,
        is_active: true,
        hourly_rate_rappen: 10000,
        pricing_tiers: { lesson: 8800 },
      }],
    }), {
      tenantId: TENANT,
      vehicleId: VEHICLE,
      durationMinutes: 45,
    })
    expect(quote.totalRappen).toBe(0)
  })

  it('13. foreign room tenant is 0', async () => {
    const quote = await quoteStaffResourceSurcharge(resourceSupabase({
      rooms: [{
        id: ROOM,
        tenant_id: OTHER,
        is_active: true,
        hourly_rate_rappen: 10000,
      }],
    }), {
      tenantId: TENANT,
      roomId: ROOM,
      durationMinutes: 45,
    })
    expect(quote.totalRappen).toBe(0)
  })

  it('18. hourly scales with duration 45 → 90', async () => {
    const supabase = resourceSupabase({
      vehicles: [{
        id: VEHICLE,
        tenant_id: TENANT,
        is_active: true,
        hourly_rate_rappen: 10000,
        pricing_tiers: [],
      }],
    })
    const fortyFive = await quoteStaffResourceSurcharge(supabase, {
      tenantId: TENANT,
      vehicleId: VEHICLE,
      durationMinutes: 45,
    })
    const ninety = await quoteStaffResourceSurcharge(supabase, {
      tenantId: TENANT,
      vehicleId: VEHICLE,
      durationMinutes: 90,
    })
    expect(fortyFive.totalRappen).toBe(7500)
    expect(ninety.totalRappen).toBe(15000)
  })

  it('lesson pauschale does not scale with duration', async () => {
    const supabase = resourceSupabase({
      vehicles: [{
        id: VEHICLE,
        tenant_id: TENANT,
        is_active: true,
        hourly_rate_rappen: 10000,
        pricing_tiers: [{ type: 'lesson', enabled: true, rate_rappen: 4200 }],
      }],
    })
    const fortyFive = await quoteStaffResourceSurcharge(supabase, {
      tenantId: TENANT,
      vehicleId: VEHICLE,
      durationMinutes: 45,
    })
    const ninety = await quoteStaffResourceSurcharge(supabase, {
      tenantId: TENANT,
      vehicleId: VEHICLE,
      durationMinutes: 90,
    })
    expect(fortyFive.totalRappen).toBe(4200)
    expect(ninety.totalRappen).toBe(4200)
  })
})
