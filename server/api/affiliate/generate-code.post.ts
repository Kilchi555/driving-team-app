import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/affiliate/generate-code
 *
 * Creates (or returns existing) affiliate code for the authenticated user.
 * Works for roles: client, staff, admin, affiliate.
 *
 * Body: { tenant_id: string }
 * Returns: { code, link, affiliate_code_id }
 */

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars (0/O, 1/I)
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()
  const supabaseAdmin = getSupabaseAdmin()

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profileError || !userProfile) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  const allowedRoles = ['client', 'staff', 'admin', 'super_admin', 'affiliate']
  if (!allowedRoles.includes(userProfile.role)) {
    throw createError({ statusCode: 403, message: 'Not authorized to generate affiliate codes' })
  }

  // Check if affiliate feature is enabled for this tenant
  const { data: featureSetting } = await supabaseAdmin
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', userProfile.tenant_id)
    .eq('category', 'affiliate')
    .eq('setting_key', 'enabled')
    .maybeSingle()

  if (featureSetting?.setting_value !== 'true') {
    throw createError({ statusCode: 403, message: 'Affiliate system is not enabled for this tenant' })
  }

  // Return existing code if present
  const { data: existing } = await supabaseAdmin
    .from('affiliate_codes')
    .select('id, code, tenant_id')
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('domain')
      .eq('id', userProfile.tenant_id)
      .maybeSingle()

    const baseUrl = tenant?.domain ? `https://${tenant.domain}` : 'https://driving-team.ch'
    return {
      success: true,
      data: {
        affiliate_code_id: existing.id,
        code: existing.code,
        link: `${baseUrl}/?ref=${existing.code}`,
      }
    }
  }

  // Generate unique code
  let code = ''
  let attempts = 0
  while (attempts < 10) {
    const candidate = generateCode()
    const { data: clash } = await supabaseAdmin
      .from('affiliate_codes')
      .select('id')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('code', candidate)
      .maybeSingle()
    if (!clash) { code = candidate; break }
    attempts++
  }

  if (!code) {
    throw createError({ statusCode: 500, message: 'Could not generate unique code, please try again' })
  }

  const { data: newCode, error: insertError } = await supabaseAdmin
    .from('affiliate_codes')
    .insert({
      tenant_id: userProfile.tenant_id,
      user_id: userProfile.id,
      code,
      is_active: true,
    })
    .select('id, code')
    .single()

  if (insertError || !newCode) {
    throw createError({ statusCode: 500, message: 'Failed to create affiliate code' })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('domain')
    .eq('id', userProfile.tenant_id)
    .maybeSingle()

  const baseUrl = tenant?.domain ? `https://${tenant.domain}` : 'https://driving-team.ch'

  return {
    success: true,
    data: {
      affiliate_code_id: newCode.id,
      code: newCode.code,
      link: `${baseUrl}/?ref=${newCode.code}`,
    }
  }
})
