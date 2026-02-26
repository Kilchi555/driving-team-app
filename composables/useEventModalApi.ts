/**
 * ✅ useEventModalApi - Elegant & Secure API Layer for EventModal
 * 
 * Replaces all direct database queries with secure API calls.
 * All APIs include:
 *   - Bearer Token Authentication
 *   - Tenant Isolation
 *   - Input Validation
 *   - Error Handling
 */

import logger from '~/utils/logger'

export const useEventModalApi = () => {
  const { getSupabase } = useNuxtApp().$supabase ? { getSupabase: () => useNuxtApp().$supabase } : { getSupabase: async () => (await import('~/utils/supabase')).getSupabase() }

  // ✅ Helper: Make authenticated API call
  // Authentication is handled via HTTP-Only cookies (sent automatically by browser)
  // Server middleware converts cookies to Authorization headers
  const apiCall = async <T>(
    url: string, 
    options: { method?: string; body?: any; query?: Record<string, any> } = {}
  ): Promise<T | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: T }>(url, {
        method: options.method || 'GET',
        body: options.body,
        query: options.query
        // No Authorization header needed - cookies are sent automatically
        // Server middleware converts cookies to Authorization headers
      })
      return response?.data || null
    } catch (error: any) {
      logger.error(`❌ API call failed: ${url}`, error.message || error)
      return null
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load payment by appointment ID
   */
  const getPaymentByAppointment = async (appointmentId: string) => {
    return apiCall<any>('/api/staff/get-payment', {
      query: { appointment_id: appointmentId }
    })
  }

  /**
   * Load payment by payment ID
   */
  const getPaymentById = async (paymentId: string) => {
    return apiCall<any>('/api/staff/get-payment', {
      query: { id: paymentId }
    })
  }

  /**
   * Update payment
   */
  const updatePayment = async (paymentId: string, updateData: any) => {
    return apiCall<any>('/api/staff/update-payment', {
      method: 'POST',
      body: { payment_id: paymentId, update_data: updateData }
    })
  }

  /**
   * Get payment status for an appointment
   */
  const getPaymentStatus = async (appointmentId: string) => {
    return apiCall<any>('/api/staff/get-payment-status', {
      query: { appointment_id: appointmentId }
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // USER APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get user by ID
   */
  const getUser = async (userId: string) => {
    return apiCall<any>('/api/staff/get-user', {
      query: { id: userId }
    })
  }

  /**
   * Get billing address for a user
   */
  const getBillingAddress = async (userId: string) => {
    return apiCall<any>('/api/staff/get-billing-address', {
      query: { user_id: userId }
    })
  }

  /**
   * Get all staff members for current tenant
   */
  const getStaffList = async (activeOnly: boolean = true) => {
    return apiCall<any[]>('/api/staff/get-staff-list', {
      query: { active_only: activeOnly ? 'true' : 'false' }
    })
  }

  /**
   * Get current user's tenant ID
   */
  const getCurrentUserTenant = async () => {
    try {
      // Get tenant ID from auth store first (fastest)
      const { useAuthStore } = await import('~/stores/auth')
      const authStore = useAuthStore()
      if (authStore.userProfile?.tenant_id) {
        return authStore.userProfile.tenant_id
      }
      
      // Fallback: Use API to get current user info
      const response = await $fetch<{ profile?: { tenant_id?: string } }>('/api/auth/current-user').catch(() => null)
      return response?.profile?.tenant_id || null
    } catch {
      return null
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all categories for current tenant
   */
  const getCategories = async () => {
    return apiCall<any[]>('/api/staff/get-categories', {})
  }

  /**
   * Get category by code
   */
  const getCategoryByCode = async (code: string) => {
    const categories = await getCategories()
    return categories?.find((c: any) => c.code === code) || null
  }

  // ═══════════════════════════════════════════════════════════════
  // LOCATION APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all locations for current tenant
   */
  const getLocations = async () => {
    return apiCall<any[]>('/api/staff/get-locations', {})
  }

  /**
   * Get location by ID
   */
  const getLocationById = async (locationId: string) => {
    const locations = await getLocations()
    return locations?.find((l: any) => l.id === locationId) || null
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT TYPE APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all event types for current tenant
   */
  const getEventTypes = async () => {
    return apiCall<any[]>('/api/staff/get-event-types', {})
  }

  /**
   * Get default event type for current tenant
   */
  const getDefaultEventType = async () => {
    const eventTypes = await getEventTypes()
    if (!eventTypes) return null
    return eventTypes.find((et: any) => et.is_default && et.is_active) || null
  }

  // ═══════════════════════════════════════════════════════════════
  // PRICING APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get pricing rules for current tenant
   */
  const getPricingRules = async () => {
    return apiCall<any[]>('/api/staff/get-pricing-rules', {})
  }

  /**
   * Get pricing rule by category code
   */
  const getPricingRuleByCategory = async (categoryCode: string) => {
    const rules = await getPricingRules()
    if (!rules) return null
    return rules.find((r: any) => r.category_code === categoryCode && r.is_active) || null
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all products for current tenant
   */
  const getProducts = async () => {
    return apiCall<any[]>('/api/staff/get-products', {})
  }

  /**
   * Get product sales for an appointment
   */
  const getProductSales = async (appointmentId: string) => {
    return apiCall<any[]>('/api/staff/get-product-sales', {
      query: { appointment_id: appointmentId }
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // APPOINTMENT APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get appointment by ID
   */
  const getAppointment = async (appointmentId: string) => {
    return apiCall<any>('/api/staff/get-appointment', {
      query: { id: appointmentId }
    })
  }

  /**
   * Check for appointment conflicts
   */
  const checkAppointmentConflicts = async (data: {
    staff_id: string
    start_time: string
    end_time: string
    exclude_id?: string
  }) => {
    return apiCall<any>('/api/staff/check-appointment-conflicts', {
      method: 'POST',
      body: data
    })
  }

  /**
   * Delete/Cancel appointment
   */
  const deleteAppointment = async (appointmentId: string, reason?: string) => {
    return apiCall<any>('/api/staff/delete-appointment', {
      method: 'POST',
      body: { appointment_id: appointmentId, reason }
    })
  }

  /**
   * Count student appointments for a category (for admin fee calculation)
   */
  const countStudentAppointments = async (studentId: string, categoryCode: string) => {
    const result = await apiCall<{ count: number }>('/api/staff/count-student-appointments', {
      query: { student_id: studentId, category_code: categoryCode }
    })
    return result?.count || 0
  }

  /**
   * Get last appointment for a student (for pre-filling category)
   */
  const getLastStudentAppointment = async (studentId: string) => {
    return apiCall<any>('/api/staff/get-last-student-appointment', {
      query: { student_id: studentId }
    })
  }

  /**
   * Update appointment (soft delete, status change, etc.)
   */
  const updateAppointment = async (appointmentId: string, updateData: any) => {
    // Ensure update_data is properly structured
    const body: any = { appointment_id: appointmentId }
    
    if (updateData.update_data) {
      // If updateData already has update_data field, use it directly
      body.update_data = updateData.update_data
      // Preserve other fields like check_duration_reduction
      Object.keys(updateData).forEach(key => {
        if (key !== 'update_data') {
          body[key] = updateData[key]
        }
      })
    } else {
      // Otherwise, treat updateData as the update_data itself
      body.update_data = updateData
    }
    
    return apiCall<any>('/api/staff/update-appointment', {
      method: 'POST',
      body
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // INVOICE APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get invoice for an appointment
   */
  const getInvoice = async (appointmentId: string, invoiceType?: string) => {
    return apiCall<any>('/api/staff/get-invoice', {
      query: { appointment_id: appointmentId, invoice_type: invoiceType }
    })
  }

  /**
   * Update invoice
   */
  const updateInvoice = async (invoiceId: string, updateData: any) => {
    return apiCall<any>('/api/staff/update-invoice', {
      method: 'POST',
      body: { invoice_id: invoiceId, update_data: updateData }
    })
  }

  /**
   * Mark invoice as paid
   */
  const markInvoiceAsPaid = async (invoiceId: string) => {
    return updateInvoice(invoiceId, {
      status: 'paid',
      paid_at: new Date().toISOString()
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // CREDIT APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get student credits
   */
  const getStudentCredits = async (userId: string) => {
    return apiCall<any>('/api/staff/get-student-credits', {
      query: { user_id: userId }
    })
  }

  /**
   * Add credit transaction
   */
  const addCreditTransaction = async (data: {
    user_id: string
    amount_rappen: number
    reason: string
    type: string
    reference_type?: string
    reference_id?: string
  }) => {
    return apiCall<any>('/api/staff/credit-transaction', {
      method: 'POST',
      body: data
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // DISCOUNT APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get discounts for current tenant
   */
  const getDiscounts = async () => {
    return apiCall<any[]>('/api/staff/get-discounts', {})
  }

  // ═══════════════════════════════════════════════════════════════
  // TENANT APIs
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get current tenant info
   */
  const getTenantInfo = async () => {
    return apiCall<any>('/api/staff/get-tenant-info', {})
  }

  return {
    // Payment
    getPaymentByAppointment,
    getPaymentById,
    updatePayment,
    getPaymentStatus,

    // User
    getUser,
    getBillingAddress,
    getStaffList,
    getCurrentUserTenant,

    // Category
    getCategories,
    getCategoryByCode,

    // Location
    getLocations,
    getLocationById,

    // Event Type
    getEventTypes,
    getDefaultEventType,

    // Pricing
    getPricingRules,
    getPricingRuleByCategory,

    // Product
    getProducts,
    getProductSales,

    // Appointment
    getAppointment,
    checkAppointmentConflicts,
    deleteAppointment,
    countStudentAppointments,
    getLastStudentAppointment,
    updateAppointment,

    // Invoice
    getInvoice,
    updateInvoice,
    markInvoiceAsPaid,

    // Credit
    getStudentCredits,
    addCreditTransaction,

    // Discount
    getDiscounts,

    // Tenant
    getTenantInfo
  }
}

