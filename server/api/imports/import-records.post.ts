import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { batchId, dataType, records } = body

  if (!batchId || !dataType || !records || !Array.isArray(records)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: batchId, dataType, and records array are required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Verify the batch belongs to the caller's tenant before writing rows into it
  const { data: batch, error: batchError } = await supabaseAdmin
    .from('imports_batches')
    .select('id, tenant_id')
    .eq('id', batchId)
    .single()

  if (batchError || !batch || batch.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – batch does not belong to your tenant' })
  }

  const recordData = records.map((record: any) => ({
    tenant_id: profile.tenant_id,
    batch_id: batchId,
    data_type: dataType,
    raw_json: record.raw_json ?? record,
    created_by: profile.id
  }))

  const { data, error } = await supabaseAdmin
    .from('imported_records')
    .insert(recordData)
    .select('id')

  if (error) {
    console.error('Error importing records:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to import records'
    })
  }

  return {
    success: true,
    importedCount: data.length
  }
})
