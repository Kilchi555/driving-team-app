import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const categoryCode = query.categoryCode as string
    const staffId = query.staffId as string

    // Verify auth
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    if (!categoryCode || !staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Staff Settings laden (preferred_durations)
    const { data: staffSettings } = await supabase
      .from('staff_settings')
      .select('preferred_durations')
      .eq('staff_id', staffId)
      .maybeSingle()

    // Get user's tenant_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', staffId)
      .single()

    if (!userProfile?.tenant_id) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // Get tenant business_type
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantData?.business_type !== 'driving_school') {
      return { durations: [45] }
    }

    // 2. Kategorie aus DB laden
    const { data: category } = await supabase
      .from('categories')
      .select('lesson_duration, code')
      .eq('code', categoryCode)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    // 3. Staff preferred_durations parsen
    let finalDurations: number[] = []
    
    if (staffSettings?.preferred_durations) {
      try {
        // Try to parse as JSON first
        finalDurations = JSON.parse(staffSettings.preferred_durations)
      } catch {
        // Fallback: parse as comma-separated string
        finalDurations = staffSettings.preferred_durations
          .split(',')
          .map((d: string) => parseInt(d.trim()))
          .filter((d: number) => !isNaN(d) && d > 0)
      }
      finalDurations.sort((a: number, b: number) => a - b)
    } else {
      finalDurations = [category?.lesson_duration || 45]
    }

    logger.debug('✅ Durations loaded:', finalDurations)

    return { durations: finalDurations }

  } catch (error: any) {
    logger.error('Error loading durations:', error)
    throw error
  }
})
