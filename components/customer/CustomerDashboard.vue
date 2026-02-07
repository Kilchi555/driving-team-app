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

    <!-- Loading State - removed large spinner, uses small one in content area instead -->

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
                <span class="text-sm font-semibold text-gray-700">{{ upcomingLessonsCount }}</span>
              </div>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p v-if="upcomingLessonsCount > 0" class="text-gray-600 text-sm">
                  Du hast {{ upcomingLessonsCount }} {{ upcomingLessonsCount === 1 ? 'Termin' : 'Termine' }} geplant
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        
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
        <!-- Vorläufig auskommentiert - wird später aktiviert -->
        <!--
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
                Shop
              </h3>
            </div>
            
            <div class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <p class="text-gray-600 text-sm">
                  Finde hier unsere Produkte
                </p>
              </div>
            </div>
          </div>
        </div>
        -->

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

      <!-- Weitere Sektionen in Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        
        <!-- Mein Profil Card -->
        <div 
          @click="handleClickWithDelay('profile', () => { showProfileModal = true })"
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
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
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
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
          class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform" 
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

    <!-- ✅ MODAL: Reglement Detail-Ansicht (IN MODAL, nicht als separate Seite!) -->
    <div v-if="showReglementDetailModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">{{ showReglementTitle }}</h2>
          <button 
            @click="showReglementDetailModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content - XSS Protected via DOMPurify -->
        <div class="p-6 overflow-y-auto flex-1 prose prose-lg max-w-none">
          <div v-html="sanitizedReglementContent"></div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-200 flex-shrink-0">
          <button 
            @click="showReglementDetailModal = false; showReglementeModal = true"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zurück zur Übersicht
          </button>
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

                  <!-- Event Type Code + "mit" + Staff Name -->
                  <div class="flex items-center gap-2 text-gray-600">
                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      {{ getEventTypeLabel(appointment.event_type_code) }}
                    </span>
                    <span class="font-medium">mit {{ getInstructorName(appointment) }}</span>
                  </div>

                  <!-- Zahlungsart & Kategorie -->
                  <div class="flex items-center justify-between text-gray-600">
                    <div class="flex items-center">
                      <svg class="w-4 h-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v4a1 1 0 001 1h4a1 1 0 001-1V7m-6 0V5a2 2 0 012-2h2a2 2 0 012 2v2m0 0h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V7m0 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                      </svg>
                      <span class="font-medium">{{ getPaymentMethodLabel(appointment.payment?.payment_method) }}</span>
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
                    <!-- Payment details from payment object or direct fields -->
                    <div v-if="appointment.payment">
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
                    </div>
                    <!-- Fallback: Direct payment fields if no payment object -->
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
                      <span class="font-bold text-gray-900 text-sm">CHF {{ formatPrice((appointment.payment?.total_amount_rappen || appointment.total_amount_rappen) || 0) }}</span>
                    </div>
                    <!-- Credit Used -->
                    <div v-if="appointment.payment?.credit_used_rappen && appointment.payment.credit_used_rappen > 0" class="flex justify-between items-center">
                      <span class="text-gray-600 text-xs">Verwendetes Guthaben</span>
                      <span class="text-green-600 font-medium text-xs">-CHF {{ formatPrice(appointment.payment.credit_used_rappen) }}</span>
                    </div>
                    <!-- Still to Pay (if credit was used) -->
                    <div v-if="appointment.payment?.credit_used_rappen && appointment.payment.credit_used_rappen > 0" class="flex justify-between items-center border-t border-gray-200 pt-2">
                      <span class="font-semibold text-gray-900 text-xs">Noch zu zahlen</span>
                      <span class="font-bold text-blue-600 text-sm">CHF {{ formatPrice(Math.max(0, (appointment.payment?.total_amount_rappen || 0) - (appointment.payment?.credit_used_rappen || 0))) }}</span>
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
      :lessons="lessons"
      @close="showUpcomingLessonsModal = false"
    />

    <!-- Instructor Details Modal -->
    <div v-if="showInstructorModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Kontakt</h2>
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
          <div v-if="!isLoading && currentTenantBranding" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-blue-900 mb-3">Meine Fahrschule</h3>
            <div class="space-y-2">
           
              <div v-if="currentTenantBranding.contact?.email" class="flex items-center gap-2 text-sm text-blue-800">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a :href="`mailto:${currentTenantBranding.contact.email}`" class="text-blue-600 hover:text-blue-800">
                  {{ currentTenantBranding.contact.email }}
                </a>
              </div>
              <div v-if="currentTenantBranding.contact?.phone" class="flex items-center gap-2 text-sm text-blue-800">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a :href="`tel:${currentTenantBranding.contact.phone}`" class="text-blue-600 hover:text-blue-800">
                  {{ currentTenantBranding.contact.phone }}
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
  
  <!-- 💳 Payment Confirmation Dialog -->
  <Teleport to="body">
    <div v-if="showPaymentConfirmDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-in fade-in relative">
        <!-- Close Button (top right) -->
        <button
          @click="handlePayLater"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Schließen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Header -->
        <div class="flex items-center justify-center mb-6">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h10m4 0a1 1 0 11-2 0 1 1 0 012 0zM7 15a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
        </div>
        
        <!-- Content -->
        <h2 class="text-2xl font-bold text-gray-900 mb-3 text-center">Zahlung erforderlich</h2>
        <p class="text-gray-600 text-center mb-8">
          Dein Termin wurde erfolgreich bestätigt! Möchtest du jetzt bezahlen oder später?
        </p>
        
        <!-- Buttons -->
        <div class="flex gap-3">
          <!-- Später Button -->
          <button
            @click="handlePayLater"
            :disabled="isProcessingPayment"
            class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Später
          </button>
          
          <!-- Jetzt Bezahlen Button -->
          <button
            @click="handlePayNow"
            :disabled="isProcessingPayment"
            class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg v-if="isProcessingPayment" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span v-if="isProcessingPayment">Lädt...</span>
            <span v-else>Jetzt</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
  
