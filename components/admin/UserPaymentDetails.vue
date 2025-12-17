<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
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
            
            <div>
              <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                👤 {{ displayName }}
              </h1>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-2 sm:space-x-3">        
            <button 
              :disabled="isLoading"
              class="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              @click="refreshData"
            >
              <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <svg v-else class="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span class="hidden sm:inline">{{ isLoading ? 'Laden...' : 'Aktualisieren' }}</span>
              <span class="sm:hidden">{{ isLoading ? '...' : '↻' }}</span>
            </button>
          </div>
        </div>
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
        <div 
          v-if="showInvoiceModal"
          class="fixed inset-0 z-50 overflow-y-auto"
          @click="handleModalClick"
        >
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"/>
            
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full mx-4 max-h-[90vh] overflow-y-auto sm:mx-0 sm:my-8 sm:align-middle sm:max-w-5xl">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div class="flex flex-col sm:flex-row sm:items-start">
                  <div class="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mx-auto sm:mx-0">
                    <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Rechnung erstellen
                    </h3>
                    
                    <div class="space-y-6">
                      <!-- Rechnungsübersicht -->
                      <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                          <h4 class="text-sm sm:text-base font-medium text-gray-900">Rechnungsübersicht</h4>
                          <span class="text-base sm:text-lg font-semibold text-green-600">
                            {{ formatCurrency(selectedAppointmentsTotal) }}
                          </span>
                        </div>
                        
                        <div class="text-xs sm:text-sm text-gray-600 mb-3">
                          {{ selectedAppointments.length }} Termin{{ selectedAppointments.length > 1 ? 'e' : '' }}
                        </div>
                        
                        <!-- Verrechnete Lektionen mit detaillierter Preisaufschlüsselung -->
                        <div class="max-h-64 overflow-y-auto">
                          <div class="space-y-2">
                            <div 
                              v-for="appointmentId in selectedAppointments" 
                              :key="appointmentId"
                              class="bg-white border border-gray-200 rounded-md p-2 sm:p-3"
                            >
                              <div class="space-y-2">
                                <!-- Haupttermin -->
                                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div class="flex-1 min-w-0">
                                    <h5 class="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                      {{ getAppointmentById(appointmentId)?.event_type_code ? getEventTypeLabel(getAppointmentById(appointmentId)?.event_type_code) : 'Lektion' }}
                                    </h5>
                                    <div class="text-xs text-gray-500 space-y-0.5">
                                      <div class="truncate">Mit {{ getAppointmentById(appointmentId)?.staff?.first_name || 'Unknown' }} • {{ getAppointmentById(appointmentId)?.type || 'N/A' }}</div>
                                      <div class="truncate">{{ formatDate(getAppointmentById(appointmentId)?.start_time) }} - {{ formatTime(getAppointmentById(appointmentId)?.start_time) }} • {{ getAppointmentById(appointmentId)?.duration_minutes }}min</div>
                                    </div>
                                  </div>
                                  <div class="text-right whitespace-nowrap">
                                    <div class="text-xs sm:text-sm font-semibold text-green-600">
                                      {{ formatCurrency(calculateAppointmentAmount(getAppointmentById(appointmentId) || {} as Appointment)) }}
                                    </div>
                                  </div>
                                </div>
                                
                                <!-- Detaillierte Preisaufschlüsselung -->
                                <div class="border-t border-gray-100 pt-1 space-y-0.5 text-xs">
                                  <!-- Lektion-Preis -->
                                  <div
v-if="(getAppointmentById(appointmentId)?.lesson_price || 0) > 0" 
                                       class="flex justify-between">
                                    <span class="text-gray-600">Lektion:</span>
                                    <span class="text-gray-800">{{ formatCurrency(getAppointmentById(appointmentId)?.lesson_price || 0) }}</span>
                                  </div>
                                  
                                  <!-- Admin-Fee -->
                                  <div
v-if="(getAppointmentById(appointmentId)?.admin_fee || 0) > 0" 
                                       class="flex justify-between">
                                    <span class="text-gray-600">Admin:</span>
                                    <span class="text-gray-800">{{ formatCurrency(getAppointmentById(appointmentId)?.admin_fee || 0) }}</span>
                                  </div>
                                  
                                  <!-- Einzelne Produkte auflisten -->
                                  <div
v-if="getAppointmentById(appointmentId)?.products && (getAppointmentById(appointmentId)?.products || []).length > 0" 
                                       class="space-y-0.5">
                                    <div
v-for="product in (getAppointmentById(appointmentId)?.products || [])" :key="product?.name || 'unknown'" 
                                         class="flex justify-between">
                                      <span class="text-gray-600 truncate">{{ product?.name || 'Produkt' }}</span>
                                      <span class="text-gray-800">{{ formatCurrency(product?.price || 0) }}</span>
                                    </div>
                                  </div>
                                  
                                  <!-- Rabatte -->
                                  <div
