import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { convertQuoteToInvoice, emailConvertedInvoice } from '~/server/utils/convert-quote-to-invoice'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token required' })

  const supabase = getSupabaseAdmin()
  const { data: quote, error } = await supabase
    .from('invoices')
    .select('id, tenant_id, document_kind, public_token')
    .eq('public_token', token)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!quote) throw createError({ statusCode: 404, statusMessage: 'Offerte nicht gefunden' })

  try {
    const { invoice } = await convertQuoteToInvoice({
      supabase,
      tenantId: quote.tenant_id,
      invoiceId: quote.id,
      allowDraft: false,
    })

    try {
      await emailConvertedInvoice({ supabase, invoice })
    } catch (mailErr: any) {
      console.warn('[quote/accept] invoice email failed:', mailErr?.message)
    }

    return {
      success: true,
      invoice_number: invoice.invoice_number,
      quote_number: invoice.quote_number,
    }
  } catch (err: any) {
    throw createError({ statusCode: 422, statusMessage: err.message || 'Annahme fehlgeschlagen' })
  }
})
