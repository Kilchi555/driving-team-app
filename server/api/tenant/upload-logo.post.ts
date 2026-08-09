// server/api/tenant/upload-logo.post.ts
// Handles uploading logos and other tenant assets to Supabase Storage

import { defineEventHandler, readMultipartFormData, createError, setHeader } from 'h3'
import { getSupabaseAdmin, getSupabaseServiceRole } from '~/utils/supabase'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'
import { mapSupabaseError } from '~/server/utils/supabase-error'

interface UploadLogoRequest {
  tenantId: string
  assetType: 'logo' | 'logo_square' | 'logo_wide' | 'favicon' | 'banner'
  file: File
}

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
// SVG excluded: can contain <script> tags (XSS risk when served from public URL)
const ALLOWED_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'gif']
const MIME_TYPES: Record<string, string> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
  'gif': 'image/gif'
}
// Align with registration + migrate-logo-to-storage (Driving Team / Gemperli)
const STORAGE_BUCKET = 'tenant-logos'

// Magic bytes map for binary file type verification
const MAGIC_BYTES: Record<string, number[][]> = {
  'png':  [[0x89, 0x50, 0x4E, 0x47]],
  'jpg':  [[0xFF, 0xD8, 0xFF]],
  'jpeg': [[0xFF, 0xD8, 0xFF]],
  'webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP — first 4 bytes RIFF
  'gif':  [[0x47, 0x49, 0x46, 0x38]], // GIF8
}

function detectImageExt(data: Buffer): string | null {
  if (data.length >= 4 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 'png'
  if (data.length >= 3 && data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 'jpg'
  if (data.length >= 12
    && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
    && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
    return 'webp'
  }
  if (data.length >= 4 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) return 'gif'
  return null
}

function validateMagicBytes(data: Buffer, ext: string): boolean {
  const signatures = MAGIC_BYTES[ext]
  if (!signatures) return true // no known signature, skip
  return signatures.some(sig => sig.every((byte, i) => data[i] === byte))
}

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
    const { userId, tenantId } = authResult

    // Check if user is admin
    const supabase = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
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
    const validAssetTypes = ['logo', 'logo_square', 'logo_wide', 'favicon', 'banner']
    if (!validAssetTypes.includes(assetType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid assetType. Must be one of: ${validAssetTypes.join(', ')}`
      })
    }

    // Hero/banner can be larger before compression
    const maxBytes = assetType === 'banner' ? 8 * 1024 * 1024 : MAX_FILE_SIZE
    if (fileData.length > maxBytes) {
      throw createError({
        statusCode: 413,
        statusMessage: `File too large. Maximum size is ${maxBytes / 1024 / 1024}MB`
      })
    }

    // Extract and validate file format
    let ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (ext === 'jpeg') ext = 'jpg'

    // Prefer actual content over filename — Safari often encodes PNG/JPEG while
    // the client still names the file .webp after canvas compression.
    const detectedExt = detectImageExt(Buffer.from(fileData))
    if (detectedExt) {
      ext = detectedExt === 'jpg' ? 'jpg' : detectedExt
    } else if (!ext || !ALLOWED_FORMATS.includes(ext)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`
      })
    } else if (!validateMagicBytes(fileData, ext === 'jpg' ? 'jpg' : ext)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File content does not match its extension'
      })
    }

    if (!ALLOWED_FORMATS.includes(ext)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`
      })
    }

    const mimeType = MIME_TYPES[ext] || 'image/png'

    // Construct storage path
    // Format: {tenant_id}/{asset_type}.{ext} in tenant-logos bucket
    const storagePath = `${tenantId}/${assetType}.${ext}`

    logger.debug('Uploading logo to storage:', {
      tenantId,
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
          tenant_id: tenantId,
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

    // Keep tenants.* logo columns in sync (storage URL, never base64)
    const tenantLogoColumn: Record<string, string> = {
      logo: 'logo_url',
      logo_square: 'logo_square_url',
      logo_wide: 'logo_wide_url',
      favicon: 'favicon_url',
    }
    const column = tenantLogoColumn[assetType]
    if (column) {
      const tenantUpdate: Record<string, any> = {
        [column]: publicUrl,
        updated_at: new Date().toISOString(),
      }
      // Prefer square as generic logo_url fallback when uploading square;
      // also keep logo_url in sync when uploading wide so legacy callers still work.
      if (assetType === 'logo_square') {
        tenantUpdate.logo_url = publicUrl
      } else if (assetType === 'logo_wide') {
        // Only set logo_url if empty — don't overwrite a square-preferred fallback
        const { data: current } = await supabase
          .from('tenants')
          .select('logo_url')
          .eq('id', tenantId)
          .maybeSingle()
        if (!current?.logo_url) {
          tenantUpdate.logo_url = publicUrl
        }
      }
      const { error: tenantUpdateError } = await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', tenantId)
      if (tenantUpdateError) {
        logger.warn('Could not sync tenants logo column (storage upload succeeded):', tenantUpdateError)
      }
    }

    // Sync website hero banner onto website_tenants when present
    if (assetType === 'banner') {
      const { error: websiteUpdateError } = await supabase
        .from('website_tenants')
        .update({
          hero_image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
      if (websiteUpdateError) {
        logger.warn('Could not sync website_tenants.hero_image_url (storage upload succeeded):', websiteUpdateError)
      }
    }

    if (assetType === 'logo_square' || assetType === 'logo') {
      const { error: websiteLogoError } = await supabase
        .from('website_tenants')
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
      if (websiteLogoError) {
        logger.warn('Could not sync website_tenants.logo_url (storage upload succeeded):', websiteLogoError)
      }
    }

    logger.debug('Logo uploaded successfully:', {
      tenantId,
      assetType,
      url: publicUrl
    })

    return {
      success: true,
      asset: {
        id: asset?.id,
        tenant_id: tenantId,
        asset_type: assetType,
        url: publicUrl,
        format: ext,
        file_size_bytes: fileData.length
      }
    }
  } catch (error) {
    logger.error('Error in tenant/upload-logo.post:', error)
    throw mapSupabaseError(error)
  }
})
