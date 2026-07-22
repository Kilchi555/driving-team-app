<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button -->
      <div class="mb-4 sm:mb-6">
        <NuxtLink 
          to="/admin/payment-overview" 
          class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          <span class="hidden sm:inline">Zurück zur Übersicht</span>
          <span class="sm:hidden">Zurück</span>
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !userDetails" class="bg-white shadow rounded-lg">
        <div class="px-4 sm:px-6 py-8 sm:py-12 text-center">
          <div class="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-green-600 mx-auto mb-4"/>
          <p class="text-sm sm:text-base text-gray-600">Benutzerdaten werden geladen...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white shadow rounded-lg">
        <div class="px-4 sm:px-6 py-8 sm:py-12 text-center">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          </div>
          <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-sm sm:text-base text-gray-600 mb-4">{{ error }}</p>
          <button 
            class="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            @click="refreshData"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        
        <!-- Sticky Selection Bar -->
        <div 
          v-if="selectedAppointments.length > 0"
          class="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm transition-all duration-200"
        >
          <div class="px-4 sm:px-6 py-3 sm:py-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div class="flex items-center space-x-2">
                  <span class="text-sm sm:text-base font-medium text-gray-700">
                    {{ selectedAppointments.length }} Termin{{ selectedAppointments.length > 1 ? 'e' : '' }} ausgewählt
                  </span>
                  <button
                    class="text-gray-400 hover:text-gray-600"
                    title="Auswahl aufheben"
                    @click="clearSelection"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                
                <div class="text-sm sm:text-base text-gray-600">
                  Gesamtbetrag: <span class="font-semibold text-green-600">{{ formatCurrency(selectedAppointmentsTotal) }}</span>
                </div>
              </div>
              
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  class="inline-flex items-center px-2 py-1 sm:px-3 sm:py-2 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  @click="showSelectedAppointmentsDetails = true"
                >
                  <svg class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span class="hidden sm:inline">Details</span>
                  <span class="sm:hidden">📋</span>
                </button>
                
                <!-- Aktionen basierend auf Filter -->
                <div v-if="appointmentFilter === 'deleted'">
                  <!-- Aktionen für gelöschte Termine -->
                  <button
                    :disabled="isUpdatingPayment"
                    class="mr-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    @click="restoreAllSelectedAppointments"
                  >
                    <svg v-if="isUpdatingPayment" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Alle wiederherstellen
                  </button>
                  
                  <button
                    :disabled="isUpdatingPayment"
                    class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    @click="hardDeleteAllSelectedAppointments"
                  >
                    <svg v-if="isUpdatingPayment" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Alle endgültig löschen
                  </button>
                </div>
                
                <div v-else-if="appointmentFilter === 'failed'">
                  <!-- Aktionen für fehlgeschlagene Zahlungen -->
                  <button
                    :disabled="isUpdatingPayment"
                    class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    @click="resendAllSelectedConfirmations"
                  >
                    <svg v-if="isUpdatingPayment" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Alle neu senden
                  </button>
                </div>
                
                <div v-else>
                  <!-- Aktionen für aktive Termine -->
                  <button
                    :disabled="isUpdatingPayment"
                    class="mr-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    @click="invoiceSelectedAppointments"
                  >

                    Verrechnen
                  </button>
                
                <button
                  :disabled="isUpdatingPayment"
                  class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  @click="markAllSelectedAsPaid"
                >

                  Als bezahlt markieren
                </button>
                </div>
              </div>
            </div>
            
            <!-- Selected Appointments List -->
            <div v-if="showSelectedAppointmentsDetails" class="mt-3 pt-3 border-t border-gray-200">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div 
                  v-for="appointmentId in selectedAppointments" 
                  :key="appointmentId"
                  class="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm"
                >
                  <div class="text-gray-700 min-w-0">
                    <div class="font-medium text-xs sm:text-sm truncate">{{ getAppointmentById(appointmentId)?.event_type_code ? getEventTypeLabel(getAppointmentById(appointmentId)?.event_type_code) : 'Lektion' }}</div>
                    <div class="text-xs text-gray-600 truncate">Mit {{ getAppointmentById(appointmentId)?.staff?.first_name || 'Unknown' }} • {{ getAppointmentById(appointmentId)?.type || 'N/A' }}</div>
                  </div>
                  <span class="text-gray-500">
                    {{ formatCurrency(calculateAppointmentAmount(getAppointmentById(appointmentId) || {} as Appointment)) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Selected Appointments Details Modal -->
        <div 
          v-if="showSelectedAppointmentsDetails"
          class="fixed inset-0 z-50 overflow-y-auto"
          @click="showSelectedAppointmentsDetails = false"
        >
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showSelectedAppointmentsDetails = false"/>
            
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Ausgewählte Termine Details
                    </h3>
                    
                    <div class="space-y-4">
                      <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-sm font-medium text-gray-700">
                            {{ selectedAppointments.length }} Termin{{ selectedAppointments.length > 1 ? 'e' : '' }} ausgewählt
                          </span>
                          <span class="text-sm font-semibold text-green-600">
                            Gesamtbetrag: {{ formatCurrency(selectedAppointmentsTotal) }}
                          </span>
                        </div>
                      </div>
                      
                      <div class="max-h-96 overflow-y-auto">
                        <div class="space-y-3">
                          <div 
                            v-for="appointmentId in selectedAppointments" 
                            :key="appointmentId"
                            class="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div class="flex-1 min-w-0">
                                <h4 class="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                  {{ getAppointmentById(appointmentId)?.event_type_code ? getEventTypeLabel(getAppointmentById(appointmentId)?.event_type_code) : 'Lektion' }}
                                </h4>
                                <div class="mt-1 text-xs sm:text-sm text-gray-500 space-y-0.5">
                                  <div class="truncate">Mit {{ getAppointmentById(appointmentId)?.staff?.first_name || 'Unknown' }} • {{ getAppointmentById(appointmentId)?.type || 'N/A' }}</div>
                                  <div class="truncate">{{ formatDate(getAppointmentById(appointmentId)?.start_time) }} - {{ formatTime(getAppointmentById(appointmentId)?.start_time) }}</div>
                                  <div>{{ getAppointmentById(appointmentId)?.duration_minutes }}min</div>
                                </div>
                              </div>
                                                              <div class="text-right">
                                  <div class="text-sm font-semibold text-green-600">
                                    {{ formatCurrency(calculateAppointmentAmount(getAppointmentById(appointmentId) || {} as Appointment)) }}
                                  </div>
                                  <div class="text-xs text-gray-500">
                                    {{ getAppointmentById(appointmentId)?.is_paid ? 'Bezahlt' : 'Offen' }}
                                  </div>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  :disabled="isUpdatingPayment"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  @click="invoiceSelectedAppointments"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Verrechnen
                </button>
                
                <button
                  type="button"
                  :disabled="isUpdatingPayment"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                  @click="markAllSelectedAsPaid"
                >
                  <svg v-if="isUpdatingPayment" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Alle als bezahlt markieren
                </button>
                
                <button
                  type="button"
                  class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  @click="showSelectedAppointmentsDetails = false"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Invoice Modal -->
        <Teleport to="body">
          <div
            v-if="showInvoiceModal"
            class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4"
            style="padding-bottom: max(8px, env(safe-area-inset-bottom, 8px)); padding-top: max(8px, env(safe-area-inset-top, 8px));"
            @click.self="closeInvoiceModal"
          >
            <div class="bg-white w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl">

              <div class="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" :style="{ background: primaryGradient }">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-base font-bold text-gray-900 leading-tight">Rechnung erstellen</h2>
                    <p class="text-xs text-gray-400 truncate">{{ selectedAppointments.length }} Termin{{ selectedAppointments.length > 1 ? 'e' : '' }} · {{ formatCurrency(selectedAppointmentsTotal) }}</p>
                  </div>
                </div>
                <button type="button" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0" @click="closeInvoiceModal">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
                    <div class="space-y-4">
                      <div class="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div class="px-4 py-3 flex items-center justify-between gap-3" :style="{ background: primaryGradient }">
                          <p class="text-xs font-semibold uppercase tracking-wider text-white/80">Gesamtbetrag</p>
                          <p class="text-xl font-black text-white">{{ formatCurrency(selectedAppointmentsTotal) }}</p>
                        </div>
                        <div class="max-h-48 overflow-y-auto divide-y divide-gray-100">
                          <div
                            v-for="appointmentId in selectedAppointments"
                            :key="appointmentId"
                            class="px-4 py-3 flex items-start justify-between gap-3"
                          >
                            <div class="min-w-0 flex-1">
                              <p class="text-sm font-medium text-gray-900 truncate">
                                {{ getAppointmentById(appointmentId)?.event_type_code ? getEventTypeLabel(getAppointmentById(appointmentId)?.event_type_code) : 'Lektion' }}
                              </p>
                              <p class="text-xs text-gray-500 truncate">
                                {{ formatDate(getAppointmentById(appointmentId)?.start_time) }} · {{ getAppointmentById(appointmentId)?.duration_minutes }} Min.
                              </p>
                            </div>
                            <p class="text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {{ formatCurrency(calculateAppointmentAmount(getAppointmentById(appointmentId) || {} as Appointment)) }}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div class="rounded-xl border border-gray-200 p-4 space-y-3">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p class="text-xs font-bold uppercase tracking-wider text-gray-400">Rechnungsadresse</p>
                          <div class="flex items-center gap-2 self-start sm:self-auto">
                            <span class="text-xs font-medium whitespace-nowrap" :class="useCustomBillingAddress ? 'text-gray-400' : 'text-gray-800'">Gespeichert</span>
                            <button
                              type="button"
                              @click="useCustomBillingAddress = !useCustomBillingAddress"
                              :class="[
                                'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                                useCustomBillingAddress ? '' : 'bg-gray-300'
                              ]"
                              :style="useCustomBillingAddress ? { background: primaryColor } : undefined"
                            >
                              <span
                                :class="[
                                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                  useCustomBillingAddress ? 'translate-x-6' : 'translate-x-1'
                                ]"
                              />
                            </button>
                            <span class="text-xs font-medium whitespace-nowrap" :class="useCustomBillingAddress ? 'text-gray-800' : 'text-gray-400'">Abweichend</span>
                          </div>
                        </div>
                        
                        <div v-if="!useCustomBillingAddress" class="space-y-1 text-sm text-gray-700">
                          <template v-if="companyBillingAddress">
                            <p v-if="companyBillingAddress.company_name" class="font-semibold">{{ companyBillingAddress.company_name }}</p>
                            <p>{{ companyBillingAddress.contact_person }}</p>
                            <p>{{ companyBillingAddress.street }} {{ companyBillingAddress.street_number || '' }}</p>
                            <p>{{ companyBillingAddress.zip }} {{ companyBillingAddress.city }}</p>
                            <p class="text-xs break-all" :style="{ color: primaryColor }">{{ companyBillingAddress.email }}</p>
                            <a v-if="companyBillingAddress.phone" :href="`tel:${companyBillingAddress.phone}`" class="text-xs" :style="{ color: primaryColor }">{{ companyBillingAddress.phone }}</a>
                          </template>
                          <template v-else>
                            <p class="text-gray-500">Keine Firmenadresse hinterlegt.</p>
                            <p class="text-xs text-gray-500">Rechnung geht an <span class="font-medium">{{ displayEmail }}</span></p>
                          </template>
                        </div>
                        
                        <div v-else class="space-y-3">
                          <input v-model="customBillingCompanyName" type="text" placeholder="Firmenname (optional)" class="invoice-modal-input w-full" />
                          <input v-model="customBillingContactPerson" type="text" placeholder="Kontaktperson *" class="invoice-modal-input w-full" />
                          <input v-model="customBillingEmail" type="email" placeholder="E-Mail *" class="invoice-modal-input w-full" />
                        </div>
                      </div>
                      
                      <div class="rounded-xl border border-gray-200 p-4 space-y-3">
                        <p class="text-xs font-bold uppercase tracking-wider text-gray-400">E-Mail-Versand</p>
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">Empfänger</label>
                          <input
                            v-model="invoiceEmail"
                            type="email"
                            class="invoice-modal-input w-full"
                            :placeholder="resolvedInvoiceEmail || 'email@beispiel.ch'"
                          >
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">Betreff (optional)</label>
                          <input v-model="invoiceSubject" type="text" class="invoice-modal-input w-full" placeholder="Rechnung für Fahrstunden" />
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-500 mb-1">Nachricht (optional)</label>
                          <textarea v-model="invoiceMessage" rows="3" class="invoice-modal-input w-full resize-none" placeholder="Ihre Nachricht…" />
                        </div>
                      </div>
                    </div>
              </div>

              <div class="flex-none border-t border-gray-100 px-4 sm:px-5 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  class="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  :disabled="isCreatingInvoice"
                  @click="closeInvoiceModal"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  class="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  :style="{ borderColor: primaryColor, color: primaryColor }"
                  :disabled="isCreatingInvoice"
                  @click="createInvoiceAndOpenPdf"
                >
                  <svg v-if="invoiceAction === 'pdf'" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {{ invoiceAction === 'pdf' ? 'Erstellt PDF…' : 'PDF öffnen' }}
                </button>
                <button
                  type="button"
                  class="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  :style="{ background: primaryGradient }"
                  :disabled="isCreatingInvoice"
                  @click="sendDirectEmail"
                >
                  <svg v-if="invoiceAction === 'email'" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {{ invoiceAction === 'email' ? 'Wird gesendet…' : 'Per E-Mail senden' }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>
        
        <!-- User Header -->
        <div class="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <!-- Avatar + name + role + contact -->
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" :class="avatarBgClass">
                {{ (displayName || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-base font-semibold text-gray-900 truncate">{{ displayName }}</p>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0" :class="roleClass">{{ roleLabel }}</span>
                </div>
                <div class="mt-0.5 flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <a :href="emailLink" class="hover:text-blue-600 truncate max-w-[240px]">{{ displayEmail }}</a>
                  <a v-if="userDetails?.phone" :href="phoneLink" class="hover:text-blue-600 flex-shrink-0">{{ userDetails.phone }}</a>
                </div>
              </div>
            </div>

            <!-- Payment method + company billing -->
            <div class="flex items-center gap-2 flex-wrap flex-shrink-0">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="paymentMethodClass">
                {{ paymentMethodLabel }}
              </span>
              <span v-if="hasCompanyBilling" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/></svg>
                Firmenrechnung
              </span>
            </div>
          </div>

          <!-- Stats -->
          <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"/>
              {{ totalAppointments }} Termine
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
              {{ paidAppointments }} bezahlt
            </span>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" :class="unpaidAppointments > 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'">
              <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="unpaidAppointments > 0 ? 'bg-red-400' : 'bg-gray-300'"/>
              {{ unpaidAppointments }} offen
            </span>
            <span v-if="totalUnpaidAmountRaw > 0" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
              {{ formattedTotalUnpaidAmount }} offen
            </span>
            <span v-if="creditBalance !== 0" class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
              {{ formattedCreditBalance }} Guthaben
            </span>
          </div>

          <!-- Company billing address -->
          <div v-if="companyBillingAddress" class="mt-4 pt-4 border-t border-gray-100">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Firmenrechnung</p>
            <div class="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
              <span class="font-medium text-gray-800">{{ companyBillingAddress.company_name }}</span>
              <span>{{ companyBillingAddress.contact_person }}</span>
              <span>{{ companyBillingAddress.street }} {{ companyBillingAddress.street_number || '' }}, {{ companyBillingAddress.zip }} {{ companyBillingAddress.city }}</span>
              <a :href="`mailto:${companyBillingAddress.email}`" class="text-blue-600 hover:underline">{{ companyBillingAddress.email }}</a>
              <a v-if="companyBillingAddress.phone" :href="`tel:${companyBillingAddress.phone}`" class="text-blue-600 hover:underline">{{ companyBillingAddress.phone }}</a>
              <span v-if="companyBillingAddress.vat_number" class="text-gray-400">MwSt: {{ companyBillingAddress.vat_number }}</span>
            </div>
          </div>
        </div>
        <!-- Appointments Table -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-4 sm:px-6 py-4 border-b border-gray-200">
            <!-- Header: title stacks above filters on mobile -->
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Terminhistorie ({{ appointments.length }})
              </h3>
              <!-- Filter Buttons — wrap on mobile -->
              <div class="flex flex-wrap gap-1.5">
                <button
                  :class="['px-3 py-1 text-xs sm:text-sm rounded-full font-medium transition-colors', appointmentFilter === 'all' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
                  @click="appointmentFilter = 'all'"
                >Alle ({{ totalAppointments }})</button>
                <button
                  :class="['px-3 py-1 text-xs sm:text-sm rounded-full font-medium transition-colors', appointmentFilter === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
                  @click="appointmentFilter = 'paid'"
                >Bezahlt ({{ paidAppointments }})</button>
                <button
                  :class="['px-3 py-1 text-xs sm:text-sm rounded-full font-medium transition-colors', appointmentFilter === 'unpaid' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
                  @click="appointmentFilter = 'unpaid'"
                >Unbezahlt ({{ unpaidAppointments }})</button>
                <button
                  v-if="failedAppointments > 0"
                  :class="['px-3 py-1 text-xs sm:text-sm rounded-full font-medium transition-colors', appointmentFilter === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
                  @click="appointmentFilter = 'failed'"
                >❌ Fehlgeschlagen ({{ failedAppointments }})</button>
                <button
                  :class="['px-3 py-1 text-xs sm:text-sm rounded-full font-medium transition-colors', appointmentFilter === 'deleted' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200']"
                  @click="appointmentFilter = 'deleted'"
                >🗑️ Gelöscht ({{ deletedAppointments }})</button>
              </div>
            </div>
          </div>

          <!-- Mobile card list (hidden on sm+) -->
          <ul class="divide-y divide-gray-100 sm:hidden">
            <li
              v-for="appointment in filteredAppointments" :key="'m-' + appointment.id"
              :class="['px-4 py-3 flex gap-3', appointment.is_paid ? 'bg-green-50' : 'bg-white', isAppointmentSelectable(appointment) ? 'cursor-pointer active:bg-gray-50' : 'opacity-60']"
              @click="(appointmentFilter === 'deleted' || appointmentFilter === 'failed' || !appointment.is_paid) && isAppointmentSelectable(appointment) && toggleAppointmentSelection(appointment.id)"
            >
              <!-- Checkbox -->
              <div class="pt-0.5 flex-shrink-0">
                <input
                  v-if="(appointmentFilter === 'deleted' || appointmentFilter === 'failed' || !appointment.is_paid) && isAppointmentSelectable(appointment)"
                  type="checkbox"
                  :checked="selectedAppointments.includes(appointment.id)"
                  class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  @change="toggleAppointmentSelection(appointment.id)"
                  @click.stop
                >
              </div>
              <!-- Content -->
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-semibold text-gray-900 leading-tight">
                      {{ appointment.event_type_code ? getEventTypeLabel(appointment.event_type_code) : 'Lektion' }}
                    </p>
                    <p class="text-xs text-gray-500">Mit {{ appointment.staff?.first_name || '—' }} · {{ appointment.duration_minutes }}min</p>
                  </div>
                  <p class="text-sm font-semibold text-gray-900 whitespace-nowrap">{{ formatCurrency(calculateAppointmentAmount(appointment)) }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs text-gray-500">{{ formatDate(appointment.start_time) }}, {{ formatTime(appointment.start_time) }}</span>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="getStatusClass(appointment.status)">{{ getStatusLabel(appointment.status) }}</span>
                  <span v-if="appointment.payment_method" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="getPaymentMethodClass(appointment.payment_method)">{{ getPaymentMethodLabel(appointment.payment_method) }}</span>
                </div>
                <p v-if="appointment.deleted_at" class="text-xs text-red-600 font-medium">Gelöscht: {{ formatPaymentDateTime(appointment.deleted_at) }}</p>
              </div>
            </li>
            <li v-if="filteredAppointments.length === 0" class="px-4 py-8 text-center text-sm text-gray-400">Keine Einträge</li>
          </ul>

          <!-- Desktop table (hidden below sm) -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      v-if="hasUnpaidAppointments"
                      type="checkbox"
                      :checked="areAllAppointmentsSelected"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      @change="toggleAllAppointments"
                    >
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum & Zeit</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Termin</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dauer</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zahlungsmethode</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Betrag</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zahlungsstatus</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
v-for="appointment in filteredAppointments" :key="appointment.id" 
                    :class="[
                      'hover:bg-gray-50',
                      appointment.is_paid ? 'bg-green-50' : 'bg-white',
                      isAppointmentSelectable(appointment) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    ]"
                    @click="(appointmentFilter === 'deleted' || appointmentFilter === 'failed' || !appointment.is_paid) && isAppointmentSelectable(appointment) && toggleAppointmentSelection(appointment.id)">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <input
                      v-if="(appointmentFilter === 'deleted' || appointmentFilter === 'failed' || !appointment.is_paid) && isAppointmentSelectable(appointment)"
                      type="checkbox"
                      :checked="selectedAppointments.includes(appointment.id)"
                      class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      @change="toggleAppointmentSelection(appointment.id)"
                      @click.stop
                    >
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div class="font-medium">{{ formatDate(appointment.start_time) }}</div>
                      <div class="text-gray-500">{{ formatTime(appointment.start_time) }} - {{ formatTime(appointment.end_time) }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    <div class="max-w-xs">
                      <div class="truncate font-medium">{{ appointment.event_type_code ? getEventTypeLabel(appointment.event_type_code) : 'Lektion' }}</div>
                      <div class="text-xs text-gray-600 truncate">Mit {{ appointment.staff?.first_name || 'Unknown' }} • {{ appointment.type || 'N/A' }}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ appointment.duration_minutes }}min
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="getStatusClass(appointment.status)">
                        {{ getStatusLabel(appointment.status) }}
                      </span>
                      
                      <!-- Updated at (only if NOT deleted) -->
                      <span 
                        v-if="appointment.updated_at && !appointment.deleted_at" 
                        class="text-xs text-gray-500 mt-1 block"
                      >
                        Aktualisiert: {{ formatPaymentDateTime(appointment.updated_at) }}
                      </span>
                      
                      <!-- Deleted at (takes priority if it exists) -->
                      <span 
                        v-if="appointment.deleted_at" 
                        class="text-xs text-red-600 font-medium mt-0.5 block"
                      >
                        Gelöscht: {{ formatPaymentDateTime(appointment.deleted_at) }}
                      </span>
                    </div>
                  </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
v-if="appointment.payment_method" 
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              :class="getPaymentMethodClass(appointment.payment_method)">
                          {{ getPaymentMethodLabel(appointment.payment_method) }}
                        </span>
                        <span v-else class="text-gray-400 text-sm">
                          Nicht festgelegt
                        </span>
                      </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div class="font-medium">{{ formatCurrency(calculateAppointmentAmount(appointment)) }}</div>
                      
                      <!-- Detaillierte Preisaufschlüsselung direkt in der Tabelle -->
                      <div v-if="hasPriceDetails(appointment)" class="mt-2 space-y-1">
                        <!-- Lektion-Preis -->
                        <div
v-if="(appointment.lesson_price || 0) > 0" 
                             class="flex justify-between text-xs text-gray-600">
                          <span>Lektion:</span>
                          <span>{{ formatCurrency(appointment.lesson_price || 0) }}</span>
                        </div>
                        
                        <!-- Admin-Fee -->
                        <div
v-if="(appointment.admin_fee || 0) > 0" 
                             class="flex justify-between text-xs text-gray-600">
                          <span>Admin-Pauschale:</span>
                          <span>{{ formatCurrency(appointment.admin_fee || 0) }}</span>
                        </div>
                        
                        <!-- Produkte -->
                        <div
v-if="appointment.products && appointment.products.length > 0" 
                             class="space-y-1">
                          <div
v-for="product in appointment.products" :key="product?.name || 'unknown'" 
                               class="flex justify-between text-xs text-gray-600">
                            <span>{{ product?.name || 'Unbekanntes Produkt' }}</span>
                            <span>{{ formatCurrency(product?.price || 0) }}</span>
                          </div>
                        </div>
                        
                        <!-- Rabatte -->
                        <div
v-if="(appointment.discount_amount || 0) > 0" 
                             class="flex justify-between text-xs text-green-600">
                          <span>Rabatt:</span>
                          <span>-{{ formatCurrency(appointment.discount_amount || 0) }}</span>
                        </div>
                        
                        <!-- Credit Used -->
                        <div
v-if="(appointment.credit_used || 0) > 0" 
                             class="flex justify-between text-xs text-purple-600 font-medium pt-1 border-t border-gray-200">
                          <span>Guthaben verwendet:</span>
                          <span>-{{ formatCurrency(appointment.credit_used || 0) }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <!-- Einheitlicher Badge: payment_status hat Priorität, sonst is_paid -->
                    <div class="flex flex-col space-y-1">
                      <span
                        v-if="appointment.payment_status"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit"
                        :class="[
                          appointment.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          appointment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          appointment.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        ]"
                      >
                        <svg 
                          v-if="appointment.payment_status === 'completed'" 
                          class="w-3 h-3 mr-1" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        <svg 
                          v-else-if="appointment.payment_status === 'pending' || appointment.payment_status === 'failed'" 
                          class="w-3 h-3 mr-1" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                        {{
                          appointment.payment_status === 'completed' ? 'Bezahlt' :
                          appointment.payment_status === 'pending' ? 'Ausstehend' :
                          appointment.payment_status === 'failed' ? 'Fehlgeschlagen' :
                          appointment.payment_status
                        }}
                      </span>
                      <!-- Fallback auf is_paid wenn kein payment_status vorhanden -->
                      <span 
                        v-else-if="appointment.is_paid" 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 w-fit"
                      >
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                        Bezahlt
                    </span>
                    <span 
                      v-else 
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                    >
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      Offen
                    </span>
                    
                    <!-- Payment date/time for all statuses with timestamps -->
                    <span 
                      v-if="getPaymentStatusTimestamp(appointment)" 
                      class="text-xs text-gray-600 mt-1 block"
                    >
                      {{ appointment.payment_status === 'pending' ? 'seit' : 'am' }} {{ formatPaymentDateTime(getPaymentStatusTimestamp(appointment)) }}
                    </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="flex space-x-2">
                      
                      <!-- Aktionen basierend auf Filter und Status -->
                      <template v-if="appointmentFilter === 'deleted'">
                        <!-- Wiederherstellen Button für gelöschte Termine -->
                        <button
                          :disabled="isUpdatingPayment"
                          class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          title="Termin wiederherstellen"
                          @click="restoreAppointment(appointment)"
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                          Wiederherstellen
                        </button>
                        
                        <!-- Endgültig löschen Button -->
                        <button
                          :disabled="isUpdatingPayment"
                          class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                          title="Termin endgültig löschen"
                          @click="hardDeleteAppointment(appointment)"
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                          Endgültig löschen
                        </button>
                      </template>
                      
                      <template v-else>
                        <!-- Dynamischer Button basierend auf Filter und Zahlungsstatus -->
                        <!-- Hidden for 'verrechnet' (invoiced) - shown via Invoice Actions instead -->
                        <button
                          v-if="appointment.status !== 'verrechnet'"
                          :disabled="isUpdatingPayment"
                          :class="getButtonClass(appointment)"
                          :title="getButtonTitle(appointment)"
                          @click="getButtonAction(appointment)"
                        >
                          <svg v-if="appointment.is_paid" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                          <svg v-else class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                          {{ getButtonText(appointment) }}
                        </button>
                        
                        <!-- Convert to Online Payment Button (for cash/invoice payments) -->
                        <!-- Hidden for 'verrechnet' - use Invoice Actions instead -->
                        <button
                          v-if="appointment.payment_status === 'pending' && appointment.payment_method !== 'wallee' && appointment.status !== 'verrechnet'"
                          :disabled="isConvertingToOnline"
                          class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          title="Zu Online-Zahlung konvertieren"
                          @click="convertAppointmentToOnline(appointment)"
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h10m4 0a1 1 0 11-2 0 1 1 0 012 0z"/>
                          </svg>
                          Online
                        </button>
                        
                        <!-- Invoice Actions (for invoiced/settled payments) -->
                        <button
                          v-if="appointment.status === 'verrechnet'"
                          class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          title="Rechnung Optionen"
                          @click.stop="toggleInvoiceMenuWithPosition(appointment.id, $event)"
                        >
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2"/>
                          </svg>
                          Optionen
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
                
                <!-- Empty State -->
                <tr v-if="filteredAppointments.length === 0">
                  <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                      <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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
          <!-- /Desktop table -->
        </div>
      </div>
    </div>
    
    <!-- Toast Component -->
    <Toast
      :show="showToast"
      :type="toastType"
      :title="toastTitle"
      :message="toastMessage"
      @close="closeToast"
    />
    
    <!-- Confirmation Modal -->
    <div 
      v-if="showConfirmModal"
      class="fixed inset-0 z-50 overflow-y-auto"
    >
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="cancelAction"/>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full mx-4 sm:mx-0 sm:my-8 sm:align-middle sm:max-w-lg">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex flex-col sm:flex-row sm:items-start">
              <div class="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mx-auto sm:mx-0">
                <svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">
                  {{ confirmTitle }}
                </h3>
                <p class="text-sm text-gray-500 break-words">
                  {{ confirmMessage }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse gap-2 sm:flex-row-reverse sm:gap-0">
            <button
              type="button"
              class="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors sm:ml-3"
              @click="executeConfirmAction"
            >
              {{ confirmLabel || 'Bestätigen' }}
            </button>
            <button
              type="button"
              class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              @click="cancelAction"
            >
              {{ cancelLabel || 'Abbrechen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    

  </div>

  <!-- Global Invoice Options Dropdown - rendered outside table to avoid overflow clipping -->
  <div
    v-if="openInvoiceMenu"
    class="fixed inset-0 z-[9998]"
    @click="openInvoiceMenu = null"
  />
  
  <div
    v-if="openInvoiceMenu"
    class="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] w-48"
    :style="{
      top: invoiceMenuPosition?.top ? invoiceMenuPosition.top + 'px' : '100px',
      right: invoiceMenuPosition?.right ? invoiceMenuPosition.right + 'px' : '20px'
    }"
  >
    <!-- Find the current appointment from openInvoiceMenu id -->
    <template v-if="appointments.find(a => a.id === openInvoiceMenu) as any as typeof currentInvoiceAppointment">
      <button
        class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 border-b border-gray-200 flex items-center"
        @click.stop="downloadInvoice(appointments.find(a => a.id === openInvoiceMenu)!)"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Herunterladen
      </button>
      <button
        class="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 border-b border-gray-200 flex items-center"
        @click.stop="resendInvoice(appointments.find(a => a.id === openInvoiceMenu)!)"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        Erneut senden
      </button>
      <button
        class="w-full text-left px-4 py-2 text-xs text-green-700 hover:bg-green-50 border-b border-gray-200 flex items-center font-semibold"
        @click.stop="markInvoicedAsPaid(appointments.find(a => a.id === openInvoiceMenu)!)"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Als bezahlt markieren
      </button>
      <button
        class="w-full text-left px-4 py-2 text-xs text-blue-700 hover:bg-blue-50 border-b border-gray-200 flex items-center"
        @click.stop="switchToCash(appointments.find(a => a.id === openInvoiceMenu)!)"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Zu Bar bezahlt
      </button>
      <button
        class="w-full text-left px-4 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center"
        @click.stop="switchToOnlinePayment(appointments.find(a => a.id === openInvoiceMenu)!)"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h10m4 0a1 1 0 11-2 0 1 1 0 012 0z"/>
        </svg>
        Zu Online-Zahlung
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { useRoute } from '#app'
import { useInvoices } from '~/composables/useInvoices'
import { useTenantBranding } from '~/composables/useTenantBranding'
import Toast from '~/components/Toast.vue'
import { logger } from '~/utils/logger'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

const authStore = useAuthStore()
const supabase = getSupabase()
const {
  primaryColor: brandingPrimaryColor,
  brandName,
  invoiceIntroText,
  invoicePaymentTerms,
  invoiceFooterText,
  defaultVatRate,
} = useTenantBranding()
const primaryColor = computed(() => brandingPrimaryColor.value || '#1E40AF')
const primaryGradient = computed(() => {
  const hex = primaryColor.value.replace('#', '')
  const num = parseInt(hex, 16)
  if (Number.isNaN(num)) return primaryColor.value
  const r = Math.max(0, Math.min(255, (num >> 16) + 40))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + 40))
  const b = Math.max(0, Math.min(255, (num & 0xff) + 40))
  const end = '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
  return `linear-gradient(135deg, ${primaryColor.value} 0%, ${end} 100%)`
})

// Secure helper: all payment/appointment write operations go through server API
const paymentOp = async (action: string, params: Record<string, any> = {}) => {
  const response = await $fetch('/api/admin/payment-operations', {
    method: 'POST',
    body: { action, ...params }
  }) as any
  if (!response?.success) throw new Error(response?.statusMessage || 'Operation failed')
  return response
}

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
  is_paid: boolean
  status: string
  type: string
  payment_status?: string // ✅ Wichtig für Failed Payments Filter!
  payment_method?: string
  payment_method_name?: string
  total_amount?: number
  paid_at?: string
  refunded_at?: string
  created_at?: string
  updated_at?: string
  scheduled_authorization_date?: string
  deleted_at?: string | null
  // Neue Felder für Produkte und Rabatte
  has_products?: boolean
  has_discounts?: boolean
  products?: Array<{
    name: string
    price: number
    quantity: number
    total_price?: number
  }>
  discounts?: Array<{
    name: string
    amount: number
    type: 'percentage' | 'fixed'
    total_amount?: number
  }>
  // Preis-Details aus der Datenbank
  lesson_price?: number
  admin_fee?: number
  products_price?: number
  discount_amount?: number
  credit_used?: number
  // Zahlungsstatus aus payments
  payment_status?: string
  // Neue Felder für Titel-Anzeige
  event_type_code?: string
  staff_id?: string
  staff?: {
    first_name?: string
    last_name?: string
  }
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

interface Payment {
  id: string
  appointment_id: string
  user_id: string
  payment_status: string
  payment_method: string
  total_amount_rappen: number
  lesson_price_rappen?: number
  admin_fee_rappen?: number
  products_price_rappen?: number
  discount_amount_rappen?: number
  credit_used_rappen?: number
  paid_at?: string
  refunded_at?: string
  created_at?: string
  updated_at?: string
  scheduled_authorization_date?: string
}

interface InvoiceData {
  id: string
  invoice_number: string
}

interface PDFResult {
  success: boolean
  pdfUrl?: string
  error?: string
}

// Get route params and setup
const route = useRoute()
const userId = route.params.id as string

// Reactive state
const isLoading = ref(true)
const error = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
const studentCredit = ref<any>(null)
const appointments = ref<Appointment[]>([])
const companyBillingAddress = ref<CompanyBillingAddress | null>(null)
const appointmentFilter = ref<'all' | 'paid' | 'unpaid' | 'failed' | 'deleted'>('all')
const isUpdatingPayment = ref(false)
const isConvertingToOnline = ref(false)
const openInvoiceMenu = ref<string | null>(null)
const invoiceMenuPosition = ref<{ top: number; right: number } | null>(null)
const selectedAppointments = ref<string[]>([])
const showSelectedAppointmentsDetails = ref(false)
const showInvoiceModal = ref(false)
const isCreatingInvoice = ref(false)
const invoiceAction = ref<'email' | 'pdf' | null>(null)
const eventTypes = ref<any[]>([])

const invoiceEmail = ref('')
const invoiceSubject = ref('')
const invoiceMessage = ref('')
const useCustomBillingAddress = ref(false)
const customBillingCompanyName = ref('')
const customBillingContactPerson = ref('')
const customBillingEmail = ref('')

// Toast State
const showToast = ref(false)
const toastType = ref('success')
const toastTitle = ref('')
const toastMessage = ref('')

// Confirmation Modal State
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmAction = ref<(() => void) | null>(null)
const confirmLabel = ref('')
const cancelLabel = ref('')

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

const resolvedInvoiceEmail = computed(() => {
  if (invoiceEmail.value) return invoiceEmail.value
  if (useCustomBillingAddress.value && customBillingEmail.value) return customBillingEmail.value
  if (companyBillingAddress.value?.email) return companyBillingAddress.value.email
  return userDetails.value?.email || ''
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
    'client': 'bg-blue-50 text-blue-700',
    'staff': 'bg-emerald-50 text-emerald-700',
    'admin': 'bg-purple-50 text-purple-700'
  }
  return classes[userDetails.value?.role || ''] || 'bg-gray-100 text-gray-600'
})

const avatarBgClass = computed(() => {
  const classes: Record<string, string> = {
    'client': 'bg-blue-500',
    'staff': 'bg-emerald-500',
    'admin': 'bg-purple-500'
  }
  return classes[userDetails.value?.role || ''] || 'bg-gray-400'
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
    'cash': 'bg-amber-50 text-amber-700',
    'invoice': 'bg-blue-50 text-blue-700',
    'twint': 'bg-purple-50 text-purple-700',
    'stripe_card': 'bg-emerald-50 text-emerald-700',
    'debit_card': 'bg-gray-100 text-gray-600'
  }
  return classes[userDetails.value?.preferred_payment_method || ''] || 'bg-gray-100 text-gray-600'
})

// Statistics computed properties
const totalAppointments = computed(() => appointments.value.filter(apt => !apt.deleted_at).length)
const paidAppointments = computed(() => appointments.value.filter(apt => apt.is_paid && !apt.deleted_at).length)
const unpaidAppointments = computed(() => appointments.value.filter(apt => !apt.is_paid && apt.payment_status !== 'failed' && !apt.deleted_at).length)
const failedAppointments = computed(() => {
  const failed = appointments.value.filter(apt => apt.payment_status === 'failed' && !apt.deleted_at)
  logger.debug('🔴 DEBUG failedAppointments computed:', {
    totalAppointments: appointments.value.length,
    failedCount: failed.length,
    failedIds: failed.map(f => ({ id: f.id, status: f.payment_status, title: f.title }))
  })
  return failed.length
})
const deletedAppointments = computed(() => appointments.value.filter(apt => !!apt.deleted_at).length)
const hasUnpaidAppointments = computed(() => unpaidAppointments.value > 0)
const hasCompanyBilling = computed(() => !!companyBillingAddress.value || !!(userDetails.value?.default_company_billing_address_id))

// Selection computed properties
const areAllAppointmentsSelected = computed(() => {
  const selectableAppointments = filteredAppointments.value.filter(apt => apt.status !== 'verrechnet' && apt.status !== 'paid')
  return selectableAppointments.length > 0 && selectedAppointments.value.length === selectableAppointments.length
})

const selectedAppointmentsTotal = computed(() => {
  return selectedAppointments.value.reduce((total, appointmentId) => {
    const appointment = getAppointmentById(appointmentId)
    if (!appointment) return total
    return total + calculateAppointmentAmount(appointment)
  }, 0)
})

// Prüfen ob ein Termin auswählbar ist
const isAppointmentSelectable = (appointment: Appointment) => {
  // Appointments are selectable EXCEPT when:
  // 1. They're marked as verrechnet/paid in appointment status
  // 2. OR they have a payment_status that's already completed/invoiced
  // But we still want invoice action buttons visible for invoiced payments!
  const hasInvoicedPayment = appointment.payment_status === 'invoiced'
  const isNotSelectableByStatus = appointment.status === 'verrechnet' || appointment.status === 'paid'
  
  // If it's invoiced, it's still selectable for actions, just not for checkboxes
  return hasInvoicedPayment || !isNotSelectableByStatus
}

const totalUnpaidAmount = computed(() => {
  return appointments.value
    .filter(apt => !apt.is_paid && !apt.deleted_at)
    .reduce((sum, apt) => sum + calculateAppointmentAmount(apt), 0)
})

const totalUnpaidAmountRaw = totalUnpaidAmount

const formattedTotalUnpaidAmount = computed(() => {
  return formatCurrency(totalUnpaidAmount.value)
})

const creditBalance = computed(() => studentCredit.value?.balance_rappen || 0)

const formattedCreditBalance = computed(() => {
  if (!studentCredit.value) return formatCurrency(0)
  return formatCurrency(studentCredit.value.balance_rappen || 0)
})

const filteredAppointments = computed(() => {
  switch (appointmentFilter.value) {
    case 'paid':
      return appointments.value.filter(apt => apt.is_paid && !apt.deleted_at)
    case 'unpaid':
      return appointments.value.filter(apt => !apt.is_paid && apt.payment_status !== 'failed' && !apt.deleted_at)
    case 'failed':
      return appointments.value.filter(apt => apt.payment_status === 'failed' && !apt.deleted_at)
    case 'deleted':
      return appointments.value.filter(apt => apt.deleted_at)
    default:
      return appointments.value.filter(apt => !apt.deleted_at)
  }
})

// Methods
const loadEventTypes = async (_tenantId: string) => {
  // Event types are already loaded via loadUserDetails() from the API
  // This function is kept for compatibility but does nothing
}

const getEventTypeLabel = (code?: string): string => {
  if (!code) return 'Unbekannt'
  const eventType = eventTypes.value.find(et => et.code === code)
  return eventType?.name || code
}

const refreshData = async () => {
  await Promise.all([
    loadUserDetails(),
    loadUserAppointments()
  ])
}

const closeInvoiceModal = () => {
  showInvoiceModal.value = false
}

const resetInvoiceModalFields = () => {
  useCustomBillingAddress.value = false
  customBillingCompanyName.value = ''
  customBillingContactPerson.value = ''
  customBillingEmail.value = ''
  invoiceEmail.value = ''
  invoiceSubject.value = ''
  invoiceMessage.value = ''
}

const loadUserDetails = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await $fetch(`/api/admin/get-user-payment-details?id=${userId}`)
    
    userDetails.value = response.user
    studentCredit.value = response.studentCredit
    eventTypes.value = response.eventTypes || []
    companyBillingAddress.value = response.companyBillingAddress || null
    logger.debug('✅ User details loaded via API')
    
  } catch (err: any) {
    const errorMessage = err?.message || 'Failed to load user details'
    console.error('❌ Error loading user details:', errorMessage)
    error.value = errorMessage
    isLoading.value = false
  }
}

