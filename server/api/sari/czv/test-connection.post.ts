import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARICoursesV3Client } from '~/utils/sariCoursesV3Client'
import { logger } from '~/utils/logger'

/**
 * POST /api/sari/czv/test-connection
 * Testet die SARI CZV oder FL Verbindung via getVersion (Echo-Test).
 * Credentials werden direkt aus dem Request-Body verwendet (noch nicht gespeicherte Werte testbar).
 */
export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseServerWithSession(event)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Authentifizierung erforderlich' })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung' })
    }

    const body = await readBody(event)
    const { environment, clientId, clientSecret, username, password, registrationId } = body

    if (!clientId || !clientSecret || !username || !password || !registrationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Alle Felder (Client ID, Secret, Benutzername, Passwort, Registration ID) sind erforderlich'
      })
    }

    const client = new SARICoursesV3Client({
      environment: environment || 'test',
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      username: username.trim(),
      password: password.trim(),
      registrationId: registrationId.trim()
    })

    const versionResult = await client.getVersion('driving-team-test')

    logger.info('✅ SARI CZV/FL Verbindungstest erfolgreich', { versionResult })

    return {
      success: true,
      message: `Verbindung erfolgreich! Server-Antwort: ${versionResult}`
    }
  } catch (error: any) {
    logger.error('SARI CZV/FL Verbindungstest fehlgeschlagen:', { error: error.message })
    throw createError({
      statusCode: 400,
      statusMessage: `Verbindung fehlgeschlagen: ${error.message}`
    })
  }
})
