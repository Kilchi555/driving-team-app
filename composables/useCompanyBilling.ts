// composables/useCompanyBilling.ts

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import type { 
  CompanyBillingAddress, 
  CompanyBillingAddressInsert,
  CompanyBillingFormData,
  CompanyBillingValidation,
  CreateCompanyBillingResponse,
  CompanyBillingListResponse
} from '~/types/companyBilling'

export const useCompanyBilling = () => {
  const supabase = getSupabase()
  
  // State
  const isLoading = ref(false)
  const error = ref<string>('')
  const savedAddresses = ref<CompanyBillingAddress[]>([])
  const currentAddress = ref<CompanyBillingAddress | null>(null)
  
  // Form Data
  const formData = ref<CompanyBillingFormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    street: '',
    streetNumber: '',
    zip: '',
    city: '',
    country: 'Schweiz',
    vatNumber: '',
    notes: ''
  })

  // Validation
  const validation = computed((): CompanyBillingValidation => {
    const errors: Record<string, string> = {}
    
    if (!formData.value.companyName.trim()) {
      errors.companyName = 'Firmenname ist erforderlich'
    }
    
    if (!formData.value.contactPerson.trim()) {
      errors.contactPerson = 'Ansprechperson ist erforderlich'
    }
    
    if (!formData.value.email.trim()) {
      errors.email = 'E-Mail ist erforderlich'
    } else if (!isValidEmail(formData.value.email)) {
      errors.email = 'Gültige E-Mail-Adresse erforderlich'
    }
    
    if (!formData.value.street.trim()) {
      errors.street = 'Strasse ist erforderlich'
    }
    
    if (!formData.value.zip.trim()) {
      errors.zip = 'PLZ ist erforderlich'
    } else if (!/^\d{4}$/.test(formData.value.zip)) {
      errors.zip = 'PLZ muss 4 Ziffern haben'
    }
    
    if (!formData.value.city.trim()) {
      errors.city = 'Ort ist erforderlich'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  })

  // Methods
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const resetForm = () => {
    formData.value = {
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      street: '',
      streetNumber: '',
      zip: '',
      city: '',
      country: 'Schweiz',
      vatNumber: '',
      notes: ''
    }
    error.value = ''
  }

  const loadFormFromAddress = (address: CompanyBillingAddress) => {
    formData.value = {
      companyName: address.company_name,
      contactPerson: address.contact_person,
      email: address.email,
      phone: address.phone || '',
      street: address.street,
      streetNumber: address.street_number || '',
      zip: address.zip,
      city: address.city,
      country: address.country,
      vatNumber: address.vat_number || '',
      notes: address.notes || ''
    }
    currentAddress.value = address
  }

  const convertFormToInsert = (userId: string): CompanyBillingAddressInsert => {
    return {
      company_name: formData.value.companyName.trim(),
      contact_person: formData.value.contactPerson.trim(),
      email: formData.value.email.trim(),
      phone: formData.value.phone.trim() || undefined,
      street: formData.value.street.trim(),
      street_number: formData.value.streetNumber.trim() || undefined,
      zip: formData.value.zip.trim(),
      city: formData.value.city.trim(),
      country: formData.value.country.trim(),
      vat_number: formData.value.vatNumber.trim() || undefined,
      notes: formData.value.notes.trim() || undefined,
      created_by: userId
    }
  }

  // CRUD Operations
  const createCompanyBillingAddress = async (userId: string): Promise<CreateCompanyBillingResponse> => {
    if (!validation.value.isValid) {
      return {
        success: false,
        error: 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
      }
    }

    isLoading.value = true
    error.value = ''

    try {
      const insertData = convertFormToInsert(userId)
      
      console.log('💾 Creating company billing address:', insertData)

      const { data, error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .insert(insertData)
        .select()
        .single()

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      if (!data) {
        throw new Error('Keine Daten von der Datenbank erhalten')
      }

      currentAddress.value = data
      console.log('✅ Company billing address created:', data)

      return {
        success: true,
        data: data
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Speichern der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error creating company billing address:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  const loadUserCompanyAddresses = async (userId: string): Promise<CompanyBillingListResponse> => {
    isLoading.value = true
    error.value = ''

    try {
      console.log('🔄 Loading company addresses for user:', userId)

      const { data, error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .select('*')
        .eq('created_by', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      savedAddresses.value = data || []
      console.log('✅ Company addresses loaded:', savedAddresses.value.length)

      return {
        success: true,
        data: data || []
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Laden der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error loading company addresses:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  const updateCompanyBillingAddress = async (addressId: string): Promise<CreateCompanyBillingResponse> => {
    if (!validation.value.isValid) {
      return {
        success: false,
        error: 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
      }
    }

    isLoading.value = true
    error.value = ''

    try {
      const updateData = {
        company_name: formData.value.companyName.trim(),
        contact_person: formData.value.contactPerson.trim(),
        email: formData.value.email.trim(),
        phone: formData.value.phone.trim() || null,
        street: formData.value.street.trim(),
        street_number: formData.value.streetNumber.trim() || null,
        zip: formData.value.zip.trim(),
        city: formData.value.city.trim(),
        country: formData.value.country.trim(),
        vat_number: formData.value.vatNumber.trim() || null,
        notes: formData.value.notes.trim() || null,
        updated_at: new Date().toISOString()
      }

      console.log('💾 Updating company billing address:', addressId, updateData)

      const { data, error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .update(updateData)
        .eq('id', addressId)
        .select()
        .single()

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      currentAddress.value = data
      console.log('✅ Company billing address updated:', data)

      return {
        success: true,
        data: data
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Aktualisieren der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error updating company billing address:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  const deleteCompanyBillingAddress = async (addressId: string): Promise<{ success: boolean; error?: string }> => {
    isLoading.value = true
    error.value = ''

    try {
      console.log('🗑️ Deleting company billing address:', addressId)

      const { error: supabaseError } = await supabase
        .from('company_billing_addresses')
        .update({ is_active: false })
        .eq('id', addressId)

      if (supabaseError) {
        console.error('❌ Supabase error:', supabaseError)
        throw new Error(supabaseError.message)
      }

      // Remove from local state
      savedAddresses.value = savedAddresses.value.filter(addr => addr.id !== addressId)
      
      if (currentAddress.value?.id === addressId) {
        currentAddress.value = null
        resetForm()
      }

      console.log('✅ Company billing address deleted')

      return { success: true }

    } catch (err: any) {
      const errorMessage = err.message || 'Fehler beim Löschen der Firmenadresse'
      error.value = errorMessage
      console.error('❌ Error deleting company billing address:', err)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isLoading.value = false
    }
  }

  // Utility Methods
  const formatAddress = (address: CompanyBillingAddress): string => {
    const parts = [
      address.company_name,
      address.contact_person,
      `${address.street}${address.street_number ? ' ' + address.street_number : ''}`,
      `${address.zip} ${address.city}`,
      address.country
    ]
    return parts.join('\n')
  }

  const getAddressPreview = (address: CompanyBillingAddress): string => {
    return `${address.company_name} - ${address.contact_person}`
  }

  return {
    // State
    formData,
    currentAddress,
    savedAddresses,
    isLoading,
    error,
    validation,
    
    // Methods
    createCompanyBillingAddress,
    loadUserCompanyAddresses,
    updateCompanyBillingAddress,
    deleteCompanyBillingAddress,
    loadFormFromAddress,
    resetForm,
    formatAddress,
    getAddressPreview
  }
}