v-if="(getAppointmentById(appointmentId)?.discount_amount || 0) > 0" 
                                       class="flex justify-between text-green-600">
                                    <span>Rabatt:</span>
                                    <span>-{{ formatCurrency(getAppointmentById(appointmentId)?.discount_amount || 0) }}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Rechnungsadresse Toggle -->
                      <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <div class="flex items-center justify-between mb-4">
                          <h4 class="text-sm sm:text-base font-medium text-gray-900">Rechnungsadresse</h4>
                          
                          <!-- Toggle Switch -->
                          <div class="flex items-center space-x-2">
                            <span class="text-xs sm:text-sm font-medium" :class="useCustomBillingAddress ? 'text-gray-500' : 'text-gray-900'">Kundenadresse</span>
                            <button
                              type="button"
                              @click="useCustomBillingAddress = !useCustomBillingAddress"
                              :class="[
                                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                                useCustomBillingAddress ? 'bg-blue-600' : 'bg-gray-300'
                              ]"
                            >
                              <span
                                :class="[
                                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                  useCustomBillingAddress ? 'translate-x-6' : 'translate-x-1'
                                ]"
                              />
                            </button>
                            <span class="text-xs sm:text-sm font-medium" :class="useCustomBillingAddress ? 'text-gray-900' : 'text-gray-500'">Rechnungsadresse</span>
                          </div>
                        </div>
                        
                        <!-- Kundenadresse View -->
                        <div v-if="!useCustomBillingAddress" class="space-y-2">
                          <div v-if="companyBillingAddress" class="grid grid-cols-1 gap-3 text-xs sm:text-sm">
                            <div class="break-words">
                              <span class="font-medium text-gray-600">{{ companyBillingAddress.company_name }}</span><br>
                              <span class="text-gray-600">{{ companyBillingAddress.contact_person }}</span><br>
                              <span class="text-gray-600">{{ companyBillingAddress.street }} {{ companyBillingAddress.street_number || '' }}</span><br>
                              <span class="text-gray-600">{{ companyBillingAddress.zip }} {{ companyBillingAddress.city }}</span>
                            </div>
                            <div class="break-words">
                              <span class="font-medium text-gray-600">E-Mail: </span>
                              <span class="text-gray-600">{{ companyBillingAddress.email }}</span><br>
                              <span v-if="companyBillingAddress.phone" class="font-medium text-gray-600">Telefon: </span>
                              <a v-if="companyBillingAddress.phone" :href="`tel:${companyBillingAddress.phone}`" class="text-blue-600 hover:text-blue-800">{{ companyBillingAddress.phone }}</a><br>
                              <span v-if="companyBillingAddress.vat_number" class="font-medium text-gray-600">MwSt: </span> 
                              <span v-if="companyBillingAddress.vat_number" class="text-gray-600">{{ companyBillingAddress.vat_number }}</span>
                            </div>
                          </div>
                          
                          <div v-else class="text-xs sm:text-sm text-gray-600 break-words">
                            <p class="mb-1">Keine Firmenrechnungsadresse hinterlegt.</p>
                            <p>Die Rechnung wird an: <span class="font-medium">{{ displayEmail }}</span></p>
                          </div>
                        </div>
                        
                        <!-- Custom Rechnungsadresse View -->
                        <div v-else class="space-y-3">
                          <div>
                            <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Firmenname (optional)</label>
                            <input
                              v-model="customBillingCompanyName"
                              type="text"
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Firmenname"
                            >
                          </div>
                          
                          <div>
                            <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Kontaktperson *</label>
                            <input
                              v-model="customBillingContactPerson"
                              type="text"
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Vorname Nachname"
                            >
                          </div>
                          
                          <div>
                            <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                            <input
                              v-model="customBillingEmail"
                              type="email"
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="email@beispiel.ch"
                            >
                          </div>
                        </div>
                      </div>
                      
                      <!-- E-Mail-Versand -->
                      <div class="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <h4 class="text-sm sm:text-base font-medium text-gray-900 mb-2">E-Mail-Versand</h4>
                        
                        <div class="space-y-2">
                          <div>
                            <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                            <input
                              v-model="invoiceEmail"
                              type="email"
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              :placeholder="useCustomBillingAddress ? customBillingEmail || 'email@beispiel.ch' : (companyBillingAddress?.email || displayEmail)"
                            >
                          </div>
                          
                          <div>
                            <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Betreff (optional)</label>
                            <input
                              v-model="invoiceSubject"
                              type="text"
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Rechnung für Fahrstunden"
                            >
                          </div>
                          
                          <div>
                            <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nachricht (optional)</label>
                            <textarea
                              v-model="invoiceMessage"
                              rows="2"
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              placeholder="Ihre Nachricht..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col gap-2 sm:flex-row-reverse sm:gap-0">
                <button
                  type="button"
                  :disabled="isCreatingInvoice"
                  class="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 transition-colors"
                  @click="sendToAccounto"
                >
                  <svg v-if="isCreatingInvoice" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span v-else>An Accounto</span>
                </button>
                
                <button
                  type="button"
                  :disabled="isCreatingInvoice"
                  class="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-2 bg-green-600 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 sm:ml-3 transition-colors"
                  @click="sendDirectEmail"
                >
                  <svg v-if="isCreatingInvoice" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span v-else>Email</span>
                </button>
                
                <button
                  type="button"
                  :disabled="isCreatingInvoice"
                  class="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-2 bg-purple-600 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 sm:ml-3 transition-colors"
                  @click="prepareForPrint"
                >
                  <svg v-if="isCreatingInvoice" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span v-else>PDF</span>
                </button>
                
                <button
                  type="button"
                  :disabled="isCreatingInvoice"
                  class="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-2 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 sm:ml-3 transition-colors"
                  @click="createInvoiceInDatabase"
                >
                  <svg v-if="isCreatingInvoice" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span v-else>Speichern + PDF</span>
                </button>
                
                <button
                  type="button"
                  class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-3 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  @click="showInvoiceModal = false"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
        
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
                  <span
class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
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
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
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
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
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
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
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
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clip-rule="evenodd"/>
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
                  <span
class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
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
                      <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
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
                    <a v-if="companyBillingAddress.phone" :href="`tel:${companyBillingAddress.phone}`" class="text-blue-600 hover:text-blue-800">{{ companyBillingAddress.phone }}</a><br>
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
              <div class="flex flex-wrap gap-2">
                <button
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'all' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                  @click="appointmentFilter = 'all'"
                >
                  Alle ({{ totalAppointments }})
                </button>
                <button
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                  @click="appointmentFilter = 'paid'"
                >
                  Bezahlt ({{ paidAppointments }})
                </button>
                <button
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'unpaid' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                  @click="appointmentFilter = 'unpaid'"
                >
                  Unbezahlt ({{ unpaidAppointments }})
                </button>
                <button
                  v-if="failedAppointments > 0"
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'failed' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                  @click="appointmentFilter = 'failed'"
                >
                  ❌ Fehlgeschlagen ({{ failedAppointments }})
                </button>
                <button
                  :class="[
                    'px-3 py-1 text-sm rounded-md font-medium',
                    appointmentFilter === 'deleted' 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  ]"
                  @click="appointmentFilter = 'deleted'"
                >
                  🗑️ Gelöscht ({{ deletedAppointments }})
                </button>
              </div>
            </div>
          </div>
          
          <div class="overflow-x-auto">
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
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum & Zeit
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Termin
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dauer
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zahlungsmethode
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zahlungsstatus
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
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
                    <span
class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusClass(appointment.status)">
                      {{ getStatusLabel(appointment.status) }}
                    </span>
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
              Bestätigen
            </button>
            <button
              type="button"
              class="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              @click="cancelAction"
            >
              Abbrechen
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
import { getSupabase } from '~/utils/supabase'
import { useAccounto } from '~/composables/useAccounto'
import { useInvoices } from '~/composables/useInvoices'
import Toast from '~/components/Toast.vue'

// Generisches Logo für PDFs - wird durch Tenant-Logo ersetzt
const GENERIC_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iMTIiIGZpbGw9IiM2NDlFRkYiLz4KPHRleHQgeD0iNTAiIHk9IjYwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+TG9nbzwvdGV4dD4KPC9zdmc+Cg=='

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
const supabase = getSupabase()
const userId = route.params.id as string

// Reactive state
const isLoading = ref(true)
const error = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
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

const formattedTotalUnpaidAmount = computed(() => {
  return formatCurrency(totalUnpaidAmount.value)
})

