/**
 * POST /api/customer/update-medical-certificate
 * 
 * Update appointment with medical certificate information
 * 3-Layer: Auth + Validation → Ownership Check → DB Update
 * 
 * Security: Auth required, ownership verification, whitelist fields,
 * tenant isolation, audit logging
 */

import { defineEventHandler, createError, readBody, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Whitelist of allowed fields to update
const ALLOWED_FIELDS = [
  'medical_certificate_url',
  'medical_certificate_uploaded_at',
  'medical_certificate_status',
  'medical_certificate_notes'
]

/**
 * LAYER 1: Input Validation
 */
const validateInput = (body: any): { valid: boolean; error?: string; sanitized?: any } => {
  const { appointmentId, ...updates } = body

  // Validate appointmentId
  if (!appointmentId || typeof appointmentId !== 'string') {
    return { valid: false, error: 'Valid appointmentId required' }
  }

  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(appointmentId)) {
    return { valid: false, error: 'Invalid appointmentId format' }
  }

  // Filter to only allowed fields
  const sanitized: Record<string, any> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.includes(key)) {
      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = value.trim().substring(0, 1000) // Max 1000 chars
      } else {
        sanitized[key] = value
      }
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return { valid: false, error: 'No valid fields to update' }
  }

  return { valid: true, sanitized: { appointmentId, updates: sanitized } }
}

/**
 * LAYER 2: Ownership Verification
 */
const verifyOwnership = async (
  supabase: any,
  appointmentId: string,
  userId: string,
  tenantId: string
): Promise<{ owned: boolean; appointment?: any }> => {
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, user_id, tenant_id, status')
      .eq('id', appointmentId)
      .single()

    if (error || !appointment) {
      return { owned: false }
    }

    // Check ownership AND tenant
    if (appointment.user_id !== userId || appointment.tenant_id !== tenantId) {
      logger.warn(`⚠️ Ownership check failed: user ${userId} tried to access appointment ${appointmentId}`)
      return { owned: false }
    }

    return { owned: true, appointment }
  } catch (err: any) {
    logger.error('❌ Error verifying ownership:', err)
    return { owned: false }
  }
}

/**
 * LAYER 3: Database Update
 */
const updateAppointment = async (
  supabase: any,
  appointmentId: string,
  userId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('user_id', userId) // Double-check ownership in query

    if (error) {
      logger.error('❌ Update error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    logger.error('❌ Unexpected update error:', err)
    return { success: false, error: 'Update failed' }
  }
}

/**
 * Main Handler
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ========== LAYER 1: AUTH & VALIDATION ==========
    
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseAdmin()

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const userId = userProfile.id
    const tenantId = userProfile.tenant_id

    // Parse and validate body
    const body = await readBody(event)
    const validation = validateInput(body)
    
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: validation.error || 'Invalid input'
      })
    }

    const { appointmentId, updates } = validation.sanitized!

    logger.debug(`📝 Medical certificate update: appointment ${appointmentId} by user ${userId}`)

    // ========== LAYER 2: OWNERSHIP CHECK ==========
    
    const ownership = await verifyOwnership(supabase, appointmentId, userId, tenantId)
    if (!ownership.owned) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // ========== LAYER 3: DATABASE UPDATE ==========
    
    const result = await updateAppointment(supabase, appointmentId, userId, updates)
    
    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Update failed'
      })
    }

    // Audit log
    logger.info(`✅ Medical certificate updated: appointment ${appointmentId} by user ${userId}`, {
      appointmentId,
      userId,
      tenantId,
      fieldsUpdated: Object.keys(updates)
    })

    const duration = Date.now() - startTime

    return {
      success: true,
      appointmentId,
      updatedFields: Object.keys(updates),
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    if (error.statusCode) {
      logger.warn(`⚠️ Medical certificate error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Update failed'
    })
  }
})

