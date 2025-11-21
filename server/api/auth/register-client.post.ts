import { getSupabase } from '~/utils/supabase'
import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      birthDate,
      street,
      streetNr,
      zip,
      city,
      categories,
      lernfahrausweisNr,
      tenantId,
      isAdmin = false
    } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Erforderliche Felder fehlen'
      })
    }

    // Create service role client to bypass RLS
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
    const supabase = getSupabase()

    // 1. Create auth user
    console.log('🔐 Creating auth user for:', email)
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: false
    })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: authError.message || 'Fehler bei der Authentifizierung'
      })
    }

    console.log('✅ Auth user created:', authData.user.id)

    // 2. Create user profile using service role (bypasses RLS)
    console.log('👤 Creating user profile in users table...')
    const userRole = isAdmin ? 'tenant_admin' : 'client'
    const { data: userProfile, error: userError } = await serviceSupabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        tenant_id: tenantId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        birthdate: birthDate || null,
        street: street?.trim() || null,
        street_nr: streetNr?.trim() || null,
        zip: zip?.trim() || null,
        city: city?.trim() || null,
        category: categories || null,
        lernfahrausweis_nr: lernfahrausweisNr?.trim() || null,
        role: userRole,
        is_active: true
      })
      .select()
      .single()

    if (userError) {
      // Delete the auth user if profile creation fails
      await serviceSupabase.auth.admin.deleteUser(authData.user.id)
      console.error('❌ Error creating user profile:', JSON.stringify(userError, null, 2))
      console.error('📋 Attempted insert data:', {
        auth_user_id: authData.user.id,
        tenant_id: tenantId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        role: userRole
      })
      throw createError({
        statusCode: 400,
        statusMessage: `Fehler beim Erstellen des Benutzerprofils: ${userError.message}`
      })
    }

    console.log('✅ User profile created:', userProfile.id)

    // 3. Send verification email via Supabase (confirmation email automatically sent)
    console.log('📧 Sending verification email...')
    try {
      const { error: emailError } = await serviceSupabase.auth.resend({
        type: 'signup',
        email: email.toLowerCase().trim()
      })

      if (emailError) {
        console.warn('⚠️ Failed to send verification email:', emailError.message)
      } else {
        console.log('✅ Verification email sent')
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Email send error:', emailErr.message)
    }

    return {
      success: true,
      userId: authData.user.id,
      message: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mail.'
    }

  } catch (error: any) {
    console.error('❌ Registration error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Fehler bei der Registrierung'
    })
  }
})