const filteredAppointments = computed(() => {
  switch (appointmentFilter.value) {
    case 'paid':
      return appointments.value.filter(apt => apt.is_paid && !apt.deleted_at)
    case 'unpaid':
      return appointments.value.filter(apt => !apt.is_paid && apt.payment_status !== 'failed' && !apt.deleted_at && apt.status !== 'cancelled')
    case 'failed':
      return appointments.value.filter(apt => apt.payment_status === 'failed' && !apt.deleted_at)
    case 'deleted':
      return appointments.value.filter(apt => apt.deleted_at)
    default:
      return appointments.value.filter(apt => !apt.deleted_at && apt.status !== 'cancelled')
  }
})

// Methods
const loadEventTypes = async (tenantId: string) => {
  try {
    const { data, error } = await supabase
      .from('event_types')
      .select('code, name')
      .eq('tenant_id', tenantId)
    
    if (error) throw error
    eventTypes.value = data || []
  } catch (err) {
    console.warn('Could not load event types:', err)
  }
}

const getEventTypeLabel = (code?: string): string => {
  if (!code) return 'Unbekannt'
  const eventType = eventTypes.value.find(et => et.code === code)
  return eventType?.name || code
}

const refreshData = async () => {
  await Promise.all([
    loadUserDetails(),
    loadUserAppointments(),
    loadCompanyBillingAddress()
  ])
}

const closeInvoiceModal = () => {
  showInvoiceModal.value = false
}

