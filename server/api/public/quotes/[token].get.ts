import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { isQuoteDocument, quoteLifecycle } from '~/server/utils/invoice-quote'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token required' })

  const supabase = getSupabaseAdmin()
  const { data: row, error } = await supabase
    .from('invoices')
    .select(`
      id, document_kind, quote_number, invoice_number, invoice_date, valid_until, due_date,
      status, accepted_at, declined_at, billing_company_name, billing_contact_person,
      billing_city, subtotal_rappen, vat_rate, vat_amount_rappen, discount_amount_rappen,
      total_amount_rappen, notes, tenant_id
    `)
    .eq('public_token', token)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!row || (!isQuoteDocument(row.document_kind) && !row.accepted_at && !row.quote_number)) {
    throw createError({ statusCode: 404, statusMessage: 'Offerte nicht gefunden' })
  }

  const [{ data: items }, { data: tenant }] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('product_name, product_description, quantity, unit_price_rappen, total_price_rappen, vat_rate')
      .eq('invoice_id', row.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('tenants')
      .select('name, legal_company_name, primary_color, logo_wide_url')
      .eq('id', row.tenant_id)
      .maybeSingle(),
  ])

  return {
    success: true,
    data: {
      quote_number: row.quote_number || row.invoice_number,
      invoice_number: row.accepted_at ? row.invoice_number : null,
      invoice_date: row.invoice_date,
      valid_until: row.valid_until || row.due_date,
      lifecycle: quoteLifecycle(row),
      customer_name: row.billing_company_name || row.billing_contact_person || 'Kunde',
      city: row.billing_city,
      notes: row.notes,
      subtotal_rappen: row.subtotal_rappen,
      vat_rate: row.vat_rate,
      vat_amount_rappen: row.vat_amount_rappen,
      discount_amount_rappen: row.discount_amount_rappen,
      total_amount_rappen: row.total_amount_rappen,
      items: items || [],
      tenant_name: tenant?.legal_company_name || tenant?.name || '',
      primary_color: tenant?.primary_color || '#1E40AF',
    },
  }
})
