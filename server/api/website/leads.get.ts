// GET /api/website/leads — tenant admin: leads from public website contact form
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!user?.tenant_id || !['admin', 'staff'].includes(String(user.role || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { data, error } = await supabase
    .from('website_leads')
    .select('id, first_name, last_name, email, phone, message, category, source, status, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const leads = (data || []).map((row: any) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name || '',
    email: row.email,
    phone: row.phone || '',
    type: String(row.category || 'contact').split(':')[0] || 'contact',
    status: row.status || 'new',
    created_at: row.created_at,
    course_date: null,
    message: row.message || null,
    source: row.source,
  }))

  return { leads, total: leads.length }
})
