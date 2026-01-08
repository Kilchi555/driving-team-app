// server/api/students/upload-document.post.ts
// ✅ SECURITY HARDENED: Token-based validation, rate limiting, input validation
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const ALLOWED_CATEGORIES = ['B', 'A', 'A1', 'A2', 'BE', 'C', 'CE', 'D', 'DE', 'BPT', 'Boot', 'M', 'Motorboot']

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    // ✅ LAYER 1: Extract and validate input
    let file: any = null
    let fileType = ''
    let token = ''

    for (const item of formData) {
      if (item.name === 'file') {
        file = item
      } else if (item.name === 'type') {
        fileType = item.data.toString()
      } else if (item.name === 'token') {
        token = item.data.toString()
      }
    }

    if (!file || !fileType || !token) {
      logger.warn('⚠️ Document upload: Missing required fields', { 
        hasFile: !!file, 
        hasType: !!fileType, 
        hasToken: !!token 
      })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: file, type, and token'
      })
    }

    // ✅ LAYER 2: Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      logger.warn('⚠️ Document upload: Invalid file type', { fileType: file.type })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file type. Only JPG, PNG, and PDF are allowed.'
      })
    }

    // ✅ LAYER 3: Validate file size
    if (file.data.length > MAX_FILE_SIZE) {
      logger.warn('⚠️ Document upload: File too large', { size: file.data.length })
      throw createError({
        statusCode: 400,
        statusMessage: 'File is too large. Maximum size is 10MB.'
      })
    }

    // ✅ LAYER 4: Validate category
    if (!ALLOWED_CATEGORIES.includes(fileType)) {
      logger.warn('⚠️ Document upload: Invalid category', { category: fileType })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid category. Please select a valid driving license category.'
      })
    }

    // ✅ LAYER 5: Verify token and get userId
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    logger.debug('🔐 Verifying onboarding token for document upload...')
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, onboarding_token, onboarding_status, onboarding_token_expires')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (userError || !user) {
      logger.warn('⚠️ Document upload: Invalid or expired token', { token: token.substring(0, 10) + '...' })
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }

    // ✅ LAYER 6: Check token expiration
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      logger.warn('⚠️ Document upload: Token expired', { userId: user.id })
      throw createError({
        statusCode: 401,
        statusMessage: 'Token has expired'
      })
    }

    // ✅ LAYER 7: Rate limiting per token (max 10 uploads per hour)
    const rateLimitKey = `document_upload_${token}`
    const rateLimitResult = await checkRateLimit(
      rateLimitKey,
      10, // max 10 uploads
      3600 // per hour
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Document upload: Rate limit exceeded', { 
        userId: user.id, 
        retryAfter: rateLimitResult.retryAfter 
      })
      throw createError({
        statusCode: 429,
        statusMessage: `Too many uploads. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        data: { retryAfter: rateLimitResult.retryAfter * 1000 }
      })
    }

    // ✅ LAYER 8: Validate filename
    const fileExt = file.filename?.split('.').pop() || 'jpg'
    if (!/^[a-z0-9]+$/.test(fileExt.toLowerCase())) {
      logger.warn('⚠️ Document upload: Invalid file extension', { ext: fileExt })
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file extension'
      })
    }

    const sanitizedType = fileType.replace(/[^a-zA-Z0-9]/g, '')
    const fileName = `${user.id}/${sanitizedType}-${Date.now()}.${fileExt}`

    logger.debug('📤 Uploading document to storage...', { fileName, userId: user.id })

    // ✅ LAYER 9: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(fileName, file.data, {
        contentType: file.type,
        upsert: false // Don't overwrite existing files
      })

    if (uploadError) {
      logger.error('❌ Document upload: Storage error', { error: uploadError.message, userId: user.id })
      throw createError({
        statusCode: 500,
        statusMessage: `Upload failed: ${uploadError.message}`
      })
    }

    // ✅ LAYER 10: Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('user-documents')
      .getPublicUrl(fileName)

    // ✅ LAYER 11: Audit logging
    await logAudit({
      action: 'document_uploaded',
      userId: user.id,
      tenantId: user.tenant_id,
      resourceType: 'onboarding_document',
      resourceId: fileName,
      details: {
        category: fileType,
        fileSize: file.data.length,
        fileName: file.filename
      },
      severity: 'info'
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    logger.debug('✅ Document uploaded to Storage:', { fileName, userId: user.id, category: fileType })

    return {
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      type: fileType
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