const loadUserAppointments = async () => {
  try {
    // Load all data via single API call
    const response = await $fetch(`/api/admin/get-user-payment-details?id=${userId}`)
    
    const appointmentsData = response.appointments || []
    const paymentsData = response.payments || []
    const allProducts = response.products || []
    const allDiscounts = response.discounts || []
    const staffMap = new Map(Object.entries(response.staffMap || {}))
    companyBillingAddress.value = response.companyBillingAddress || null
    
    logger.debug('✅ Appointments loaded via API:', appointmentsData.length)
    
    // Add staff info to appointments
    appointmentsData?.forEach((apt: any) => {
      if (apt.staff_id && staffMap.has(apt.staff_id)) {
        apt.staff = staffMap.get(apt.staff_id)
      }
    })

    // Kombiniere Termine mit Zahlungsinformationen
    const processedAppointments = []
    
    logger.debug('🔍 DEBUG - Total payments loaded:', paymentsData.length)
    logger.debug('🔍 DEBUG - Payments by status:', paymentsData.reduce((acc: any, p: any) => {
      acc[p.payment_status] = (acc[p.payment_status] || 0) + 1
      return acc
    }, {}))
    
    for (const appointment of (appointmentsData || [])) {
      const payment = paymentsData.find(p => p.appointment_id === appointment.id)
      // ✅ isPaid should be true for both 'completed' AND 'invoiced' payments
      const isPaid = payment?.payment_status === 'completed' || payment?.payment_status === 'invoiced'
      
      // Merge Zahlungsstatus und Methode in Termin-Datensatz
      // ✅ If appointment is cancelled, show 'cancelled' status regardless of payment status
      const paymentStatus = appointment.status === 'cancelled' 
        ? 'cancelled' 
        : (payment?.payment_status || 'pending')
      ;(appointment as any).payment_status = paymentStatus
      ;(appointment as any).payment_method = payment?.payment_method || 'pending'
      
      if (payment?.payment_status === 'failed') {
        logger.debug('🔴 DEBUG - Found failed payment:', {
          appointmentId: appointment.id,
          appointmentTitle: appointment.title,
          paymentStatus: payment.payment_status,
          paymentId: payment.id
        })
      }
      
      // Verwende echte Daten aus der Datenbank
      const lessonPrice = payment ? (payment.lesson_price_rappen || 0) / 100 : 0
      const adminFee = payment ? (payment.admin_fee_rappen || 0) / 100 : 0
      const productsPrice = payment ? (payment.products_price_rappen || 0) / 100 : 0
      const discountAmount = payment ? (payment.discount_amount_rappen || 0) / 100 : 0
      
      // Debug: Log paid_at for each payment
      if (payment) {
        logger.debug(`📅 Payment ${payment.id} - Status: ${payment.payment_status}, paid_at: ${payment.paid_at}`)
      }
      
      // Bestimme ob Produkte oder Rabatte vorhanden sind
      const hasProducts = productsPrice > 0
      const hasDiscounts = discountAmount > 0
      
      // Get products for this appointment from batch-loaded data
      let products = undefined
      if (hasProducts) {
        const appointmentProducts = allProducts.filter(p => p.appointment_id === appointment.id)
        logger.debug('🔍 Debug - appointmentProducts for appointment', appointment.id, ':', appointmentProducts)
        
        if (appointmentProducts.length > 0) {
          products = appointmentProducts.map(ap => {
            // Handle both single object and array cases for products relation
            const productData = Array.isArray(ap.products) ? ap.products[0] : ap.products
            const productName = 
              productData?.name || 
              (typeof productData === 'object' && productData !== null ? (productData as any)?.name : null) ||
              'Unbekanntes Produkt'
            
            logger.debug('🔍 Debug - Product data:', {
              ap,
              products: ap.products,
              productData,
              productName,
              quantity: ap.quantity,
              total_price_rappen: ap.total_price_rappen
            })
            
            return {
              name: productName,
              price: (ap.total_price_rappen || 0) / 100,
              quantity: ap.quantity || 1,
              total_price: (ap.total_price_rappen || 0) / 100
            }
          }).filter(p => p.name !== 'Unbekanntes Produkt') // Filtere ungültige Produkte heraus
        } else {
          console.warn('⚠️ No products found for appointment', appointment.id)
        }
          
        // Nur als letzter Fallback "Zusatzprodukt" verwenden
        if (!products || products.length === 0) {
          console.warn('⚠️ Using fallback "Zusatzprodukt" for appointment', appointment.id)
          products = [
            { 
              name: 'Zusatzprodukt', 
              price: productsPrice, 
              quantity: 1,
              total_price: productsPrice
            }
          ]
        }
      }
      
      // Get discounts for this appointment from batch-loaded data
      let discounts = undefined
      if (hasDiscounts) {
        const appointmentDiscounts = allDiscounts.filter(d => d.appointment_id === appointment.id)
        if (appointmentDiscounts.length > 0) {
          discounts = appointmentDiscounts.map(discount => ({
            name: discount.reason || 'Rabatt',
            amount: (discount.amount_rappen || 0) / 100,
            type: discount.discount_type || 'fixed' as const,
            total_amount: (discount.amount_rappen || 0) / 100
          }))
        } else {
          // Fallback wenn Rabatt-Details nicht geladen werden können
          discounts = [
            { 
              name: 'Rabatt', 
              amount: discountAmount, 
              type: 'fixed' as const,
              total_amount: discountAmount
            }
          ]
        }
      }
      
      // Rabatt-Details sind bereits oben geladen
      
      const processedAppointment = {
        id: appointment.id,
        title: appointment.title || 'Fahrstunde',
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        duration_minutes: appointment.duration_minutes || 45,
        price_per_minute: 0, // Nicht mehr verfügbar in appointments Tabelle
        discount: 0, // Nicht mehr verfügbar in appointments Tabelle
        is_paid: isPaid,
        status: appointment.status || 'pending',
        type: appointment.type || 'driving_lesson',
        event_type_code: appointment.event_type_code,
        staff_id: appointment.staff_id,
        staff: appointment.staff,
        payment_status: payment?.payment_status || 'pending', // ✅ KRITISCH: payment_status hinzufügen!
        payment_method: payment?.payment_method,
        payment_method_name: payment?.payment_method ? getPaymentMethodLabel(payment.payment_method) : '',
        total_amount: payment ? (payment.total_amount_rappen || 0) / 100 : 0,
        paid_at: payment?.paid_at,
        refunded_at: payment?.refunded_at,
        created_at: payment?.created_at,
        updated_at: payment?.updated_at,
        scheduled_authorization_date: payment?.scheduled_authorization_date,
        deleted_at: appointment.deleted_at,
        // Neue Felder für Produkte und Rabatte
        has_products: hasProducts,
        has_discounts: hasDiscounts,
        products,
        discounts,
        // Preis-Details aus der Datenbank
        lesson_price: lessonPrice,
        admin_fee: adminFee,
        products_price: productsPrice,
        discount_amount: discountAmount,
        credit_used: payment ? (payment.credit_used_rappen || 0) / 100 : 0
      }
      
      logger.debug(`📋 Final processed appointment ${appointment.id}:`, {
        lesson_price: processedAppointment.lesson_price,
        admin_fee: processedAppointment.admin_fee,
        products_price: processedAppointment.products_price,
        discount_amount: processedAppointment.discount_amount,
        products: processedAppointment.products,
        discounts: processedAppointment.discounts
      })
      
      processedAppointments.push(processedAppointment)
    }
    
    appointments.value = processedAppointments

    logger.debug('✅ Appointments with payment methods loaded:', appointments.value.length)
    logger.debug('🔴 DEBUG - Appointments with failed status:', 
      appointments.value.filter(a => a.payment_status === 'failed').map(a => ({
        id: a.id,
        title: a.title,
        payment_status: a.payment_status
      }))
    )
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error loading appointments:', err)
    error.value = errorMessage
  }
}


