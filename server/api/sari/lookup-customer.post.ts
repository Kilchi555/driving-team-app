import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'

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
    // Get tenant's SARI configuration
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('sari_client_id, sari_client_secret, sari_username, sari_password, sari_environment')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      throw createError({
        statusCode: 404,
        message: 'Tenant not found or SARI not configured'
      })
    }

    if (!tenant.sari_client_id || !tenant.sari_client_secret) {
      throw createError({
        statusCode: 400,
        message: 'SARI credentials not configured for this tenant'
      })
    }

    // Create SARI client
    const sari = new SARIClient({
      environment: tenant.sari_environment || 'production',
      clientId: tenant.sari_client_id,
      clientSecret: tenant.sari_client_secret,
      username: tenant.sari_username || '',
      password: tenant.sari_password || ''
    })

    // Lookup customer in SARI
    console.log('🔍 SARI Lookup with:', { faberid, birthdate })
    const customer = await sari.getCustomer(faberid, birthdate)
    console.log('✅ SARI Customer found:', customer)

    return {
      success: true,
      data: {
        first_name: customer.firstname || '',
        last_name: customer.lastname || '',
        email: customer.email || '',
        phone: customer.phone || '',
        birthdate: customer.birthdate || birthdate,
        street: customer.address || '',
        zip: customer.zip || '',
        city: customer.city || ''
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
