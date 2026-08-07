/**
 * PATCH /api/admin/tenants/[id]/locations
 * Super-Admin: update a location and/or tenant pickup defaults.
 *
 * Body:
 *  - location_id?: string  + fields to update on locations
 *  - tenant_pickup?: { allow_pickup_mode?: boolean, default_pickup_radius_minutes?: number }
 */
import { defineEventHandler, readBody, createError, getRouterParam, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logAudit } from '~/server/utils/audit'

async function verifySuperAdmin(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Nicht angemeldet' })

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super-Admin-Zugriff erforderlich' })
  }
  return { authUser, profile }
}

const LOCATION_FIELDS = [
  'name',
  'is_active',
  'pickup_enabled',
  'pickup_radius_minutes',
  'category_pickup_settings',
  'available_categories',
  'time_windows',
  'staff_ids',
  'address',
  'postal_code',
  'city',
  'canton',
  'latitude',
  'longitude',
  'public_bookable',
  'location_type',
] as const

export default defineEventHandler(async (event) => {
  const { authUser } = await verifySuperAdmin(event)
  const supabase = getSupabaseAdmin()
  const tenantId = getRouterParam(event, 'id')
  if (!tenantId) throw createError({ statusCode: 400, message: 'Tenant-ID fehlt' })

  const body = await readBody(event) || {}
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown'

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .single()

  if (!tenant) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  let updatedLocation: any = null
  let updatedPickup: any = null

  if (body.location_id) {
    const locationId = String(body.location_id).trim()
    const { data: existing, error: findErr } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('tenant_id', tenantId)
      .single()

    if (findErr || !existing) {
      throw createError({ statusCode: 404, message: 'Location nicht gefunden' })
    }

    const patch: Record<string, any> = {}
    for (const key of LOCATION_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key]
    }

    if (Object.keys(patch).length === 0) {
      throw createError({ statusCode: 400, message: 'Keine Location-Felder zum Aktualisieren' })
    }

    if (patch.pickup_radius_minutes != null) {
      const radius = Number(patch.pickup_radius_minutes)
      if (!Number.isFinite(radius) || radius < 0 || radius > 120) {
        throw createError({ statusCode: 400, message: 'pickup_radius_minutes ungültig (0–120)' })
      }
      patch.pickup_radius_minutes = radius
    }

    const { data, error } = await supabase
      .from('locations')
      .update(patch)
      .eq('id', locationId)
      .eq('tenant_id', tenantId)
      .select('id, name, is_active, pickup_enabled, pickup_radius_minutes, category_pickup_settings, available_categories, time_windows, staff_ids, address, postal_code, city, canton, latitude, longitude, public_bookable, location_type')
      .single()

    if (error) throw createError({ statusCode: 500, message: error.message })
    updatedLocation = data

    await logAudit({
      action: 'sa_location_update',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'location',
      resource_id: locationId,
      ip_address: ipAddress,
      status: 'success',
      details: { fields: Object.keys(patch) },
    }).catch(() => {})
  }

  if (body.tenant_pickup && typeof body.tenant_pickup === 'object') {
    const tp = body.tenant_pickup
    const upserts: Array<{ tenant_id: string; category: string; setting_key: string; setting_value: string }> = []

    if (tp.allow_pickup_mode !== undefined) {
      upserts.push({
        tenant_id: tenantId,
        category: 'availability',
        setting_key: 'allow_pickup_mode',
        setting_value: tp.allow_pickup_mode ? 'true' : 'false',
      })
    }
    if (tp.default_pickup_radius_minutes !== undefined) {
      const radius = Number(tp.default_pickup_radius_minutes)
      if (!Number.isFinite(radius) || radius < 0 || radius > 120) {
        throw createError({ statusCode: 400, message: 'default_pickup_radius_minutes ungültig (0–120)' })
      }
      upserts.push({
        tenant_id: tenantId,
        category: 'availability',
        setting_key: 'default_pickup_radius_minutes',
        setting_value: String(radius),
      })
    }

    for (const row of upserts) {
      const { error } = await supabase
        .from('tenant_settings')
        .upsert(row, { onConflict: 'tenant_id,category,setting_key' })
      if (error) throw createError({ statusCode: 500, message: error.message })
    }

    updatedPickup = {
      allow_pickup_mode: tp.allow_pickup_mode,
      default_pickup_radius_minutes: tp.default_pickup_radius_minutes,
    }

    await logAudit({
      action: 'sa_tenant_pickup_update',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'tenant',
      resource_id: tenantId,
      ip_address: ipAddress,
      status: 'success',
      details: updatedPickup,
    }).catch(() => {})
  }

  if (!updatedLocation && !updatedPickup) {
    throw createError({
      statusCode: 400,
      message: 'location_id oder tenant_pickup erforderlich',
    })
  }

  return {
    success: true,
    location: updatedLocation,
    tenant_pickup: updatedPickup,
    message: 'Gespeichert',
  }
})
