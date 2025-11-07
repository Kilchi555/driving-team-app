// server/api/cron/process-automatic-payments.post.ts
// Scheduler für automatische Abbuchungen X Stunden vor Termin

import { getSupabase } from '~/utils/supabase'
import { Wallee } from 'wallee'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  console.log('🔄 Processing automatic payments...')
  
  // ✅ SICHERHEIT STUFE 3: API-Key + Vercel Signature Validation
  try {
    // 1. Prüfe ob Request von Vercel Cron kommt
    const vercelCronHeader = getHeader(event, 'x-vercel-cron')
    const isVercelCron = !!vercelCronHeader
    
    // 2. API-Key Validierung (nur wenn NICHT von Vercel Cron)
    // Vercel Cron Requests werden automatisch als vertrauenswürdig behandelt
    // (Vercel sendet x-vercel-cron Header nur für echte Cron Jobs)
    if (!isVercelCron) {
      const apiKey = getHeader(event, 'x-api-key') || getHeader(event, 'authorization')?.replace('Bearer ', '')
      const expectedApiKey = process.env.CRON_API_KEY
      
      if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
        console.warn('⚠️ Unauthorized: Invalid or missing API key', {
          hasApiKey: !!apiKey,
          hasExpectedKey: !!expectedApiKey,
          isVercelCron: false
        })
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: Invalid API key'
        })
      }
      
      console.log('✅ API key validated (manual request)')
    } else {
      console.log('✅ Vercel Cron request detected (trusted)')
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
    const supabase = getSupabase()
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
        .lte('scheduled_authorization_date', now.toISOString())
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
      .lte('scheduled_payment_date', now.toISOString())
      .eq('payment_status', 'authorized') // ✅ Nur autorisierte Payments (neuer Authorize-Flow)
      .order('scheduled_payment_date', { ascending: true })
      .limit(50) // Verarbeite max 50 pro Durchlauf
    
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
    
    // ✅ WALLEE SDK KONFIGURATION
    const spaceId: number = parseInt(process.env.WALLEE_SPACE_ID || '82592')
    const userId: number = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    const apiSecret: string = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
    
    const config = {
      space_id: spaceId,
      user_id: userId,
      api_secret: apiSecret
    }
    
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)
    const chargeService: Wallee.api.ChargeService = new Wallee.api.ChargeService(config)
    
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
        
        // ✅ PRÜFUNG 1: Termin muss bestätigt sein
        if (!appointment || appointment.status !== 'confirmed') {
          const reason = !appointment 
            ? 'Termin nicht gefunden' 
            : `Termin nicht bestätigt (Status: ${appointment.status})`
          
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
    
    return {
      success: true,
      processed: results.success,
      failed: results.failed,
      total: duePayments.length,
      errors: results.errors.length > 0 ? results.errors : undefined
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

