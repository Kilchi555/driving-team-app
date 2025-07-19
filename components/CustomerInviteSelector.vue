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
        </div>
        
        <div class="flex items-center gap-2">
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

            <!-- Telefonnummer -->
            <div>
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
                  </div>
                  <div class="text-sm text-gray-600">
                    📱 {{ customer.phone }}
                    <span v-if="customer.notes" class="ml-2">
                      📝 {{ customer.notes }}
                    </span>
                  </div>
                </div>
                
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

            <!-- Info Box -->
            <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-start gap-2">
                <span class="text-blue-600 mt-0.5">ℹ️</span>
                <div class="text-sm text-blue-800">
                  <p class="font-medium">Was passiert beim Speichern:</p>
                  <ul class="mt-1 space-y-1 text-xs">
                    <li>• Neukunden werden automatisch registriert</li>
                    <li>• SMS-Einladung mit App-Download Link</li>
                    <li>• Termin wird für alle Teilnehmer erstellt</li>
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

// Customer Interface - vereinfacht für temp users
interface NewCustomer {
  first_name?: string
  last_name?: string
  phone: string
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

const newCustomer = ref<NewCustomer>({
  first_name: '',
  last_name: '',
  phone: '',
  category: '',
  notes: ''
})

// Computed
const invitedCustomers = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const isNewCustomerValid = computed(() => {
  return newCustomer.value.phone.trim() &&
         isValidPhone(newCustomer.value.phone) &&
         (newCustomer.value.first_name?.trim() || newCustomer.value.last_name?.trim()) // Mindestens ein Name
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
    
    const { data, error } = await supabase
      .from('categories')
      .select('code, name, is_active, display_order')
      .eq('is_active', true)
      .order('display_order')
    
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
    
    // Check regular users
    const { data: existingCustomer } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone')
      .eq('phone', formatPhone(newCustomer.value.phone))
      .eq('role', 'client')
      .maybeSingle()

    if (existingCustomer) {
      error.value = `Kunde "${existingCustomer.first_name} ${existingCustomer.last_name}" ist bereits registriert`
      return
    }

    // Check invited customers
    const { data: invitedCustomer } = await supabase
      .from('invited_customers')
      .select('id, first_name, last_name, phone')
      .eq('phone', formatPhone(newCustomer.value.phone))
      .eq('status', 'pending')
      .maybeSingle()

    if (invitedCustomer) {
      error.value = `Einladung für "${invitedCustomer.first_name || ''} ${invitedCustomer.last_name || ''}" bereits versendet`
      return
    }

    // Add to invited customers list
    const customerToAdd: NewCustomer = {
      first_name: newCustomer.value.first_name?.trim() || undefined,
      last_name: newCustomer.value.last_name?.trim() || undefined,
      phone: formatPhone(newCustomer.value.phone),
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

const createInvitedCustomers = async (appointmentData: any) => {
  if (invitedCustomers.value.length === 0) {
    console.log('📞 No customers to invite')
    return []
  }

  console.log('📧 Creating invited customers in temp table:', invitedCustomers.value.length)
  const supabase = getSupabase()
  const createdInvites = []

  for (const customer of invitedCustomers.value) {
    try {
      // 1. Create entry in invited_customers table
      const inviteData = {
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        phone: customer.phone,
        category: customer.category || null,
        notes: customer.notes || null,
        invited_by_staff_id: props.currentUser?.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 Tage
      }

      const { data: invite, error: inviteError } = await supabase
        .from('invited_customers')
        .insert(inviteData)
        .select()
        .single()

      if (inviteError) throw inviteError

      // 2. TODO: Send SMS invitation
      // Integration with SMS service (Twilio, etc.)
      console.log('📱 SMS invitation would be sent to:', customer.phone)
      console.log('📧 Invitation stored with ID:', invite.id)

      createdInvites.push(invite)

    } catch (err) {
      console.error('❌ Error creating invite for customer:', customer, err)
    }
  }

  // 3. TODO: Create reminder job for follow-up SMS
  console.log('⏰ Reminder jobs would be scheduled for', createdInvites.length, 'invites')

  return createdInvites
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