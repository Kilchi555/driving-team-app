import { defineEventHandler } from 'h3'
import { requireAccountingAccess, findActiveAccountantGrant } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  if (!profile.is_accountant) {
    return {
      success: true,
      is_accountant: false,
      accountant_access: 'write',
      tenant_name: null,
      grants: [],
    }
  }
  const grants = await findActiveAccountantGrant({ userId: profile.id, email: profile.email })
  const tenantIds = [...new Set(grants.map(g => g.tenant_id))]
  const { data: tenants } = tenantIds.length
    ? await getSupabaseAdmin().from('tenants').select('id, name').in('id', tenantIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const names = new Map((tenants ?? []).map(t => [t.id, t.name]))
  return {
    success: true,
    is_accountant: true,
    accountant_access: profile.accountant_access,
    tenant_id: profile.tenant_id,
    tenant_name: names.get(profile.tenant_id) ?? null,
    grants: grants.map(g => ({
      tenant_id: g.tenant_id,
      tenant_name: names.get(g.tenant_id) ?? g.tenant_id,
      access: g.access,
    })),
  }
})