const handleModalClick = (event: Event) => {
  // Prüfe ob der Click auf den Hintergrund war
  if (event.target === event.currentTarget) {
    closeInvoiceModal()
  }
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
        is_active,
        tenant_id
      `)
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(userError.message)
    }

    userDetails.value = data
    logger.debug('✅ User details loaded:', data)

    // Load event types for this tenant
    if (data?.tenant_id) {
      await loadEventTypes(data.tenant_id)
    }

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error loading user details:', errorMessage)
    error.value = errorMessage
  }
}

const loadUserAppointments = async () => {
  try {
    // Lade Termine und Zahlungen separat
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        type,
        deleted_at,
        event_type_code,
        staff_id
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError

    // Lade Staff-Informationen separat
    const staffIds = appointmentsData?.map(apt => apt.staff_id).filter(Boolean) || []
    const staffMap = new Map<string, any>()
    
    if (staffIds.length > 0) {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', staffIds)
      
      if (!staffError && staffData) {
        staffData.forEach(staff => {
          staffMap.set(staff.id, staff)
        })
      }
    }

    // Füge Staff-Infos in Appointments ein
    appointmentsData?.forEach((apt: any) => {
      if (apt.staff_id && staffMap.has(apt.staff_id)) {
        apt.staff = staffMap.get(apt.staff_id)
      }
    })

    // Lade Zahlungen für diese Termine mit allen Preis-Details
    const appointmentIds = appointmentsData?.map(apt => apt.id) || []
    let paymentsData: Payment[] = []
    
    if (appointmentIds.length > 0) {
      // Lade alle Spalten um zu sehen was verfügbar ist
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('appointment_id', appointmentIds)
      
      if (paymentsError) throw paymentsError
      paymentsData = payments || []
    }

    // OPTIMIZATION: Batch load all products and discounts at once using payment_items
    let allProducts: any[] = []
    let allDiscounts: any[] = []
    
    if (appointmentIds.length > 0) {
      // Zuerst: Payment IDs für alle Appointments finden
      const paymentIds = paymentsData.map(p => p.id).filter(Boolean)
      
      if (paymentIds.length > 0) {
        // ✅ Lade ALLE payment_items (Produkte UND Rabatte) in einer Abfrage
        const { data: paymentItemsData, error: paymentItemsError } = await supabase
          .from('payment_items')
        .select(`
          id,
            payment_id,
            item_type,
            product_id,
            discount_id,
            quantity,
            unit_price_rappen,
            total_price_rappen,
            description,
            products (
              id,
              name,
              description
            ),
            discounts (
              id,
              code,
              description
          )
        `)
          .in('payment_id', paymentIds)
      
        if (!paymentItemsError && paymentItemsData) {
          // Erstelle Payment-zu-Appointment Mapping
          const paymentToAppointment = new Map<string, string>()
          paymentsData.forEach(p => {
            if (p.id && p.appointment_id) {
              paymentToAppointment.set(p.id, p.appointment_id)
            }
          })
          
          // Verarbeite payment_items und trenne Produkte und Rabatte
          paymentItemsData.forEach((item: any) => {
            const appointmentId = paymentToAppointment.get(item.payment_id)
            if (!appointmentId) return
            
            if (item.item_type === 'product') {
              const productData = item.products
              const productName = productData?.name || item.description || 'Unbekanntes Produkt'
              
              allProducts.push({
                appointment_id: appointmentId,
                id: item.id,
                quantity: item.quantity,
                unit_price_rappen: item.unit_price_rappen,
                total_price_rappen: item.total_price_rappen,
                product_id: item.product_id,
                products: { name: productName }
              })
            } else if (item.item_type === 'discount') {
              const discountData = item.discounts
              const discountReason = discountData?.description || item.description || 'Rabatt'
              
              allDiscounts.push({
                appointment_id: appointmentId,
                id: item.id,
                amount_rappen: Math.abs(item.total_price_rappen || 0), // Rabatte sind negativ gespeichert
                discount_type: discountData?.code || 'custom',
                reason: discountReason
            })
          }
        })
        
          logger.debug('✅ Loaded from payment_items:', allProducts.length, 'products,', allDiscounts.length, 'discounts')
        } else if (paymentItemsError) {
          console.warn('⚠️ Error loading payment_items:', paymentItemsError)
        }
      }
    }

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
          console.warn('⚠️ No products found in batch load for appointment', appointment.id, 'but hasProducts is true')
          // Fallback: Versuche payment_items direkt zu laden
          if (payment?.id) {
            const { data: fallbackItems, error: fallbackItemsError } = await supabase
              .from('payment_items')
              .select(`
                id,
                item_type,
                product_id,
                quantity,
                unit_price_rappen,
                total_price_rappen,
                description,
                products (
                  id,
                  name
                )
              `)
              .eq('payment_id', payment.id)
              .eq('item_type', 'product')
            
            if (!fallbackItemsError && fallbackItems && fallbackItems.length > 0) {
              products = fallbackItems.map((item: any) => {
                const productData = item.products
                const productName = productData?.name || item.description || 'Unbekanntes Produkt'
                
                return {
                  name: productName,
                price: (item.total_price_rappen || 0) / 100,
                quantity: item.quantity || 1,
                total_price: (item.total_price_rappen || 0) / 100
                }
              }).filter(p => p.name !== 'Unbekanntes Produkt')
              
              if (products.length > 0) {
                logger.debug('✅ Loaded products from fallback query:', products)
              }
            }
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
        discount_amount: discountAmount
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
    logger.debug('✅ Company billing address loaded:', data)

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.warn('Warning loading billing address:', errorMessage)
    // Don't set error, billing address is optional
  }
}

const calculateAppointmentAmount = (appointment: Appointment): number => {
  // Verwende total_amount aus payments (bereits berechneter Gesamtbetrag)
  if (appointment.total_amount !== undefined) {
    return appointment.total_amount
  }
  
  // Fallback: Berechne aus den einzelnen Komponenten
  const lessonPrice = appointment.lesson_price || 0
  const adminFee = appointment.admin_fee || 0
  const productsPrice = appointment.products_price || 0
  const discountAmount = appointment.discount_amount || 0
  
  const subtotal = lessonPrice + adminFee + productsPrice
  const total = Math.max(0, subtotal - discountAmount)
  
  return total
}

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
      // Aktualisiere den Zahlungsstatus
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'completed' })
        .eq('id', payment.id)
      
      if (updateError) throw updateError
      
      // Cache invalidieren für diese spezifische Zahlung
      await supabase
        .from('payments')
        .select('*')
        .eq('id', payment.id)
        .single()
      
      logger.debug('✅ Payment updated to completed:', payment.id)
    } else {
      // Erstelle eine neue Zahlung
      const { error: createError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          user_id: userId,
          payment_status: 'completed',
          payment_method: 'cash',
          total_amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100)
        })
      
      if (createError) throw createError
      
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
      // Aktualisiere den Zahlungsstatus
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'pending' })
        .eq('id', payment.id)
        
      if (updateError) throw updateError
      
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
      // Aktualisiere die Zahlungsmethode
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_method: newMethod })
        .eq('id', payment.id)
      
      if (updateError) throw updateError
      
      logger.debug('✅ Payment method updated:', appointment.id, newMethod)
    } else {
      // Erstelle eine neue Zahlung
      const { error: createError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          user_id: userId,
          payment_status: 'pending',
          payment_method: newMethod,
          total_amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100)
        })
      
      if (createError) throw createError
      
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
      // Setze den Zahlungsstatus auf "pending" zurück
      const { error: updateError } = await supabase
        .from('payments')
        .update({ payment_status: 'pending' })
        .eq('id', payment.id)
      
      if (updateError) throw updateError
      
      logger.debug('✅ Payment status reset to pending:', appointment.id)
    } else {
      // Erstelle eine neue Zahlung mit Status "pending"
      const { error: createError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointment.id,
          user_id: userId,
          payment_status: 'pending',
          payment_method: 'cash',
          total_amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100)
        })
      
      if (createError) throw createError
      
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
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: businessUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser?.id)
      .single()
    
    // Soft-Delete: Markiere die zugehörige Zahlung als gelöscht
    // Hinweis: Die Rechnung bleibt bestehen, wird aber aktualisiert (stornierte Payments anzeigen, Total neu berechnen)
    const { error: deletePaymentsError } = await supabase
      .from('payments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: businessUser?.id,
        deletion_reason: 'Appointment deleted from admin panel'
      })
      .eq('appointment_id', appointment.id)
    
    if (deletePaymentsError) throw deletePaymentsError
    
    // Soft-Delete: Markiere den Termin als gelöscht
    const { error: softDeleteError } = await supabase
      .from('appointments')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: businessUser?.id,
        deletion_reason: 'Manual deletion from admin panel'
      })
      .eq('id', appointment.id)
    
    if (softDeleteError) throw softDeleteError
    
    // Aktualisiere den lokalen Termin-Status
    const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointment.id)
    if (appointmentIndex !== -1) {
      appointments.value[appointmentIndex].deleted_at = new Date().toISOString()
    }
    
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
    // Wiederherstellen: Entferne deleted_at Markierung
    const { error: restoreError } = await supabase
      .from('appointments')
      .update({ deleted_at: null })
      .eq('id', appointment.id)
    
    if (restoreError) throw restoreError
    
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
    // Find the payment record for this appointment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, invoice_number')
      .eq('appointment_id', appointment.id)
      .single()
    
    if (paymentError || !payment) {
      console.error('❌ Payment not found for appointment:', appointment.id)
      showErrorToast('Fehler', 'Zahlung nicht gefunden')
      return
    }
    
    if (!payment.invoice_number) {
      showErrorToast('Fehler', 'Keine Rechnung für diese Zahlung vorhanden')
      return
    }
    
    logger.debug('📥 Downloading invoice:', payment.invoice_number)
    
    // Fetch the invoice from the invoices table
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', payment.invoice_number)
      .single()
    
    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', payment.invoice_number)
      showErrorToast('Fehler', 'Rechnung nicht gefunden')
      return
    }
    
    // Generate PDF for the invoice
    const result = await $fetch('/api/invoices/download', {
      method: 'POST',
      body: {
        invoiceId: invoice.id
      }
    })
    
    if (result?.pdfUrl) {
      // Open PDF in new window
      window.open(result.pdfUrl, '_blank')
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

const switchToCash = async (appointment: Appointment) => {
  openInvoiceMenu.value = null
  
  showConfirmation(
    'Zu Bar bezahlt wechseln',
    `Möchtest du die Zahlung für "${appointment.title}" zu "Bar bezahlt" wechseln?`,
    async () => {
      isUpdatingPayment.value = true
      try {
        const { error } = await supabase
          .from('payments')
          .update({ 
            payment_method: 'cash',
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('appointment_id', appointment.id)
        
        if (error) throw error
        
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
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: businessUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser?.id)
      .single()
    
    // Soft-Delete payments associated with this appointment
    const { error: deletePaymentsError } = await supabase
      .from('payments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: businessUser?.id,
        deletion_reason: 'Appointment permanently deleted from admin panel'
      })
      .eq('appointment_id', appointment.id)
    
    if (deletePaymentsError) throw deletePaymentsError
    
    // Soft-Delete the appointment itself
    const { error: deleteAppointmentError } = await supabase
      .from('appointments')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: businessUser?.id,
        deletion_reason: 'Permanent deletion from admin panel'
      })
      .eq('id', appointment.id)
    
    if (deleteAppointmentError) throw deleteAppointmentError
    
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

const findPaymentForAppointment = async (appointmentId: string, bypassCache: boolean = false): Promise<Payment | null> => {
  try {
    // Cache umgehen durch unique AbortSignal
    const _abortController = bypassCache ? new AbortController() : undefined
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }
    
    return payments || null
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
const showConfirmation = (title: string, message: string, action: () => void) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmAction.value = action
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
  if (confirmAction.value) {
    confirmAction.value()
  }
  showConfirmModal.value = false
  confirmAction.value = null
}

const cancelAction = () => {
  showConfirmModal.value = false
  confirmAction.value = null
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
    invoiceMessage.value = `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung für die durchgeführten Fahrstunden.\n\nMit freundlichen Grüßen\nIhr Driving Team`
    
    // Zeige das Rechnungs-Modal
    showInvoiceModal.value = true
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error creating invoice:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Erstellen der Rechnung: ${errorMessage}`)
  }
}