</template>

<script setup lang="ts">

import { logger } from '~/utils/logger'
import DOMPurify from 'isomorphic-dompurify'

// In CustomerDashboard.vue - ganz oben im script setup:
logger.debug('🔍 CustomerDashboard Script loaded')
logger.debug('🔍 Process client:', process.client)
logger.debug('🔍 Process server:', process.server)

import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import { buildMerchantReference } from '~/utils/merchantReference'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import EvaluationsOverviewModal from './EvaluationsOverviewModal.vue'
import UpcomingLessonsModal from './UpcomingLessonsModal.vue'
import { useCustomerPayments } from '~/composables/useCustomerPayments'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useTenant } from '~/composables/useTenant'
import { replacePlaceholders } from '~/utils/reglementPlaceholders'
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
const showReglementDetailModal = ref(false)
const showReglementContent = ref('')
const showReglementTitle = ref('')

// XSS Protection: Sanitize HTML content before rendering
const sanitizedReglementContent = computed(() => {
  if (!showReglementContent.value) return ''
  return DOMPurify.sanitize(showReglementContent.value, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style']
  })
})
// Hardcoded payment thresholds
const HOURS_BEFORE_APPOINTMENT_FOR_CAPTURE = 24  // Capture exactly 24h before
const HOURS_BEFORE_APPOINTMENT_FOR_IMMEDIATE = 24 // Charge immediately if < 24h away
const automaticPaymentHoursBefore = ref(HOURS_BEFORE_APPOINTMENT_FOR_CAPTURE)
const automaticAuthorizationHoursBefore = ref(HOURS_BEFORE_APPOINTMENT_FOR_CAPTURE) // Same as capture time
const confirmingAppointments = ref<Set<string>>(new Set()) // Loading state per appointment ID

// Payment Confirmation Dialog State
const showPaymentConfirmDialog = ref(false)
const pendingPaymentUrl = ref<string | null>(null)
const isProcessingPayment = ref(false)
const currentPaymentAppointment = ref<any>(null)
const currentPayment = ref<any>(null)

// Profile Modal State
const showProfileModal = ref(false)
const userDocumentCategories = ref<any[]>([])
const userData = ref<any>(null) // Store full user data from users table
const activeClickDiv = ref<string | null>(null) // Track which div is being clicked for visual feedback

// Load user documents
const loadUserDocuments = async () => {
  logger.debug('🔥 loadUserDocuments called - Simple version')
  logger.debug('   userData.value?.id:', userData.value?.id)
  
  if (!userData.value?.id) {
    logger.debug('⚠️ User data not available for loading documents')
    return
  }

  try {
    logger.debug('📄 Loading all documents from Storage for user:', userData.value.id)
    
    // Call endpoint that lists all documents from user's Storage folder
    const response = await $fetch('/api/documents/list-user-documents', {
      query: {
        userId: userData.value.id
      }
    }) as any

    // Extract documents array
    let documents = response?.documents || response || []
    
    // Sort by created_at (newest first)
    documents = documents.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime()
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime()
      return dateB - dateA // Newest first
    })
    
    logger.debug('✅ Loaded and sorted documents:', documents?.length || 0)

    // Create a single "Ausweise" category with all documents
    userDocumentCategories.value = [{
     
      description: 'Alle hochgeladenen Dokumente',
      documents: documents
    }]

    logger.debug('✅ Documents ready for display')
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

