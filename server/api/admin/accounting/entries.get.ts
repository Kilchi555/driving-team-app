import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const PAGE = 1000

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)

  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
  const month = query.month ? parseInt(query.month as string) : null
  const type = query.type as string | undefined

  const dateFrom = month
    ? `${year}-${String(month).padStart(2, '0')}-01`
    : `${year}-01-01`
  const dateTo = month
    ? new Date(year, month, 0).toISOString().split('T')[0]
    : `${year}-12-31`

  const rows: Record<string, unknown>[] = []
  let from = 0

  while (true) {
    let q = supabase
      .from('accounting_entries')
      .select(`
        *,
        category:accounting_categories(id, name, type, color)
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('approval_status', 'approved')
      .is('deleted_at', null)
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1)

    if (type && ['income', 'expense'].includes(type)) {
      q = q.eq('type', type)
    }

    const { data, error } = await q
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    const chunk = data ?? []
    rows.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }

  return { success: true, data: rows }
})
