import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isFirstStaffOnboarding, isPlaceholderStaffInviteEmail } from '~/server/utils/staff-invite-email'

/**
 * Public staff-registration lookup.
 *
 * Architecture (do not revert):
 *   public POST /api/staff/get-invitation
 *     → server-side token validation
 *     → service_role equality lookup on invitation_token
 *     → minimal response
 *
 * Do not restore anon SELECT on staff_invitations (token enumeration).
 * Do not look up by tenant_id, invitation id, or email from the caller.
 */

const INVITATION_TOKEN_MAX_LENGTH = 128

interface GetInvitationRequest {
  token?: unknown
  tenant_id?: unknown
  invitation_id?: string
  email?: string
}

function normalizeInvitationToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const token = raw.trim()
  if (!token || token.length > INVITATION_TOKEN_MAX_LENGTH) return null
  return token
}

function isInvitationExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() <= Date.now()
}

function notFound() {
  return createError({
    statusCode: 404,
    statusMessage: 'Invitation not found or invalid',
  })
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<GetInvitationRequest>(event)
    const token = normalizeInvitationToken(body?.token)

    if (!token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invitation token required',
      })
    }

    const supabase = getSupabaseAdmin()

    const { data: invitationRow, error: invError } = await supabase
      .from('staff_invitations')
      .select('id, tenant_id, first_name, last_name, email, phone, status, expires_at')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .maybeSingle()

    if (invError || !invitationRow) {
      throw notFound()
    }

    if (invitationRow.status !== 'pending' || isInvitationExpired(invitationRow.expires_at)) {
      throw notFound()
    }

    const tenantId = invitationRow.tenant_id as string

    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id, name, slug, primary_color, business_type, working_days_template')
      .eq('id', tenantId)
      .maybeSingle()

    const tenant = tenantRow
      ? {
          id: tenantRow.id,
          name: tenantRow.name,
          slug: tenantRow.slug,
          primary_color: tenantRow.primary_color,
          business_type: tenantRow.business_type,
          working_days_template: tenantRow.working_days_template,
        }
      : null

    let categories: Array<{
      code: string
      name: string
      parent_category_id: string | null
      id: string
      color: string | null
    }> = []

    if (tenant?.business_type === 'driving_school') {
      const { data: cats } = await supabase
        .from('categories')
        .select('code, name, parent_category_id, id, color')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('code')

      const allCats = cats || []
      const parentIds = new Set(allCats.map(c => c.parent_category_id).filter(Boolean))
      categories = allCats.filter(c => !parentIds.has(c.id))
    }

    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, address, location_type, public_bookable')
      .eq('tenant_id', tenantId)
      .eq('location_type', 'standard')
      .eq('is_active', true)
      .order('name')

    let examLocations: Array<{
      id: string
      name: string
      address: string | null
      city: string | null
      canton: string | null
      postal_code: string | null
      location_type: string
    }> = []

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

    let ui_labels: Record<string, string> = {}
    let working_days_defaults: unknown = null
    if (tenant?.business_type) {
      const { data: preset } = await supabase
        .from('business_type_presets')
        .select('ui_labels, defaults')
        .eq('business_type_code', tenant.business_type)
        .maybeSingle()
      if (preset?.ui_labels && typeof preset.ui_labels === 'object') {
        ui_labels = preset.ui_labels as Record<string, string>
      }
      working_days_defaults = (preset?.defaults as { working_days_template?: unknown } | null)?.working_days_template || null
    }

    const { data: affiliateSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'affiliate')
      .eq('setting_key', 'enabled')
      .maybeSingle()

    const affiliateEnabled = affiliateSetting?.setting_value === 'true'

    let admin_email: string | null = null
    try {
      const { data: adminUser } = await supabase
        .from('users')
        .select('email')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      admin_email = adminUser?.email?.toLowerCase()?.trim() || null
    } catch {
      logger.warn('Could not load admin email for invitation')
    }

    const inviteEmail = invitationRow.email as string | null
    const email_is_placeholder = isPlaceholderStaffInviteEmail(inviteEmail)
    const email_locked = !email_is_placeholder && !!inviteEmail
    const show_dual_login_hint = await isFirstStaffOnboarding(
      supabase,
      tenantId,
      invitationRow.id,
    )

    return {
      success: true,
      invitation: {
        first_name: invitationRow.first_name,
        last_name: invitationRow.last_name,
        email: invitationRow.email,
        phone: invitationRow.phone,
        tenant_id: tenantId,
      },
      tenant,
      categories,
      locations: (locations || []).map((loc: {
        id: string
        name: string
        address: string | null
        location_type: string
        public_bookable: boolean | null
      }) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        location_type: loc.location_type,
        public_bookable: loc.public_bookable,
      })),
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
    if (error.statusCode) {
      throw error
    }

    logger.error('Get invitation error')
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch invitation',
    })
  }
})
