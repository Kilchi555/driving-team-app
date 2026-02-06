import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { encryptSecret } from '~/server/utils/encryption'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

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

    logger.debug('Saving SARI settings', {
      tenant_id: userProfile.tenant_id,
      sari_enabled,
      sari_environment
    })

    // ✅ Update configuration in tenants table
    const configData: Record<string, any> = { sari_enabled, sari_environment }

    const { error: configError } = await supabaseAdmin
      .from('tenants')
      .update(configData)
      .eq('id', userProfile.tenant_id)

    if (configError) {
      throw new Error(`Failed to update SARI config: ${configError.message}`)
    }

    logger.debug('✅ SARI config updated', { tenant_id: userProfile.tenant_id })

    // ✅ If credentials provided, save them encrypted in tenant_secrets
    if (sari_client_id || sari_client_secret || sari_username || sari_password) {
      const secretsToUpsert: any[] = []

      if (sari_client_id) {
        secretsToUpsert.push({
          tenant_id: userProfile.tenant_id,
          secret_type: 'SARI_CLIENT_ID',
          secret_value: encryptSecret(sari_client_id),
          updated_by: userProfile.id
        })
      }

      if (sari_client_secret) {
        secretsToUpsert.push({
          tenant_id: userProfile.tenant_id,
          secret_type: 'SARI_CLIENT_SECRET',
          secret_value: encryptSecret(sari_client_secret),
          updated_by: userProfile.id
        })
      }

      if (sari_username) {
        secretsToUpsert.push({
          tenant_id: userProfile.tenant_id,
          secret_type: 'SARI_USERNAME',
          secret_value: encryptSecret(sari_username),
          updated_by: userProfile.id
        })
      }

      if (sari_password) {
        secretsToUpsert.push({
          tenant_id: userProfile.tenant_id,
          secret_type: 'SARI_PASSWORD',
          secret_value: encryptSecret(sari_password),
          updated_by: userProfile.id
        })
      }

      if (secretsToUpsert.length > 0) {
        const { error: secretsError } = await supabaseAdmin
          .from('tenant_secrets')
          .upsert(secretsToUpsert, {
            onConflict: 'tenant_id,secret_type'
          })

        if (secretsError) {
          throw new Error(`Failed to save secrets: ${secretsError.message}`)
        }

        logger.info(`✅ Saved ${secretsToUpsert.length} SARI secrets (encrypted)`, {
          tenant_id: userProfile.tenant_id
        })
      }
    }

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
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save settings: ${error.message}`
    })
  }
})

