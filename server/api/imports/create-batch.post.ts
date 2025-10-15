import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId, source, note, totalRows, createdBy } = body

  if (!tenantId || !source) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: tenantId and source are required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data, error } = await supabaseAdmin
      .from('imports_batches')
      .insert({
        tenant_id: tenantId,
        source,
        note,
        total_rows: totalRows,
        created_by: createdBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating import batch:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create import batch: ${error.message}`
      })
    }

    return {
      success: true,
      batchId: data.id,
      batch: data
    }
  } catch (error: any) {
    console.error('Import batch creation failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create import batch'
    })
  }
})
