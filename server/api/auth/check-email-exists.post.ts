import { getSupabase } from '~/utils/supabase'
import { defineEventHandler, readBody, createError } from 'h3'
import { validateEmail } from '~/server/utils/validators'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email, tenantId } = body

    // Validate inputs
    if (!email || !validateEmail(email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige E-Mail-Adresse'
      })
    }

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Mandanten-ID erforderlich'
      })
    }

    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Check if email exists in this tenant
    const { data: existingUser, error } = await serviceSupabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('email', email.toLowerCase().trim())
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = "no rows found" which is expected
      console.error('❌ Database error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Prüfen der E-Mail'
      })
    }

    logger.debug('Check email exists', 'Email:', email, 'Exists:', !!existingUser)

    return {
      exists: !!existingUser,
      message: existingUser ? 'E-Mail existiert bereits' : 'E-Mail ist verfügbar'
    }
  } catch (error: any) {
    console.error('❌ Check email error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Fehler beim Prüfen der E-Mail'
    })
  }
})
