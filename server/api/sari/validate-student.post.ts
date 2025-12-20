/**
 * SARI Validate Student API
 * Validates a student's Ausweisnummer (faberid) against SARI database
 * Returns student info and license categories if found
 */

import { createClient } from '@supabase/supabase-js'
import { SARIClient } from '~/utils/sariClient'

export default defineEventHandler(async (event) => {
  try {
    // Get authorization header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({ statusCode: 401, message: 'Authentication required' })
    }

    // Create Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw createError({ statusCode: 500, message: 'Supabase configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, message: 'Invalid token' })
    }

    // Get request body
    const body = await readBody(event)
    const { faberid, birthdate } = body

    if (!faberid || !birthdate) {
      throw createError({ 
        statusCode: 400, 
        message: 'Missing required fields: faberid, birthdate' 
      })
    }

    // Get user profile for tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, message: 'User profile not found' })
    }

    // Get tenant SARI credentials
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_enabled, sari_environment, sari_client_id, sari_client_secret, sari_username, sari_password')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({ statusCode: 500, message: 'Tenant configuration not found' })
    }

    if (!tenant.sari_enabled) {
      throw createError({ statusCode: 400, message: 'SARI integration is not enabled' })
    }

    // Create SARI client
    const sariClient = new SARIClient({
      environment: tenant.sari_environment || 'test',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username,
      password: tenant.sari_password
    })

    // Format birthdate as YYYY-MM-DD
    const formattedBirthdate = new Date(birthdate).toISOString().split('T')[0]

    // Validate student in SARI
    console.log(`🔍 Validating student in SARI: faberid=${faberid}, birthdate=${formattedBirthdate}`)
    
    const customer = await sariClient.getCustomer(faberid, formattedBirthdate)

    console.log(`✅ Student found in SARI: ${customer.firstname} ${customer.lastname}`)

    return {
      success: true,
      valid: true,
      customer: {
        faberid: customer.faberid,
        firstname: customer.firstname,
        lastname: customer.lastname,
        address: customer.address,
        zip: customer.zip,
        city: customer.city,
        licenses: customer.licenses
      }
    }

  } catch (error: any) {
    console.error('SARI validate-student error:', error)
    
    // Handle SARI specific errors
    if (error.message?.includes('PERSON_NOT_FOUND')) {
      return {
        success: true,
        valid: false,
        message: 'Student not found in SARI. Please verify the Ausweisnummer and birthdate.'
      }
    }
    
    if (error.message?.includes('INVALID_PARAMETER')) {
      return {
        success: true,
        valid: false,
        message: 'Invalid Ausweisnummer format. It should be 9 digits (e.g., 001234567).'
      }
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to validate student'
    })
  }
})


