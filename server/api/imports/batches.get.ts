import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)

  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data, error } = await supabaseAdmin
      .from('imports_batches')
      .select(`
        *,
        imported_customers(count),
        imported_invoices(count),
        imported_records(count)
      `)
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching import batches:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch import batches'
      })
    }

    return {
      success: true,
      batches: data
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Import batches fetch failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch import batches'
    })
  }
})
