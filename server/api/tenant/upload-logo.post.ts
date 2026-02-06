// server/api/tenant/upload-logo.post.ts
// Handles uploading logos and other tenant assets to Supabase Storage

import { defineEventHandler, readMultipartFormData, createError, setHeader } from 'h3'
import { getSupabaseAdmin, getSupabaseServiceRole } from '~/utils/supabase'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

interface UploadLogoRequest {
  tenantId: string
  assetType: 'logo' | 'logo_square' | 'logo_wide' | 'favicon'
  file: File
}

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif']
const MIME_TYPES: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'svg': 'image/svg+xml',
  'webp': 'image/webp',
  'gif': 'image/gif'
}
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
        statusMessage: 'Only tenant admins can upload assets'
      })
    }

    // Read form data
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data provided'
      })
    }

    const assetTypeField = formData.find(f => f.name === 'assetType')
    const fileField = formData.find(f => f.name === 'file')

    if (!assetTypeField || !fileField) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing assetType or file field'
      })
    }

    const assetType = assetTypeField.data?.toString() as any
    const fileName = fileField.filename
    const fileData = fileField.data

    // Validate asset type
    const validAssetTypes = ['logo', 'logo_square', 'logo_wide', 'favicon']
    if (!validAssetTypes.includes(assetType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid assetType. Must be one of: ${validAssetTypes.join(', ')}`
      })
    }

    // Validate file size
    if (fileData.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 413,
        statusMessage: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      })
    }

    // Extract and validate file format
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_FORMATS.includes(ext)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`
      })
    }

    const mimeType = MIME_TYPES[ext] || 'image/png'

    // Construct storage path
    // Format: tenant-assets/{tenant_id}/{asset_type}.{ext}
    const storagePath = `${tenant.id}/${assetType}.${ext}`

    logger.debug('Uploading logo to storage:', {
      tenantId: tenant.id,
      assetType,
      path: storagePath,
      fileSize: fileData.length,
      mimeType
    })

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileData, {
        contentType: mimeType,
        upsert: true // Replace if exists
      })

    if (uploadError) {
      logger.error('Storage upload failed:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to upload file to storage'
      })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    // Create or update asset record in tenant_assets table
    const { data: asset, error: assetError } = await supabase
      .from('tenant_assets')
      .upsert(
        {
          tenant_id: tenant.id,
          asset_type: assetType,
          file_path: storagePath,
          format: ext,
          mime_type: mimeType,
          file_size_bytes: fileData.length,
          url: publicUrl,
          storage_bucket: STORAGE_BUCKET,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'tenant_id,asset_type' }
      )
      .select()
      .single()

    if (assetError) {
      logger.warn('Could not update tenant_assets table (storage upload succeeded):', assetError)
      // This is not critical - the file is already in storage
    }

    logger.debug('Logo uploaded successfully:', {
      tenantId: tenant.id,
      assetType,
      url: publicUrl
    })

    return {
      success: true,
      asset: {
        id: asset?.id,
        tenant_id: tenant.id,
        asset_type: assetType,
        url: publicUrl,
        format: ext,
        file_size_bytes: fileData.length
      }
    }
  } catch (error) {
    logger.error('Error in tenant/upload-logo.post:', error)
    throw error
  }
})
