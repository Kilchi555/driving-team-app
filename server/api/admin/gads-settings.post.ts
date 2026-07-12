import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event) as { google_ads_customer_id?: string }

  // Normalize: accept "191-669-8119" and "1916698119" — store with dashes
  const raw = (body.google_ads_customer_id ?? '').trim().replace(/-/g, '')
  const formatted = raw
    ? raw.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
    : ''

  if (raw && !/^\d{10}$/.test(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Google Ads Customer ID format. Expected 10-digit number like 191-669-8119.' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('tenants')
    .update({ google_ads_customer_id: formatted || null })
    .eq('id', profile.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    success: true,
    google_ads_customer_id: formatted,
    connected: !!formatted,
  }
})
