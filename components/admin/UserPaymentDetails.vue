<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <NuxtLink 
              to="/admin/payment-overview" 
              class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Zurück zur Übersicht
            </NuxtLink>
            
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                👤 {{ displayName }}
              </h1>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button 
              @click="sendPaymentReminder"
              :disabled="!hasUnpaidAppointments || isLoading"
              class="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              Zahlungserinnerung senden
            </button>
            
            <button 
              @click="refreshData"
              :disabled="isLoading"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ isLoading ? 'Laden...' : 'Aktualisieren' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !userDetails" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Benutzerdaten werden geladen...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button 
            @click="refreshData"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        
        <!-- User Info Card -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Benutzerinformationen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Name</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ displayName }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">E-Mail</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a :href="emailLink" class="text-blue-600 hover:text-blue-800">
                    {{ displayEmail }}
                  </a>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Telefon</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <a v-if="userDetails?.phone" :href="phoneLink" class="text-blue-600 hover:text-blue-800">
                    {{ userDetails.phone }}
                  </a>
                  <span v-else class="text-gray-400">Nicht angegeben</span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Rolle</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="roleClass">
                    {{ roleLabel }}
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Gesamt Termine</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ totalAppointments }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Bezahlte Termine</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ paidAppointments }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Unbezahlte Termine</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ unpaidAppointments }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Offener Betrag</dt>
                    <dd class="text-lg font-medium text-gray-900">{{ formattedTotalUnpaidAmount }}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Settings -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Zahlungseinstellungen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt class="text-sm font-medium text-gray-500">Bevorzugte Zahlmethode</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="paymentMethodClass">
                    {{ paymentMethodLabel }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Firmenrechnung</dt>
                <dd class="mt-1">
                  <span v-if="hasCompanyBilling" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                    </svg>
                    Aktiviert
                  </span>
                  <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Nicht eingerichtet
                  </span>
                </dd>
              </div>
            </div>
            
            <!-- Company Billing Details -->
            <div v-if="companyBillingAddress" class="mt-6 pt-6 border-t border-gray-200">
              <h4 class="text-sm font-medium text-gray-900 mb-4">Rechnungsadresse</h4>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="font-medium text-gray-600">{{ companyBillingAddress.company_name }}</span><br>
                    <span class="text-gray-600">{{ companyBillingAddress.contact_person }}</span><br>
                    <span class="text-gray-600">{{ companyBillingAddress.street }} {{ companyBillingAddress.street_number || '' }}</span><br>
                    <span class="text-gray-600">{{ companyBillingAddress.zip }} {{ companyBillingAddress.city }}</span>
                  </div>
                  <div>
                    <span class="font-medium text-gray-600">E-Mail: </span>
                    <a :href="emailLink" class="text-blue-600 hover:text-blue-800"> {{ companyBillingAddress.email }}</a><br>
                    <span v-if="companyBillingAddress.phone" class="text-gray-600">Telefon:</span> 
                    <span v-if="companyBillingAddress.phone">{{ companyBillingAddress.phone }}</span><br>
                    <span v-if="companyBillingAddress.vat_number" class="text-gray-600">MwSt-Nr:</span> 
                    <span v-if="companyBillingAddress.vat_number">{{ companyBillingAddress.vat_number }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Appointments Table -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Terminhistorie ({{ appointments.length }})
              </h3>
              
              <!-- Filter Buttons -->
              <div class="flex space-x-2">
                <button
                  @click="appointmentFilter = 'all'"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'all' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  Alle
                </button>
                <button
                  @click="appointmentFilter = 'unpaid'"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'unpaid' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  Unbezahlt
                </button>
                <button
                  @click="appointmentFilter = 'paid'"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                >
                  Bezahlt
                </button>
              </div>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum & Zeit
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titel
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dauer
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zahlungsstatus
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="appointment in filteredAppointments" :key="appointment.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div class="font-medium">{{ formatDate(appointment.start_time) }}</div>
                      <div class="text-gray-500">{{ formatTime(appointment.start_time) }} - {{ formatTime(appointment.end_time) }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs truncate">{{ appointment.title }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ appointment.duration_minutes }}min
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusClass(appointment.status)">
                      {{ getStatusLabel(appointment.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div class="font-medium">{{ formatCurrency(calculateAppointmentAmount(appointment)) }}</div>
                      <div v-if="appointment.discount > 0" class="text-green-600 text-xs">
                        Rabatt: -{{ formatCurrency(appointment.discount) }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span v-if="appointment.is_paid" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      Bezahlt
                    </span>
                    <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                      Offen
                    </span>
                  </td>
                </tr>
                
                <!-- Empty State -->
                <tr v-if="filteredAppointments.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                      <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p class="text-lg font-medium text-gray-900 mb-2">Keine Termine gefunden</p>
                      <p class="text-gray-600">
                        {{ appointmentFilter !== 'all' ? 'Versuche einen anderen Filter.' : 'Noch keine Termine vorhanden.' }}
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'

// Types
interface UserDetails {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  preferred_payment_method: string | null
  default_company_billing_address_id: string | null
  is_active: boolean
}

interface Appointment {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  price_per_minute: number
  discount: number
  is_paid: boolean
  status: string
  type: string
}

interface CompanyBillingAddress {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  street: string
  street_number: string | null
  zip: string
  city: string
  vat_number: string | null
}

// Get route params and setup
const route = useRoute()
const supabase = getSupabase()
const userId = route.params.id as string

// Reactive state
const isLoading = ref(true)
const error = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
const appointments = ref<Appointment[]>([])
const companyBillingAddress = ref<CompanyBillingAddress | null>(null)
const appointmentFilter = ref<'all' | 'paid' | 'unpaid'>('all')

// Computed properties for display
const displayName = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  const firstName = userDetails.value.first_name || ''
  const lastName = userDetails.value.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unbekannt'
})

const displayEmail = computed(() => {
  return userDetails.value?.email || 'Keine E-Mail'
})

const emailLink = computed(() => {
  return `mailto:${userDetails.value?.email || ''}`
})

const phoneLink = computed(() => {
  return `tel:${userDetails.value?.phone || ''}`
})

const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    'client': 'Kunde',
    'staff': 'Fahrlehrer',
    'admin': 'Administrator'
  }
  return labels[userDetails.value?.role || ''] || 'Unbekannt'
})

const roleClass = computed(() => {
  const classes: Record<string, string> = {
    'client': 'bg-blue-100 text-blue-800',
    'staff': 'bg-green-100 text-green-800',
    'admin': 'bg-purple-100 text-purple-800'
  }
  return classes[userDetails.value?.role || ''] || 'bg-gray-100 text-gray-800'
})

const paymentMethodLabel = computed(() => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'twint': 'Twint',
    'stripe_card': 'Kreditkarte',
    'debit_card': 'Debitkarte'
  }
  return labels[userDetails.value?.preferred_payment_method || ''] || 'Nicht festgelegt'
})

