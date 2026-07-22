// server/api/tenant/delete-asset.delete.ts
// Handles deleting tenant assets from both database and storage

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'

const STORAGE_BUCKET = 'tenant-logos'

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication
    const authResult = await verifyAuth(event)
    if (!authResult?.userId || !authResult?.tenantId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }
    const { userId, tenantId: authTenantId } = authResult

    // Check if user is admin
    const supabase = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('tenant_id', authTenantId)
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
    if (tenantId !== authTenantId) {
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

    // Clear matching tenants.* logo column (never leave stale URLs)
    const tenantLogoColumn: Record<string, string> = {
      logo: 'logo_url',
      logo_square: 'logo_square_url',
      logo_wide: 'logo_wide_url',
      favicon: 'favicon_url',
    }
    const column = tenantLogoColumn[assetType]
    if (column) {
      const tenantUpdate: Record<string, any> = {
        [column]: null,
        updated_at: new Date().toISOString(),
      }
      if (assetType === 'logo_square') {
        // Keep logo_url only if it pointed at the same square asset — safest: clear if equal unknown;
        // always clear logo_url when square is removed (it's our preferred fallback source).
        tenantUpdate.logo_url = null
      }
      await supabase.from('tenants').update(tenantUpdate).eq('id', tenantId)
    }

    logger.debug('Asset deleted successfully:', { tenantId, assetType })

    return {
      success: true,
      message: 'Asset deleted successfully'
    }
  } catch (error) {
    logger.error('Error in tenant/delete-asset.delete:', error)
    throw mapSupabaseError(error)
  }
})
