/**
 * Tenant Management API (Super-Admin only)
 *
 * GET  /api/admin/tenants-manage       → list all tenants with user counts
 * POST /api/admin/tenants-manage       → create a new tenant
 * PATCH /api/admin/tenants-manage      → update an existing tenant (body: { id, ...fields })
 *
 * All operations use getSupabaseAdmin() (service_role) since tenants is not
 * accessible via regular RLS after the security audit fixes.
 */

import { defineEventHandler, readBody, createError, getMethod } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

async function verifySuperAdmin(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Nicht angemeldet' })

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super-Admin-Zugriff erforderlich' })
  }
  return profile
}

export default defineEventHandler(async (event) => {
  await verifySuperAdmin(event)
  const supabase = getSupabaseAdmin()
  const method = getMethod(event)

  // ── GET: alle Tenants laden ──────────────────────────────────────────
  if (method === 'GET') {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error loading tenants:', error)
      throw createError({ statusCode: 500, message: 'Fehler beim Laden der Tenants' })
    }

    const tenantsWithCounts = await Promise.all(
      (tenants ?? []).map(async (tenant: any) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
        return { ...tenant, user_count: count ?? 0 }
      })
    )

    return { success: true, data: tenantsWithCounts }
  }

  // ── POST: neuen Tenant erstellen ─────────────────────────────────────
  if (method === 'POST') {
    const body = await readBody(event)
    const { data, error } = await supabase
      .from('tenants')
      .insert([body])
      .select()
      .single()

    if (error) {
      logger.error('Error creating tenant:', error)
      throw createError({ statusCode: 500, message: 'Fehler beim Erstellen des Tenants' })
    }
    return { success: true, data }
  }

  // ── PATCH: bestehenden Tenant aktualisieren ──────────────────────────
  if (method === 'PATCH') {
    const body = await readBody(event)
    const { id, ...raw } = body

    if (!id) throw createError({ statusCode: 400, message: 'Tenant-ID fehlt' })

    const ALLOWED = [
      'name', 'slug', 'contact_email', 'contact_phone', 'address',
      'business_type', 'brand_name', 'legal_company_name',
      'contact_person_first_name', 'contact_person_last_name',
      'subscription_plan', 'subscription_status',
      'is_active', 'is_trial', 'trial_ends_at',
      'twilio_from_sender', 'from_email',
      'addon_seats', 'addon_courses_enabled', 'addon_affiliate_enabled', 'addon_gbp_enabled',
    ] as const

    const updates: Record<string, any> = {}
    for (const key of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        updates[key] = raw[key]
      }
    }
    if (Object.keys(updates).length === 0) {
      throw createError({ statusCode: 400, message: 'Keine erlaubten Felder zum Aktualisieren' })
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating tenant:', error)
      throw createError({ statusCode: 500, message: 'Fehler beim Aktualisieren des Tenants' })
    }
    return { success: true, data }
  }

  throw createError({ statusCode: 405, message: 'Methode nicht erlaubt' })
})
