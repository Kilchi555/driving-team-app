// server/api/cron/process-automatic-payments.post.ts
// Scheduler für automatische Abbuchungen X Stunden vor Termin

import { getSupabaseAdmin } from '~/utils/supabase'
import { Wallee } from 'wallee'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  console.log('🔄 Processing automatic payments...')
  
  // ✅ SICHERHEIT: Vercel Cron oder Admin-Auth
  try {
    // 1. Prüfe ob Request von Vercel Cron kommt
    const vercelCronHeader = getHeader(event, 'x-vercel-cron')
    const isVercelCron = !!vercelCronHeader
    
    if (isVercelCron) {
      console.log('✅ Vercel Cron request detected (trusted)')
    } else {
      // 2. Für manuelle Aufrufe: Prüfe ob User eingeloggt und Admin ist
      const authHeader = getHeader(event, 'authorization')
      const token = authHeader?.replace('Bearer ', '')
      
      if (!token) {
        console.warn('⚠️ Unauthorized: No auth token for manual request')
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: Authentication required'
        })
      }
      
      // Validiere Token mit Supabase
      const supabase = getSupabase()
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        console.warn('⚠️ Unauthorized: Invalid auth token')
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: Invalid token'
        })
      }
      
      // Prüfe ob User Admin ist
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()
      
      if (profile?.role !== 'admin') {
        console.warn('⚠️ Unauthorized: User is not admin')
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden: Admin access required'
        })
      }
      
      console.log('✅ Admin authentication validated (manual request)')
    }
    
    // 2. Vercel Signature Validierung (optional, falls konfiguriert)
    const vercelSignature = getHeader(event, 'x-vercel-signature')
    const vercelWebhookSecret = process.env.VERCEL_WEBHOOK_SECRET
    
    if (vercelWebhookSecret) {
      // Nur validieren wenn Secret konfiguriert ist
      if (!vercelSignature) {
        console.warn('⚠️ Unauthorized: Missing Vercel signature')
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: Missing signature'
        })
      }
      
      // Für Vercel Cron Jobs: Signature ist SHA1 HMAC des Request Bodies
      // WICHTIG: readRawBody MUSS vor readBody aufgerufen werden
      const body = await readRawBody(event, 'utf8') || ''
      const expectedSignature = crypto
        .createHmac('sha1', vercelWebhookSecret)
        .update(body)
        .digest('hex')
      
      // Constant-time comparison um Timing Attacks zu verhindern
      const signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(vercelSignature),
        Buffer.from(expectedSignature)
      )
      
      if (!signaturesMatch) {
        console.warn('⚠️ Unauthorized: Invalid Vercel signature')
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: Invalid signature'
        })
      }
      
      console.log('✅ Vercel signature validated')
    } else {
      console.log('ℹ️ Vercel signature validation skipped (VERCEL_WEBHOOK_SECRET not set)')
    }
    
    console.log('✅ Authentication successful')
    
  } catch (authError: any) {
    // Re-throw auth errors
    if (authError.statusCode === 401) {
      throw authError
    }
    // Für andere Fehler (z.B. body read) loggen aber weitermachen
    console.warn('⚠️ Auth check warning:', authError.message)
  }
  
  try {
    // ✅ Use Admin client to bypass RLS for cron job
    const supabase = getSupabaseAdmin()
    const now = new Date()
    
    // ✅ Schritt 1: Fällige Autorisierungen (scheduled_authorization_date <= now, noch nicht autorisiert)
    try {
      const { data: toAuthorize } = await supabase
        .from('payments')
        .select('id, user_id, tenant_id, payment_status, payment_method, payment_method_id, scheduled_authorization_date, wallee_transaction_id')
        .eq('payment_method', 'wallee')
        .eq('automatic_payment_consent', true)
        .not('payment_method_id', 'is', null)
        .not('scheduled_authorization_date', 'is', null)
        .lte('scheduled_authorization_date', now.toISOString()) // ✅ FIX: Use UTC for comparison
        .eq('payment_status', 'pending')
        .is('wallee_transaction_id', null)
        .limit(100)

      if (toAuthorize && toAuthorize.length > 0) {
        console.log(`⏳ Found ${toAuthorize.length} payments to authorize (pre-auth window reached)`)
        for (const p of toAuthorize) {
          try {
            await $fetch('/api/wallee/authorize-payment', {
              method: 'POST',
              body: { paymentId: p.id, userId: p.user_id, tenantId: p.tenant_id }
            })
            // Clear scheduled_authorization_date (optional)
            await supabase
              .from('payments')
              .update({ scheduled_authorization_date: null, updated_at: new Date().toISOString() })
              .eq('id', p.id)
            console.log('✅ Authorized payment', p.id)
          } catch (e: any) {
            console.warn('⚠️ Failed to authorize payment', p.id, e?.message)
          }
        }
      } else {
        console.log('ℹ️ No payments to authorize at this time')
      }
    } catch (authPhaseErr) {
      console.warn('⚠️ Authorization phase encountered an issue:', authPhaseErr)
    }

    // ✅ Hole alle fälligen autorisierten Zahlungen (scheduled_payment_date <= now, noch nicht verarbeitet)
    // Alle Payments sollten bereits bei Bestätigung autorisiert sein (authorized status)
    // Hier wird die autorisierte Transaction gecaptured (endgültige Abbuchung)
    
    // DEBUG: Log current time for comparison
    console.log('🕐 Current time (UTC):', now.toISOString())
    
    const { data: duePayments, error: fetchError } = await supabase
      .from('payments')
      .select(`
        id,
        appointment_id,
        user_id,
        tenant_id,
        total_amount_rappen,
        payment_method,
        payment_method_id,
        scheduled_payment_date,
        automatic_payment_consent,
        automatic_payment_processed,
        metadata,
        payment_status,
        wallee_transaction_id,
        appointments (
          id,
          start_time,
          end_time,
          title,
          user_id,
          status
        ),
        customer_payment_methods:payment_method_id (
          id,
          wallee_token,
          wallee_customer_id,
          display_name,
          is_active,
          user_id,
          tenant_id
        ),
        users:user_id (
          id,
          email,
          first_name,
          last_name,
          tenant_id
        )
      `)
      .eq('automatic_payment_consent', true)
      .eq('automatic_payment_processed', false)
      .eq('payment_method', 'wallee') // ✅ NUR Online-Zahlungen können automatisch abgebucht werden
      .not('payment_method_id', 'is', null)
      .not('scheduled_payment_date', 'is', null)
      .lte('scheduled_payment_date', now.toISOString()) // ✅ FIX: Use UTC for comparison since scheduled_payment_date is stored in UTC
      .eq('payment_status', 'authorized') // ✅ Nur autorisierte Payments (neuer Authorize-Flow)
      .order('scheduled_payment_date', { ascending: true })
      .limit(50) // Verarbeite max 50 pro Durchlauf
    
    console.log('🔍 Query completed, found:', duePayments?.length || 0, 'payments')
    
    if (fetchError) {
      console.error('❌ Error fetching due payments:', fetchError)
      throw fetchError
    }
    
    if (!duePayments || duePayments.length === 0) {
      console.log('ℹ️ No due payments found')
      return {
        success: true,
        processed: 0,
        message: 'No due payments to process'
      }
    }
    
    console.log(`📋 Found ${duePayments.length} due payment(s) to process`)
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    }
    
    // ✅ Verarbeite jede fällige Zahlung
    for (const payment of duePayments) {
      try {
        console.log(`💳 Processing payment ${payment.id}...`)
        
        const appointment = payment.appointments as any
        
        // ✅ PRÜFUNG 1: Termin muss scheduled oder completed sein (nicht cancelled)
        if (!appointment || (appointment.status !== 'scheduled' && appointment.status !== 'completed')) {
          const reason = !appointment 
            ? 'Termin nicht gefunden' 
            : `Termin nicht gültig (Status: ${appointment.status})`
          
          console.warn(`⚠️ Payment ${payment.id} skipped: ${reason}`)
          
          // Markiere als fehlgeschlagen wenn Termin bereits vorbei ist
          if (appointment && appointment.end_time) {
            const appointmentEnd = new Date(appointment.end_time)
            const now = new Date()
            
            if (appointmentEnd < now) {
              // Termin vorbei + nie bestätigt → nicht mehr verarbeiten
              await markPaymentAsFailed(payment.id, `Termin nicht bestätigt vor Ablauf: ${reason}`)
              results.failed++
              console.log(`❌ Payment ${payment.id} marked as failed: Termin abgelaufen ohne Bestätigung`)
            }
          }
          
          continue
        }
        
        // ✅ PRÜFUNG 2: Termin sollte noch nicht zu lange vorbei sein (max. 48h Frist nach Termin)
        if (appointment && appointment.end_time) {
          const appointmentEnd = new Date(appointment.end_time)
          const now = new Date()
          const hoursAfterAppointment = (now.getTime() - appointmentEnd.getTime()) / (1000 * 60 * 60)
          
          if (hoursAfterAppointment > 48) {
            // Termin mehr als 48h vorbei → nicht mehr automatisch verarbeiten
            await markPaymentAsFailed(payment.id, `Termin bereits ${Math.round(hoursAfterAppointment)}h vorbei - automatische Abbuchung nicht mehr möglich`)
            results.failed++
            console.log(`❌ Payment ${payment.id} marked as failed: Termin zu lange vorbei (${Math.round(hoursAfterAppointment)}h)`)
            continue
          } else if (hoursAfterAppointment > 0) {
            console.log(`⚠️ Payment ${payment.id}: Termin bereits ${Math.round(hoursAfterAppointment)}h vorbei, verarbeite trotzdem (innerhalb 48h Frist)`)
          }
        }
        
        // Validierung
        if (!payment.payment_method_id || !payment.customer_payment_methods) {
          console.warn(`⚠️ Payment ${payment.id} has no valid payment method`)
          await markPaymentAsFailed(payment.id, 'Kein gültiges Zahlungsmittel')
          results.failed++
          continue
        }
        
        // ✅ Authorized Payment capturen (endgültige Abbuchung)
        if (!payment.wallee_transaction_id) {
          console.error(`❌ Payment ${payment.id} is authorized but has no wallee_transaction_id`)
          await markPaymentAsFailed(payment.id, 'Authorized payment missing transaction ID')
          results.failed++
          continue
        }
        
        console.log(`💰 Payment ${payment.id} is authorized, capturing...`)
        
        try {
          const captureResult = await $fetch('/api/wallee/capture-payment', {
            method: 'POST',
            body: {
              paymentId: payment.id,
              transactionId: payment.wallee_transaction_id
            }
          }) as { success?: boolean; paymentStatus?: string; error?: string }

          if (captureResult.success) {
            console.log(`✅ Payment ${payment.id} captured successfully`)
            results.success++
          } else {
            console.error(`❌ Failed to capture payment ${payment.id}:`, captureResult.error)
            await markPaymentAsFailed(payment.id, captureResult.error || 'Capture failed')
            results.failed++
          }
        } catch (captureError: any) {
          console.error(`❌ Error capturing payment ${payment.id}:`, captureError.message)
          await markPaymentAsFailed(payment.id, `Capture error: ${captureError.message}`)
          results.failed++
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing payment ${payment.id}:`, error)
        
        await markPaymentAsFailed(
          payment.id, 
          error.message || error.body?.message || 'Unbekannter Fehler'
        )
        
        results.failed++
        results.errors.push({
          paymentId: payment.id,
          error: error.message || 'Unknown error'
        })
      }
    }
    
    console.log(`✅ Processing complete: ${results.success} success, ${results.failed} failed`)
    
    // ============================================
    // PHASE 3: Auto-Deletion of Unconfirmed Appointments
    // ============================================
    console.log('🗑️ Checking for appointments to auto-delete...')
    
    // Get all tenants with auto-delete enabled
    const { data: autoDeleteSettings, error: autoDeleteError } = await supabase
      .from('tenant_settings')
      .select('tenant_id, setting_value')
      .eq('category', 'payment')
      .eq('setting_key', 'reminder_settings')
    
    if (autoDeleteError) {
      console.error('❌ Error loading auto-delete settings:', autoDeleteError)
    }
    
    let deletedCount = 0
    const deleteResults: any[] = []
    
    if (autoDeleteSettings && autoDeleteSettings.length > 0) {
      for (const setting of autoDeleteSettings) {
        try {
          const reminderSettings = typeof setting.setting_value === 'string'
            ? JSON.parse(setting.setting_value)
            : setting.setting_value
          
          if (!reminderSettings.auto_delete_enabled) {
            continue
          }
          
          const deleteHoursAfterAuth = reminderSettings.auto_delete_hours_after_auth_deadline || 72
          const notifyStaff = reminderSettings.notify_staff_on_auto_delete !== false
          
          console.log(`🗑️ Tenant ${setting.tenant_id}: Auto-delete enabled (${deleteHoursAfterAuth}h after auth deadline)`)
          
          // Find appointments to delete
          // scheduled_authorization_date + deleteHoursAfterAuth < now AND status = pending_confirmation
          const deleteDeadline = new Date(now.getTime() - (deleteHoursAfterAuth * 60 * 60 * 1000))
          
          const { data: appointmentsToDelete, error: fetchDeleteError } = await supabase
            .from('appointments')
            .select(`
              id,
              user_id,
              staff_id,
              start_time,
              end_time,
              title,
              status,
              tenant_id,
              users!appointments_user_id_fkey (
                first_name,
                last_name,
                email
              ),
              staff:users!appointments_staff_id_fkey (
                first_name,
                last_name,
                email
              ),
              payments (
                id,
                scheduled_authorization_date
              )
            `)
            .eq('tenant_id', setting.tenant_id)
            .eq('status', 'pending_confirmation')
            .not('payments', 'is', null)
          
          if (fetchDeleteError) {
            console.error(`❌ Error fetching appointments to delete for tenant ${setting.tenant_id}:`, fetchDeleteError)
            continue
          }
          
          if (!appointmentsToDelete || appointmentsToDelete.length === 0) {
            console.log(`ℹ️ No appointments to check for deletion in tenant ${setting.tenant_id}`)
            continue
          }
          
          console.log(`📋 Checking ${appointmentsToDelete.length} pending appointments for tenant ${setting.tenant_id}`)
          
          for (const appointment of appointmentsToDelete) {
            try {
              const payment = Array.isArray(appointment.payments) 
                ? appointment.payments[0]
                : appointment.payments
              
              if (!payment || !payment.scheduled_authorization_date) {
                continue
              }
              
              const authDate = new Date(payment.scheduled_authorization_date)
              const deletionDeadline = new Date(authDate.getTime() + (deleteHoursAfterAuth * 60 * 60 * 1000))
              
              if (now >= deletionDeadline) {
                console.log(`🗑️ Deleting appointment ${appointment.id} (deadline passed: ${deletionDeadline.toISOString()})`)
                
                // Cancel appointment
                const { error: cancelError } = await supabase
                  .from('appointments')
                  .update({
                    status: 'cancelled',
                    deleted_at: now.toISOString(),
                    deletion_reason: `Automatisch storniert: Keine Bestätigung bis ${deletionDeadline.toLocaleString('de-CH')}`,
                    cancellation_type: 'system',
                    updated_at: now.toISOString()
                  })
                  .eq('id', appointment.id)
                
                if (cancelError) {
                  console.error(`❌ Error cancelling appointment ${appointment.id}:`, cancelError)
                  continue
                }
                
                // Mark payment as failed
                const { error: paymentError } = await supabase
                  .from('payments')
                  .update({
                    payment_status: 'failed',
                    metadata: {
                      auto_deleted: true,
                      deleted_at: now.toISOString(),
                      reason: 'No confirmation received'
                    },
                    updated_at: now.toISOString()
                  })
                  .eq('id', payment.id)
                
                if (paymentError) {
                  console.error(`❌ Error updating payment ${payment.id}:`, paymentError)
                }
                
                // Send notifications
                const user = Array.isArray(appointment.users) 
                  ? appointment.users[0]
                  : appointment.users
                const staff = Array.isArray(appointment.staff)
                  ? appointment.staff[0]
                  : appointment.staff
                
                // Get tenant data
                const { data: tenant } = await supabase
                  .from('tenants')
                  .select('name, contact_email, contact_phone')
                  .eq('id', setting.tenant_id)
                  .single()
                
                // Send customer notification
                if (user && user.email) {
                  try {
                    await $fetch('/api/reminders/send-deletion-notification', {
                      method: 'POST',
                      body: {
                        appointmentId: appointment.id,
                        userId: appointment.user_id,
                        tenantId: setting.tenant_id,
                        type: 'customer'
                      }
                    })
                    console.log(`✅ Customer notification sent for appointment ${appointment.id}`)
                  } catch (notifError) {
                    console.error(`⚠️ Error sending customer notification:`, notifError)
                  }
                }
                
                // Send staff notification
                if (notifyStaff && staff && staff.email) {
                  try {
                    await $fetch('/api/reminders/send-deletion-notification', {
                      method: 'POST',
                      body: {
                        appointmentId: appointment.id,
                        staffId: appointment.staff_id,
                        tenantId: setting.tenant_id,
                        type: 'staff'
                      }
                    })
                    console.log(`✅ Staff notification sent for appointment ${appointment.id}`)
                  } catch (notifError) {
                    console.error(`⚠️ Error sending staff notification:`, notifError)
                  }
                }
                
                deletedCount++
                deleteResults.push({
                  appointment_id: appointment.id,
                  success: true
                })
              }
            } catch (deleteError: any) {
              console.error(`❌ Error deleting appointment ${appointment.id}:`, deleteError)
              deleteResults.push({
                appointment_id: appointment.id,
                success: false,
                error: deleteError.message
              })
            }
          }
        } catch (tenantError: any) {
          console.error(`❌ Error processing auto-delete for tenant ${setting.tenant_id}:`, tenantError)
        }
      }
    }
    
    console.log(`✅ Auto-deletion complete: ${deletedCount} appointments deleted`)
    
    return {
      success: true,
      processed: results.success,
      failed: results.failed,
      total: duePayments.length,
      deleted: deletedCount,
      errors: results.errors.length > 0 ? results.errors : undefined,
      deleteResults: deleteResults.length > 0 ? deleteResults : undefined
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error in automatic payment processing:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to process automatic payments'
    })
  }
})

/**
 * Markiert Zahlung als erfolgreich verarbeitet
 */
async function markPaymentAsProcessed(
  paymentId: string, 
  walleeTransactionId: string | undefined,
  walleeState: string
) {
  const supabase = getSupabase()
  
  const updateData: any = {
    automatic_payment_processed: true,
    automatic_payment_processed_at: new Date().toISOString(),
    payment_status: 'completed',
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  if (walleeTransactionId) {
    updateData.wallee_transaction_id = walleeTransactionId
  }
  
  if (!updateData.metadata) {
    updateData.metadata = {}
  }
  
  updateData.metadata.automatic_payment_processed = {
    processed_at: new Date().toISOString(),
    wallee_state: walleeState,
    wallee_transaction_id: walleeTransactionId
  }
  
  const { error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
  
  if (error) {
    console.error(`❌ Error updating payment ${paymentId}:`, error)
    throw error
  }
  
  // ✅ Update auch appointment status falls vorhanden
  const { data: paymentData } = await supabase
    .from('payments')
    .select('appointment_id')
    .eq('id', paymentId)
    .single()
  
  if (paymentData?.appointment_id) {
    await supabase
      .from('appointments')
      .update({
        is_paid: true,
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentData.appointment_id)
  }
}

/**
 * Markiert Zahlung als fehlgeschlagen
 */
async function markPaymentAsFailed(paymentId: string, reason: string) {
  const supabase = getSupabase()
  
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('metadata')
    .eq('id', paymentId)
    .single()
  
  const metadata = existingPayment?.metadata || {}
  metadata.automatic_payment_failed = {
    failed_at: new Date().toISOString(),
    reason: reason,
    retry_count: (metadata.automatic_payment_failed?.retry_count || 0) + 1
  }
  
  const { error } = await supabase
    .from('payments')
    .update({
      payment_status: 'failed',
      metadata: metadata,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId)
  
  if (error) {
    console.error(`❌ Error marking payment ${paymentId} as failed:`, error)
  }
}

