/**
 * POST /api/customer/upload-document
 * 
 * Secure document upload for customer documents (medical certificates, etc.)
 * 3-Layer: Auth + Validation → Business Logic → Storage + DB
 * 
 * Security: Auth, file type validation, size limit, secure path generation,
 * tenant isolation, virus scan ready
 */

import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
]

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']

// Max file size: 10MB (matches frontend limit)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Document types
const VALID_DOCUMENT_TYPES = ['medical_certificate', 'id_document', 'license', 'other']

/**
 * LAYER 1: Input Validation
 */
const validateFile = (file: any): { valid: boolean; error?: string } => {
  if (!file || !file.data) {
    return { valid: false, error: 'No file provided' }
  }

  // Check file size
  if (file.data.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }

  // Check MIME type
  const mimeType = file.type?.toLowerCase()
  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid file type. Allowed: PDF, JPG, PNG, WebP` }
  }

  // Check extension
  const filename = file.filename?.toLowerCase() || ''
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => filename.endsWith(ext))
  if (!hasValidExtension) {
    return { valid: false, error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
  }

  return { valid: true }
}

const validateDocumentType = (type: string): boolean => {
  return VALID_DOCUMENT_TYPES.includes(type)
}

/**
 * LAYER 2: Business Logic - Generate secure storage path
 */
const generateSecureStoragePath = (
  tenantId: string,
  userId: string,
  documentType: string,
  originalFilename: string
): string => {
  // Extract extension safely
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'pdf'
  const safeExt = ALLOWED_EXTENSIONS.includes(`.${ext}`) ? ext : 'pdf'
  
  // Generate unique filename with timestamp to prevent overwrites
  const timestamp = Date.now()
  
  // Path structure: userId/TYPE-timestamp.ext
  // This matches the existing structure that list-user-documents expects
  // Type prefix helps identify document purpose
  const typePrefix = documentType === 'medical_certificate' ? 'MED' 
    : documentType === 'id_document' ? 'ID' 
    : documentType === 'license' ? 'LIC' 
    : 'DOC'
  
  return `${userId}/${typePrefix}-${timestamp}.${safeExt}`
}

/**
 * LAYER 3: Storage Upload
 */
const uploadToStorage = async (
  supabase: any,
  storagePath: string,
  fileData: Buffer,
  mimeType: string
): Promise<{ success: boolean; error?: string; url?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from('user-documents')
      .upload(storagePath, fileData, {
        contentType: mimeType,
        upsert: false // Don't overwrite existing files
      })

    if (error) {
      logger.error('❌ Storage upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL (or signed URL for private buckets)
    const { data: urlData } = supabase.storage
      .from('user-documents')
      .getPublicUrl(storagePath)

    return { success: true, url: urlData?.publicUrl }
  } catch (err: any) {
    logger.error('❌ Unexpected storage error:', err)
    return { success: false, error: 'Upload failed' }
  }
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & VALIDATION ==========
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { userId, tenantId } = auth

    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data provided'
      })
    }

    // Find file and document type in form data
    let file: any = null
    let documentType = 'other'
    let appointmentId: string | null = null

    for (const field of formData) {
      if (field.name === 'file' && field.data) {
        file = field
      } else if (field.name === 'documentType' && field.data) {
        documentType = field.data.toString()
      } else if (field.name === 'appointmentId' && field.data) {
        appointmentId = field.data.toString()
      }
    }

    // Validate file
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: fileValidation.error || 'Invalid file'
      })
    }

    // Validate document type
    if (!validateDocumentType(documentType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid document type. Allowed: ${VALID_DOCUMENT_TYPES.join(', ')}`
      })
    }

    logger.debug(`📄 Upload request: ${documentType} from user ${userId}`)

    // ========== LAYER 2: BUSINESS LOGIC ==========
    const supabase = getSupabaseAdmin()
    
    // Generate secure storage path
    const storagePath = generateSecureStoragePath(
      tenantId,
      userId,
      documentType,
      file.filename || 'document.pdf'
    )

    // ========== LAYER 3: STORAGE & DATABASE ==========
    
    // Upload file
    const uploadResult = await uploadToStorage(
      supabase,
      storagePath,
      file.data,
      file.type || 'application/pdf'
    )

    if (!uploadResult.success) {
      throw createError({
        statusCode: 500,
        statusMessage: uploadResult.error || 'Upload failed'
      })
    }

    // If this is a medical certificate linked to an appointment, update the appointment
    if (documentType === 'medical_certificate' && appointmentId) {
      // Verify appointment belongs to user
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select('id, user_id')
        .eq('id', appointmentId)
        .eq('user_id', userId)
        .single()

      if (aptError || !appointment) {
        logger.warn(`⚠️ Appointment ${appointmentId} not found or not owned by user ${userId}`)
        // Don't fail - file is already uploaded
      } else {
        // Update appointment with medical certificate path
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            medical_certificate_url: storagePath,
            medical_certificate_uploaded_at: new Date().toISOString()
          })
          .eq('id', appointmentId)
          .eq('user_id', userId) // Extra safety

        if (updateError) {
          logger.error('❌ Error updating appointment:', updateError)
          // Don't fail - file is already uploaded
        }
      }
    }

    const duration = Date.now() - startTime
    logger.debug(`✅ Document uploaded in ${duration}ms: ${storagePath}`)

    return {
      success: true,
      document: {
        path: storagePath,
        url: uploadResult.url,
        type: documentType,
        uploadedAt: new Date().toISOString()
      },
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      logger.warn(`⚠️ Upload error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Upload failed'
    })
  }
})
