// Composable für die Rechnungsverwaltung
import { ref, computed, readonly } from 'vue'
import type { 
  Invoice, 
  InvoiceWithDetails, 
  InvoiceFormData, 
  InvoiceItemFormData,
  InvoiceListResponse,
  InvoiceResponse,
  InvoiceCreateResponse,
  InvoiceUpdateResponse,
  InvoiceFilters,
  InvoiceSummary
} from '~/types/invoice'

export const useInvoices = () => {
  // State
  const invoices = ref<InvoiceWithDetails[]>([])
  const currentInvoice = ref<Invoice | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalInvoices = ref(0)
  const currentPage = ref(1)
  const itemsPerPage = ref(20)

  // Computed
  const hasInvoices = computed(() => invoices.value.length > 0)
  const totalPages = computed(() => Math.ceil(totalInvoices.value / itemsPerPage.value))

  // Invoice erstellen
  const createInvoice = async (invoiceData: InvoiceFormData, items: InvoiceItemFormData[]): Promise<InvoiceCreateResponse> => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/invoices/create', {
        method: 'POST',
        body: { invoiceData, items }
      }) as any

      if (!response?.data) {
        throw new Error('Invalid response from API')
      }

      currentInvoice.value = response.data
      
      return {
        data: response.data,
        invoice_number: response.data.invoice_number
      }

    } catch (err: any) {
      error.value = err.message || 'Fehler beim Erstellen der Rechnung'
      return { error: error.value || undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Rechnung abrufen
  const fetchInvoice = async (id: string): Promise<InvoiceResponse> => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/invoices/get', {
        method: 'GET',
        query: { invoice_id: id }
      }) as any

      if (!response?.data) {
        throw new Error('Invoice not found')
      }

      currentInvoice.value = response.data
      
      return { data: response.data }

    } catch (err: any) {
      error.value = err.message || 'Fehler beim Abrufen der Rechnung'
      return { error: error.value || undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Rechnungen auflisten
  const fetchInvoices = async (filters?: InvoiceFilters, page = 1): Promise<InvoiceListResponse> => {
    isLoading.value = true
    error.value = null
    
    try {
      const query: any = { page: page.toString(), limit: itemsPerPage.value.toString() }
      
      if (filters?.status && filters.status.length > 0) {
        query.status = filters.status.join(',')
      }
      if (filters?.payment_status && filters.payment_status.length > 0) {
        query.payment_status = filters.payment_status.join(',')
      }
      if (filters?.user_id) {
        query.user_id = filters.user_id
      }
      if (filters?.search) {
        query.search = filters.search
      }

      const response = await $fetch('/api/invoices/list', {
        method: 'GET',
        query
      }) as any

      if (!response?.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from API')
      }

      invoices.value = response.data
      totalInvoices.value = response.total || 0
      currentPage.value = page
      
      return {
        data: response.data,
        total: response.total,
        page,
        limit: itemsPerPage.value
      }

    } catch (err: any) {
      error.value = err.message || 'Fehler beim Abrufen der Rechnungen'
      return { error: error.value || undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Rechnung aktualisieren
  const updateInvoice = async (id: string, updates: Partial<InvoiceFormData>): Promise<InvoiceUpdateResponse> => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/invoices/update', {
        method: 'POST',
        body: { invoice_id: id, updates }
      }) as any

      if (!response?.data) {
        throw new Error('Failed to update invoice')
      }

      if (currentInvoice.value?.id === id) {
        currentInvoice.value = response.data
      }
      
      const index = invoices.value.findIndex(inv => inv.id === id)
      if (index !== -1) {
        invoices.value[index] = response.data
      }

      return { data: response.data }

    } catch (err: any) {
      error.value = err.message || 'Fehler beim Aktualisieren der Rechnung'
      return { error: error.value || undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Rechnung löschen
  const deleteInvoice = async (id: string): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = null
    
    try {
      await $fetch('/api/invoices/delete', {
        method: 'POST',
        body: { invoice_id: id }
      })

      invoices.value = invoices.value.filter(inv => inv.id !== id)
      if (currentInvoice.value?.id === id) {
        currentInvoice.value = null
      }

      return { success: true }

    } catch (err: any) {
      error.value = err.message || 'Fehler beim Löschen der Rechnung'
      return { success: false, error: error.value || undefined }
    } finally {
      isLoading.value = false
    }
  }

  // Rechnung als versendet markieren
  const markInvoiceAsSent = async (id: string): Promise<InvoiceUpdateResponse> => {
    return updateInvoice(id, {
      status: 'sent',
      sent_at: new Date().toISOString()
    })
  }

  // Rechnung als bezahlt markieren
  const markInvoiceAsPaid = async (id: string, paymentMethod: string, amount?: number): Promise<InvoiceUpdateResponse> => {
    const updates: any = {
      status: 'paid',
      payment_status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString()
    }

    if (amount) {
      updates.paid_amount_rappen = amount
    }

    return updateInvoice(id, updates)
  }

  // Rechnung versenden
  const sendInvoice = async (id: string): Promise<InvoiceUpdateResponse> => {
    return updateInvoice(id, {
      status: 'sent',
      sent_at: new Date().toISOString()
    })
  }

  // Rechnung stornieren
  const cancelInvoice = async (id: string, reason?: string): Promise<InvoiceUpdateResponse> => {
    return updateInvoice(id, {
      status: 'cancelled',
      notes: reason ? `${reason}\n\nStorniert am ${new Date().toLocaleDateString('de-CH')}` : undefined
    })
  }

  // Rechnungszusammenfassung abrufen
  const fetchInvoiceSummary = async (): Promise<InvoiceSummary | null> => {
    try {
      const response = await $fetch('/api/invoices/get-summary') as any

      if (!response?.data) {
        throw new Error('Failed to fetch summary')
      }

      return response.data

    } catch (err: any) {
      console.error('Error fetching invoice summary:', err)
      return null
    }
  }

  // Rechnungspositionen laden
  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const response = await $fetch('/api/invoices/get-items', {
        method: 'GET',
        query: { invoice_id: invoiceId }
      }) as any

      return response?.data || []
    } catch (err) {
      console.error('Error fetching invoice items:', err)
      return []
    }
  }

  // Rechnung mit Details laden
  const fetchInvoiceWithItems = async (invoiceId: string) => {
    try {
      const invoice = await fetchInvoice(invoiceId)
      if (!invoice.data) return null

      const items = await fetchInvoiceItems(invoiceId)

      return {
        ...invoice.data,
        items
      }
    } catch (err) {
      console.error('Error fetching invoice with items:', err)
      return null
    }
  }

  // Rechnungszahlungen abrufen
  const fetchInvoicePayments = async (invoiceId: string) => {
    try {
      // This would need a separate endpoint if used
      return []
    } catch (err: any) {
      console.error('Error fetching invoice payments:', err)
      return []
    }
  }

  // Rechnung als PDF herunterladen
  const downloadInvoicePDF = async (id: string): Promise<{ success: boolean; error?: string; pdfUrl?: string }> => {
    try {
      const { $fetch } = await import('nuxt/app')
      
      const response = await $fetch('/api/invoices/download', {
        method: 'POST',
        body: { invoiceId: id }
      })

      if (response.success && response.pdfUrl) {
        // PDF herunterladen
        const link = document.createElement('a')
        link.href = response.pdfUrl
        link.download = `rechnung-${id}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        return { success: true, pdfUrl: response.pdfUrl }
      } else {
        return { success: false, error: response.error || 'Fehler beim Generieren der PDF' }
      }

    } catch (err: any) {
      return { success: false, error: err.message || 'Fehler beim Herunterladen der PDF' }
    }
  }

  // Rechnung per E-Mail versenden
  const sendInvoiceEmail = async (id: string, email?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { $fetch } = await import('nuxt/app')
      
      const response = await $fetch('/api/invoices/send-email', {
        method: 'POST',
        body: { 
          invoiceId: id,
          email: email
        }
      })

      if (response.success) {
        // Status auf 'sent' setzen
        await markInvoiceAsSent(id)
        return { success: true }
      } else {
        return { success: false, error: response.error || 'Fehler beim Versenden der E-Mail' }
      }

    } catch (err: any) {
      return { success: false, error: err.message || 'Fehler beim Versenden der E-Mail' }
    }
  }

  // State zurücksetzen
  const resetState = () => {
    invoices.value = []
    currentInvoice.value = null
    error.value = null
    totalInvoices.value = 0
    currentPage.value = 1
  }

  return {
    // State
    invoices: readonly(invoices),
    currentInvoice: readonly(currentInvoice),
    isLoading: readonly(isLoading),
    error: readonly(error),
    totalInvoices: readonly(totalInvoices),
    currentPage: readonly(currentPage),
    totalPages: readonly(totalPages),
    hasInvoices: readonly(hasInvoices),

    // Actions
    createInvoice,
    fetchInvoice,
    fetchInvoices,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsSent,
    markInvoiceAsPaid,
    cancelInvoice,
    sendInvoice,
    fetchInvoiceSummary,
    fetchInvoiceItems,
    fetchInvoiceWithItems,
    fetchInvoicePayments,
    downloadInvoicePDF,
    sendInvoiceEmail,
    resetState
  }
}
