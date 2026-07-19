// server/api/invoices/toggle-dunning-pause.post.ts
// Pausiert/reaktiviert das Mahnwesen für eine einzelne Rechnung (z.B. bei
// vereinbarter Ratenzahlung). Pausierte Rechnungen werden im
// Mahnwesen-Dashboard nicht mehr als Kandidat vorgeschlagen.
// Body: { invoiceId, paused }

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const { invoiceId, paused } = await readBody(event)
  if (!invoiceId) throw createError({ statusCode: 400, statusMessage: 'invoiceId required' })

  const { data: invoice } = await supabase.from('invoices').select('tenant_id').eq('id', invoiceId).single()
  if (!invoice || invoice.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { error } = await supabase
    .from('invoices')
    .update({ dunning_paused: !!paused })
    .eq('id', invoiceId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, dunning_paused: !!paused }
})
