// server/api/medical-certificate/upload.post.ts
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import { sendTenantEmail, generateMedicalCertUploadedAdminEmail } from '~/server/utils/email'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Get current user
    const supabase = getSupabaseAdmin()
    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
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
      .select('id, user_id, deleted_at, cancellation_reason_id, tenant_id, start_time')
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

    logger.debug('📤 Uploading medical certificate:', fileName)

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

    logger.debug('✅ Medical certificate uploaded:', urlData.publicUrl)

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

    // Notify admin (fire-and-forget)
    ;(async () => {
      try {
        const apptDate = new Date(appointment.start_time || '').toLocaleDateString('de-CH', {
          timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
        })
        const apptTime = new Date(appointment.start_time || '').toLocaleTimeString('de-CH', {
          timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit'
        })

        const { data: customerProfile } = await supabaseAdmin
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', appointment.user_id)
          .single()

        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('name, contact_email, contact_person_first_name, contact_person_last_name')
          .eq('id', appointment.tenant_id)
          .single()

        const adminEmail = tenant?.contact_email
        if (!adminEmail) return

        const adminName = [tenant?.contact_person_first_name, tenant?.contact_person_last_name]
          .filter(Boolean).join(' ') || 'Administrator'
        const customerName = [customerProfile?.first_name, customerProfile?.last_name]
          .filter(Boolean).join(' ') || 'Kunde'

        const html = generateMedicalCertUploadedAdminEmail({
          recipientName: adminName,
          customerName,
          customerEmail: customerProfile?.email || undefined,
          appointmentDate: apptDate,
          appointmentTime: apptTime,
          certificateUrl: urlData.publicUrl,
          tenantName: tenant?.name || 'Fahrschule',
        })

        await sendTenantEmail(appointment.tenant_id, {
          to: adminEmail,
          subject: `Arztzeugnis eingereicht – ${customerName}`,
          html,
        })
        logger.debug('✅ Admin notified of medical certificate upload:', adminEmail)
      } catch (notifyErr: any) {
        logger.warn('⚠️ Med-cert admin notification failed (non-critical):', notifyErr.message)
      }
    })()

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

