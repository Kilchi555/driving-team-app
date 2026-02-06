import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'

/**
 * Lookup customer data from SARI by faberid and birthdate
 * Returns full customer information including address
 * Public endpoint - no authentication required (uses tenantId from request)
 */
export default defineEventHandler(async (event) => {
  // Get request body
  const body = await readBody(event)
  const { faberid, birthdate, tenantId } = body

  if (!faberid || !birthdate || !tenantId) {
    throw createError({
      statusCode: 400,
      message: 'faberid, birthdate, and tenantId are required'
    })
  }

  // Validate birthdate format (YYYY-MM-DD)
  const birthdateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!birthdateRegex.test(birthdate)) {
    throw createError({
      statusCode: 400,
      message: 'birthdate must be in format YYYY-MM-DD'
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Get tenant's SARI configuration (only env, no credentials)
    const { data: tenantConfig, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_environment')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenantConfig) {
      throw createError({
        statusCode: 404,
        message: 'Tenant not found'
      })
    }

    // ✅ Load SARI credentials securely
    let sariSecrets
    try {
      sariSecrets = await getTenantSecretsSecure(
        tenantId,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'SARI_LOOKUP'
      )
    } catch (secretsErr: any) {
      logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
      throw createError({
        statusCode: 400,
        message: 'SARI credentials not configured for this tenant'
      })
    }

    // Create SARI client
    const sari = new SARIClient({
      environment: tenantConfig.sari_environment || 'production',
      clientId: sariSecrets.SARI_CLIENT_ID,
      clientSecret: sariSecrets.SARI_CLIENT_SECRET,
      username: sariSecrets.SARI_USERNAME || '',
      password: sariSecrets.SARI_PASSWORD || ''
    })

    // Lookup customer in SARI
    console.log('🔍 SARI Lookup with:', { faberid, birthdate })
    const customer = await sari.getCustomer(faberid, birthdate)
    console.log('✅ SARI Customer found:', customer)

    return {
      success: true,
      customer: {
        firstname: customer.firstname || '',
        lastname: customer.lastname || '',
        email: customer.email || '',
        phone: customer.phone || '',
        birthdate: customer.birthdate || birthdate,
        address: customer.address || '',
        zip: customer.zip || '',
        city: customer.city || '',
        licenses: customer.licenses || []
      }
    }
  } catch (error: any) {
    console.error('❌ SARI lookup error:', error.message)
    console.error('Full error details:', {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      stack: error.stack
    })
    
    // Log the specific error
    if (error.message?.includes('SARI error:')) {
      console.error('📛 SARI API returned error:', error.message)
    }
    if (error.message?.includes('failed:')) {
      console.error('📛 SARI HTTP error:', error.message)
    }
    
    // Better error messages for specific SARI errors
    if (error.message?.includes('MISMATCH_BIRTHDATE_FABERID')) {
      return {
        success: false,
        message: 'Ausweisnummer und/oder Geburtsdatum sind falsch. Bitte überprüfen Sie Ihre Eingaben.'
      }
    }
    
    // Check if it's a "not found" error
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return {
        success: false,
        message: 'Ausweisnummer und/oder Geburtsdatum sind falsch. Bitte überprüfen Sie Ihre Eingaben.'
      }
    }

    throw createError({
      statusCode: 500,
      message: `SARI Fehler: ${error.message}`
    })
  }
})