const sendToAccounto = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isCreatingInvoice.value = true
  
  try {
    logger.debug('🏦 Sending invoice to Accounto...')
    
    // Sammle alle ausgewählten Termine
    const selectedAppointmentData = selectedAppointments.value.map(appointmentId => {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) return null
      
      return {
        id: appointment.id,
        title: appointment.title,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        amount: calculateAppointmentAmount(appointment)
      }
    }).filter((apt): apt is NonNullable<typeof apt> => apt !== null)
    
    if (selectedAppointmentData.length === 0) {
      throw new Error('Keine gültigen Termine gefunden')
    }
    
    // Kundendaten aus userDetails
    const customerData = {
      firstName: userDetails.value?.first_name || '',
      lastName: userDetails.value?.last_name || '',
      email: userDetails.value?.email || '',
      phone: userDetails.value?.phone || ''
    }
    
    // Rechnungsdaten vorbereiten
    const invoiceRequest = {
      appointments: selectedAppointmentData,
      customerData,
      billingAddress: companyBillingAddress.value ? {
        company_name: companyBillingAddress.value.company_name,
        contact_person: companyBillingAddress.value.contact_person,
        street: companyBillingAddress.value.street,
        street_number: companyBillingAddress.value.street_number || undefined,
        zip: companyBillingAddress.value.zip,
        city: companyBillingAddress.value.city,
        vat_number: companyBillingAddress.value.vat_number || undefined,
        email: companyBillingAddress.value.email,
        phone: companyBillingAddress.value.phone || undefined
      } : undefined,
      emailData: {
        email: invoiceEmail.value || companyBillingAddress.value?.email || userDetails.value?.email || '',
        subject: invoiceSubject.value,
        message: invoiceMessage.value
      },
      totalAmount: selectedAppointmentsTotal.value
    }
    
    logger.debug('📋 Accounto invoice request prepared:', invoiceRequest)
    
    // Accounto API aufrufen
    const { createInvoiceAndSend: accountoCreateInvoice } = useAccounto()
    const result = await accountoCreateInvoice(invoiceRequest)
    
    if (!result.success) {
      throw new Error(result.error || 'Accounto Rechnungserstellung fehlgeschlagen')
    }
    
    const totalAmount = formatCurrency(selectedAppointmentsTotal.value)
    const appointmentCount = selectedAppointments.value.length
    
    showSuccessToast(
      '✅ Rechnung erfolgreich gesendet',
      `Rechnungsnummer: ${result.invoiceNumber}\nAnzahl Termine: ${appointmentCount}\nGesamtbetrag: ${totalAmount}\n\nDie Rechnung wurde in Accounto erstellt und ist dort verfügbar.`
    )
    
    // Modal schließen und Auswahl aufheben
    showInvoiceModal.value = false
    selectedAppointments.value = []
    
    // E-Mail-Felder zurücksetzen
    useCustomBillingAddress.value = false
    customBillingCompanyName.value = ''
    customBillingContactPerson.value = ''
    customBillingEmail.value = ''
    invoiceEmail.value = ''
    invoiceSubject.value = ''
    invoiceMessage.value = ''
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error sending to Accounto:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Senden an Accounto: ${errorMessage}`)
  } finally {
    isCreatingInvoice.value = false
  }
}

const sendDirectEmail = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isCreatingInvoice.value = true
  
  try {
    logger.debug('📧 Sending invoice via direct email...')
    
    // Sammle alle ausgewählten Termine
    const selectedAppointmentData = selectedAppointments.value.map(appointmentId => {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) return null
      
      return {
        id: appointment.id,
        title: appointment.title,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        amount: calculateAppointmentAmount(appointment)
      }
    }).filter((apt): apt is NonNullable<typeof apt> => apt !== null)
    
    if (selectedAppointmentData.length === 0) {
      throw new Error('Keine gültigen Termine gefunden')
    }
    
    // Rechnungsdaten für Datenbank vorbereiten
    const invoiceFormData = {
      user_id: userDetails.value?.id || '',
      staff_id: undefined,
      appointment_id: undefined,
      billing_type: (companyBillingAddress.value ? 'company' : 'individual') as 'company' | 'individual',
      billing_company_name: companyBillingAddress.value?.company_name || undefined,
      billing_contact_person: companyBillingAddress.value?.contact_person || undefined,
      billing_email: invoiceEmail.value || companyBillingAddress.value?.email || userDetails.value?.email || '',
      billing_street: companyBillingAddress.value?.street || undefined,
      billing_street_number: companyBillingAddress.value?.street_number || undefined,
      billing_zip: companyBillingAddress.value?.zip || undefined,
      billing_city: companyBillingAddress.value?.city || undefined,
      billing_country: 'CH',
      billing_vat_number: companyBillingAddress.value?.vat_number || undefined,
      subtotal_rappen: selectedAppointmentsTotal.value,
      vat_rate: 7.70,
      discount_amount_rappen: 0,
      notes: invoiceMessage.value || undefined,
      internal_notes: `Direkt verrechnet aus UserPaymentDetails für ${selectedAppointments.value.length} Termine`
    }
    
    // Rechnungspositionen vorbereiten
    const invoiceItems = selectedAppointmentData.map((appointment, index) => ({
      product_name: appointment.title || 'Fahrstunde',
      product_description: `Termin am ${new Date(appointment.start_time).toLocaleDateString('de-CH')}`,
      appointment_id: appointment.id,
      appointment_title: appointment.title,
      appointment_date: appointment.start_time,
      appointment_duration_minutes: appointment.duration_minutes,
      quantity: 1,
      unit_price_rappen: appointment.amount,
      vat_rate: 7.70,
      sort_order: index,
      notes: `Termin: ${appointment.title}`
    }))
    
    logger.debug('📋 Invoice data prepared for database:', { invoiceFormData, invoiceItems })
    
    // Rechnung in Datenbank erstellen
    const { createInvoice } = useInvoices()
    const result = await createInvoice(invoiceFormData, invoiceItems)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    logger.debug('✅ Invoice created in database:', result.invoice_number)
    
    // Alle ausgewählten Termine auf "verrechnet" setzen und Settlement Email versenden
    if (result.data) {
      await updateAppointmentsToInvoiced(selectedAppointments.value, result.data.id, companyBillingAddress.value?.id)
    }
    
    const totalAmount = formatCurrency(selectedAppointmentsTotal.value)
    const appointmentCount = selectedAppointments.value.length
    const email = invoiceEmail.value || companyBillingAddress.value?.email || userDetails.value?.email || ''
    
    showSuccessToast(
      '✅ E-Mail erfolgreich versendet',
      `Rechnungsnummer: ${result.invoice_number}\nAnzahl Termine: ${appointmentCount}\nGesamtbetrag: ${totalAmount}\n\nDie Rechnung wurde in der Datenbank gespeichert und per E-Mail an ${email} versendet.`
    )
    
    // Modal schließen und Auswahl aufheben
    showInvoiceModal.value = false
    selectedAppointments.value = []
    
    // E-Mail-Felder zurücksetzen
    useCustomBillingAddress.value = false
    customBillingCompanyName.value = ''
    customBillingContactPerson.value = ''
    customBillingEmail.value = ''
    invoiceEmail.value = ''
    invoiceSubject.value = ''
    invoiceMessage.value = ''
    
    // Reload appointments to refresh the status from database
    await loadUserAppointments()
    
    // Daten aktualisieren
    await refreshData()
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error sending direct email:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim direkten E-Mail-Versand: ${errorMessage}`)
  } finally {
    isCreatingInvoice.value = false
  }
}