const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung', 
    'wallee': 'Online-Zahlung',
    'credit': 'Guthaben',
    'twint': 'Online-Zahlung',
    'stripe_card': 'Online-Zahlung',
    'debit_card': 'Online-Zahlung'
  }
  return labels[method] || method
}

const getPaymentMethodClass = (method: string): string => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'wallee': 'bg-green-100 text-green-800',
    'credit': 'bg-yellow-100 text-yellow-800',
    'twint': 'bg-green-100 text-green-800', 
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-green-100 text-green-800'
  }
  return classes[method] || 'bg-gray-100 text-gray-800'
}

/**
 * Berechnet den Betrag, der für einen Termin noch geschuldet ist bzw. verrechnet werden soll.
 * WICHTIG: Bereits verwendetes Guthaben (credit_used) wird abgezogen, da dieser Anteil der
 * Lektion bereits über das Kundenguthaben bezahlt wurde. Ohne diesen Abzug würde bei der
 * Rechnungserstellung der volle Betrag verrechnet und der Kunde faktisch doppelt belastet
 * (einmal via Guthaben, einmal via Rechnung).
 */
const calculateAppointmentAmount = (appointment: Appointment): number => {
  const creditUsed = appointment.credit_used || 0

  // Verwende total_amount aus payments (bereits berechneter Gesamtbetrag) als Basis
  if (appointment.total_amount !== undefined) {
    return Math.max(0, appointment.total_amount - creditUsed)
  }

  // Fallback: Berechne aus den einzelnen Komponenten
  const lessonPrice = appointment.lesson_price || 0
  const adminFee = appointment.admin_fee || 0
  const productsPrice = appointment.products_price || 0
  const discountAmount = appointment.discount_amount || 0

  const subtotal = lessonPrice + adminFee + productsPrice
  const total = Math.max(0, subtotal - discountAmount - creditUsed)

  return total
}

