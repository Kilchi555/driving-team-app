import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { encryptSecret } from '~/server/utils/encryption'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'

type SariSecretRow = {
  tenant_id: string
  secret_type: 'sari_credentials'
  secret_name: string
  secret_value: string
}

/**
 * POST /api/sari/save-settings
 * Save SARI configuration and credentials for a tenant
 * 
 * ✅ Credentials are encrypted and stored in tenant_secrets table
 * ✅ Configuration flags are stored in tenants table
 */
export default defineEventHandler(async (event) => {
  try {
    // Get Supabase client with session from Authorization header
    const supabase = getSupabaseServerWithSession(event)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.debug('SARI save-settings auth error:', { authError, hasUser: !!user })
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile to check role
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (userProfile.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can configure SARI settings'
      })
    }

    // 3. Get request body
    const body = await readBody(event)
    const {
      sari_enabled,
      sari_environment,
      sari_client_id,
      sari_client_secret,
      sari_username,
      sari_password
    } = body

    const tenantId = userProfile.tenant_id

    logger.debug('Saving SARI settings', {
      tenant_id: tenantId,
      sari_enabled,
      sari_environment
    })

    // Empty string, null and undefined are omitted. Whitespace-only values stay
    // truthy, matching the previous writer. Clearing a stored secret is unsupported.
    const secretsToUpsert: SariSecretRow[] = []
    const addSecret = (secretName: string, value: string | null | undefined) => {
      if (!value) return
      secretsToUpsert.push({
        tenant_id: tenantId,
        secret_type: 'sari_credentials',
        secret_name: secretName,
        secret_value: encryptSecret(value)
      })
    }

    addSecret('sari_client_id', sari_client_id)
    addSecret('sari_client_secret', sari_client_secret)
    addSecret('sari_username', sari_username)
    addSecret('sari_password', sari_password)

    if (secretsToUpsert.length > 0) {
      const { error: secretsError } = await supabaseAdmin
        .from('tenant_secrets')
        .upsert(secretsToUpsert, {
          onConflict: 'tenant_id,secret_type,secret_name'
        })

      if (secretsError) {
        throw new Error(`Failed to save secrets: ${secretsError.message}`)
      }

      logger.info(`✅ Saved ${secretsToUpsert.length} SARI secrets (encrypted)`, {
        tenant_id: tenantId
      })
    }

    // Flags run after secrets. A failed secret upsert returns before this update,
    // so this save cannot turn sari_enabled on when the submitted credentials did not persist.
    const { error: configError } = await supabaseAdmin
      .from('tenants')
      .update({ sari_enabled, sari_environment })
      .eq('id', tenantId)

    if (configError) {
      throw new Error(`Failed to update SARI config: ${configError.message}`)
    }

    logger.debug('✅ SARI config updated', { tenant_id: tenantId })

    // Audit log
    await logAudit({
      user_id: userProfile.id,
      action: 'save_sari_settings',
      resource_type: 'tenant_settings',
      resource_id: userProfile.tenant_id,
      status: 'success',
      details: {
        sari_enabled,
        sari_environment,
        credentials_provided: !!sari_client_id
      },
      ip_address: getHeader(event, 'x-forwarded-for') || 'unknown'
    }).catch(auditErr => logger.warn('⚠️ Audit logging failed:', auditErr))

    return {
      success: true,
      message: 'SARI settings saved successfully',
      config: {
        sari_enabled,
        sari_environment
      }
    }
  } catch (error: any) {
    logger.error('Failed to save SARI settings', { error: error.message })

    if (error.statusCode) {
      throw mapSupabaseError(error)
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save settings: ${error.message}`
    })
  }
})