// Neue Funktion: Rechnung in Datenbank speichern und PDF generieren
const createInvoiceInDatabase = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isCreatingInvoice.value = true
  
  try {
    logger.debug('💾 Creating invoice in database and generating PDF...')
    
    // Sammle alle ausgewählten Termine
    const selectedAppointmentData = selectedAppointments.value.map(appointmentId => {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) return null
      
      return {
        id: appointment.id,
        title: appointment.title,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        amount: calculateAppointmentAmount(appointment)
      }
    }).filter((apt): apt is NonNullable<typeof apt> => apt !== null)
    
    if (selectedAppointmentData.length === 0) {
      throw new Error('Keine gültigen Termine gefunden')
    }
    
    // Rechnungsdaten für Datenbank vorbereiten
    const invoiceFormData = {
      user_id: userDetails.value?.id || '',
      staff_id: undefined, // Optional, wird nicht gesetzt wenn leer
      appointment_id: undefined, // Optional, wird nicht gesetzt wenn leer
      billing_type: (companyBillingAddress.value ? 'company' : 'individual') as 'company' | 'individual',
      billing_company_name: companyBillingAddress.value?.company_name || undefined,
      billing_contact_person: companyBillingAddress.value?.contact_person || undefined,
      billing_email: invoiceEmail.value || companyBillingAddress.value?.email || userDetails.value?.email || '',
      billing_street: companyBillingAddress.value?.street || undefined,
      billing_street_number: companyBillingAddress.value?.street_number || undefined,
      billing_zip: companyBillingAddress.value?.zip || undefined,
      billing_city: companyBillingAddress.value?.city || undefined,
      billing_country: 'CH',
      billing_vat_number: companyBillingAddress.value?.vat_number || undefined,
      subtotal_rappen: selectedAppointmentsTotal.value,
      vat_rate: 7.70,
      discount_amount_rappen: 0,
      notes: invoiceMessage.value || undefined,
      internal_notes: `Erstellt aus UserPaymentDetails für ${selectedAppointments.value.length} Termine`
    }
    
    // Rechnungspositionen vorbereiten
    const invoiceItems = selectedAppointmentData.map((appointment, index) => ({
      product_name: appointment.title || 'Fahrstunde',
      product_description: `Termin am ${new Date(appointment.start_time).toLocaleDateString('de-CH')}`,
      appointment_id: appointment.id,
      appointment_title: appointment.title,
      appointment_date: appointment.start_time,
      appointment_duration_minutes: appointment.duration_minutes,
      quantity: 1,
      unit_price_rappen: appointment.amount,
      vat_rate: 7.70,
      sort_order: index,
      notes: `Termin: ${appointment.title}`
    }))
    
    logger.debug('📋 Invoice data prepared for database:', { invoiceFormData, invoiceItems })
    
    // Rechnung in Datenbank erstellen
    const { createInvoice } = useInvoices()
    const result = await createInvoice(invoiceFormData, invoiceItems)
    
    if (result.error) {
      throw new Error(result.error)
    }
    
    logger.debug('✅ Invoice created in database:', result.invoice_number)
    
    // Alle ausgewählten Termine auf "verrechnet" setzen
    if (result.data) {
      await updateAppointmentsToInvoiced(selectedAppointments.value, result.data.id, companyBillingAddress.value?.id)
    }
    
    // PDF generieren und herunterladen
    const pdfResult = await generateInvoicePDF(result.data as InvoiceData)
    
    if (pdfResult.success) {
      showSuccessToast(
        '✅ Rechnung erfolgreich erstellt',
        `Rechnungsnummer: ${result.invoice_number}\nAnzahl Termine: ${selectedAppointments.value.length}\nGesamtbetrag: ${formatCurrency(selectedAppointmentsTotal.value)}\n\nDie Rechnung wurde in der Datenbank gespeichert, als PDF heruntergeladen und alle Termine auf "verrechnet" gesetzt.`
      )
    } else {
      showSuccessToast(
        '✅ Rechnung erfolgreich erstellt',
        `Rechnungsnummer: ${result.invoice_number}\nAnzahl Termine: ${selectedAppointments.value.length}\nGesamtbetrag: ${formatCurrency(selectedAppointmentsTotal.value)}\n\nDie Rechnung wurde in der Datenbank gespeichert und alle Termine auf "verrechnet" gesetzt. PDF-Generierung fehlgeschlagen: ${pdfResult.error}`
      )
    }
    
    // Modal schließen und Auswahl aufheben
    showInvoiceModal.value = false
    selectedAppointments.value = []
    
    // E-Mail-Felder zurücksetzen
    useCustomBillingAddress.value = false
    customBillingCompanyName.value = ''
    customBillingContactPerson.value = ''
    customBillingEmail.value = ''
    invoiceEmail.value = ''
    invoiceSubject.value = ''
    invoiceMessage.value = ''
    
    // Daten aktualisieren
    await refreshData()
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error creating invoice in database:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler beim Erstellen der Rechnung: ${errorMessage}`)
  } finally {
    isCreatingInvoice.value = false
  }
}

// Hilfsfunktion für PDF-Generierung
const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<PDFResult> => {
  try {
    logger.debug('📄 Generating PDF for invoice:', invoiceData.id)
    
    // PDF-Generierung über API aufrufen
    const response = await $fetch('/api/invoices/download', {
      method: 'POST',
      body: { invoiceId: invoiceData.id }
    }) as { success: boolean; pdfUrl?: string; error?: string }
    
    if (response.success && response.pdfUrl) {
      // PDF herunterladen
      const link = document.createElement('a')
      link.href = response.pdfUrl
      link.download = `rechnung-${invoiceData.invoice_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      return { success: true, pdfUrl: response.pdfUrl }
    } else {
      return { success: false, error: response.error || 'PDF-Generierung fehlgeschlagen' }
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error generating PDF:', error)
    return { success: false, error: errorMessage || 'PDF-Generierung fehlgeschlagen' }
  }
}

