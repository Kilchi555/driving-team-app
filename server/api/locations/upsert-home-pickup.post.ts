import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizePickupAddress } from '~/server/utils/ensure-client-pickup-location'
import logger from '~/utils/logger'

/**
 * POST /api/locations/upsert-home-pickup
 *
 * Creates or updates the client's "Zuhause" pickup from the current profile address.
 * Staff/admin only. Target is users.id (works for guests without auth_user_id).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (userError || !user) {
    throw createError({ statusCode: 401, message: 'User not found' })
  }

  if (!['staff', 'admin', 'tenant_admin', 'super_admin', 'superadmin'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const body = await readBody(event)
  const clientUserId = body?.userId || body?.studentId
  const address = typeof body?.address === 'string' ? body.address.trim() : ''
  const locationName = typeof body?.name === 'string' && body.name.trim()
    ? body.name.trim().substring(0, 255)
    : 'Zuhause'
  const postalCode = typeof body?.postal_code === 'string' ? body.postal_code.trim() : null
  const city = typeof body?.city === 'string' ? body.city.trim() : null

  if (!clientUserId || typeof clientUserId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientUserId)) {
    throw createError({ statusCode: 400, message: 'Invalid userId' })
  }
  if (!address) {
    throw createError({ statusCode: 400, message: 'Address is required' })
  }

  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, tenant_id, role, deleted_at')
    .eq('id', clientUserId)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (targetError || !targetUser || targetUser.deleted_at) {
    throw createError({ statusCode: 403, message: 'User not found or unauthorized' })
  }

  const { data: existingPickups, error: listError } = await supabase
    .from('locations')
    .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, latitude, longitude, google_place_id')
    .eq('tenant_id', user.tenant_id)
    .eq('user_id', clientUserId)
    .eq('location_type', 'pickup')
    .eq('is_active', true)

  if (listError) {
    logger.error('❌ upsert-home-pickup list failed:', listError)
    throw createError({ statusCode: 500, message: 'Failed to load existing pickups' })
  }

  const normalizedAddress = normalizePickupAddress(address)
  const byAddress = (existingPickups || []).find((loc) => {
    const candidates = [loc.address, loc.formatted_address, loc.name].filter(Boolean) as string[]
    return candidates.some((c) => normalizePickupAddress(c) === normalizedAddress)
  })
  const byHomeName = (existingPickups || []).find((loc) =>
    /(^|[\s-])zuhause$/i.test((loc.name || '').trim())
  )

  // Same address already stored → reuse
  if (byAddress) {
    return {
      id: byAddress.id,
      name: byAddress.name,
      address: byAddress.address,
      latitude: byAddress.latitude,
      longitude: byAddress.longitude,
      postal_code: byAddress.postal_code,
      city: byAddress.city,
      location_type: 'pickup',
      source: 'pickup'
    }
  }

  // Named "Zuhause" but profile address changed → update in place
  if (byHomeName) {
    const { data: updated, error: updateError } = await supabase
      .from('locations')
      .update({
        name: locationName.substring(0, 255),
        address: address.substring(0, 500),
        postal_code: postalCode,
        city,
        latitude: null,
        longitude: null,
        google_place_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', byHomeName.id)
      .eq('tenant_id', user.tenant_id)
      .select('id, name, address, latitude, longitude, postal_code, city, location_type')
      .single()

    if (updateError || !updated) {
      logger.error('❌ upsert-home-pickup update failed:', updateError)
      throw createError({ statusCode: 500, message: 'Failed to update home pickup' })
    }

    logger.debug('🏠 Updated existing Zuhause pickup to new profile address:', updated.id)
    return {
      ...updated,
      source: 'pickup'
    }
  }

  // No home pickup yet → create
  const { data: created, error: insertError } = await supabase
    .from('locations')
    .insert({
      location_type: 'pickup',
      user_id: clientUserId,
      tenant_id: user.tenant_id,
      name: locationName.substring(0, 255),
      address: address.substring(0, 500),
      postal_code: postalCode,
      city,
      latitude: null,
      longitude: null,
      google_place_id: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id, name, address, latitude, longitude, postal_code, city, location_type')
    .single()

  if (insertError || !created) {
    logger.error('❌ upsert-home-pickup insert failed:', insertError)
    throw createError({ statusCode: 500, message: 'Failed to create home pickup' })
  }

  logger.debug('🏠 Created Zuhause pickup:', created.id)
  return {
    ...created,
    source: 'pickup'
  }
})
