import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    const { data: tokenData, error } = await supabase
      .from('calendar_tokens')
      .select('token')
      .eq('staff_id', userProfile.id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      logger.error('❌ Error loading calendar token:', error)
      throw createError({ statusCode: 500, message: 'Failed to load calendar token' })
    }

    const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://simy.ch'

    return {
      success: true,
      token: tokenData?.token || null,
      calendarLink: tokenData?.token ? `${baseUrl}/api/calendar/ics?token=${tokenData.token}` : null
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || 'Failed to load calendar token' })
  }
})