/** UI-Beträge sind CHF; Rechnungs-API erwartet Rappen (Integer). */
const chfToRappen = (chf: number): number => Math.round(chf * 100)

const _sendPaymentReminder = async () => {
  if (!userDetails.value) return

  try {
    logger.debug('Sending payment reminder to:', userDetails.value.email)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const firstName = userDetails.value.first_name || 'Unbekannt'
    const lastName = userDetails.value.last_name || 'Unbekannt'
    showSuccessToast('📧 Zahlungserinnerung gesendet', `Zahlungserinnerung an ${firstName} ${lastName} wurde erfolgreich gesendet.`)
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error sending payment reminder:', errorMessage)
    showErrorToast('❌ Fehler aufgetreten', 'Fehler beim Senden der Zahlungserinnerung.')
  }
}

// Utility methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount)
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  
  try {
    // Explizit als lokale Zeit behandeln - keine UTC-Konvertierung
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    
    // Verwende UTC-Methoden um lokale Zeit zu erzwingen
    const localDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    
    return localDate.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Keine Zeit'
  
  try {
    // Explizit als lokale Zeit behandeln - keine UTC-Konvertierung
    const date = new Date(dateString)
    
    // Prüfe ob das Datum gültig ist
    if (isNaN(date.getTime())) {
      return 'Ungültige Zeit'
    }
    
    // Verwende UTC-Methoden um lokale Zeit zu erzwingen
    const localTime = new Date(0, 0, 0, date.getUTCHours(), date.getUTCMinutes())
    
    return localTime.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.warn('Error formatting time:', dateString, error)
    return 'Zeit Fehler'
  }
}

const formatPaymentDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    
    const formattedDate = date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zurich'
    })
    
    const formattedTime = date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich'
    })
    
    return `${formattedDate}, ${formattedTime} Uhr`
  } catch (error) {
    console.error('Error formatting payment date time:', error)
    return dateString
  }
}

const getPaymentStatusTimestamp = (appointment: any): string | null => {
  // Get the appropriate timestamp field based on payment status
  if (!appointment.payment_status) return null
  
  switch (appointment.payment_status) {
    case 'completed':
      return appointment.paid_at || null
    case 'invoiced':
      return appointment.paid_at || null
    case 'refunded':
      return appointment.refunded_at || appointment.paid_at || null
    case 'failed':
      return appointment.updated_at || null
    case 'authorized':
      return appointment.scheduled_authorization_date || appointment.updated_at || null
    case 'pending':
      return appointment.created_at || null
    default:
      return null
  }
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'confirmed': 'Bestätigt',
    'completed': 'Abgeschlossen',
    'cancelled': 'Abgesagt',
    'pending': 'Ausstehend',
    'verrechnet': 'Verrechnet',
    'paid': 'Bezahlt'
  }
  return labels[status] || status
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'confirmed': 'bg-blue-100 text-blue-800',
    'completed': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'verrechnet': 'bg-orange-100 text-orange-800',
    'paid': 'bg-green-100 text-green-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}



// Payment management functions
const _markAsPaid = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    logger.debug('🔄 Starting markAsPaid for appointment:', appointment.id)
    
    // Finde die Zahlung für diesen Termin
    const payment = await findPaymentForAppointment(appointment.id)
    logger.debug('🔍 Found payment:', payment)
    
    if (payment) {
      await paymentOp('mark_paid', { appointment_id: appointment.id, user_id: userId, amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100) })
      logger.debug('✅ Payment updated to completed:', payment.id)
    } else {
      await paymentOp('mark_paid', { appointment_id: appointment.id, user_id: userId, amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100) })
      logger.debug('✅ New payment created and marked as completed:', appointment.id)
    }
    
    logger.debug('🔄 Reloading data...')
    // Kurze Verzögerung, um sicherzustellen, dass die Datenbank-Transaktion abgeschlossen ist
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Lade nur die aktualisierte Zahlung für diesen spezifischen Termin (Cache umgehen)
    const updatedPayment = await findPaymentForAppointment(appointment.id, true)
    logger.debug('🔄 Updated payment data:', updatedPayment)
    
    if (updatedPayment) {
      // Aktualisiere den lokalen Termin-Status
      const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointment.id)
      if (appointmentIndex !== -1) {
        appointments.value[appointmentIndex].is_paid = updatedPayment.payment_status === 'completed'
        appointments.value[appointmentIndex].payment_method = updatedPayment.payment_method
        appointments.value[appointmentIndex].payment_method_name = getPaymentMethodLabel(updatedPayment.payment_method)
        appointments.value[appointmentIndex].total_amount = (updatedPayment.total_amount_rappen || 0) / 100
        logger.debug('✅ Local appointment updated:', appointments.value[appointmentIndex])
      }
    }
    
    logger.debug('✅ Data updated locally')
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error marking as paid:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Markieren als bezahlt: ${errorMessage}`)
  } finally {
    isUpdatingPayment.value = false
  }
}

const _markAsUnpaid = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    // Finde die Zahlung für diesen Termin
    const payment = await findPaymentForAppointment(appointment.id)
    
    if (payment) {
      await paymentOp('mark_unpaid', { appointment_id: appointment.id })
      logger.debug('✅ Payment marked as unpaid:', appointment.id)
    }
    
    // Lade die Daten neu, um den aktuellen Status zu zeigen
    await refreshData()
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error marking as unpaid:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Markieren als offen: ${errorMessage}`)
  } finally {
    isUpdatingPayment.value = false
  }
}

