import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { accountantAccessLabel } from '~/server/utils/accountant'

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token || '')
  if (!token || token.length < 16) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Einladungslink' })
  }
  const supabase = getSupabaseAdmin()
  const { data: grant } = await supabase
    .from('accountant_grants')
    .select('id, email, access, tenant_id, accepted_at, user_id')
    .eq('invite_token', token)
    .is('revoked_at', null)
    .maybeSingle()
  if (!grant) throw createError({ statusCode: 404, statusMessage: 'Einladung ungültig oder bereits verwendet' })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', grant.tenant_id)
    .single()

  return {
    success: true,
    email: grant.email,
    access_label: accountantAccessLabel(grant.access),
    tenant_name: tenant?.name || '',
    already_accepted: !!grant.user_id && !!grant.accepted_at,
  }
})
