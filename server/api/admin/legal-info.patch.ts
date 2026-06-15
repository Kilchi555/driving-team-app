import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const allowed = ['legal_form', 'mwst_obligated', 'handelsregister_nr', 'uid_number', 'legal_company_name']
  const patch: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }
  if (!Object.keys(patch).length) {
    throw createError({ statusCode: 400, statusMessage: 'Keine gültigen Felder' })
  }
  patch.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('tenants')
    .update(patch)
    .eq('id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
