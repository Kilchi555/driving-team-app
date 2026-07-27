import type { SupabaseClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

export function normalizePickupAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/,?\s*switzerland$/i, '')
    .replace(/,?\s*schweiz$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Ensures a reusable pickup location exists for a client.
 * Used by public/guest booking (addresses were previously only stored on appointments)
 * and by lazy promotion when staff loads client locations.
 */
export async function ensureClientPickupLocation(
  supabase: SupabaseClient,
  opts: {
    tenantId: string
    clientUserId: string
    address: string
    name?: string
    postalCode?: string | null
    city?: string | null
    latitude?: number | null
    longitude?: number | null
    googlePlaceId?: string | null
  }
): Promise<{ id: string; name: string; address: string; [key: string]: any } | null> {
  const address = opts.address?.trim()
  if (!address || !opts.tenantId || !opts.clientUserId) return null

  const normalized = normalizePickupAddress(address)

  const { data: existingPickups, error: listError } = await supabase
    .from('locations')
    .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable, latitude, longitude, google_place_id')
    .eq('tenant_id', opts.tenantId)
    .eq('user_id', opts.clientUserId)
    .eq('location_type', 'pickup')
    .eq('is_active', true)

  if (listError) {
    logger.warn('⚠️ ensureClientPickupLocation: failed to list existing pickups:', listError.message)
  }

  const match = (existingPickups || []).find((loc) => {
    const candidates = [loc.address, loc.formatted_address, loc.name].filter(Boolean) as string[]
    return candidates.some((c) => normalizePickupAddress(c) === normalized)
  })

  if (match) {
    return match
  }

  const name = (opts.name?.trim() || address.split(',')[0]?.trim() || 'Pickup-Adresse').substring(0, 255)

  const { data: created, error: insertError } = await supabase
    .from('locations')
    .insert({
      location_type: 'pickup',
      user_id: opts.clientUserId,
      tenant_id: opts.tenantId,
      name,
      address: address.substring(0, 500),
      latitude: opts.latitude ?? null,
      longitude: opts.longitude ?? null,
      postal_code: opts.postalCode?.trim() || null,
      city: opts.city?.trim() || null,
      google_place_id: opts.googlePlaceId || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable, latitude, longitude, google_place_id')
    .single()

  if (insertError || !created) {
    logger.warn('⚠️ ensureClientPickupLocation: insert failed:', insertError?.message)
    return null
  }

  logger.debug('✅ ensureClientPickupLocation: created pickup', {
    id: created.id,
    clientUserId: opts.clientUserId,
    name: created.name
  })

  return created
}
