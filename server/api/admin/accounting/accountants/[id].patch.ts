import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isAccountantAccess } from '~/server/utils/accountant'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminOnly(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID fehlt' })
  const body = await readBody(event)
  const supabase = getSupabaseAdmin()

  const { data: grant } = await supabase
    .from('accountant_grants')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', profile.tenant_id)
    .is('revoked_at', null)
    .maybeSingle()
  if (!grant) throw createError({ statusCode: 404, statusMessage: 'Treuhänder nicht gefunden' })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body?.revoke === true) {
    patch.revoked_at = new Date().toISOString()
    patch.invite_token = null
  } else if (isAccountantAccess(body?.access)) {
    patch.access = body.access
  } else {
    throw createError({ statusCode: 400, statusMessage: 'access (read|write) oder revoke: true erforderlich' })
  }

  const { data, error } = await supabase
    .from('accountant_grants')
    .update(patch)
    .eq('id', id)
    .select('id, email, access, invited_at, accepted_at, revoked_at')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, data }
})
