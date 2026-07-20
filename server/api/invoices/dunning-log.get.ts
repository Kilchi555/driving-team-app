// server/api/invoices/dunning-log.get.ts
// Liefert die Mahnhistorie einer einzelnen Rechnung (für InvoiceDetailModal).

import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const invoiceId = query.invoice_id as string
  if (!invoiceId) throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })

  // invoices_with_details (von der das Rechnungs-Objekt im Frontend meist stammt) wurde
  // vor Einführung des Mahnwesens erstellt und enthält die neuen dunning_*-Spalten nicht.
  // Daher hier direkt aus der Basistabelle lesen, damit UI-Badges/Status immer aktuell sind.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('tenant_id, dunning_level, dunning_paused, last_dunning_sent_at')
    .eq('id', invoiceId)
    .single()
  if (!invoice || invoice.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { data, error } = await supabase
    .from('invoice_dunning_log')
    .select('id, stage, stage_key, sent_to, subject, fee_rappen, interest_rappen, outstanding_amount_rappen, new_due_date, status, error_message, sent_at, sent_by')
    .eq('invoice_id', invoiceId)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('invoice_dunning_log query failed:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return {
    entries: data ?? [],
    dunning_level: invoice.dunning_level || 0,
    dunning_paused: !!invoice.dunning_paused,
    last_dunning_sent_at: invoice.last_dunning_sent_at,
  }
})
