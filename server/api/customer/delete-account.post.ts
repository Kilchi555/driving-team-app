import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * Customer Account Deletion (Apple/Google compliant in-app deletion).
 *
 * What this does:
 *   - Anonymizes personally identifiable information (PII) in the `users` row.
 *   - Sets `is_active = false` so the user cannot log in anymore.
 *   - Deletes the Supabase Auth account (sign-in is no longer possible).
 *   - Removes the auth-user link so the row stops appearing in queries.
 *
 * What this DOES NOT delete (intentionally, due to legal retention):
 *   - Payments, invoices, payment_audit_logs (10-year Swiss bookkeeping duty)
 *   - Already-completed appointments (audit trail, instructor records)
 *   - Audit logs (regulatory compliance)
 *
 * The user is informed of this in the confirmation dialog. After the delete:
 *   - User cannot log in
 *   - All personal data (name, address, phone, email, birthdate, profession) is anonymized
 *   - Auth row is removed → no way to recover
 */
export default defineEventHandler(async (event) => {
  try {
    logger.debug('🗑️ [delete-account] Handler started')

    const body = await readBody(event).catch(() => ({}))
    const confirmation: string | undefined = body?.confirmation

    if (confirmation !== 'LÖSCHEN') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bestätigung fehlt. Bitte gib "LÖSCHEN" ein, um dein Konto unwiderruflich zu löschen.'
      })
    }

    const authHeader = getHeader(event, 'authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Nicht authentifiziert' })
    }
    const accessToken = authHeader.substring(7)

    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Nicht authentifiziert' })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: userRow, error: userFetchError } = await serviceSupabase
      .from('users')
      .select('id, email, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userFetchError || !userRow) {
      console.error('❌ [delete-account] User row not found:', userFetchError)
      throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })
    }

    if (userRow.role !== 'client') {
      logger.warn('⚠️ [delete-account] Non-client tried to self-delete:', {
        userId: userRow.id, role: userRow.role
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Mitarbeiter- und Admin-Konten können nicht über die App gelöscht werden. Bitte wende dich an deinen Administrator.'
      })
    }

    const userId = userRow.id
    const originalEmail = userRow.email
    const anonymizedEmail = `deleted_${userId}@simy.local`

    logger.debug('🗑️ [delete-account] Anonymizing user data for:', { userId, originalEmail })

    const { error: updateError } = await serviceSupabase
      .from('users')
      .update({
        first_name: 'Gelöscht',
        last_name: '',
        email: anonymizedEmail,
        phone: '',
        birthdate: null,
        street: null,
        street_nr: null,
        zip: null,
        city: null,
        profession: null,
        auth_user_id: null,
        is_active: false
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ [delete-account] Anonymization failed:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Anonymisieren der Benutzerdaten: ' + updateError.message
      })
    }

    const { error: docDeleteError } = await serviceSupabase
      .from('user_documents')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('user_id', userId)
      .is('deleted_at', null)

    if (docDeleteError) {
      logger.warn('⚠️ [delete-account] Soft-deleting documents failed (continuing):', docDeleteError)
    }

    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('❌ [delete-account] Auth deletion failed:', authDeleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Löschen des Auth-Kontos: ' + authDeleteError.message
      })
    }

    try {
      await serviceSupabase.from('audit_logs').insert({
        user_id: null,
        tenant_id: userRow.tenant_id,
        action: 'account_self_deleted',
        details: {
          deleted_user_id: userId,
          deleted_email: originalEmail,
          deleted_at: new Date().toISOString(),
          method: 'in_app_self_service'
        }
      })
    } catch (auditErr) {
      logger.warn('⚠️ [delete-account] Audit log insert failed (non-fatal):', auditErr)
    }

    logger.debug('✅ [delete-account] Account deletion completed for user:', userId)

    return {
      success: true,
      message: 'Dein Konto wurde erfolgreich gelöscht. Du wirst jetzt abgemeldet.'
    }
  } catch (error: any) {
    console.error('❌ [delete-account] Error:', error)
    throw error
  }
})
