/**
 * GET /api/admin/resources/rooms
 * Returns rooms for the current tenant + public rooms from other tenants.
 */
import { defineEventHandler, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const { include_public } = getQuery(event) as { include_public?: string }

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('rooms')
    .select('id, tenant_id, name, location, capacity, description, equipment, is_public, visibility, hourly_rate_rappen, pricing_tiers, is_active, created_at')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (include_public === 'true') {
    // Own rooms OR public rooms from other tenants
    query = query.or(`tenant_id.eq.${profile.tenant_id},is_public.eq.true`)
  } else {
    query = query.eq('tenant_id', profile.tenant_id)
  }

  const { data, error } = await query
  if (error) throw error

  return {
    success: true,
    rooms: (data || []).map((r: any) => ({
      ...r,
      hourly_rate_chf: (r.hourly_rate_rappen / 100).toFixed(2),
      pricing_tiers: r.pricing_tiers ?? [],
      visibility: r.visibility ?? (r.is_public ? 'public' : 'private'),
      is_own: r.tenant_id === profile.tenant_id,
    })),
  }
})
