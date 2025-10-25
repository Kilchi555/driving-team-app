<template>
  <div class="customer-invite-selector">
    <!-- Kollapsible Header -->
    <div class="bg-green-50 border border-green-200 rounded-lg">
      
      <!-- Klickbarer Header -->
      <div 
        class="flex items-center justify-between p-3 cursor-pointer hover:bg-green-100 transition-colors"
        @click="toggleExpanded"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">📞</span>
          <label class="text-sm font-semibold text-gray-900 cursor-pointer">
            Neukunden einladen
          </label>
          <span v-if="invitedCustomers.length > 0" class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            {{ invitedCustomers.length }}
          </span>
          
          <!-- SMS Status Badge im Header -->
          <span v-if="smsStatusSummary.total > 0" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            📱 {{ smsStatusSummary.sent }}/{{ smsStatusSummary.total }}
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- SMS Sending Indicator im Header -->
          <div v-if="sendingSms" class="flex items-center gap-1">
            <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            <span class="text-xs text-blue-600">SMS...</span>
          </div>
          
          <!-- Schnell-Aktionen (nur wenn expanded) -->
          <div v-if="isExpanded && invitedCustomers.length > 0" class="flex gap-1">
            <button
              @click.stop="clearAll"
              :disabled="disabled"
              class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Alle löschen
            </button>
          </div>
          
          <!-- Expand/Collapse Icon -->
          <svg 
            class="w-4 h-4 text-gray-600 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Ausklappbarer Inhalt -->
      <div 
        v-if="isExpanded"
        class="border-t border-green-200 transition-all duration-300 ease-in-out"
      >
        
        <!-- Error State -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 m-3">
          ❌ {{ error }}
        </div>

        <!-- SMS-Sending Indicator -->
        <div v-if="sendingSms" class="mx-3 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span class="text-sm text-blue-800">📱 Sende SMS-Einladungen...</span>
          </div>
        </div>

        <!-- Neukunden-Eingabeformular -->
        <div class="p-4 bg-white">
          
          <!-- Eingabefeld für neue Kunden -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <!-- Vorname (optional) -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Vorname
                </label>
                <input
                  v-model="newCustomer.first_name"
                  type="text"
                  placeholder="Max"
                  :disabled="disabled"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  @keydown.enter="addCustomer"
                />
              </div>

              <!-- Nachname (optional) -->
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">
                  Nachname
                </label>
                <input
                  v-model="newCustomer.last_name"
                  type="text"
                  placeholder="Mustermann"
                  :disabled="disabled"
                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                  @keydown.enter="addCustomer"
                />
              </div>
            </div>

            <!-- Einladungsmethode -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-2">
                Einladungsmethode *
              </label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    v-model="invitationMethod"
                    type="radio"
                    value="sms"
                    :disabled="disabled"
                    class="mr-2"
                  />
                  <span class="text-sm">📱 SMS</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="invitationMethod"
                    type="radio"
                    value="email"
                    :disabled="disabled"
                    class="mr-2"
                  />
                  <span class="text-sm">📧 E-Mail</span>
                </label>
              </div>
            </div>

            <!-- Telefonnummer (nur bei SMS) -->
            <div v-if="invitationMethod === 'sms'">
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Telefonnummer *
              </label>
              <input
                v-model="newCustomer.phone"
                type="tel"
                placeholder="+41 79 123 45 67"
                :disabled="disabled"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                @keydown.enter="addCustomer"
              />
              <p class="text-xs text-gray-500 mt-1">
                Der Kunde erhält eine SMS-Einladung an diese Nummer
              </p>
            </div>

            <!-- E-Mail (nur bei E-Mail) -->
            <div v-if="invitationMethod === 'email'">
              <label class="block text-xs font-medium text-gray-700 mb-1">
                E-Mail-Adresse *
              </label>
              <input
                v-model="newCustomer.email"
                type="email"
                placeholder="kunde@beispiel.ch"
                :disabled="disabled"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                @keydown.enter="addCustomer"
              />
              <p class="text-xs text-gray-500 mt-1">
                Der Kunde erhält eine E-Mail-Einladung an diese Adresse
              </p>
            </div>

            <!-- Kategorie -->
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Kategorie
              </label>
              <select
                v-model="newCustomer.category"
                :disabled="disabled || isLoadingCategories"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
              >
                <option value="">
                  {{ isLoadingCategories ? 'Kategorien laden...' : 'Kategorie wählen' }}
                </option>
                <option 
                  v-for="category in categories" 
                  :key="category.code"
                  :value="category.code"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- Add Button -->
            <div class="flex justify-end">
              <button
                @click="addCustomer"
                :disabled="!isNewCustomerValid || disabled || isProcessing"
                class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span v-if="isProcessing">⏳</span>
                <span v-else>➕</span>
                {{ isProcessing ? 'Hinzufügen...' : 'Zur Liste hinzufügen' }}
              </button>
            </div>
          </div>

          <!-- Eingeladene Kunden Liste -->
          <div v-if="invitedCustomers.length > 0" class="mt-6 pt-4 border-t border-gray-200">
            <h4 class="text-sm font-medium text-gray-900 mb-3">
              Eingeladene Neukunden ({{ invitedCustomers.length }})
            </h4>
            
            <div class="space-y-2">
              <div
                v-for="(customer, index) in invitedCustomers"
                :key="index"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-900">
                        {{ customer.first_name }} {{ customer.last_name }}
                      </span>
                      <span v-if="customer.category" class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {{ customer.category }}
                      </span>
                      
                      <!-- Contact info -->
                      <span v-if="customer.phone" class="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        📱 {{ customer.phone }}
                      </span>
                      <span v-if="customer.email" class="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                        📧 {{ customer.email }}
                      </span>
                      
                      <!-- SMS Status Badge (only for SMS customers) -->
                      <span v-if="customer.phone && smsStatus[customer.phone]" class="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                        :class="smsStatus[customer.phone].sent 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'"
                      >
                        <span v-if="smsStatus[customer.phone].sent">✅ SMS</span>
                        <span v-else>❌ SMS</span>
                      </span>
                      
                      <!-- Email Status Badge (for email customers) -->
                      <span v-if="customer.email" class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        📧 E-Mail
                      </span>
                    </div>
                  <div class="text-sm text-gray-600">
                    <span v-if="customer.notes">
                      📝 {{ customer.notes }}
                    </span>
                    
                    <!-- SMS Details (only for SMS customers) -->
                    <div v-if="customer.phone && smsStatus[customer.phone]" class="mt-1 text-xs">
                      <span v-if="smsStatus[customer.phone].sent && smsStatus[customer.phone].sid" class="text-green-600">
                        SID: {{ smsStatus[customer.phone].sid }}
                      </span>
                      <span v-else-if="smsStatus[customer.phone].error" class="text-red-600">
                        Fehler: {{ smsStatus[customer.phone].error }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <!-- SMS Retry Button -->
                  <button
                    v-if="smsStatus[customer.phone] && !smsStatus[customer.phone].sent"
                    @click="retrySms(customer)"
                    class="text-blue-600 hover:text-blue-800 p-1 text-xs"
                    title="SMS erneut senden"
                  >
                    🔄
                  </button>
                  
                  <button
                    v-if="!disabled"
                    @click="removeCustomer(index)"
                    class="text-red-600 hover:text-red-800 p-1"
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- SMS Summary -->
            <div v-if="smsStatusSummary.total > 0" class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h5 class="text-sm font-medium text-gray-900 mb-2">📊 SMS-Status</h5>
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-lg font-bold text-gray-900">{{ smsStatusSummary.total }}</div>
                  <div class="text-gray-600">Gesamt</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-green-600">{{ smsStatusSummary.sent }}</div>
                  <div class="text-gray-600">Gesendet</div>
                </div>
                <div class="text-center">
                  <div class="text-lg font-bold text-red-600">{{ smsStatusSummary.failed }}</div>
                  <div class="text-gray-600">Fehlgeschlagen</div>
                </div>
              </div>
            </div>

            <!-- Updated Info Box -->
            <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start gap-2">
                <span class="text-blue-600 mt-0.5">ℹ️</span>
                <div class="text-sm text-blue-800">
                  <p class="font-medium">Was passiert beim Speichern:</p>
                  <ul class="mt-1 space-y-1 text-xs">
                    <li>• Neukunden werden automatisch registriert</li>
                    <li>• 📱 SMS-Einladung mit Termindetails und App-Link</li>
                    <li>• Termin wird für alle Teilnehmer erstellt</li>
                    <li v-if="sendingSms">• <strong>SMS werden gerade versendet...</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kompakte Übersicht der eingeladenen Kunden (außerhalb des Selectors) -->
    <div v-if="!isExpanded && invitedCustomers.length > 0" class="mt-2">
      <div class="text-xs text-gray-600 mb-1">Eingeladene Neukunden:</div>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(customer, index) in invitedCustomers"
          :key="index"
          class="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800"
        >
          {{ customer.first_name }} {{ customer.last_name }}
          
          <!-- SMS Status in kompakter Ansicht -->
          <span v-if="smsStatus[customer.phone]" class="ml-1">
            <span v-if="smsStatus[customer.phone].sent" class="text-green-600">✅</span>
            <span v-else class="text-red-600">❌</span>
          </span>
          
          <button
            v-if="!disabled"
            @click="removeCustomer(index)"
            class="ml-1 hover:text-green-600"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { useSmsService } from '~/composables/useSmsService'

// Customer Interface - vereinfacht für temp users
interface NewCustomer {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  category?: string
  notes?: string
}

// Props
interface Props {
  modelValue?: NewCustomer[]
  currentUser?: any
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [customers: NewCustomer[]]
  'customers-added': [customers: NewCustomer[]]
  'customers-cleared': []
}>()

// State
const isExpanded = ref(false)
const isProcessing = ref(false)
const error = ref<string | null>(null)
const categories = ref<any[]>([])
const isLoadingCategories = ref(false)
const smsStatus = ref<Record<string, { sent: boolean, sid?: string, error?: string }>>({})
const sendingSms = ref(false)

const newCustomer = ref<NewCustomer>({
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  category: '',
  notes: ''
})

// Invitation method selection
const invitationMethod = ref<'sms' | 'email'>('sms')

// Computed
const invitedCustomers = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const isNewCustomerValid = computed(() => {
  const hasName = newCustomer.value.first_name?.trim() || newCustomer.value.last_name?.trim()
  
  if (invitationMethod.value === 'sms') {
    return newCustomer.value.phone?.trim() &&
           isValidPhone(newCustomer.value.phone) &&
           hasName
  } else {
    return newCustomer.value.email?.trim() &&
           isValidEmail(newCustomer.value.email) &&
           hasName
  }
})

// Computed für SMS Status Display:
const smsStatusSummary = computed(() => {
  const statuses = Object.values(smsStatus.value)
  return {
    total: statuses.length,
    sent: statuses.filter(s => s.sent).length,
    failed: statuses.filter(s => !s.sent).length
  }
})

// Methods
const isValidPhone = (phone: string): boolean => {
  // Swiss phone number validation
  const phoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  return phoneRegex.test(cleanPhone)
}

const isValidEmail = (email: string): boolean => {
  // Email validation (not used anymore but kept for potential future use)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const formatPhone = (phone: string): string => {
  // Format phone number consistently
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  if (cleanPhone.startsWith('0041')) {
    cleanPhone = '+41' + cleanPhone.substring(4)
  } else if (cleanPhone.startsWith('0') && !cleanPhone.startsWith('+41')) {
    cleanPhone = '+41' + cleanPhone.substring(1)
  }
  
  return cleanPhone
}

const createInvitationSmsMessage = (customer: NewCustomer, appointmentData?: any) => {
  const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Kunde'
  
  // Basis-Einladungs-SMS
  let message = `Hallo ${customerName}! `
  
  if (appointmentData) {
    // ✅ KRITISCHER FIX: Entferne das +00:00 UTC-Suffix
    const cleanStartTime = appointmentData.start_time.replace('+00:00', '').replace('T', ' ')
    
    // Jetzt wird es als lokale Zeit interpretiert
    const startDate = new Date(cleanStartTime)
    
    const appointmentDate = startDate.toLocaleDateString('de-CH')
    const appointmentTime = startDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    // Staff-Informationen aus appointmentData
    const staffName = appointmentData.staff?.first_name || 'Ihr Fahrlehrer'
    const staffPhone = appointmentData.staff?.phone || ''
    
    // Location-Informationen aus appointmentData
    const locationName = appointmentData.location_name || 'Treffpunkt'
    const locationAddress = appointmentData.location_address || ''
    
    message += `Dein Termin ist am ${appointmentDate} um ${appointmentTime} Uhr bestätigt.\n\n`
    
    // Staff-Name mit Telefonnummer
    if (staffPhone) {
      message += `${staffName} (${staffPhone}) wird dich gerne hier erwarten: ${locationName}`
    } else {
      message += `${staffName} wird dich gerne hier erwarten: ${locationName}`
    }
    
    if (locationAddress) {
      message += ` (${locationAddress})`
    }
    
    message += `.\n\n`
  }
  
  message += `Beste Grüsse,\nDein Driving Team!`
  
  return message
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  console.log('🔄 CustomerInviteSelector expanded:', isExpanded.value)
  
  // Auto-load categories when expanded for the first time
  if (isExpanded.value && categories.value.length === 0) {
    loadCategories()
  }
}

const loadCategories = async () => {
  if (isLoadingCategories.value) return
  
  isLoadingCategories.value = true
  
  try {
    console.log('🔄 Loading categories from database...')
    const supabase = getSupabase()
    
    // Get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    // Get tenant business_type
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantError) throw tenantError
    
    // Only load categories if business_type is driving_school
    if (tenantData?.business_type !== 'driving_school') {
      console.log('🚫 Categories not available for business_type:', tenantData?.business_type)
      categories.value = []
      isLoadingCategories.value = false
      return
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('code, name, is_active')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .order('code')
    
    if (error) throw error
    
    categories.value = data || []
    console.log('✅ Categories loaded:', categories.value.length)
    
  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    // Fallback categories
    categories.value = [
      { code: 'B', name: 'B - Auto' },
      { code: 'A1', name: 'A1 - Motorrad 125cc' },
      { code: 'A', name: 'A - Motorrad' },
      { code: 'BE', name: 'BE - Anhänger' },
      { code: 'C', name: 'C - LKW' },
      { code: 'C1', name: 'C1 - LKW klein' },
      { code: 'CE', name: 'CE - LKW mit Anhänger' }
    ]
    console.log('🔄 Using fallback categories')
  } finally {
    isLoadingCategories.value = false
  }
}

const addCustomer = async () => {
  if (!isNewCustomerValid.value) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
    return
  }

  // Check for duplicates
  const phoneExists = invitedCustomers.value.some(c => 
    formatPhone(c.phone) === formatPhone(newCustomer.value.phone)
  )
  
  if (phoneExists) {
    error.value = 'Ein Kunde mit dieser Telefonnummer wurde bereits hinzugefügt'
    return
  }

  try {
    isProcessing.value = true
    error.value = null

  // Check if customer already exists in database OR invited_customers
  const supabase = getSupabase()
  
  // Check regular users based on invitation method
  let existingCustomer = null
  if (invitationMethod.value === 'sms' && newCustomer.value.phone) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone')
      .eq('phone', formatPhone(newCustomer.value.phone))
      .eq('role', 'client')
      .maybeSingle()
    existingCustomer = data
  } else if (invitationMethod.value === 'email' && newCustomer.value.email) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('email', newCustomer.value.email.trim().toLowerCase())
      .eq('role', 'client')
      .maybeSingle()
    existingCustomer = data
  }

  if (existingCustomer) {
    error.value = `Kunde "${existingCustomer.first_name} ${existingCustomer.last_name}" ist bereits registriert`
    return
  }

    // Dann direkt zum Hinzufügen zur Liste:
    const customerToAdd: NewCustomer = {
      first_name: newCustomer.value.first_name?.trim() || undefined,
      last_name: newCustomer.value.last_name?.trim() || undefined,
      phone: invitationMethod.value === 'sms' ? formatPhone(newCustomer.value.phone || '') : undefined,
      email: invitationMethod.value === 'email' ? newCustomer.value.email?.trim().toLowerCase() : undefined,
      category: newCustomer.value.category || undefined,
      notes: newCustomer.value.notes || undefined
    }

    const updatedCustomers = [...invitedCustomers.value, customerToAdd]
    invitedCustomers.value = updatedCustomers

    // Reset form
    newCustomer.value = {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      category: '',
      notes: ''
    }

    console.log('✅ Customer added to invite list:', customerToAdd)
    emit('customers-added', [customerToAdd])

  } catch (err: any) {
    console.error('❌ Error adding customer:', err)
    error.value = err.message || 'Fehler beim Hinzufügen des Kunden'
  } finally {
    isProcessing.value = false
  }
}

