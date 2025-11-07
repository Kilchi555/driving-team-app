<!-- components/CustomerDashboard.vue -->
<!-- In CustomerDashboard.vue Template - im Header Bereich -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <!-- Header -->
      <div class="bg-white shadow-lg border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-lg">
                  {{ getInitials() }}
                </span>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900">
                  Hallo, {{ getFirstName() }}!
                </h1>
              </div>
            </div>
            
            <!-- Nur Refresh Button -->
              <button
                @click="refreshData"
                :disabled="isLoading"
                class="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <!-- ✅ SVG Refresh Icon -->
                <svg 
                  class="w-5 h-5" 
                  :class="{ 'animate-spin': isLoading }" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span class="hidden sm:inline">Aktualisieren</span>
              </button>
          </div>
        </div>
      </div>

    <!-- ✅ BANNER: Bestätigung erforderlich -->
    <div v-if="showContent && pendingConfirmations.length > 0" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div 
        @click="showConfirmationModal = true"
        class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg p-6 cursor-pointer hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-[1.01]"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4 flex-1">
            <div class="bg-white bg-opacity-20 rounded-full p-3">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold mb-1">
                {{ pendingConfirmations.length }} {{ pendingConfirmations.length === 1 ? 'Termin' : 'Termine' }} benötigt{{ pendingConfirmations.length === 1 ? '' : '' }} Ihre Bestätigung
              </h3>
            </div>
          </div>
          <div class="ml-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <LoadingLogo size="xl" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-red-800">Fehler beim Laden der Daten</h3>
            <p class="mt-2 text-red-700">{{ error }}</p>
            <button 
              @click="retryLoad" 
              class="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="showContent" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6">
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        
        <!-- Zahlungsübersicht -->
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border" 
             :class="unpaidAppointments.length > 0 ? 'border-yellow-100' : 'border-green-100'">
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                   :class="unpaidAppointments.length > 0 ? 'bg-yellow-100' : 'bg-green-100'">
                <svg v-if="unpaidAppointments.length > 0" class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <svg v-else class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-sm font-medium text-gray-500">
                {{ unpaidAppointments.length > 0 ? 'Offene Zahlungen' : 'Zahlungsstatus' }}
              </h3>
            </div>
            
            <div class="flex-1">
              <!-- Loading State für Zahlungsübersicht -->
              <div v-if="paymentsLoading" class="text-center">
                <LoadingLogo size="md" />
                <p class="text-xs text-gray-500 mt-2">Rechnungen werden geladen...</p>
              </div>
              
              <!-- Zahlungsdaten anzeigen -->
              <div v-else>
                <div v-if="unpaidAppointments.length > 0">
                  <p class="text-3xl font-bold text-yellow-600">{{ unpaidAppointments.length }}</p>
                  <p class="text-xs text-red-500 mt-1">
                    CHF {{ (totalUnpaidAmount / 100).toFixed(2) }} offen
                  </p>
                  
                  <!-- Zahlungsdetails -->
                  <div class="mt-3 space-y-2 text-xs">
                    <div v-for="payment in unpaidAppointments.slice(0, 3)" :key="payment.id" class="border-t border-gray-100 pt-2">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-gray-600">CHF {{ ((payment.total_amount_rappen || 0) / 100).toFixed(2) }}</span>
                        <span v-if="payment.automatic_payment_consent && payment.payment_method_id" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ✓ Automatisch
                        </span>
                        <span v-else-if="payment.automatic_payment_consent && !payment.payment_method_id" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          ⚠️ Einrichtung unvollständig
                        </span>
                        <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Manuell
                        </span>
                      </div>
                      <!-- Automatische Zahlung aktiv -->
                      <div v-if="payment.automatic_payment_consent && payment.payment_method_id && payment.scheduled_payment_date" class="text-gray-500 mt-1">
                        Wird durchgeführt: {{ formatPaymentDate(payment.scheduled_payment_date) }}
                      </div>
                      <!-- Automatische Zahlung aktiviert, aber kein Zahlungsmittel -->
                      <div v-else-if="payment.automatic_payment_consent && !payment.payment_method_id" class="text-orange-600 mt-1">
                        Bitte Zahlungsmittel hinzufügen
                      </div>
                      <!-- Manuelle Zahlung -->
                      <div v-else class="text-gray-500 mt-1">
                        Automatische Zahlung nicht aktiviert
                      </div>
                    </div>
                    <div v-if="unpaidAppointments.length > 3" class="text-gray-500 pt-1">
                      + {{ unpaidAppointments.length - 3 }} weitere
                    </div>
                  </div>
                  
                  <!-- ✅ Zeige überfällige Zahlungen -->
                  <p v-if="overduePayments.length > 0" class="text-xs text-red-700 font-semibold mt-2">
                    ⚠️ {{ overduePayments.length }} {{ overduePayments.length === 1 ? 'überfällig' : 'überfällig' }}
                  </p>
                </div>
                <div v-else>
                  <p class="text-3xl font-bold text-green-600">✓ Bezahlt</p>
                  <p class="text-xs text-green-500 mt-1">
                    Alle {{ paidAppointments.length }} Rechnungen beglichen
                  </p>
                </div>
              </div>
            </div>
            
            <div class="mt-4">
              <button
                @click="navigateToPayments"
                :disabled="paymentsLoading"
                :class="[
                  'w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                  unpaidAppointments.length > 0 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'bg-green-500 text-white hover:bg-green-600',
                  paymentsLoading ? 'opacity-50 cursor-not-allowed' : ''
                ]"
              >
                {{ paymentsLoading ? 'Wird geladen...' : (unpaidAppointments.length > 0 ? 'Jetzt bezahlen' : 'Zahlungsverlauf') }}
              </button>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-green-100">
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-sm font-medium text-gray-500">Kommende Termine</h3>
            </div>
            
            <div class="flex-1">
              <p class="text-3xl font-bold text-gray-900">{{ upcomingAppointments.length }}</p>
              <p class="text-xs text-gray-500 mt-1">Nächster Termin bald</p>
            </div>
            
            <div class="mt-4">
              <button
                @click="showUpcomingLessonsModal = true"
                class="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                Details anzeigen
              </button>
            </div>
          </div>
        </div>

        <!-- Absolvierte Lektionen -->
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-blue-100">
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-3">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-sm font-medium text-gray-500">Absolvierte Lektionen</h3>
            </div>
            
            <div class="flex-1">
              <p class="text-3xl font-bold text-gray-900">{{ completedLessonsCount }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ totalEvaluationsCount }} Bewertungen</p>
            </div>
            
            <div class="mt-4">
              <button
                @click="showEvaluationsModal = true"
                class="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Bewertungen ansehen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Booking Sections -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        <!-- Fahrstunden buchen -->
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-blue-100">
          <div class="p-8 h-full flex flex-col">
            <div class="flex items-center mb-6">
              <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Fahrstunden buchen</h2>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button
                @click="navigateToLessonBooking"
                class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🚗 Fahrstunde buchen
              </button>
            </div>
          </div>
        </div>

        <!-- Kurs buchen -->
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-green-100">
          <div class="p-8 h-full flex flex-col">
            <div class="flex items-center mb-6">
              <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Kurse buchen</h2>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button
                @click="navigateToCourseBooking"
                class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📚 Kurse ansehen
              </button>
            </div>
          </div>
        </div>

        <!-- Lernbereich -->
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-emerald-100">
          <div class="p-8 h-full flex flex-col">
            <div class="flex items-center mb-6">
              <div class="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mr-4">
                <svg class="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 21.5c-2.28 0-4.4-.64-6.16-1.742L12 14z" />
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Lernbereich</h2>
                <p class="text-sm text-gray-600">Themen mit Lerninhalt, die du bereits bearbeitet hast</p>
              </div>
            </div>

            <div class="flex space-x-3">
              <button
                @click="navigateTo('/learning')"
                class="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                📘 Öffnen
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Fahrlehrer Sektion -->
      <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-purple-100 mb-8">
        <div class="p-8">
          <div class="flex items-center mb-6">
            <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <svg class="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Meine Fahrlehrer</h2>
            </div>
          </div>
          
          <!-- Loading State -->
          <div v-if="isLoading" class="text-center py-8">
            <LoadingLogo size="md" />
            <p class="text-gray-500 mt-2">Fahrlehrer werden geladen...</p>
          </div>
          
          <!-- Fahrlehrer Liste -->
          <div v-else-if="instructors && instructors.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="instructor in instructors" 
              :key="instructor.id"
              @click="showInstructorDetails(instructor)"
              class="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200 hover:border-purple-300"
            >
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span class="text-purple-600 font-semibold text-lg">
                    {{ getInstructorInitials(instructor) }}
                  </span>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">{{ instructor.name }}</h3>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
          
          <!-- Keine Fahrlehrer -->
          <div v-else class="text-center py-8">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Noch keine Fahrlehrer</h3>
            <p class="text-gray-600">Buchen Sie Ihre erste Fahrstunde, um Ihre Fahrlehrer kennenzulernen.</p>
          </div>
        </div>
      </div>

      <!-- Reglemente Sektion -->
      <div 
        @click="showReglementeModal = true"
        class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-indigo-100 mb-8 cursor-pointer"
      >
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Reglemente</h3>
                <p class="text-xs text-gray-500">Wichtige Dokumente und Richtlinien</p>
              </div>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="min-h-screen flex items-center justify-center">
      <LoadingLogo size="xl" />
    </div>

    <!-- Reglemente Modal -->
    <div v-if="showReglementeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200 flex-shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Reglemente</h2>
                <p class="text-sm text-gray-600">Wichtige Dokumente und Richtlinien</p>
              </div>
            </div>
            <button 
              @click="showReglementeModal = false"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto flex-1">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              @click="navigateToReglement('datenschutz'); showReglementeModal = false"
              class="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">Datenschutzerklärung</h3>
                  <p class="text-xs text-gray-500 mt-1">Schutz Ihrer persönlichen Daten</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              @click="navigateToReglement('nutzungsbedingungen'); showReglementeModal = false"
              class="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">Nutzungsbedingungen</h3>
                  <p class="text-xs text-gray-500 mt-1">Regeln für die Nutzung der Plattform</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              @click="navigateToReglement('agb'); showReglementeModal = false"
              class="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">AGB</h3>
                  <p class="text-xs text-gray-500 mt-1">Allgemeine Geschäftsbedingungen</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              @click="navigateToReglement('haftung'); showReglementeModal = false"
              class="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">Haftungsausschluss</h3>
                  <p class="text-xs text-gray-500 mt-1">Rechtliche Hinweise zur Haftung</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              @click="navigateToReglement('rueckerstattung'); showReglementeModal = false"
              class="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition-colors border border-gray-200 hover:border-indigo-300"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">Rückerstattung</h3>
                  <p class="text-xs text-gray-500 mt-1">Richtlinien für Rückerstattungen</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ MODAL: Bestätigung mit automatischer Zahlung -->
    <div v-if="showConfirmationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Terminbestätigung</h2>
              </div>
            </div>
            <button 
              @click="showConfirmationModal = false"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Hinweis zur automatischen Zahlung absichtlich entfernt: erscheint erst auf der Bestätigungsseite -->

          <!-- Pending Confirmations List -->
          <div class="space-y-3 mb-6">
            <div 
              v-for="appointment in pendingConfirmations" 
              :key="appointment.id"
              class="border rounded-xl p-2 shadow-sm"
              :class="isOverdue(appointment) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'"
            >
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <!-- Left: Info -->
                <div class="flex-1">
                  <div class="flex items-start sm:items-center sm:space-x-2 mb-1">
                    <div class="flex items-center text-gray-900 font-semibold">
                      <svg class="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {{ formatDateTime(appointment.start_time) }}
                    </div>
                    <span v-if="isOverdue(appointment)" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800 mt-1 sm:mt-0 ml-auto">
                      Überfällig
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center text-sm text-gray-600 gap-x-3 gap-y-1">
                    <span class="inline-flex items-center">
                      <svg class="w-4 h-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3" />
                      </svg>
                      {{ appointment.duration_minutes || 45 }} Minuten
                    </span>
                    <span class="inline-flex items-center">
                      <svg class="w-4 h-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      CHF {{ formatPrice(appointment.total_amount_rappen || 0) }}
                    </span>
                  </div>
                </div>

                <!-- Right: Action -->
                <button
                  @click="confirmAppointment(appointment)"
                  class="w-full sm:w-auto sm:ml-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Jetzt bestätigen
                </button>
              </div>
            </div>
          </div>

             
        </div>
      </div>
    </div>

    <!-- Modals -->
    <EvaluationsOverviewModal 
      :is-open="showEvaluationsModal"
      :lessons="lessons"
      @close="showEvaluationsModal = false"
    />

    <UpcomingLessonsModal 
      :is-open="showUpcomingLessonsModal"
      :lessons="upcomingAppointments"
      @close="showUpcomingLessonsModal = false"
    />

    <!-- Instructor Details Modal -->
    <div v-if="showInstructorModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span class="text-purple-600 font-semibold text-lg">
                  {{ getInstructorInitials(selectedInstructor) }}
                </span>
              </div>
              <div>
                <h2 class="text-xl font-bold text-gray-900">{{ selectedInstructor?.name }}</h2>
                <p class="text-sm text-gray-600">Fahrlehrer</p>
              </div>
            </div>
            <button 
              @click="showInstructorModal = false"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Contact Information -->
          <div class="space-y-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-semibold text-gray-900 mb-3">Kontaktinformationen</h3>
              <div class="space-y-2">
                <div v-if="selectedInstructor?.email" class="flex items-center space-x-3">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a :href="`mailto:${selectedInstructor.email}`" class="text-blue-600 hover:text-blue-800">
                    {{ selectedInstructor.email }}
                  </a>
                </div>
                <div v-if="selectedInstructor?.phone" class="flex items-center space-x-3">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a :href="`tel:${selectedInstructor.phone}`" class="text-blue-600 hover:text-blue-800">
                    {{ selectedInstructor.phone }}
                  </a>
                </div>
                <div v-if="!selectedInstructor?.email && !selectedInstructor?.phone" class="text-gray-500 text-sm">
                  Keine Kontaktinformationen verfügbar
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex space-x-3">
            <button 
              v-if="selectedInstructor?.email"
              @click="openEmail(selectedInstructor.email)"
              class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>E-Mail</span>
            </button>
            <button 
              v-if="selectedInstructor?.phone"
              @click="openPhone(selectedInstructor.phone)"
              class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Anrufen</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Logout Button - At bottom of content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex justify-end">
        <button
          @click="handleLogout"
          :disabled="isLoggingOut"
          class="flex items-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105"
        >
          <svg 
            class="w-5 h-5" 
            :class="{ 'animate-spin': isLoggingOut }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span class="font-medium">{{ isLoggingOut ? 'Wird abgemeldet...' : 'Abmelden' }}</span>
        </button>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
