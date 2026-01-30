// Composable für die Rechnungsverwaltung
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
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
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      logger.debug('🔍 Admin Invoice Create - Current tenant_id:', tenantId)

      // Rechnung erstellen - nur definierte Werte einfügen
      const invoiceInsertData: any = {
        user_id: invoiceData.user_id,
        tenant_id: tenantId, // Assign to current tenant
        billing_type: invoiceData.billing_type,
        billing_email: invoiceData.billing_email,
        billing_country: invoiceData.billing_country,
        subtotal_rappen: invoiceData.subtotal_rappen,
        vat_rate: invoiceData.vat_rate,
        discount_amount_rappen: invoiceData.discount_amount_rappen,
        internal_notes: invoiceData.internal_notes
      }

      // ✅ KORRIGIERT: Alle notwendigen Preis-Felder hinzufügen
      if (invoiceData.staff_id) invoiceInsertData.staff_id = invoiceData.staff_id
      if (invoiceData.product_sale_id) invoiceInsertData.product_sale_id = invoiceData.product_sale_id
      if (invoiceData.appointment_id) invoiceInsertData.appointment_id = invoiceData.appointment_id
      if (invoiceData.billing_company_name) invoiceInsertData.billing_company_name = invoiceData.billing_company_name
      if (invoiceData.billing_contact_person) invoiceInsertData.billing_contact_person = invoiceData.billing_contact_person
      if (invoiceData.billing_street) invoiceInsertData.billing_street = invoiceData.billing_street
      if (invoiceData.billing_street_number) invoiceInsertData.billing_street_number = invoiceData.billing_street_number
      if (invoiceData.billing_zip) invoiceInsertData.billing_zip = invoiceData.billing_zip
      if (invoiceData.billing_city) invoiceInsertData.billing_city = invoiceData.billing_city
      if (invoiceData.billing_vat_number) invoiceInsertData.billing_vat_number = invoiceData.billing_vat_number
      if (invoiceData.notes) invoiceInsertData.notes = invoiceData.notes

      // ✅ KORRIGIERT: Keine MWST da nicht MWST-pflichtig
      // const vatAmountRappen = Math.round((invoiceData.subtotal_rappen - (invoiceData.discount_amount_rappen || 0)) * invoiceData.vat_rate / 100)
      const vatAmountRappen = 0 // Keine MWST
      const totalAmountRappen = invoiceData.subtotal_rappen - (invoiceData.discount_amount_rappen || 0) // Keine MWST hinzufügen

      invoiceInsertData.vat_amount_rappen = vatAmountRappen
      invoiceInsertData.total_amount_rappen = totalAmountRappen
      invoiceInsertData.vat_rate = 0 // MWST-Satz auf 0 setzen

      logger.debug('💰 Invoice price calculation (no VAT):', {
        subtotal: invoiceData.subtotal_rappen,
        discount: invoiceData.discount_amount_rappen || 0,
        vatRate: 0,
        vatAmount: vatAmountRappen,
        total: totalAmountRappen
      })

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceInsertData)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Rechnungspositionen erstellen
      if (items.length > 0) {
        const invoiceItems = items.map((item, index) => {
          // ✅ KORRIGIERT: Keine MWST da nicht MWST-pflichtig
          const itemSubtotalRappen = item.quantity * item.unit_price_rappen
          const itemVatAmountRappen = 0 // Keine MWST
          
          return {
            invoice_id: invoice.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_description: item.product_description,
            appointment_id: item.appointment_id,
            appointment_title: item.appointment_title,
            appointment_date: item.appointment_date,
            appointment_duration_minutes: item.appointment_duration_minutes,
            quantity: item.quantity,
            unit_price_rappen: item.unit_price_rappen,
            total_price_rappen: itemSubtotalRappen,
            vat_rate: 0, // Keine MWST
            vat_amount_rappen: itemVatAmountRappen,
            sort_order: item.sort_order || index,
            notes: item.notes
          }
        })

        logger.debug('💰 Invoice items created:', invoiceItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price_rappen,
          totalPrice: item.total_price_rappen,
          vatAmount: item.vat_amount_rappen
        })))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (itemsError) throw itemsError
      }

      // Aktualisierte Rechnung mit Details abrufen
      const { data: fullInvoice, error: fetchError } = await supabase
        .from('invoices_with_details')
        .select('*')
        .eq('id', invoice.id)
        .single()

      if (fetchError) throw fetchError

      currentInvoice.value = fullInvoice
      
      return {
        data: fullInvoice,
        invoice_number: fullInvoice.invoice_number
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
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id

      const { data: invoice, error: fetchError } = await supabase
        .from('invoices_with_details')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId) // Filter by current tenant
        .single()

      if (fetchError) throw fetchError

      currentInvoice.value = invoice
      
      return { data: invoice }

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
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      logger.debug('🔍 Admin Invoices - Current tenant_id:', tenantId)

      let query = supabase
        .from('invoices_with_details')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId) // Filter by current tenant

      logger.debug('🔍 Building query with filters:', filters)

      // Filter anwenden
      if (filters) {
        logger.debug('🔍 Applying filters:', filters)
        logger.debug('🔍 Filters type check:', {
          status: filters.status,
          statusType: typeof filters.status,
          statusIsArray: Array.isArray(filters.status),
          statusLength: filters.status?.length,
          paymentStatus: filters.payment_status,
          paymentStatusType: typeof filters.payment_status,
          paymentStatusIsArray: Array.isArray(filters.payment_status),
          paymentStatusLength: filters.payment_status?.length
        })
        
        if (filters.status && filters.status.length > 0) {
          logger.debug('📊 Filtering by status:', filters.status)
          query = query.in('status', filters.status)
        }
        if (filters.payment_status && filters.payment_status.length > 0) {
          logger.debug('💳 Filtering by payment status:', filters.payment_status)
          query = query.in('payment_status', filters.payment_status)
        }
        if (filters.user_id) {
          logger.debug('👤 Filtering by user ID:', filters.user_id)
          query = query.eq('user_id', filters.user_id)
        }
        if (filters.staff_id) {
          logger.debug('👨‍🏫 Filtering by staff ID:', filters.staff_id)
          query = query.eq('staff_id', filters.staff_id)
        }
        if (filters.date_from) {
          logger.debug('📅 Filtering from date:', filters.date_from)
          // Ensure date is in YYYY-MM-DD format
          const formattedDate = new Date(filters.date_from).toISOString().split('T')[0]
          query = query.gte('invoice_date', formattedDate)
        }
        if (filters.date_to) {
          logger.debug('📅 Filtering to date:', filters.date_to)
          // Ensure date is in YYYY-MM-DD format
          const formattedDate = new Date(filters.date_to).toISOString().split('T')[0]
          query = query.lte('invoice_date', formattedDate)
        }
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim()
          logger.debug('🔍 Filtering by search term:', searchTerm)
          // Search in invoice_number, customer names, billing company name, and billing email
          query = query.or(`invoice_number.ilike.%${searchTerm}%,customer_first_name.ilike.%${searchTerm}%,customer_last_name.ilike.%${searchTerm}%,billing_company_name.ilike.%${searchTerm}%,billing_email.ilike.%${searchTerm}%`)
        }
      }

      // Paginierung
      const from = (page - 1) * itemsPerPage.value
      const to = from + itemsPerPage.value - 1
      query = query.range(from, to)

      // Sortierung (neueste zuerst)
      query = query.order('created_at', { ascending: false })

      const { data: invoiceList, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      logger.debug('📊 Query result:', { 
        count, 
        returnedCount: invoiceList?.length || 0,
        firstInvoice: invoiceList?.[0] || null,
        filters: filters
      })

      // Debug: Check if filters were actually applied
      if (filters?.status && filters.status.length > 0) {
        logger.debug('🔍 Checking if status filter worked:')
        const filteredByStatus = invoiceList?.filter(inv => filters.status!.includes(inv.status))
        logger.debug('📊 Invoices matching status filter:', filteredByStatus?.length || 0)
        logger.debug('📊 Expected vs actual:', { expected: filters.status, actual: invoiceList?.map(inv => inv.status) })
      }

      invoices.value = invoiceList || []
      totalInvoices.value = count || 0
      currentPage.value = page
      
      return {
        data: invoiceList,
        total: count || undefined,
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
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id

      const { data: invoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure user can only update their tenant's invoices
        .select()
        .single()

      if (updateError) throw updateError

      // Aktualisierte Rechnung mit Details abrufen
      const { data: fullInvoice, error: fetchError } = await supabase
        .from('invoices_with_details')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Lokalen State aktualisieren
      if (currentInvoice.value?.id === id) {
        currentInvoice.value = fullInvoice
      }
      
      const index = invoices.value.findIndex(inv => inv.id === id)
      if (index !== -1) {
        invoices.value[index] = fullInvoice
      }

      return { data: fullInvoice }

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
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id

      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure user can only delete their tenant's invoices

      if (deleteError) throw deleteError

      // Lokalen State aktualisieren
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
    try {
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()
      
      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      // Status auf 'sent' setzen
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure user can only send their tenant's invoices
        .select()
        .single()
      
      if (error) throw error
      
      logger.debug('📤 Invoice sent:', id)
      return { success: true, data: data || null }
    } catch (err: any) {
      console.error('Fehler beim Versenden der Rechnung:', err)
      return { success: false, error: err.message }
    }
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
      logger.debug('🔄 Starting fetchInvoiceSummary...')
      
      const { getSupabase } = await import('~/utils/supabase')
      logger.debug('📦 Supabase module imported successfully')
      
      const supabase = getSupabase()
      logger.debug('🔗 Supabase client obtained:', !!supabase)
      
      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      logger.debug('🔍 Admin Invoice Summary - Current tenant_id:', tenantId)
      
      // Test connection first
      logger.debug('🧪 Testing Supabase connection...')
      const { data: testData, error: testError } = await supabase
        .from('invoices')
        .select('id')
        .eq('tenant_id', tenantId) // Filter by current tenant
        .limit(1)
      
      if (testError) {
        console.error('❌ Connection test failed:', testError)
        throw testError
      }
      
      logger.debug('✅ Connection test successful, test data:', testData)

      // Einfache SQL-Abfrage anstatt RPC-Funktion - gefiltert nach tenant_id
      logger.debug('📊 Fetching invoice summary data...')
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, payment_status, total_amount_rappen, due_date')
        .eq('tenant_id', tenantId) // Filter by current tenant

      if (error) {
        console.error('❌ Error fetching invoices:', error)
        throw error
      }

      logger.debug('✅ Invoices fetched successfully, count:', invoices?.length)

      // Zusammenfassung manuell berechnen
      const summary: InvoiceSummary = {
        total_invoices: invoices?.length || 0,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        overdue_amount: 0,
        draft_amount: 0
      }

      const now = new Date()

      invoices?.forEach(invoice => {
        summary.total_amount += invoice.total_amount_rappen || 0
        
        // Status-basierte Kategorisierung
        if (invoice.status === 'draft') {
          summary.draft_amount += invoice.total_amount_rappen || 0
        }
        
        // Payment-Status-basierte Kategorisierung
        if (invoice.payment_status === 'paid') {
          summary.paid_amount += invoice.total_amount_rappen || 0
        } else if (invoice.payment_status === 'pending') {
          // Prüfe ob überfällig
          if (invoice.due_date && new Date(invoice.due_date) < now) {
            summary.overdue_amount += invoice.total_amount_rappen || 0
          } else {
            summary.pending_amount += invoice.total_amount_rappen || 0
          }
        } else if (invoice.payment_status === 'failed' || invoice.payment_status === 'cancelled') {
          // Fehlgeschlagene oder stornierte Zahlungen als pending behandeln
          summary.pending_amount += invoice.total_amount_rappen || 0
        }
      })

      logger.debug('📊 Invoice summary calculated:', summary)
      logger.debug('🔍 Raw invoices data:', invoices)
      logger.debug('🔍 Summary breakdown:', {
        total_invoices: summary.total_invoices,
        total_amount: summary.total_amount,
        paid_amount: summary.paid_amount,
        pending_amount: summary.pending_amount,
        overdue_amount: summary.overdue_amount,
        draft_amount: summary.draft_amount
      })
      return summary

    } catch (err: any) {
      console.error('❌ Fehler beim Abrufen der Rechnungszusammenfassung:', err)
      console.error('❌ Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        stack: err.stack
      })
      
      // Check if it's a network error
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        console.error('🌐 Network error detected - this might be a CORS or connectivity issue')
      }
      
      return null
    }
  }

  // Rechnungspositionen laden
  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      const { data: items, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return items || []
    } catch (err) {
      console.error('Error fetching invoice items:', err)
      return []
    }
  }

  // Rechnung mit Details laden
  const fetchInvoiceWithItems = async (invoiceId: string) => {
    try {
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      // Get current user's tenant_id
      const authStore = useAuthStore()
      const currentUser = authStore.user
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id

      // Rechnung laden
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices_with_details')
        .select('*')
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId) // Filter by current tenant
        .single()

      if (invoiceError) throw invoiceError

      // Rechnungspositionen laden
      const items = await fetchInvoiceItems(invoiceId)

      // Produktverkäufe laden (falls vorhanden)
      let productSales = []
      if (invoice.product_sale_id) {
        const { data: sales, error: salesError } = await supabase
          .from('product_sales')
          .select(`
            *,
            product_sale_items (
              *,
              product:products (
                name,
                description,
                price_rappen
              )
            )
          `)
          .eq('id', invoice.product_sale_id)

        if (!salesError && sales) {
          productSales = sales
        }
      }

      // Termine laden (falls vorhanden)
      let appointmentDetails = null
      if (invoice.appointment_id) {
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            event_type:event_types (
              name,
              description,
              duration_minutes,
              price_rappen
            )
          `)
          .eq('id', invoice.appointment_id)
          .is('deleted_at', null) // ✅ Soft Delete Filter
          .single()

        if (!appointmentError && appointment) {
          appointmentDetails = appointment
        }
      }

      return {
        ...invoice,
        items,
        productSales,
        appointmentDetails
      }
    } catch (err) {
      console.error('Error fetching invoice with items:', err)
      return null
    }
  }

  // Rechnungszahlungen abrufen
  const fetchInvoicePayments = async (invoiceId: string) => {
    try {
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      const { data: payments, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false })

      if (error) throw error

      return payments

    } catch (err: any) {
      console.error('Fehler beim Abrufen der Rechnungszahlungen:', err)
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