// Count of all upcoming lessons (appointments + course sessions)
// Groups course sessions on the same day as ONE appointment
const upcomingLessonsCount = computed(() => {
  const now = new Date()
  const upcomingLessons = lessons.value.filter(lesson => 
    new Date(lesson.start_time) > now
  )
  
  // Group course sessions by date + course_id (same day = 1 appointment)
  const courseSessionKeys = new Set<string>()
  let count = 0
  
  for (const lesson of upcomingLessons) {
    if (lesson.event_type_code === 'course') {
      // Group by date + course_id
      const date = lesson.start_time.split('T')[0]
      const key = `${date}_${lesson.course_id || lesson.id}`
      
      if (!courseSessionKeys.has(key)) {
        courseSessionKeys.add(key)
        count++
      }
      // If key already exists, don't count again (same day = 1 appointment)
    } else {
      // Non-course lessons count as 1 each
      count++
    }
  }
  
  return count
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
      loadPendingConfirmations()
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
    // Redirect to payments page where user can select and pay
    await navigateTo('/customer/payments')
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
    // ✅ Parse UTC string and convert to local timezone (Europe/Zurich)
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return 'Ungültiges Datum'
    }
    
    const weekday = date.toLocaleDateString('de-CH', { weekday: 'short', timeZone: 'Europe/Zurich' })
    const datePart = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' })
    const timePart = date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
    
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
  // Navigiere zur Kursbuchungsseite
  const tenantSlug = currentTenant.value?.slug || 'driving-team'
  await navigateTo(`/customer/courses/${tenantSlug}`)
}

const navigateToShop = async () => {
  // Navigiere zum Shop mit Tenant-Parameter
  const tenantSlug = currentTenant.value?.slug || 'driving-team'
  await navigateTo(`/shop?tenant=${tenantSlug}`)
}

