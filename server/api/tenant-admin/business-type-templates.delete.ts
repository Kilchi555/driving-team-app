// DELETE /api/tenant-admin/business-type-templates?kind=category&id=42
// Deletes a single template row (tenant_id IS NULL only — never a real tenant's data).
// Super-admin only.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const query = getQuery(event)
  const kind = String(query.kind || '')
  const id = query.id

  if (!id || (kind !== 'category' && kind !== 'event_type')) {
    throw createError({ statusCode: 400, statusMessage: "kind ('category'|'event_type') and id are required" })
  }

  const supabase = getSupabaseAdmin()
  const table = kind === 'category' ? 'categories' : 'event_types'

  const { error } = await supabase.from(table).delete().eq('id', id).is('tenant_id', null)
  if (error) throw createError({ statusCode: 500, statusMessage: `Delete failed: ${error.message}` })

  return { success: true }
})
