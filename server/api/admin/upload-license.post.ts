// server/api/admin/upload-license.post.ts
import { createClient } from '@supabase/supabase-js'

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

    console.log('📄 Server-side license upload for user:', userId)

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
    
    console.log('✅ Storage access confirmed, bucket found:', userDocsBucket.id)

    const uploadResults = {
      frontPath: null as string | null,
      backPath: null as string | null
    }

    // Upload front file
    if (frontFile && frontFile.data) {
      const frontExt = frontFile.filename?.split('.').pop() || 'jpg'
      const frontFileName = `${userId}_license_front.${frontExt}`
      const frontFilePath = `licenses/${frontFileName}`

      console.log('📄 Uploading front file:', frontFileName)

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
        console.log('✅ Front file uploaded:', uploadResults.frontPath)
      }
    }

    // Upload back file
    if (backFile && backFile.data) {
      const backExt = backFile.filename?.split('.').pop() || 'jpg'
      const backFileName = `${userId}_license_back.${backExt}`
      const backFilePath = `licenses/${backFileName}`

      console.log('📄 Uploading back file:', backFileName)

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
        console.log('✅ Back file uploaded:', uploadResults.backPath)
      }
    }

    // Update user record with file paths
    if (uploadResults.frontPath || uploadResults.backPath) {
      const updateData: any = {}
      if (uploadResults.frontPath) updateData.lernfahrausweis_url = uploadResults.frontPath
      if (uploadResults.backPath) updateData.lernfahrausweis_back_url = uploadResults.backPath

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.error('❌ User update error:', updateError)
        throw createError({
          statusCode: 400,
          statusMessage: `Failed to update user with file paths: ${updateError.message}`
        })
      }
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
