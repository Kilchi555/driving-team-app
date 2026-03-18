import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAnon } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAnon()

  try {
    const body = await readBody(event)
    const { tenant_id, email, first_name, last_name, phone, street, street_number, zip, city } = body

    if (!tenant_id) {
      throw createError({ statusCode: 400, message: 'tenant_id ist erforderlich' })
    }
    if (!email || !email.trim()) {
      throw createError({ statusCode: 400, message: 'email ist erforderlich' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if user with this email already exists in this tenant
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, street, street_nr, zip, city')
      .eq('tenant_id', tenant_id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      // Update empty fields with new data (don't overwrite existing data)
      const updates: Record<string, string> = {}
      if (!existingUser.first_name && first_name) updates.first_name = first_name
      if (!existingUser.last_name && last_name) updates.last_name = last_name
      if (!existingUser.phone && phone) updates.phone = phone
      if (!existingUser.street && street) updates.street = street
      if (!existingUser.street_nr && street_number) updates.street_nr = street_number
      if (!existingUser.zip && zip) updates.zip = zip
      if (!existingUser.city && city) updates.city = city

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('users')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id)
      }

      logger.debug('✅ Existing guest user found:', { id: existingUser.id, email: normalizedEmail })
      return { data: { id: existingUser.id, created: false } }
    }

    // Create new guest user
    const userId = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        auth_user_id: null,
        tenant_id,
        first_name: first_name || '',
        last_name: last_name || '',
        email: normalizedEmail,
        phone: phone || '',
        street: street || null,
        street_nr: street_number || null,
        zip: zip || null,
        city: city || null,
        role: 'client',
        is_active: false,
        onboarding_status: 'pending'
      })

    if (insertError) {
      logger.error('❌ find-or-create-guest-user: Insert error:', insertError)
      throw createError({ statusCode: 500, message: 'Fehler beim Erstellen des Gastbenutzers' })
    }

    logger.debug('✅ New guest user created:', { id: userId, email: normalizedEmail })
    return { data: { id: userId, created: true } }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ find-or-create-guest-user error:', error)
    throw createError({ statusCode: 500, message: 'Interner Fehler' })
  }
})
