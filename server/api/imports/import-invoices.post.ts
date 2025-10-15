import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, batchId, invoices, createdBy } = body

  if (!tenantId || !batchId || !invoices || !Array.isArray(invoices)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: tenantId, batchId, and invoices array are required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    // Prepare invoice data for insertion
    const invoiceData = invoices.map((invoice: any) => ({
      tenant_id: tenantId,
      batch_id: batchId,
      legacy_id: invoice.legacy_id || null,
      number: invoice.number || null,
      title: invoice.title || null,
      status: invoice.status || null,
      issued_at: invoice.issued_at || null,
      due_at: invoice.due_at || null,
      total_amount: invoice.total_amount || null,
      currency: invoice.currency || 'CHF',
      customer_name: invoice.customer_name || null,
      customer_email: invoice.customer_email || null,
      created_at_original: invoice.created_at_original || null,
      paid_at: invoice.paid_at || null,
      raw_json: invoice.raw_json || {},
      mapped_json: invoice.mapped_json || null,
      created_by: createdBy
    }))

    const { data, error } = await supabaseAdmin
      .from('imported_invoices')
      .insert(invoiceData)
      .select()

    if (error) {
      console.error('Error importing invoices:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to import invoices: ${error.message}`
      })
    }

    return {
      success: true,
      importedCount: data.length,
      invoices: data
    }
  } catch (error: any) {
    console.error('Invoice import failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to import invoices'
    })
  }
})
