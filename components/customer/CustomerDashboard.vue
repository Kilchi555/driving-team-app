<!-- components/CustomerDashboard.vue -->
<!-- In CustomerDashboard.vue Template - im Header Bereich -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <!-- Header -->
      <div class="shadow-lg border-b" :style="{ background: primaryColor }">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <div class="flex items-center space-x-4">
              <!-- Tenant Logo or Initials -->
              <div v-if="currentTenantBranding?.logos?.standard" class="h-12 flex items-center">
                <img :src="currentTenantBranding.logos.standard" :alt="currentTenantBranding.name" class="h-full object-contain max-w-xs">
              </div>
              <div v-else class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ background: `${secondaryColor}dd` }">
                <span class="text-white font-bold text-lg">
                  {{ getInitials() }}
                </span>
              </div>
              <div>
                <h1 class="text-xl font-bold text-white">
                  Hallo, {{ getFirstName() }}!
                </h1>
              </div>
            </div>
            
            <!-- Right Side: Refresh Button -->
            <div class="flex items-center space-x-3">
              <!-- Refresh Button -->
              <button
                @click="refreshData"
                :disabled="isLoading"
                class="flex items-center space-x-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors hover:opacity-90"
                :style="{ background: `${primaryColor}cc` }"
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
        <div 
          @click="handleClickWithDelay('payments', navigateToPayments)"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'payments' }"
          :style="{ borderColor: buttonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: buttonColorLight }">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: buttonColor }">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">
                  Meine Zahlungen
                </h3>
              </div>

            </div>
            
            <div class="flex-1 flex items-center justify-center">
              
              <!-- Content -->
                <p v-if="pendingPayments.length > 0" class="text-gray-600 text-sm">
                  <span >{{ pendingPayments.length }}</span>
                  <span>
                    {{ pendingPayments.length === 1 ? ' Zahlung ausstehend' : ' Zahlungen ausstehend' }}
                  </span>
                </p>
                <p v-else class="text-gray-600 text-sm">
                  Alle Zahlungen sind aktuell
                </p>
            </div>
          </div>
        </div>
        <!-- Kommende Termine - Uses Secondary Color -->
        <div 
          @click="handleClickWithDelay('upcoming', () => { showUpcomingLessonsModal = true })"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'upcoming' }"
          :style="{ borderColor: secondaryButtonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: secondaryButtonColorLight }">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: secondaryButtonColor }">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">Kommende Termine</h3>
              </div>
              <div class="bg-gray-100 px-3 py-1 rounded-full">
                <span class="text-sm font-semibold text-gray-700">{{ upcomingAppointments.length }}</span>
              </div>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p v-if="upcomingAppointments.length > 0" class="text-gray-600 text-sm">
                  Du hast {{ upcomingAppointments.length }} {{ upcomingAppointments.length === 1 ? 'Termin' : 'Termine' }} geplant
                </p>
                <p v-else class="text-gray-600 text-sm">
                  Keine Termine geplant
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Absolvierte Lektionen - Uses Accent Color -->
        <div 
          @click="handleClickWithDelay('evaluations', () => { showEvaluationsModal = true })"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'evaluations' }"
          :style="{ borderColor: accentButtonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: accentButtonColorLight }">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: accentButtonColor }">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900">Absolvierte Lektionen</h3>
              </div>
              <div class="bg-gray-100 px-3 py-1 rounded-full">
                <span class="text-sm font-semibold text-gray-700">{{ completedLessonsCount }}</span>
              </div>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p v-if="totalEvaluationsCount > 0" class="text-gray-600 text-sm">
                  <span>{{ totalEvaluationsCount }} </span>
                  <span class="text-gray-600 text-sm">
                    {{ totalEvaluationsCount === 1 ? ' Bewertung vorhanden' : ' Bewertungen vorhanden' }}
                  </span>
                </p>
                <p v-else class="text-gray-600 text-sm">
                  Noch keine Bewertungen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Booking Sections -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
        
        <!-- Fahrstunden buchen -->
        <div 
          @click="handleClickWithDelay('lesson', navigateToLessonBooking)"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'lesson' }"
          :style="{ borderColor: buttonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: buttonColorLight }">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: buttonColor }">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">
                Fahrstunden buchen
              </h3>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p class="text-gray-600 text-sm">
                  Buche deine nächste Fahrstunde
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Kurs buchen - Uses Secondary Color -->
        <div 
          @click="handleClickWithDelay('course', navigateToCourseBooking)"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'course' }"
          :style="{ borderColor: secondaryButtonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: secondaryButtonColorLight }">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: secondaryButtonColor }">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">
                Kurse buchen
              </h3>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p class="text-gray-600 text-sm">
                  Schaue unsere verfügbaren Kurse an
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ NEW: Shop / Abos Karte -->
        <div 
          @click="handleClickWithDelay('shop', navigateToShop)"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'shop' }"
          :style="{ borderColor: buttonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: buttonColorLight }">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: buttonColor }">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">
                Shop / Abos kaufen
              </h3>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p class="text-gray-600 text-sm">
                  5er/10er Abos und mehr
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Lernbereich - Uses Accent Color -->
        <div 
          @click="handleClickWithDelay('learning', () => navigateTo('/learning'))"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
          :class="{ 'scale-95 opacity-80': activeClickDiv === 'learning' }"
          :style="{ borderColor: accentButtonBorderColor, borderWidth: '4.5px' }"
        >
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: accentButtonColorLight }">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: accentButtonColor }">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 21.5c-2.28 0-4.4-.64-6.16-1.742L12 14z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900">
                Lernbereich
              </h3>
            </div>

            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p class="text-gray-600 text-sm">
                  Themen, die du bereits angeschaut hast
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mein Profil Card -->
      <div 
        @click="handleClickWithDelay('profile', () => { showProfileModal = true })"
        class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all mb-4 cursor-pointer transform" 
        :class="{ 'scale-95 opacity-80': activeClickDiv === 'profile' }"
        :style="{ borderColor: buttonBorderColor, borderWidth: '4.5px' }"
      >
        <div class="p-6 h-full flex flex-col">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: buttonColorLight }">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: buttonColor }">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              Mein Profil
            </h3>
          </div>
          
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <p class="text-gray-600 text-sm">
                Verwalte deine persönlichen Daten
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Fahrlehrer Card - Uses Secondary Color -->
      <div 
        @click="handleClickWithDelay('instructors', () => { showInstructorModal = true })"
        class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all mb-4 cursor-pointer transform" 
        :class="{ 'scale-95 opacity-80': activeClickDiv === 'instructors' }"
        :style="{ borderColor: secondaryButtonBorderColor, borderWidth: '4.5px' }"
      >
        <div class="p-6 h-full flex flex-col">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: secondaryButtonColorLight }">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: secondaryButtonColor }">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              Kontakt
            </h3>
          </div>
          
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <p class="text-gray-600 text-sm">
                Finde unsere Kontakt-Angaben              
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Reglemente Card - Uses Accent Color -->
      <div 
        @click="handleClickWithDelay('regulations', () => { showReglementeModal = true })"
        class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all mb-4 cursor-pointer transform" 
        :class="{ 'scale-95 opacity-80': activeClickDiv === 'regulations' }"
        :style="{ borderColor: accentButtonBorderColor, borderWidth: '4.5px' }"
      >
        <div class="p-6 h-full flex flex-col">
          <div class="flex items-center mb-4">
            <div class="w-10 h-10 rounded-lg mr-3 flex items-center justify-center" :style="{ background: accentButtonColorLight }">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" :style="{ color: accentButtonColor }">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              Reglemente
            </h3>
          </div>
          
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <p class="text-gray-600 text-sm">
                Wichtige Dokumente und Richtlinien
              </p>
            </div>
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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <h2 class="text-xl font-bold text-gray-900">Terminbestätigung</h2>
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
              class="border rounded-xl p-4 shadow-sm"
              :class="isOverdue(appointment) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'"
            >
              <div class="flex flex-col gap-3">
                <!-- Header: Status Badge oben rechts -->
                <div class="flex justify-end">
                  <span v-if="isOverdue(appointment)" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 flex-shrink-0">
                    Überfällig
                  </span>
                </div>
                
                <!-- Datum, Zeit & Dauer -->
                <div class="flex items-center text-sm gap-1.5">
                  <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-gray-900 font-semibold">{{ formatDateTime(appointment.start_time) }}</span>
                  <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3" />
                  </svg>
                  <span class="text-gray-600">{{ appointment.duration_minutes || 45 }} Min</span>
                </div>

                <!-- Details Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">

                  <!-- Fahrlehrer & Kategorie -->
                  <div class="flex items-center justify-between text-gray-600">
                    <div class="flex items-center">
                      <svg class="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A4 4 0 018 17h8a4 4 0 012.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span class="font-medium">Mit {{ getInstructorName(appointment) }}</span>
                    </div>
                    <div class="flex items-center">
                      <svg class="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18" />
                      </svg>
                      <span class="font-medium">{{ getCategoryLabel(appointment) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Payment Details (Produkte & Rabatte) -->
                <div v-if="hasPaymentDetails(appointment)" class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                  <div class="space-y-1.5">
                    <!-- Methode 1: payment_items (neu) -->
                    <template v-if="appointment.payment_items && appointment.payment_items.length > 0">
                      <div 
                        v-for="item in appointment.payment_items" 
                        :key="item.id"
                        class="flex justify-between items-center"
                      >
                        <div class="flex-1">
                          <span class="text-gray-700">{{ item.item_name }}</span>
                          <span v-if="item.quantity > 1" class="text-gray-500 text-xs ml-1">({{ item.quantity }}x)</span>
                        </div>
                        <span 
                          class="text-gray-900 font-medium text-xs"
                          :class="{ 'text-red-600': item.item_type === 'discount' }"
                        >
                          {{ item.item_type === 'discount' ? '-' : '' }}CHF {{ formatPrice(Math.abs(item.total_price_rappen)) }}
                        </span>
                      </div>
                    </template>
                    
                    <!-- Methode 2: Direkte Spalten (alt, Fallback) -->
                    <template v-else>
                      <div v-if="getPaymentField(appointment, 'lesson_price_rappen') > 0" class="flex justify-between items-center">
                        <span class="text-gray-700">{{ getEventTypeLabel(appointment.event_type_code) }}</span>
                        <span class="text-gray-900 font-medium text-xs">CHF {{ formatPrice(getPaymentField(appointment, 'lesson_price_rappen')) }}</span>
                      </div>
                      <div v-if="getPaymentField(appointment, 'admin_fee_rappen') > 0" class="flex justify-between items-center">
                        <span class="text-gray-700">Verwaltungsgebühr</span>
                        <span class="text-gray-900 font-medium text-xs">CHF {{ formatPrice(getPaymentField(appointment, 'admin_fee_rappen')) }}</span>
                      </div>
                      <div v-if="getPaymentField(appointment, 'products_price_rappen') > 0" class="flex justify-between items-center">
                        <span class="text-gray-700">Produkte</span>
                        <span class="text-gray-900 font-medium text-xs">CHF {{ formatPrice(getPaymentField(appointment, 'products_price_rappen')) }}</span>
                      </div>
                      <div v-if="getPaymentField(appointment, 'discount_amount_rappen') > 0" class="flex justify-between items-center">
                        <span class="text-gray-700">Rabatt</span>
                        <span class="text-red-600 font-medium text-xs">- CHF {{ formatPrice(getPaymentField(appointment, 'discount_amount_rappen')) }}</span>
                      </div>
                    </template>
                  </div>
                  <div class="border-t border-gray-300 mt-2 pt-2 space-y-2">
                    <!-- Total -->
                    <div class="flex justify-between items-center">
                      <span class="font-semibold text-gray-900 text-xs">Total</span>
                      <span class="font-bold text-gray-900 text-sm">CHF {{ formatPrice(appointment.total_amount_rappen || 0) }}</span>
                    </div>
                    <!-- Payment Method -->
                    <div v-if="getPaymentMethod(appointment)" class="flex items-center justify-between text-xs">
                      <span class="text-gray-600">Zahlungsmethode:</span>
                      <span class="text-gray-900 font-medium">{{ getPaymentMethodLabel(getPaymentMethod(appointment)) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Action Button -->
                <button
                  @click="confirmAppointment(appointment)"
                  :disabled="confirmingAppointments.has(appointment.id)"
                  class="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <svg v-if="confirmingAppointments.has(appointment.id)" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ confirmingAppointments.has(appointment.id) ? 'Wird bestätigt...' : 'Jetzt bestätigen' }}</span>
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
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900"></h2>
            <button 
              @click="showInstructorModal = false"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="isLoading" class="text-center py-8">
            <LoadingLogo size="md" />
            <p class="text-gray-500 mt-2">Fahrlehrer werden geladen...</p>
          </div>

          <!-- School Contact Info -->
          <div v-if="!isLoading && currentTenant" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-blue-900 mb-3">Meine Fahrschule</h3>
            <div class="space-y-2">
              <div class="flex items-start gap-2">
                <svg class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div v-if="currentTenant.contact_email" class="flex items-center gap-2 text-sm text-blue-800">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a :href="`mailto:${currentTenant.contact_email}`" class="text-blue-600 hover:text-blue-800">
                  {{ currentTenant.contact_email }}
                </a>
              </div>
              <div v-if="currentTenant.contact_phone" class="flex items-center gap-2 text-sm text-blue-800">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a :href="`tel:${currentTenant.contact_phone}`" class="text-blue-600 hover:text-blue-800">
                  {{ currentTenant.contact_phone }}
                </a>
              </div>
            </div>
          </div>

          <!-- Instructors List -->
          <div v-if="instructors && instructors.length > 0" class="space-y-2">
            <h3 class="font-semibold text-gray-900 mb-3">Meine Fahrlehrer</h3>
            <div 
              v-for="instructor in instructors" 
              :key="instructor.id"
              class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 hover:border-blue-300 transition-colors cursor-pointer"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">{{ instructor.name }}</h3>
                  <div class="space-y-1 mt-2">
                    <div v-if="instructor.email" class="flex items-center gap-2 text-sm text-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a :href="`mailto:${instructor.email}`" class="text-blue-600 hover:text-blue-800 break-all">
                        {{ instructor.email }}
                      </a>
                    </div>
                    <div v-if="instructor.phone" class="flex items-center gap-2 text-sm text-gray-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a :href="`tel:${instructor.phone}`" class="text-blue-600 hover:text-blue-800">
                        {{ instructor.phone }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Instructors -->
          <div v-else class="text-center py-8">
            <p class="text-gray-600">Noch keine Fahrlehrer. Buchen Sie Ihre erste Fahrstunde!</p>
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

  <!-- Toast Notification -->
  <Toast
    :show="showToast"
    :type="toastType"
    :title="toastTitle"
    :message="toastMessage"
    :duration="2000"
    @close="showToast = false"
  />

  <!-- Profile Modal -->
  <ProfileModal
    :is-open="showProfileModal"
    :user-email="currentUser?.email || ''"
    :user-name="getFirstName()"
    :categories="userDocumentCategories"
    :user-data="userData"
    @close="showProfileModal = false"
    @document-uploaded="loadUserDocuments"
  />
  
</template>

<script setup lang="ts">

// In CustomerDashboard.vue - ganz oben im script setup:
logger.debug('🔍 CustomerDashboard Script loaded')
logger.debug('🔍 Process client:', process.client)
logger.debug('🔍 Process server:', process.server)

import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'
import { buildMerchantReference } from '~/utils/merchantReference'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import EvaluationsOverviewModal from './EvaluationsOverviewModal.vue'
import UpcomingLessonsModal from './UpcomingLessonsModal.vue'
import { useCustomerPayments } from '~/composables/useCustomerPayments'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useTenant } from '~/composables/useTenant'
import ProfileModal from './ProfileModal.vue'

// Composables
const authStore = useAuthStore()
const { user: currentUser, userRole, isClient } = storeToRefs(authStore)
const { loadTenantBrandingById, primaryColor, secondaryColor, accentColor, currentTenantBranding } = useTenantBranding()
const { currentTenant, loadTenant, setTenant } = useTenant()

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
// Hardcoded payment thresholds
const HOURS_BEFORE_APPOINTMENT_FOR_CAPTURE = 24  // Capture exactly 24h before
const HOURS_BEFORE_APPOINTMENT_FOR_IMMEDIATE = 24 // Charge immediately if < 24h away
const automaticPaymentHoursBefore = ref(HOURS_BEFORE_APPOINTMENT_FOR_CAPTURE)
const automaticAuthorizationHoursBefore = ref(HOURS_BEFORE_APPOINTMENT_FOR_CAPTURE) // Same as capture time
const confirmingAppointments = ref<Set<string>>(new Set()) // Loading state per appointment ID

// Profile Modal State
const showProfileModal = ref(false)
const userDocumentCategories = ref<any[]>([])
const userData = ref<any>(null) // Store full user data from users table
const activeClickDiv = ref<string | null>(null) // Track which div is being clicked for visual feedback

// Load user documents
const loadUserDocuments = async () => {
  logger.debug('🔥 loadUserDocuments called [NEW VERSION 2025-12-08]')
  logger.debug('   userData.value?.id:', userData.value?.id)
  logger.debug('   userData.value?.tenant_id:', userData.value?.tenant_id)
  
  if (!userData.value?.id) {
    logger.debug('⚠️ User data not available for loading documents')
    return
  }

  try {
    logger.debug('📄 [NEW] Loading documents from Storage API for user:', userData.value.id)
    
    // Call new endpoint that lists documents directly from Storage
    logger.debug('🌐 Calling /api/documents/list-user-documents with userId:', userData.value.id)
    const response = await $fetch('/api/documents/list-user-documents', {
      query: {
        userId: userData.value.id
      }
    }) as any

    // The API returns {success: true, documents: [...], count: N}
    // Extract the documents array
    const documents = response?.documents || response || []
    
    logger.debug('✅ Loaded documents from Storage:', documents?.length || 0, 'docs:', documents)

    // Load document categories for this tenant
    const supabase = getSupabase()
    const { data: categories, error: catError } = await supabase
      .from('document_categories')
      .select('*')
      .eq('tenant_id', userData.value.tenant_id)
      .order('display_order', { ascending: true })

    if (catError) {
      console.error('❌ Error loading categories:', catError)
      return
    }

    logger.debug('✅ Loaded categories:', categories?.length || 0)

    // Map categories with their documents
    userDocumentCategories.value = (categories || []).map((cat: any) => {
      logger.debug('🔍 Processing category:', cat.code, 'with', documents?.length || 0, 'documents')
      // All uploaded documents go to the first category (Ausweise)
      // Don't filter - just assign all documents to the category
      const categoryDocs = documents || []
      logger.debug('   Assigning', categoryDocs.length, 'docs to category', cat.code)
      return {
        code: cat.code,
        name: cat.name,
        description: cat.description,
        documents: categoryDocs
      }
    })

    logger.debug('✅ Documents grouped, categories:', userDocumentCategories.value.length)
    if (userDocumentCategories.value.length > 0) {
      logger.debug('📂 First category:', userDocumentCategories.value[0])
    }
  } catch (err: any) {
    console.error('❌ Error loading documents:', err)
  }
}

// Toast Notification State
const showToast = ref(false)
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success')
const toastTitle = ref('')
const toastMessage = ref('')

// Toast Helper Function
const displayToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string = '') => {
  toastType.value = type
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
}

// In CustomerDashboard.vue - vor dem Template:
const isServerSide = process.server
const showContent = computed(() => !isServerSide && currentUser.value && isClient.value)

// Tenant colors - elegant combination of primary and secondary
const primary = computed(() => primaryColor.value || '#2563eb')
const secondary = computed(() => secondaryColor.value || '#64748B')
const accent = computed(() => accentColor.value || '#3B82F6')

// Primary color variants (for main actions)
const buttonColor = computed(() => primary.value)
const buttonColorLight = computed(() => `${primary.value}15`) // Light background
const buttonBorderColor = computed(() => `${primary.value}40`) // Subtle border

// Secondary color variants (for accent/alternative actions)
const secondaryButtonColor = computed(() => secondary.value)
const secondaryButtonColorLight = computed(() => `${secondary.value}15`)
const secondaryButtonBorderColor = computed(() => `${secondary.value}40`)

// Accent color for special highlights
const accentButtonColor = computed(() => accent.value)
const accentButtonColorLight = computed(() => `${accent.value}15`)
const accentButtonBorderColor = computed(() => `${accent.value}40`)

const {
  payments,
  pendingPayments,
  loadPayments,
  isLoading: paymentsLoading,
  error: paymentsError
} = useCustomerPayments()

// Computed properties
const completedLessonsCount = computed(() => {
  const now = new Date()
  return appointments.value?.filter(apt => {
    // Termin ist absolviert wenn:
    // 1. Status ist 'completed' ODER
    // 2. Status ist 'confirmed' UND der Termin liegt in der Vergangenheit
    if (apt.status === 'completed') return true
    if (apt.status === 'confirmed' && apt.end_time) {
      const endTime = new Date(apt.end_time)
      return endTime < now
    }
    return false
  }).length || 0
})

const paidAppointments = computed(() => {
  const now = new Date()
  return appointments.value?.filter(apt => {
    // Termin ist absolviert wenn:
    // 1. Status ist 'completed' ODER
    // 2. Status ist 'confirmed' UND der Termin liegt in der Vergangenheit
    if (apt.status === 'completed') return true
    if (apt.status === 'confirmed' && apt.end_time) {
      const endTime = new Date(apt.end_time)
      return endTime < now
    }
    return false
  }) || []
})

const paymentsCount = computed(() => {
  return payments.value?.length || 0
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
  error.value = null
  try {
    const results = await Promise.allSettled([
      loadAllData(),
      loadPayments(),
      loadPendingConfirmations(),
      checkPaymentMethod()
    ])
    
    // Check results for errors
    const failed = results.filter((r, idx) => {
      if (r.status === 'rejected') {
        console.error(`❌ Refresh task ${idx} failed:`, r.reason)
        return true
      }
      return false
    })
    
    if (failed.length > 0) {
      console.warn(`⚠️ ${failed.length} refresh task(s) failed, but continuing`)
    } else {
      logger.debug('✅ Data refreshed successfully')
    }
  } catch (err: any) {
    console.error('❌ Critical refresh error:', err)
    error.value = `Fehler beim Aktualisieren: ${err.message}`
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
    displayToast('error', 'Fehler', 'Fehler beim Weiterleiten zur Zahlung.')
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
    // Parse UTC datetime and convert to Zurich timezone
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum/Zeit'
    }
    const weekday = date.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', weekday: 'short' }) // z.B. "Mo."
    const datePart = date.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', year: 'numeric' })
    const timePart = date.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })
    return `${weekday} ${datePart} ${timePart}`
  } catch (error) {
    console.warn('Error formatting dateTime:', dateString, error)
    return 'Datum/Zeit Fehler'
  }
}

const formatPaymentDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Nicht geplant'
  try {
    // Parse als lokale Zeit (nicht UTC) - konsistent mit formatDateTime
    const parts = dateString.replace('T', ' ').replace('Z', '').replace('+00', '').split(/[-: ]/)
    const date = new Date(
      parseInt(parts[0]), // year
      parseInt(parts[1]) - 1, // month (0-indexed)
      parseInt(parts[2]), // day
      parseInt(parts[3] || '0'), // hour
      parseInt(parts[4] || '0'), // minute
      parseInt(parts[5] || '0')  // second
    )
    
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

// Helper function to handle click with visual feedback
const handleClickWithDelay = async (divId: string, callback: () => Promise<any> | any) => {
  activeClickDiv.value = divId
  try {
    await callback()
  } finally {
    // Reset after a short delay so the visual effect is visible
    await new Promise(resolve => setTimeout(resolve, 150))
    activeClickDiv.value = null
  }
}

const navigateToPayments = async () => {
  // Immer zur Zahlungsübersicht
  await navigateTo('/customer/payments')
}

const navigateToLessonBooking = async () => {
  // Navigiere zur Coming Soon Seite
  await navigateTo('/customer/coming-soon')
}

const navigateToCourseBooking = async () => {
  // Navigiere zur Coming Soon Seite
  await navigateTo('/customer/coming-soon')
}

const navigateToShop = async () => {
  // Navigiere zum Shop mit Tenant-Parameter
  const tenantSlug = currentTenant.value?.slug || 'driving-team'
  await navigateTo(`/shop?tenant=${tenantSlug}`)
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

    logger.debug('✅ Customer dashboard data loaded successfully')
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
    logger.debug('⚠️ No current user ID for loadPendingConfirmations')
    return
  }

  try {
    const supabase = getSupabase()
    
    const { data: userDataFromDb, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError || !userDataFromDb) return
    
    // Store user data for ProfileModal
    userData.value = userDataFromDb



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
        event_type_code,
        staff:users!appointments_staff_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('user_id', userDataFromDb.id)
      .eq('status', 'pending_confirmation')
      .eq('tenant_id', userDataFromDb.tenant_id)
      .not('confirmation_token', 'is', null)
      .order('start_time', { ascending: true })

    if (confirmationsError) {
      console.warn('⚠️ Error loading pending confirmations:', confirmationsError)
      return
    }

    if (!confirmationsData || confirmationsData.length === 0) {
      pendingConfirmations.value = []
      logger.debug('✅ No pending confirmations found')
      return
    }

    // ✅ Lade Kategorien separat basierend auf type (z.B. "B")
    const categoryCodes = [...new Set(confirmationsData.map(apt => apt.type).filter(Boolean))]
    let categoriesMap = new Map()
    if (categoryCodes.length > 0) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('code, name')
        .in('code', categoryCodes)
        .eq('tenant_id', userDataFromDb.tenant_id)
      
      if (!categoriesError && categoriesData) {
        categoriesData.forEach(cat => {
          categoriesMap.set(cat.code, cat)
        })
      }
    }

    // Merge categories into appointments
    confirmationsData.forEach(apt => {
      if (apt.type && categoriesMap.has(apt.type)) {
        (apt as any).categories = categoriesMap.get(apt.type)
      }
    })

    // ✅ DANACH: Lade Payments für diese Appointments separat
    const appointmentIds = confirmationsData.map(apt => apt.id)
    let paymentsData = null
    
    // Nur Query ausführen wenn Appointment IDs vorhanden
    if (appointmentIds.length > 0) {
      const { data, error: paymentsError } = await supabase
        .from('payments')
        .select('id, appointment_id, total_amount_rappen, payment_method, payment_status, lesson_price_rappen, admin_fee_rappen, products_price_rappen, discount_amount_rappen')
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

    // ✅ Lade payment_items für alle payments
    const paymentItemsMap = new Map()
    if (paymentsData && paymentsData.length > 0) {
      const paymentIds = paymentsData.map(p => p.id)
      const { data: itemsData } = await supabase
        .from('payment_items')
        .select('*')
        .in('payment_id', paymentIds)
        .order('created_at', { ascending: true })
      
      if (itemsData) {
        itemsData.forEach(item => {
          if (!paymentItemsMap.has(item.payment_id)) {
            paymentItemsMap.set(item.payment_id, [])
          }
          paymentItemsMap.get(item.payment_id).push(item)
        })
      }
    }

    // Load tenant payment settings for automatic payment hours (from payment_settings JSON)
    if (userData.value?.tenant_id) {
      try {
        const { data: paymentSettings } = await supabase
          .from('tenant_settings')
          .select('setting_value')
          .eq('tenant_id', userData.value.tenant_id)
          .eq('category', 'payment')
          .eq('setting_key', 'payment_settings')
          .maybeSingle()
        
        if (paymentSettings?.setting_value) {
          const settings = typeof paymentSettings.setting_value === 'string' 
            ? JSON.parse(paymentSettings.setting_value) 
            : paymentSettings.setting_value
          automaticPaymentHoursBefore.value = Number(settings?.automatic_payment_hours_before) || 24
          // Wallee akzeptiert maximal 120 Stunden (5 Tage) Authorization Hold
          const authHours = Number(settings?.automatic_authorization_hours_before) || 120
          automaticAuthorizationHoursBefore.value = Math.min(authHours, 120)
        }
      } catch (e) {
        console.warn('⚠️ Konnte Payment Settings nicht laden für Stunden:', e)
      }
    }

    // Calculate total amount for each appointment (from payment)
    pendingConfirmations.value = confirmationsData.map(apt => {
      const payments = paymentsMap.get(apt.id) || []
      const payment = payments.length > 0 ? payments[0] : null
      const items = payment ? paymentItemsMap.get(payment.id) || [] : []
      
      return {
        ...apt,
        total_amount_rappen: payment?.total_amount_rappen || 0,
        payments: payments, // Include for compatibility
        payment_items: items, // ✅ Neu: Payment items hinzufügen
        // ✅ Direkte Payment-Felder für Fallback
        lesson_price_rappen: payment?.lesson_price_rappen || 0,
        admin_fee_rappen: payment?.admin_fee_rappen || 0,
        products_price_rappen: payment?.products_price_rappen || 0,
        discount_amount_rappen: payment?.discount_amount_rappen || 0
      }
    })

    logger.debug('✅ Loaded pending confirmations:', pendingConfirmations.value.length)
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
    
    logger.debug('✅ Payment method check:', hasPaymentMethod.value ? 'Has payment method' : 'No payment method')
  } catch (err: any) {
    console.error('❌ Error checking payment method:', err)
    hasPaymentMethod.value = false
  }
}

// Helper: Event Type Label
const getEventTypeLabel = (code: string | null | undefined) => {
  if (!code) return 'Fahrlektion'
  const c = String(code).toLowerCase()
  if (c.includes('exam') || c === 'prüfung') return 'Prüfung'
  if (c.includes('theor')) return 'Theorielektion'
  if (c.includes('lesson') || c === 'fahrlektion') return 'Fahrlektion'
  return 'Fahrlektion'
}

const getInstructorName = (appointment: any) => {
  if (!appointment) return 'Wird zugewiesen'
  const staff = appointment.staff
  if (staff && staff.first_name) {
    return staff.first_name
  }
  if (appointment.staff_name) {
    return appointment.staff_name.split(' ')[0]
  }
  return 'Wird zugewiesen'
}

const getCategoryLabel = (appointment: any) => {
  if (!appointment) return 'Kategorie offen'
  if (appointment.categories?.name) return appointment.categories.name
  if (appointment.type) return `Kategorie ${appointment.type}`
  return 'Kategorie offen'
}

// Helper: Check if appointment has payment details to show
const hasPaymentDetails = (appointment: any) => {
  // Methode 1: payment_items existieren
  if (appointment.payment_items && appointment.payment_items.length > 0) {
    return true
  }
  
  // Methode 2: Direkte Payment-Felder existieren (Fallback)
  if (appointment.lesson_price_rappen > 0 ||
      appointment.admin_fee_rappen > 0 ||
      appointment.products_price_rappen > 0 ||
      appointment.discount_amount_rappen > 0) {
    return true
  }
  
  return false
}

// Helper: Get payment field value
const getPaymentField = (appointment: any, fieldName: string) => {
  return appointment[fieldName] || 0
}

// ✅ Get payment method from appointment
const getPaymentMethod = (appointment: any) => {
  // Try to get payment method from first payment
  if (appointment.payments && appointment.payments.length > 0) {
    return appointment.payments[0].payment_method
  }
  return null
}

// ✅ Get payment method label
const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'wallee': 'Online',
    'invoice': 'Rechnung',
    'cash': 'Barzahlung',
    'credit': 'Guthaben',
    'twint': 'TWINT',
    'bank_transfer': 'Banküberweisung'
  }
  return labels[method] || method
}

