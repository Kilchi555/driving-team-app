/**
 * Notify customer about appointment cancel/reschedule (email + SMS per policy).
 * Used by calendar UI after a move/edit.
 */
import { createError, defineEventHandler, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  requireTenantStaff,
  assertSelfOrTenantAdmin,
} from '~/server/utils/require-tenant-auth'
import { notifyCustomerAppointmentChange } from '~/server/utils/notify-customer-appointment-change'
import { parseRescheduleChangedFields } from '~/utils/reschedule-email-triggers'

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)
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
    changedFields,
  } = body || {}

  if (!type || !['cancelled', 'rescheduled'].includes(type)) {
    throw createError({ statusCode: 400, statusMessage: 'type (cancelled|rescheduled) required' })
  }

  if (!appointmentId) {
    throw createError({ statusCode: 400, statusMessage: 'appointmentId required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: apt } = await supabase
    .from('appointments')
    .select('user_id, start_time, tenant_id, staff_id')
    .eq('id', appointmentId)
    .eq('tenant_id', actor.tenant_id)
    .maybeSingle()

  if (!apt?.user_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (apt.staff_id) {
    assertSelfOrTenantAdmin(actor, apt.staff_id)
  } else if (actor.role === 'staff') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (bodyUserId && bodyUserId !== apt.user_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  let iso = appointmentTimeIso as string | undefined
  if (!iso) iso = apt.start_time
  if (!iso && typeof newTime === 'string') {
    const parsed = new Date(newTime)
    if (!Number.isNaN(parsed.getTime())) iso = parsed.toISOString()
  }
  if (!iso) iso = new Date().toISOString()

  const sanitizedChangedFields = Array.isArray(changedFields)
    ? parseRescheduleChangedFields(changedFields)
    : undefined

  const result = await notifyCustomerAppointmentChange({
    tenantId: actor.tenant_id,
    userId: apt.user_id,
    type,
    appointmentId,
    appointmentTimeIso: iso,
    appointmentTimeLabel: appointmentTimeLabel || newTime || undefined,
    cancellationReason: cancellationReason || null,
    emailExtras: {
      oldTime,
      newTime,
      staffName,
      changedFields: sanitizedChangedFields,
    },
    changedFields: sanitizedChangedFields,
  })

  return { success: true, ...result }
})
