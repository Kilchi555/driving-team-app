import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const tenantId = query.tenantId as string

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tenantId is required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data, error } = await supabaseAdmin
      .from('imports_batches')
      .select(`
        *,
        imported_customers(count),
        imported_invoices(count)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching import batches:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch import batches: ${error.message}`
      })
    }

    return {
      success: true,
      batches: data
    }
  } catch (error: any) {
    console.error('Import batches fetch failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch import batches'
    })
  }
})
