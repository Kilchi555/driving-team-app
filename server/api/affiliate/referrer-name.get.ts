/**
 * GET /api/affiliate/referrer-name
 * Returns only the first name of the affiliate for personalised landing page copy.
 * Intentionally minimal — no last name or contact info exposed.
 */

import { defineEventHandler, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { slug, ref } = getQuery(event)
  if (!slug || !ref) return { firstName: null }

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', String(slug))
    .single()

  if (!tenant) return { firstName: null }

  const { data: affiliateCode } = await supabase
    .from('affiliate_codes')
    .select('user_id')
    .eq('tenant_id', tenant.id)
    .eq('code', String(ref).trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle()

  if (!affiliateCode) return { firstName: null }

  const { data: user } = await supabase
    .from('users')
    .select('first_name')
    .eq('id', affiliateCode.user_id)
    .single()

  return { firstName: user?.first_name ?? null }
})
