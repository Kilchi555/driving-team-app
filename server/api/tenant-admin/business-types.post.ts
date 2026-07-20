// POST /api/tenant-admin/business-types
// Create or update a business type. Body: { code?, name, description?, is_active? }
// When editing, pass existing `code` (immutable PK). When creating, pass new `code`.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const body = await readBody(event)
  const code = String(body?.code || '').trim()
  const name = String(body?.name || '').trim()
  if (!code || !name) {
    throw createError({ statusCode: 400, statusMessage: 'code and name are required' })
  }

  const supabase = getSupabaseAdmin()
  const isUpdate = !!body?.isUpdate
  const row = {
    name,
    description: body.description ?? null,
    is_active: body.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  if (isUpdate) {
    const { data, error } = await supabase
      .from('business_types')
      .update(row)
      .eq('code', code)
      .select('code, name, description, is_active')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: `Update failed: ${error.message}` })
    return { businessType: data }
  }

  const { data, error } = await supabase
    .from('business_types')
    .insert({ code, ...row, created_at: new Date().toISOString() })
    .select('code, name, description, is_active')
    .single()
  if (error) {
    const msg = error.code === '23505'
      ? `Business-Type «${code}» existiert bereits`
      : `Insert failed: ${error.message}`
    throw createError({ statusCode: 500, statusMessage: msg })
  }
  return { businessType: data }
})
