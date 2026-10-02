import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const query = getQuery(event)
  const raw = String(query.q || '').trim().slice(0, 80)
  const q = raw.replace(/[^a-zA-Z0-9äöüÄÖÜéèàâêîôû@.+\- ]/g, '').trim()
  if (q.length < 1) return { success: true, data: [] }

  const like = `%${q.replace(/[%_]/g, '')}%`
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone')
    .eq('tenant_id', profile.tenant_id)
    .eq('role', 'client')
    .is('deleted_at', null)
    .eq('is_active', true)
    .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .order('first_name', { ascending: true })
    .limit(20)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Kundensuche fehlgeschlagen' })
  }

  return {
    success: true,
    data: (data || []).map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
    })),
  }
})