const paymentMethodClass = computed(() => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'twint': 'bg-purple-100 text-purple-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-gray-100 text-gray-800'
  }
  return classes[userDetails.value?.preferred_payment_method || ''] || 'bg-gray-100 text-gray-800'
})

// Statistics computed properties
const totalAppointments = computed(() => appointments.value.length)
const paidAppointments = computed(() => appointments.value.filter(apt => apt.is_paid).length)
const unpaidAppointments = computed(() => appointments.value.filter(apt => !apt.is_paid).length)
const hasUnpaidAppointments = computed(() => unpaidAppointments.value > 0)
const hasCompanyBilling = computed(() => !!companyBillingAddress.value || !!(userDetails.value?.default_company_billing_address_id))

const totalUnpaidAmount = computed(() => {
  return appointments.value
    .filter(apt => !apt.is_paid)
    .reduce((sum, apt) => sum + calculateAppointmentAmount(apt), 0)
})

const formattedTotalUnpaidAmount = computed(() => {
  return formatCurrency(totalUnpaidAmount.value)
})

const filteredAppointments = computed(() => {
  switch (appointmentFilter.value) {
    case 'paid':
      return appointments.value.filter(apt => apt.is_paid)
    case 'unpaid':
      return appointments.value.filter(apt => !apt.is_paid)
    default:
      return appointments.value
  }
})

// Methods
const refreshData = async () => {
  await Promise.all([
    loadUserDetails(),
    loadUserAppointments(),
    loadCompanyBillingAddress()
  ])
}

const loadUserDetails = async () => {
  try {
    const { data, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        preferred_payment_method,
        default_company_billing_address_id,
        is_active
      `)
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(userError.message)
    }

    userDetails.value = data
    console.log('✅ User details loaded:', data)

  } catch (err: any) {
    console.error('❌ Error loading user details:', err.message)
    error.value = err.message
  }
}

const loadUserAppointments = async () => {
  try {
    const { data, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        price_per_minute,
        discount,
        is_paid,
        status,
        type
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (appointmentsError) {
      throw new Error(appointmentsError.message)
    }

    appointments.value = data || []
    console.log('✅ Appointments loaded:', data?.length)

  } catch (err: any) {
    console.error('❌ Error loading appointments:', err.message)
    // Don't set error here, appointments are optional
  }
}

const loadCompanyBillingAddress = async () => {
  const billingAddressId = userDetails.value?.default_company_billing_address_id
  
  if (!billingAddressId) {
    return
  }

  try {
    const { data, error: billingError } = await supabase
      .from('company_billing_addresses')
      .select(`
        id,
        company_name,
        contact_person,
        email,
        phone,
        street,
        street_number,
        zip,
        city,
        vat_number
      `)
      .eq('id', billingAddressId)
      .single()

    if (billingError) {
      console.warn('Warning loading billing address:', billingError.message)
      return
    }

    companyBillingAddress.value = data
    console.log('✅ Company billing address loaded:', data)

  } catch (err: any) {
    console.warn('Warning loading billing address:', err.message)
    // Don't set error, billing address is optional
  }
}

const calculateAppointmentAmount = (appointment: Appointment): number => {
  const baseAmount = (appointment.price_per_minute || 0) * (appointment.duration_minutes || 0)
  return Math.max(0, baseAmount - (appointment.discount || 0))
}

const sendPaymentReminder = async () => {
  if (!userDetails.value) return

  try {
    console.log('Sending payment reminder to:', userDetails.value.email)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const firstName = userDetails.value.first_name || 'Unbekannt'
    const lastName = userDetails.value.last_name || 'Unbekannt'
    alert(`Zahlungserinnerung an ${firstName} ${lastName} wurde gesendet.`)
    
  } catch (err: any) {
    console.error('❌ Error sending payment reminder:', err.message)
    alert('Fehler beim Senden der Zahlungserinnerung.')
  }
}

// Utility methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'confirmed': 'Bestätigt',
    'completed': 'Abgeschlossen',
    'cancelled': 'Abgesagt',
    'pending': 'Ausstehend'
  }
  return labels[status] || status
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'confirmed': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'pending': 'bg-yellow-100 text-yellow-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

// Lifecycle
onMounted(async () => {
  isLoading.value = true
  error.value = null

  try {
    await loadUserDetails()
    await Promise.all([
      loadUserAppointments(),
      loadCompanyBillingAddress()
    ])
  } catch (err: any) {
    console.error('❌ Error during initial load:', err)
    if (!error.value) {
      error.value = err.message
    }
  } finally {
    isLoading.value = false
  }
})
</script>