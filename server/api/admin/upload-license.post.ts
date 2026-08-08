// server/api/admin/upload-license.post.ts
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    const config = useRuntimeConfig()
    
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data provided'
      })
    }

    // Extract form fields
    const userId = formData.find(item => item.name === 'userId')?.data?.toString()
    const frontFile = formData.find(item => item.name === 'frontFile')
    const backFile = formData.find(item => item.name === 'backFile')

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      })
    }

    logger.debug('📄 Server-side license upload for user:', userId)

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      config.public.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: targetUser, error: targetErr } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, created_at, role, onboarding_status')
      .eq('id', userId)
      .single()

    if (targetErr || !targetUser) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    const authUser = await getAuthenticatedUser(event).catch(() => null)
    const role = authUser?.role || ''
    const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
    const isOwner = !!authUser?.db_user_id && authUser.db_user_id === userId

    let allowRegistrationWindow = false
    if (!authUser) {
      const createdAt = targetUser.created_at ? new Date(targetUser.created_at).getTime() : 0
      const ageMs = Date.now() - createdAt
      allowRegistrationWindow = ageMs >= 0 && ageMs <= 30 * 60 * 1000
    }

    if (isPrivileged) {
      if (
        role !== 'super_admin' &&
        authUser?.tenant_id &&
        targetUser.tenant_id &&
        authUser.tenant_id !== targetUser.tenant_id
      ) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
      }
    } else if (!isOwner && !allowRegistrationWindow) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    // Test storage access first
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    if (bucketError) {
      console.error('❌ Cannot access storage buckets:', bucketError)
      throw createError({
        statusCode: 500,
        statusMessage: `Storage access failed: ${bucketError.message}`
      })
    }
    
    const userDocsBucket = buckets.find(bucket => bucket.id === 'user-documents')
    if (!userDocsBucket) {
      console.error('❌ user-documents bucket not found. Available buckets:', buckets.map(b => b.id))
      throw createError({
        statusCode: 404,
        statusMessage: 'user-documents bucket not found'
      })
    }
    
    logger.debug('✅ Storage access confirmed, bucket found:', userDocsBucket.id)

    const uploadResults = {
      frontPath: null as string | null,
      backPath: null as string | null
    }

    // Upload front file with timestamp to user-specific folder
    if (frontFile && frontFile.data) {
      const frontExt = frontFile.filename?.split('.').pop() || 'jpg'
      const frontFileName = `license_front_${Date.now()}.${frontExt}`
      const frontFilePath = `${userId}/${frontFileName}`

      logger.debug('📄 Uploading front file:', frontFileName)

      // Try to create bucket if it doesn't exist or use fallback
      const { data: frontUploadData, error: frontUploadError } = await supabaseAdmin.storage
        .from('user-documents')
        .upload(frontFilePath, frontFile.data, {
          cacheControl: '3600',
          upsert: true,
          contentType: frontFile.type || 'image/jpeg'
        })

      if (frontUploadError) {
        console.error('❌ Front file upload error:', frontUploadError)
        console.error('📋 Upload details:', {
          path: frontFilePath,
          size: frontFile.data.length,
          type: frontFile.type,
          filename: frontFile.filename
        })
      } else {
        uploadResults.frontPath = frontUploadData.path
        logger.debug('✅ Front file uploaded:', uploadResults.frontPath)
      }
    }

    // Upload back file with timestamp to user-specific folder
    if (backFile && backFile.data) {
      const backExt = backFile.filename?.split('.').pop() || 'jpg'
      const backFileName = `license_back_${Date.now()}.${backExt}`
      const backFilePath = `${userId}/${backFileName}`

      logger.debug('📄 Uploading back file:', backFileName)

      const { data: backUploadData, error: backUploadError } = await supabaseAdmin.storage
        .from('user-documents')
        .upload(backFilePath, backFile.data, {
          cacheControl: '3600',
          upsert: true,
          contentType: backFile.type
        })

      if (backUploadError) {
        console.error('❌ Back file upload error:', backUploadError)
      } else {
        uploadResults.backPath = backUploadData.path
        logger.debug('✅ Back file uploaded:', uploadResults.backPath)
      }
    }

    // Store documents in user_documents table (modern system)
    const documentsToInsert = []
    
    // Get user's tenant_id
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single()
    
    const tenantId = userData?.tenant_id
    if (!tenantId) {
      console.error('❌ User has no tenant_id')
      throw createError({
        statusCode: 400,
        statusMessage: 'User has no tenant_id'
      })
    }
    
    if (uploadResults.frontPath && frontFile) {
      documentsToInsert.push({
        user_id: userId,
        tenant_id: tenantId,
        document_type: 'fuehrerschein',
        side: 'front',
        file_name: frontFile.filename || 'license_front.jpg',
        file_size: frontFile.data.length,
        file_type: frontFile.type || 'image/jpeg',
        storage_path: uploadResults.frontPath,
        title: 'Führerausweis Vorderseite',
        is_verified: false
      })
    }
    
    if (uploadResults.backPath && backFile) {
      documentsToInsert.push({
        user_id: userId,
        tenant_id: tenantId,
        document_type: 'fuehrerschein',
        side: 'back',
        file_name: backFile.filename || 'license_back.jpg',
        file_size: backFile.data.length,
        file_type: backFile.type || 'image/jpeg',
        storage_path: uploadResults.backPath,
        title: 'Führerausweis Rückseite',
        is_verified: false
      })
    }
    
    if (documentsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('user_documents')
        .insert(documentsToInsert)

      if (insertError) {
        console.error('❌ Document insert error:', insertError)
        throw createError({
          statusCode: 400,
          statusMessage: `Fehler beim Speichern der Dokumentinformationen: ${insertError.message}`
        })
      }
      
      logger.debug('✅ Documents stored in user_documents table:', documentsToInsert.length)
    }

    return {
      success: true,
      uploads: uploadResults
    }

  } catch (error: any) {
    console.error('❌ File upload error:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'File upload failed'
    })
  }
})
