import { describe, expect, it } from 'vitest'
import {
  isSchoolVehicleAvailable,
  resolveBookedVehicleOption,
  resolveSlotVehiclePolicy,
  type VehicleSettings,
} from '../vehicle-availability'

function mockSupabase({
  fleetCount,
  fleetError,
  blockedCount,
  blockedError,
}: {
  fleetCount?: number | null
  fleetError?: { message: string } | null
  blockedCount?: number | null
  blockedError?: { message: string } | null
}) {
  const resultFor = (table: string) => {
    if (table === 'vehicles') {
      return { count: fleetCount ?? 0, error: fleetError ?? null }
    }
    return { count: blockedCount ?? 0, error: blockedError ?? null }
  }

  const chain = (table: string): any => {
    const self: any = {
      select: () => self,
      eq: () => self,
      contains: () => self,
      neq: () => self,
      lt: () => self,
      gt: () => self,
      then: (resolve: (value: any) => unknown) => Promise.resolve(resultFor(table)).then(resolve),
    }
    return self
  }

  return {
    from: (table: string) => chain(table),
  }
}

const drivingTeamBAutomatik: VehicleSettings = {
  mode: 'options',
  options: [
    {
      key: 'school',
      label: 'Schulfahrzeug',
      cost_type: 'none',
      cost_rappen: 0,
      per_minute: false,
      is_default: true,
      requires_school_vehicle: true,
    },
    {
      key: 'own',
      label: 'Privates Auto',
      cost_type: 'discount',
      cost_rappen: 22.2222,
      per_minute: true,
      is_default: false,
      requires_school_vehicle: false,
    },
  ],
}

describe('resolveSlotVehiclePolicy', () => {
  it('uses the stored default (Schulfahrzeug) when the client sends no mode', () => {
    expect(resolveSlotVehiclePolicy(null, drivingTeamBAutomatik, 'B Automatik')).toEqual({
      requiresSchoolVehicle: true,
      enforceCapacity: false,
    })
  })

  it('ignores unknown vehicle_mode keys and falls back to the stored default', () => {
    expect(resolveSlotVehiclePolicy(null, drivingTeamBAutomatik, 'B Automatik', 'bypass-hard')).toEqual({
      requiresSchoolVehicle: true,
      enforceCapacity: false,
    })
  })

  it('honors a real own-car option and does not invent capacity from query-like flags', () => {
    expect(resolveSlotVehiclePolicy(null, drivingTeamBAutomatik, 'B Automatik', 'own')).toEqual({
      requiresSchoolVehicle: false,
      enforceCapacity: false,
    })
  })

  it('turns on hard capacity only when the stored option sets enforce_capacity', () => {
    const hard: VehicleSettings = {
      mode: 'options',
      options: [{
        ...drivingTeamBAutomatik.options![0],
        enforce_capacity: true,
      }],
    }
    expect(resolveSlotVehiclePolicy(null, hard, 'B Automatik', 'school')).toEqual({
      requiresSchoolVehicle: true,
      enforceCapacity: true,
    })
  })

  it('does not let enforce_capacity apply to an own-car option', () => {
    const mixed: VehicleSettings = {
      mode: 'options',
      options: [
        drivingTeamBAutomatik.options![0],
        { ...drivingTeamBAutomatik.options![1], enforce_capacity: true },
      ],
    }
    expect(resolveSlotVehiclePolicy(null, mixed, 'B Automatik', 'own').enforceCapacity).toBe(false)
  })
})

describe('resolveBookedVehicleOption', () => {
  it('returns the matching configured option', () => {
    expect(resolveBookedVehicleOption(drivingTeamBAutomatik, 'own')?.key).toBe('own')
  })

  it('falls back to the default when the key is missing', () => {
    expect(resolveBookedVehicleOption(drivingTeamBAutomatik, 'not-a-real-option')?.key).toBe('school')
  })
})

describe('isSchoolVehicleAvailable', () => {
  const args = {
    tenantId: '64259d68-195a-4c68-8875-f1b44d962830',
    locationId: 'wettswil',
    categoryCode: 'B Automatik',
    startTime: '2026-08-28T08:00:00Z',
    endTime: '2026-08-28T08:45:00Z',
  }

  it('keeps Driving Team slots bookable when Schulfahrzeug is default and the fleet is empty', async () => {
    await expect(isSchoolVehicleAvailable(mockSupabase({ fleetCount: 0 }), args)).resolves.toBe(true)
  })

  it('hides slots only when hard capacity is stored and the fleet is empty', async () => {
    await expect(
      isSchoolVehicleAvailable(mockSupabase({ fleetCount: 0 }), { ...args, enforceCapacity: true })
    ).resolves.toBe(false)
  })

  it('keeps slots bookable when the fleet query fails (soft default)', async () => {
    await expect(
      isSchoolVehicleAvailable(mockSupabase({ fleetError: { message: 'timeout' } }), args)
    ).resolves.toBe(true)
  })

  it('returns true when a fleet vehicle is free', async () => {
    await expect(
      isSchoolVehicleAvailable(mockSupabase({ fleetCount: 2, blockedCount: 1 }), args)
    ).resolves.toBe(true)
  })

  it('returns false when every matching school vehicle is booked', async () => {
    await expect(
      isSchoolVehicleAvailable(mockSupabase({ fleetCount: 1, blockedCount: 1 }), args)
    ).resolves.toBe(false)
  })
})
