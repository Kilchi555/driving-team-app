import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { userId, fileData, fileName, bucket, path } = body

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

    // Upload file to storage
    console.log(`📤 Uploading file: ${fileName} to ${bucket}/${path}`)
    const { data, error: uploadError } = await serviceSupabase.storage
      .from(bucket)
      .upload(`${path}/${fileName}`, fileBuffer, {
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

    console.log('✅ File uploaded successfully:', data.path)

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