const _editPaymentMethod = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  const newMethod = prompt('Neue Zahlungsmethode (cash, invoice, twint, stripe_card, debit_card):')
  if (!newMethod) return
  
  const validMethods = ['cash', 'invoice', 'twint', 'stripe_card', 'debit_card']
  if (!validMethods.includes(newMethod)) {
    showErrorToast('❌ Ungültige Zahlungsmethode', `Gültige Methoden: ${validMethods.join(', ')}`)
    return
  }
  
  isUpdatingPayment.value = true
  try {
    // Finde die Zahlung für diesen Termin
    const payment = await findPaymentForAppointment(appointment.id)
    
    if (payment) {
      await paymentOp('update_payment_method', { appointment_id: appointment.id, payment_method: newMethod })
      logger.debug('✅ Payment method updated:', appointment.id, newMethod)
    } else {
      await paymentOp('update_payment_method', { appointment_id: appointment.id, payment_method: newMethod, user_id: userId, amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100) })
      logger.debug('✅ New payment created with method:', appointment.id, newMethod)
    }
    
    // Lade die Daten neu, um den aktuellen Status zu zeigen
    await refreshData()
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error updating payment method:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Aktualisieren der Zahlungsmethode: ${errorMessage}`)
  } finally {
    isUpdatingPayment.value = false
  }
}

const resetPaymentStatus = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  showConfirmation(
    'Zahlungsstatus zurücksetzen',
    'Möchtest du wirklich den Zahlungsstatus für diesen Termin auf "Ausstehend" zurücksetzen?',
    () => resetPaymentStatusAction(appointment)
  )
}

const resetPaymentStatusAction = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    // Finde die Zahlung für diesen Termin
    const payment = await findPaymentForAppointment(appointment.id)
    
    if (payment) {
      await paymentOp('mark_unpaid', { appointment_id: appointment.id })
      logger.debug('✅ Payment status reset to pending:', appointment.id)
    } else {
      await paymentOp('mark_unpaid', { appointment_id: appointment.id })
      logger.debug('✅ New payment created with pending status:', appointment.id)
    }
    
    // Aktualisiere den lokalen Termin-Status
    const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointment.id)
    if (appointmentIndex !== -1) {
      appointments.value[appointmentIndex].is_paid = false
      logger.debug('✅ Local appointment updated to unpaid')
    }
    
    // Schöne Erfolgsmeldung
    showSuccessToast(
      '✅ Status zurückgesetzt',
      `Der Zahlungsstatus für "${appointment.title}" wurde erfolgreich auf "Ausstehend" zurückgesetzt.`
    )
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error resetting payment status:', err)
    
    // Schöne Fehlermeldung
    showErrorToast(
      '❌ Fehler aufgetreten',
      `Fehler beim Zurücksetzen des Zahlungsstatus: ${errorMessage}`
    )
  } finally {
    isUpdatingPayment.value = false
  }
}

// Reset Failed Payment and resend confirmation email
const resetFailedPayment = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  showConfirmation(
    'Fehlgeschlagene Zahlung zurücksetzen',
    `Möchtest du die Zahlung für "${appointment.title}" zurücksetzen und eine neue Bestätigungs-Email an den Kunden senden?`,
    () => resetFailedPaymentAction(appointment)
  )
}

const resetFailedPaymentAction = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    // Call API endpoint to reset payment (server-side with admin access)
    const result = await $fetch('/api/payments/reset-failed', {
      method: 'POST',
      body: {
        appointmentId: appointment.id
      }
    })
    
    logger.debug('✅ Payment reset result:', result)
    
    // Refresh data
    await refreshData()
    
    // Success message
    showSuccessToast(
      '✅ Zahlung zurückgesetzt',
      `Die Zahlung für "${appointment.title}" wurde zurückgesetzt und eine neue Bestätigungs-Email wurde versendet.`
    )
    
  } catch (err: any) {
    const errorMessage = err?.data?.message || err?.message || 'Unknown error'
    console.error('❌ Error resetting failed payment:', err)
    
    showErrorToast(
      '❌ Fehler aufgetreten',
      `Fehler beim Zurücksetzen der Zahlung: ${errorMessage}`
    )
  } finally {
    isUpdatingPayment.value = false
  }
}

// Batch reset failed payments for all selected appointments
const resendAllSelectedConfirmations = async () => {
  if (selectedAppointments.value.length === 0) return
  
  showConfirmation(
    'Alle fehlgeschlagenen Zahlungen zurücksetzen',
    `Möchtest du ${selectedAppointments.value.length} fehlgeschlagene Zahlungen zurücksetzen und neue Bestätigungs-Emails versenden?`,
    async () => {
      isUpdatingPayment.value = true
      let successCount = 0
      let errorCount = 0
      
      try {
        for (const appointmentId of selectedAppointments.value) {
          const appointment = appointments.value.find(apt => apt.id === appointmentId)
          if (!appointment) continue
          
          try {
            await resetFailedPaymentAction(appointment)
            successCount++
          } catch (err) {
            console.error(`Error resetting payment for ${appointmentId}:`, err)
            errorCount++
          }
        }
        
        // Clear selection
        selectedAppointments.value = []
        
        // Show summary
        if (errorCount === 0) {
          showSuccessToast(
            '✅ Alle Zahlungen zurückgesetzt',
            `${successCount} fehlgeschlagene Zahlungen wurden erfolgreich zurückgesetzt.`
          )
        } else {
          showErrorToast(
            '⚠️ Teilweise erfolgreich',
            `${successCount} Zahlungen zurückgesetzt, ${errorCount} fehlgeschlagen.`
          )
        }
        
      } finally {
        isUpdatingPayment.value = false
      }
    }
  )
}

const deleteAppointment = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  showConfirmation(
    'Termin löschen',
    'Möchtest du diesen Termin löschen? Der Termin wird als gelöscht markiert und kann später wiederhergestellt werden.',
    () => deleteAppointmentAction(appointment)
  )
}

const deleteAppointmentAction = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    // Soft-Delete appointment + associated payments via secure API
    await paymentOp('soft_delete_appointment', { appointment_id: appointment.id })
    
    // Termin sofort aus der UI entfernen (deleted_at setzen)
    const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointment.id)
    if (appointmentIndex !== -1) {
      appointments.value[appointmentIndex].deleted_at = new Date().toISOString()
    }

    // Kunde benachrichtigen? → Admin wird gefragt
    showConfirmation(
      'Kunde benachrichtigen?',
      'Soll der Kunde per SMS/Email über die Löschung dieses Termins informiert werden?',
      async () => {
        try {
          await $fetch('/api/reminders/send-deletion-notification', {
            method: 'POST',
            body: {
              appointmentId: appointment.id,
              userId: appointment.user_id,
              tenantId: appointment.tenant_id,
              type: 'customer'
            }
          })
        } catch (smsError) {
          console.warn('⚠️ Could not send deletion notification SMS/Email:', smsError)
        }
      },
      { confirmLabel: 'Ja, benachrichtigen', cancelLabel: 'Nein, überspringen' }
    )
    
    // Schöne Erfolgsmeldung
    showSuccessToast(
      '🗑️ Termin und Zahlung gelöscht',
      `Der Termin "${appointment.title}" und die Zahlung wurden erfolgreich gelöscht. Falls eine Rechnung vorhanden ist, wird diese aktualisiert (stornierte Payments anzeigen, Total neu berechnen).`
    )
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error deleting appointment:', err)
    
    // Schöne Fehlermeldung
    showErrorToast(
      '❌ Fehler aufgetreten',
      `Fehler beim Löschen des Termins: ${errorMessage}`
    )
  } finally {
    isUpdatingPayment.value = false
  }
}

const restoreAppointment = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    // Restore appointment via secure API
    await paymentOp('restore_appointment', { appointment_id: appointment.id })
    
    // Aktualisiere den lokalen Termin-Status
    const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointment.id)
    if (appointmentIndex !== -1) {
      appointments.value[appointmentIndex].deleted_at = null
    }
    
    // Schöne Erfolgsmeldung
    showSuccessToast(
      '✅ Termin wiederhergestellt',
      `Der Termin "${appointment.title}" wurde erfolgreich wiederhergestellt.`
    )
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error restoring appointment:', err)
    
    // Schöne Fehlermeldung
    showErrorToast(
      '❌ Fehler aufgetreten',
      `Fehler beim Wiederherstellen des Termins: ${errorMessage}`
    )
  } finally {
    isUpdatingPayment.value = false
  }
}

const convertAppointmentToOnline = async (appointment: Appointment) => {
  if (!appointment.id || !userDetails.value?.id) return
  
  isConvertingToOnline.value = true
  
  try {
    logger.debug('🔄 Converting payment to online:', appointment.id)
    
    const result = await $fetch('/api/payments/convert-to-online', {
      method: 'POST',
      body: {
        paymentId: appointment.id,
        customerEmail: userDetails.value?.email
      }
    })
    
    logger.debug('✅ Payment converted to online:', result)
    
    showSuccessToast(
      '✅ Zahlung konvertiert',
      `Die Zahlung wurde erfolgreich zu Online-Zahlung konvertiert. Zahlungslink wurde per E-Mail versendet.`
    )
    
    // Reload appointments
    await loadUserAppointments()
    
  } catch (err: any) {
    console.error('❌ Error converting payment to online:', err)
    showErrorToast(
      '❌ Fehler aufgetreten',
      `Fehler beim Konvertieren der Zahlung: ${err.data?.statusMessage || err.message}`
    )
  } finally {
    isConvertingToOnline.value = false
  }
}

// Invoice Management Functions
const toggleInvoiceMenuWithPosition = (appointmentId: string, event: MouseEvent) => {
  event.stopPropagation()
  
  const shouldOpen = openInvoiceMenu.value !== appointmentId
  
  if (shouldOpen) {
    openInvoiceMenu.value = appointmentId
    
    // Calculate position based on button location (fixed positioning, so use viewport coords)
    if (event.currentTarget instanceof HTMLElement) {
      const rect = event.currentTarget.getBoundingClientRect()
      invoiceMenuPosition.value = {
        top: Math.round(rect.bottom + 5), // rect.bottom is already in viewport coords for fixed positioning
        right: Math.round(window.innerWidth - rect.right)
      }
      logger.debug('📍 Invoice menu opened at position:', {top: rect.bottom + 5, right: window.innerWidth - rect.right})
    } else {
      invoiceMenuPosition.value = {
        top: 100,
        right: 20
      }
    }
  } else {
    openInvoiceMenu.value = null
    invoiceMenuPosition.value = null
  }
}

const downloadInvoice = async (appointment: Appointment) => {
  openInvoiceMenu.value = null
  try {
    // Find the payment record for this appointment via API
    const paymentData: any = await $fetch(`/api/admin/payment-invoice-lookup?appointment_id=${appointment.id}`)
    const payment = paymentData?.payment
    
    if (!payment) {
      console.error('❌ Payment not found for appointment:', appointment.id)
      showErrorToast('Fehler', 'Zahlung nicht gefunden')
      return
    }
    
    if (!payment.invoice_number) {
      showErrorToast('Fehler', 'Keine Rechnung für diese Zahlung vorhanden')
      return
    }
    
    logger.debug('📥 Downloading invoice:', payment.invoice_number)
    
    // Fetch the invoice via API
    const invoiceData: any = await $fetch(`/api/admin/payment-invoice-lookup?invoice_number=${encodeURIComponent(payment.invoice_number)}`)
    const invoice = invoiceData?.invoice
    
    if (!invoice) {
      console.error('❌ Invoice not found:', payment.invoice_number)
      showErrorToast('Fehler', 'Rechnung nicht gefunden')
      return
    }
    
    // Generate PDF for the invoice
    const result = await $fetch('/api/invoices/download', {
      method: 'POST',
      body: { invoiceId: invoice.id }
    })
    
    if (result?.pdfUrl) {
      const { openPdf } = await import('~/utils/openPdf')
      await openPdf(result.pdfUrl, `Rechnung_${payment.invoice_number}.pdf`)
      logger.debug('✅ Invoice downloaded')
    } else {
      showErrorToast('Fehler', 'PDF konnte nicht generiert werden')
    }
  } catch (err: any) {
    console.error('❌ Error downloading invoice:', err)
    showErrorToast('Fehler', `Fehler beim Herunterladen: ${err.message}`)
  }
}

const resendInvoice = async (appointment: Appointment) => {
  openInvoiceMenu.value = null
  
  showConfirmation(
    'Rechnung erneut senden',
    `Möchtest du die Rechnung für "${appointment.title}" erneut an ${userDetails.value?.email} senden?`,
    async () => {
      isUpdatingPayment.value = true
      try {
        // Call the settle-and-email endpoint with sendEmail option
        await $fetch('/api/payments/settle-and-email', {
          method: 'POST',
          body: {
            appointmentIds: [appointment.id],
            sendEmail: true
          }
        })
        
        showSuccessToast(
          '✅ Rechnung versendet',
          'Die Rechnung wurde erfolgreich erneut versendet.'
        )
      } catch (err: any) {
        console.error('❌ Error resending invoice:', err)
        showErrorToast('Fehler', `Fehler beim Versenden: ${err.message}`)
      } finally {
        isUpdatingPayment.value = false
      }
    }
  )
}

const markInvoicedAsPaid = async (appointment: Appointment) => {
  openInvoiceMenu.value = null

  showConfirmation(
    'Als bezahlt markieren',
    `Möchtest du die Rechnung für "${appointment.title}" als bezahlt markieren? Das Payment wird auf "completed" gesetzt.`,
    async () => {
      isUpdatingPayment.value = true
      try {
        await paymentOp('mark_paid', {
          appointment_id: appointment.id,
          user_id: userId,
          amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100)
        })

        // Optimistic local update so badge changes immediately
        const idx = appointments.value.findIndex(a => a.id === appointment.id)
        if (idx !== -1) {
          appointments.value[idx].payment_status = 'completed'
          appointments.value[idx].is_paid = true
        }

        showSuccessToast('✅ Als bezahlt markiert', 'Die Rechnung wurde als bezahlt markiert.')
        await loadUserAppointments()
      } catch (err: any) {
        showErrorToast('Fehler', `Fehler beim Markieren: ${err.message}`)
      } finally {
        isUpdatingPayment.value = false
      }
    },
    { confirmLabel: 'Ja, als bezahlt markieren', cancelLabel: 'Abbrechen' }
  )
}

const switchToCash = async (appointment: Appointment) => {
  openInvoiceMenu.value = null

  showConfirmation(
    'Zu Bar bezahlt wechseln',
    `Möchtest du die Zahlung für "${appointment.title}" zu "Bar bezahlt" wechseln?`,
    async () => {
      isUpdatingPayment.value = true
      try {
        await paymentOp('switch_to_cash', { appointment_id: appointment.id })
        
        showSuccessToast(
          '✅ Zahlungsmethode geändert',
          'Die Zahlungsmethode wurde zu "Bar bezahlt" geändert.'
        )
        
        await loadUserAppointments()
      } catch (err: any) {
        console.error('❌ Error switching to cash:', err)
        showErrorToast('Fehler', `Fehler beim Ändern: ${err.message}`)
      } finally {
        isUpdatingPayment.value = false
      }
    }
  )
}

const switchToOnlinePayment = async (appointment: Appointment) => {
  openInvoiceMenu.value = null
  await convertAppointmentToOnline(appointment)
}

const hardDeleteAppointment = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  // Bestätigung für endgültiges Löschen
  showConfirmation(
    'Endgültig löschen',
    `Möchtest du den Termin "${appointment.title}" wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden und alle zugehörigen Zahlungen werden ebenfalls gelöscht.`,
    () => executeHardDelete(appointment)
  )
}

const executeHardDelete = async (appointment: Appointment) => {
  if (!appointment.id) return
  
  isUpdatingPayment.value = true
  try {
    // Hard-delete appointment + payments via secure API
    await paymentOp('hard_delete_appointment', { appointment_id: appointment.id })
    
    // Entferne den Termin aus der lokalen Liste
    const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointment.id)
    if (appointmentIndex !== -1) {
      appointments.value.splice(appointmentIndex, 1)
    }
    
    // Schöne Erfolgsmeldung
    showSuccessToast(
      '🗑️ Termin endgültig gelöscht',
      `Der Termin "${appointment.title}" wurde endgültig gelöscht.`
    )
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error hard deleting appointment:', err)
    
    // Schöne Fehlermeldung
    showErrorToast(
      '❌ Fehler aufgetreten',
      `Fehler beim endgültigen Löschen des Termins: ${errorMessage}`
    )
  } finally {
    isUpdatingPayment.value = false
  }
}

// Button helper functions
const getButtonAction = (appointment: Appointment) => {
  if (appointmentFilter.value === 'deleted') {
    return restoreAppointment(appointment)
  }
  
  // Check for failed payment
  if (appointment.payment_status === 'failed') {
    return resetFailedPayment(appointment)
  }
  
  if (appointment.is_paid) {
    return resetPaymentStatus(appointment)
  } else {
    return deleteAppointment(appointment)
  }
}

const getButtonText = (appointment: Appointment) => {
  if (appointmentFilter.value === 'deleted') {
    return 'Wiederherstellen'
  }
  
  if (appointment.payment_status === 'failed') {
    return 'Neu senden'
  }
  
  if (appointment.is_paid) {
    return 'Zurücksetzen'
  } else {
    return 'Löschen'
  }
}

const getButtonClass = (appointment: Appointment) => {
  const baseClasses = 'inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50'
  
  if (appointmentFilter.value === 'deleted') {
    return `${baseClasses} text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500`
  }
  
  if (appointment.payment_status === 'failed') {
    return `${baseClasses} text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500`
  }
  
  if (appointment.is_paid) {
    return `${baseClasses} text-orange-700 bg-orange-100 hover:bg-orange-200 focus:ring-orange-500`
  } else {
    return `${baseClasses} text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500`
  }
}

const getButtonTitle = (appointment: Appointment) => {
  if (appointmentFilter.value === 'deleted') {
    return 'Termin wiederherstellen'
  }
  
  if (appointment.payment_status === 'failed') {
    return 'Zahlung zurücksetzen und Bestätigungs-Email erneut senden'
  }
  
  if (appointment.is_paid) {
    return 'Zahlungsstatus auf "Ausstehend" zurücksetzen'
  } else {
    return 'Termin löschen (wiederherstellbar)'
  }
}

// Hilfsfunktionen für Preis-Details
const hasPriceDetails = (appointment: Appointment): boolean => {
  // Prüfe ob relevante Preis-Details vorhanden sind
  const hasProducts = !!(appointment.products && appointment.products.length > 0)
  const hasDiscounts = !!(appointment.discounts && appointment.discounts.length > 0)
  const hasAdminFee = !!(appointment.admin_fee && appointment.admin_fee > 0)
  const hasLessonPrice = !!(appointment.lesson_price && appointment.lesson_price > 0)
  
  logger.debug(`🔍 hasPriceDetails check for appointment ${appointment.id}:`, {
    hasProducts,
    hasDiscounts,
    hasAdminFee,
    hasLessonPrice,
    products: appointment.products,
    discounts: appointment.discounts,
    admin_fee: appointment.admin_fee,
    lesson_price: appointment.lesson_price
  })
  
  return hasProducts || hasDiscounts || hasAdminFee || hasLessonPrice
}

const getPriceDetailsText = (appointment: Appointment): string => {
  const details = []
  
  if (appointment.lesson_price && appointment.lesson_price > 0) {
    details.push('Lektion')
  }
  if (appointment.admin_fee && appointment.admin_fee > 0) {
    details.push('Admin-Pauschale')
  }
  if (appointment.products && appointment.products.length > 0) {
    details.push(`${appointment.products.length} Produkt${appointment.products.length > 1 ? 'e' : ''}`)
  }
  if (appointment.discount_amount && appointment.discount_amount > 0) {
    details.push('Rabatt')
  }
  
  return details.length > 0 ? details.join(', ') : 'Preis-Details'
}

const getPriceDetailsTooltip = (appointment: Appointment): string => {
  let tooltip = ''
  
  // Lektion-Preis
  if (appointment.lesson_price && appointment.lesson_price > 0) {
    tooltip += `• Lektion: ${formatCurrency(appointment.lesson_price)}\n`
  }
  
  // Admin-Pauschale (prominent anzeigen)
  if (appointment.admin_fee && appointment.admin_fee > 0) {
    tooltip += `• Admin-Pauschale: ${formatCurrency(appointment.admin_fee)}\n`
  }
  
  // Produkte hinzufügen
  if (appointment.products && appointment.products.length > 0) {
    appointment.products.forEach(product => {
      tooltip += `• ${product.name}: ${formatCurrency(product.price)}\n`
    })
  }
  
  // Rabatte hinzufügen
  if (appointment.discount_amount && appointment.discount_amount > 0) {
    tooltip += `• Rabatt: -${formatCurrency(appointment.discount_amount)}\n`
  }
  
  return tooltip.trim()
}

// Hilfsfunktion für die Rechnungsübersicht
const _renderProductsList = (appointment: Appointment) => {
  if (!appointment.products || appointment.products.length === 0) return null
  
  return appointment.products.map(product => ({
    name: product.name || 'Unbekanntes Produkt',
    price: product.price || 0
  }))
}

const findPaymentForAppointment = async (appointmentId: string, _bypassCache: boolean = false): Promise<Payment | null> => {
  try {
    const data: any = await $fetch(`/api/admin/payment-invoice-lookup?appointment_id=${appointmentId}`)
    return data?.payment || null
  } catch (err) {
    console.error('Error finding payment:', err)
    return null
  }
}

// Toast functions
const showSuccessToast = (title: string, message: string = '') => {
  logger.debug('🔔 showSuccessToast called:', { title, message })
  toastType.value = 'success'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  logger.debug('🔔 Toast state updated:', { showToast: showToast.value, type: toastType.value, title: toastTitle.value, message: toastMessage.value })
}

const showErrorToast = (title: string, message: string = '') => {
  logger.debug('🔔 showErrorToast called:', { title, message })
  toastType.value = 'error'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  logger.debug('🔔 Toast state updated:', { showToast: showToast.value, type: toastType.value, title: toastTitle.value, message: toastMessage.value })
}

const closeToast = () => {
  logger.debug('🔔 closeToast called')
  showToast.value = false
}

// Confirmation functions
const showConfirmation = (title: string, message: string, action: () => void, options?: { confirmLabel?: string, cancelLabel?: string }) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmAction.value = action
  confirmLabel.value = options?.confirmLabel || ''
  cancelLabel.value = options?.cancelLabel || ''
  showConfirmModal.value = true
}

const executeConfirmAction = async () => {
  const action = confirmAction.value
  showConfirmModal.value = false
  confirmAction.value = null
  confirmLabel.value = ''
  cancelLabel.value = ''
  if (action) {
    await action()
  }
}

const cancelAction = () => {
  showConfirmModal.value = false
  confirmAction.value = null
  confirmLabel.value = ''
  cancelLabel.value = ''
}

// Test function for debugging
const _testToast = () => {
  logger.debug('🧪 Test Toast button clicked')
  showSuccessToast('🧪 Test erfolgreich', 'Dies ist eine Test-Toast-Benachrichtigung!')
}



// Selection management functions
const toggleAppointmentSelection = (appointmentId: string) => {
  const index = selectedAppointments.value.indexOf(appointmentId)
  if (index > -1) {
    // Termin abwählen
    selectedAppointments.value.splice(index, 1)
  } else {
    // Termin zur Auswahl hinzufügen (nur unbezahlte Termine sind auswählbar)
    selectedAppointments.value.push(appointmentId)
  }
}

const toggleAllAppointments = () => {
  if (areAllAppointmentsSelected.value) {
    selectedAppointments.value = []
  } else {
    // Wähle alle sichtbaren und auswählbaren Termine aus (abhängig vom Filter)
    if (appointmentFilter.value === 'deleted') {
      // Für gelöschte Termine: Alle auswählbar
      selectedAppointments.value = filteredAppointments.value.map(apt => apt.id)
    } else {
      // Für aktive Termine: Nur unbezahlte und nicht verrechnete auswählbar
      const selectableAppointments = filteredAppointments.value.filter(apt => 
        !apt.is_paid && apt.status !== 'verrechnet' && apt.status !== 'paid'
      )
      selectedAppointments.value = selectableAppointments.map(apt => apt.id)
    }
  }
}

const clearSelection = () => {
  selectedAppointments.value = []
}

const getAppointmentById = (appointmentId: string) => {
  return appointments.value.find(apt => apt.id === appointmentId)
}

const invoiceSelectedAppointments = async () => {
  if (selectedAppointments.value.length === 0) return
  
  try {
    logger.debug('🔄 Creating invoice for selected appointments:', selectedAppointments.value.length)
    
    // Setze Standardwerte für E-Mail-Felder
    useCustomBillingAddress.value = false
    customBillingCompanyName.value = ''
    customBillingContactPerson.value = ''
    customBillingEmail.value = ''
    
    invoiceEmail.value = companyBillingAddress.value?.email || displayEmail.value
    invoiceSubject.value = `Rechnung für ${selectedAppointments.value.length} Fahrstunde${selectedAppointments.value.length > 1 ? 'n' : ''}`
    // Nur Intro in die Nachricht — Zahlungsbedingungen/Footer gehen separat auf die Rechnung
    const intro = (invoiceIntroText.value || '').trim()
    if (intro) {
      invoiceMessage.value = intro
    } else {
      const tenantLabel = brandName.value || 'Ihre Fahrschule'
      invoiceMessage.value = `Guten Tag\n\nVielen Dank für Ihren Auftrag, welchen wir wie folgt in Rechnung stellen:\n\nFreundliche Grüsse\n${tenantLabel}`
    }
    
    // Zeige das Rechnungs-Modal
    showInvoiceModal.value = true
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error creating invoice:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Erstellen der Rechnung: ${errorMessage}`)
  }
}

