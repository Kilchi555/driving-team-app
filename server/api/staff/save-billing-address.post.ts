import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * POST /api/staff/save-billing-address
 * Upsert billing address for a student in company_billing_addresses
 */
export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: staffProfile, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (staffError || !staffProfile || !['staff', 'admin'].includes(staffProfile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
    }

    const body = await readBody(event)
    const { user_id, company_name, contact_person, email, phone, street, street_number, zip, city } = body

    if (!user_id) {
      throw createError({ statusCode: 400, statusMessage: 'user_id is required' })
    }

    // Verify student is in same tenant
    const { data: student } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, email')
      .eq('id', user_id)
      .single()

    if (!student || student.tenant_id !== staffProfile.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Student not in your tenant' })
    }

    // Upsert billing address - check first, then insert or update
    const { data: existing } = await supabaseAdmin
      .from('company_billing_addresses')
      .select('id')
      .eq('user_id', user_id)
      .eq('tenant_id', staffProfile.tenant_id)
      .eq('is_active', true)
      .maybeSingle()

    const addressData = {
      user_id,
      tenant_id: staffProfile.tenant_id,
      company_name: company_name || null,
      contact_person: contact_person || null,
      email: email || student.email || '',
      phone: phone || null,
      street: street || null,
      street_number: street_number || null,
      zip: zip || null,
      city: city || null,
      is_active: true
    }

    let upsertError
    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from('company_billing_addresses')
        .update(addressData)
        .eq('id', existing.id)
      upsertError = error
    } else {
      const { error } = await supabaseAdmin
        .from('company_billing_addresses')
        .insert(addressData)
      upsertError = error
    }

    if (upsertError) {
      logger.error('❌ Error saving billing address:', upsertError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to save billing address: ' + upsertError.message })
    }

    logger.debug('✅ Billing address saved for user:', user_id)
    return { success: true }

  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, statusMessage: error.message || 'Failed to save billing address' })
  }
})
