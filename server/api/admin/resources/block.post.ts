/**
 * POST /api/admin/resources/block
 * Create a manual resource reservation (room or vehicle).
 *
 * Body: {
 *   resource_type: 'room' | 'vehicle'
 *   resource_id: string (UUID)
 *   start_time: string (ISO)
 *   end_time: string (ISO)
 *   purpose: 'internal' | 'external' | 'maintenance' | 'meeting' | 'event' | <custom string, e.g. "Fotoshooting">
 *   notes?: string
 *   // Internal only:
 *   booked_by_user_id?: string (UUID) — defaults to caller's own user_id
 *   // External only:
 *   external_contact_name: string
 *   external_contact_email: string
 *   external_contact_phone?: string
 * }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { sendTenantEmail, sendEmail } from '~/server/utils/email'
import { buildInvoiceEmailHtml } from '~/server/utils/invoice-email'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'
import { allocateInvoiceNumber } from '~/server/utils/allocate-invoice-number'
import { computeInvoiceDueDate, getTenantInvoiceDueDays } from '~/server/utils/invoice-due-date'

const INTERNAL_PURPOSES = ['internal', 'maintenance', 'meeting', 'event']
const ALL_PURPOSES = [...INTERNAL_PURPOSES, 'external']
const MAX_CUSTOM_PURPOSE_LENGTH = 60

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-CH', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  const {
    resource_type,
    resource_id,
    start_time,
    end_time,
    purpose,
    notes,
    booked_by_user_id,
    external_contact_name,
    external_contact_email,
    external_contact_phone,
    external_company_name,
    external_street,
    external_street_nr,
    external_zip,
    external_city,
    create_user,
    create_invoice,
  } = body
  const billing_pending = body.billing_pending ?? false
  const send_confirmation = body.send_confirmation !== false
  const send_invoice = body.send_invoice !== false

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!resource_type || !['room', 'vehicle'].includes(resource_type)) {
    throw createError({ statusCode: 400, statusMessage: 'resource_type must be "room" or "vehicle"' })
  }
  if (!resource_id || !start_time || !end_time) {
    throw createError({ statusCode: 400, statusMessage: 'resource_id, start_time, end_time are required' })
  }
  const trimmedPurpose = typeof purpose === 'string' ? purpose.trim() : ''
  if (!trimmedPurpose) {
    throw createError({ statusCode: 400, statusMessage: `purpose must be one of: ${ALL_PURPOSES.join(', ')}, or a custom label` })
  }
  // Allow a custom, staff-defined purpose label (e.g. "Fotoshooting") in addition to the fixed set.
  const isCustomPurpose = !ALL_PURPOSES.includes(trimmedPurpose)
  if (isCustomPurpose && trimmedPurpose.length > MAX_CUSTOM_PURPOSE_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `Zweck darf maximal ${MAX_CUSTOM_PURPOSE_LENGTH} Zeichen lang sein.` })
  }
  if (new Date(start_time) >= new Date(end_time)) {
    throw createError({ statusCode: 400, statusMessage: 'start_time must be before end_time' })
  }
  if (trimmedPurpose === 'external') {
    if (!external_contact_name?.trim()) throw createError({ statusCode: 400, statusMessage: 'external_contact_name is required for external reservations' })
    if (!external_contact_email?.trim()) throw createError({ statusCode: 400, statusMessage: 'external_contact_email is required for external reservations' })
  }

  // ── Conflict check ───────────────────────────────────────────────────────────
  const table = resource_type === 'room' ? 'room_bookings' : 'vehicle_bookings'
  const idField = resource_type === 'room' ? 'room_id' : 'vehicle_id'

  const { data: conflicts } = await supabase
    .from(table)
    .select('id')
    .eq(idField, resource_id)
    .neq('status', 'cancelled')
    .lt('start_time', end_time)
    .gt('end_time', start_time)
    .limit(1)

  if ((conflicts?.length ?? 0) > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Konflikt: Ressource ist im gewählten Zeitfenster bereits reserviert.' })
  }

  // ── Resource ownership check ─────────────────────────────────────────────────
  const resourceTable = resource_type === 'room' ? 'rooms' : 'vehicles'
  const { data: resource } = await supabase
    .from(resourceTable)
    .select('id, name, tenant_id')
    .eq('id', resource_id)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!resource) {
    throw createError({ statusCode: 403, statusMessage: 'Ressource nicht gefunden oder gehört nicht zu deinem Tenant.' })
  }

  // ── Insert booking ────────────────────────────────────────────────────────────
  const isExternal = trimmedPurpose === 'external'
  const bookingPurpose = isExternal ? 'external' : trimmedPurpose // e.g. 'maintenance', 'meeting', 'event', 'internal', or a custom label

  const externalFields = isExternal ? {
    external_contact_name: external_contact_name.trim(),
    external_contact_email: external_contact_email.trim().toLowerCase(),
    external_contact_phone: external_contact_phone?.trim() || null,
    external_company_name: external_company_name?.trim() || null,
    external_street: external_street?.trim() || null,
    external_street_nr: external_street_nr?.trim() || null,
    external_zip: external_zip?.trim() || null,
    external_city: external_city?.trim() || null,
    billing_pending: billing_pending === true,
  } : {}

  let insertData: Record<string, any>
  if (resource_type === 'room') {
    insertData = {
      room_id: resource_id,
      tenant_id: profile.tenant_id,
      start_time, end_time,
      purpose: bookingPurpose,
      status: 'confirmed',
      notes: notes?.trim() || null,
      booked_by: booked_by_user_id || profile.id,
      ...externalFields,
    }
  } else {
    insertData = {
      vehicle_id: resource_id,
      tenant_id: profile.tenant_id,
      start_time, end_time,
      purpose: bookingPurpose,
      status: 'confirmed',
      notes: notes?.trim() || null,
      booked_by: booked_by_user_id || profile.id,
      ...externalFields,
    }
  }

  const { data: booking, error: insertError } = await supabase
    .from(table)
    .insert(insertData)
    .select()
    .single()

  if (insertError || !booking) {
    throw createError({ statusCode: 500, statusMessage: insertError?.message || 'Fehler beim Erstellen der Reservierung.' })
  }

  // ── Email confirmation (external only, if enabled) ───────────────────────────
  if (isExternal && external_contact_email && send_confirmation) {
    const resourceLabel = resource_type === 'room' ? 'Raum' : 'Fahrzeug'
    const startFormatted = formatDateTime(start_time)
    const endFormatted = formatDateTime(end_time)

    try {
      await sendTenantEmail(profile.tenant_id, {
        to: external_contact_email.trim(),
        subject: `Ihre ${resourceLabel}-Reservierung wurde bestätigt`,
        html: `
          <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; color: #111;">
            <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 15px;">Ihre Anfrage wurde erfolgreich aufgenommen.</p>

            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 130px;">${resourceLabel}</td>
                  <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${resource.name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Von</td>
                  <td style="padding: 6px 0; font-size: 14px;">${startFormatted}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Bis</td>
                  <td style="padding: 6px 0; font-size: 14px;">${endFormatted}</td>
                </tr>
                ${notes ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Notizen</td>
                  <td style="padding: 6px 0; font-size: 14px;">${notes.trim()}</td>
                </tr>` : ''}
              </table>
            </div>

            <p style="font-size: 13px; color: #9ca3af;">
              Diese Bestätigung wurde automatisch erstellt. Bei Fragen wenden Sie sich bitte direkt an uns.
            </p>
          </div>
        `,
      })
    } catch (emailErr: any) {
      // Non-fatal — booking was already created
      console.warn('⚠️ Confirmation email failed (non-fatal):', emailErr?.message)
    }
  }

  // ── Email notification for internal bookings reserved FOR another staff member ─
  if (!isExternal && booked_by_user_id && booked_by_user_id !== profile.id) {
    const { data: staffMember } = await supabase
      .from('users').select('email, first_name, last_name').eq('id', booked_by_user_id).single()

    if (staffMember?.email) {
      const resourceLabel = resource_type === 'room' ? 'Raum' : 'Fahrzeug'
      const startFormatted = formatDateTime(start_time)
      const endFormatted = formatDateTime(end_time)
      const reservedByName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
      try {
        await sendTenantEmail(profile.tenant_id, {
          to: staffMember.email,
          subject: `${resourceLabel} für dich reserviert: ${resource.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; color: #111;">
              <p style="font-size: 15px; color: #6b7280; margin: 0 0 20px 0;">
                ${reservedByName} hat einen ${resourceLabel} für dich reserviert.
              </p>
              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 130px;">${resourceLabel}</td>
                    <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${resource.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Von</td>
                    <td style="padding: 6px 0; font-size: 14px;">${startFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Bis</td>
                    <td style="padding: 6px 0; font-size: 14px;">${endFormatted}</td>
                  </tr>
                  ${notes ? `
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Notizen</td>
                    <td style="padding: 6px 0; font-size: 14px;">${notes.trim()}</td>
                  </tr>` : ''}
                </table>
              </div>
              <p style="font-size: 13px; color: #9ca3af;">
                Diese Benachrichtigung wurde automatisch erstellt.
              </p>
            </div>
          `,
        })
      } catch (emailErr: any) {
        console.warn('⚠️ Internal staff notification email failed (non-fatal):', emailErr?.message)
      }
    }
  }

  // ── Optional: create client user ─────────────────────────────────────────────
  let createdUserId: string | null = null
  if (isExternal && create_user && external_contact_email) {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', external_contact_email.trim().toLowerCase())
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (!existingUser) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          tenant_id: profile.tenant_id,
          email: external_contact_email.trim().toLowerCase(),
          first_name: external_contact_name.trim().split(' ')[0] || external_contact_name.trim(),
          last_name: external_contact_name.trim().split(' ').slice(1).join(' ') || null,
          phone: external_contact_phone?.trim() || null,
          street: external_street?.trim() || null,
          street_nr: external_street_nr?.trim() || null,
          zip: external_zip?.trim() || null,
          city: external_city?.trim() || null,
          role: 'client',
          is_active: true,
        })
        .select('id')
        .single()
      createdUserId = newUser?.id || null
    } else {
      createdUserId = existingUser.id
    }
  }

  // ── Optional: create & send invoice ──────────────────────────────────────────
  let invoiceNumber: string | null = null
  if (isExternal && create_invoice && external_contact_email) {
    try {
      const resourceLabel = resource_type === 'room' ? 'Raum' : 'Fahrzeug'
      const costRappen = resource_type === 'room' ? (booking as any).room_cost_rappen : (booking as any).cost_rappen
      if (costRappen && costRappen > 0) {
        const today = new Date()
        const invoiceDateStr = today.toISOString().split('T')[0]
        const dueDays = await getTenantInvoiceDueDays(supabase, profile.tenant_id)
        const dueDateStr = computeInvoiceDueDate(invoiceDateStr, dueDays)

        // Load tenant for branding (+ payment terms)
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name, legal_company_name, contact_email, invoice_number_prefix, next_invoice_number, primary_color, secondary_color, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, invoice_payment_terms, invoice_due_days')
          .eq('id', profile.tenant_id)
          .single()

        const tenantData = tenant as any
        invoiceNumber = await allocateInvoiceNumber(supabase, profile.tenant_id)

        const { data: invoiceRes } = await supabase
          .from('invoices')
          .insert({
            tenant_id: profile.tenant_id,
            user_id: createdUserId || null,
            staff_id: profile.id,
            invoice_number: invoiceNumber,
            invoice_date: invoiceDateStr,
            due_date: dueDateStr,
            billing_type: external_company_name ? 'company' : 'individual',
            billing_company_name: external_company_name?.trim() || null,
            billing_contact_person: external_contact_name.trim(),
            billing_email: external_contact_email.trim().toLowerCase(),
            billing_street: external_street?.trim() || null,
            billing_street_number: external_street_nr?.trim() || null,
            billing_zip: external_zip?.trim() || null,
            billing_city: external_city?.trim() || null,
            billing_country: 'CH',
            subtotal_rappen: costRappen,
            vat_rate: 0,
            vat_amount_rappen: 0,
            discount_amount_rappen: 0,
            total_amount_rappen: costRappen,
            status: 'sent',
            payment_status: 'pending',
            payment_method: 'invoice',
            sent_at: new Date().toISOString(),
          })
          .select('id, invoice_number')
          .single()

        if (invoiceRes) {
          invoiceNumber = invoiceRes.invoice_number

          // Link invoice to booking
          await supabase.from(table).update({ invoice_id: invoiceRes.id }).eq('id', booking.id)

          const invoiceItem = {
            invoice_id: invoiceRes.id,
            tenant_id: profile.tenant_id,
            product_name: `${resourceLabel}: ${resource.name}`,
            product_description: `${formatDateTime(start_time)} – ${formatDateTime(end_time)}`,
            quantity: 1,
            unit_price_rappen: costRappen,
            total_price_rappen: costRappen,
            vat_rate: 0,
            vat_amount_rappen: 0,
            sort_order: 0,
          }
          await supabase.from('invoice_items').insert(invoiceItem)

          // Send invoice email if requested
          if (send_invoice) {
            const customerName = external_company_name?.trim() || external_contact_name.trim() || 'Kunde'
            try {
              const html = buildInvoiceEmailHtml({
                customerName,
                invoiceNumber: invoiceNumber!,
                invoiceDate: invoiceDateStr,
                dueDate: dueDateStr,
                items: [{
                  product_name: invoiceItem.product_name,
                  product_description: invoiceItem.product_description,
                  quantity: 1,
                  unit_price_rappen: costRappen,
                  total_price_rappen: costRappen,
                }],
                subtotalRappen: costRappen,
                totalRappen: costRappen,
                tenantName: tenantData?.name || '',
                staffName: `${profile.first_name} ${profile.last_name}`.trim(),
                primaryColor: tenantData?.primary_color || null,
                paymentTerms: (tenantData as any)?.invoice_payment_terms || null,
                footerText: (tenantData as any)?.invoice_footer_text || null,
              })

              // Generate PDF (non-fatal if it fails)
              let pdfAttachments: any[] = []
              try {
                const logoDataUrl: string | null = tenantData?.logo_wide_url || null
                let tenantLogoBase64: string | null = null
                let tenantLogoFormat: 'png' | 'jpeg' = 'png'
                if (logoDataUrl?.startsWith('data:image/')) {
                  const match = logoDataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
                  if (match) {
                    tenantLogoFormat = match[1] === 'jpg' ? 'jpeg' : match[1] as 'png' | 'jpeg'
                    tenantLogoBase64 = match[2]
                  }
                }
                const pdfBuffer = await generateInvoicePdf({
                  invoiceNumber: invoiceNumber!,
                  invoiceDate: invoiceDateStr,
                  dueDate: dueDateStr,
                  tenantName: tenantData?.legal_company_name || tenantData?.name || '',
                  tenantStreet: [tenantData?.invoice_street, tenantData?.invoice_street_nr].filter(Boolean).join(' '),
                  tenantZip: tenantData?.invoice_zip || '',
                  tenantCity: tenantData?.invoice_city || '',
                  tenantEmail: tenantData?.contact_email || '',
                  tenantLogoBase64,
                  tenantLogoFormat,
                  customerName,
                  billingStreet: [external_street, external_street_nr].filter(Boolean).join(' '),
                  billingZip: external_zip || '',
                  billingCity: external_city || '',
                  billingEmail: external_contact_email.trim().toLowerCase(),
                  items: [{
                    product_name: invoiceItem.product_name,
                    product_description: invoiceItem.product_description,
                    quantity: 1,
                    unit_price_rappen: costRappen,
                    total_price_rappen: costRappen,
                  }],
                  subtotalRappen: costRappen,
                  discountRappen: 0,
                  totalRappen: costRappen,
                  qrCodeDataUrl: null,
                  qrIban: null,
                  scorRef: null,
                  creditorName: tenantData?.legal_company_name || tenantData?.name || '',
                  primaryColor: tenantData?.primary_color || '#1E40AF',
                  secondaryColor: tenantData?.secondary_color || '#64748B',
                })
                pdfAttachments = [{ filename: `Rechnung_${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
                console.log(`✅ [block] PDF generiert: Rechnung_${invoiceNumber}.pdf`)
              } catch (pdfErr: any) {
                console.warn('⚠️ [block] PDF-Generierung fehlgeschlagen (non-fatal):', pdfErr?.message)
              }

              await sendEmail({
                to: external_contact_email.trim().toLowerCase(),
                subject: `Rechnung ${invoiceNumber} – ${tenantData?.name || ''}`,
                html,
                senderName: tenantData?.name,
                attachments: pdfAttachments,
              })
              console.log(`✅ [block] Rechnung ${invoiceNumber} per E-Mail versendet an ${external_contact_email}`)
            } catch (emailErr: any) {
              console.warn('⚠️ [block] Rechnungs-E-Mail fehlgeschlagen (non-fatal):', emailErr?.message)
            }
          }
        }
      }
    } catch (invErr: any) {
      console.warn('⚠️ Invoice creation failed (non-fatal):', invErr?.message)
    }
  }

  return { success: true, booking, created_user_id: createdUserId, invoice_number: invoiceNumber }
})
