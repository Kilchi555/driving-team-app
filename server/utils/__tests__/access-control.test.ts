import { describe, expect, it } from 'vitest'
import { canAccessUserDocument } from '../access-control'

const tenantA = 'tenant-a'
const tenantB = 'tenant-b'
const staffA = { id: 'staff-a', role: 'staff', tenant_id: tenantA }
const clientA = { id: 'client-a', role: 'client', tenant_id: tenantA }
const clientB = { id: 'client-b', role: 'client', tenant_id: tenantA }

describe('canAccessUserDocument', () => {
  it('blocks customer A from signing customer B documents and allows staff in-tenant', () => {
    expect(canAccessUserDocument({
      callerId: clientA.id,
      callerRole: clientA.role,
      callerTenantId: tenantA,
      owner: { id: clientB.id, tenant_id: tenantA },
      pathBelongsToOwner: true,
    }).allow).toBe(false)

    expect(canAccessUserDocument({
      callerId: staffA.id,
      callerRole: staffA.role,
      callerTenantId: tenantA,
      owner: { id: clientA.id, tenant_id: tenantA },
      pathBelongsToOwner: true,
    }).allow).toBe(true)

    expect(canAccessUserDocument({
      callerId: staffA.id,
      callerRole: staffA.role,
      callerTenantId: tenantA,
      owner: { id: clientA.id, tenant_id: tenantB },
      pathBelongsToOwner: true,
    }).allow).toBe(false)

    expect(canAccessUserDocument({
      callerId: clientA.id,
      callerRole: clientA.role,
      callerTenantId: tenantA,
      owner: { id: clientA.id, tenant_id: tenantA },
      pathBelongsToOwner: false,
    }).allow).toBe(false)
  })
})
