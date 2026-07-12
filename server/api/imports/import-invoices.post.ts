import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { batchId, invoices } = body

  if (!batchId || !invoices || !Array.isArray(invoices)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: batchId and invoices array are required'
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

    // Prepare invoice data for insertion
    const invoiceData = invoices.map((invoice: any) => ({
      tenant_id: profile.tenant_id,
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
      created_by: profile.id
    }))

    const { data, error } = await supabaseAdmin
      .from('imported_invoices')
      .insert(invoiceData)
      .select()

    if (error) {
      console.error('Error importing invoices:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to import invoices'
      })
    }

    return {
      success: true,
      importedCount: data.length,
      invoices: data
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Invoice import failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import invoices'
    })
  }
})
