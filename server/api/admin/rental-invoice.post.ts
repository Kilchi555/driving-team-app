/**
 * POST /api/admin/rental-invoice
 *
 * Actions:
 *   generate_invoice — creates an invoice record for all unpaid confirmed rentals
 *                      of a renter in a given month and marks them as invoice_sent
 *   record_cash      — marks specific or all unpaid confirmed rentals as paid_cash
 *   update_payment   — update payment_method or rental_payment_method on user (per-user override)
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { computeInvoiceDueDate, getTenantInvoiceDueDays } from '~/server/utils/invoice-due-date'
import { computeVatAmountRappen, getTenantDefaultVatRate } from '~/server/utils/invoice-vat'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser || !['admin', 'superadmin'].includes(dbUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const { action, renter_user_id, month, rental_ids } = body

  // ── update_payment: set per-user rental payment method ──────────────────────
  if (action === 'update_payment') {
    const { user_id, rental_payment_method } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id required' })

    const allowed = ['invoice', 'cash', 'online', null]
    if (!allowed.includes(rental_payment_method)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid payment method' })
    }

    const { error } = await supabase
      .from('users')
      .update({ rental_payment_method: rental_payment_method ?? null })
      .eq('id', user_id)
      .eq('tenant_id', dbUser.tenant_id)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to update payment method' })
    return { success: true }
  }

  if (!renter_user_id) throw createError({ statusCode: 400, statusMessage: 'renter_user_id required' })

  // Fetch renter
  const { data: renter } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, street, street_nr, zip, city')
    .eq('id', renter_user_id)
    .eq('tenant_id', dbUser.tenant_id)
    .maybeSingle()

  if (!renter) throw createError({ statusCode: 404, statusMessage: 'Renter not found' })

  // Fetch tenant for invoice numbering
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, address, zip, city')
    .eq('id', dbUser.tenant_id)
    .maybeSingle()

  // ── record_cash ──────────────────────────────────────────────────────────────
  if (action === 'record_cash') {
    let q = supabase
      .from('vehicle_rentals')
      .update({ payment_status: 'paid_cash', payment_method: 'cash' })
      .eq('renter_user_id', renter_user_id)
      .eq('tenant_id', dbUser.tenant_id)
      .eq('status', 'confirmed')
      .eq('payment_status', 'unpaid')

    if (rental_ids?.length) q = q.in('id', rental_ids)

    const { error } = await q
    if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to record cash payment' })
    return { success: true, message: 'Barzahlung verbucht.' }
  }

  // ── generate_invoice ─────────────────────────────────────────────────────────
  if (action === 'generate_invoice') {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw createError({ statusCode: 400, statusMessage: 'month (YYYY-MM) required' })
    }

    const [year, m] = month.split('-').map(Number)
    const fromDate = new Date(year, m - 1, 1).toISOString()
    const toDate = new Date(year, m, 1).toISOString()

    const { data: rentals, error: fetchErr } = await supabase
      .from('vehicle_rentals')
      .select(`
        id, start_time, end_time,
        hourly_rate_rappen, total_amount_rappen,
        vehicles (make, model, year, license_plate)
      `)
      .eq('renter_user_id', renter_user_id)
      .eq('tenant_id', dbUser.tenant_id)
      .eq('status', 'confirmed')
      .eq('payment_status', 'unpaid')
      .gte('start_time', fromDate)
      .lt('start_time', toDate)
      .order('start_time', { ascending: true })

    if (fetchErr) throw createError({ statusCode: 500, statusMessage: 'Failed to load rentals' })
    if (!rentals || rentals.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Keine offenen bestätigten Buchungen für diesen Monat.' })
    }

    const subtotalRappen = rentals.reduce((sum, r) => sum + (r.total_amount_rappen ?? 0), 0)
    const vatRate = await getTenantDefaultVatRate(supabase, dbUser.tenant_id)
    const vatAmountRappen = computeVatAmountRappen(subtotalRappen, vatRate)
    const totalRappen = subtotalRappen + vatAmountRappen

    const { data: tenantTexts } = await supabase
      .from('tenants')
      .select('invoice_intro_text, invoice_payment_terms, invoice_footer_text')
      .eq('id', dbUser.tenant_id)
      .maybeSingle()

    // Generate invoice number
    const invoiceCount = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', dbUser.tenant_id)
    const seq = ((invoiceCount.count ?? 0) + 1).toString().padStart(4, '0')
    const invoiceNumber = `MR-${year}${String(m).padStart(2, '0')}-${seq}`

    // Create invoice record
    const renterName = [renter.first_name, renter.last_name].filter(Boolean).join(' ')
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert({
        tenant_id: dbUser.tenant_id,
        user_id: renter_user_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: computeInvoiceDueDate(
          new Date().toISOString().split('T')[0],
          await getTenantInvoiceDueDays(supabase, dbUser.tenant_id)
        ),
        billing_type: 'individual',
        billing_contact_person: renterName,
        billing_email: renter.email,
        billing_street: renter.street,
        billing_street_number: renter.street_nr,
        billing_zip: renter.zip,
        billing_city: renter.city,
        billing_country: 'CH',
        subtotal_rappen: subtotalRappen,
        vat_rate: vatRate,
        vat_amount_rappen: vatAmountRappen,
        discount_amount_rappen: 0,
        total_amount_rappen: totalRappen,
        status: 'sent',
        payment_status: 'pending',
        payment_method: 'invoice',
        notes: (tenantTexts as any)?.invoice_intro_text || null,
        payment_terms: (tenantTexts as any)?.invoice_payment_terms || null,
        footer_text: (tenantTexts as any)?.invoice_footer_text || null,
        internal_notes: `Fahrzeugmiete ${month}`,
      })
      .select('id')
      .single()

    if (invoiceErr) {
      logger.error('Failed to create invoice:', invoiceErr)
      throw createError({ statusCode: 500, statusMessage: 'Rechnung konnte nicht erstellt werden.' })
    }

    // Create invoice_items
    const lineItems = rentals.map((r: any) => {
      const start = new Date(r.start_time)
      const end = new Date(r.end_time)
      const durationH = (end.getTime() - start.getTime()) / 3_600_000
      const vehicle = r.vehicles
      const vehicleLabel = vehicle
        ? `${vehicle.make} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}${vehicle.license_plate ? ` [${vehicle.license_plate}]` : ''}`
        : 'Fahrzeug'
      const dateLabel = `${start.toLocaleDateString('de-CH')} ${start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
      return {
        invoice_id: invoice.id,
        description: `${vehicleLabel} — ${dateLabel}`,
        quantity: Math.round(durationH * 100) / 100,
        unit_price_rappen: r.hourly_rate_rappen,
        amount_rappen: r.total_amount_rappen ?? Math.round(r.hourly_rate_rappen * durationH),
      }
    })

    await supabase.from('invoice_items').insert(lineItems)

    // Update vehicle_rentals: link to invoice + mark invoice_sent
    await supabase
      .from('vehicle_rentals')
      .update({
        payment_status: 'invoice_sent',
        payment_method: 'invoice',
        invoice_id: invoice.id,
      })
      .in('id', rentals.map(r => r.id))

    logger.info('✅ Rental invoice created:', { invoice_number: invoiceNumber, renter: renter_user_id, total: totalRappen })

    return {
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      renter_name: renterName,
      month,
      total_chf: (totalRappen / 100).toFixed(2),
      rental_count: rentals.length,
      message: `Rechnung ${invoiceNumber} erstellt (CHF ${(totalRappen / 100).toFixed(2)}).`,
    }
  }

  throw createError({ statusCode: 400, statusMessage: 'Unknown action' })
})
