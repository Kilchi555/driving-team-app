import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'
import { getClientIP } from '~/server/utils/ip-utils'
import { checkRateLimit } from '~/server/utils/rate-limiter'

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(getClientIP(event), 'cancel_reservation', 20)
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests',
    })
  }

  const body = await readBody(event)
  const reservationId = body?.reservation_id
  if (!reservationId || typeof reservationId !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing reservation_id',
    })
  }

  const supabase = getSupabaseAdmin()
  const { data: reservation, error: loadError } = await supabase
    .from('booking_reservations')
    .select('id, tenant_id, guest_email, status')
    .eq('id', reservationId)
    .maybeSingle()

  if (loadError) {
    logger.error('❌ Error loading reservation:', loadError)
    throw createError({
      statusCode: 500,
      message: 'Fehler beim Löschen der Reservierung',
    })
  }

  if (!reservation) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const guestEmail = normalizeEmail(body?.guest_email)
  const storedEmail = normalizeEmail(reservation.guest_email)
  const emailProof = !!guestEmail && !!storedEmail && guestEmail === storedEmail

  if (!emailProof) {
    const auth = await getAuthenticatedUser(event)
    if (!auth?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    const role = (auth.role || auth.profile?.role || '') as string
    if (!(STAFF_ADMIN_ROLES as readonly string[]).includes(role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    if (role !== 'super_admin' && auth.tenant_id !== reservation.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }

  if (reservation.status !== 'reserved') {
    return { success: true }
  }

  const { error: deleteError } = await supabase
    .from('booking_reservations')
    .delete()
    .eq('id', reservation.id)
    .eq('tenant_id', reservation.tenant_id)

  if (deleteError) {
    logger.error('❌ Error deleting reservation:', deleteError)
    throw createError({
      statusCode: 500,
      message: 'Fehler beim Löschen der Reservierung',
    })
  }

  logger.debug('✅ Booking reservation cancelled:', reservation.id)
  return { success: true }
})
