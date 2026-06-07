// server/api/students/check-email.post.ts
// Real-time email availability check for onboarding

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, tenantId } = body

    if (!email || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email and tenantId are required'
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        available: false,
        message: 'Ungültige E-Mail-Adresse'
      }
    }

    const supabase = getSupabaseAdmin()

    // Check if email is already linked to an active CLIENT account in this tenant
    const { data: existingUserInTenant, error: dbError } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .not('auth_user_id', 'is', null)
      .maybeSingle()

    if (dbError) {
      logger.error('❌ Local users table email check error:', dbError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Could not check local email availability'
      })
    }

    return {
      available: !existingUserInTenant,
      message: existingUserInTenant
        ? 'Diese E-Mail-Adresse ist bereits im System registriert (global)'
        : '✓ E-Mail verfügbar'
    }

  } catch (error: any) {
    logger.error('❌ Error in check-email API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Email check failed'
    })
  }
})
