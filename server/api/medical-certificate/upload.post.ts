// server/api/medical-certificate/upload.post.ts
import { createClient } from '@supabase/supabase-js'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export default defineEventHandler(async (event) => {
  try {
    // Get current user from Authorization header
    const supabase = getSupabase()
    const authHeader = getHeader(event, 'authorization')
    
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    const formData = await readMultipartFormData(event)
    
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file uploaded'
      })
    }

    // Extract data from form
    let file: any = null
    let appointmentId = ''

    for (const item of formData) {
      if (item.name === 'file') {
        file = item
      } else if (item.name === 'appointmentId') {
        appointmentId = item.data.toString()
      }
    }

    if (!file || !appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: file, appointmentId'
      })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type || '')) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid file type. Allowed: PDF, JPEG, PNG, WebP`
      })
    }

    // Validate file size (max 5MB)
    if (file.data.length > 5 * 1024 * 1024) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File too large. Maximum size: 5MB'
      })
    }

    // Use service role for storage operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get appointment to verify it exists and is cancelled
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id, deleted_at, cancellation_reason_id, tenant_id')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    if (!appointment.deleted_at) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment must be cancelled to upload medical certificate'
      })
    }

    // Verify user owns this appointment
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile || appointment.user_id !== userProfile.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You can only upload certificates for your own appointments'
      })
    }

    // Generate file name
    const fileExt = file.filename?.split('.').pop() || 'pdf'
    const fileName = `medical-certificates/${appointment.tenant_id}/${appointment.user_id}/${appointmentId}_${Date.now()}.${fileExt}`

    console.log('📤 Uploading medical certificate:', fileName)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-documents')
      .upload(fileName, file.data, {
        contentType: file.type,
        upsert: false // Don't allow overwriting
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: `Upload failed: ${uploadError.message}`
      })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('user-documents')
      .getPublicUrl(fileName)

    console.log('✅ Medical certificate uploaded:', urlData.publicUrl)

    // Update appointment with certificate info
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        medical_certificate_status: 'uploaded',
        medical_certificate_url: urlData.publicUrl,
        medical_certificate_uploaded_at: toLocalTimeString(new Date())
      })
      .eq('id', appointmentId)

    if (updateError) {
      console.error('❌ Error updating appointment:', updateError)
      // Try to clean up uploaded file
      await supabaseAdmin.storage
        .from('user-documents')
        .remove([fileName])
      
      throw createError({
        statusCode: 500,
        statusMessage: `Database update failed: ${updateError.message}`
      })
    }

    // TODO: Send notification to admin
    // await sendAdminNotification({
    //   type: 'medical_certificate_uploaded',
    //   appointmentId,
    //   userId: appointment.user_id
    // })

    return {
      success: true,
      url: urlData.publicUrl,
      status: 'uploaded',
      message: 'Arztzeugnis erfolgreich hochgeladen. Es wird in Kürze geprüft.'
    }

  } catch (error: any) {
    console.error('❌ Medical certificate upload error:', error)
    throw error
  }
})