// Hilfsfunktion: Termine auf "verrechnet" setzen und Email versenden
const updateAppointmentsToInvoiced = async (appointmentIds: string[], invoiceNumber?: string, companyBillingAddressId?: string) => {
  try {
    logger.debug('🔄 Settling appointments and sending emails:', appointmentIds)
    
    // Verwende neuen Endpoint der Emails versendet
    const result = await $fetch('/api/payments/settle-and-email', {
      method: 'POST',
      body: {
        appointmentIds,
        invoiceNumber,
        companyBillingAddressId
      }
    })
    
    logger.debug('✅ Appointments settled and emails sent:', result)
    return result
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error in updateAppointmentsToInvoiced:', errorMessage)
    throw error
  }
}

const prepareForPrint = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isCreatingInvoice.value = true
  
  try {
    logger.debug('🖨️ Preparing invoice for printing...')
    
    // Sammle alle ausgewählten Termine
    const selectedAppointmentData = selectedAppointments.value.map(appointmentId => {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) return null
      
      return {
        id: appointment.id,
        title: appointment.title,
        start_time: appointment.start_time,
        duration_minutes: appointment.duration_minutes,
        amount: calculateAppointmentAmount(appointment)
      }
    }).filter((apt): apt is NonNullable<typeof apt> => apt !== null)
    
    if (selectedAppointmentData.length === 0) {
      throw new Error('Keine gültigen Termine gefunden')
    }
    
    // Rechnungsdaten für Druck vorbereiten
    const printData = {
      appointments: selectedAppointmentData,
      customerName: `${userDetails.value?.first_name || ''} ${userDetails.value?.last_name || ''}`.trim(),
      totalAmount: selectedAppointmentsTotal.value,
      billingAddress: companyBillingAddress.value,
      printDate: new Date().toLocaleDateString('de-CH')
    }
    
    logger.debug('📋 Print invoice data prepared:', printData)
    
        // PDF mit jsPDF generieren
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    
    // Professionelles PDF-Design nach Vorlage
    const pageWidth = doc.internal.pageSize.width
    const _pageHeight = doc.internal.pageSize.height
    const margin = 20
    const contentWidth = pageWidth - (2 * margin)
    
    // Farben definieren (eure hellblaue Hauptfarbe)
    const primaryColor: [number, number, number] = [100, 150, 255] // Hellblau
    const _accentColor: [number, number, number] = [255, 193, 7]    // Gelb
    const darkColor: [number, number, number] = [33, 37, 41]      // Dunkelgrau
    const lightGray: [number, number, number] = [248, 249, 250]   // Hellgrau
    
    // Logo und Firmen Text oben
    const centerX = pageWidth / 2
    const logoY = 20
    const _textY = 50
    
        // Logo einbetten (links vom Text)
        try {
      const logoWidth = 40  // Größer gemacht
      const logoHeight = 40 // Größer gemacht
      const logoX = centerX - 20 // Zentriert
      
      // SVG-Logo in jsPDF einbetten
      doc.addImage(GENERIC_LOGO_BASE64, 'SVG', logoX, logoY, logoWidth, logoHeight)
    } catch (error) {
      console.warn('Logo konnte nicht geladen werden:', error)
      // Fallback: Einfaches Rechteck als Logo-Ersatz
      doc.setFillColor(...primaryColor)
      doc.rect(centerX - 40, logoY, 80, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Firma', centerX, logoY + 10, { align: 'center' })
    }
    
    // TEXT ENTFERNT - nur noch Logo
    
    // Rechnungsdetails
    let yPos = 70
    
    // "Rechnung an:" Sektion
    doc.setTextColor(...darkColor)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Rechnungsübersicht von:', margin, yPos)
    yPos += 8
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(printData.customerName.toUpperCase(), margin, yPos)
    yPos += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const addressString = printData.billingAddress ? 
      `${printData.billingAddress.street} ${printData.billingAddress.street_number || ''}, ${printData.billingAddress.zip} ${printData.billingAddress.city}` : 
      'Keine Adresse angegeben'
    doc.text(addressString, margin, yPos)
    
    // Rechnungsnummer und Datum rechts
    yPos = 80
    doc.text(`Erstellt am:`, pageWidth - margin - 60, yPos)
    yPos += 8
    doc.text(`${printData.printDate}`, pageWidth - margin - 60, yPos)
    
    yPos += 20
    
    // Einfache, saubere Termin-Auflistung
    yPos += 20
    
    selectedAppointments.value.forEach((appointmentId, index) => {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) return
      
      const amount = calculateAppointmentAmount(appointment)
      const mainDescription = appointment.type || 'Fahrstunde'
      
      // Abwechselnd grau/weiße Zeilen für den gesamten Termin-Bereich
      const termStartY = yPos - 3
      let termEndY = yPos + 12 // Mindesthöhe für Hauptzeile
      
      // Kostenaufschlüsselung vorberechnen um die Gesamthöhe zu ermitteln
      let detailLines = 0
      if (appointment.lesson_price && appointment.lesson_price > 0) detailLines++
      if (appointment.admin_fee && appointment.admin_fee > 0) detailLines++
      if (appointment.products && appointment.products.length > 0) {
        appointment.products.forEach(product => {
          if (product && product.name && product.price) detailLines++
        })
      }
      if (appointment.discount_amount && appointment.discount_amount > 0) detailLines++
      
      // Gesamthöhe des Termins berechnen
      termEndY += detailLines * 8
      
      // Hintergrund für den gesamten Termin-Bereich
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray)
        doc.rect(margin, termStartY, contentWidth, termEndY - termStartY, 'F')
      }
      
      // 1. SPALTE: Nummer und Kategorie (ganz links)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...darkColor)
      doc.text(`${index + 1}. Kategorie: ${mainDescription}`, margin + 10, yPos)
      
      // 2. SPALTE: Zeit und Dauer (in der Mitte)
      const appointmentDate = new Date(appointment.start_time)
      const timeStr = appointmentDate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
      const dateStr = appointmentDate.toLocaleDateString('de-CH')
      const centerX = margin + (contentWidth / 2)
      
      if (appointment.duration_minutes) {
        const durationHours = Math.floor(appointment.duration_minutes / 60)
        const durationMinutes = appointment.duration_minutes % 60
        const durationStr = durationHours > 0 ? 
          `${durationHours}h ${durationMinutes}min` : 
          `${durationMinutes}min`
        doc.text(`${dateStr} um ${timeStr} (${durationStr})`, centerX, yPos, { align: 'center' })
      } else {
        doc.text(`${dateStr} um ${timeStr}`, centerX, yPos, { align: 'center' })
      }
      
      // 3. SPALTE: Preis (ganz rechts)
      doc.text(formatCurrency(amount), pageWidth - margin - 10, yPos, { align: 'right' })
      
      yPos += 12 // Kleinere Zeilen
      
      // Kostenaufschlüsselung mit gleicher Hintergrundfarbe
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      
      if (appointment.lesson_price && appointment.lesson_price > 0) {
        doc.text(`  Lektion: ${formatCurrency(appointment.lesson_price)}`, margin + 40, yPos)
        yPos += 8 // Kleinere Zeilen
      }
      
      if (appointment.admin_fee && appointment.admin_fee > 0) {
        doc.text(`  Admin-Pauschale: ${formatCurrency(appointment.admin_fee)}`, margin + 40, yPos)
        yPos += 8 // Kleinere Zeilen
      }
      
      if (appointment.products && appointment.products.length > 0) {
        appointment.products.forEach(product => {
          if (product && product.name && product.price) {
            doc.text(`  ${product.name}: ${formatCurrency(product.price)}`, margin + 40, yPos)
            yPos += 8 // Kleinere Zeilen
          }
        })
      }
      
      if (appointment.discount_amount && appointment.discount_amount > 0) {
        doc.setTextColor(220, 53, 69)
        doc.text(`  Rabatt: -${formatCurrency(appointment.discount_amount)}`, margin + 40, yPos)
        doc.setTextColor(100, 100, 100)
        yPos += 8 // Kleinere Zeilen
      }
      
      yPos += 6 // Weniger Abstand zwischen Terminen
    })
    
    yPos += 10
    
    // Zusammenfassung rechts
    const summaryX = pageWidth - margin - 120
    const summaryWidth = 120

    
    // TOTAL (blauer Hintergrund)
    doc.setFillColor(...primaryColor)
    doc.rect(summaryX, yPos, summaryWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', summaryX + 5, yPos + 13)
    const total = selectedAppointmentsTotal.value
    doc.text(formatCurrency(total), summaryX + summaryWidth - 5, yPos + 13, { align: 'right' })
    
    yPos += 30

    
  
    
    // PDF speichern
    const fileName = `Rechnung_${printData.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    
    const totalAmount = formatCurrency(selectedAppointmentsTotal.value)
    const appointmentCount = selectedAppointments.value.length
    
    showSuccessToast(
      '📄 PDF erfolgreich erstellt',
      `Die Rechnung für ${appointmentCount} Termine (${totalAmount}) wurde als PDF gespeichert.`
    )
    
    // Modal schließen und Auswahl aufheben
    showInvoiceModal.value = false
    selectedAppointments.value = []
    
    // E-Mail-Felder zurücksetzen
    useCustomBillingAddress.value = false
    customBillingCompanyName.value = ''
    customBillingContactPerson.value = ''
    customBillingEmail.value = ''
    invoiceEmail.value = ''
    invoiceSubject.value = ''
    invoiceMessage.value = ''
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error preparing for print:', err)
    showErrorToast('❌ Fehler aufgetreten', `Fehler bei der Druckvorbereitung: ${errorMessage}`)
  } finally {
    isCreatingInvoice.value = false
  }
}

// Bulk-Aktionen für gelöschte Termine
const restoreAllSelectedAppointments = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isUpdatingPayment.value = true
  try {
    logger.debug('🔄 Restoring all selected deleted appointments:', selectedAppointments.value.length)
    
    for (const appointmentId of selectedAppointments.value) {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) continue
      
      // Wiederherstellen: Entferne deleted_at Markierung
      const { error: restoreError } = await supabase
        .from('appointments')
        .update({ deleted_at: null })
        .eq('id', appointmentId)
      
      if (restoreError) throw restoreError
      
      logger.debug('✅ Appointment restored:', appointmentId)
    }
    
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
    
    for (const appointmentId of selectedAppointments.value) {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) continue
      
      // Lösche zuerst alle zugehörigen Zahlungen
      const { error: deletePaymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('appointment_id', appointmentId)
      
      if (deletePaymentsError) throw deletePaymentsError
      
      // Lösche dann den Termin selbst
      const { error: deleteAppointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
      
      if (deleteAppointmentError) throw deleteAppointmentError
      
      logger.debug('✅ Appointment hard deleted:', appointmentId)
    }
    
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

// Diese Funktion wurde durch prepareForPrint ersetzt

const markAllSelectedAsPaid = async () => {
  if (selectedAppointments.value.length === 0) return
  
  isUpdatingPayment.value = true
  try {
    logger.debug('🔄 Marking all selected appointments as paid:', selectedAppointments.value.length)
    
    for (const appointmentId of selectedAppointments.value) {
      const appointment = getAppointmentById(appointmentId)
      if (!appointment) continue
      
      // Finde die Zahlung für diesen Termin
      const payment = await findPaymentForAppointment(appointmentId)
      
      if (payment) {
        // Aktualisiere den Zahlungsstatus
        const { error: updateError } = await supabase
          .from('payments')
          .update({ payment_status: 'completed' })
          .eq('id', payment.id)
        
        if (updateError) throw updateError
        
        logger.debug('✅ Payment updated to completed:', payment.id)
      } else {
        // Erstelle eine neue Zahlung
        const { error: createError } = await supabase
          .from('payments')
          .insert({
            appointment_id: appointmentId,
            user_id: userId,
            payment_status: 'completed',
            payment_method: 'cash',
            total_amount_rappen: Math.round(calculateAppointmentAmount(appointment) * 100)
          })
        
        if (createError) throw createError
        
        logger.debug('✅ New payment created and marked as completed:', appointmentId)
      }
    }
    
    // Aktualisiere alle ausgewählten Termine lokal
    for (const appointmentId of selectedAppointments.value) {
      const appointmentIndex = appointments.value.findIndex(apt => apt.id === appointmentId)
      if (appointmentIndex !== -1) {
        appointments.value[appointmentIndex].is_paid = true
      }
    }
    
    // Auswahl aufheben
    selectedAppointments.value = []
    
    logger.debug('✅ All selected appointments marked as paid')
    
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
    await Promise.all([
      loadUserAppointments(),
      loadCompanyBillingAddress()
    ])
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