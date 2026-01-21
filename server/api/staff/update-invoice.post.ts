import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/staff/update-invoice
 * 
 * Secure API to update invoice status
 * 
 * Body:
 *   - invoice_id (required): Invoice ID
 *   - update_data (required): Object with fields to update
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Field Whitelist
 *   4. Audit Logging
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const body = await readBody(event)
    const invoiceId = body.invoice_id
    const updateData = body.update_data

    if (!invoiceId || !updateData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'invoice_id and update_data are required'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid invoice ID format'
      })
    }

    // ✅ LAYER 4: Field whitelist
    const allowedFields = ['status', 'paid_at', 'notes']
    const sanitizedData: any = {}
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        sanitizedData[key] = updateData[key]
      }
    }

    if (Object.keys(sanitizedData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid fields to update'
      })
    }

    // ✅ LAYER 5: Update invoice
    const { data: updatedInvoice, error } = await supabaseAdmin
      .from('invoices')
      .update(sanitizedData)
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('❌ Error updating invoice:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update invoice'
      })
    }

    // ✅ LAYER 6: AUDIT LOGGING
    logger.debug('✅ Invoice updated:', {
      userId: userProfile.id,
      tenantId,
      invoiceId,
      updatedFields: Object.keys(sanitizedData)
    })

    return {
      success: true,
      data: updatedInvoice
    }

  } catch (error: any) {
    logger.error('❌ Staff update-invoice API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to update invoice'
    })
  }
})

