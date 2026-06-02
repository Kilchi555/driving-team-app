import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const KEY_TABLES = [
  'users', 'appointments', 'payments', 'tenants', 'locations',
  'exam_results', 'invoices', 'audit_logs', 'cron_jobs',
]

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (caller?.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super admin only' })
  }

  // Count rows in key tables
  const tableCounts = await Promise.all(
    KEY_TABLES.map(async (table) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        return { table, count: error ? null : count, error: error?.message }
      } catch {
        return { table, count: null, error: 'Table not accessible' }
      }
    })
  )

  // Get DB size via raw SQL
  let dbSize = null
  let dbSizeError = null
  try {
    const { data, error } = await supabase.rpc('get_db_size')
    if (!error && data) dbSize = data
    else dbSizeError = error?.message
  } catch {
    dbSizeError = 'Function not available'
  }

  // Get latest records timestamps for drift detection
  const timestamps = await Promise.all([
    getLatest(supabase, 'users', 'created_at'),
    getLatest(supabase, 'appointments', 'created_at'),
    getLatest(supabase, 'payments', 'created_at'),
  ])

  return {
    checkedAt: new Date().toISOString(),
    tableCounts,
    dbSize,
    dbSizeError,
    latestRecords: {
      users: timestamps[0],
      appointments: timestamps[1],
      payments: timestamps[2],
    },
  }
})

async function getLatest(supabase: any, table: string, col: string) {
  try {
    const { data } = await supabase
      .from(table)
      .select(col)
      .order(col, { ascending: false })
      .limit(1)
      .single()
    return data?.[col] ?? null
  } catch {
    return null
  }
}
