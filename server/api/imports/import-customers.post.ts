import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { batchId, customers } = body

  if (!batchId || !customers || !Array.isArray(customers)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: batchId and customers array are required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Verify the batch belongs to the caller's tenant before writing rows into it
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('imports_batches')
      .select('id, tenant_id')
      .eq('id', batchId)
      .single()

    if (batchError || !batch || batch.tenant_id !== profile.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – batch does not belong to your tenant' })
    }

    // Prepare customer data for insertion
    const customerData = customers.map((customer: any) => ({
      tenant_id: profile.tenant_id,
      batch_id: batchId,
      legacy_id: customer.legacy_id || null,
      email: customer.email || null,
      first_name: customer.first_name || null,
      last_name: customer.last_name || null,
      phone: customer.phone || null,
      birthdate: customer.birthdate || null,
      address: customer.address || null,
      city: customer.city || null,
      postal_code: customer.postal_code || null,
      country: customer.country || null,
      customer_number: customer.customer_number || null,
      created_at_original: customer.created_at_original || null,
      updated_at_original: customer.updated_at_original || null,
      raw_json: customer.raw_json || {},
      mapped_json: customer.mapped_json || null,
      created_by: profile.id
    }))

    const { data, error } = await supabaseAdmin
      .from('imported_customers')
      .insert(customerData)
      .select()

    if (error) {
      console.error('Error importing customers:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to import customers'
      })
    }

    return {
      success: true,
      importedCount: data.length,
      customers: data
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Customer import failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import customers'
    })
  }
})
