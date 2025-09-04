// composables/usePaymentMethods.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export interface PaymentMethod {
  id: string
  method_code: string
  display_name: string
  description: string
  icon_name: string
  is_active: boolean
  is_online: boolean
  requires_verification: boolean
  provider_name: string | null
  provider_config: string
  fee_type: string
  fee_amount_rappen: number
  fee_percentage: string
  min_amount_rappen: number
  max_amount_rappen: number | null
  display_order: number
  allowed_roles: string[]
}

export interface CompanyBillingAddress {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  street: string
  street_number: string
  zip: string
  city: string
  country: string
  vat_number: string | null
  company_register_number: string | null
  is_active: boolean
  is_verified: boolean
  notes: string | null
  created_by: string
}

export const usePaymentMethods = () => {
  const paymentMethods = ref<PaymentMethod[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activePaymentMethods = computed(() =>
    paymentMethods.value
      .filter(p => p.is_active)
      .sort((a, b) => a.display_order - b.display_order)
  )

  const onlinePaymentMethods = computed(() =>
    activePaymentMethods.value.filter(p => p.is_online)
  )

  const offlinePaymentMethods = computed(() =>
    activePaymentMethods.value.filter(p => !p.is_online)
  )

  // Methods
  const loadPaymentMethods = async () => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (fetchError) throw fetchError

      paymentMethods.value = data || []
      console.log('✅ Payment methods loaded:', paymentMethods.value.length)
    } catch (err: any) {
      console.error('❌ Error loading payment methods:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const getPaymentMethodByCode = (code: string): PaymentMethod | undefined => {
    return paymentMethods.value.find(p => p.method_code === code)
  }

  const getPaymentMethodById = (id: string): PaymentMethod | undefined => {
    return paymentMethods.value.find(p => p.id === id)
  }

  return {
    paymentMethods,
    activePaymentMethods,
    onlinePaymentMethods,
    offlinePaymentMethods,
    isLoading,
    error,
    loadPaymentMethods,
    getPaymentMethodByCode,
    getPaymentMethodById
  }
}

export const useCompanyBilling = () => {
  const billingAddresses = ref<CompanyBillingAddress[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Methods
  const loadBillingAddresses = async () => {
    isLoading.value = true
    error.value = null

    try {
      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('company_billing_addresses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      billingAddresses.value = data || []
      console.log('✅ Billing addresses loaded:', billingAddresses.value.length)
    } catch (err: any) {
      console.error('❌ Error loading billing addresses:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const createBillingAddress = async (addressData: Omit<CompanyBillingAddress, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const supabase = getSupabase()
      const { data, error: createError } = await supabase
        .from('company_billing_addresses')
        .insert([addressData])
        .select()
        .single()

      if (createError) throw createError

      // Aktualisiere die lokale Liste
      await loadBillingAddresses()
      
      console.log('✅ Billing address created:', data)
      return { success: true, data }
    } catch (err: any) {
      console.error('❌ Error creating billing address:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  const updateBillingAddress = async (id: string, updates: Partial<CompanyBillingAddress>) => {
    try {
      const supabase = getSupabase()
      const { data, error: updateError } = await supabase
        .from('company_billing_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      // Aktualisiere die lokale Liste
      await loadBillingAddresses()
      
      console.log('✅ Billing address updated:', data)
      return { success: true, data }
    } catch (err: any) {
      console.error('❌ Error updating billing address:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  const deleteBillingAddress = async (id: string) => {
    try {
      const supabase = getSupabase()
      const { error: deleteError } = await supabase
        .from('company_billing_addresses')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Aktualisiere die lokale Liste
      await loadBillingAddresses()
      
      console.log('✅ Billing address deleted:', id)
      return { success: true }
    } catch (err: any) {
      console.error('❌ Error deleting billing address:', err)
      error.value = err.message
      return { success: false, error: err.message }
    }
  }

  return {
    billingAddresses,
    isLoading,
    error,
    loadBillingAddresses,
    createBillingAddress,
    updateBillingAddress,
    deleteBillingAddress
  }
}