const navigateToReglement = async (type: string) => {
  // ✅ CHANGED: Don't navigate away, instead load and show reglement in modal
  try {
    // Load reglement content via API
    const response = await $fetch<any>('/api/customer/reglements', {
      method: 'GET',
      query: { type }
    })

    if (response?.success && response?.data) {
      // Replace placeholders with tenant data from API response
      let content = response.data.content || ''
      if (response.tenant) {
        content = replacePlaceholders(content, {
          name: response.tenant.name,
          address: response.tenant.address,
          email: response.tenant.email,
          phone: response.tenant.phone,
          website: response.tenant.website
        })
      }
      // Show in modal with content
      showReglementContent.value = content
      showReglementTitle.value = response.data.title || type
      showReglementDetailModal.value = true
    }
  } catch (err) {
    console.error('Error loading reglement:', err)
  }
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

    // Load appointments first, then course registrations (which merges with appointments)
    await loadAppointments()
    
    // These can run in parallel
    await Promise.all([
      loadCourseRegistrations(), // Must run after loadAppointments to merge correctly
      loadLocations(),
      loadStaff(),
      loadPendingConfirmations()
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
    return
  }

  try {
    // ✅ Use backend API to fetch pending confirmations with ALL data
    // (staff, payments, categories, payment_items - all in ONE call!)
    const response = await $fetch('/api/customer/get-pending-confirmations', {
      method: 'GET'
    }) as any
    
    if (!response?.success || !response?.data) {
      throw new Error('Failed to load pending confirmations from API')
    }

    const confirmationsData = response.data

    if (!confirmationsData || confirmationsData.length === 0) {
      pendingConfirmations.value = []
      return
    }

    // ✅ Data already enriched by API - just set it directly!
    // No need for separate queries:
    // - Payments: already loaded
    // - Categories: already loaded
    // - Staff: already loaded
    pendingConfirmations.value = confirmationsData.map((apt: any) => ({
      ...apt
    }))

    logger.debug('✅ Pending confirmations loaded with full data from API')
  } catch (err: any) {
    console.error('❌ Error loading pending confirmations:', err)
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
  // Payment-Objekt existiert mit Werten
  if (appointment.payment) {
    if (appointment.payment.lesson_price_rappen > 0 ||
        appointment.payment.admin_fee_rappen > 0 ||
        appointment.payment.products_price_rappen > 0 ||
        appointment.payment.discount_amount_rappen > 0 ||
        appointment.payment.total_amount_rappen > 0) {
      return true
    }
  }
  
  // Direkte Payment-Felder existieren (alter Fallback)
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
  // Try payment object first (primary source)
  if (appointment.payment && appointment.payment[fieldName]) {
    return appointment.payment[fieldName]
  }
  // Fallback to appointment object (legacy)
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

    // ✅ Payment ist bereits von der API geladen (in appointment.payment)!
    // Keine separate Query nötig - das würde RLS-Fehler verursachen
    const payment = appointment.payment
    
    if (!payment) {
      displayToast('error', 'Fehler', 'Zahlungsdaten für den Termin nicht gefunden')
      confirmingAppointments.value.delete(appointment.id)
      return
    }

    // ✅ NEU: Wenn payment_method 'cash', 'invoice' oder 'credit' ist, NICHT zu Wallee weiterleiten!
    if (payment?.payment_method === 'cash' || payment?.payment_method === 'invoice' || payment?.payment_method === 'credit') {
      logger.debug('✅ Payment method is', payment.payment_method, '- no online payment needed')
      
      // ✅ WICHTIG: Confirm the appointment via secure API auch für non-Wallee payments!
      try {
        const confirmResult = await $fetch('/api/appointments/confirm', {
          method: 'POST',
          body: {
            appointmentId: appointment.id
          }
        }) as { 
          success?: boolean
          appointment?: any
          error?: string 
        }
        
        if (!confirmResult.success) {
          console.error('⚠️ Could not confirm appointment:', confirmResult.error)
          displayToast('error', 'Fehler', `Termin konnte nicht bestätigt werden: ${confirmResult.error}`)
          confirmingAppointments.value.delete(appointment.id)
          return
        }
        
        logger.debug('✅ Appointment confirmed via secure API:', {
          appointmentId: appointment.id
        })
      } catch (err: any) {
        console.error('⚠️ Error confirming appointment via API:', err)
        displayToast('error', 'Fehler', `Fehler beim Bestätigen des Termins: ${err.message}`)
        confirmingAppointments.value.delete(appointment.id)
        return
      }
      
      displayToast('success', 'Termin bestätigt!', `Zahlungsart: ${getPaymentMethodLabel(payment.payment_method)}`)
      
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
    
    // ✅ NEW: If amount is 0 (fully covered by credit or discounts), confirm and show success
    if (amountRappen <= 0) {
      logger.debug('✅ Payment fully covered by credit or discounts - no online payment needed')
      
      // ✅ WICHTIG: Confirm the appointment via secure API!
      try {
        const confirmResult = await $fetch('/api/appointments/confirm', {
          method: 'POST',
          body: {
            appointmentId: appointment.id
          }
        }) as { 
          success?: boolean
          appointment?: any
          error?: string 
        }
        
        if (!confirmResult.success) {
          console.error('⚠️ Could not confirm appointment:', confirmResult.error)
          displayToast('error', 'Fehler', `Termin konnte nicht bestätigt werden: ${confirmResult.error}`)
          confirmingAppointments.value.delete(appointment.id)
          return
        }
        
        logger.debug('✅ Appointment confirmed via secure API (credit-covered):', {
          appointmentId: appointment.id
        })
      } catch (err: any) {
        console.error('⚠️ Error confirming appointment via API:', err)
        displayToast('error', 'Fehler', `Fehler beim Bestätigen des Termins: ${err.message}`)
        confirmingAppointments.value.delete(appointment.id)
        return
      }
      
      displayToast('success', 'Termin bestätigt!', 'Zahlung wurde durch Guthaben oder Gutscheine gedeckt')
      confirmingAppointments.value.delete(appointment.id)
      
      // ✅ Entferne bestätigten Termin aus der pendingConfirmations Liste
      const index = pendingConfirmations.value.findIndex((apt: any) => apt.id === appointment.id)
      if (index !== -1) {
        pendingConfirmations.value.splice(index, 1)
        logger.debug('✅ Removed confirmed appointment from pending list')
      }
      
      // ✅ Schließe das Modal
      showConfirmationModal.value = false
      
      // ✅ Refresh pending confirmations
      await loadPendingConfirmations()
      
      return // Fertig!
    }

    // ✅ Confirm appointment via secure API
    try {
      const confirmResult = await $fetch('/api/appointments/confirm', {
        method: 'POST',
        body: {
          appointmentId: appointment.id
        }
      }) as { 
        success?: boolean
        appointment?: any
        error?: string 
      }
      
      if (!confirmResult.success) {
        console.error('⚠️ Could not confirm appointment:', confirmResult.error)
        displayToast('error', 'Fehler', `Termin konnte nicht bestätigt werden: ${confirmResult.error}`)
        confirmingAppointments.value.delete(appointment.id)
        return
      }
      
      logger.debug('✅ Appointment confirmed via secure API:', {
        appointmentId: appointment.id
      })
    } catch (err: any) {
      console.error('⚠️ Error confirming appointment via API:', err)
      displayToast('error', 'Fehler', `Fehler beim Bestätigen des Termins: ${err.message}`)
      confirmingAppointments.value.delete(appointment.id)
      return
    }

    // ✅ ONLINE PAYMENT: Zeige "Jetzt oder Später bezahlen" Dialog
    // Speichere Appointment und Payment für handlePayNow
    currentPaymentAppointment.value = appointment
    currentPayment.value = payment
    confirmingAppointments.value.delete(appointment.id)
    
    // Zeige den Dialog
    showPaymentConfirmDialog.value = true
    logger.debug('💳 Showing payment confirmation dialog for online payment')
    // Benutzer entscheidet im Dialog ob jetzt oder später bezahlt wird
    // handlePayNow() oder handlePayLater() wird aufgerufen
    
  } catch (err: any) {
    console.error('❌ Fehler beim Bestätigen des Termins:', err)
    displayToast('error', 'Fehler', err?.message || 'Unbekannter Fehler')
    confirmingAppointments.value.delete(appointment.id)
  }
}

const loadAppointments = async () => {
  if (!currentUser.value?.id) return

  try {
    // ✅ Use backend API to fetch appointments with staff data (bypasses RLS)
    const response = await $fetch('/api/customer/get-appointments', {
      method: 'GET'
    }) as any
    
    if (!response?.success || !response?.data) {
      throw new Error('Failed to load appointments from API')
    }

    const appointmentsData = response.data
    logger.debug('🔍 Loading appointments for user:', currentUser.value.id)

    logger.debug('✅ Appointments loaded:', appointmentsData?.length || 0)

    // ✅ Location data is already provided by backend API - no need to load separately!

    const appointmentIds = appointmentsData?.map((a: any) => a.id) || []
    logger.debug('🔍 Extracting evaluations from API response for appointments:', appointmentIds.length)

    // Skip if no appointments
    if (appointmentIds.length === 0) {
      logger.debug('⚠️ No appointments found')
      appointments.value = []
      return
    }

    // ✅ Extract notes from API response (already loaded with appointments)
    const notes: any[] = []
    appointmentsData.forEach((apt: any) => {
      if (apt.notes && Array.isArray(apt.notes)) {
        apt.notes.forEach((note: any) => {
          // Only include evaluations (notes with criteria + rating)
          if (note.evaluation_criteria_id && note.criteria_rating !== null) {
            notes.push({
              appointment_id: apt.id,
              evaluation_criteria_id: note.evaluation_criteria_id,
              criteria_rating: note.criteria_rating,
              criteria_note: note.criteria_note,
              created_at: note.created_at
            })
          }
        })
      }
    })

    logger.debug('✅ Evaluations extracted from API:', notes.length)

    const criteriaIds = [...new Set(notes?.map(n => n.evaluation_criteria_id).filter(Boolean))]
    let criteriaMap: Record<string, any> = {}

    if (criteriaIds.length > 0) {
      logger.debug('🔍 Loading criteria details for:', criteriaIds.length, 'criteria')
      
      try {
        // ✅ Use secure API instead of direct DB query
        const response = await $fetch('/api/customer/get-evaluation-criteria', {
          method: 'GET',
          query: {
            ids: criteriaIds.join(',')
          }
        }) as any

        const criteria = response?.data || response?.criteria || []
        
        if (criteria && criteria.length > 0) {
          logger.debug('✅ Criteria loaded:', criteria.length)
          
          criteriaMap = criteria.reduce((acc: any, crit: any) => {
            acc[crit.id] = {
              name: crit.name || 'Unbekanntes Kriterium',
              short_code: null,
              category_name: null
            }
            return acc
          }, {} as Record<string, any>)
        } else {
          // Fallback for missing criteria
          criteriaIds.forEach(id => {
            criteriaMap[id] = {
              name: 'Bewertungskriterium',
              short_code: null,
              category_name: null
            }
          })
        }
      } catch (error: any) {
        console.error('❌ Criteria error:', error)
        criteriaIds.forEach(id => {
          criteriaMap[id] = {
            name: 'Bewertungskriterium',
            short_code: null,
            category_name: null
          }
        })
      }
    }

    // ✅ Sort notes by created_at DESC to get newest evaluations first
    const sortedNotes = [...(notes || [])].sort((a, b) => {
      // Both have created_at in notes table
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA // Neueste zuerst
    })

    // ✅ Group notes by appointment and keep only LATEST evaluation per criteria
    // This ensures we show "new/changed" evaluations by appointment
    const latestEvaluationsMap: Record<string, Record<string, any>> = {}

    sortedNotes.forEach(note => {
      const aptId = note.appointment_id
      const criteriaId = note.evaluation_criteria_id

      if (!latestEvaluationsMap[aptId]) {
        latestEvaluationsMap[aptId] = {}
      }

      // Only keep the first (newest) evaluation for each criteria per appointment
      if (!latestEvaluationsMap[aptId][criteriaId]) {
        latestEvaluationsMap[aptId][criteriaId] = note
      }
    })

    // ✅ Now build the evaluations by appointment, filtering to new/changed ones
    const notesByAppointment: Record<string, any[]> = {}
    const appointmentIds_sorted = (appointmentsData || []).map((a: any) => a.id)

    appointmentIds_sorted.forEach((aptId: any, index: any) => {
      notesByAppointment[aptId] = []
      
      const aptEvaluations = latestEvaluationsMap[aptId]
      if (!aptEvaluations) return

      // Get evaluations for this appointment
      const currentEvals = Object.values(aptEvaluations)

      // If not the first appointment, filter to show only new/changed evaluations
      if (index > 0) {
        const previousAptId = appointmentIds_sorted[index - 1]
        const previousEvals = latestEvaluationsMap[previousAptId] || {}
        const previousEvalsMap: Record<string, any> = {}

        Object.entries(previousEvals).forEach(([criteriaId, evaluation]) => {
          previousEvalsMap[criteriaId] = {
            rating: (evaluation as any).criteria_rating,
            note: (evaluation as any).criteria_note || ''
          }
        })

        // Filter to show only evaluations that are new or have changed rating/note
        const displayEvaluations = currentEvals.filter((currentEval: any) => {
          const previousEval = previousEvalsMap[currentEval.evaluation_criteria_id]
          // Show if: no previous eval (new) OR rating changed OR note changed
          if (!previousEval) return true // NEW evaluation
          
          const ratingChanged = previousEval.rating !== currentEval.criteria_rating
          const noteChanged = previousEval.note !== (currentEval.criteria_note || '')
          
          return ratingChanged || noteChanged // CHANGED evaluation
        })

        // Build the final evaluations list with only new/changed ones
        displayEvaluations.forEach((note: any) => {
          const criteriaDetails = criteriaMap[note.evaluation_criteria_id]
          if (note.evaluation_criteria_id && note.criteria_rating !== null && criteriaDetails) {
            notesByAppointment[aptId].push({
              criteria_id: note.evaluation_criteria_id,
              criteria_name: criteriaDetails.name || 'Unbekannt',
              criteria_short_code: null,
              criteria_rating: note.criteria_rating,
              criteria_note: note.criteria_note || '',
              criteria_category_name: criteriaDetails.category_name || null
            })
          }
        })
      } else {
        // First appointment: show all evaluations
        currentEvals.forEach((note: any) => {
          const criteriaDetails = criteriaMap[note.evaluation_criteria_id]
          if (note.evaluation_criteria_id && note.criteria_rating !== null && criteriaDetails) {
            notesByAppointment[aptId].push({
              criteria_id: note.evaluation_criteria_id,
              criteria_name: criteriaDetails.name || 'Unbekannt',
              criteria_short_code: null,
              criteria_rating: note.criteria_rating,
              criteria_note: note.criteria_note || '',
              criteria_category_name: criteriaDetails.category_name || null
            })
          }
        })
      }
    })

    logger.debug('✅ Evaluations grouped by appointment with new/changed filter applied')

    const lessonsWithEvaluations = (appointmentsData || []).map((appointment: any) => ({
      ...appointment,
      location_name: appointment.location?.name || null,
      location_details: appointment.location || null,
      criteria_evaluations: notesByAppointment[appointment.id] || []
    }))

    // Debug: Zeige location_details für die ersten paar Termine
    logger.debug('🔍 Sample location_details:', lessonsWithEvaluations.slice(0, 3).map((lesson: any) => ({
      id: lesson.id,
      location_id: lesson.location_id,
      location_name: lesson.location_name,
      location_details: lesson.location_details
    })))

    logger.debug('✅ Final lessons with evaluations:', lessonsWithEvaluations.length)

    appointments.value = lessonsWithEvaluations
    // Note: lessons.value is set by loadCourseRegistrations which merges appointments + course sessions

  } catch (err: any) {
    logger.error('❌ Error loading appointments:', {
      message: err.message,
      status: err.status,
      statusCode: err.statusCode,
      data: err.data,
      fullError: err.toString()
    })
    error.value = err.message || 'Fehler beim Laden der Termine'
    throw err // Re-throw to be caught by loadAllData
  }
}

const loadLocations = async () => {
  try {
    // ✅ Use secure API instead of direct DB query
    const response = await $fetch('/api/customer/get-locations', {
      method: 'GET'
    }) as any
    
    locations.value = response?.data || response?.locations || []
  } catch (err: any) {
    console.error('❌ Error loading locations:', err)
  }
}

const loadStaff = async () => {
  try {
    // ✅ Use backend API to fetch staff (bypasses RLS)
    const response = await $fetch('/api/customer/get-staff-names', {
      method: 'GET'
    }) as any
    
    if (response?.success && response?.data) {
      staff.value = response.data
      logger.debug('✅ Staff loaded via API:', staff.value.length)
    } else {
      throw new Error('Invalid API response')
    }
  } catch (err: any) {
    console.error('❌ Error loading staff:', err)
    // Fallback: continue without staff data
    staff.value = []
  }
}

const loadCourseRegistrations = async () => {
  try {
    const response = await $fetch('/api/customer/upcoming-course-registrations', {
      method: 'GET'
    }) as any
    
    if (!response?.success) {
      logger.warn('⚠️ No upcoming course registrations')
      return
    }

    const courseRegistrations = response.data || []
    
    // Transform course registrations into lesson-like format for the modal
    const courseLessons = courseRegistrations.flatMap((reg: any) => {
      return (reg.course_sessions || []).map((session: any) => ({
        id: `course-${session.id}`,
        type: 'course_session',
        course_registration_id: reg.id,
        course_id: reg.course_id,
        course_name: reg.courses?.name || 'Kurs',
        start_time: session.start_time,
        end_time: session.end_time,
        session_number: session.session_number,
        // Use custom_location from course_sessions for location display
        location_details: session.custom_location ? { formatted_address: session.custom_location } : null,
        location_id: null,
        event_type_code: 'course'
      }))
    })

    // Merge with existing lessons
    lessons.value = [
      ...(appointments.value || []),
      ...courseLessons
    ].sort((a: any, b: any) => {
      // For course sessions, sort by registration + session_number to preserve order
      // For appointments, sort by start_time
      if (a.event_type_code === 'course' && b.event_type_code === 'course') {
        // Both are course sessions from same registration - sort by session_number
        if (a.course_registration_id === b.course_registration_id) {
          return (a.session_number || 0) - (b.session_number || 0)
        }
        // Different registrations - sort by registration then session number
        return a.course_registration_id.localeCompare(b.course_registration_id)
      } else if (a.event_type_code === 'course') {
        // Course session vs appointment - course comes after its appointments
        return 1
      } else if (b.event_type_code === 'course') {
        // Appointment vs course session
        return -1
      }
      // Both appointments - sort by start_time
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })

    logger.debug('✅ Course registrations loaded:', courseRegistrations.length, 'Total lessons:', lessons.value.length)
  } catch (err: any) {
    logger.error('❌ Error loading course registrations:', err)
    // Don't fail the entire load if this fails
  }
}

const loadInstructors = () => {
  // Group appointments by instructor and count lessons
  const instructorMap = new Map()
  
  // ✅ DEBUG: Check first appointment structure
  logger.debug('🔍 DEBUG loadInstructors - First appointment:', appointments.value?.[0])
  
  // Ensure appointments.value is an array
  if (appointments.value && Array.isArray(appointments.value)) {
    appointments.value.forEach((appointment, idx) => {
      logger.debug(`🔍 DEBUG appointment[${idx}]: staff field exists?`, !!appointment.staff)
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
    
    // ✅ Reset payment modal if user navigates back from Wallee
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        logger.debug('📱 User returned to page (browser back)')
        showPaymentConfirmDialog.value = false
        isProcessingPayment.value = false
      }
    })
    
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
    
    // First, load user data via secure API
    if (!userData.value && currentUser.value?.id) {
      try {
        const response: any = await $fetch('/api/customer/get-user-profile')
        
        if (response.success && response.data) {
          userData.value = response.data
          logger.debug('✅ User data loaded via API:', response.data.id)
        }
      } catch (err: any) {
        console.warn('⚠️ Error loading user data:', err.message)
      }
    }
    
    // Load tenant data and branding
    if (userData.value?.tenant_id) {
      logger.debug('🎨 Loading tenant data for:', userData.value.tenant_id)
      
      // Load tenant branding via secure API (replaces direct DB query)
      await loadTenantBrandingById(userData.value.tenant_id)
      
      // Set tenant in useTenant composable from branding data
      if (currentTenantBranding.value) {
        setTenant(currentTenantBranding.value as any)
        logger.debug('✅ Tenant loaded via secure API:', currentTenantBranding.value.name)
      }
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

// Payment Confirmation Dialog Functions
const handlePayNow = async () => {
  if (!currentPayment.value || !currentPaymentAppointment.value) {
    displayToast('error', 'Fehler', 'Zahlungsdaten fehlen')
    return
  }
  
  isProcessingPayment.value = true
  logger.debug('💳 Starting secure payment process...')
  
  try {
    const payment = currentPayment.value
    const appointment = currentPaymentAppointment.value
    
    // Build merchant reference
    const customerName = currentUser.value
      ? `${currentUser.value.user_metadata?.first_name || ''} ${currentUser.value.user_metadata?.last_name || ''}`.trim()
      : ''
    
    const merchantReferenceDetails = {
      appointmentId: appointment.id,
      eventTypeCode: appointment.event_type_code || appointment.type,
      categoryCode: appointment.type,
      categoryName: appointment.category_name,
      staffName: customerName,
      startTime: appointment.start_time,
      durationMinutes: appointment.duration_minutes
    }
    
    const orderId = buildMerchantReference(merchantReferenceDetails)
    logger.debug('📌 Generated merchant reference:', orderId)
    
    // ✅ Call secure payment API (same as /customer/payments page)
    const walleeResponse = await $fetch('/api/payments/process', {
      method: 'POST',
      body: {
        paymentId: payment.id,
        orderId,
        successUrl: `${window.location.origin}/customer-dashboard?payment_success=true`,
        failedUrl: `${window.location.origin}/customer-dashboard?payment_failed=true`
      }
    }) as { success?: boolean; paymentUrl?: string; transactionId?: number | string; error?: string }
    
    if (walleeResponse.success && walleeResponse.paymentUrl) {
      logger.debug('✅ Wallee transaction created:', walleeResponse.transactionId)
      
      // Redirect to Wallee payment page
      window.location.href = walleeResponse.paymentUrl
    } else {
      throw new Error(walleeResponse.error || 'Wallee transaction failed')
    }
    
  } catch (err: any) {
    console.error('❌ Error initiating payment:', err)
    displayToast('error', 'Fehler', `Zahlung konnte nicht gestartet werden: ${err?.data?.message || err?.message || 'Unbekannter Fehler'}`)
    isProcessingPayment.value = false
  }
}

const handlePayLater = async () => {
  showPaymentConfirmDialog.value = false
  showConfirmationModal.value = false  // ← Close confirmation modal too!
  pendingPaymentUrl.value = null
  isProcessingPayment.value = false
  currentPaymentAppointment.value = null
  currentPayment.value = null
  
  displayToast('success', 'Erfolg', 'Dein Termin ist bestätigt! Du kannst später von deinem Dashboard bezahlen.')
  logger.debug('✅ Payment postponed')
  
  // Reload the dashboard data so "pending confirmations" disappears
  logger.debug('🔄 Reloading dashboard data...')
  try {
    await loadAllData()
    await loadPayments()
    logger.debug('✅ Dashboard data reloaded')
  } catch (err) {
    logger.error('❌ Error reloading dashboard:', err)
  }
}
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