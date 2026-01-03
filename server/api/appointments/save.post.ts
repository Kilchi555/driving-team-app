import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'
import {
  validateAppointmentData,
  validateUUID,
  sanitizeString,
  throwIfInvalid,
  throwValidationError
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { mode, eventId, appointmentData } = body

    if (!appointmentData) {
      throw createError({
        statusCode: 400,
        message: 'Appointment data is required'
      })
    }

    if (mode === 'edit' && !eventId) {
      throw createError({
        statusCode: 400,
        message: 'Event ID is required for edit mode'
      })
    }

    // Validate event ID format
    if (eventId && !validateUUID(eventId)) {
      throwValidationError({ eventId: 'Ungültiges Event ID Format' })
    }

    // Validate appointment data (basic checks)
    const validation = validateAppointmentData(appointmentData)
    throwIfInvalid(validation)

    // Extra security: Validate category against database (if type/category is present)
    // This ensures that newly added or removed categories are properly handled
    // Falls back to basic validator if API is unavailable
    if (appointmentData.type) {
      try {
        const authHeader = getHeader(event, 'authorization')
        const token = authHeader?.replace('Bearer ', '')
        
        if (token) {
          logger.debug('🔍 Validating category against database:', appointmentData.type)
          
          const categoryValidationResult = await $fetch('/api/validate/category', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: {
              categoryCode: appointmentData.type,
              tenantId: appointmentData.tenant_id
            }
          }) as any

          if (!categoryValidationResult?.valid) {
            logger.warn('❌ Category validation failed via API:', categoryValidationResult?.error)
            throwValidationError({ type: categoryValidationResult?.error || 'Fahrkategorie ungültig' })
          }

          logger.debug('✅ Category validated successfully against DB:', appointmentData.type)
        } else {
          logger.debug('ℹ️ No auth token provided, skipping database category validation')
        }
      } catch (categoryError: any) {
        logger.warn('⚠️ Category validation API call failed, using fallback validator:', categoryError.message)
        // Fall through - the basic validator will catch invalid categories using hardcoded list
      }
    }

    // Sanitize string fields to prevent XSS
    if (appointmentData.title) {
      appointmentData.title = sanitizeString(appointmentData.title, 255)
    }
    if (appointmentData.description) {
      appointmentData.description = sanitizeString(appointmentData.description, 1000)
    }
    if (appointmentData.custom_location_name) {
      appointmentData.custom_location_name = sanitizeString(appointmentData.custom_location_name, 255)
    }
    if (appointmentData.custom_location_address) {
      appointmentData.custom_location_address = sanitizeString(appointmentData.custom_location_address, 500)
    }

    const supabase = getSupabaseAdmin()

    logger.debug('📋 Saving appointment via API:', { mode, eventId, appointmentData })

    let result
    if (mode === 'edit' && eventId) {
      // Update existing appointment
      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', eventId)
        .select()
        .single()

      if (updateError) {
        logger.error('❌ Error updating appointment:', updateError)
        throw createError({
          statusCode: 500,
          message: `Fehler beim Aktualisieren des Termins: ${updateError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment updated:', result.id)
    } else {
      // Create new appointment
      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      if (insertError) {
        logger.error('❌ Error creating appointment:', insertError)
        throw createError({
          statusCode: 500,
          message: `Fehler beim Erstellen des Termins: ${insertError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment created:', result.id)
    }

    return {
      success: true,
      data: result
    }
  } catch (error: any) {
    logger.error('❌ Appointment save error:', error)
    throw error
  }
})

