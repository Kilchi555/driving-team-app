import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Partial update for a category (e.g. document_requirements toggle).
// Body: any subset of category fields to update.
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid category id' })
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  if (existing.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – category does not belong to your tenant' })
  }

  const body = await readBody(event)

  // Only allow safe fields to be updated here (document_requirements and basic metadata)
  const allowed = ['document_requirements', 'code', 'name', 'description', 'color',
    'lesson_duration_minutes', 'exam_duration_minutes', 'is_active']
  const updatePayload: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updatePayload[key] = body[key]
  }

  if (Object.keys(updatePayload).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No updatable fields provided' })
  }

  const { error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