// In CustomerDashboard.vue - ganz oben im script setup:
console.log('🔍 CustomerDashboard Script loaded')
console.log('🔍 Process client:', process.client)
console.log('🔍 Process server:', process.server)

import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import EvaluationsOverviewModal from './EvaluationsOverviewModal.vue'
import UpcomingLessonsModal from './UpcomingLessonsModal.vue'
import { useCustomerPayments } from '~/composables/useCustomerPayments'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

// Composables
const authStore = useAuthStore()
const { user: currentUser, userRole, isClient } = storeToRefs(authStore)

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const appointments = ref<any[]>([])
const locations = ref<any[]>([])
const staff = ref<any[]>([])
const lessons = ref<any[]>([]) 
const showEvaluationsModal = ref(false) 
const showUpcomingLessonsModal = ref(false)
const isLoggingOut = ref(false)
const instructors = ref<any[]>([])
const showInstructorModal = ref(false)
const selectedInstructor = ref<any>(null)

// ✅ State für Bestätigungen
const pendingConfirmations = ref<any[]>([])
const showConfirmationModal = ref(false)
const showReglementeModal = ref(false)
const hasPaymentMethod = ref(false)
const automaticPaymentHoursBefore = ref(24)
const automaticAuthorizationHoursBefore = ref(168) // Standard: 1 Woche vor Termin

