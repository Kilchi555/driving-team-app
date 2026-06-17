import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { encryptSecret } from '~/server/utils/encryption'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

/**
 * POST /api/sari/czv/save-settings
 * Speichert SARI CZV und FL Zugangsdaten für einen Tenant.
 * Credentials werden verschlüsselt in tenant_secrets gespeichert.
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
      .select('tenant_id, role, id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      throw createError({ statusCode: 403, statusMessage: 'Benutzerprofil nicht gefunden' })
    }
    if (userProfile.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: 'Nur Admins können SARI-Einstellungen ändern' })
    }

    const body = await readBody(event)
    const {
      // CZV
      sari_czv_enabled,
      sari_czv_environment,
      sari_czv_client_id,
      sari_czv_client_secret,
      sari_czv_username,
      sari_czv_password,
      sari_czv_registration_id,
      // FL
      sari_fl_enabled,
      sari_fl_environment,
      sari_fl_client_id,
      sari_fl_client_secret,
      sari_fl_username,
      sari_fl_password,
      sari_fl_registration_id
    } = body

    const tenantId = userProfile.tenant_id

    // Konfigurationsflags in tenants-Tabelle
    const configData: Record<string, any> = {}
    if (sari_czv_enabled !== undefined) configData.sari_czv_enabled = sari_czv_enabled
    if (sari_czv_environment !== undefined) configData.sari_czv_environment = sari_czv_environment
    if (sari_fl_enabled !== undefined) configData.sari_fl_enabled = sari_fl_enabled
    if (sari_fl_environment !== undefined) configData.sari_fl_environment = sari_fl_environment

    if (Object.keys(configData).length > 0) {
      const { error: configError } = await supabaseAdmin
        .from('tenants')
        .update(configData)
        .eq('id', tenantId)

      if (configError) {
        throw new Error(`Konfiguration konnte nicht gespeichert werden: ${configError.message}`)
      }
    }

    // Credentials verschlüsselt in tenant_secrets
    const secretsToUpsert: any[] = []

    const addSecret = (type: string, value: string | undefined) => {
      if (value?.trim()) {
        secretsToUpsert.push({
          tenant_id: tenantId,
          secret_type: type,
          secret_value: encryptSecret(value.trim()),
          updated_by: userProfile.id
        })
      }
    }

    // CZV Secrets
    addSecret('SARI_CZV_CLIENT_ID', sari_czv_client_id)
    addSecret('SARI_CZV_CLIENT_SECRET', sari_czv_client_secret)
    addSecret('SARI_CZV_USERNAME', sari_czv_username)
    addSecret('SARI_CZV_PASSWORD', sari_czv_password)
    addSecret('SARI_CZV_REGISTRATION_ID', sari_czv_registration_id)

    // FL Secrets
    addSecret('SARI_FL_CLIENT_ID', sari_fl_client_id)
    addSecret('SARI_FL_CLIENT_SECRET', sari_fl_client_secret)
    addSecret('SARI_FL_USERNAME', sari_fl_username)
    addSecret('SARI_FL_PASSWORD', sari_fl_password)
    addSecret('SARI_FL_REGISTRATION_ID', sari_fl_registration_id)

    if (secretsToUpsert.length > 0) {
      const { error: secretsError } = await supabaseAdmin
        .from('tenant_secrets')
        .upsert(secretsToUpsert, { onConflict: 'tenant_id,secret_type' })

      if (secretsError) {
        throw new Error(`Secrets konnten nicht gespeichert werden: ${secretsError.message}`)
      }

      logger.info(`✅ ${secretsToUpsert.length} SARI CZV/FL Secrets verschlüsselt gespeichert`, { tenantId })
    }

    await logAudit({
      user_id: userProfile.id,
      action: 'save_sari_czv_fl_settings',
      resource_type: 'tenant_settings',
      resource_id: tenantId,
      status: 'success',
      details: {
        czv_enabled: sari_czv_enabled,
        fl_enabled: sari_fl_enabled,
        czv_secrets_provided: !!(sari_czv_client_id || sari_czv_registration_id),
        fl_secrets_provided: !!(sari_fl_client_id || sari_fl_registration_id)
      },
      ip_address: getHeader(event, 'x-forwarded-for') || 'unknown'
    }).catch((e) => logger.warn('Audit-Log fehlgeschlagen:', e))

    return { success: true, message: 'SARI CZV/FL Einstellungen erfolgreich gespeichert' }
  } catch (error: any) {
    logger.error('Fehler beim Speichern der SARI CZV/FL Einstellungen:', { error: error.message })
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
