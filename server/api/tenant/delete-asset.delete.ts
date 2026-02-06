// server/api/tenant/delete-asset.delete.ts
// Handles deleting tenant assets from both database and storage

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

const STORAGE_BUCKET = 'tenant-assets'

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication
    const { user, tenant } = await verifyAuth(event)
    if (!user || !tenant) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Check if user is admin
    const supabase = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .eq('tenant_id', tenant.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only tenant admins can delete assets'
      })
    }

    // Read request body
    const body = await readBody(event)
    const { tenantId, assetType } = body

    if (!tenantId || !assetType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing tenantId or assetType'
      })
    }

    // Security: Verify tenant ownership
    if (tenantId !== tenant.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot delete assets from another tenant'
      })
    }

    // Get asset record to find the file path
    const { data: asset, error: assetError } = await supabase
      .from('tenant_assets')
      .select('id, file_path')
      .eq('tenant_id', tenantId)
      .eq('asset_type', assetType)
      .single()

    if (assetError && assetError.code !== 'PGRST116') {
      logger.warn('Asset not found:', { tenantId, assetType })
      // Continue anyway - might need to clean up storage
    }

    // Delete from storage if file_path exists
    if (asset?.file_path) {
      logger.debug('Deleting from storage:', { bucket: STORAGE_BUCKET, path: asset.file_path })
      
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([asset.file_path])

      if (deleteError) {
        logger.warn('Storage deletion failed (continuing):', deleteError)
      }
    }

    // Delete from database
    const { error: dbDeleteError } = await supabase
      .from('tenant_assets')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('asset_type', assetType)

    if (dbDeleteError) {
      logger.error('Database deletion failed:', dbDeleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete asset'
      })
    }

    logger.debug('Asset deleted successfully:', { tenantId, assetType })

    return {
      success: true,
      message: 'Asset deleted successfully'
    }
  } catch (error) {
    logger.error('Error in tenant/delete-asset.delete:', error)
    throw error
  }
})