type SelectedAppointmentRow = {
  id: string
  title: string
  start_time: string
  duration_minutes: number
  amount: number
}

const getSelectedAppointmentRows = (): SelectedAppointmentRow[] => {
  return selectedAppointments.value.map((appointmentId) => {
    const appointment = getAppointmentById(appointmentId)
    if (!appointment) return null
    return {
      id: appointment.id,
      title: appointment.title,
      start_time: appointment.start_time,
      duration_minutes: appointment.duration_minutes,
      amount: calculateAppointmentAmount(appointment),
    }
  }).filter((apt): apt is SelectedAppointmentRow => apt !== null)
}

const buildInvoicePayload = (internalNotes: string) => {
  const rows = getSelectedAppointmentRows()
  if (rows.length === 0) throw new Error('Keine gültigen Termine gefunden')

  const billingEmail = resolvedInvoiceEmail.value
  if (!billingEmail) throw new Error('Keine E-Mail-Adresse für die Rechnung angegeben')

  if (useCustomBillingAddress.value) {
    if (!customBillingContactPerson.value.trim()) throw new Error('Kontaktperson ist erforderlich')
    if (!customBillingEmail.value.trim() && !invoiceEmail.value.trim()) throw new Error('E-Mail-Adresse ist erforderlich')
  }

  const useCompanyBilling = useCustomBillingAddress.value || !!companyBillingAddress.value
  const invoiceFormData = {
    user_id: userDetails.value?.id || '',
    billing_type: (useCompanyBilling ? 'company' : 'individual') as 'company' | 'individual',
    billing_company_name: useCustomBillingAddress.value
      ? customBillingCompanyName.value || undefined
      : companyBillingAddress.value?.company_name || undefined,
    billing_contact_person: useCustomBillingAddress.value
      ? customBillingContactPerson.value || undefined
      : companyBillingAddress.value?.contact_person || undefined,
    billing_email: billingEmail,
    billing_street: companyBillingAddress.value?.street || undefined,
    billing_street_number: companyBillingAddress.value?.street_number || undefined,
    billing_zip: companyBillingAddress.value?.zip || undefined,
    billing_city: companyBillingAddress.value?.city || undefined,
    billing_country: 'CH',
    billing_vat_number: companyBillingAddress.value?.vat_number || undefined,
    subtotal_rappen: chfToRappen(selectedAppointmentsTotal.value),
    vat_rate: defaultVatRate.value,
    discount_amount_rappen: 0,
    notes: invoiceMessage.value || invoiceIntroText.value || undefined,
    payment_terms: invoicePaymentTerms.value || undefined,
    footer_text: invoiceFooterText.value || undefined,
    internal_notes: internalNotes,
  }

  const invoiceItems = rows.map((appointment, index) => {
    const unitPriceRappen = chfToRappen(appointment.amount || 0)
    const vatAmount = Math.round(unitPriceRappen * defaultVatRate.value / 100)
    return {
      product_name: appointment.title || 'Fahrstunde',
      product_description: `Termin am ${new Date(appointment.start_time).toLocaleDateString('de-CH')}`,
      appointment_id: appointment.id,
      appointment_title: appointment.title,
      appointment_date: appointment.start_time,
      appointment_duration_minutes: appointment.duration_minutes,
      quantity: 1,
      unit_price_rappen: unitPriceRappen,
      total_price_rappen: unitPriceRappen,
      vat_rate: defaultVatRate.value,
      vat_amount_rappen: vatAmount,
      sort_order: index,
      notes: `Termin: ${appointment.title}`,
    }
  })

  return { invoiceFormData, invoiceItems }
}

