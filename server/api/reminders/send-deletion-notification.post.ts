// ============================================
// Send Appointment Deletion Notification
// ============================================
// Sendet E-Mails wenn ein Termin automatisch gelöscht wurde

import { getSupabaseAdmin } from '~/server/utils/supabaseAdmin'
import { sendEmail, generateAppointmentDeletedEmail, generateStaffNotificationEmail } from '~/server/utils/email'
import { sendSMS, generateAppointmentDeletedSMS } from '~/server/utils/sms'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, userId, staffId, tenantId, type } = body

    if (!appointmentId || !tenantId || !type) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields: appointmentId, tenantId, type'
      })
    }

    if (type !== 'customer' && type !== 'staff') {
      throw createError({
        statusCode: 400,
        message: 'Invalid type: must be "customer" or "staff"'
      })
    }

    console.log(`📧 Sending ${type} deletion notification for appointment ${appointmentId}`)

    const supabase = getSupabaseAdmin()

    // 1. Load appointment data
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        title,
        deletion_reason,
        user_id,
        staff_id
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('❌ Appointment not found:', appointmentError)
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    // 2. Load tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, contact_email, contact_phone')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Tenant not found:', tenantError)
      throw createError({
        statusCode: 404,
        message: 'Tenant not found'
      })
    }

    // 3. Format appointment data
    const startTime = new Date(appointment.start_time)
    const appointmentDate = startTime.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const appointmentTime = startTime.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    })

    if (type === 'customer') {
      // Send to customer
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', userId || appointment.user_id)
        .single()

      if (userError || !user) {
        console.error('❌ User not found:', userError)
        throw createError({
          statusCode: 404,
          message: 'User not found'
        })
      }

      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', appointment.staff_id)
        .single()

      const staffName = staff 
        ? `${staff.first_name} ${staff.last_name}`
        : 'Ihr Fahrlehrer'

      const customerName = `${user.first_name} ${user.last_name}`

      // Generate and send email
      const emailHtml = generateAppointmentDeletedEmail({
        customerName,
        appointmentDate,
        appointmentTime,
        staffName,
        reason: appointment.deletion_reason || 'Keine Bestätigung erhalten',
        tenantName: tenant.name,
        tenantEmail: tenant.contact_email,
        tenantPhone: tenant.contact_phone
      })

      await sendEmail({
        to: user.email,
        subject: `Termin storniert - ${tenant.name}`,
        html: emailHtml
      })

      console.log(`✅ Customer deletion email sent to ${user.email}`)

      // Optional: Send SMS if phone available
      if (user.phone) {
        try {
          const smsText = generateAppointmentDeletedSMS({
            customerName,
            appointmentDate,
            tenantName: tenant.name,
            tenantPhone: tenant.contact_phone
          })

          await sendSMS({
            to: user.phone,
            message: smsText
          })

          console.log(`✅ Customer deletion SMS sent to ${user.phone}`)
        } catch (smsError) {
          console.error('⚠️ Error sending SMS (non-critical):', smsError)
        }
      }

      return {
        success: true,
        message: 'Customer notification sent',
        emailSent: true,
        smsSent: !!user.phone
      }
    } else {
      // Send to staff
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', staffId || appointment.staff_id)
        .single()

      if (staffError || !staff) {
        console.error('❌ Staff not found:', staffError)
        throw createError({
          statusCode: 404,
          message: 'Staff not found'
        })
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', appointment.user_id)
        .single()

      const customerName = user 
        ? `${user.first_name} ${user.last_name}`
        : 'Kunde'

      const staffName = `${staff.first_name} ${staff.last_name}`

      // Generate and send email
      const emailHtml = generateStaffNotificationEmail({
        staffName,
        customerName,
        appointmentDate,
        appointmentTime,
        reason: appointment.deletion_reason || 'Keine Bestätigung erhalten',
        tenantName: tenant.name
      })

      await sendEmail({
        to: staff.email,
        subject: `Termin automatisch storniert - ${tenant.name}`,
        html: emailHtml
      })

      console.log(`✅ Staff deletion email sent to ${staff.email}`)

      return {
        success: true,
        message: 'Staff notification sent',
        emailSent: true
      }
    }
  } catch (error: any) {
    console.error('❌ Error sending deletion notification:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send notification'
    })
  }
})

