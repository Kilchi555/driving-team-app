import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🔄 [update-profile] Handler started')
    
    const body = await readBody(event)
    logger.debug('🔄 [update-profile] Body received:', { firstName: body.firstName, lastName: body.lastName })
    
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

    // Get auth token from Authorization header (set by @nuxtjs/supabase module)
    logger.debug('🔄 [update-profile] Getting auth header')
    const authHeader = getHeader(event, 'authorization') || ''
    let accessToken: string | null = null
    
    if (authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7)
      logger.debug('🔄 [update-profile] Found Bearer token')
    }

    if (!accessToken) {
      console.error('❌ No access token found')
      throw createError({
        statusCode: 401,
        statusMessage: 'Nicht authentifiziert'
      })
    }

    // Create Supabase client with the access token
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const supabaseKey = process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    })

    // Get authenticated user
    logger.debug('🔄 [update-profile] Getting user from auth')
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      throw createError({
        statusCode: 401,
        statusMessage: 'Nicht authentifiziert'
      })
    }

    logger.debug('🔄 Updating profile for user:', user.id)

    // Create service role client to bypass RLS
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
      logger.debug('📧 Email changed from', user.email, 'to', email)
      updateData.email = email.toLowerCase().trim()
    }

    logger.debug('🔄 Updating users table with data:', updateData)
    logger.debug('🔍 Querying for auth_user_id:', user.id)

    const { data: updatedUser, error: updateError } = await serviceSupabase
      .from('users')
      .update(updateData)
      .eq('auth_user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Profile update error:', {
        message: updateError.message,
        code: (updateError as any).code,
        details: (updateError as any).details,
        hint: (updateError as any).hint
      })
      logger.debug('🔍 Query was for auth_user_id:', user.id)
      logger.debug('🔍 Update data was:', updateData)
      
      throw createError({
        statusCode: 400,
        statusMessage: `Fehler beim Aktualisieren des Profils: ${updateError.message}`
      })
    }
    
    logger.debug('✅ User updated successfully:', updatedUser)

    // If email changed, also update in auth
    if (email && email !== user.email) {
      logger.debug('🔐 Updating auth email to:', email)
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
      logger.debug('✅ Auth email updated successfully')
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

    logger.debug('✅ Profile updated successfully')

    return {
      success: true,
      message: 'Profil erfolgreich aktualisiert'
    }

  } catch (error: any) {
    console.error('❌ Profile update error:', error)
    throw error
  }
})
