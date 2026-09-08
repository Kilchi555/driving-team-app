import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isFirstStaffOnboarding, isPlaceholderStaffInviteEmail } from '~/server/utils/staff-invite-email'

/**
 * Get staff invitation details
 * Public endpoint for staff registration flow.
 * Looks up the caller-supplied token with service_role (equality match only).
 * Do not restore anon SELECT on staff_invitations — that enumerates tokens.
 */

interface GetInvitationRequest {
  token: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<GetInvitationRequest>(event)

    if (!body.token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invitation token required'
      })
    }

    const supabase = getSupabaseAdmin()

    logger.debug('🔍 Fetching staff invitation:', body.token.substring(0, 10) + '...')

    const { data: invitationRow, error: invError } = await supabase
      .from('staff_invitations')
      .select('id, tenant_id, first_name, last_name, email, phone, status, expires_at, created_at')
      .eq('invitation_token', body.token)
      .eq('status', 'pending')
      .single()

    if (invError || !invitationRow) {
      logger.debug('❌ Invitation not found or invalid')
      throw createError({
        statusCode: 404,
        statusMessage: 'Invitation not found or invalid'
      })
    }

    const invitation = invitationRow

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      logger.debug('⏰ Invitation expired')
      throw createError({
        statusCode: 410,
        statusMessage: 'Invitation has expired'
      })
    }

    logger.debug('✅ Invitation found:', invitation.email)

    // Get tenant info (including slug for redirect)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_type, id, name, slug, primary_color, secondary_color, logo_url, selected_categories, working_days_template')
      .eq('id', invitation.tenant_id)
      .single()

      // Get categories if driving school (with hierarchy)
    let categories = []
    if (tenant?.business_type === 'driving_school') {
      const { data: cats } = await supabase
        .from('categories')
        .select('code, name, parent_category_id, id, color')
        .eq('tenant_id', invitation.tenant_id)
        .eq('is_active', true)
        .order('code')

      // Filter: show only leaf categories (subcategories, or mains without children)
      const allCats = cats || []
      const parentIds = new Set(allCats.map(c => c.parent_category_id).filter(Boolean))
      categories = allCats.filter(c => !parentIds.has(c.id))
    }

    // Get tenant standard locations (Treffpunkte)
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, address, location_type, public_bookable')
      .eq('tenant_id', invitation.tenant_id)
      .eq('location_type', 'standard')
      .eq('is_active', true)
      .order('name')

    // Exam locations are a driving_school concept (Führerscheinprüfungen)
    let examLocations: any[] = []
    if (tenant?.business_type === 'driving_school') {
      const { data: exams } = await supabase
        .from('locations')
        .select('id, name, address, city, canton, postal_code, location_type')
        .is('tenant_id', null)
        .eq('location_type', 'exam')
        .eq('is_active', true)
        .order('name')
      examLocations = exams || []
    }

    // Branch-aware UI labels + working-hours defaults from business_type_presets
    // (tenant has no auth session yet during staff invite registration).
    let ui_labels: Record<string, string> = {}
    let working_days_defaults: any = null
    if (tenant?.business_type) {
      const { data: preset } = await supabase
        .from('business_type_presets')
        .select('ui_labels, defaults')
        .eq('business_type_code', tenant.business_type)
        .maybeSingle()
      if (preset?.ui_labels && typeof preset.ui_labels === 'object') {
        ui_labels = preset.ui_labels as Record<string, string>
      }
      working_days_defaults = (preset?.defaults as any)?.working_days_template || null
    }

    // Check if affiliate is enabled for this tenant
    const { data: affiliateSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', invitation.tenant_id)
      .eq('category', 'affiliate')
      .eq('setting_key', 'enabled')
      .maybeSingle()

    const affiliateEnabled = affiliateSetting?.setting_value === 'true'

    // Admin email for dual-login guidance (service role — no auth on invite page)
    let admin_email: string | null = null
    try {
      const { data: adminUser } = await getSupabaseAdmin()
        .from('users')
        .select('email')
        .eq('tenant_id', invitation.tenant_id)
        .eq('role', 'admin')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      admin_email = adminUser?.email?.toLowerCase()?.trim() || null
    } catch (err: any) {
      logger.warn('⚠️ Could not load admin email for invitation:', err?.message)
    }

    const inviteEmail = invitation.email as string | null
    const email_is_placeholder = isPlaceholderStaffInviteEmail(inviteEmail)
    const email_locked = !email_is_placeholder && !!inviteEmail
    const show_dual_login_hint = await isFirstStaffOnboarding(
      getSupabaseAdmin(),
      invitation.tenant_id,
      invitation.id,
    )

    return {
      success: true,
      invitation,
      tenant,
      categories,
      locations: locations || [],
      examLocations,
      affiliateEnabled,
      ui_labels,
      working_days_defaults,
      admin_email,
      email_locked,
      email_is_placeholder,
      show_dual_login_hint,
    }

  } catch (error: any) {
    logger.error('❌ Get invitation error:', error.message)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch invitation'
    })
  }
})
