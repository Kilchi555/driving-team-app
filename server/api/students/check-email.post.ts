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

    // 1. Check if email already exists globally in auth.users (Supabase's internal auth table)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      search: email.trim().toLowerCase()
    })

    if (authError) {
      logger.error('❌ Global auth.users email check error:', authError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Could not check global email availability'
      })
    }

    const authUserExists = authUsers?.users.some(u => 
      u.email?.toLowerCase() === email.trim().toLowerCase()
    )

    if (authUserExists) {
      return {
        available: false,
        message: 'Diese E-Mail-Adresse ist bereits im System registriert (global)'
      }
    }

    // 2. Check if email already exists in the local 'users' profile table for this specific tenant
    const { data: existingUserInTenant, error: dbError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', tenantId)
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
        ? 'Diese E-Mail wird bereits in diesem Tenant verwendet'
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
