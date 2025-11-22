import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
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

    // Get authenticated user
    const supabase = getSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
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
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Update user profile
    const { error: updateError } = await serviceSupabase
      .from('users')
      .update({
        first_name: firstName?.trim() || null,
        last_name: lastName?.trim() || null,
        phone: phone?.trim() || null,
        birthdate: birthdate || null,
        street: street?.trim() || null,
        street_nr: streetNr?.trim() || null,
        zip: zip?.trim() || null,
        city: city?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('❌ Profile update error:', updateError)
      throw createError({
        statusCode: 400,
        statusMessage: 'Fehler beim Aktualisieren des Profils'
      })
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

