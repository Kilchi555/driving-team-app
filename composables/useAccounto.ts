// composables/useAccounto.ts
// Accounto API Integration für Rechnungserstellung

interface AccountoInvoiceRequest {
  appointments: Array<{
    id: string
    title: string
    start_time: string
    duration_minutes: number
    amount: number
  }>
  customerData: {
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  billingAddress?: {
    company_name?: string
    contact_person?: string
    street: string
    street_number?: string
    zip: string
    city: string
    vat_number?: string
    email: string
    phone?: string
  }
  emailData: {
    email: string
    subject?: string
    message?: string
  }
  totalAmount: number
}

interface AccountoInvoiceResponse {
  success: boolean
  invoiceId?: string
  customerId?: string
  invoiceNumber?: string
  message?: string
  error?: string
}

export const useAccounto = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Hauptfunktion: Rechnung in Accounto erstellen
  const createInvoice = async (request: AccountoInvoiceRequest): Promise<AccountoInvoiceResponse> => {
    try {
      logger.debug('🏦 Creating Accounto invoice:', request)
      
      isLoading.value = true
      error.value = null

      // Validierung der erforderlichen Felder
      if (!request.appointments || request.appointments.length === 0) {
        throw new Error('Keine Termine für die Rechnungserstellung angegeben')
      }

      if (!request.customerData?.email || !request.customerData?.firstName || !request.customerData?.lastName) {
        throw new Error('Kundendaten unvollständig')
      }

      if (!request.totalAmount || request.totalAmount <= 0) {
        throw new Error('Ungültiger Gesamtbetrag')
      }

      // API-Aufruf an Accounto
      const response = await $fetch('/api/accounto/create-invoice', {
        method: 'POST',
        body: request
      }) as AccountoInvoiceResponse

      logger.debug('✅ Accounto invoice response:', response)

      if (!response.success) {
        throw new Error(response.error || 'Rechnungserstellung fehlgeschlagen')
      }

      return response

    } catch (err: any) {
      console.error('❌ Accounto invoice creation error:', err)
      
      const errorMessage = err.message || 'Unbekannter Fehler bei der Rechnungserstellung'
      error.value = errorMessage
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  // Rechnung erstellen und per E-Mail versenden
  const createInvoiceAndSend = async (request: AccountoInvoiceRequest): Promise<AccountoInvoiceResponse> => {
    logger.debug('📧 Creating invoice and sending via email...')
    return await createInvoice(request)
  }

  // Rechnung erstellen und für Druck vorbereiten
  const createInvoiceAndPrint = async (request: AccountoInvoiceRequest): Promise<AccountoInvoiceResponse> => {
    logger.debug('🖨️ Creating invoice for printing...')
    
    // Für den Druck fügen wir einen speziellen Flag hinzu
    const printRequest = {
      ...request,
      emailData: {
        ...request.emailData,
        message: (request.emailData.message || '') + '\n\nDiese Rechnung wurde für den Druck erstellt.'
      }
    }
    
    return await createInvoice(printRequest)
  }

  // Rechnungsdaten für die Anzeige formatieren
  const formatInvoiceData = (appointments: any[], customerData: any, billingAddress?: any) => {
    const totalAmount = appointments.reduce((sum, apt) => sum + (apt.amount || 0), 0)
    const vatAmount = totalAmount * 0.077 // 7.7% MwSt
    const netAmount = totalAmount - vatAmount

    return {
      customer: {
        name: `${customerData.firstName} ${customerData.lastName}`,
        email: customerData.email,
        phone: customerData.phone || 'Nicht angegeben'
      },
      billing: billingAddress ? {
        company: billingAddress.company_name,
        contact: billingAddress.contact_person,
        address: `${billingAddress.street} ${billingAddress.street_number || ''}`,
        city: `${billingAddress.zip} ${billingAddress.city}`,
        vat: billingAddress.vat_number
      } : null,
      invoice: {
        items: appointments.map(apt => ({
          description: apt.title || 'Fahrstunde',
          date: apt.start_time,
          duration: apt.duration_minutes,
          unitPrice: apt.amount,
          total: apt.amount
        })),
        totals: {
          net: netAmount,
          vat: vatAmount,
          total: totalAmount
        }
      }
    }
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Methods
    createInvoice,
    createInvoiceAndSend,
    createInvoiceAndPrint,
    formatInvoiceData
  }
}