// In CustomerDashboard.vue - vor dem Template:
const isServerSide = process.server
const showContent = computed(() => !isServerSide && currentUser.value && isClient.value)

const {
  payments,
  pendingPayments,
  loadPayments,
  isLoading: paymentsLoading,
  error: paymentsError
} = useCustomerPayments()

// Computed properties
const completedLessonsCount = computed(() => {
  return appointments.value?.filter(apt => apt.status === 'completed').length || 0
})

const paidAppointments = computed(() => {
  return appointments.value?.filter(apt => apt.status === 'completed') || []
})

const recentEvaluations = computed(() => {
  // Gruppiere Bewertungen nach Terminen
  const lessonEvaluations: any[] = []
  
  lessons.value?.forEach(lesson => {
    if (lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0) {
      lessonEvaluations.push({
        lesson_id: lesson.id,
        lesson_date: lesson.start_time,
        lesson_title: lesson.title || 'Fahrstunde',
        sort_date: new Date(lesson.start_time).getTime(),
        criteria_evaluations: lesson.criteria_evaluations,
        average_rating: lesson.criteria_evaluations.reduce((sum: number, criteriaEval: any) => sum + criteriaEval.criteria_rating, 0) / lesson.criteria_evaluations.length
      })
    }
  })

  return lessonEvaluations.sort((a, b) => b.sort_date - a.sort_date)
})

const totalEvaluationsCount = computed(() => {
  return lessons.value?.reduce((total, lesson) => {
    return total + (lesson.criteria_evaluations?.length || 0)
  }, 0) || 0
})

const upcomingAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.start_time) > now
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
})

const completedAppointments = computed(() => {
  const now = new Date()
  return appointments.value.filter(apt => 
    new Date(apt.end_time) < now
  ).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
})


// ✅ Computed: Überfällige Bestätigungen (Termin bereits vorbei)
const overdueConfirmations = computed(() => {
  const now = new Date()
  return pendingConfirmations.value.filter(apt => {
    const appointmentDate = new Date(apt.start_time)
    return appointmentDate < now
  })
})

// ✅ Computed: Überfällige Zahlungen (Termin vorbei + nicht bezahlt + pending_confirmation)
const overduePayments = computed(() => {
  const now = new Date()
  return unpaidAppointments.value.filter(apt => {
    // Check if appointment is overdue (start_time in past)
    const appointmentDate = apt.start_time || apt.appointments?.start_time
    if (!appointmentDate) return false
    
    const aptDate = new Date(appointmentDate)
    if (aptDate >= now) return false
    
    // Check if status is pending_confirmation (not confirmed yet)
    const status = apt.status || apt.appointments?.status
    return status === 'pending_confirmation'
  })
})

