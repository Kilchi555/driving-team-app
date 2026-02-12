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

    // Check if email already exists in this tenant
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      logger.error('❌ Email check error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Could not check email availability'
      })
    }

    return {
      available: !existingUser,
      message: existingUser 
        ? 'Diese E-Mail-Adresse ist bereits registriert'
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
