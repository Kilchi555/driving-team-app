/**
 * Cron Job: Sync SARI Courses
 * POST /api/cron/sync-sari-courses
 * 
 * Runs periodically to sync courses from SARI for all enabled tenants
 * Triggered by external cron service (e.g., Vercel Cron, EasyCron, etc.)
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { SARISyncEngine } from '~/server/utils/sari-sync-engine'
import { logger } from '~/utils/logger'

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
  const startTime = Date.now()

  try {
    logger.debug('🔄 SARI Cron Job started')

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Get all tenants with SARI enabled
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select(
        'id, name, sari_enabled, sari_environment, sari_client_id, sari_client_secret, sari_username, sari_password'
      )
      .eq('sari_enabled', true)

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`)
    }

    if (!tenants || tenants.length === 0) {
      logger.debug('No tenants with SARI enabled')
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
        // Validate credentials
        if (
          !tenant.sari_client_id ||
          !tenant.sari_client_secret ||
          !tenant.sari_username ||
          !tenant.sari_password
        ) {
          throw new Error('Incomplete SARI credentials')
        }

        logger.debug(`🔄 Syncing tenant: ${tenant.name}`, {
          tenant_id: tenant.id
        })

        // Create SARI client for this tenant
        const sari = new SARIClient({
          environment: (tenant.sari_environment || 'test') as 'test' | 'production',
          clientId: tenant.sari_client_id,
          clientSecret: tenant.sari_client_secret,
          username: tenant.sari_username,
          password: tenant.sari_password
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

    const duration = Date.now() - startTime

    logger.debug('✅ SARI Cron Job completed', {
      tenants_processed: tenants.length,
      total_syncs: totalSyncs,
      failed: failedTenants.length,
      duration_ms: duration
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

    throw createError({
      statusCode: 500,
      statusMessage: `Cron job failed: ${errorMsg}`
    })
  }
})