// ✅ Computed: Prüfung ob Bestätigung überfällig ist
const isOverdue = (appointment: any) => {
  const now = new Date()
  const appointmentDate = new Date(appointment.start_time)
  return appointmentDate < now
}

// ✅ Helper: Format price
const formatPrice = (rappen: number) => {
  if (!rappen || rappen === 0) return '0.00'
  return (rappen / 100).toFixed(2)
}

const unpaidAppointments = computed(() => {
  // Verwende pendingPayments anstatt appointments für offene Rechnungen
  return pendingPayments.value || []
})

const totalUnpaidAmount = computed(() => {
  // ✅ total_amount_rappen enthält bereits alle Gebühren (lesson + admin + products - discount)
  return pendingPayments.value.reduce((sum, payment) => {
    return sum + (payment.total_amount_rappen || 0)
  }, 0)
})

const refreshData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      loadAllData(),
      loadPayments(),
      loadPendingConfirmations(),
      checkPaymentMethod()
    ])
    console.log('✅ Data refreshed')
  } catch (err) {
    console.error('❌ Refresh failed:', err)
  } finally {
    isLoading.value = false
  }
}

const processPendingPayments = async () => {
  if (pendingPayments.value.length === 0) return
  
  try {
    const paymentIds = pendingPayments.value.map(p => p.id).join(',')
    await navigateTo(`/customer/payment-process?payments=${paymentIds}`)
  } catch (err) {
    console.error('❌ Error processing pending payments:', err)
    alert('Fehler beim Weiterleiten zur Zahlung.')
  }
}

// Helper methods
const getInitials = () => {
  if (!currentUser.value) return '??'
  
  const firstName = currentUser.value.user_metadata?.first_name || 
                   currentUser.value.user_metadata?.firstName || ''
  const lastName = currentUser.value.user_metadata?.last_name || 
                  currentUser.value.user_metadata?.lastName || ''
  
  const first = firstName.charAt(0)?.toUpperCase() || ''
  const last = lastName.charAt(0)?.toUpperCase() || ''
  return first + last || currentUser.value.email?.charAt(0)?.toUpperCase() || '??'
}

const getFirstName = () => {
  if (!currentUser.value) return 'Unbekannt'
  
  const firstName = currentUser.value.user_metadata?.first_name || 
                   currentUser.value.user_metadata?.firstName
  
  return firstName || currentUser.value.email?.split('@')[0] || 'Unbekannt'
}


const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum/Zeit'
  
  try {
    // Parse als lokale Zeit (nicht UTC)
    const parts = dateString.replace('T', ' ').replace('Z', '').split(/[-: ]/)
    const date = new Date(
      parseInt(parts[0]), // year
      parseInt(parts[1]) - 1, // month (0-indexed)
      parseInt(parts[2]), // day
      parseInt(parts[3] || '0'), // hour
      parseInt(parts[4] || '0'), // minute
      parseInt(parts[5] || '0')  // second
    )
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum/Zeit'
    }
    const weekday = date.toLocaleDateString('de-CH', { weekday: 'short' }) // z.B. "Mi."
    const datePart = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timePart = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
    return `${weekday} ${datePart} ${timePart}`
  } catch (error) {
    console.warn('Error formatting dateTime:', dateString, error)
    return 'Datum/Zeit Fehler'
  }
}

const formatPaymentDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Nicht geplant'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    const now = new Date()
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 0) {
      return 'Sofort fällig'
    } else if (diffHours < 24) {
      return `Heute ${date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffHours < 48) {
      return `Morgen ${date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  } catch (error) {
    console.error('Error formatting payment date:', error)
    return 'Ungültiges Datum'
  }
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

const getRatingColorPreview = (rating: number) => {
  const colors = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
    6: 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-700'
}

// Navigation methods

const navigateToPayments = async () => {
  // Wenn offene Zahlungen vorhanden sind, direkt zum Payment-Prozess
  if (unpaidAppointments.value.length > 0) {
    const paymentIds = unpaidAppointments.value.map(p => p.id).join(',')
    await navigateTo(`/customer/payment-process?payments=${paymentIds}`)
  } else {
    // Sonst zum Zahlungsverlauf
    await navigateTo('/customer/payments')
  }
}

const navigateToLessonBooking = async () => {
  try {
    // Get user's tenant_id from database
    const supabase = getSupabase()
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser.value?.id)
      .single()
    
    if (userError || !userData) {
      console.error('❌ Error getting user tenant:', userError)
      await navigateTo('/booking/availability-test')
      return
    }
    
    // Get tenant slug from tenant_id
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', userData.tenant_id)
      .single()
    
    if (tenantError || !tenantData) {
      console.error('❌ Error getting tenant slug:', tenantError)
      await navigateTo('/booking/availability-test')
      return
    }
    
    // Navigate with tenant slug
    await navigateTo(`/booking/availability/${tenantData.slug}`)
  } catch (err) {
    console.error('❌ Error navigating to lesson booking:', err)
    await navigateTo('/booking/availability-test')
  }
}

const navigateToCourseBooking = async () => {
  // Navigiere zur Customer Kurs-Übersicht
  await navigateTo('/customer/courses')
}

const navigateToReglement = async (type: string) => {
  await navigateTo(`/customer/reglemente/${type}`)
}

const navigateToMyCourses = async () => {
  // Navigiere zu den eigenen Kursen (falls vorhanden) oder zur Kurs-Übersicht
  await navigateTo('/courses')
}

const retryLoad = async () => {
  error.value = null
  isLoading.value = true
  await loadAllData()
}

