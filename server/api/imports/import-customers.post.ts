import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, batchId, customers, createdBy } = body

  if (!tenantId || !batchId || !customers || !Array.isArray(customers)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: tenantId, batchId, and customers array are required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Prepare customer data for insertion
    const customerData = customers.map((customer: any) => ({
      tenant_id: tenantId,
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
      created_by: createdBy
    }))

    const { data, error } = await supabaseAdmin
      .from('imported_customers')
      .insert(customerData)
      .select()

    if (error) {
      console.error('Error importing customers:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to import customers: ${error.message}`
      })
    }

    return {
      success: true,
      importedCount: data.length,
      customers: data
    }
  } catch (error: any) {
    console.error('Customer import failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to import customers'
    })
  }
})
