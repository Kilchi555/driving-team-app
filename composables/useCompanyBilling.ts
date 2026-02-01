// composables/useCompanyBilling.ts

import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'
import type { 
  CompanyBillingAddress, 
  CompanyBillingAddressInsert,
  CompanyBillingFormData,
  CompanyBillingValidation,
  CreateCompanyBillingResponse,
  CompanyBillingListResponse
} from '~/types/companyBilling'
import { toLocalTimeString } from '~/utils/dateUtils'


export const useCompanyBilling = () => {
  // ✅ NO DIRECT SUPABASE ACCESS - All operations via APIs
  
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
      notes: '',
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
    
    logger.debug('💾 Creating company billing address via API')

    const response = await $fetch('/api/company-billing/manage', {
      method: 'POST',
      body: {
        action: 'create',
        userId,
        addressData: insertData
      }
    }) as any

    if (!response?.success || !response?.data) {
      throw new Error(response?.error || 'Failed to create address')
    }

    currentAddress.value = response.data
    logger.debug('✅ Company billing address created:', response.data)

    return {
      success: true,
      data: response.data
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
      logger.debug('🔄 Loading company addresses for user:', userId)

      const response = await $fetch('/api/company-billing/manage', {
        method: 'POST',
        body: {
          action: 'load',
          userId
        }
      }) as any

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to load addresses')
      }

      savedAddresses.value = response.data || []
      logger.debug('✅ Company addresses loaded:', savedAddresses.value.length)

      return {
        success: true,
        data: response.data || []
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
        updated_at: toLocalTimeString(new Date)
      }

      logger.debug('💾 Updating company billing address via API:', addressId)

      const response = await $fetch('/api/company-billing/manage', {
        method: 'POST',
        body: {
          action: 'update',
          addressId,
          addressData: updateData
        }
      }) as any

      if (!response?.success || !response?.data) {
        throw new Error(response?.error || 'Failed to update address')
      }

      currentAddress.value = response.data
      logger.debug('✅ Company billing address updated:', response.data)

      return {
        success: true,
        data: response.data
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
      logger.debug('🗑️ Deleting company billing address via API:', addressId)

      const response = await $fetch('/api/company-billing/manage', {
        method: 'POST',
        body: {
          action: 'delete',
          addressId
        }
      }) as any

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to delete address')
      }

      // Remove from local list
      savedAddresses.value = savedAddresses.value.filter(addr => addr.id !== addressId)
      logger.debug('✅ Company billing address deleted')

      return {
        success: true
      }

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

      // Remove from local state
      savedAddresses.value = savedAddresses.value.filter(addr => addr.id !== addressId)
      
      if (currentAddress.value?.id === addressId) {
        currentAddress.value = null
        resetForm()
      }

      logger.debug('✅ Company billing address deleted')

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


const loadDefaultBillingAddress = async (userId: string): Promise<CompanyBillingAddress | null> => {
  try {
    const response = await $fetch('/api/company-billing/manage', {
      method: 'POST',
      body: {
        action: 'get-default',
        userId
      }
    }) as any

    if (!response?.success) {
      logger.debug('ℹ️ Failed to load default billing address')
      return null
    }

    if (!response?.data) {
      logger.debug('ℹ️ No default billing address set for user')
      return null
    }

    logger.debug('✅ Default billing address loaded:', response.data.company_name)
    return response.data

  } catch (err) {
    console.error('❌ Error loading default billing address:', err)
    return null
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
    loadDefaultBillingAddress,
    resetForm,
    formatAddress,
    getAddressPreview
  }
}