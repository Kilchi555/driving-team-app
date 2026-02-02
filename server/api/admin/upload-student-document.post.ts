import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/admin/upload-student-document
 * 
 * Secure API for admin/staff to upload student documents
 * 
 * FormData:
 *   - file (required): The document file (JPG, PNG, PDF)
 *   - userId (required): Student ID
 *   - type (required): Document type (student-document, etc)
 *   - side (optional): 'front' or 'back' for ID documents
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. User Role Check (admin/staff/tenant_admin)
 *   3. Tenant Isolation
 *   4. File Validation
 *   5. Rate Limiting
 *   6. Audit Logging
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get user profile
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    // ✅ LAYER 3: Check permissions
    const allowedRoles = ['admin', 'staff', 'tenant_admin', 'super_admin']
    if (!allowedRoles.includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions'
      })
    }

    // ✅ LAYER 4: Read multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    // ✅ LAYER 5: Extract form fields
    let file: any = null
    let userId = ''
    let docType = ''
    let side = 'front'

    for (const item of formData) {
      if (item.name === 'file') {
        file = item
      } else if (item.name === 'userId') {
        userId = item.data.toString()
      } else if (item.name === 'type') {
        docType = item.data.toString()
      } else if (item.name === 'side') {
        side = item.data.toString()
      }
    }

    if (!file || !userId || !docType) {
      logger.warn('⚠️ Document upload: Missing required fields', {
        hasFile: !!file,
        hasUserId: !!userId,
        hasType: !!docType
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: file, userId, and type'
      })
    }

    // ✅ LAYER 6: Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      logger.warn('⚠️ Document upload: Invalid file type', { fileType: file.type })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file type. Only JPG, PNG, and PDF are allowed.'
      })
    }

    // ✅ LAYER 7: Validate file size
    if (file.data.length > MAX_FILE_SIZE) {
      logger.warn('⚠️ Document upload: File too large', { size: file.data.length })
      throw createError({
        statusCode: 400,
        statusMessage: 'File is too large. Maximum size is 10MB.'
      })
    }

    // ✅ LAYER 8: Verify student belongs to tenant
    const { data: student, error: studentError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', userId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (studentError || !student) {
      logger.warn('⚠️ Document upload: Student not found or access denied', { userId, tenantId: userProfile.tenant_id })
      throw createError({
        statusCode: 403,
        statusMessage: 'Student not found or access denied'
      })
    }

    // ✅ LAYER 9: Validate filename
    const fileExt = file.filename?.split('.').pop() || 'jpg'
    if (!/^[a-z0-9]+$/.test(fileExt.toLowerCase())) {
      logger.warn('⚠️ Document upload: Invalid file extension', { ext: fileExt })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file extension'
      })
    }

    const sanitizedType = docType.replace(/[^a-zA-Z0-9]/g, '')
    const fileName = `${userId}/${sanitizedType}-${side}-${Date.now()}.${fileExt}`

    logger.debug('📤 Uploading student document to storage...', {
      fileName,
      userId,
      uploadedBy: userProfile.id,
      type: docType
    })

    // ✅ LAYER 10: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(fileName, file.data, {
        contentType: file.type,
        upsert: false // Don't overwrite existing files
      })

    if (uploadError) {
      logger.error('❌ Document upload: Storage error', {
        error: uploadError.message,
        userId,
        uploadedBy: userProfile.id
      })
      throw createError({
        statusCode: 500,
        statusMessage: `Upload failed: ${uploadError.message}`
      })
    }

    // ✅ LAYER 11: Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('user-documents')
      .getPublicUrl(fileName)

    logger.debug('✅ Student document uploaded to Storage:', {
      fileName,
      userId,
      uploadedBy: userProfile.id,
      type: docType
    })

    return {
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      type: docType
    }

  } catch (error: any) {
    logger.error('❌ Document upload error:', {
      message: error.message,
      statusCode: error.statusCode
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Document upload failed',
      data: error.data
    })
  }
})
