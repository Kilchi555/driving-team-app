import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { action, documentId, base64Data, documentType, categoryCode } = body

    // Get authenticated user
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Nicht authentifiziert'
      })
    }

    console.log('📄 Document action:', action, 'for user:', user.id)

    // Create service role client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user info to find their tenant
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Benutzerprofil nicht gefunden'
      })
    }

    if (action === 'upload') {
      // Upload document
      if (!base64Data || !documentType || !categoryCode) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Erforderliche Felder fehlen'
        })
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data.split(',')[1] || base64Data, 'base64')
      
      // Generate filename - standardized structure
      const timestamp = Date.now()
      // Extract original filename if available, or use a default
      const originalFilename = documentType || 'document'
      const filename = `user-documents/${user.id}/${categoryCode}/${timestamp}_${originalFilename}.jpg`

      console.log('📤 Uploading document with standardized path:', filename)

      // Upload to storage
      const { error: uploadError } = await serviceSupabase.storage
        .from('user-documents')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw createError({
          statusCode: 400,
          statusMessage: 'Fehler beim Hochladen des Dokuments'
        })
      }

      // Get public URL
      const { data: publicUrl } = serviceSupabase.storage
        .from('user-documents')
        .getPublicUrl(filename)

      console.log('✅ Document uploaded:', publicUrl.publicUrl)

      // Save document record in user_documents table
      try {
        const { error: docError } = await serviceSupabase
          .from('user_documents')
          .insert({
            user_id: userProfile.id,
            tenant_id: userProfile.tenant_id,
            document_type: documentType,
            category_code: categoryCode,
            file_name: filename.split('/').pop() || 'document.jpg',
            file_size: buffer.length,
            file_type: 'image/jpeg',
            storage_path: filename,
            title: `${documentType} - ${categoryCode}`,
            is_verified: false
          })

        if (docError) {
          console.warn('⚠️ Could not create user_documents record:', docError)
          // Continue - document is uploaded even if DB record fails
        } else {
          console.log('✅ Document record created in user_documents table')
        }
      } catch (recordErr: any) {
        console.error('⚠️ Error creating document record:', recordErr)
        // Continue - document is uploaded even if DB record fails
      }

      return {
        success: true,
        message: 'Dokument erfolgreich hochgeladen',
        documentUrl: publicUrl.publicUrl,
        filename
      }

    } else if (action === 'delete') {
      // Delete document
      if (!documentId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Dokument-ID erforderlich'
        })
      }

      // Get document path from database
      const { data: doc, error: docError } = await serviceSupabase
        .from('user_documents')
        .select('storage_path, id')
        .eq('id', documentId)
        .eq('user_id', userProfile.id)
        .single()

      if (docError || !doc || !doc.storage_path) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Dokument nicht gefunden'
        })
      }

      // Delete from storage using storage_path
      const { error: deleteError } = await serviceSupabase.storage
        .from('user-documents')
        .remove([doc.storage_path])

      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        throw createError({
          statusCode: 400,
          statusMessage: 'Fehler beim Löschen des Dokuments'
        })
      }

      // Delete from database
      await serviceSupabase
        .from('user_documents')
        .delete()
        .eq('id', doc.id)

      console.log('✅ Document deleted:', doc.storage_path)

      return {
        success: true,
        message: 'Dokument erfolgreich gelöscht'
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Ungültige Aktion'
    })

  } catch (error: any) {
    console.error('❌ Document management error:', error)
    throw error
  }
})

