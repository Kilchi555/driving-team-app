import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const { email } = await readBody(event)

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'E-Mail erforderlich'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user and their MFA methods
    logger.debug('🔍 Fetching MFA methods for:', email.substring(0, 3) + '***')

    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      logger.debug('❌ User not found:', email)
      // Return empty array instead of error to prevent enumeration
      return {
        success: true,
        methods: []
      }
    }

    // Get all MFA methods for this user
    const { data: mfaMethods, error: methodsError } = await adminSupabase
      .from('mfa_methods')
      .select('id, type, verified, last_used_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('verified', { ascending: false })
      .order('last_used_at', { ascending: false })

    if (methodsError) {
      console.warn('⚠️ Failed to fetch MFA methods:', methodsError)
      return {
        success: true,
        methods: []
      }
    }

    // Filter to only verified methods and format
    const availableMethods = (mfaMethods || [])
      .filter(m => m.verified)
      .map(m => ({
        id: m.id,
        name: getMFAMethodName(m.type),
        type: m.type,
        verified: m.verified,
        lastUsed: m.last_used_at
      }))

    logger.debug('✅ Found MFA methods:', availableMethods.length)

    return {
      success: true,
      methods: availableMethods
    }
  } catch (error: any) {
    console.error('Get MFA methods error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Abrufen der MFA-Methoden'
    })
  }
})

function getMFAMethodName(type: string): string {
  const names: Record<string, string> = {
    sms: 'SMS',
    email: 'E-Mail',
    totp: 'Authenticator App'
  }
  return names[type] || type
}