const removeCustomer = (index: number) => {
  const updatedCustomers = invitedCustomers.value.filter((_, i) => i !== index)
  invitedCustomers.value = updatedCustomers
  console.log('🗑️ Customer removed from invite list at index:', index)
}

const clearAll = () => {
  invitedCustomers.value = []
  newCustomer.value = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    category: '',
    notes: ''
  }
  error.value = null
  console.log('🗑️ All invited customers cleared')
  emit('customers-cleared')
}

const resetSelection = () => {
  clearAll()
  isExpanded.value = false
  console.log('🔄 CustomerInviteSelector: Selection reset')
}

// 1. VERWENDE useSmsService STATT DIREKTER EDGE FUNCTION:
const { sendSms } = useSmsService()

// 2. DEINE createInvitedCustomers FUNKTION BLEIBT UNVERÄNDERT:
const createInvitedCustomers = async (appointmentData: any) => {
  if (invitedCustomers.value.length === 0) {
    console.log('📞 No customers to invite')
    return []
  }

  console.log('📧 Creating invited customers and sending invitations:', invitedCustomers.value.length)
  const supabase = getSupabase()
  const createdInvites = []
  sendingSms.value = true

  for (const customer of invitedCustomers.value) {
    try {
      // 1. UPSERT entry in invited_customers table
      const inviteData = {
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        phone: customer.phone || null,
        email: customer.email || null,
        category: customer.category || null,
        notes: customer.notes || null,
        invited_by_staff_id: props.currentUser?.id,
        appointment_id: appointmentData.id, // ← Verknüpfung zum Termin
        status: 'pending',
        expires_at: toLocalTimeString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 Tage        
        updated_at: toLocalTimeString(new Date())
      }

      // UPSERT: ON CONFLICT (phone OR email) DO UPDATE
      const conflictColumn = customer.phone ? 'phone' : 'email'
      const { data: invite, error: inviteError } = await supabase
        .from('invited_customers')
        .upsert(inviteData, { 
          onConflict: conflictColumn,
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      console.log('✅ Invitation upserted with ID:', invite.id)

      // 2. Send invitation (SMS or Email)
      try {
        if (customer.phone) {
          // Send SMS invitation
          const smsMessage = createInvitationSmsMessage(customer, appointmentData)
          console.log('📱 Sending SMS to:', customer.phone)
          console.log('📄 Message:', smsMessage)

          const smsResult = await sendSms(customer.phone, smsMessage)

       if (smsResult.success) {
          console.log('✅ SMS sent successfully:', smsResult.data?.sid)
          
          // Update SMS status tracking
          smsStatus.value[customer.phone] = {
            sent: true,
            sid: smsResult.data?.sid
          }

          // Update invitation record with SMS status - VERWENDE VORHANDENE FELDER
          await supabase
            .from('invited_customers')
            .update({
              invitation_sent_at: toLocalTimeString(new Date()), // ← Statt sms_sent_at
              metadata: { // ← Speichere SMS-Details im metadata-Feld (JSONB)
                sms_sent: true,
                sms_sid: smsResult.data?.sid,
                sms_sent_at: toLocalTimeString(new Date())
              }
            })
            .eq('id', invite.id)

        } else {
          console.error('❌ SMS failed:', smsResult.error)
          smsStatus.value[customer.phone] = {
            sent: false,
            error: smsResult.error
          }

          // Update invitation record with SMS failure - VERWENDE VORHANDENE FELDER
          await supabase
            .from('invited_customers')
            .update({
              invitation_sent_at: toLocalTimeString(new Date()), // ← Versucht wurde es trotzdem
              metadata: { // ← Speichere Fehler-Details im metadata-Feld
                sms_sent: false,
                sms_error: smsResult.error,
                sms_sent_at: toLocalTimeString(new Date())
              }
            })
            .eq('id', invite.id)
        }

        } else if (customer.email) {
          // Send Email invitation using Supabase Auth
          console.log('📧 Sending Email invitation to:', customer.email)
          
          try {
            const { data: emailResult, error: emailError } = await supabase.auth.admin.inviteUserByEmail(
              customer.email,
              {
                data: {
                  first_name: customer.first_name,
                  last_name: customer.last_name,
                  tenant_id: props.currentUser?.tenant_id,
                  tenant_name: 'Driving Team', // TODO: Get from current tenant
                  appointment_id: appointmentData.id,
                  category: customer.category,
                  notes: customer.notes
                }
              }
            )
            
            if (emailError) {
              console.error('❌ Email invitation failed:', emailError)
              // Update invitation record with email failure
              await supabase
                .from('invited_customers')
                .update({
                  invitation_sent_at: toLocalTimeString(new Date()),
                  metadata: {
                    email_sent: false,
                    email_error: emailError.message,
                    email_sent_at: toLocalTimeString(new Date())
                  }
                })
                .eq('id', invite.id)
            } else {
              console.log('✅ Email invitation sent successfully:', emailResult.user?.id)
              // Update invitation record with email success
              await supabase
                .from('invited_customers')
                .update({
                  invitation_sent_at: toLocalTimeString(new Date()),
                  metadata: {
                    email_sent: true,
                    email_user_id: emailResult.user?.id,
                    email_sent_at: toLocalTimeString(new Date())
                  }
                })
                .eq('id', invite.id)
            }
          } catch (emailError: any) {
            console.error('❌ Email invitation error:', emailError)
            // Update invitation record with email error
            await supabase
              .from('invited_customers')
              .update({
                invitation_sent_at: toLocalTimeString(new Date()),
                metadata: {
                  email_sent: false,
                  email_error: emailError.message || 'Email Fehler',
                  email_sent_at: toLocalTimeString(new Date())
                }
              })
              .eq('id', invite.id)
          }
        }

      } catch (smsError: any) {
        console.error('❌ SMS sending error:', smsError)
        if (customer.phone) {
          smsStatus.value[customer.phone] = {
            sent: false,
            error: smsError.message || 'SMS Fehler'
          }
        }
      }

      createdInvites.push({
        ...invite,
        sms_status: smsStatus.value[customer.phone]
      })

    } catch (err) {
      console.error('❌ Error creating invite for customer:', customer, err)
    }
  }

  sendingSms.value = false

  // 3. Log SMS summary
  const successfulSms = Object.values(smsStatus.value).filter(status => status.sent).length
  const failedSms = Object.values(smsStatus.value).filter(status => !status.sent).length
  console.log(`📊 SMS Summary: ${successfulSms} sent, ${failedSms} failed`)

  // 4. TODO: Create reminder job for follow-up SMS
  console.log('⏰ Reminder jobs would be scheduled for', createdInvites.length, 'invites')

  return createdInvites
}

// Funktion zum manuellen Nachsenden einer SMS:
const retrySms = async (customer: NewCustomer) => {
  try {
    const smsMessage = createInvitationSmsMessage(customer)
    const smsResult = await sendSms(customer.phone, smsMessage)
    
    if (smsResult.success) {
      smsStatus.value[customer.phone] = {
        sent: true,
        sid: smsResult.data?.sid
      }
      console.log('✅ SMS retry successful for:', customer.phone)
    } else {
      console.error('❌ SMS retry failed for:', customer.phone, smsResult.error)
    }
  } catch (error) {
    console.error('❌ SMS retry error:', error)
  }
}

// Expose methods for parent components
defineExpose({
  addCustomer,
  clearAll,
  resetSelection,
  createInvitedCustomers,
  toggleExpanded,
  loadCategories
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states */
input:focus, select:focus {
  outline: none;
}
</style>