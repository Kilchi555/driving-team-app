/**
 * POST /api/admin/booking-settings
 * Saves the tenant's online booking configuration.
 * Body: { minimum_booking_lead_time_hours: number }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

async function getAuthenticatedAdmin(event: any) {
  const supabase = getSupabaseAdmin()
  const authHeader = event.node.req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!data?.tenant_id || data.role !== 'admin') return null
  return { user, tenantId: data.tenant_id }
}

export default defineEventHandler(async (event) => {
  const auth = await getAuthenticatedAdmin(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const leadTimeHours = parseInt(body.minimum_booking_lead_time_hours)

  if (isNaN(leadTimeHours) || leadTimeHours < 0 || leadTimeHours > 168) {
    throw createError({
      statusCode: 400,
      statusMessage: 'minimum_booking_lead_time_hours must be between 0 and 168 (0–7 days)',
    })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('tenants')
    .update({
      minimum_booking_lead_time_hours: leadTimeHours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auth.tenantId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, minimum_booking_lead_time_hours: leadTimeHours }
})
