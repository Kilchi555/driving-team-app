/**
 * POST /api/admin/save-tenant-secrets
 * 
 * Sichere Admin-Endpoint zum Speichern von Tenant Secrets
 * 
 * ✅ Auth: Nur Admins
 * ✅ Encrypt: Secrets werden verschlüsselt gespeichert
 * ✅ Audit: Alle Änderungen werden geloggt
 * ✅ Validation: Input wird validiert
 */

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { encryptSecret } from '~/server/utils/encryption'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

interface SaveSecretsRequest {
  tenant_id: string
  secrets: Record<string, string>
}

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: Authentication
    logger.debug('🔐 Save tenant secrets request received')

    const supabase = getSupabaseServerWithSession(event)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('⚠️ Authentication failed')
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // ✅ LAYER 2: Authorization - Check if user is admin
    const supabaseAdmin = getSupabaseAdmin()

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ User profile not found')
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      logger.warn(`⚠️ Unauthorized: User ${user.id} is ${userProfile.role}, not admin`, {
        userId: userProfile.id,
        role: userProfile.role
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Only admins can manage tenant secrets'
      })
    }

    // ✅ LAYER 3: Read and validate request body
    const body: SaveSecretsRequest = await readBody(event)

    if (!body.tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required'
      })
    }

    if (!body.secrets || Object.keys(body.secrets).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'At least one secret must be provided'
      })
    }

    // ✅ LAYER 4: Verify admin owns this tenant (or is super_admin)
    if (userProfile.role === 'admin' && userProfile.tenant_id !== body.tenant_id) {
      logger.warn(`⚠️ Admin ${user.id} tried to modify tenant ${body.tenant_id} they don't own`)
      throw createError({
        statusCode: 403,
        statusMessage: 'You can only manage secrets for your own tenant'
      })
    }

    logger.debug('✅ Authorization passed', {
      userId: userProfile.id,
      tenantId: body.tenant_id,
      secretCount: Object.keys(body.secrets).length
    })

    // ✅ LAYER 5: Encrypt and save each secret
    const secretsToUpsert: any[] = []

    for (const [secretType, secretValue] of Object.entries(body.secrets)) {
      // Validiere secret type
      if (!secretType || typeof secretType !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid secret type: ${secretType}`
        })
      }

      // Validiere secret value
      if (!secretValue || typeof secretValue !== 'string' || secretValue.trim().length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Secret value for ${secretType} cannot be empty`
        })
      }

      // Verschlüssle secret
      const encryptedValue = encryptSecret(secretValue.trim())

      secretsToUpsert.push({
        tenant_id: body.tenant_id,
        secret_type: secretType,
        secret_value: encryptedValue,
        updated_by: userProfile.id,
        updated_at: new Date().toISOString()
      })

      logger.debug(`🔒 Prepared secret for encryption: ${secretType}`)
    }

    // ✅ LAYER 6: Upsert secrets to database
    const { data: upsertedSecrets, error: upsertError } = await supabaseAdmin
      .from('tenant_secrets')
      .upsert(secretsToUpsert, {
        onConflict: 'tenant_id,secret_type'
      })
      .select('secret_type, updated_at')

    if (upsertError) {
      logger.error('❌ Failed to upsert secrets:', upsertError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save secrets: ${upsertError.message}`
      })
    }

    logger.info(`✅ Successfully saved ${upsertedSecrets?.length || 0} secrets for tenant ${body.tenant_id}`)

    // ✅ LAYER 7: Audit logging
    await logAudit({
      user_id: userProfile.id,
      action: 'save_tenant_secrets',
      resource_type: 'tenant_secrets',
      resource_id: body.tenant_id,
      status: 'success',
      details: {
        tenant_id: body.tenant_id,
        secret_types_updated: Object.keys(body.secrets),
        count: Object.keys(body.secrets).length
      },
      ip_address: getHeader(event, 'x-forwarded-for') || 'unknown'
    }).catch(auditErr => logger.warn('⚠️ Audit logging failed:', auditErr))

    return {
      success: true,
      message: `Successfully saved ${Object.keys(body.secrets).length} secret(s)`,
      updated: upsertedSecrets?.map(s => ({
        secret_type: s.secret_type,
        updated_at: s.updated_at
      })) || []
    }
  } catch (error: any) {
    logger.error('❌ Save tenant secrets error:', {
      error: error.message,
      statusCode: error.statusCode
    })

    // Audit log for failed attempt
    try {
      const headerAuth = getHeader(event, 'authorization')
      await logAudit({
        action: 'save_tenant_secrets',
        resource_type: 'tenant_secrets',
        status: 'failed',
        error_message: error.statusMessage || error.message,
        ip_address: getHeader(event, 'x-forwarded-for') || 'unknown'
      }).catch(() => {})
    } catch {}

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save secrets: ${error.message}`
    })
  }
})
