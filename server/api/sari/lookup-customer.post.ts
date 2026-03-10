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

    // If it's already a createError (e.g. tenant not found), re-throw as-is
    if (error.statusCode) throw error

    // Extract the SARI status code from the error message (e.g. "SARI error: PERSON_NOT_FOUND")
    const sariStatus = error.message?.replace('SARI error: ', '').trim()

    const SARI_USER_MESSAGES: Record<string, string> = {
      PERSON_NOT_FOUND:
        'Person nicht gefunden. Bitte überprüfe deine Fahrausweisnummer und dein Geburtsdatum.',
      MISMATCH_BIRTHDATE_FABERID:
        'Fahrausweisnummer und Geburtsdatum stimmen nicht überein. Bitte überprüfe deine Eingaben.',
      INVALID_FABERID:
        'Die eingegebene Fahrausweisnummer ist ungültig. Bitte prüfe das Format.',
      FABERID_NOT_FOUND:
        'Diese Fahrausweisnummer wurde nicht gefunden. Bitte prüfe deine Eingabe.',
      PERSON_ALREADY_REGISTERED:
        'Diese Person ist bereits für diesen Kurs angemeldet.',
      COURSE_NOT_FOUND:
        'Der Kurs wurde nicht gefunden. Bitte kontaktiere uns direkt.',
      COURSE_FULL:
        'Dieser Kurs ist bereits ausgebucht.',
      COURSE_CLOSED:
        'Die Anmeldefrist für diesen Kurs ist abgelaufen.',
      INVALID_BIRTHDATE:
        'Das eingegebene Geburtsdatum ist ungültig. Bitte verwende das Format TT.MM.JJJJ.',
    }

    const userMessage = SARI_USER_MESSAGES[sariStatus]
    if (userMessage) {
      return { success: false, sariStatus, message: userMessage }
    }

    // Fallback for unexpected SARI errors – include raw status so it's visible
    return {
      success: false,
      sariStatus,
      message: sariStatus
        ? `SARI-Fehler: ${sariStatus}. Bitte kontaktiere uns falls das Problem weiterhin besteht.`
        : 'Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut oder kontaktiere uns.',
    }
  }
})
