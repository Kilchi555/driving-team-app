import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { deriveBookingPrefill } from '~/utils/booking-prefill'

export default defineEventHandler(async (event) => {
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getHeader(event, 'x-real-ip')
    || event.node.req.socket.remoteAddress
    || 'unknown'

  const rateLimit = await checkRateLimit(ipAddress, 'register', 30, 60 * 1000)
  if (!rateLimit.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { data: userProfile, error: userProfileError } = await serviceSupabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (userProfileError || !userProfile) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }

  if (userProfile.role !== 'client') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { data: tenant } = await serviceSupabase
    .from('tenants')
    .select('business_type')
    .eq('id', userProfile.tenant_id)
    .maybeSingle()

  let bookableCodes: string[] = []
  if (tenant?.business_type === 'driving_school') {
    const { data: categories } = await serviceSupabase
      .from('categories')
      .select('code')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
    bookableCodes = (categories || []).map((c: { code: string }) => c.code).filter(Boolean)
  } else {
    const { data: eventTypes } = await serviceSupabase
      .from('event_types')
      .select('code')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .eq('public_bookable', true)
    bookableCodes = (eventTypes || []).map((e: { code: string }) => e.code).filter(Boolean)
  }

  const { data: appointments, error } = await serviceSupabase
    .from('appointments')
    .select(`
      type,
      event_type_code,
      status,
      staff_id,
      location_id,
      duration_minutes,
      start_time,
      end_time,
      customer_pickup_plz,
      customer_pickup_address,
      deleted_at
    `)
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .is('deleted_at', null)
    .order('start_time', { ascending: false })
    .limit(25)

  if (error) {
    logger.error('❌ last-booking-prefs query failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load booking prefs' })
  }

  const prefill = deriveBookingPrefill(appointments || [], { bookableCodes })
  return { success: true, prefill }
})
