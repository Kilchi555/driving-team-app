import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, fileData, fileName, bucket, path, tenantId } = body

    if (!userId || !fileData || !fileName || !bucket || !path) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Erforderliche Parameter fehlen'
      })
    }

    // Create service role client to bypass RLS for storage
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Convert base64 data URL to Uint8Array
    let fileBuffer: Uint8Array
    try {
      // Remove data:image/jpeg;base64, prefix if present
      const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData
      fileBuffer = new Uint8Array(Buffer.from(base64Data, 'base64'))
    } catch (bufferErr: any) {
      console.error('❌ Error converting file data:', bufferErr.message)
      throw createError({
        statusCode: 400,
        statusMessage: 'Fehler beim Verarbeiten der Datei'
      })
    }

    // Upload file to storage in user-specific folder with timestamp
    const timestampedFileName = `${path.split('/')[0]}_${Date.now()}.${fileName.split('.').pop()}`
    const storagePath = `${userId}/${timestampedFileName}`
    logger.debug(`📤 Uploading file to ${bucket}/${storagePath}`)
    const { data, error: uploadError } = await serviceSupabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', JSON.stringify(uploadError, null, 2))
      throw createError({
        statusCode: 400,
        statusMessage: `Fehler beim Hochladen der Datei: ${uploadError.message}`
      })
    }

    logger.debug('✅ File uploaded successfully:', data.path)

    // Create document record in user_documents table
    if (tenantId) {
      try {
        logger.debug('📝 Creating user_documents record with storage_path:', storagePath)
        logger.debug('📋 Document data:', {
          user_id: userId,
          tenant_id: tenantId,
          document_type: 'lernfahrausweis',
          category_code: path,
          file_name: timestampedFileName,
          storage_path: storagePath
        })
        
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`
        
        const { data: insertedDoc, error: docError } = await serviceSupabase
          .from('user_documents')
          .insert({
            user_id: userId,
            tenant_id: tenantId,
            document_type: 'lernfahrausweis',
            category_code: path, // Category code from path parameter
            side: 'front',
            file_name: timestampedFileName,
            file_size: fileBuffer.length,
            file_type: 'image/jpeg',
            storage_path: storagePath,
            title: `Lernfahrausweis (${path})`,
            is_verified: false
          })
          .select()
          .single()

        if (docError) {
          console.error('❌ Document record creation error:', {
            message: docError.message,
            code: (docError as any).code,
            details: (docError as any).details,
            hint: (docError as any).hint
          })
          // Continue - document is uploaded but not linked
        } else {
          logger.debug('✅ Document record created successfully:', insertedDoc)
        }
      } catch (recordErr: any) {
        console.error('⚠️ Exception creating document record:', {
          message: recordErr.message,
          stack: recordErr.stack
        })
        // Continue - document is uploaded but not linked
      }
    }

    return {
      success: true,
      path: data.path,
      fullPath: `${bucket}/${data.path}`
    }

  } catch (error: any) {
    console.error('❌ Document upload error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Fehler beim Hochladen des Dokuments'
    })
  }
})

