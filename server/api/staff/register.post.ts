// server/api/staff/register.post.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      invitationToken,
      email, 
      firstName, 
      lastName, 
      phone,
      birthdate,
      street,
      streetNr,
      zip,
      city,
      password,
      selectedCategories
    } = body

    console.log('📝 Staff registration request:', { email, firstName, lastName })

    // Validate required fields
    if (!invitationToken || !email || !firstName || !lastName || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Pflichtfelder fehlen'
      })
    }

    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const serviceRoleKey = config.supabaseServiceRoleKey

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    // Create service role client
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Verify invitation token
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('staff_invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      console.error('❌ Invalid invitation:', inviteError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige oder abgelaufene Einladung'
      })
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Diese Einladung ist abgelaufen'
      })
    }

    console.log('✅ Invitation verified:', invitation.id)

    // 2. Create Supabase Auth user
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      throw createError({
        statusCode: 400,
        statusMessage: authError.message || 'Fehler beim Erstellen des Auth-Users'
      })
    }

    if (!authData.user) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Auth user wurde nicht erstellt'
      })
    }

    console.log('✅ Auth user created:', authData.user.id)

    // 3. Create user profile in database
    const { data: newUser, error: profileError } = await serviceSupabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        role: 'staff',
        tenant_id: invitation.tenant_id,
        is_active: true,
        birthdate: birthdate || null,
        street: street || null,
        street_nr: streetNr || null,
        zip: zip || null,
        city: city || null
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      // Try to clean up auth user
      await serviceSupabase.auth.admin.deleteUser(authData.user.id)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen des Profils'
      })
    }

    console.log('✅ User profile created:', newUser.id)

    // 4. Store categories if provided
    if (selectedCategories && selectedCategories.length > 0) {
      try {
        const categoryInserts = selectedCategories.map((code: string) => ({
          user_id: newUser.id,
          category_code: code,
          tenant_id: invitation.tenant_id
        }))
        
        await serviceSupabase
          .from('staff_categories')
          .insert(categoryInserts)
        
        console.log('✅ Categories stored:', selectedCategories.length)
      } catch (catErr) {
        console.warn('⚠️ Categories storage failed (non-fatal):', catErr)
      }
    }

    // 5. Mark invitation as accepted
    await serviceSupabase
      .from('staff_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    console.log('✅ Invitation marked as accepted')

    return {
      success: true,
      userId: newUser.id,
      message: 'Registrierung erfolgreich'
    }

  } catch (error: any) {
    console.error('❌ Staff registration error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Registrierung fehlgeschlagen'
    })
  }
})

