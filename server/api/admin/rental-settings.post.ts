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

  const { vehicle_rental_settings, rental_portal_slug } = await readBody(event)

  // Merge partial settings into existing JSONB (don't overwrite unrelated keys)
  const updates: Record<string, any> = {}
  if (vehicle_rental_settings) {
    const { data: current } = await supabase
      .from('tenants')
      .select('vehicle_rental_settings')
      .eq('id', dbUser.tenant_id)
      .maybeSingle()

    updates.vehicle_rental_settings = {
      ...(current?.vehicle_rental_settings ?? {}),
      ...vehicle_rental_settings,
    }
  }
  if (rental_portal_slug !== undefined) {
    updates.rental_portal_slug = rental_portal_slug || null
  }

  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', dbUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to save settings' })
  return { success: true }
})