const createInvoiceFromSelection = async (internalNotes: string) => {
  const { invoiceFormData, invoiceItems } = buildInvoicePayload(internalNotes)
  const { createInvoice } = useInvoices()
  const result = await createInvoice(invoiceFormData, invoiceItems)
  if (result.error || !result.data) throw new Error(result.error || 'Rechnung konnte nicht erstellt werden')
  return result
}

const finalizeInvoiceModal = async () => {
  showInvoiceModal.value = false
  selectedAppointments.value = []
  resetInvoiceModalFields()
  await loadUserAppointments()
  await refreshData()
}

const sendDirectEmail = async () => {
  if (selectedAppointments.value.length === 0 || isCreatingInvoice.value) return

  isCreatingInvoice.value = true
  invoiceAction.value = 'email'

  try {
    const result = await createInvoiceFromSelection(
      `Per E-Mail versendet aus UserPaymentDetails für ${selectedAppointments.value.length} Termine`
    )

    await updateAppointmentsToInvoiced(
      selectedAppointments.value,
      result.data!.id,
      companyBillingAddress.value?.id
    )

    const resendResult = await $fetch<{ success: boolean; error?: string; sentTo?: string }>(
      '/api/invoices/resend',
      { method: 'POST', body: { invoiceId: result.data!.id } }
    )
    if (!resendResult.success) throw new Error(resendResult.error || 'E-Mail-Versand fehlgeschlagen')

    showSuccessToast(
      '✅ Rechnung gesendet',
      `Rechnungsnummer: ${result.invoice_number}
Anzahl Termine: ${selectedAppointments.value.length}
Gesamtbetrag: ${formatCurrency(selectedAppointmentsTotal.value)}

Die Rechnung wurde erstellt und an ${resendResult.sentTo || resolvedInvoiceEmail.value} gesendet.`
    )

    await finalizeInvoiceModal()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error sending invoice email:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim E-Mail-Versand: ${errorMessage}`)
  } finally {
    isCreatingInvoice.value = false
    invoiceAction.value = null
  }
}

const createInvoiceAndOpenPdf = async () => {
  if (selectedAppointments.value.length === 0 || isCreatingInvoice.value) return

  isCreatingInvoice.value = true
  invoiceAction.value = 'pdf'

  try {
    const result = await createInvoiceFromSelection(
      `PDF erstellt aus UserPaymentDetails für ${selectedAppointments.value.length} Termine`
    )

    await updateAppointmentsToInvoiced(
      selectedAppointments.value,
      result.data!.id,
      companyBillingAddress.value?.id
    )

    const pdfResult = await generateInvoicePDF(result.data as InvoiceData)
    if (!pdfResult.success) {
      throw new Error(pdfResult.error || 'PDF-Generierung fehlgeschlagen')
    }

    showSuccessToast(
      '✅ Rechnung erstellt',
      `Rechnungsnummer: ${result.invoice_number}
Anzahl Termine: ${selectedAppointments.value.length}
Gesamtbetrag: ${formatCurrency(selectedAppointmentsTotal.value)}`
    )

    await finalizeInvoiceModal()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error creating invoice PDF:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Erstellen der Rechnung: ${errorMessage}`)
  } finally {
    isCreatingInvoice.value = false
    invoiceAction.value = null
  }
}

// Hilfsfunktion für PDF-Generierung
const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<PDFResult> => {
  try {
    logger.debug('📄 Generating PDF for invoice:', invoiceData.id)

    const response = await $fetch('/api/invoices/download', {
      method: 'POST',
      body: { invoiceId: invoiceData.id }
    }) as { success: boolean; pdfUrl?: string; error?: string }

    if (response.success && response.pdfUrl) {
      const { openPdf } = await import('~/utils/openPdf')
      await openPdf(response.pdfUrl, `rechnung-${invoiceData.invoice_number}.pdf`)
      return { success: true, pdfUrl: response.pdfUrl }
    }

    return { success: false, error: response.error || 'PDF-Generierung fehlgeschlagen' }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error generating PDF:', error)
    return { success: false, error: errorMessage || 'PDF-Generierung fehlgeschlagen' }
  }
}

// Hilfsfunktion: Termine auf "verrechnet" setzen
const updateAppointmentsToInvoiced = async (appointmentIds: string[], invoiceNumber?: string, companyBillingAddressId?: string) => {
  try {
    logger.debug('🔄 Settling appointments:', appointmentIds)

    const result = await $fetch('/api/payments/settle-and-email', {
      method: 'POST',
      body: {
        appointmentIds,
        invoiceNumber,
        companyBillingAddressId
      }
    })

    logger.debug('✅ Appointments settled:', result)
    return result
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error in updateAppointmentsToInvoiced:', errorMessage)
    throw error
  }
}

// Bulk-Aktionen für gelöschte Termine
const restoreAllSelectedAppointments = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isUpdatingPayment.value = true
  try {
    logger.debug('🔄 Restoring all selected deleted appointments:', selectedAppointments.value.length)
    
    await paymentOp('restore_appointments_bulk', { appointment_ids: [...selectedAppointments.value] })
    
    // Aktualisiere alle ausgewählten Termine lokal
    for (const appointmentId of selectedAppointments.value) {
      const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointmentId)
      if (appointmentIndex !== -1) {
        appointments.value[appointmentIndex].deleted_at = null
      }
    }
    
    // Auswahl aufheben
    selectedAppointments.value = []
    
    showSuccessToast(
      '✅ Alle Termine wiederhergestellt',
      `${selectedAppointments.value.length} gelöschte Termine wurden erfolgreich wiederhergestellt.`
    )
    
    logger.debug('✅ All selected appointments restored')
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error restoring all appointments:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Wiederherstellen der Termine: ${errorMessage}`)
  } finally {
    isUpdatingPayment.value = false
  }
}

const hardDeleteAllSelectedAppointments = async () => {
  if (selectedAppointments.value.length === 0) return
  
  // Bestätigung für endgültiges Löschen aller ausgewählten Termine
  showConfirmation(
    'Alle ausgewählten Termine endgültig löschen',
    `Möchtest du wirklich alle ${selectedAppointments.value.length} ausgewählten Termine endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden und alle zugehörigen Zahlungen werden ebenfalls gelöscht.`,
    () => executeHardDeleteAllSelected()
  )
}

const executeHardDeleteAllSelected = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isUpdatingPayment.value = true
  try {
    logger.debug('🗑️ Hard deleting all selected appointments:', selectedAppointments.value.length)
    
    await paymentOp('hard_delete_appointments_bulk', { appointment_ids: [...selectedAppointments.value] })
    
    // Entferne alle gelöschten Termine aus der lokalen Liste
    appointments.value = appointments.value.filter(apt => !selectedAppointments.value.includes(apt.id))
    
    // Auswahl aufheben
    selectedAppointments.value = []
    
    showSuccessToast(
      '🗑️ Alle Termine endgültig gelöscht',
      `${selectedAppointments.value.length} Termine wurden endgültig gelöscht.`
    )
    
    logger.debug('✅ All selected appointments hard deleted')
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error hard deleting all appointments:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim endgültigen Löschen der Termine: ${errorMessage}`)
  } finally {
    isUpdatingPayment.value = false
  }
}

const markAllSelectedAsPaid = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isUpdatingPayment.value = true
  try {
    logger.debug('🔄 Marking all selected appointments as paid:', selectedAppointments.value.length)
    
    await paymentOp('mark_paid_bulk', { appointment_ids: [...selectedAppointments.value] })
    
    // Optimistic local update for both is_paid AND payment_status
    for (const appointmentId of selectedAppointments.value) {
      const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointmentId)
      if (appointmentIndex !== -1) {
        appointments.value[appointmentIndex].is_paid = true
        appointments.value[appointmentIndex].payment_status = 'completed'
      }
    }
    
    selectedAppointments.value = []
    
    logger.debug('✅ All selected appointments marked as paid')
    await loadUserAppointments()
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error marking all as paid:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Markieren aller Termine als bezahlt: ${errorMessage}`)
  } finally {
    isUpdatingPayment.value = false
  }
}

// Lifecycle
onMounted(async () => {
  isLoading.value = true
  error.value = null

  try {
    await loadUserDetails()
    await loadUserAppointments()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error during initial load:', err)
    if (!error.value) {
      error.value = errorMessage
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.invoice-modal-input {
  @apply w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300;
}
</style>