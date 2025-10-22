// server/api/students/upload-document.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    // Extract data from form
    let file: any = null
    let fileType = ''
    let userId = ''

    for (const item of formData) {
      if (item.name === 'file') {
        file = item
      } else if (item.name === 'type') {
        fileType = item.data.toString()
      } else if (item.name === 'userId') {
        userId = item.data.toString()
      }
    }

    if (!file || !fileType || !userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: file, type, userId'
      })
    }

    // Use service role for storage operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate file name
    const fileExt = file.filename?.split('.').pop() || 'jpg'
    const fileName = `${userId}/${fileType}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(fileName, file.data, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: `Upload failed: ${uploadError.message}`
      })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('user-documents')
      .getPublicUrl(fileName)

    // Save document reference in database (optional)
    await supabaseAdmin
      .from('user_documents')
      .insert({
        user_id: userId,
        document_type: fileType,
        file_name: file.filename,
        file_path: fileName,
        file_url: urlData.publicUrl,
        uploaded_at: new Date().toISOString()
      })

    return {
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      type: fileType
    }

  } catch (error: any) {
    console.error('Document upload error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Document upload failed'
    })
  }
})

