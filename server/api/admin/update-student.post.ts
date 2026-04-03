import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'

// Whitelist of fields that can be updated on a student record
const ALLOWED_UPDATE_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'category',
  'preferred_location_id', 'assigned_staff_id', 'assigned_staff_ids',
  'street', 'street_number', 'zip', 'city', 'birthdate', 'notes_general'
]

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const body = await readBody<{
      action: 'update' | 'toggle_status'
      student_id: string
      updates?: Record<string, any>
      is_active?: boolean
    }>(event)

    const { action, student_id } = body
    if (!student_id) throw createError({ statusCode: 400, statusMessage: 'Missing student_id' })

    const supabase = getSupabaseAdmin()
    const clientIP = getClientIP(event)

    // Load caller profile
    const { data: callerUser } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!callerUser) throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    if (!['admin', 'staff', 'super_admin'].includes(callerUser.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Staff or admin role required' })
    }

    // Verify student exists and belongs to same tenant
    const { data: student } = await supabase
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('id', student_id)
      .eq('role', 'client')
      .single()

    if (!student || student.tenant_id !== callerUser.tenant_id) {
      throw createError({ statusCode: 404, statusMessage: 'Student not found' })
    }

    // ─── toggle_status ───────────────────────────────────────────────────────
    if (action === 'toggle_status') {
      if (typeof body.is_active !== 'boolean') {
        throw createError({ statusCode: 400, statusMessage: 'Missing is_active boolean' })
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: body.is_active })
        .eq('id', student_id)

      if (updateError) throw updateError

      await logAudit({
        user_id: authUser.id,
        action: body.is_active ? 'activate_student' : 'deactivate_student',
        resource_type: 'user',
        resource_id: student_id,
        status: 'success',
        ip_address: clientIP
      })

      return { success: true, is_active: body.is_active }
    }

    // ─── update ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!body.updates || typeof body.updates !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Missing updates' })
      }

      // Strict whitelist — prevent mass-assignment of sensitive fields
      const safeUpdates: Record<string, any> = {}
      for (const field of ALLOWED_UPDATE_FIELDS) {
        if (field in body.updates) {
          safeUpdates[field] = body.updates[field]
        }
      }

      if (Object.keys(safeUpdates).length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
      }

      const { data, error: updateError } = await supabase
        .from('users')
        .update(safeUpdates)
        .eq('id', student_id)
        .select()
        .single()

      if (updateError) throw updateError

      await logAudit({
        user_id: authUser.id,
        action: 'update_student',
        resource_type: 'user',
        resource_id: student_id,
        status: 'success',
        ip_address: clientIP,
        details: { updated_fields: Object.keys(safeUpdates) }
      })

      return { success: true, data }
    }

    throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })

  } catch (err: any) {
    logger.error('❌ Error in update-student:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Failed to update student' })
  }
})
