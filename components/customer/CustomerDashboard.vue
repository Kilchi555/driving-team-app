<!-- components/CustomerDashboard.vue -->
<!-- In CustomerDashboard.vue Template - im Header Bereich -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <!-- Header -->
      <div class="bg-white shadow-lg border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-lg">
                  {{ getInitials() }}
                </span>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">
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

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
        <p class="mt-4 text-gray-600 text-lg">Ihre Daten werden geladen...</p>
      </div>
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

<!-- Pending Payment Notifications -->
<div v-if="pendingPayments.length > 0" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
    <div class="flex items-center space-x-3">
      <span class="text-2xl">💳</span>
      <div class="flex-1">
        <h3 class="font-semibold text-orange-900">Zahlung erforderlich</h3>
        <p class="text-sm text-orange-700">
          <span v-if="pendingPayments.length === 1">
            Sie haben eine offene Zahlung.
          </span>
          <span v-else>
            Sie haben {{ pendingPayments.length }} offene Zahlungen.
          </span>
        </p>
      </div>
      <button 
        @click="processPendingPayments"
        class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
      >
        Jetzt bezahlen
      </button>
    </div>
  </div>
</div>

    <!-- Main Content -->
    <div v-if="showContent" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <!-- Zahlungsübersicht - NACH OBEN VERSCHOBEN -->
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
                {{ unpaidAppointments.length > 0 ? 'Offene Rechnungen' : 'Zahlungsstatus' }}
              </h3>
            </div>
            
            <div class="flex-1">
              <div v-if="unpaidAppointments.length > 0">
                <p class="text-3xl font-bold text-yellow-600">{{ unpaidAppointments.length }}</p>
                <p class="text-xs text-red-500 mt-1">
                  CHF {{ (totalUnpaidAmount / 100).toFixed(2) }} offen
                </p>
              </div>
              <div v-else>
                <p class="text-3xl font-bold text-green-600">✓ Bezahlt</p>
                <p class="text-xs text-green-500 mt-1">
                  Alle {{ paidAppointments.length }} Rechnungen beglichen
                </p>
              </div>
            </div>
            
            <div class="mt-4">
              <button
                @click="navigateToPayments"
                :class="[
                  'w-full px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                  unpaidAppointments.length > 0 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                ]"
              >
                {{ unpaidAppointments.length > 0 ? 'Jetzt bezahlen' : 'Zahlungsverlauf' }}
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

      <!-- Quick Actions -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-100 mb-8">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900 flex items-center">
            <svg class="w-6 h-6 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Schnellaktionen
          </h2>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <!-- Termine verwalten -->
            <div class="group cursor-pointer">
              <div class="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 hover:shadow-md transition-all group-hover:from-green-100 group-hover:to-green-200">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">Termine verwalten</h3>
                    <p class="text-sm text-gray-600">Anzeigen, buchen, ändern</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Zahlungen verwalten -->
            <div class="group cursor-pointer" @click="navigateToPayments">
              <div class="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 hover:shadow-md transition-all group-hover:from-purple-100 group-hover:to-purple-200">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">Zahlungen</h3>
                    <p class="text-sm text-gray-600">Rechnungen & Bezahlung</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bewertungen ansehen -->
            <div class="group cursor-pointer" @click="showEvaluationsModal = true">
              <div class="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-all group-hover:from-blue-100 group-hover:to-blue-200">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-medium text-gray-900">Meine Bewertungen</h3>
                    <p class="text-sm text-gray-600">Fortschritt anzeigen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Nächste Termine -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-100">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center">
              <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Nächste Termine
            </h2>
          </div>
          <div class="p-6">
            <div v-if="upcomingAppointments.length === 0" class="text-center py-8">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-gray-500">Keine kommenden Termine</p>
            </div>
            
            <div v-else class="space-y-4">
              <div 
                v-for="appointment in upcomingAppointments.slice(0, 3)" 
                :key="appointment.id"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-medium text-gray-900">{{ appointment.title || 'Fahrstunde' }}</h3>
                    <p class="text-sm text-gray-600 mt-1">
                      {{ formatDateTime(appointment.start_time) }}
                    </p>
                    <p class="text-sm text-gray-500 mt-1">
                      {{ appointment.duration_minutes }} Minuten
                    </p>
                  </div>
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {{ appointment.status }}
                  </span>
                </div>
              </div>
              
              <button 
                v-if="upcomingAppointments.length > 3"
                @click="showUpcomingLessonsModal = true"
                class="w-full text-center py-2 text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Alle {{ upcomingAppointments.length }} Termine anzeigen →
              </button>
            </div>
          </div>
        </div>

        <!-- Letzte Bewertungen -->
        <div class="bg-white rounded-xl shadow-lg border border-gray-100">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900 flex items-center">
              <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Letzte Bewertungen
            </h2>
          </div>
          <div class="p-6">
            <div v-if="recentEvaluations.length === 0" class="text-center py-8">
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p class="text-gray-500">Noch keine Bewertungen</p>
            </div>
            
            <div v-else class="space-y-4">
              <div 
                v-for="evaluation in recentEvaluations.slice(0, 3)" 
                :key="evaluation.lesson_id"
                class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <!-- Termin Header -->
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="font-medium text-gray-900">{{ evaluation.lesson_title }}</h3>
                    <p class="text-sm text-gray-600">
                      {{ formatDateTime(evaluation.lesson_date) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <span :class="getRatingColorPreview(Math.round(evaluation.average_rating))" 
                          class="inline-flex px-2 py-1 rounded-full text-xs font-semibold">
                      ⌀ {{ evaluation.average_rating.toFixed(1) }}/6
                    </span>
                  </div>
                </div>
                
                <!-- Bewertungen für diesen Termin -->
                <div class="space-y-2">
                  <div 
                    v-for="criteriaEval in evaluation.criteria_evaluations.slice(0, 3)" 
                    :key="criteriaEval.criteria_id"
                    class="flex justify-between items-center"
                  >
                    <span class="text-sm text-gray-700">{{ criteriaEval.criteria_name }}</span>
                    <span :class="getRatingColorPreview(criteriaEval.criteria_rating)" 
                          class="inline-flex px-2 py-1 rounded-full text-xs font-semibold">
                      {{ criteriaEval.criteria_rating }}/6
                    </span>
                  </div>
                  
                  <!-- "Weitere" Anzeige wenn mehr als 3 Kriterien -->
                  <div v-if="evaluation.criteria_evaluations.length > 3" class="text-xs text-gray-500 text-center pt-1">
                    ... und {{ evaluation.criteria_evaluations.length - 3 }} weitere
                  </div>
                </div>
              </div>
              
              <button 
                v-if="recentEvaluations.length > 3"
                @click="showEvaluationsModal = true"
                class="w-full text-center py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Alle {{ recentEvaluations.length }} bewerteten Termine anzeigen →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Zahlungshinweis (falls offene Rechnungen) -->
      <div v-if="unpaidAppointments.length > 0" class="mt-6">
        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 rounded-lg p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-yellow-800">
                Sie haben {{ unpaidAppointments.length }} offene Rechnung{{ unpaidAppointments.length > 1 ? 'en' : '' }}
              </h3>
              <p class="mt-2 text-yellow-700">
                Gesamtbetrag: <strong>CHF {{ (totalUnpaidAmount / 100).toFixed(2) }}</strong>
              </p>
              <button
                @click="navigateToPayments"
                class="mt-4 bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
              >
                💳 Jetzt bezahlen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
      <div v-else class="min-h-screen flex items-center justify-center">
    <div class="animate-spin rounded-full h-16 w-16 border-4 border-green-500"></div>
  </div>

    <!-- Modals -->
    <EvaluationsOverviewModal 
      :is-open="showEvaluationsModal"
      :lessons="lessons"
      @close="showEvaluationsModal = false"
    />

    <UpcomingLessonsModal 
      :is-open="showUpcomingLessonsModal"
      :lessons="appointments"
      @close="showUpcomingLessonsModal = false"
    />
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
  return appointments.value?.filter(apt => apt.is_paid) || []
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

const unpaidAppointments = computed(() => {
  return appointments.value.filter(apt => !apt.is_paid)
})

const totalUnpaidAmount = computed(() => {
  return unpaidAppointments.value.reduce((sum, apt) => {
    const basePrice = (apt.price_per_minute || 0) * (apt.duration_minutes || 0)
    return sum + Math.round(basePrice * 100) // Convert to Rappen
  }, 0)
})

const refreshData = async () => {
  isLoading.value = true
  try {
    await Promise.all([
      loadAllData(),
      loadPayments()
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

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
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
  await navigateTo('/customer/payments')
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
      loadStaff()
    ])

    console.log('✅ Customer dashboard data loaded successfully')
  } catch (err: any) {
    console.error('❌ Error loading customer dashboard:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
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
        user_id,
        staff_id,
        price_per_minute,
        is_paid,
        notes (
          id,
          staff_rating,
          staff_note
        )
      `)
      .eq('user_id', userData.id)
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError
    console.log('✅ Appointments loaded:', appointmentsData?.length || 0)

    const locationIds = [...new Set(appointmentsData?.map(a => a.location_id).filter(Boolean))]
    let locationsMap: Record<string, string> = {}
    
    if (locationIds.length > 0) {
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds)

      if (!locationsError && locations) {
        locationsMap = locations.reduce((acc, loc) => {
          acc[loc.id] = loc.name
          return acc
        }, {} as Record<string, string>)
      }
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
        .select('id, name, short_code')
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
            short_code: crit.short_code,
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
          criteria_short_code: criteriaDetails.short_code || null,
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note || '',
          criteria_category_name: criteriaDetails.category_name || null
        })
      }
      
      return acc
    }, {} as Record<string, any[]>)

    const lessonsWithEvaluations = (appointmentsData || []).map(appointment => ({
      ...appointment,
      location_name: locationsMap[appointment.location_id] || null,
      criteria_evaluations: notesByAppointment[appointment.id] || []
    }))

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

const handleLogout = async () => {
  try {
    const supabase = getSupabase()
    await authStore.logout(supabase)
    await navigateTo('/')
  } catch (err: any) {
    console.error('❌ Fehler beim Abmelden:', err)
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
// In CustomerDashboard.vue - für Live-Updates
// CustomerDashboard.vue - ändere den onMounted:
// CustomerDashboard.vue - ändere den onMounted komplett:
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