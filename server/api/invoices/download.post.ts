// API-Endpunkt für PDF-Download von Rechnungen
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import type { InvoiceWithDetails } from '~/types/invoice'
import { logger } from '~/utils/logger'

interface DownloadRequest {
  invoiceId: string
}

interface DownloadResponse {
  success: boolean
  pdfUrl?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<DownloadResponse> => {
  try {
    const { invoiceId }: DownloadRequest = await readBody(event)
    
    if (!invoiceId) {
      throw new Error('Invoice ID is required')
    }

    logger.debug('📄 Generating PDF for invoice:', invoiceId)

    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw new Error('Unauthorized')
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices_with_details')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    // Tenant-Daten laden (Logo, Adresse, Legal Name)
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('legal_company_name, name, logo_square_url, logo_wide_url, invoice_street, invoice_street_nr, invoice_zip, invoice_city, contact_email, contact_phone, primary_color')
      .eq('id', invoice.tenant_id)
      .single()

    // Rechnungspositionen abrufen
    const { data: invoiceItems, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true })

    if (itemsError) {
      throw new Error('Error fetching invoice items')
    }

    // Appointment start_times direkt aus appointments laden (korrekte Uhrzeit)
    const appointmentIds = (invoiceItems || []).map((i: any) => i.appointment_id).filter(Boolean)
    const appointmentMap: Record<string, any> = {}
    if (appointmentIds.length > 0) {
      const { data: appointments } = await supabaseAdmin
        .from('appointments')
        .select('id, start_time, event_type_code, type')
        .in('id', appointmentIds)
      if (appointments) {
        for (const apt of appointments) appointmentMap[apt.id] = apt
      }
    }

    const eventTypeMap: Record<string, string> = {
      lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorieunterricht', vku: 'VKU', haltbar: 'Haltbarkeitsprüfung'
    }

    const enrichedItems = (invoiceItems || []).map((item: any) => {
      const apt = item.appointment_id ? appointmentMap[item.appointment_id] : null
      const eventLabel = apt?.event_type_code ? (eventTypeMap[apt.event_type_code] || apt.event_type_code) : null
      return {
        ...item,
        product_name: eventLabel || item.product_name,
        product_description: apt?.type ? `Kat. ${apt.type}` : item.product_description,
        appointment_start_time: apt?.start_time || null,
      }
    })

    const pdfBuffer = await generateInvoicePDF(invoice, enrichedItems, tenant)
    
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`

    logger.debug('✅ PDF generated successfully for invoice:', invoice.invoice_number)

    return { success: true, pdfUrl }

  } catch (error: any) {
    console.error('❌ Error generating PDF:', error)
    return { success: false, error: error.message || 'Error generating PDF' }
  }
})

// Hilfsfunktion für PDF-Generierung
function formatAppointmentDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  let timeStr = dateStr
  if (timeStr.includes(' ') && !timeStr.includes('T')) timeStr = timeStr.replace(' ', 'T')
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) timeStr = timeStr.replace('+00', '+00:00')
  if (!timeStr.includes('+') && !timeStr.includes('Z')) timeStr += '+00:00'
  const utcDate = new Date(timeStr)
  if (isNaN(utcDate.getTime())) return ''
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  const dateFormatted = localDate.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeFormatted = localDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  return `${dateFormatted}, ${timeFormatted}`
}

async function generateInvoicePDF(invoice: InvoiceWithDetails, items: any[], tenant: any): Promise<Buffer> {
  try {
    const { jsPDF } = await import('jspdf')
    
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = 210
    const pageHeight = 297
    const margin = 20
    const contentWidth = pageWidth - 2 * margin  // 170mm
    const rightEdge = pageWidth - margin          // 190mm

    const primaryColor = tenant?.primary_color || '#019ee5'
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return { r, g, b }
    }
    const pc = hexToRgb(primaryColor)

    let y = margin

    // ── LOGO ────────────────────────────────────────────────────────────────
    const logoUrl = tenant?.logo_wide_url || tenant?.logo_square_url || tenant?.logo_url
    if (logoUrl && logoUrl.startsWith('data:image/')) {
      try {
        const format = logoUrl.includes('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(logoUrl, format, margin, y, 50, 15, undefined, 'FAST')
      } catch { /* Logo optional */ }
    }

    // ── FIRMENINFO (rechts) ──────────────────────────────────────────────────
    const companyName = tenant?.legal_company_name || tenant?.name || ''
    const street = [tenant?.invoice_street?.trim(), tenant?.invoice_street_nr?.trim()].filter(Boolean).join(' ')
    const cityLine = [tenant?.invoice_zip, tenant?.invoice_city].filter(Boolean).join(' ')
    const contactEmail = tenant?.contact_email || ''
    const contactPhone = tenant?.contact_phone || ''

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(pc.r, pc.g, pc.b)
    doc.text(companyName, rightEdge, y + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    let cy = y + 9
    if (street) { doc.text(street, rightEdge, cy, { align: 'right' }); cy += 5 }
    if (cityLine) { doc.text(cityLine, rightEdge, cy, { align: 'right' }); cy += 5 }
    if (contactEmail) { doc.text(contactEmail, rightEdge, cy, { align: 'right' }); cy += 5 }
    if (contactPhone) { doc.text(contactPhone, rightEdge, cy, { align: 'right' }) }

    y += 30

    // ── TRENNLINIE ───────────────────────────────────────────────────────────
    doc.setDrawColor(pc.r, pc.g, pc.b)
    doc.setLineWidth(0.5)
    doc.line(margin, y, rightEdge, y)
    y += 8

    // ── RECHNUNGSTITEL ───────────────────────────────────────────────────────
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(pc.r, pc.g, pc.b)
    doc.text('RECHNUNG', margin, y)
    y += 10

    // Rechnungsnummer + Datum + Fälligkeit nebeneinander
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const invoiceDateStr = new Date(invoice.invoice_date).toLocaleDateString('de-CH')
    const dueDateStr = new Date(invoice.due_date).toLocaleDateString('de-CH')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Rechnungsnummer:', margin, y)
    doc.text('Rechnungsdatum:', margin + 60, y)
    doc.text('Fälligkeitsdatum:', margin + 110, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(invoice.invoice_number || '', margin, y)
    doc.text(invoiceDateStr, margin + 60, y)
    doc.text(dueDateStr, margin + 110, y)
    y += 12

    // ── RECHNUNGSADRESSE ─────────────────────────────────────────────────────
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(pc.r, pc.g, pc.b)
    doc.text('RECHNUNG AN', margin, y)
    y += 5

    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)

    if (invoice.billing_type === 'company' && invoice.billing_company_name) {
      doc.setFont('helvetica', 'bold')
      doc.text(invoice.billing_company_name, margin, y); y += 5
      if (invoice.billing_contact_person) {
        doc.setFont('helvetica', 'normal')
        doc.text(invoice.billing_contact_person, margin, y); y += 5
      }
    } else {
      doc.setFont('helvetica', 'bold')
      const billingName = invoice.billing_contact_person ||
        `${(invoice as any).customer_first_name || ''} ${(invoice as any).customer_last_name || ''}`.trim()
      doc.text(billingName, margin, y); y += 5
    }

    doc.setFont('helvetica', 'normal')
    if (invoice.billing_street) {
      const addrLine = `${invoice.billing_street} ${invoice.billing_street_number || ''}`.trim()
      doc.text(addrLine, margin, y); y += 5
    }
    const billingCity = [invoice.billing_zip, invoice.billing_city].filter(Boolean).join(' ')
    if (billingCity) { doc.text(billingCity, margin, y); y += 5 }
    y += 8

    // ── TABELLE: POSITIONEN ──────────────────────────────────────────────────
    const colDesc = margin          // 20mm — Beschreibung
    const colQty  = margin + 100    // 120mm — Menge
    const colUnit = margin + 115    // 135mm — Einzelpreis
    const colTot  = rightEdge       // 190mm — Betrag (right-aligned)

    // Tabellen-Header
    doc.setFillColor(pc.r, pc.g, pc.b)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Beschreibung', colDesc + 2, y + 5)
    doc.text('Anz.', colQty + 2, y + 5)
    doc.text('Einzelpreis', colUnit + 2, y + 5)
    doc.text('Betrag', colTot, y + 5, { align: 'right' })
    y += 9

    // Positionen
    doc.setTextColor(40, 40, 40)
    for (const item of items) {
      const itemTotal = item.total_price_rappen / 100
      const unitPrice = item.unit_price_rappen / 100
      const appointmentDateTime = formatAppointmentDateTime(item.appointment_start_time || item.appointment_date)

      // Neue Seite wenn nötig
      if (y > pageHeight - 60) {
        doc.addPage()
        y = margin
      }

      const rowStart = y
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const descLines = doc.splitTextToSize(item.product_name || 'Fahrstunde', 90)
      doc.text(descLines, colDesc + 2, y + 4)
      let descHeight = descLines.length * 4.5

      if (appointmentDateTime) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(120, 120, 120)
        doc.text(appointmentDateTime, colDesc + 2, y + 4 + descHeight)
        descHeight += 4
        doc.setTextColor(40, 40, 40)
      }
      if (item.product_description) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(120, 120, 120)
        doc.text(item.product_description, colDesc + 2, y + 4 + descHeight)
        descHeight += 4
        doc.setTextColor(40, 40, 40)
      }

      const rowHeight = Math.max(descHeight + 5, 10)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(String(item.quantity), colQty + 2, rowStart + 4)
      doc.text(`CHF ${unitPrice.toFixed(2)}`, colUnit + 2, rowStart + 4)
      doc.setFont('helvetica', 'bold')
      doc.text(`CHF ${itemTotal.toFixed(2)}`, colTot, rowStart + 4, { align: 'right' })

      // Trennlinie
      y += rowHeight
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.2)
      doc.line(margin, y, rightEdge, y)
      y += 2
    }

    // ── TOTALS ───────────────────────────────────────────────────────────────
    y += 4
    const totalColLabel = margin + 110
    const totalColValue = rightEdge

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)

    const subtotal = invoice.subtotal_rappen / 100
    const discount = (invoice.discount_amount_rappen || 0) / 100
    const vat = (invoice.vat_amount_rappen || 0) / 100
    const total = invoice.total_amount_rappen / 100

    doc.text('Zwischensumme', totalColLabel, y)
    doc.text(`CHF ${subtotal.toFixed(2)}`, totalColValue, y, { align: 'right' })
    y += 5

    if (discount > 0) {
      doc.setTextColor(40, 160, 40)
      doc.text('Rabatt', totalColLabel, y)
      doc.text(`−CHF ${discount.toFixed(2)}`, totalColValue, y, { align: 'right' })
      doc.setTextColor(80, 80, 80)
      y += 5
    }
    if (vat > 0) {
      doc.text(`MWST (${invoice.vat_rate}%)`, totalColLabel, y)
      doc.text(`CHF ${vat.toFixed(2)}`, totalColValue, y, { align: 'right' })
      y += 5
    }

    // Gesamtbetrag-Box
    doc.setFillColor(pc.r, pc.g, pc.b)
    doc.rect(totalColLabel - 2, y, rightEdge - totalColLabel + 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('Gesamtbetrag', totalColLabel, y + 5.5)
    doc.text(`CHF ${total.toFixed(2)}`, totalColValue, y + 5.5, { align: 'right' })
    y += 14

    // ── NOTIZEN ──────────────────────────────────────────────────────────────
    if (invoice.notes) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      const noteLines = doc.splitTextToSize(invoice.notes, contentWidth)
      doc.text(noteLines, margin, y)
      y += noteLines.length * 4 + 4
    }

    // ── FOOTER ───────────────────────────────────────────────────────────────
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(margin, pageHeight - 15, rightEdge, pageHeight - 15)
    doc.text(companyName, margin, pageHeight - 10)
    doc.text(`Rechnung ${invoice.invoice_number}`, rightEdge, pageHeight - 10, { align: 'right' })

    return Buffer.from(doc.output('arraybuffer'))
    
  } catch (error: any) {
    console.error('❌ Error in PDF generation:', error)
    throw new Error(`PDF generation failed: ${error.message}`)
  }
}
