/**
 * Cron Job: Sync SARI Courses
 * POST /api/cron/sync-sari-courses
 * 
 * Runs periodically to sync courses from SARI for all enabled tenants
 * 
 * Security:
 * ✅ Layer 1: Auth - Vercel CRON_SECRET verification
 * ✅ Layer 2: Rate Limiting - Prevents re-trigger within 30 seconds
 * ✅ Layer 3: Audit Logging - Logs every execution
 * ✅ Layer 7: Error Handling - Detailed error messages
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { SARISyncEngine } from '~/server/utils/sari-sync-engine'
import { logger } from '~/utils/logger'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { assertCronRequest } from '~/server/utils/cron-auth'

interface CronResult {
  success: boolean
  tenants_processed: number
  total_syncs: number
  failed_tenants: Array<{
    tenant_id: string
    tenant_name: string
    error: string
  }>
}

export default defineEventHandler(async (event): Promise<CronResult> => {
  assertCronRequest(event)
  const startTime = new Date()

  try {
    // Layer 1: Authentication - Verify Vercel Cron token
    if (!verifyCronToken(event)) {
      logger.error('🚨 Unauthorized cron request to sync-sari-courses')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Invalid cron token'
      })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    // Layer 2: Rate Limiting - Prevent re-trigger
    const canRun = await checkCronRateLimit(supabaseAdmin, 'sync-sari-courses', 30)
    if (!canRun) {
      logger.warn('⏱️ Rate limited: sync-sari-courses ran too recently')
      
      await logCronExecution(supabaseAdmin, 'sync-sari-courses', 'success', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: 'Skipped due to rate limit'
      })
      
      return {
        success: false,
        tenants_processed: 0,
        total_syncs: 0,
        failed_tenants: []
      }
    }

    logger.debug('🔄 SARI Cron Job started')

    // 1. Get all tenants with SARI enabled (nur config, keine credentials!)
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, sari_enabled, sari_environment')
      .eq('sari_enabled', true)

    if (tenantsError) {
      const errorMsg = `Failed to fetch tenants: ${tenantsError.message}`
      logger.error(`❌ ${errorMsg}`)
      
      // Layer 3: Audit Logging - Log failure
      await logCronExecution(supabaseAdmin, 'sync-sari-courses', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: errorMsg
      })
      
      throw new Error(errorMsg)
    }

    if (!tenants || tenants.length === 0) {
      logger.debug('No tenants with SARI enabled')
      
      // Layer 3: Audit Logging - Log success (no work)
      await logCronExecution(supabaseAdmin, 'sync-sari-courses', 'success', {
        processedCount: 0,
        startedAt: startTime,
        completedAt: new Date()
      })
      
      return {
        success: true,
        tenants_processed: 0,
        total_syncs: 0,
        failed_tenants: []
      }
    }

    logger.debug(`📊 Found ${tenants.length} tenants with SARI enabled`)

    const failedTenants: Array<{
      tenant_id: string
      tenant_name: string
      error: string
    }> = []
    let totalSyncs = 0

    // 2. Process each tenant
    for (const tenant of tenants) {
      try {
        // ✅ Load SARI credentials securely
        let sariSecrets
        try {
          sariSecrets = await getTenantSecretsSecure(
            tenant.id,
            ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
            'CRON_SYNC_SARI_COURSES'
          )
        } catch (secretsErr: any) {
          logger.warn(`⚠️ Failed to load SARI credentials for tenant ${tenant.name}:`, secretsErr.message)
          failedTenants.push({
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            error: `SARI credentials not configured: ${secretsErr.message}`
          })
          continue
        }

        logger.debug(`🔄 Syncing tenant: ${tenant.name}`, {
          tenant_id: tenant.id
        })

        // Create SARI client for this tenant
        const sari = new SARIClient({
          environment: (tenant.sari_environment || 'test') as 'test' | 'production',
          clientId: sariSecrets.SARI_CLIENT_ID,
          clientSecret: sariSecrets.SARI_CLIENT_SECRET,
          username: sariSecrets.SARI_USERNAME,
          password: sariSecrets.SARI_PASSWORD
        })

        // Create sync engine
        const syncEngine = new SARISyncEngine(supabaseAdmin, sari, tenant.id)

        // Sync VKU courses
        const vkuResult = await syncEngine.syncAllCourses('VKU')
        logger.debug(`✅ VKU sync completed for ${tenant.name}`, {
          synced: vkuResult.synced_count,
          errors: vkuResult.error_count
        })

        // Sync PGS courses
        const pgsResult = await syncEngine.syncAllCourses('PGS')
        logger.debug(`✅ PGS sync completed for ${tenant.name}`, {
          synced: pgsResult.synced_count,
          errors: pgsResult.error_count
        })

        totalSyncs += 2 // VKU + PGS

        // Update tenant sync timestamp
        await supabaseAdmin
          .from('tenants')
          .update({ sari_last_sync_at: new Date().toISOString() })
          .eq('id', tenant.id)

        logger.debug(`✅ Tenant ${tenant.name} synced successfully`)
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error'
        logger.error(`❌ Failed to sync tenant ${tenant.name}:`, {
          tenant_id: tenant.id,
          error: errorMsg
        })

        failedTenants.push({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          error: errorMsg
        })
      }
    }

    const duration = new Date().getTime() - startTime.getTime()
    const successCount = tenants.length - failedTenants.length

    logger.debug('✅ SARI Cron Job completed', {
      tenants_processed: tenants.length,
      total_syncs: totalSyncs,
      failed: failedTenants.length,
      duration_ms: duration
    })

    // Layer 3: Audit Logging - Log success
    await logCronExecution(supabaseAdmin, 'sync-sari-courses', 'success', {
      processedCount: successCount,
      startedAt: startTime,
      completedAt: new Date()
    })

    return {
      success: failedTenants.length === 0,
      tenants_processed: tenants.length,
      total_syncs: totalSyncs,
      failed_tenants: failedTenants
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error'
    logger.error('❌ SARI Cron Job failed', { error: errorMsg })
    
    // Log the error if we have supabase access
    try {
      const supabaseAdmin = getSupabaseAdmin()
      await logCronExecution(supabaseAdmin, 'sync-sari-courses', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: errorMsg
      })
    } catch (logError) {
      logger.error('❌ Failed to log cron error:', logError)
    }

    throw createError({
      statusCode: 500,
      statusMessage: `Cron job failed: ${errorMsg}`
    })
  }
})