// ✅ Confirm appointment and redirect directly to Wallee (skip extra confirmation page)
const confirmAppointment = async (appointment: any) => {
  if (confirmingAppointments.value.has(appointment.id)) return // Verhindere Doppelklick
  
  try {
    confirmingAppointments.value.add(appointment.id)
    
    if (!appointment?.id) {
      displayToast('error', 'Fehler', 'Termin-ID fehlt')
      confirmingAppointments.value.delete(appointment.id)
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
      displayToast('error', 'Fehler', 'Benutzer nicht gefunden')
      confirmingAppointments.value.delete(appointment.id)
      return
    }

    // ✅ SCHRITT 1: Setze Termin SOFORT auf 'confirmed' - BEVOR Zahlung starten!
    logger.debug('🔄 Setting appointment to confirmed immediately...')
    try {
      const confirmResult = await $fetch('/api/appointments/confirm', {
        method: 'POST',
        body: {
          appointmentId: appointment.id
        }
      }) as { success?: boolean; error?: string }
      
      if (!confirmResult.success) {
        console.error('⚠️ Could not confirm appointment:', confirmResult.error)
        throw new Error(confirmResult.error || 'Could not confirm appointment')
      } else {
        logger.debug('✅ Appointment confirmed immediately')
      }
    } catch (err) {
      console.error('❌ Error confirming appointment:', err)
      displayToast('error', 'Fehler', 'Termin konnte nicht bestätigt werden')
      confirmingAppointments.value.delete(appointment.id)
      return
    }

    // Hole Payment für diesen Termin (Betrag)
    const { data: payment } = await supabase
      .from('payments')
      .select('id, total_amount_rappen, payment_method')
      .eq('appointment_id', appointment.id)
      .order('created_at', { ascending: false })
      .maybeSingle()

    // ✅ NEU: Wenn payment_method 'cash', 'invoice' oder 'credit' ist, NICHT zu Wallee weiterleiten!
    if (payment?.payment_method === 'cash' || payment?.payment_method === 'invoice' || payment?.payment_method === 'credit') {
      logger.debug('✅ Payment method is', payment.payment_method, '- no online payment needed')
      displayToast('success', 'Termin bestätigt!', `Zahlungsart: ${getPaymentMethodLabel(payment.payment_method)}`)
      
      // Termin ist bereits bestätigt (siehe weiter oben)
      confirmingAppointments.value.delete(appointment.id)
      
      // ✅ Entferne bestätigten Termin aus der pendingConfirmations Liste
      const index = pendingConfirmations.value.findIndex((apt: any) => apt.id === appointment.id)
      if (index !== -1) {
        pendingConfirmations.value.splice(index, 1)
        logger.debug('✅ Removed confirmed appointment from pending list')
      }
      
      // ✅ Force refresh pending confirmations - load all remaining
      logger.debug('🔄 Refreshing pending confirmations after confirmation...')
      await loadPendingConfirmations()
      
      // ✅ Schließe das Modal
      showConfirmationModal.value = false
      
      return // Fertig, nicht zu Wallee weiterleiten!
    }

    const amountRappen = payment?.total_amount_rappen || 0
    if (!amountRappen || amountRappen <= 0) {
      displayToast('error', 'Fehler', 'Betrag für den Termin nicht gefunden')
      confirmingAppointments.value.delete(appointment.id)
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
        // Wallee akzeptiert maximal 120 Stunden (5 Tage) Authorization Hold
        const authHours = Number(settings?.automatic_authorization_hours_before) || 120
        automaticAuthorizationHoursBeforeLocal = Math.min(authHours, 120)
        
        logger.debug('✅ Payment settings loaded:', {
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
      
      logger.debug('💳 Payment method check:', {
        hasMethod: !!defaultMethodId,
        automaticPaymentEnabled: automaticPaymentEnabledLocal,
        note: defaultMethodId 
          ? 'Token vorhanden → Automatische Zahlung möglich' 
          : 'Kein Token → Weiterleitung zu Wallee (Token wird erstellt)'
      })
    }

    // ✅ Entscheide: automatische Zahlung planen oder sofortige Zahlung
    // Regel: Automatische Zahlung mit Token wenn:
    // 1. Automatische Zahlung aktiviert ist
    // 2. Ein gespeichertes Zahlungsmittel (Token) vorhanden ist
    // → ENTWEDER: Genug Zeit → Schedule für später
    // → ODER: Zu wenig Zeit → Sofort authorize + capture
    // SONST: Weiterleitung zu Wallee (Token wird erstellt/gespeichert)
    const startDate = new Date(appointment.start_time)
    const now = new Date()
    const diffHours = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    // ✅ NEU: Wenn Token vorhanden, IMMER mit Token verarbeiten (entweder scheduled oder immediate)
    const hasToken = automaticPaymentEnabledLocal && !!defaultMethodId
    const shouldProcessImmediately = hasToken && diffHours < automaticPaymentHoursBeforeLocal
    const canScheduleAutomatic = hasToken && diffHours >= automaticPaymentHoursBeforeLocal
    
    logger.debug('🔍 Automatic payment decision:', {
      automaticPaymentEnabled: automaticPaymentEnabledLocal,
      hasDefaultMethod: !!defaultMethodId,
      diffHours: diffHours,
      requiredHours: automaticPaymentHoursBeforeLocal,
      hasToken: hasToken,
      shouldProcessImmediately: shouldProcessImmediately,
      canScheduleAutomatic: canScheduleAutomatic,
      appointmentStart: appointment.start_time,
      decision: shouldProcessImmediately
        ? '⚡ Token vorhanden + zu wenig Zeit → Sofort authorize + capture'
        : canScheduleAutomatic 
          ? '✅ Token vorhanden + genug Zeit → Automatische Zahlung geplant' 
          : '💳 Kein Token vorhanden → Weiterleitung zu Wallee (Token wird erstellt)'
    })

    // ℹ️ NICHT den Status zu 'scheduled' setzen - das erfolgt erst nach erfolgreicher Zahlung via Webhook
    // Der Termin bleibt auf 'pending_confirmation' bis der Webhook von Wallee kommt

    // ✅ NEU: Wenn Token vorhanden, IMMER mit Token verarbeiten
    if (hasToken && payment?.id) {
      // ✅ Plane automatische Zahlung 24h (oder konfiguriert) vor Termin
      const scheduledPayDate = new Date(startDate.getTime() - automaticPaymentHoursBeforeLocal * 60 * 60 * 1000)
      // ✅ Bestimme frühesten Autorisierungszeitpunkt (z. B. 1 Woche vorher)
      const authDueDate = new Date(startDate.getTime() - automaticAuthorizationHoursBeforeLocal * 60 * 60 * 1000)
      
      // Runde auf die nächste volle Stunde auf (Cron läuft zur vollen Stunde)
      const roundToNextFullHour = (date: Date) => {
        const rounded = new Date(date)
        if (rounded.getMinutes() > 0 || rounded.getSeconds() > 0) {
          rounded.setHours(rounded.getHours() + 1)
        }
        rounded.setMinutes(0)
        rounded.setSeconds(0)
        rounded.setMilliseconds(0)
        return rounded
      }
      
      const roundedPayDate = roundToNextFullHour(scheduledPayDate)
      const roundedAuthDate = roundToNextFullHour(authDueDate)
      
      // ✅ NEU: Bei Immediate Processing IMMER sofort authorize
      const shouldAuthorizeNow = shouldProcessImmediately || now >= roundedAuthDate

      await supabase
        .from('payments')
        .update({
          automatic_payment_consent: true,
          automatic_payment_consent_at: new Date().toISOString(),
          // ✅ Nur scheduled_payment_date setzen, wenn >= 24h entfernt (nicht für sofortige Zahlungen)
          scheduled_payment_date: shouldProcessImmediately ? null : roundedPayDate.toISOString(),
          // speichere geplanten Autorisierungszeitpunkt, wenn noch nicht fällig
          scheduled_authorization_date: shouldAuthorizeNow ? new Date().toISOString() : roundedAuthDate.toISOString(),
          payment_method_id: defaultMethodId,
          payment_method: 'wallee',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      // ✅ NEU: Termin sofort auf 'confirmed' setzen, wenn der Kunde bestätigt
      try {
        const confirmResult = await $fetch('/api/appointments/confirm', {
          method: 'POST',
          body: {
            appointmentId: appointment.id
          }
        }) as { success?: boolean; error?: string }
        
        if (!confirmResult.success) {
          console.error('⚠️ Could not confirm appointment immediately:', confirmResult.error)
          displayToast('error', 'Fehler', `Termin konnte nicht sofort bestätigt werden: ${confirmResult.error}`)
          confirmingAppointments.value.delete(appointment.id)
          return
        } else {
          logger.debug('✅ Appointment confirmed immediately after customer click')
        }
      } catch (err: any) {
        console.error('⚠️ Error confirming appointment immediately:', err)
        displayToast('error', 'Fehler', `Fehler beim sofortigen Bestätigen des Termins: ${err.message}`)
        confirmingAppointments.value.delete(appointment.id)
        return
      }
      
      logger.debug('⏳ Authorization scheduled at', authDueDate.toISOString(), '; capture scheduled at', scheduledPayDate.toISOString())
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
    const staffName = appointment.staff
      ? `${appointment.staff.first_name || ''} ${appointment.staff.last_name || ''}`.trim()
      : appointment.staff_name || ''
    const merchantReferenceDetails = {
      appointmentId: appointment.id,
      eventTypeCode: appointment.event_type_code || appointment.appointment_type || appointment.type,
      categoryCode: appointment.type,
      categoryName: appointment.category_name,
      staffName,
      startTime: appointment.start_time,
      durationMinutes: appointment.duration_minutes
    }
    type WalleeResponse = { success?: boolean; paymentUrl?: string; transactionId?: number | string; error?: string }
    const orderId = buildMerchantReference(merchantReferenceDetails)

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
        failedUrl: `${window.location.origin}/payment/success?paymentId=${payment?.id}`,
        merchantReferenceDetails
      }
    })

    if (!response?.success || !response.paymentUrl) {
      console.error('Create transaction failed:', response)
      displayToast('error', 'Fehler', 'Zahlung konnte nicht gestartet werden. Bitte später erneut versuchen.')
      confirmingAppointments.value.delete(appointment.id)
      return
    }

    logger.debug('✅ Wallee transaction created:', {
      transactionId: response.transactionId,
      paymentId: payment?.id,
      paymentUrl: response.paymentUrl
    })

    // Verknüpfe Payment mit der Wallee-Transaktion, falls Payment existiert
    if (payment?.id && response.transactionId) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_method: 'wallee',
          wallee_transaction_id: String(response.transactionId),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
      
      if (updateError) {
        console.error('❌ Failed to update payment with transaction ID:', updateError)
      } else {
        logger.debug('✅ Payment updated with transaction ID:', response.transactionId)
      }
    } else {
      console.warn('⚠️ Cannot update payment - missing payment ID or transaction ID:', {
        paymentId: payment?.id,
        transactionId: response.transactionId
      })
    }

    // ✅ Der Termin ist bereits bestätigt (siehe oben)
    // Wir aktualisieren den Status NICHT mehr hier, da er bereits auf 'confirmed' gesetzt wurde!

    // Direkt zu Wallee weiterleiten
    logger.debug('🔄 Redirecting to Wallee payment page...')
    window.location.href = response.paymentUrl
  } catch (err: any) {
    console.error('❌ Fehler beim Starten der Zahlung:', err)
    displayToast('error', 'Fehler beim Starten der Zahlung', err?.message || 'Unbekannter Fehler')
  } finally {
    confirmingAppointments.value.delete(appointment.id)
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

    logger.debug('🔍 Loading appointments for user:', userData.id)

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
    logger.debug('✅ Appointments loaded:', appointmentsData?.length || 0)

    const locationIds = [...new Set(appointmentsData?.map(a => a.location_id).filter(Boolean))]
    logger.debug('🔍 Location IDs found:', locationIds)
    
    let locationsMap: Record<string, { name: string; address?: string; formatted_address?: string }> = {}
    
    if (locationIds.length > 0) {
      logger.debug('🔍 Loading locations for IDs:', locationIds)
      
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, address, formatted_address')
        .in('id', locationIds)

      if (locationsError) {
        console.error('❌ Error loading locations:', locationsError)
      } else if (locations) {
        logger.debug('✅ Locations loaded:', locations)
        
        locationsMap = locations.reduce((acc, loc) => {
          acc[loc.id] = {
            name: loc.name,
            address: loc.address,
            formatted_address: loc.formatted_address
          }
          return acc
        }, {} as Record<string, any>)
        
        logger.debug('✅ LocationsMap created:', locationsMap)
      }
    } else {
      logger.debug('⚠️ No location IDs found in appointments')
    }

    const appointmentIds = appointmentsData?.map(a => a.id) || []
    logger.debug('🔍 Searching evaluations for appointments:', appointmentIds.length)

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

    logger.debug('✅ Evaluations loaded:', notes?.length || 0)

    const criteriaIds = [...new Set(notes?.map(n => n.evaluation_criteria_id).filter(Boolean))]
    let criteriaMap: Record<string, any> = {}

    if (criteriaIds.length > 0) {
      logger.debug('🔍 Loading criteria details for:', criteriaIds.length, 'criteria')
      
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
        logger.debug('✅ Criteria loaded:', criteria.length)
        
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
    logger.debug('🔍 Sample location_details:', lessonsWithEvaluations.slice(0, 3).map(lesson => ({
      id: lesson.id,
      location_id: lesson.location_id,
      location_name: lesson.location_name,
      location_details: lesson.location_details
    })))

    logger.debug('✅ Final lessons with evaluations:', lessonsWithEvaluations.length)

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
  logger.debug('✅ Instructors loaded:', instructors.value.length)
}

const getInstructorInitials = (instructor: any) => {
  if (!instructor) return 'N/A'
  const firstName = instructor.first_name || ''
  const lastName = instructor.last_name || ''
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  return initials || 'N/A'
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
    logger.debug('🚪 Logging out user...')
    
    await authStore.logout()
    
    logger.debug('✅ Logout successful, redirecting to tenant login...')
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
    logger.debug('🔄 User is not a client, redirecting to main dashboard')
    navigateTo('/')
  }
}, { immediate: true })

// pages/index.vue - im Watcher für userRole:
// pages/index.vue - ändere den Watcher:
const route = useRoute() // ← Hier oben definieren, außerhalb des watchers

watch(userRole, (newRole: string | null) => {
  logger.debug('🔍 WATCHER TRIGGERED - userRole changed to:', newRole)
  
  if (newRole) {
    logger.debug('DEBUG: UserRole detected in index.vue watcher:', newRole);
    
    const currentPath = route.path; // ← Jetzt route.path verwenden statt useRoute().path
    let targetPath = '/';

    switch (newRole) {
      case 'admin':
        targetPath = '/admin';
        logger.debug('🔄 Navigating admin to:', targetPath);
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

    logger.debug('🎯 Final navigation:', currentPath, '→', targetPath);
    if (currentPath !== targetPath) {
      navigateTo(targetPath);
    }
  } else {
    logger.debug('🔍 WATCHER - userRole is null/empty')
  }
}, { immediate: true })// ← Stelle sicher dass immediate: true da ist

// Watch for tenant branding changes
watch(() => currentTenantBranding.value, (newVal) => {
  if (newVal) {
    logger.debug('👀 Tenant branding changed:', {
      name: newVal.name,
      colors: newVal.colors,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
      accentColor: accentColor.value,
      buttonColor: buttonColor.value,
      secondaryButtonColor: secondaryButtonColor.value,
      accentButtonColor: accentButtonColor.value
    })
  }
}, { deep: true })

// Watch for ProfileModal opening to load documents
watch(() => showProfileModal.value, async (newVal) => {
  if (newVal && userData.value) {
    logger.debug('📂 ProfileModal opened, loading documents...')
    await loadUserDocuments()
  }
})

// Lifecycle
onMounted(async () => {
  logger.debug('🔥 CustomerDashboard mounted')
  
  try {
    // Check for payment success/failure from Wallee redirect
    const route = useRoute()
    const paymentSuccess = route.query.payment_success === 'true'
    const paymentFailed = route.query.payment_failed === 'true'
    
    if (paymentSuccess) {
      logger.debug('💳 Payment success detected, refreshing data...')
      // Small delay to ensure webhook processed
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Einfacher: Warte auf Auth-Store Initialisierung
    let attempts = 0
    while (!authStore.isInitialized && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    if (!authStore.isLoggedIn || !authStore.isClient) {
      logger.debug('❌ Not logged in or not a client, redirecting...')
      await navigateTo('/')
      return
    }
    
    logger.debug('✅ Auth verified, loading data...')
    
    // First, load user data from database
    if (!userData.value && currentUser.value?.id) {
      const supabase = getSupabase()
      const { data: userDataFromDb, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', currentUser.value.id)
        .single()
      
      if (!userError && userDataFromDb) {
        userData.value = userDataFromDb
        logger.debug('✅ User data loaded:', userDataFromDb.id)
      } else {
        console.warn('⚠️ Error loading user data:', userError?.message)
      }
    }
    
    // Load tenant data and branding
    if (userData.value?.tenant_id) {
      logger.debug('🎨 Loading tenant data for:', userData.value.tenant_id)
      
      // Load tenant info from database using tenant_id
      const supabase = getSupabase()
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', userData.value.tenant_id)
        .single()
      
      if (!tenantError && tenantData) {
        logger.debug('✅ Tenant loaded:', tenantData.name)
        // Update the useTenant composable with the loaded tenant
        setTenant(tenantData)
      } else {
        console.warn('⚠️ Error loading tenant:', tenantError?.message)
      }
      
      // Also load branding
      await loadTenantBrandingById(userData.value.tenant_id)
    }
    
    await loadAllData()
    await loadPayments()
    
    // Show payment status toast
    if (paymentSuccess) {
      displayToast('success', 'Zahlung erfolgreich!', 'Dein Termin wurde bestätigt.')
      // Clean up query parameter
      await navigateTo('/customer-dashboard', { replace: true })
    } else if (paymentFailed) {
      displayToast('error', 'Zahlung fehlgeschlagen', 'Bitte versuche es später erneut.')
      // Clean up query parameter
      await navigateTo('/customer-dashboard', { replace: true })
    }
    
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