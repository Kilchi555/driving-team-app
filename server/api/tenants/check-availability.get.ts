import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { slug, email } = getQuery(event) as { slug?: string; email?: string }

  if (!slug && !email) {
    throw createError({ statusCode: 400, statusMessage: 'slug oder email erforderlich' })
  }

  const supabase = getSupabaseAdmin()
  const result: { slug?: { available: boolean }; email?: { available: boolean } } = {}

  if (slug) {
    const normalized = String(slug).toLowerCase().trim()
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', normalized)
      .maybeSingle()
    result.slug = { available: !data }
  }

  if (email) {
    const normalized = String(email).toLowerCase().trim()
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()
    result.email = { available: !data }
  }

  return result
})