// Data loading methods
const loadAllData = async () => {
  try {
    if (!isClient.value) {
      console.warn('⚠️ User is not a client, redirecting...')
      await navigateTo('/')
      return
    }

    await Promise.all([
      loadAppointments(),
      loadLocations(),
      loadStaff(),
      loadPendingConfirmations(),
      checkPaymentMethod()
    ])

    // Load instructors after appointments are loaded
    loadInstructors()

    console.log('✅ Customer dashboard data loaded successfully')
  } catch (err: any) {
    console.error('❌ Error loading customer dashboard:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// ✅ Load pending confirmation appointments
const loadPendingConfirmations = async () => {
  if (!currentUser.value?.id) {
    console.log('⚠️ No current user ID for loadPendingConfirmations')
    return
  }

  try {
    const supabase = getSupabase()
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError || !userData) return



    // ✅ Load appointments with pending_confirmation status
    const { data: confirmationsData, error: confirmationsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        confirmation_token,
        type,
        event_type_code
      `)
      .eq('user_id', userData.id)
      .eq('status', 'pending_confirmation')
      .eq('tenant_id', userData.tenant_id)
      .not('confirmation_token', 'is', null)
      .order('start_time', { ascending: true })

    if (confirmationsError) {
      console.warn('⚠️ Error loading pending confirmations:', confirmationsError)
      return
    }

    if (!confirmationsData || confirmationsData.length === 0) {
      pendingConfirmations.value = []
      console.log('✅ No pending confirmations found')
      return
    }

    // ✅ DANACH: Lade Payments für diese Appointments separat
    const appointmentIds = confirmationsData.map(apt => apt.id)
    let paymentsData = null
    
    // Nur Query ausführen wenn Appointment IDs vorhanden
    if (appointmentIds.length > 0) {
      const { data, error: paymentsError } = await supabase
        .from('payments')
        .select('id, appointment_id, total_amount_rappen, payment_method, payment_status')
        .in('appointment_id', appointmentIds)
      
      if (paymentsError) {
        console.warn('⚠️ Error loading payments for confirmations:', paymentsError)
      } else {
        paymentsData = data
      }
    }

    // Erstelle Map für schnellen Zugriff
    const paymentsMap = new Map()
    if (paymentsData) {
      paymentsData.forEach(payment => {
        if (!paymentsMap.has(payment.appointment_id)) {
          paymentsMap.set(payment.appointment_id, [])
        }
        paymentsMap.get(payment.appointment_id).push(payment)
      })
    }

    // Load tenant payment settings for automatic payment hours (from payment_settings JSON)
    if (userData.tenant_id) {
      try {
        const { data: paymentSettings } = await supabase
          .from('tenant_settings')
          .select('setting_value')
          .eq('tenant_id', userData.tenant_id)
          .eq('category', 'payment')
          .eq('setting_key', 'payment_settings')
          .maybeSingle()
        
        if (paymentSettings?.setting_value) {
          const settings = typeof paymentSettings.setting_value === 'string' 
            ? JSON.parse(paymentSettings.setting_value) 
            : paymentSettings.setting_value
          automaticPaymentHoursBefore.value = Number(settings?.automatic_payment_hours_before) || 24
          automaticAuthorizationHoursBefore.value = Number(settings?.automatic_authorization_hours_before) || 168
        }
      } catch (e) {
        console.warn('⚠️ Konnte Payment Settings nicht laden für Stunden:', e)
      }
    }

    // Calculate total amount for each appointment (from payment)
    pendingConfirmations.value = confirmationsData.map(apt => {
      const payments = paymentsMap.get(apt.id) || []
      const payment = payments.length > 0 ? payments[0] : null
      
      return {
        ...apt,
        total_amount_rappen: payment?.total_amount_rappen || 0,
        payments: payments // Include for compatibility
      }
    })

    console.log('✅ Loaded pending confirmations:', pendingConfirmations.value.length)
  } catch (err: any) {
    console.error('❌ Error loading pending confirmations:', err)
  }
}

// ✅ Check if user has payment method
const checkPaymentMethod = async () => {
  if (!currentUser.value?.id) return

  try {
    const supabase = getSupabase()
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError || !userData) return

    const { data, error } = await supabase
      .from('customer_payment_methods')
      .select('id')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    
    hasPaymentMethod.value = !!data && !error
    
    console.log('✅ Payment method check:', hasPaymentMethod.value ? 'Has payment method' : 'No payment method')
  } catch (err: any) {
    console.error('❌ Error checking payment method:', err)
    hasPaymentMethod.value = false
  }
}

// ✅ Confirm appointment and redirect directly to Wallee (skip extra confirmation page)
const confirmAppointment = async (appointment: any) => {
  try {
    if (!appointment?.id) {
      alert('Fehler: Termin-ID fehlt')
      return
    }

    const supabase = getSupabase()

    // Hole aktuellen User (DB) inkl. tenant
    const { data: userDb } = await supabase
      .from('users')
      .select('id, tenant_id, email')
      .eq('auth_user_id', currentUser.value?.id)
      .single()

    if (!userDb) {
      alert('Fehler: Benutzer nicht gefunden')
      return
    }

    // Hole Payment für diesen Termin (Betrag)
    const { data: payment } = await supabase
      .from('payments')
      .select('id, total_amount_rappen')
      .eq('appointment_id', appointment.id)
      .order('created_at', { ascending: false })
      .maybeSingle()

    const amountRappen = payment?.total_amount_rappen || 0
    if (!amountRappen || amountRappen <= 0) {
      alert('Fehler: Betrag für den Termin nicht gefunden')
      return
    }

    // Lade Tenant Payment Settings (für automatische Zahlung)
    let automaticPaymentEnabledLocal = false
    let automaticPaymentHoursBeforeLocal = 24
    let automaticAuthorizationHoursBeforeLocal = 168
    try {
      const { data: paymentSettings } = await supabase
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', userDb.tenant_id)
        .eq('category', 'payment')
        .eq('setting_key', 'payment_settings')
        .maybeSingle()
      if (paymentSettings?.setting_value) {
        const settings = typeof paymentSettings.setting_value === 'string' 
          ? JSON.parse(paymentSettings.setting_value) 
          : paymentSettings.setting_value
        automaticPaymentEnabledLocal = !!settings?.automatic_payment_enabled
        automaticPaymentHoursBeforeLocal = Number(settings?.automatic_payment_hours_before) || 24
        automaticAuthorizationHoursBeforeLocal = Number(settings?.automatic_authorization_hours_before) || 168
        
        console.log('✅ Payment settings loaded:', {
          automatic_payment_enabled: automaticPaymentEnabledLocal,
          automatic_payment_hours_before: automaticPaymentHoursBeforeLocal,
          automatic_authorization_hours_before: automaticAuthorizationHoursBeforeLocal,
          rawSettings: settings
        })
      }
    } catch (e) {
      console.warn('⚠️ Konnte Payment Settings nicht laden:', e)
    }

    // ✅ OPTION 1: Hole Default-Zahlungsmittel (falls vorhanden)
    // Beim ersten Termin: Kein Token vorhanden → Weiterleitung zu Wallee (Token wird erstellt)
    // Bei weiteren Terminen: Token vorhanden → Automatische Zahlung möglich
    let defaultMethodId: string | null = null
    if (automaticPaymentEnabledLocal) {
      const { data: method } = await supabase
        .from('customer_payment_methods')
        .select('id')
        .eq('user_id', userDb.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      defaultMethodId = method?.id || null
      
      console.log('💳 Payment method check:', {
        hasMethod: !!defaultMethodId,
        automaticPaymentEnabled: automaticPaymentEnabledLocal,
        note: defaultMethodId 
          ? 'Token vorhanden → Automatische Zahlung möglich' 
          : 'Kein Token → Weiterleitung zu Wallee (Token wird erstellt)'
      })
    }

    // ✅ Entscheide: automatische Zahlung planen oder sofortige Zahlung
    // Regel: Automatische Zahlung NUR wenn:
    // 1. Automatische Zahlung aktiviert ist
    // 2. Ein gespeichertes Zahlungsmittel (Token) vorhanden ist
    // 3. Genug Stunden vor Termin (≥ configured hours)
    // SONST: Weiterleitung zu Wallee (Token wird erstellt/gespeichert)
    const startDate = new Date(appointment.start_time)
    const now = new Date()
    const diffHours = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const canScheduleAutomatic = automaticPaymentEnabledLocal && !!defaultMethodId && diffHours >= automaticPaymentHoursBeforeLocal
    
    console.log('🔍 Automatic payment decision:', {
      automaticPaymentEnabled: automaticPaymentEnabledLocal,
      hasDefaultMethod: !!defaultMethodId,
      diffHours: diffHours,
      requiredHours: automaticPaymentHoursBeforeLocal,
      canScheduleAutomatic: canScheduleAutomatic,
      appointmentStart: appointment.start_time,
      decision: canScheduleAutomatic 
        ? '✅ Automatische Zahlung geplant' 
        : defaultMethodId 
          ? '⚠️ Zu wenig Stunden vor Termin → Weiterleitung zu Wallee'
          : '💳 Kein Token vorhanden → Weiterleitung zu Wallee (Token wird erstellt)'
    })

    // Setze Termin direkt auf 'scheduled' (Bestätigung erfolgt jetzt)
    await supabase
      .from('appointments')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', appointment.id)

    if (canScheduleAutomatic && payment?.id) {
      // ✅ Plane automatische Zahlung 24h (oder konfiguriert) vor Termin
      const scheduledPayDate = new Date(startDate.getTime() - automaticPaymentHoursBeforeLocal * 60 * 60 * 1000)
      // ✅ Bestimme frühesten Autorisierungszeitpunkt (z. B. 1 Woche vorher)
      const authDueDate = new Date(startDate.getTime() - automaticAuthorizationHoursBeforeLocal * 60 * 60 * 1000)
      const shouldAuthorizeNow = now >= authDueDate

      await supabase
        .from('payments')
        .update({
          automatic_payment_consent: true,
          automatic_payment_consent_at: new Date().toISOString(),
          scheduled_payment_date: scheduledPayDate.toISOString(),
          // speichere geplanten Autorisierungszeitpunkt, wenn noch nicht fällig
          scheduled_authorization_date: shouldAuthorizeNow ? new Date().toISOString() : authDueDate.toISOString(),
          payment_method_id: defaultMethodId,
          payment_method: 'wallee',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (shouldAuthorizeNow) {
        try {
          const authorizeResult = await $fetch('/api/wallee/authorize-payment', {
            method: 'POST',
            body: {
              paymentId: payment.id,
              userId: userDb.id,
              tenantId: userDb.tenant_id
            }
          }) as { success?: boolean; transactionId?: number; state?: string; error?: string }

          if (!authorizeResult.success) {
            throw new Error(authorizeResult.error || 'Authorization failed')
          }

          console.log('✅ Payment authorized (provisional charge):', {
            paymentId: payment.id,
            transactionId: authorizeResult.transactionId,
            scheduledPaymentDate: scheduledPayDate.toISOString()
          })
        } catch (authError: any) {
          console.error('❌ Error authorizing payment (will rely on scheduled auth):', authError)
          // wir lassen scheduled_authorization_date stehen; Cron wird autorisieren
        }
      } else {
        console.log('⏳ Authorization scheduled at', authDueDate.toISOString(), '; capture scheduled at', scheduledPayDate.toISOString())
      }

      // Entferne den Termin aus der lokalen Liste der offenen Bestätigungen
      pendingConfirmations.value = pendingConfirmations.value.filter((a: any) => a.id !== appointment.id)
      showConfirmationModal.value = false
      try {
        // @ts-ignore
        if (typeof showToast !== 'undefined' && typeof toastMessage !== 'undefined') {
          // @ts-ignore
          showToast.value = true
          // @ts-ignore
          toastMessage.value = shouldAuthorizeNow
            ? 'Termin bestätigt. Der Betrag wurde provisorisch reserviert und 24h vor dem Termin abgebucht.'
            : `Termin bestätigt. Die Karte wird ${automaticAuthorizationHoursBeforeLocal/24} Tage vor dem Termin reserviert, Abbuchung ${automaticPaymentHoursBeforeLocal}h vorher.`
        }
      } catch {}
      return
    }

    // Erstelle Wallee-Transaktion über Backend
    // Beschriftung für Wallee-Zusammenfassung: Lesson-Type + Datum/Zeit
    const mapLessonType = (code: string | null | undefined) => {
      if (!code) return 'Fahrlektion'
      const c = String(code).toLowerCase()
      if (c.includes('exam') || c === 'prüfung' || c === 'exam') return 'Prüfung'
      if (c.includes('theor')) return 'Theorielektion'
      if (c.includes('lesson') || c === 'fahrlektion') return 'Fahrlektion'
      return 'Fahrlektion'
    }
    const formatSummaryDate = (dateStr: string) => {
      // Parse als lokale Zeit (nicht UTC)
      const parts = dateStr.replace('T', ' ').replace('Z', '').split(/[-: ]/)
      const d = new Date(
        parseInt(parts[0]), // year
        parseInt(parts[1]) - 1, // month (0-indexed)
        parseInt(parts[2]), // day
        parseInt(parts[3] || '0'), // hour
        parseInt(parts[4] || '0'), // minute
        parseInt(parts[5] || '0')  // second
      )
      return `${d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
    }
    const summaryLabel = `${mapLessonType(appointment.event_type_code || appointment.type)} • ${formatSummaryDate(appointment.start_time)}`
    type WalleeResponse = { success?: boolean; paymentUrl?: string; transactionId?: number | string; error?: string }
    const orderId = `appointment-${appointment.id}-${Date.now()}`

    const response = await $fetch<WalleeResponse>('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        orderId,
        amount: amountRappen / 100, // Wallee erwartet Betrag in CHF
        currency: 'CHF',
        customerEmail: userDb.email,
        userId: userDb.id,
        tenantId: userDb.tenant_id,
        description: summaryLabel,
        successUrl: `${window.location.origin}/payment/success?paymentId=${payment?.id}`,
        failedUrl: `${window.location.origin}/payment/success?paymentId=${payment?.id}`
      }
    })

    if (!response?.success || !response.paymentUrl) {
      console.error('Create transaction failed:', response)
      alert('Zahlung konnte nicht gestartet werden. Bitte später erneut versuchen.')
      return
    }

    // Verknüpfe Payment mit der Wallee-Transaktion, falls Payment existiert
    if (payment?.id && response.transactionId) {
      await supabase
        .from('payments')
        .update({
          payment_method: 'wallee',
          wallee_transaction_id: String(response.transactionId),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
    }

    // Direkt zu Wallee weiterleiten
    window.location.href = response.paymentUrl
  } catch (err: any) {
    console.error('❌ Fehler beim Starten der Zahlung:', err)
    alert('Fehler beim Starten der Zahlung: ' + (err?.message || 'Unbekannter Fehler'))
  }
}

const loadAppointments = async () => {
  if (!currentUser.value?.id) return

  try {
    const supabase = getSupabase()
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError) throw userError
    if (!userData) throw new Error('User nicht in Datenbank gefunden')

    console.log('🔍 Loading appointments for user:', userData.id)

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        location_id,
        type,
        event_type_code,
        user_id,
        staff_id,
        staff:users!staff_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),

        notes (
          id,
          staff_rating,
          staff_note
        ),
        exam_results (
          id,
          passed,
          exam_date,
          examiner_behavior_rating,
          examiner_behavior_notes
        )
      `)
      .eq('user_id', userData.id)
      .is('deleted_at', null)  // ✅ NEU: Nur nicht gelöschte Termine anzeigen
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError
    console.log('✅ Appointments loaded:', appointmentsData?.length || 0)

    const locationIds = [...new Set(appointmentsData?.map(a => a.location_id).filter(Boolean))]
    console.log('🔍 Location IDs found:', locationIds)
    
    let locationsMap: Record<string, { name: string; address?: string; formatted_address?: string }> = {}
    
    if (locationIds.length > 0) {
      console.log('🔍 Loading locations for IDs:', locationIds)
      
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, address, formatted_address')
        .in('id', locationIds)

      if (locationsError) {
        console.error('❌ Error loading locations:', locationsError)
      } else if (locations) {
        console.log('✅ Locations loaded:', locations)
        
        locationsMap = locations.reduce((acc, loc) => {
          acc[loc.id] = {
            name: loc.name,
            address: loc.address,
            formatted_address: loc.formatted_address
          }
          return acc
        }, {} as Record<string, any>)
        
        console.log('✅ LocationsMap created:', locationsMap)
      }
    } else {
      console.log('⚠️ No location IDs found in appointments')
    }

    const appointmentIds = appointmentsData?.map(a => a.id) || []
    console.log('🔍 Searching evaluations for appointments:', appointmentIds.length)

    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        appointment_id,
        evaluation_criteria_id,
        criteria_rating,
        criteria_note
      `)
      .in('appointment_id', appointmentIds)
      .not('evaluation_criteria_id', 'is', null)
      .not('criteria_rating', 'is', null)

    if (notesError) {
      console.error('❌ Notes error:', notesError)
      throw notesError
    }

    console.log('✅ Evaluations loaded:', notes?.length || 0)

    const criteriaIds = [...new Set(notes?.map(n => n.evaluation_criteria_id).filter(Boolean))]
    let criteriaMap: Record<string, any> = {}

    if (criteriaIds.length > 0) {
      console.log('🔍 Loading criteria details for:', criteriaIds.length, 'criteria')
      
      const { data: criteria, error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .select('id, name')
        .in('id', criteriaIds)

      if (criteriaError) {
        console.error('❌ Criteria error:', criteriaError)
        criteriaIds.forEach(id => {
          criteriaMap[id] = {
            name: 'Bewertungskriterium',
            short_code: null,
            category_name: null
          }
        })
      } else if (criteria) {
        console.log('✅ Criteria loaded:', criteria.length)
        
        criteriaMap = criteria.reduce((acc, crit) => {
          acc[crit.id] = {
            name: crit.name || 'Unbekanntes Kriterium',
            short_code: null,
            category_name: null
          }
          return acc
        }, {} as Record<string, any>)
      }
    }

    const notesByAppointment = (notes || []).reduce((acc: Record<string, any[]>, note: any) => {
      if (!acc[note.appointment_id]) {
        acc[note.appointment_id] = []
      }
      
      const criteriaDetails = criteriaMap[note.evaluation_criteria_id]
      
      if (note.evaluation_criteria_id && note.criteria_rating !== null && criteriaDetails) {
        acc[note.appointment_id].push({
          criteria_id: note.evaluation_criteria_id,
          criteria_name: criteriaDetails.name || 'Unbekannt',
          criteria_short_code: null,
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note || '',
          criteria_category_name: criteriaDetails.category_name || null
        })
      }
      
      return acc
    }, {} as Record<string, any[]>)

    const lessonsWithEvaluations = (appointmentsData || []).map(appointment => ({
      ...appointment,
      location_name: locationsMap[appointment.location_id]?.name || null,
      location_details: locationsMap[appointment.location_id] || null,
      criteria_evaluations: notesByAppointment[appointment.id] || []
    }))

    // Debug: Zeige location_details für die ersten paar Termine
    console.log('🔍 Sample location_details:', lessonsWithEvaluations.slice(0, 3).map(lesson => ({
      id: lesson.id,
      location_id: lesson.location_id,
      location_name: lesson.location_name,
      location_details: lesson.location_details
    })))

    console.log('✅ Final lessons with evaluations:', lessonsWithEvaluations.length)

    appointments.value = lessonsWithEvaluations
    lessons.value = lessonsWithEvaluations

  } catch (err: any) {
    console.error('❌ Error loading appointments:', err)
    error.value = err.message
  }
}

const loadLocations = async () => {
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('*')
      .order('name')

    if (fetchError) throw fetchError
    locations.value = data || []
  } catch (err: any) {
    console.error('❌ Error loading locations:', err)
  }
}

