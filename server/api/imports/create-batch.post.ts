import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { source, note, totalRows, dataType } = body

  if (!source) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: source is required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data, error } = await supabaseAdmin
      .from('imports_batches')
      .insert({
        tenant_id: profile.tenant_id,
        source,
        note,
        total_rows: totalRows,
        created_by: profile.id,
        data_type: dataType ?? null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating import batch:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create import batch'
      })
    }

    return {
      success: true,
      batchId: data.id,
      batch: data
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Import batch creation failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create import batch'
    })
  }
})
