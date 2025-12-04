import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerWithSession } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    console.log('🔄 [update-profile] Handler started')
    
    const body = await readBody(event)
    console.log('🔄 [update-profile] Body received:', { firstName: body.firstName, lastName: body.lastName })
    
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      birthdate, 
      street, 
      streetNr, 
      zip, 
      city 
    } = body

    console.log('🔄 [update-profile] Calling getSupabaseServerWithSession')
    // Get Supabase client with user session from cookies
    const userClient = getSupabaseServerWithSession(event)
    console.log('🔄 [update-profile] Got userClient')

    // Get authenticated user
    console.log('🔄 [update-profile] Getting user from auth')
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    console.log('🔄 [update-profile] Auth result:', { hasUser: !!user, hasError: !!authError })

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      throw createError({
        statusCode: 401,
        statusMessage: 'Nicht authentifiziert'
      })
    }

    console.log('🔄 Updating profile for user:', user.id)

    // Create service role client to bypass RLS
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Update user profile
    const updateData: any = {
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      phone: phone?.trim() || null,
      birthdate: birthdate || null,
      street: street?.trim() || null,
      street_nr: streetNr?.trim() || null,
      zip: zip?.trim() || null,
      city: city?.trim() || null,
      updated_at: new Date().toISOString()
    }

    // Add email if it changed
    if (email && email !== user.email) {
      console.log('📧 Email changed from', user.email, 'to', email)
      updateData.email = email.toLowerCase().trim()
    }

    const { error: updateError } = await serviceSupabase
      .from('users')
      .update(updateData)
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('❌ Profile update error:', updateError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Fehler beim Aktualisieren des Profils'
      })
    }

    // If email changed, also update in auth
    if (email && email !== user.email) {
      console.log('🔐 Updating auth email to:', email)
      const { error: emailUpdateError } = await serviceSupabase.auth.admin.updateUserById(user.id, {
        email: email.toLowerCase().trim(),
        email_confirm: true // Auto-confirm new email
      })

      if (emailUpdateError) {
        console.error('⚠️ Warning updating auth email:', emailUpdateError)
        // Don't fail if email update fails, but warn the user
        throw createError({
          statusCode: 400,
          statusMessage: 'Fehler beim Aktualisieren der Email-Adresse'
        })
      }
      console.log('✅ Auth email updated successfully')
    }

    // Update auth user metadata
    const { error: metadataError } = await serviceSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        first_name: firstName?.trim(),
        last_name: lastName?.trim()
      }
    })

    if (metadataError) {
      console.error('⚠️ Warning updating user metadata:', metadataError)
      // Don't fail if metadata update fails
    }

    console.log('✅ Profile updated successfully')

    return {
      success: true,
      message: 'Profil erfolgreich aktualisiert'
    }

  } catch (error: any) {
    console.error('❌ Profile update error:', error)
    throw error
  }
})
