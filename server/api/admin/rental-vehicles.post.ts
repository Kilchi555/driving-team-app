/**
 * POST /api/admin/rental-vehicles
 * Create, update or delete a vehicle (with rental-specific fields).
 * Body: { action: 'create'|'update'|'delete', ...fields }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser || !['admin', 'superadmin'].includes(dbUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  // DB columns are German: marke=make, modell=model, farbe=color, getriebe=transmission
  const { action, id, marke, modell, farbe, getriebe, aufbau, name,
          category_codes, location_id, location_address,
          hourly_rate_chf, pricing_tiers, rental_access,
          rental_requires_lesson, rental_requires_course,
          rental_lesson_category_codes, rental_course_category_codes } = body

  if (action === 'create') {
    if (!marke || !modell) throw createError({ statusCode: 400, statusMessage: 'Marke und Modell sind erforderlich' })

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        tenant_id: dbUser.tenant_id,
        name: name?.trim() || `${marke} ${modell}`,
        type: 'vehicle',
        location: location_address?.trim() || '',
        marke: marke.trim(),
        modell: modell.trim(),
        farbe: farbe?.trim() || null,
        getriebe: getriebe?.trim() || null,
        aufbau: aufbau?.trim() || null,
        category_codes: category_codes ?? [],
        location_id: location_id || null,
        location_address: location_address?.trim() || null,
        hourly_rate_rappen: Math.round((parseFloat(hourly_rate_chf) || 0) * 100),
        pricing_tiers: pricing_tiers ?? [],
        rental_access: rental_access ?? 'private',
        rental_requires_lesson: rental_requires_lesson ?? false,
        rental_requires_course: rental_requires_course ?? false,
        rental_lesson_category_codes: rental_lesson_category_codes ?? [],
        rental_course_category_codes: rental_course_category_codes ?? [],
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('rental-vehicles create error:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to create vehicle' })
    }
    return { success: true, vehicle: data }
  }

  if (action === 'update') {
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

    const updates: Record<string, any> = {}
    if (marke !== undefined) { updates.marke = marke.trim(); updates.name = name?.trim() || marke.trim() }
    if (modell !== undefined) updates.modell = modell.trim()
    if (farbe !== undefined) updates.farbe = farbe?.trim() || null
    if (getriebe !== undefined) updates.getriebe = getriebe?.trim() || null
    if (aufbau !== undefined) updates.aufbau = aufbau?.trim() || null
    if (category_codes !== undefined) updates.category_codes = category_codes
    if (location_id !== undefined) updates.location_id = location_id || null
    if (hourly_rate_chf !== undefined) updates.hourly_rate_rappen = Math.round((parseFloat(hourly_rate_chf) || 0) * 100)
    if (pricing_tiers !== undefined) updates.pricing_tiers = pricing_tiers ?? []
    if (location_address !== undefined) updates.location_address = location_address?.trim() || null
    if (rental_access !== undefined) updates.rental_access = rental_access
    if (rental_requires_lesson !== undefined) updates.rental_requires_lesson = rental_requires_lesson ?? false
    if (rental_requires_course !== undefined) updates.rental_requires_course = rental_requires_course ?? false
    if (rental_lesson_category_codes !== undefined) updates.rental_lesson_category_codes = rental_lesson_category_codes ?? []
    if (rental_course_category_codes !== undefined) updates.rental_course_category_codes = rental_course_category_codes ?? []

    const { error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', dbUser.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to update vehicle' })
    return { success: true }
  }

  if (action === 'delete') {
    if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

    // Soft-delete
    const { error } = await supabase
      .from('vehicles')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', dbUser.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to delete vehicle' })
    return { success: true }
  }

  throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
})
