// server/api/students/complete-onboarding.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    logger.debug('📝 Complete onboarding request body:', JSON.stringify(body, null, 2))
    
    const { token, firstName, lastName, phone, password, email, birthdate, categories, category, street, street_nr, zip, city, documentUrls } = body

    if (!token || !password || !email) {
      console.error('❌ Missing required fields:', { token: !!token, password: !!password, email: !!email })
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: token, password, and email are required'
      })
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Find user by token
    logger.debug('🔍 Looking for user with token:', token)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('onboarding_token', token)
      .eq('onboarding_status', 'pending')
      .single()

    if (userError) {
      console.error('❌ User lookup error:', userError)
      throw createError({
        statusCode: 400,
        statusMessage: `User lookup failed: ${userError.message}`
      })
    }

    if (!user) {
      console.error('❌ User not found with token:', token)
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired token'
      })
    }

    logger.debug('✅ Found user:', { id: user.id, email: user.email, tenant_id: user.tenant_id })

    // 2. Check token expiration
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token has expired'
      })
    }

    // 3. Create Auth User
    logger.debug('👤 Creating auth user for email:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Mark email as confirmed
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name
      }
    })

    if (authError) {
      console.error('❌ Auth user creation error:', authError)
      
      // Provide user-friendly error messages
      let userMessage = 'Fehler beim Erstellen des Benutzerkontos'
      if (authError.message.includes('already registered')) {
        userMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich direkt an.'
      } else if (authError.message.includes('password')) {
        userMessage = 'Das Passwort entspricht nicht den Anforderungen. Bitte wähle ein stärkeres Passwort.'
      } else if (authError.message.includes('email')) {
        userMessage = 'Die E-Mail-Adresse ist ungültig. Bitte überprüfe deine Eingabe.'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: userMessage
      })
    }

    logger.debug('✅ Auth user created:', { id: authData.user.id, email: authData.user.email })

    // 4. Update user record with all data
    // Ensure category stored as array - support both old (category) and new (categories) format
    const categoryValue = Array.isArray(categories) ? categories : 
                         Array.isArray(category) ? category : 
                         (category ? [category] : [])

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authData.user.id,
        first_name: firstName,  // ✅ NEU: Speichere Vornamen
        last_name: lastName,    // ✅ NEU: Speichere Nachnamen
        phone: phone,           // ✅ NEU: Speichere Telefonnummer
        email: email,
        birthdate: birthdate,
        category: categoryValue,
        street: street,
        street_nr: street_nr,
        zip: zip,
        city: city,
        is_active: true,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date().toISOString(),
        onboarding_token: null, // Invalidate token
        onboarding_token_expires: null,
        accepted_terms_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ User update error:', updateError)
      
      // Provide user-friendly error messages
      let userMessage = 'Fehler beim Speichern der Profildaten'
      if (updateError.message.includes('duplicate')) {
        userMessage = 'Ein Benutzer mit diesen Daten existiert bereits.'
      } else if (updateError.message.includes('constraint')) {
        userMessage = 'Die eingegebenen Daten sind ungültig. Bitte überprüfe deine Angaben.'
      }
      
      throw createError({
        statusCode: 400,
        statusMessage: userMessage
      })
    }

    logger.debug('✅ User profile updated successfully')

    // ✅ NEU: Aktualisiere auch den Auth User mit den korrekten Namen (Display Name)
    logger.debug('🔐 Updating auth user display name...')
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })
    
    if (authUpdateError) {
      console.warn('⚠️ Auth user update warning (non-critical):', authUpdateError)
      // Nicht den ganzen Prozess abbrechen, nur warnen
    } else {
      logger.debug('✅ Auth user display name updated')
    }

    logger.debug('💰 Creating student_credits record...')
    const { data: studentCredit, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!studentCredit) {
      const { error: createCreditError } = await supabaseAdmin
        .from('student_credits')
        .insert({
          user_id: user.id,
          tenant_id: user.tenant_id,
          balance_rappen: 0,
          notes: 'Automatisch erstellt bei Schüler-Onboarding'
        })

      if (createCreditError) {
        console.warn('⚠️ Error creating student_credits (non-critical):', createCreditError)
        // Don't fail the whole onboarding if this fails
      } else {
        logger.debug('✅ student_credits record created')
      }
    } else {
      logger.debug('ℹ️ student_credits already exists for user:', user.id)
    }

    // 6. Send pending payment reminders
    // After onboarding is complete, send first reminder for any payments that were skipped
    try {
      logger.debug('📧 Checking for pending payment reminders...')
      
      // Find all pending payments for this user where first reminder was not sent
      const { data: pendingPayments, error: paymentsError } = await supabaseAdmin
        .from('payments')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .eq('payment_status', 'pending')
        .is('first_reminder_sent_at', null)
      
      if (paymentsError) {
        console.error('⚠️ Error checking pending payments:', paymentsError)
      } else if (pendingPayments && pendingPayments.length > 0) {
        logger.debug(`📧 Found ${pendingPayments.length} pending payment(s) without reminder, sending now...`)
        
        // Send first reminder for each pending payment
        for (const payment of pendingPayments) {
          try {
            // Call the reminder API endpoint
            const reminderResponse = await $fetch('/api/reminders/send-payment-confirmation', {
              method: 'POST',
              body: {
                paymentId: payment.id,
                userId: user.id,
                tenantId: payment.tenant_id
              }
            })
            
            logger.debug(`✅ First reminder sent for payment ${payment.id}:`, reminderResponse)
          } catch (reminderError: any) {
            console.error(`⚠️ Error sending reminder for payment ${payment.id}:`, reminderError)
            // Don't fail the onboarding if reminder fails
          }
        }
      } else {
        logger.debug('ℹ️ No pending payments found without reminder')
      }
    } catch (reminderCheckError) {
      console.error('⚠️ Error in reminder check (non-critical):', reminderCheckError)
      // Don't fail the onboarding if reminder check fails
    }

    return {
      success: true,
      message: 'Onboarding completed successfully',
      userId: user.id,
      authUserId: authData.user.id
    }

  } catch (error: any) {
    console.error('❌ Complete onboarding error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })
    
    // Return more detailed error information
    const statusCode = error.statusCode || 500
    const statusMessage = error.message || 'Onboarding completion failed'
    
    console.error('❌ Throwing error:', { statusCode, statusMessage })
    
    throw createError({
      statusCode,
      statusMessage
    })
  }
})

