import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, batchId, dataType, records, createdBy } = body

  if (!tenantId || !batchId || !dataType || !records || !Array.isArray(records)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: tenantId, batchId, dataType, and records array are required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const recordData = records.map((record: any) => ({
    tenant_id: tenantId,
    batch_id: batchId,
    data_type: dataType,
    raw_json: record.raw_json ?? record,
    created_by: createdBy ?? null
  }))

  const { data, error } = await supabaseAdmin
    .from('imported_records')
    .insert(recordData)
    .select('id')

  if (error) {
    console.error('Error importing records:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to import records: ${error.message}`
    })
  }

  return {
    success: true,
    importedCount: data.length
  }
})
