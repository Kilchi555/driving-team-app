// API-Endpunkt für PDF-Download von Rechnungen
import { getSupabase } from '~/utils/supabase'
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

    // Rechnungsdaten aus der Datenbank abrufen
    const supabase = getSupabase()
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_with_details')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    // Rechnungspositionen abrufen
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true })

    if (itemsError) {
      throw new Error('Error fetching invoice items')
    }

    // PDF generieren
    const pdfBuffer = await generateInvoicePDF(invoice, invoiceItems || [])
    
    // PDF als Base64 kodieren und zurückgeben
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`

    logger.debug('✅ PDF generated successfully for invoice:', invoice.invoice_number)

    return {
      success: true,
      pdfUrl
    }

  } catch (error: any) {
    console.error('❌ Error generating PDF:', error)
    return {
      success: false,
      error: error.message || 'Error generating PDF'
    }
  }
})

// Hilfsfunktion für PDF-Generierung
async function generateInvoicePDF(invoice: InvoiceWithDetails, items: any[]): Promise<Buffer> {
  // Hier würde die eigentliche PDF-Generierung implementiert
  // Für den Moment erstellen wir ein einfaches PDF mit jsPDF oder ähnlichem
  
  try {
    // Dynamischer Import von jsPDF
    const { jsPDF } = await import('jspdf')
    
    // Neues PDF-Dokument erstellen
    const doc = new jsPDF()
    
    // Dokumenteinstellungen
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPos = 30
    
    // Logo (falls vorhanden)
    // doc.addImage(logoBase64, 'PNG', margin, yPos, 40, 20)
    yPos += 30
    
    // Firmeninformationen
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Driving Team Zürich GmbH', pageWidth - margin, yPos, { align: 'right' })
    yPos += 8
    
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text('Baslerstrasse 145', pageWidth - margin, yPos, { align: 'right' })
    yPos += 5
    doc.text('8048 Zürich', pageWidth - margin, yPos, { align: 'right' })
    yPos += 5
    doc.text('info@drivingteam.ch', pageWidth - margin, yPos, { align: 'right' })
    yPos += 5
    doc.text('044 431 00 33', pageWidth - margin, yPos, { align: 'right' })
    yPos += 20
    
    // Rechnungsinformationen
    doc.setFontSize(20)
    doc.setFont(undefined, 'bold')
    doc.text('RECHNUNG', margin, yPos)
    yPos += 15
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    doc.text(`Rechnungsnummer: ${invoice.invoice_number}`, margin, yPos)
    yPos += 8
    doc.text(`Rechnungsdatum: ${new Date(invoice.invoice_date).toLocaleDateString('de-CH')}`, margin, yPos)
    yPos += 8
    doc.text(`Fälligkeitsdatum: ${new Date(invoice.due_date).toLocaleDateString('de-CH')}`, margin, yPos)
    yPos += 20
    
    // Rechnungsempfänger
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Rechnung an:', margin, yPos)
    yPos += 10
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    
    if (invoice.billing_type === 'company' && invoice.billing_company_name) {
      doc.text(invoice.billing_company_name, margin, yPos)
      yPos += 8
      if (invoice.billing_contact_person) {
        doc.text(invoice.billing_contact_person, margin, yPos)
        yPos += 8
      }
    } else {
      doc.text(`${invoice.customer_first_name || ''} ${invoice.customer_last_name || ''}`.trim(), margin, yPos)
      yPos += 8
    }
    
    // Adresse
    if (invoice.billing_street) {
      doc.text(`${invoice.billing_street} ${invoice.billing_street_number || ''}`.trim(), margin, yPos)
      yPos += 8
      doc.text(`${invoice.billing_zip || ''} ${invoice.billing_city || ''}`.trim(), margin, yPos)
      yPos += 8
    }
    
    yPos += 15
    
    // Rechnungspositionen
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Rechnungspositionen:', margin, yPos)
    yPos += 10
    
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    
    // Tabellenkopf
    const col1 = margin
    const col2 = margin + 80
    const col3 = margin + 120
    const col4 = margin + 150
    
    doc.setFont(undefined, 'bold')
    doc.text('Beschreibung', col1, yPos)
    doc.text('Menge', col2, yPos)
    doc.text('Einzelpreis', col3, yPos)
    doc.text('Gesamt', col4, yPos)
    yPos += 8
    
    doc.setFont(undefined, 'normal')
    
    // Positionen
    let subtotal = 0
    for (const item of items) {
      const itemTotal = item.total_price_rappen / 100
      subtotal += itemTotal
      
      // Zeilenumbruch bei langen Beschreibungen
      const description = item.product_name || 'Fahrstunde'
      const lines = doc.splitTextToSize(description, 70)
      
      for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
          doc.text(lines[i], col1, yPos)
          doc.text(item.quantity.toString(), col2, yPos)
          doc.text(`CHF ${(item.unit_price_rappen / 100).toFixed(2)}`, col3, yPos)
          doc.text(`CHF ${itemTotal.toFixed(2)}`, col4, yPos)
        } else {
          doc.text(lines[i], col1, yPos)
        }
        yPos += 5
      }
      
      yPos += 3
      
      // Neue Seite bei Bedarf
      if (yPos > 250) {
        doc.addPage()
        yPos = 30
      }
    }
    
    yPos += 10
    
    // Zusammenfassung
    const vatAmount = invoice.vat_amount_rappen / 100
    const discountAmount = invoice.discount_amount_rappen / 100
    const totalAmount = invoice.total_amount_rappen / 100
    
    doc.setFont(undefined, 'bold')
    doc.text('Zusammenfassung:', pageWidth - margin - 60, yPos)
    yPos += 8
    
    doc.setFont(undefined, 'normal')
    doc.text('Zwischensumme:', pageWidth - margin - 60, yPos)
    doc.text(`CHF ${subtotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 6
    
    doc.text(`MWST (${invoice.vat_rate}%):`, pageWidth - margin - 60, yPos)
    doc.text(`CHF ${vatAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 6
    
    if (discountAmount > 0) {
      doc.text('Rabatt:', pageWidth - margin - 60, yPos)
      doc.text(`-CHF ${discountAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
      yPos += 6
    }
    
    doc.setFont(undefined, 'bold')
    doc.text('Gesamtbetrag:', pageWidth - margin - 60, yPos)
    doc.text(`CHF ${totalAmount.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 20
    
    // Notizen
    if (invoice.notes) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text('Notizen:', margin, yPos)
      yPos += 8
      
      const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin)
      for (const line of noteLines) {
        doc.text(line, margin, yPos)
        yPos += 5
      }
    }
    
    // PDF als Buffer zurückgeben
    return Buffer.from(doc.output('arraybuffer'))
    
  } catch (error: any) {
    console.error('❌ Error in PDF generation:', error)
    throw new Error(`PDF generation failed: ${error.message}`)
  }
}
