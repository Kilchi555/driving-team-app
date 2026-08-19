import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { canAcceptQuote } from '~/server/utils/invoice-quote'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token required' })

  const supabase = getSupabaseAdmin()
  const { data: quote, error } = await supabase
    .from('invoices')
    .select('id, tenant_id, document_kind, status, valid_until, accepted_at, declined_at')
    .eq('public_token', token)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!quote) throw createError({ statusCode: 404, statusMessage: 'Offerte nicht gefunden' })

  const gate = canAcceptQuote(quote)
  if (!gate.ok && gate.reason !== 'Offerte wurde noch nicht versendet') {
    throw createError({ statusCode: 422, statusMessage: gate.reason })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ declined_at: now, status: 'cancelled', updated_at: now })
    .eq('id', quote.id)
    .eq('document_kind', 'quote')

  if (updateError) throw createError({ statusCode: 500, statusMessage: updateError.message })
  return { success: true }
})
