import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Get staff invitation details
 * Public endpoint for staff registration flow
 * Uses RLS policies to ensure only pending invitations are returned
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

    // Get Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    // Use anon key - RLS policies will handle access control
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    logger.debug('🔍 Fetching staff invitation:', body.token.substring(0, 10) + '...')

    // Fetch invitation
    const { data: invitation, error: invError } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('invitation_token', body.token)
      .eq('status', 'pending')
      .single()

    if (invError || !invitation) {
      logger.debug('❌ Invitation not found or invalid')
      throw createError({
        statusCode: 404,
        statusMessage: 'Invitation not found or invalid'
      })
    }

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
      .select('business_type, id, name, slug')
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
      .select('id, name, address, location_type')
      .eq('tenant_id', invitation.tenant_id)
      .eq('location_type', 'standard')
      .eq('is_active', true)
      .order('name')

    // Get tenant exam locations (Prüfungsorte)
    const { data: examLocations } = await supabase
      .from('locations')
      .select('id, name, address, location_type')
      .eq('tenant_id', invitation.tenant_id)
      .eq('location_type', 'exam')
      .eq('is_active', true)
      .order('name')

    // Check if affiliate is enabled for this tenant
    const { data: affiliateSetting } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', invitation.tenant_id)
      .eq('category', 'affiliate')
      .eq('setting_key', 'enabled')
      .maybeSingle()

    const affiliateEnabled = affiliateSetting?.setting_value === 'true'

    return {
      success: true,
      invitation,
      tenant,
      categories,
      locations: locations || [],
      examLocations: examLocations || [],
      affiliateEnabled
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
