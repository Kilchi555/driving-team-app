import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthenticatedUser(event)
    if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!['admin'].includes(user.role || '')) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

    const rateLimitKey = `category_save:${user.id}`
    const rateLimitResult = await checkRateLimit(rateLimitKey, 20, 60 * 1000)
    if (!rateLimitResult.allowed) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

    const tenantId = user.tenant_id
    if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'No tenant' })

    const body = await readBody(event)
    const { categoryId, ...rest } = body

    if (!rest.name) throw createError({ statusCode: 400, statusMessage: 'Missing name' })

    // Whitelist of allowed columns (prevents arbitrary field injection)
    const ALLOWED = [
      'name', 'description', 'code', 'icon', 'color', 'sort_order',
      'default_max_participants', 'default_price_rappen',
      'default_requires_room', 'default_requires_vehicle',
      'default_room_id', 'default_vehicle_id',
      'requires_sari_sync', 'sari_category_code',
      'session_count', 'hours_per_session', 'total_duration_hours', 'session_structure',
      'allow_partial_enrollment', 'partial_start_position', 'partial_price_rappen',
      'is_active', 'waitlist_enabled',
    ]
    const fields: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of ALLOWED) {
      if (rest[key] !== undefined) fields[key] = rest[key]
    }

    const supabase = getSupabaseAdmin()

    // Reject foreign rooms as category default (service role bypasses RLS)
    const defaultRoomId = fields.default_room_id
    if (defaultRoomId) {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('id, tenant_id')
        .eq('id', defaultRoomId)
        .maybeSingle()
      if (roomErr) throw roomErr
      if (!room || room.tenant_id !== tenantId) {
        throw createError({ statusCode: 403, statusMessage: 'Room does not belong to this tenant' })
      }
    }

    let result
    if (categoryId) {
      const { data, error: err } = await supabase
        .from('course_categories')
        .update(fields)
        .eq('id', categoryId)
        .eq('tenant_id', tenantId)
        .select()
        .single()
      if (err) throw err
      result = data
    } else {
      const createdBy = user.db_user_id || user.profile?.id
      if (!createdBy) {
        throw createError({ statusCode: 400, statusMessage: 'User profile not resolved' })
      }
      const { data, error: err } = await supabase
        .from('course_categories')
        .insert({ tenant_id: tenantId, created_by: createdBy, ...fields })
        .select()
        .single()
      if (err) throw err
      result = data
    }

    logger.debug('✅ Category saved:', result.id)
    return { success: true, data: result, error: null }
  } catch (error: any) {
    logger.error('❌ Error saving category:', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || error?.statusMessage || 'Failed to save category',
      data: error,
    })
  }
})

