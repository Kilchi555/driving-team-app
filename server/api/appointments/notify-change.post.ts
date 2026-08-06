/**
 * Notify customer about appointment cancel/reschedule (email + SMS per policy).
 * Used by calendar UI after a move/edit.
 */
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { notifyCustomerAppointmentChange } from '~/server/utils/notify-customer-appointment-change'

export default defineEventHandler(async (event) => {
  const auth = await getAuthenticatedUser(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const {
    userId: bodyUserId,
    appointmentId,
    type,
    appointmentTimeIso,
    appointmentTimeLabel,
    cancellationReason,
    oldTime,
    newTime,
    staffName,
  } = body || {}

  if (!type || !['cancelled', 'rescheduled'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'type (cancelled|rescheduled) required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', auth.id)
    .maybeSingle()

  if (!dbUser?.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  let userId = bodyUserId as string | undefined
  let iso = appointmentTimeIso as string | undefined

  if ((!userId || !iso) && appointmentId) {
    const { data: apt } = await supabase
      .from('appointments')
      .select('user_id, start_time, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', dbUser.tenant_id)
      .maybeSingle()
    if (apt) {
      userId = userId || apt.user_id
      iso = iso || apt.start_time
    }
  }

  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId or appointmentId required' })
  }

  if (!iso && typeof newTime === 'string') {
    const parsed = new Date(newTime)
    if (!Number.isNaN(parsed.getTime())) iso = parsed.toISOString()
  }
  if (!iso) iso = new Date().toISOString()

  const result = await notifyCustomerAppointmentChange({
    tenantId: dbUser.tenant_id,
    userId,
    type,
    appointmentTimeIso: iso,
    appointmentTimeLabel: appointmentTimeLabel || newTime || undefined,
    cancellationReason: cancellationReason || null,
    emailExtras: {
      oldTime,
      newTime,
      staffName,
    },
  })

  return { success: true, ...result }
})
