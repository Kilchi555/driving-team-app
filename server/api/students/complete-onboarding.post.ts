// server/api/students/complete-onboarding.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    console.log('📝 Complete onboarding request body:', JSON.stringify(body, null, 2))
    
    const { token, password, email, birthdate, category, street, street_nr, zip, city, documentUrls } = body

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
    console.log('🔍 Looking for user with token:', token)
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

    console.log('✅ Found user:', { id: user.id, email: user.email, tenant_id: user.tenant_id })

    // 2. Check token expiration
    const expiresAt = new Date(user.onboarding_token_expires)
    if (expiresAt < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token has expired'
      })
    }

    // 3. Create Auth User
    console.log('👤 Creating auth user for email:', email)
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

    console.log('✅ Auth user created:', { id: authData.user.id, email: authData.user.email })

    // 4. Update user record with all data
    // Ensure category stored as array
    const categoryValue = Array.isArray(category) ? category : (category ? [category] : [])

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authData.user.id,
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

