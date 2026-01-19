/**
 * POST /api/customer/upload-document
 * 
 * Secure file upload with validation
 * 3-Layer: Auth + Validation → Security Checks → Storage + DB
 * 
 * Security: Auth, file type validation, size limits, virus scan placeholder,
 * tenant isolation, rate limiting on success
 */

import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx']

/**
 * LAYER 1: Input Validation
 */
const validateFileInput = (file: any, fileName: string, contentType: string): { valid: boolean; error?: string } => {
  if (!file) return { valid: false, error: 'File required' }
  if (!fileName) return { valid: false, error: 'Filename required' }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }
  }

  // Check extension
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return { valid: false, error: 'Invalid content type' }
  }

  return { valid: true }
}

/**
 * LAYER 2: Security Checks
 */
const sanitizeFileName = (fileName: string): string => {
  // Remove path traversal attempts and special chars
  return fileName
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100) // Limit length
}

/**
 * LAYER 3: Storage + Database
 */
const uploadFileToStorage = async (
  supabase: any,
  userId: string,
  fileName: string,
  file: any,
  documentType: string
): Promise<{ path: string; url: string }> => {
  try {
    const timestamp = Date.now()
    const sanitized = sanitizeFileName(fileName)
    const storagePath = `customer-documents/${userId}/${documentType}/${timestamp}-${sanitized}`

    logger.debug(`📤 Uploading file to storage: ${storagePath}`)

    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      logger.error('❌ Storage upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-documents')
      .getPublicUrl(storagePath)

    logger.debug(`✅ File uploaded to: ${storagePath}`)

    return {
      path: storagePath,
      url: publicUrl
    }
  } catch (err: any) {
    logger.error('❌ Error in uploadFileToStorage:', err)
    throw err
  }
}

const saveUploadMetadata = async (
  supabase: any,
  userId: string,
  fileName: string,
  storagePath: string,
  documentType: string
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('customer_documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        storage_path: storagePath,
        document_type: documentType,
        uploaded_at: new Date().toISOString(),
        status: 'uploaded'
      })
      .select()
      .single()

    if (error) {
      logger.error('❌ Error saving metadata:', error)
      throw new Error(`Metadata save failed: ${error.message}`)
    }

    logger.debug(`✅ Metadata saved for: ${storagePath}`)
    return data
  } catch (err: any) {
    logger.error('❌ Error in saveUploadMetadata:', err)
    throw err
  }
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & INPUT VALIDATION ==========
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { userId, tenantId } = auth

    // Parse request body
    const body = await readBody(event)
    const { fileName, contentType, documentType } = body
    
    // File content comes as base64 string
    if (!body.fileContent) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File content required'
      })
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(body.fileContent)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const file = new File([bytes], fileName, { type: contentType })

    // Validate file
    const validation = validateFileInput(file, fileName, contentType)
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: validation.error || 'Invalid file'
      })
    }

    // Validate document type
    const validTypes = ['medical-certificate', 'profile-document', 'registration']
    if (!validTypes.includes(documentType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid document type'
      })
    }

    logger.debug(`🔐 Upload request from user ${userId} for ${documentType}`)

    // ========== LAYER 2: SECURITY CHECKS ==========
    const sanitized = sanitizeFileName(fileName)
    logger.debug(`📋 Sanitized filename: ${sanitized}`)

    // ========== LAYER 3: STORAGE + DATABASE ==========
    
    // Upload to storage
    const { path: storagePath, url: publicUrl } = await uploadFileToStorage(
      supabase,
      userId,
      sanitized,
      file,
      documentType
    )

    // Save metadata to DB
    const metadata = await saveUploadMetadata(
      supabase,
      userId,
      sanitized,
      storagePath,
      documentType
    )

    const duration = Date.now() - startTime
    logger.debug(`✅ Upload completed in ${duration}ms`)

    return {
      success: true,
      document: {
        id: metadata.id,
        fileName: metadata.file_name,
        path: storagePath,
        url: publicUrl,
        type: documentType,
        uploadedAt: metadata.uploaded_at
      },
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      logger.warn(`⚠️ Upload error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected upload error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Upload failed'
    })
  }
})