const loadStaff = async () => {
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'staff')
      .eq('is_active', true)

    if (fetchError) throw fetchError
    staff.value = data || []
  } catch (err: any) {
    console.error('❌ Error loading staff:', err)
  }
}

const loadInstructors = () => {
  // Group appointments by instructor and count lessons
  const instructorMap = new Map()
  
  // Ensure appointments.value is an array
  if (appointments.value && Array.isArray(appointments.value)) {
    appointments.value.forEach(appointment => {
      if (appointment && appointment.staff) {
        const instructorId = appointment.staff.id
        const instructorName = `${appointment.staff.first_name || ''} ${appointment.staff.last_name || ''}`.trim()
        
        if (instructorMap.has(instructorId)) {
          instructorMap.get(instructorId).lessonCount++
        } else {
          instructorMap.set(instructorId, {
            id: instructorId,
            name: instructorName,
            first_name: appointment.staff.first_name,
            last_name: appointment.staff.last_name,
            email: appointment.staff.email,
            phone: appointment.staff.phone,
            lessonCount: 1
          })
        }
      }
    })
  }
  
  instructors.value = Array.from(instructorMap.values())
  console.log('✅ Instructors loaded:', instructors.value.length)
}

const getInstructorInitials = (instructor: any) => {
  const firstName = instructor.first_name || ''
  const lastName = instructor.last_name || ''
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const showInstructorDetails = (instructor: any) => {
  selectedInstructor.value = instructor
  showInstructorModal.value = true
}

const openEmail = (email: string) => {
  if (process.client) {
    window.open(`mailto:${email}`, '_blank')
  }
}

const openPhone = (phone: string) => {
  if (process.client) {
    window.open(`tel:${phone}`, '_self')
  }
}

const handleLogout = async () => {
  if (isLoggingOut.value) return
  
  try {
    isLoggingOut.value = true
    console.log('🚪 Logging out user...')
    
    await authStore.logout()
    
    console.log('✅ Logout successful, redirecting to tenant login...')
    const { currentTenantBranding } = useTenantBranding()
    const slug = currentTenantBranding.value?.slug
    await navigateTo(slug ? `/${slug}` : '/login')
    
  } catch (err: any) {
    console.error('❌ Fehler beim Abmelden:', err)
    const { currentTenantBranding } = useTenantBranding()
    const slug = currentTenantBranding.value?.slug
    await navigateTo(slug ? `/${slug}` : '/login')
  } finally {
    isLoggingOut.value = false
  }
}

// Watch for user role changes and redirect if needed
watch([currentUser, userRole], ([newUser, newRole]) => {
  if (newUser && !isClient.value) {
    console.log('🔄 User is not a client, redirecting to main dashboard')
    navigateTo('/')
  }
}, { immediate: true })

// pages/index.vue - im Watcher für userRole:
// pages/index.vue - ändere den Watcher:
const route = useRoute() // ← Hier oben definieren, außerhalb des watchers

watch(userRole, (newRole: string | null) => {
  console.log('🔍 WATCHER TRIGGERED - userRole changed to:', newRole)
  
  if (newRole) {
    console.log('DEBUG: UserRole detected in index.vue watcher:', newRole);
    
    const currentPath = route.path; // ← Jetzt route.path verwenden statt useRoute().path
    let targetPath = '/';

    switch (newRole) {
      case 'admin':
        targetPath = '/admin';
        console.log('🔄 Navigating admin to:', targetPath);
        break;
      case 'staff':
        targetPath = '/dashboard';
        break;
      case 'client':
        targetPath = '/customer-dashboard';
        break;
      default:
        targetPath = '/';
    }

    console.log('🎯 Final navigation:', currentPath, '→', targetPath);
    if (currentPath !== targetPath) {
      navigateTo(targetPath);
    }
  } else {
    console.log('🔍 WATCHER - userRole is null/empty')
  }
}, { immediate: true })// ← Stelle sicher dass immediate: true da ist

// Lifecycle
onMounted(async () => {
  console.log('🔥 CustomerDashboard mounted')
  
  try {
    // Einfacher: Warte auf Auth-Store Initialisierung
    let attempts = 0
    while (!authStore.isInitialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (!authStore.isLoggedIn || !authStore.isClient) {
      console.log('❌ Not logged in or not a client, redirecting...')
      await navigateTo('/')
      return
    }
    
    console.log('✅ Auth verified, loading data...')
    await loadAllData()
    await loadPayments()
    
  } catch (err: any) {
    console.error('❌ Error during mount:', err)
    await navigateTo('/')
  }
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.transition-colors {
  transition: all 0.2s ease-in-out;
}

.transition-all {
  transition: all 0.3s ease-in-out;
}

.transition-shadow {
  transition: box-shadow 0.3s ease-in-out;
}

/* Custom gradient backgrounds */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}

/* Hover effects */
.group:hover .group-hover\:from-green-100 {
  --tw-gradient-from: #dcfce7;
}

.group:hover .group-hover\:to-green-200 {
  --tw-gradient-to: #bbf7d0;
}

.group:hover .group-hover\:from-purple-100 {
  --tw-gradient-from: #f3e8ff;
}

.group:hover .group-hover\:to-purple-200 {
  --tw-gradient-to: #e9d5ff;
}

.group:hover .group-hover\:from-blue-100 {
  --tw-gradient-from: #dbeafe;
}

.group:hover .group-hover\:to-blue-200 {
  --tw-gradient-to: #bfdbfe;
}

/* Enhanced shadows */
.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>