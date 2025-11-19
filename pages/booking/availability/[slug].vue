<template>
  <div class="min-h-screen bg-gray-50 py-4">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button -->
      <div v-if="currentStep > 0" class="mb-4">
        <button 
          @click="handleBackButton"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg shadow hover:bg-gray-200 transition-colors"
        >
          ← Zurück
        </button>
      </div>
      
      <!-- Header -->
      <div class="mb-4">
        <h1 class="text-3xl font-bold text-gray-900">Fahrstunde buchen</h1>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Verfügbare Termine werden geladen...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Verfügbarkeit</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Präferenzformular (wenn Online-Buchung deaktiviert) -->
      <AppointmentPreferencesForm
        v-if="!isOnlineBookingEnabled"
        :tenant-slug="(route.params.slug as string)"
      />

      <!-- Verfügbarkeitstool (wenn Online-Buchung aktiviert) -->
      <div v-else class="space-y-8">
        
        <!-- Progress Steps -->
        <div 
          ref="stepsContainerRef"
          class="bg-white shadow rounded-lg p-4 mb-6 max-w-full" 
          :class="{ 'overflow-x-auto overflow-y-hidden': isScreenSmall, 'overflow-hidden': !isScreenSmall }"
        >
          <div class="flex items-center justify-start">
            <div class="flex items-center gap-2 sm:gap-4 flex-nowrap">
              <template v-for="(step, index) in bookingSteps" :key="step.id">
              <button
                :data-step="step.id"
                @click="goToStep(step.id)"
                :disabled="step.id > currentStep"
                class="flex items-center flex-shrink-0 cursor-pointer disabled:cursor-not-allowed transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                  <div
                    class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold border"
                    :style="getStepCircleStyle(step.id)"
                  >
                    {{ step.id }}
                </div>
                  <span
                    class="ml-1 sm:ml-2 text-xs sm:text-sm font-medium whitespace-nowrap"
                    :style="getStepLabelStyle(step.id)"
                  >
                    {{ step.label }}
                </span>
              </button>
                <div
                  v-if="index < bookingSteps.length - 1"
                  class="w-4 sm:w-8 h-0.5 rounded-full flex-shrink-0"
                  :style="getStepConnectorStyle(step.id)"
                ></div>
              </template>
                </div>
          </div>
        </div>

        <!-- Step 1: Category Selection -->
        <div v-if="currentStep === 1" class="space-y-4">
          <!-- Category Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 1</p>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Wähle deine Kategorie</h2>
              <div class="mt-2 text-xs sm:text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.name }}</span>
              </div>
            </div>
          
          <div :class="`grid ${getGridClasses(categories.length)} gap-3`">
            <div 
              v-for="category in categories" 
              :key="category.id"
              @click="selectCategory(category)"
              class="group cursor-pointer rounded-2xl p-3 sm:p-4 md:p-6 transition-all duration-200 transform active:translate-y-0.5"
              :style="getInteractiveCardStyle(
                selectedCategory?.id === category.id || hoveredCategoryId === category.id,
                hoveredCategoryId === category.id
              )"
              @mouseenter="hoveredCategoryId = category.id"
              @mouseleave="hoveredCategoryId = null"
            >
              <div class="text-center">
                <div class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4 transition-colors border"
                     :style="getInteractiveBadgeStyle(
                       selectedCategory?.id === category.id || hoveredCategoryId === category.id
                     )">
                  <span class="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{{ category.code }}</span>
                </div>
                <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{{ category.name }}</h3>
                <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{{ category.description }}</p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Step 2: Lesson Duration Selection -->
        <div v-if="currentStep === 2" class="space-y-4">
          <!-- Duration Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 2</p>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900">
                Wähle deine Dauer
              </h2>
              <div class="mt-2 text-xs sm:text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.name }}</span>
                <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
              </div>
            </div>
          
          <div
            v-if="durationOptions.length"
            :class="`grid ${getGridClasses(durationOptions.length)} gap-3`"
          >
            <button
              v-for="duration in durationOptions"
              :key="duration"
              @click="selectDurationOption(duration)"
              class="rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 transform active:translate-y-0.5"
              :style="getDurationButtonStyle(
                selectedDuration === duration || hoveredDuration === duration,
                hoveredDuration === duration
              )"
              @mouseenter="hoveredDuration = duration"
              @mouseleave="hoveredDuration = null"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-2xl font-bold text-gray-900">
                    {{ duration }} <span class="text-base font-medium">Min.</span>
                  </div>
    
                </div>

              </div>
            </button>
          </div>
          
          <div v-else class="text-center py-6">
            <p class="text-sm text-gray-600">
              Für diese Kategorie sind noch keine Lektion-Dauern hinterlegt. Bitte kontaktieren Sie die Fahrschule.
            </p>
          </div>
          </div>
        </div>

        <!-- Step 3: Location Selection -->
        <div v-if="currentStep === 3" class="space-y-4">
          <!-- Location Selection Card -->
          <div class="bg-white shadow rounded-lg p-4 sm:p-6">
            <div class="text-center mb-6">
              <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 3</p>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wähle einen Standort</h2>
              <div class="mt-2 text-xs sm:text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.name }}</span>
                <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
                <span v-if="selectedLocation" class="font-semibold"> • {{ selectedLocation?.name }}</span>
              </div>
            </div>
          
          <!-- Standard Locations -->
          <div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div 
                v-for="location in availableLocations" 
                :key="location.id"
                @click="selectLocation(location)"
                class="group cursor-pointer rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 transform active:translate-y-0.5 border-2"
                :style="getInteractiveCardStyle(
                  (selectedLocation?.id === location.id && !selectedLocation?.isPickup) || hoveredLocationId === location.id,
                  hoveredLocationId === location.id
                )"
                @mouseenter="hoveredLocationId = location.id"
                @mouseleave="hoveredLocationId = null"
              >
                <div class="space-y-2">
                  <!-- Location Name -->
                  <h3 class="text-sm sm:text-base md:text-lg font-bold text-gray-900">{{ location.name }}</h3>
                  
                  <!-- Address -->
                  <div v-if="location.address" class="flex items-start gap-2">
                    <svg class="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <p class="text-sm text-gray-600">{{ location.address }}</p>
                  </div>
                  
                  <!-- Staff Count -->
                  <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <svg class="w-4 h-4 flex-shrink-0" :style="{ color: getBrandPrimary() }" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12a3 3 0 100-6 3 3 0 000 6zm0 1.5a6 6 0 100-12 6 6 0 000 12z"/>
                    </svg>
                    <span class="text-sm font-medium" :style="{ color: getBrandPrimary() }">
                      {{ location.available_staff?.length || 0 }} {{ location.available_staff?.length === 1 ? 'Fahrlehrer' : 'Fahrlehrer' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Pickup Option (wenn verfügbar) -->
          <div v-if="isPickupAvailableForCategory" class="mt-6 p-3 sm:p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div class="flex flex-col sm:flex-row items-start gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
              </div>
              <div class="flex-1 w-full">
                <h3 class="text-sm sm:text-base font-semibold text-gray-900 mb-2">Pickup-Service verfügbar!</h3>
                <p class="text-xs sm:text-sm text-gray-600 mb-3">
                  Für diese Kategorie bieten wir auch Abholung an deinemWunschort an. 
                  Gebe deine Postleitzahl ein, um zu prüfen, ob sie im Pickup-Bereich liegt.
                </p>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input 
                    v-model="pickupPLZ"
                    type="text"
                    placeholder="z.B. 8001"
                    maxlength="4"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                  <button
                    @click="checkPickupAvailability"
                    :disabled="!pickupPLZ || pickupPLZ.length < 4 || isCheckingPickup"
                    class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                  >
                    {{ isCheckingPickup ? 'Prüfe...' : 'Prüfen' }}
                  </button>
                </div>
                
                <!-- Pickup Result -->
                <div v-if="pickupCheckResult" class="mt-3 p-3 rounded-lg" :class="pickupCheckResult.available ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'">
                  <div class="flex flex-col sm:flex-row items-start gap-2">
                    <svg v-if="pickupCheckResult.available" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <svg v-else class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <div class="flex-1 text-xs sm:text-sm">
                      <p :class="pickupCheckResult.available ? 'text-green-800' : 'text-orange-800'" class="font-medium">
                        {{ pickupCheckResult.message }}
                      </p>
                      <p v-if="pickupCheckResult.travelTime !== null && pickupCheckResult.travelTime !== undefined" class="text-gray-600 text-xs mt-1">
                        Fahrzeit: ca. {{ pickupCheckResult.travelTime === 0 ? 5 : pickupCheckResult.travelTime }} Minuten
                      </p>
                      <button
                        v-if="pickupCheckResult.available"
                        @click="selectPickupOption"
                        class="mt-2 w-full sm:w-auto px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                      >
                        Mit Pickup fortfahren →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Step 4: Instructor Selection -->
        <div v-if="currentStep === 4" class="space-y-4">
          <!-- Instructor Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 4</p>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wähle deinen Fahrlehrer</h2>
              <div class="mt-2 text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.name }}</span>
                <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
                <span v-if="selectedLocation" class="font-semibold"> • {{ selectedLocation?.name }}</span>
                <span v-if="selectedInstructor" class="font-semibold"> • {{ selectedInstructor?.first_name }} {{ selectedInstructor?.last_name }}</span>
              </div>
            </div>
          
          <div :class="`grid ${getGridClasses(availableInstructors.length)} gap-4`">
            <div 
              v-for="instructor in availableInstructors" 
              :key="instructor.id"
              @click="selectInstructor(instructor)"
              class="group cursor-pointer rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 transform active:translate-y-0.5"
              :style="getInteractiveCardStyle(
                selectedInstructor?.id === instructor.id || hoveredInstructorId === instructor.id,
                hoveredInstructorId === instructor.id
              )"
              @mouseenter="hoveredInstructorId = instructor.id"
              @mouseleave="hoveredInstructorId = null"
            >
              <div class="flex items-start space-x-3 sm:space-x-4">
                <div class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 border"
                     :style="getInteractiveBadgeStyle(
                       selectedInstructor?.id === instructor.id || hoveredInstructorId === instructor.id
                     )">
                  <span class="text-sm sm:text-base md:text-xl font-bold" :style="{ color: getBrandPrimary() }">
                    {{ instructor.first_name.charAt(0) }}{{ instructor.last_name.charAt(0) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 truncate">
                    {{ instructor.first_name }} {{ instructor.last_name }}
                  </h3>

                  <div class="text-xs text-purple-600 font-medium">
                    Termine verfügbar
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Step 5: Time Slot Selection -->
        <div v-if="currentStep === 5" class="space-y-4">
          <!-- Time Slot Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 5</p>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wähle deinen Termin</h2>
              <div class="mt-2 text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.name }}</span>
                <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
                <span v-if="selectedLocation" class="font-semibold"> • {{ selectedLocation?.name }}</span>
                <span v-if="selectedInstructor" class="font-semibold"> • {{ selectedInstructor?.first_name }} {{ selectedInstructor?.last_name }}</span>
                <span v-if="selectedSlot" class="font-semibold"> • {{ formatDate(selectedSlot?.start_time) }} {{ formatTime(selectedSlot?.start_time) }}</span>
              </div>
              
              <!-- Countdown Timer (wenn Termin reserviert) -->
            </div>
            <div v-if="currentReservationId" class="max-w-2xl mx-auto mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-blue-900">Termin reserviert</span>
                <div class="text-lg font-bold" :style="{ color: remainingSeconds < 60 ? '#dc2626' : getBrandPrimary() }">
                  {{ getCountdownText }}
                </div>
              </div>
              <p class="text-xs text-blue-700 mt-2">Der Termin ist für {{ remainingSeconds < 60 ? 'noch' : '' }} {{ getCountdownText }} Minuten reserviert.</p>
            </div>
          
          <!-- Loading Time Slots -->
          <div v-if="isLoadingTimeSlots" class="text-center py-12">
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p class="mt-6 text-xl text-gray-900 font-semibold">Verfügbare Termine werden geladen...</p>
            <p class="mt-3 text-gray-600">Wir prüfen die Verfügbarkeit und berechnen Fahrzeiten.</p>
            <p class="mt-1 text-sm text-gray-500">Dies kann einen Moment dauern.</p>
          </div>
          
          <!-- Week Navigation Controls -->
          <div v-else-if="availableTimeSlots.length > 0" class="space-y-6">
            <div class="flex items-center justify-center mb-4">
              <div class="inline-flex items-stretch divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  @click="prevWeek"
                  :disabled="currentWeek <= 1"
                  class="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  aria-label="Vorherige Woche"
                >
                  <span class="hidden sm:inline">Vorher</span>
                  <span class="sm:hidden">←</span>
                </button>
                <div class="px-3 sm:px-5 py-2 text-center">
                  <div class="text-xs text-gray-500">Woche {{ currentWeek }} / {{ maxWeek }}</div>
                  <div class="text-sm sm:text-base font-semibold text-gray-800">{{ currentWeekRangeLabel }}</div>
                </div>
                <button
                  @click="nextWeek"
                  :disabled="currentWeek >= maxWeek"
                  class="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  aria-label="Nächste Woche"
                >
                  <span class="sm:hidden">→</span>
                  <span class="hidden sm:inline">Nächste</span>
                </button>
              </div>
            </div>

            <!-- Time Slots by Day for Selected Week -->
            <div v-for="day in visibleGroupedTimeSlots" :key="day.dayKey" class="border border-gray-200 rounded-lg p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ day.dayName }}
                </h3>
                <span class="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {{ day.dateFormatted }}
                </span>
              </div>
              <div :class="`grid ${getGridClasses(day.slots.length)} gap-2 sm:gap-3`">
                <button
                  v-for="slot in day.slots"
                  :key="slot.id"
                  @click="selectTimeSlot(slot)"
                  class="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-xl transition-all duration-200 transform active:translate-y-0.5"
                  :style="getInteractiveCardStyle(
                    selectedSlot?.id === slot.id || hoveredSlotId === slot.id,
                    hoveredSlotId === slot.id
                  )"
                  @mouseenter="hoveredSlotId = slot.id"
                  @mouseleave="hoveredSlotId = null"
                >
                  <div class="font-medium text-xs sm:text-sm text-gray-900">{{ slot.time_formatted }}</div>
                  <div class="text-xs text-gray-600">{{ slot.duration_minutes }} Min.</div>
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Keine verfügbaren Termine</h3>
            <p class="text-gray-600">Für diese Kombination sind momentan keine Termine verfügbar.</p>
          </div>
          
          <div class="mt-6 text-center">
          </div>
          </div>
        </div>

        <!-- Step 6: Pickup Address (nur wenn Pickup gewählt) -->
        <div v-if="currentStep === 6 && selectedLocation?.isPickup" class="space-y-4">
          <!-- Pickup Address Card -->
          <div class="bg-white shadow rounded-lg p-4 sm:p-6">
            <div class="text-center mb-6">
              <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 6</p>
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Pickup-Adresse angeben</h2>
              <p class="text-sm sm:text-base text-gray-600">Wo sollen wir dich abholen?</p>
              <div class="mt-2 text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.code }}</span>
                <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
                <span v-if="selectedLocation" class="font-semibold"> • {{ selectedLocation?.name }}</span>
                <span v-if="selectedInstructor" class="font-semibold"> • {{ selectedInstructor?.first_name }} {{ selectedInstructor?.last_name }}</span>
              </div>
              <div class="mt-1 text-xs text-gray-500">
                {{ formatDate(selectedSlot?.start_time) }} um {{ formatTime(selectedSlot?.start_time) }}
              </div>
              
              <!-- Countdown Timer -->
            </div>
            <div v-if="currentReservationId" class="max-w-2xl mx-auto mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-blue-900">Termin reserviert</span>
                <div class="text-lg font-bold" :style="{ color: remainingSeconds < 60 ? '#dc2626' : getBrandPrimary() }">
                  {{ getCountdownText }}
                </div>
              </div>
            </div>

          <!-- Pickup Info -->
          <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="flex-1 text-sm text-blue-800">
                <p class="font-medium mb-1">Pickup-Service aktiviert</p>
                <p>Wir holen dich an deiner Wunschadresse ab. Bitte gebe deine vollständige Adresse in PLZ {{ selectedLocation.pickupPLZ }} ein.</p>
              </div>
            </div>
          </div>

          <!-- Address Input -->
          <div class="max-w-2xl mx-auto space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Adresse <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  ref="pickupAddressInput"
                  v-model="pickupAddress"
                  type="text"
                  placeholder="z.B. Musterstrasse 123, 8048 Zürich"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @input="validatePickupAddress"
                >
              </div>
              <p class="mt-1 text-xs text-gray-500">
                Die Adresse muss in PLZ {{ selectedLocation.pickupPLZ }} liegen
              </p>
            </div>

            <!-- Validation Feedback -->
            <div v-if="isValidatingAddress" class="flex items-center gap-2 text-sm text-gray-600">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Adresse wird geprüft...</span>
            </div>

            <div v-else-if="pickupAddressDetails" class="space-y-3">
              <!-- Success -->
              <div v-if="pickupAddressDetails.valid" class="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <div class="flex-1 text-sm text-green-800">
                    <p class="font-medium">Adresse bestätigt</p>
                    <p class="mt-1">{{ pickupAddressDetails.formatted }}</p>
                  </div>
                </div>
              </div>

              <!-- Error -->
              <div v-else class="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <div class="flex-1 text-sm text-orange-800">
                    <p class="font-medium">Ungültige Adresse</p>
                    <p class="mt-1">{{ pickupAddressDetails.error }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Optional: Location Name -->
            <div v-if="pickupAddressDetails">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Bezeichnung (optional)
              </label>
              <input
                v-model="pickupAddressDetails.name"
                type="text"
                placeholder="z.B. Zuhause, Arbeit, ..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
          </div>

          <!-- Navigation -->
          <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              @click="confirmBooking"
              :disabled="!pickupAddressDetails?.valid || isCreatingBooking"
              class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="isCreatingBooking" class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              <span v-if="isCreatingBooking">Wird erstellt...</span>
              <span v-else>Buchung bestätigen →</span>
            </button>
          </div>
          </div>
        </div>

        <!-- Step 6: Direct Confirmation (wenn kein Pickup) -->
        <div v-if="currentStep === 6 && !selectedLocation?.isPickup" class="space-y-4">
          <!-- Direct Confirmation Card -->
          <div class="bg-white shadow rounded-lg p-4 sm:p-6">
          <div class="text-center mb-6">
            <p class="text-xs uppercase tracking-wide text-gray-400">Schritt 6</p>
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Buchung bestätigen</h2>
            <p class="text-sm sm:text-base text-gray-600">Bitte überprüfe deine Angaben</p>
            
            <!-- Countdown Timer -->
          </div>
          <div v-if="currentReservationId" class="max-w-2xl mx-auto mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-blue-900">Termin reserviert</span>
              <div class="text-lg font-bold" :style="{ color: remainingSeconds < 60 ? '#dc2626' : getBrandPrimary() }">
                {{ getCountdownText }}
              </div>
            </div>
          </div>

          <!-- Booking Summary -->
          <div class="max-w-2xl mx-auto space-y-4">
            <div class="p-4 bg-gray-50 rounded-lg space-y-3">
              <div class="flex justify-between items-start text-sm">
                <span class="text-gray-600">Kategorie:</span>
                <span class="font-medium text-gray-900 text-right">{{ selectedCategory?.name }}</span>
              </div>
              <div class="flex justify-between items-start text-sm">
                <span class="text-gray-600">Standort:</span>
                <div class="font-medium text-gray-900 text-right">
                  <div>{{ selectedLocation?.name }}</div>
                  <div v-if="selectedLocation?.address" class="text-xs text-gray-600 mt-0.5">{{ selectedLocation?.address }}</div>
                </div>
              </div>
              <div class="flex justify-between items-start text-sm">
                <span class="text-gray-600">Fahrlehrer:</span>
                <span class="font-medium text-gray-900 text-right">{{ selectedInstructor?.first_name }} {{ selectedInstructor?.last_name }}</span>
              </div>
              <div class="flex justify-between items-start text-sm">
                <span class="text-gray-600">Termin:</span>
                <div class="font-medium text-gray-900 text-right">
                  <div>{{ formatDate(selectedSlot?.start_time) }}</div>
                  <div class="text-xs text-gray-600 mt-0.5">{{ formatTime(selectedSlot?.start_time) }} Uhr</div>
                </div>
              </div>
              <div class="flex justify-between items-start text-sm">
                <span class="text-gray-600">Dauer:</span>
                <span class="font-medium text-gray-900 text-right">{{ selectedSlot?.duration_minutes }} Minuten</span>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              @click="confirmBooking"
              :disabled="isCreatingBooking"
              class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="isCreatingBooking" class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              <span v-if="isCreatingBooking">Wird erstellt...</span>
              <span v-else>Buchung bestätigen →</span>
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Login/Register Modal -->
  <LoginRegisterModal 
    v-if="showLoginModal"
    :initial-tab="loginModalTab"
    @close="showLoginModal = false"
    @success="handleAuthSuccess"
  />

  <!-- Document Upload Modal -->
  <DocumentUploadModal
    v-if="showDocumentUploadModal"
    :required-documents="requiredDocuments"
    @close="showDocumentUploadModal = false"
    @success="handleDocumentUploadSuccess"
  />

  <!-- Loading Overlay -->
  <div v-if="isCreatingBooking" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
      <div class="flex flex-col items-center gap-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="text-lg font-medium text-gray-900">Buchung wird erstellt...</p>
        <p class="text-sm text-gray-600 text-center">Bitte warten Sie einen Moment.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAvailabilitySystem } from '~/composables/useAvailabilitySystem'
import { useExternalCalendarSync } from '~/composables/useExternalCalendarSync'
import { getSupabase } from '~/utils/supabase'
import LoginRegisterModal from '~/components/booking/LoginRegisterModal.vue'
import DocumentUploadModal from '~/components/booking/DocumentUploadModal.vue'
import { useRoute, useRuntimeConfig } from '#app'
import { useFeatures } from '~/composables/useFeatures'
import { navigateTo } from '#app'
import AppointmentPreferencesForm from '~/components/booking/AppointmentPreferencesForm.vue'

// Page Meta
// @ts-ignore - definePageMeta is a Nuxt compiler macro
definePageMeta({
  layout: 'default'
})

// Composables
const { 
  isLoading, 
  error, 
  availableSlots, 
  staffLocationCategories,
  getAvailableSlots,
  getAllAvailableSlots,
  getStaffLocationCategories,
  getAvailableSlotsForCombination,
  loadBaseData,
  activeStaff,
  validateSlotsWithTravelTime,
  loadAppointments
} = useAvailabilitySystem()

const { autoSyncCalendars } = useExternalCalendarSync()

const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

const route = useRoute()
const supabase = getSupabase()

// Optimized batch availability check function with local time handling and working hours
const checkBatchAvailability = async (staffId: string, timeSlots: { startTime: Date, endTime: Date }[]): Promise<boolean[]> => {
  try {
    if (timeSlots.length === 0) return []
    
    // Get date range for all slots (extend range to catch timezone differences)
    const minDate = new Date(Math.min(...timeSlots.map(slot => slot.startTime.getTime())))
    const maxDate = new Date(Math.max(...timeSlots.map(slot => slot.endTime.getTime())))
    
    // Extend range by 24 hours to catch timezone differences
    minDate.setDate(minDate.getDate() - 1)
    maxDate.setDate(maxDate.getDate() + 1)
    
    console.log('🔍 Batch checking availability for staff:', staffId, 'from', minDate.toISOString(), 'to', maxDate.toISOString())
    
    // Load all appointments for this staff in the extended date range
    const { data: appointments, error: dbError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, title, status')
      .eq('staff_id', staffId)
      .eq('status', 'scheduled')
      .is('deleted_at', null)
      .gte('start_time', minDate.toISOString())
      .lte('end_time', maxDate.toISOString())
    
    if (dbError) {
      console.error('❌ Error checking batch availability:', dbError)
      return timeSlots.map(() => true) // Assume available on error
    }
    
    // Load working hours for this staff
    const { data: workingHours, error: whError } = await supabase
      .from('staff_working_hours')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('staff_id', staffId)
      .eq('is_active', true)
    
    if (whError) {
      console.error('❌ Error loading working hours:', whError)
    }
    
    // Load external busy times for this staff
    const { data: externalBusyTimes, error: ebtError } = await supabase
      .from('external_busy_times')
      .select('id, start_time, end_time, event_title, sync_source')
      .eq('staff_id', staffId)
      .gte('start_time', minDate.toISOString())
      .lte('end_time', maxDate.toISOString())
    
    if (ebtError) {
      console.error('❌ Error loading external busy times:', ebtError)
    }
    
    console.log('📅 Found', appointments?.length || 0, 'appointments,', externalBusyTimes?.length || 0, 'external busy times, and', workingHours?.length || 0, 'working hours')
    
    // Check each slot against appointments and working hours
    const availabilityResults = timeSlots.map(slot => {
      // Check if slot is within working hours
      const dayOfWeek = slot.startTime.getDay() // 0=Sunday, 1=Monday, etc.
      const slotHour = slot.startTime.getHours()
      const slotMinute = slot.startTime.getMinutes()
      const slotTimeMinutes = slotHour * 60 + slotMinute
      
      // Find working hours for this day
      const dayWorkingHours = workingHours?.find(wh => wh.day_of_week === dayOfWeek)
      
      if (!dayWorkingHours) {
        console.log('🚫 No working hours for day', dayOfWeek, '(Sunday=0)', slot.startTime.toLocaleDateString('de-DE'))
        return false // Not available if no working hours defined
      }
      
      // Parse working hours (format: "HH:MM")
      const [startHour, startMinute] = dayWorkingHours.start_time.split(':').map(Number)
      const [endHour, endMinute] = dayWorkingHours.end_time.split(':').map(Number)
      const startTimeMinutes = startHour * 60 + startMinute
      const endTimeMinutes = endHour * 60 + endMinute
      
      // Check if slot is within working hours
      const withinWorkingHours = slotTimeMinutes >= startTimeMinutes && slotTimeMinutes < endTimeMinutes
      
      if (!withinWorkingHours) {
        console.log('🚫 Slot outside working hours:', {
          slot: slot.startTime.toLocaleString('de-DE'),
          workingHours: `${dayWorkingHours.start_time} - ${dayWorkingHours.end_time}`,
          dayOfWeek: dayOfWeek
        })
        return false
      }
      
      // Check for conflicts with any appointment OR external busy time
      const hasConflict = (appointments?.some(apt => {
        // Parse appointment times as local times (no timezone conversion)
        const aptStartDate = new Date(apt.start_time.replace('+00:00', '').replace('Z', ''))
        const aptEndDate = new Date(apt.end_time.replace('+00:00', '').replace('Z', ''))
        
        // Check for time overlap: slot starts before appointment ends AND slot ends after appointment starts
        const overlaps = slot.startTime < aptEndDate && slot.endTime > aptStartDate
        
        if (overlaps) {
          console.log('⚠️ Time conflict detected (appointment):', {
            slot: `${slot.startTime.toLocaleString('de-DE')} - ${slot.endTime.toLocaleString('de-DE')}`,
            appointment: `${aptStartDate.toLocaleString('de-DE')} - ${aptEndDate.toLocaleString('de-DE')}`,
            appointmentTitle: apt.title,
            slotISO: `${slot.startTime.toISOString()} - ${slot.endTime.toISOString()}`,
            appointmentISO: `${apt.start_time} - ${apt.end_time}`
          })
        }
        
        return overlaps
      }) || false) || (externalBusyTimes?.some(ebt => {
        // Parse external busy time as local time (no timezone conversion)
        const ebtStartDate = new Date(ebt.start_time.replace('+00:00', '').replace('Z', ''))
        const ebtEndDate = new Date(ebt.end_time.replace('+00:00', '').replace('Z', ''))
        
        // Check for time overlap: slot starts before external busy time ends AND slot ends after external busy time starts
        const overlaps = slot.startTime < ebtEndDate && slot.endTime > ebtStartDate
        
        if (overlaps) {
          console.log('⚠️ Time conflict detected (external busy time):', {
            slot: `${slot.startTime.toLocaleString('de-DE')} - ${slot.endTime.toLocaleString('de-DE')}`,
            externalBusyTime: `${ebtStartDate.toLocaleString('de-DE')} - ${ebtEndDate.toLocaleString('de-DE')}`,
            eventTitle: ebt.event_title,
            syncSource: ebt.sync_source,
            slotISO: `${slot.startTime.toISOString()} - ${slot.endTime.toISOString()}`,
            externalBusyTimeISO: `${ebt.start_time} - ${ebt.end_time}`
          })
        }
        
        return overlaps
      }) || false)
      
      return !hasConflict
    })
    
    const availableCount = availabilityResults.filter(result => result).length
    const conflictCount = availabilityResults.filter(result => !result).length
    console.log('✅ Batch availability check complete:', availableCount, 'available,', conflictCount, 'conflicts out of', timeSlots.length, 'total slots')
    
    return availabilityResults
  } catch (err) {
    console.error('❌ Error in checkBatchAvailability:', err)
    return timeSlots.map(() => true) // Assume available on error
  }
}

// State
const categories = ref<any[]>([])
const locationsCount = ref(0)
const selectedSlot = ref<any>(null)
const hasSearched = ref(false)
const lastSearchTime = ref('')
const currentTenant = ref<any>(null)
const availableStaff = ref<any[]>([])
const isLoadingLocations = ref(false)
const isLoadingTimeSlots = ref(false)
const tenantSettings = ref<any>({})

// New flow state
const currentStep = ref(1)
const selectedCategory = ref<any>(null)
const selectedLocation = ref<any>(null)
const selectedInstructor = ref<any>(null)
const availableLocations = ref<any[]>([])
const availableInstructors = ref<any[]>([])
const availableTimeSlots = ref<any[]>([])
const durationOptions = ref<number[]>([])
const selectedDuration = ref<number | null>(null)
const currentWeek = ref(1)
const maxWeek = ref(4)

// Hover states for interactive cards
const hoveredCategoryId = ref<string | null>(null)
const hoveredDuration = ref<number | null>(null)
const hoveredLocationId = ref<string | null>(null)
const hoveredInstructorId = ref<string | null>(null)
const hoveredSlotId = ref<string | null>(null)

// Referrer state
const referrerUrl = ref<string | null>(null)

// Responsive state for step scrolling
const isScreenSmall = ref(false)
const stepsContainerRef = ref<HTMLDivElement | null>(null)

// Reservation state
const currentReservationId = ref<string | null>(null)
const reservedUntil = ref<Date | null>(null)
const remainingSeconds = ref(0)
const countdownInterval = ref<NodeJS.Timeout | null>(null)

// Pickup state
const pickupPLZ = ref('')
const isCheckingPickup = ref(false)
const pickupCheckResult = ref<any>(null)
const selectedPickupLocation = ref<any>(null)
const pickupAddress = ref('')
const pickupAddressDetails = ref<any>(null)
const isValidatingAddress = ref(false)
const pickupAddressInput = ref<HTMLInputElement | null>(null)
let autocomplete: any = null

const filters = ref({
  category_code: '',
  duration_minutes: 45,
  buffer_minutes: 15,
  location_id: null
})

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

// Check if pickup is available for the selected category
const isPickupAvailableForCategory = computed(() => {
  if (!selectedCategory.value) return false
  
  // Check if any location offers pickup for this category
  return availableLocations.value.some((location: any) => {
    const categoryPickupSettings = location.category_pickup_settings || {}
    const categoryCode = selectedCategory.value.code
    return categoryPickupSettings[categoryCode]?.enabled === true
  })
})

const bookingSteps = computed(() => {
  return [
    { id: 1, label: 'Kategorie' },
    { id: 2, label: 'Dauer' },
    { id: 3, label: 'Standort' },
    { id: 4, label: 'Fahrlehrer' },
    { id: 5, label: 'Termin' },
    { 
      id: 6, 
      label: selectedLocation.value?.isPickup ? 'Adresse' : 'Bestätigung' 
    }
  ]
})

const canSearch = computed(() => {
  return currentTenant.value && filters.value.category_code
})

const staffCount = computed(() => activeStaff.value.length)

const filteredCategories = computed(() => {
  return categories.value
})

const groupedTimeSlots = computed(() => {
  if (!availableTimeSlots.value || availableTimeSlots.value.length === 0) return []
  
  // Group slots by day
  const daysMap = new Map<string, any[]>()
  
  availableTimeSlots.value.forEach((slot: any) => {
    const slotDate = new Date(slot.start_time)
    const dayKey = slotDate.toISOString().split('T')[0] // YYYY-MM-DD format
    
    if (!daysMap.has(dayKey)) {
      daysMap.set(dayKey, [])
    }
    daysMap.get(dayKey)!.push(slot)
  })
  
  // Convert to array and sort by date
  const days = Array.from(daysMap.entries()).map(([dayKey, slots]) => {
    // Sort slots by time
    slots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    
    // Get day info
    const firstSlot = slots[0]
    const slotDate = new Date(firstSlot.start_time)
    const dayName = slotDate.toLocaleDateString('de-DE', { weekday: 'long' })
    const dateFormatted = slotDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    
    return {
      dayKey,
      dayName,
      dateFormatted,
      slots: slots.filter(slot => slot.is_available) // Only show available slots
    }
  })
  
  return days.sort((a, b) => a.dayKey.localeCompare(b.dayKey))
})

// Visible slots for the selected week
const visibleGroupedTimeSlots = computed(() => {
  if (!groupedTimeSlots.value.length) return []
  return groupedTimeSlots.value.filter(day => {
    // day.slots contains week_number on each slot
    const hasWeek = day.slots?.some((s: any) => s.week_number === currentWeek.value)
    return hasWeek
  })
})

const nextWeek = () => {
  if (currentWeek.value < maxWeek.value) currentWeek.value += 1
}

const prevWeek = () => {
  if (currentWeek.value > 1) currentWeek.value -= 1
}

const currentWeekRangeLabel = computed(() => {
  // Find first slot of current week to derive date range
  const allSlots = availableTimeSlots.value
  if (!allSlots?.length) return ''
  const weekSlots = allSlots.filter((s: any) => s.week_number === currentWeek.value)
  if (!weekSlots.length) return ''
  const start = new Date(weekSlots[0].start_time)
  const end = new Date(weekSlots[weekSlots.length - 1].start_time)
  const fmt = (d: Date) => d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
})

// Dynamic grid classes based on content
const getGridClasses = (itemCount: number) => {
  if (itemCount <= 2) return 'grid-cols-1 sm:grid-cols-2'
  if (itemCount <= 4) return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4'
  if (itemCount <= 6) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
  if (itemCount <= 8) return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
}

// Methods
const formatTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString)
  return date.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const formatDate = (dateTimeString: string) => {
  const date = new Date(dateTimeString)
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const loadStaffForCategory = async () => {
  if (!canSearch.value) return
  
  hasSearched.value = true
  lastSearchTime.value = new Date().toLocaleTimeString('de-DE')
  
  try {
    // Load base data first with tenant filtering
    if (!currentTenant.value) return
    await loadBaseData(currentTenant.value.id)
    
    // Trigger external calendar sync for all staff
    console.log('🔄 Triggering external calendar sync...')
    await autoSyncCalendars()
    
    // Filter staff who can teach the selected category
    const capableStaff = activeStaff.value.filter((staff: any) => {
      // Check if staff has the selected category in their category array
      const staffCategories = Array.isArray(staff.category) ? staff.category : []
      return staffCategories.includes(filters.value.category_code)
    })
    
    // Add available_locations array to each staff
    availableStaff.value = capableStaff.map((staff: any) => ({
      ...staff,
      available_locations: []
    }))
    
    console.log('✅ Staff for category', filters.value.category_code, ':', availableStaff.value.length)
    console.log('🔍 Capable staff:', capableStaff.map((s: any) => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      categories: s.category 
    })))
    
    // Load locations for all staff, but do NOT generate time slots yet
    await loadLocationsForAllStaff(false)
    
  } catch (err) {
    console.error('❌ Error loading staff for category:', err)
  }
}

const loadLocationsForAllStaff = async (generateTimeSlots: boolean = false) => {
  try {
    isLoadingLocations.value = true
    console.log('🔄 Loading locations for all staff...')
    
    // Load locations for all available staff in parallel
    const locationPromises = availableStaff.value.map(async (staff) => {
      try {
        // Get ONLY standard locations where this staff can teach
        // Load all tenant locations and filter by staff_ids array
        const { data: staffLocations, error: slError } = await supabase
          .from('locations')
          .select('*, category_pickup_settings, time_windows')
          .eq('is_active', true)
          .eq('location_type', 'standard')
          .eq('tenant_id', currentTenant.value?.id || '')
        
        if (slError) {
          console.error(`❌ Error loading locations for ${staff.first_name}:`, slError)
          return { staffId: staff.id, locations: [] }
        }
        
        // Filter locations: only include if staff is registered AND category is available
        const filteredLocations = (staffLocations || []).filter((location: any) => {
          // Check if staff is registered at this location
          const staffIds = location.staff_ids || []
          const isStaffRegistered = Array.isArray(staffIds) && staffIds.includes(staff.id)
          
          // Check if category is available
          const availableCategories = location.available_categories || []
          const hasCategory = availableCategories.includes(filters.value.category_code)
          
          if (!isStaffRegistered) {
            console.log(`⏭️ Skipping location ${location.name} for ${staff.first_name} - staff not registered`)
            return false
          }
          
          if (!hasCategory) {
            console.log(`⏭️ Skipping location ${location.name} for ${staff.first_name} - category ${filters.value.category_code} not available`)
          }
          
          return hasCategory && isStaffRegistered
        })
        
        console.log(`✅ Loaded ${filteredLocations.length}/${staffLocations?.length || 0} locations for ${staff.first_name} ${staff.last_name} (category: ${filters.value.category_code})`)
        return { staffId: staff.id, locations: filteredLocations }
      } catch (err) {
        console.error(`❌ Error loading locations for ${staff.first_name}:`, err)
        return { staffId: staff.id, locations: [] }
      }
    })
    
    // Wait for all location loading to complete
    const results = await Promise.all(locationPromises)
    
    // Update staff with their locations
    results.forEach(({ staffId, locations }) => {
      const index = availableStaff.value.findIndex(s => s.id === staffId)
      if (index !== -1) {
        availableStaff.value[index].available_locations = locations.map(location => ({
          ...location,
          time_slots: []
        }))
      }
    })
    
    console.log('✅ All standard locations loaded for staff')
    
    // Only generate time slots if explicitly requested
    if (generateTimeSlots) {
      console.log('🕒 Generating time slots for all staff-location combinations (explicit)')
      await loadTimeSlotsForAllStaff()
    } else {
      console.log('⏭️ Skipping time slot generation at category step')
    }
  } catch (err) {
    console.error('❌ Error loading locations for all staff:', err)
  } finally {
    isLoadingLocations.value = false
  }
}

const loadTimeSlotsForAllStaff = async () => {
  try {
    isLoadingTimeSlots.value = true
    console.log('🕒 Loading time slots for all staff-location combinations...')
    
    // Generate time slots for the next 4 weeks for each staff-location combination
    const timeSlotPromises: Promise<any>[] = []
    
    availableStaff.value.forEach((staff: any) => {
      if (staff.available_locations && staff.available_locations.length > 0) {
        staff.available_locations.forEach((location: any) => {
          timeSlotPromises.push(generateTimeSlotsForStaffLocation(staff, location))
        })
      }
    })
    
    // Wait for all time slot generation to complete
    await Promise.all(timeSlotPromises)
    
    console.log('✅ All time slots generated')
  } catch (err) {
    console.error('❌ Error loading time slots for all staff:', err)
  } finally {
    isLoadingTimeSlots.value = false
  }
}

const generateTimeSlotsForStaffLocation = async (staff: any, location: any) => {
  try {
    const timeSlots: any[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to start of day
    
    // Get tenant settings
    const workingStart = tenantSettings.value.default_working_start || '08:00'
    const workingEnd = tenantSettings.value.default_working_end || '18:00'
    const slotInterval = parseInt(tenantSettings.value.slot_interval_minutes || '15')
    const bufferMinutes = parseInt(tenantSettings.value.default_buffer_minutes || '15')
    const minAdvanceHours = parseInt(tenantSettings.value.min_advance_booking_hours || '2')
    const maxAdvanceDays = parseInt(tenantSettings.value.max_advance_booking_days || '30')
    
    console.log(`🕒 Generating slots for ${staff.first_name} at ${location.name} with settings:`, {
      workingStart, workingEnd, slotInterval, bufferMinutes, minAdvanceHours, maxAdvanceDays
    })
    
    // Generate slots for the next maxAdvanceDays days
    for (let dayOffset = 0; dayOffset < maxAdvanceDays; dayOffset++) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + dayOffset)
      
      // Skip past dates
      if (targetDate < today) continue
      
      // Check if this day is within advance booking window
      const minAdvanceTime = new Date()
      minAdvanceTime.setHours(minAdvanceTime.getHours() + minAdvanceHours)
      if (targetDate < minAdvanceTime) continue
      
      // Determine day mode: Free-Day or Constrained
      const dayMode = await determineDayMode(staff.id, targetDate)
      console.log(`📅 ${targetDate.toDateString()}: ${dayMode} mode`)
      
      if (dayMode === 'free-day') {
        // Free-Day: Generate slots for entire working day
        const slots = await generateFreeDaySlots(staff, location, targetDate, workingStart, workingEnd, slotInterval)
        timeSlots.push(...slots)
      } else {
        // Constrained: Generate slots only before/after appointments at same location
        const slots = await generateConstrainedSlots(staff, location, targetDate, workingStart, workingEnd, slotInterval, bufferMinutes)
        timeSlots.push(...slots)
      }
    }
    
    // Update the location with time slots
    const staffIndex = availableStaff.value.findIndex((s: any) => s.id === staff.id)
    if (staffIndex !== -1) {
      const locationIndex = availableStaff.value[staffIndex].available_locations.findIndex((l: any) => l.id === location.id)
      if (locationIndex !== -1) {
        availableStaff.value[staffIndex].available_locations[locationIndex].time_slots = timeSlots
      }
    }
    
    console.log(`✅ Generated ${timeSlots.length} time slots for ${staff.first_name} at ${location.name}`)
  } catch (err) {
    console.error(`❌ Error generating time slots for ${staff.first_name} at ${location.name}:`, err)
  }
}

const loadTimeSlotsForStaffLocation = async (staff: any, location: any) => {
  try {
    // This function is now handled by loadTimeSlotsForAllStaff
    console.log('🕒 Time slots already loaded automatically')
  } catch (err) {
    console.error('❌ Error loading time slots:', err)
  }
}

const getWeeksForLocation = (location: any) => {
  if (!location.time_slots || location.time_slots.length === 0) return []
  
  // Group slots by week
  const weeksMap = new Map<number, any[]>()
  
  location.time_slots.forEach((slot: any) => {
    const weekNumber = slot.week_number
    if (!weeksMap.has(weekNumber)) {
      weeksMap.set(weekNumber, [])
    }
    weeksMap.get(weekNumber)!.push(slot)
  })
  
  // Convert to array and sort by week number
  const weeks = Array.from(weeksMap.entries()).map(([weekNumber, slots]) => {
    // Sort slots by date and time
    slots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    
    // Get start and end date for this week
    const firstSlot = slots[0]
    const lastSlot = slots[slots.length - 1]
    const startDate = new Date(firstSlot.start_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    const endDate = new Date(lastSlot.start_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    
    return {
      number: weekNumber,
      startDate,
      endDate,
      slots: slots.filter(slot => slot.is_available) // Only show available slots
    }
  })
  
  return weeks.sort((a, b) => a.number - b.number)
}

// New flow methods
const buttonPressDelay = 180
const waitForPressEffect = () => new Promise(resolve => setTimeout(resolve, buttonPressDelay))

const parseDurationValues = (raw: any): number[] => {
  if (!raw && raw !== 0) return [45]
  
  const normalizeArray = (arr: any[]): number[] => {
    return arr
      .map((value) => {
        const num = Number(value)
        return Number.isFinite(num) ? num : null
      })
      .filter((value): value is number => value !== null)
  }
  
  if (Array.isArray(raw)) {
    const values = normalizeArray(raw)
    return values.length ? values : [45]
  }
  
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const values = normalizeArray(parsed)
        if (values.length) return values
      }
    } catch {
      // Fallback: treat as comma separated string
      const values = normalizeArray(raw.split(','))
      if (values.length) return values
    }
    
    const num = Number(raw)
    if (Number.isFinite(num)) return [num]
  }
  
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return [raw]
  }
  
  return [45]
}

const getInteractiveCardStyle = (isSelected: boolean, isHover = false) => {
  const primary = getBrandPrimary()
  const lightBase = lightenColor(primary, 0.9)
  const lightAccent = lightenColor(primary, 0.8)
  return {
    borderColor: isSelected ? primary : withAlpha(primary, 0.25),
    background: isSelected
      ? `linear-gradient(145deg, ${lightAccent}, ${withAlpha(primary, 0.15)})`
      : `linear-gradient(145deg, ${lightBase}, ${lightenColor(primary, 0.95)})`,
    boxShadow: 'none',
    transform: isHover || isSelected ? 'translateY(-3px)' : 'translateY(0)',
    transition: 'all 0.18s ease'
  }
}

const getInteractiveBadgeStyle = (isSelected: boolean) => {
  const primary = getBrandPrimary()
  return {
    borderColor: isSelected ? primary : withAlpha(primary, 0.25),
    color: isSelected ? primary : '#1f2937',
    backgroundColor: isSelected ? withAlpha(primary, 0.18) : lightenColor(primary, 0.93)
  }
}

const getStepCircleStyle = (stepId: number) => {
  const primary = getBrandPrimary()
  const active = currentStep.value >= stepId
  return active
    ? { backgroundColor: primary, color: '#fff', borderColor: primary }
    : { backgroundColor: lightenColor(primary, 0.93), color: '#4b5563', borderColor: withAlpha(primary, 0.2) }
}

const getStepLabelStyle = (stepId: number) => {
  const primary = getBrandPrimary()
  return {
    color: currentStep.value >= stepId ? primary : '#6b7280'
  }
}

const getStepConnectorStyle = (stepId: number) => {
  const primary = getBrandPrimary()
  return {
    backgroundColor: currentStep.value > stepId ? primary : lightenColor(primary, 0.9)
  }
}

const selectDurationOption = async (duration: number) => {
  selectedDuration.value = duration
  filters.value.duration_minutes = duration
  await waitForPressEffect()
  currentStep.value = 3
}

const getDurationButtonStyle = (isSelected: boolean, isHover = false) => 
  getInteractiveCardStyle(isSelected, isHover)

const getDurationBadgeStyle = (isSelected: boolean) => getInteractiveBadgeStyle(isSelected)

const selectCategory = async (category: any) => {
  selectedCategory.value = category
  filters.value.category_code = category.code
  
  durationOptions.value = parseDurationValues(category.lesson_duration_minutes)
  selectedDuration.value = null
  filters.value.duration_minutes = 45
  
  // Reset pickup state
  pickupPLZ.value = ''
  pickupCheckResult.value = null
  selectedPickupLocation.value = null
  
  // Load staff for this category
  await loadStaffForCategory()
  
  // Get unique locations from staff
  const locationsSet = new Set<string>()
  availableStaff.value.forEach((staff: any) => {
    if (staff.available_locations) {
      staff.available_locations.forEach((location: any) => {
        locationsSet.add(JSON.stringify({
          id: location.id,
          name: location.name,
          address: location.address,
          category_pickup_settings: location.category_pickup_settings || {},
          time_windows: location.time_windows || [],
          available_staff: [staff]
        }))
      })
    }
  })
  
  // Convert set back to array and merge staff for each location
  availableLocations.value = Array.from(locationsSet).map((locationStr: string) => {
    const location = JSON.parse(locationStr)
    const allStaffForLocation = availableStaff.value.filter((staff: any) => 
      staff.available_locations?.some((loc: any) => loc.id === location.id)
    )
    return {
      ...location,
      available_staff: allStaffForLocation
    }
  })
  
  await waitForPressEffect()
  currentStep.value = 2
}

// Check pickup availability for entered PLZ
const checkPickupAvailability = async () => {
  if (!pickupPLZ.value || pickupPLZ.value.length < 4) {
    return
  }
  
  isCheckingPickup.value = true
  pickupCheckResult.value = null
  
  try {
    const categoryCode = selectedCategory.value.code
    console.log('🔍 Checking pickup for category:', categoryCode)
    console.log('📍 Available locations:', availableLocations.value.length)
    
    // Find locations that offer pickup for this category
    const pickupLocations = availableLocations.value.filter((location: any) => {
      const categoryPickupSettings = location.category_pickup_settings || {}
      const hasPickup = categoryPickupSettings[categoryCode]?.enabled === true
      console.log(`  Location "${location.name}":`, {
        address: location.address,
        categoryPickupSettings,
        hasPickupForCategory: hasPickup
      })
      return hasPickup
    })
    
    console.log('✅ Locations with pickup for', categoryCode, ':', pickupLocations.length)
    
    if (pickupLocations.length === 0) {
      pickupCheckResult.value = {
        available: false,
        message: 'Leider bieten wir für diese Kategorie keinen Pickup-Service an.'
      }
      isCheckingPickup.value = false
      return
    }
    
    // Check each location to find the closest one within pickup radius
    let closestLocation = null
    let shortestTime = Infinity
    
    for (const location of pickupLocations) {
      const categoryPickupSettings = location.category_pickup_settings[categoryCode]
      const maxRadius = categoryPickupSettings.radius_minutes || 15
      
      console.log(`🚗 Checking location "${location.name}":`)
      console.log(`  Max radius: ${maxRadius} min`)
      
      // Extract PLZ from location address (assuming format "Street, PLZ City")
      const locationPLZ = extractPLZFromAddress(location.address)
      
      if (!locationPLZ) {
        console.warn(`⚠️ Could not extract PLZ from location address: ${location.address}`)
        continue
      }
      
      console.log(`  Location PLZ: ${locationPLZ}, Customer PLZ: ${pickupPLZ.value}`)
      
      // Call API to get travel time
      const response = await $fetch<{
        success: boolean
        fromPLZ: string
        toPLZ: string
        travelTime: number
        appointmentTime: string
      }>('/api/pickup/check-distance', {
        method: 'POST',
        body: {
          fromPLZ: locationPLZ,
          toPLZ: pickupPLZ.value,
          appointmentTime: new Date().toISOString() // Use current time as estimate
        }
      })
      
      console.log(`  Travel time: ${response.travelTime} min (max: ${maxRadius} min)`)
      
      if (response.travelTime !== null && response.travelTime !== undefined && response.travelTime <= maxRadius) {
        console.log(`  ✅ Within radius!`)
        if (response.travelTime < shortestTime) {
          shortestTime = response.travelTime
          closestLocation = {
            ...location,
            travelTime: response.travelTime,
            maxRadius
          }
        }
      } else {
        console.log(`  ❌ Outside radius (${response.travelTime} > ${maxRadius})`)
      }
    }
    
    if (closestLocation) {
      pickupCheckResult.value = {
        available: true,
        message: `Pickup möglich! Wir können Sie an Ihrer Adresse abholen.`,
        travelTime: closestLocation.travelTime,
        location: closestLocation
      }
      selectedPickupLocation.value = closestLocation
    } else {
      pickupCheckResult.value = {
        available: false,
        message: 'Leider liegt Ihre Postleitzahl ausserhalb unseres Pickup-Bereichs. Bitte wählen Sie einen festen Standort.'
      }
    }
  } catch (error) {
    console.error('Error checking pickup availability:', error)
    pickupCheckResult.value = {
      available: false,
      message: 'Fehler bei der Prüfung. Bitte versuchen Sie es erneut oder wählen Sie einen festen Standort.'
    }
  } finally {
    isCheckingPickup.value = false
  }
}

// Helper function to extract PLZ from address string
const extractPLZFromAddress = (address: string): string | null => {
  if (!address) return null
  
  // Try to match Swiss PLZ format (4 digits)
  const match = address.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

// Select pickup option and proceed
const selectPickupOption = async () => {
  if (!selectedPickupLocation.value) return
  
  // Set the location as selected and proceed to instructor selection
  selectedLocation.value = {
    ...selectedPickupLocation.value,
    isPickup: true,
    pickupPLZ: pickupPLZ.value
  }
  
  await selectLocation(selectedLocation.value)
}

const selectLocation = async (location: any) => {
  selectedLocation.value = location
  
  // Get instructors available at this location
  availableInstructors.value = location.available_staff || []
  
  await waitForPressEffect()
  currentStep.value = 4
}

const selectInstructor = async (instructor: any) => {
  selectedInstructor.value = instructor
  await waitForPressEffect()
  currentStep.value = 5 // Wechsel zu Termin-Auswahl (inkl. Loading-State)
  
  // Generate time slots for this specific instructor-location combination
  await generateTimeSlotsForSpecificCombination()
}

const generateTimeSlotsForSpecificCombination = async () => {
  try {
    isLoadingTimeSlots.value = true
    
    // Clear appointments cache before generating new slots
    // This prevents accumulation when switching between instructors/locations
    const { clearAppointmentsCache } = useAvailabilitySystem()
    clearAppointmentsCache()
    
    const startTime = Date.now()
    console.log('🕒 Generating time slots for specific combination...')
    
    const timeSlots: any[] = []
    const slotTimes: { startTime: Date, endTime: Date }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to start of day
    
    console.log('📅 Generating slots starting from:', today.toISOString())
    
    // Generate slots for the next 4 weeks starting from today
    for (let week = 0; week < 4; week++) {
      for (let day = 0; day < 7; day++) {
        // Calculate the target date more safely
        const targetDate = new Date(today)
        targetDate.setDate(today.getDate() + (week * 7) + day)
        
        // Skip past dates (only include today and future dates)
        if (targetDate < today) continue
        
        // Generate time slots for this day (8:00 - 18:00, every hour)
        for (let hour = 8; hour < 18; hour++) {
          try {
            // Create slot time more safely
            const slotTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hour, 0, 0, 0)
            
            // Skip if slot is in the past (more than 30 minutes ago for realistic booking)
            const thirtyMinutesAgo = new Date()
            thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)
            if (slotTime < thirtyMinutesAgo) {
              console.log('⏰ Skipping past slot:', slotTime.toLocaleString('de-DE'), '(30+ minutes ago)')
              continue
            }
            
            // Double-check the date is valid
            if (isNaN(slotTime.getTime())) {
              console.warn('⚠️ Invalid date created:', { week, day, hour, targetDate, slotTime })
              continue
            }
            
            // Calculate end time safely - ensure duration is a number
            const duration = Array.isArray(filters.value.duration_minutes) 
              ? filters.value.duration_minutes[0] || 45 
              : filters.value.duration_minutes || 45
            
            const endTime = new Date(slotTime.getTime() + duration * 60000)
            
            // Validate end time too
            if (isNaN(endTime.getTime())) {
              console.warn('⚠️ Invalid end time created:', { slotTime, duration, originalDuration: filters.value.duration_minutes })
              continue
            }
            
            // Store slot info for batch availability check
            slotTimes.push({ startTime: slotTime, endTime })
            
            // Debug: Log slot creation for today
            if (targetDate.toDateString() === today.toDateString()) {
              console.log('📅 Creating slot for today:', slotTime.toLocaleString('de-DE'), 'Current time:', new Date().toLocaleString('de-DE'))
            }
            
            timeSlots.push({
              id: `${selectedInstructor.value.id}-${selectedLocation.value.id}-${slotTime.getTime()}`,
              staff_id: selectedInstructor.value.id,
              staff_name: `${selectedInstructor.value.first_name} ${selectedInstructor.value.last_name}`,
              location_id: selectedLocation.value.id,
              location_name: selectedLocation.value.name,
              start_time: slotTime.toISOString(),
              end_time: endTime.toISOString(),
              duration_minutes: duration,
              is_available: true, // Will be updated after batch check
              week_number: week + 1,
              day_name: slotTime.toLocaleDateString('de-DE', { weekday: 'long' }),
              date_formatted: slotTime.toLocaleDateString('de-DE'),
              time_formatted: slotTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            })
          } catch (dateErr) {
            console.warn('⚠️ Error creating date for slot:', { week, day, hour, error: dateErr })
            continue
          }
        }
      }
    }
    
    console.log('📊 Generated', timeSlots.length, 'time slots for availability check')
    
    // Batch check availability for all slots
    if (slotTimes.length > 0) {
      const availabilityResults = await checkBatchAvailability(selectedInstructor.value.id, slotTimes)
      
      // Update availability for each slot
      timeSlots.forEach((slot, index) => {
        slot.is_available = availabilityResults[index] || false
      })
    }
    
    let filteredSlots = timeSlots.filter(slot => slot.is_available)
    console.log(`✅ Generated ${filteredSlots.length} available time slots (before time windows & travel time validation)`)
    
    // Debug: Check time windows
    console.log('🔍 Checking time windows:', {
      hasLocation: !!selectedLocation.value,
      locationName: selectedLocation.value?.name,
      timeWindows: selectedLocation.value?.time_windows,
      timeWindowsLength: selectedLocation.value?.time_windows?.length
    })
    
    // Apply Time Windows Validation if location has time windows defined
    if (selectedLocation.value && selectedLocation.value.time_windows && selectedLocation.value.time_windows.length > 0) {
      const { isWithinTimeWindows } = await import('~/utils/travelTimeValidation')
      const beforeTimeWindows = filteredSlots.length
      
      filteredSlots = filteredSlots.filter(slot => {
        // Parse the ISO time string to Date
        if (!slot.start_time) {
          console.warn('⚠️ Slot has no start_time:', slot)
          return false
        }
        const slotDate = new Date(slot.start_time)
        
        const isValid = isWithinTimeWindows(slotDate, selectedLocation.value.time_windows)
        
        if (!isValid) {
          console.log(`❌ Slot outside time windows: ${slot.start_time}`)
        }
        
        return isValid
      })
      
      const blockedByTimeWindows = beforeTimeWindows - filteredSlots.length
      console.log(`🕒 Time windows validation: ${blockedByTimeWindows} slots blocked, ${filteredSlots.length} remaining`)
    }
    
    // Apply Minimum Lead Time Validation
    if (selectedInstructor.value && selectedInstructor.value.minimum_booking_lead_time_hours) {
      const beforeLeadTime = filteredSlots.length
      const minimumLeadTimeHours = selectedInstructor.value.minimum_booking_lead_time_hours
      const now = new Date()
      const minimumBookingTime = new Date(now.getTime() + minimumLeadTimeHours * 60 * 60 * 1000)
      
      console.log(`⏰ Applying minimum lead time validation: ${minimumLeadTimeHours} hours`)
      console.log(`⏰ Current time: ${now.toLocaleString('de-CH')}`)
      console.log(`⏰ Minimum booking time: ${minimumBookingTime.toLocaleString('de-CH')}`)
      
      filteredSlots = filteredSlots.filter(slot => {
        // Parse the ISO time string to Date
        if (!slot.start_time) {
          console.warn('⚠️ Slot has no start_time:', slot)
          return false
        }
        const slotDate = new Date(slot.start_time)
        
        const isValid = slotDate >= minimumBookingTime
        
        if (!isValid) {
          console.log(`❌ Slot too soon (minimum ${minimumLeadTimeHours}h lead time): ${slot.start_time}`)
        }
        
        return isValid
      })
      
      const blockedByLeadTime = beforeLeadTime - filteredSlots.length
      console.log(`⏰ Lead time validation: ${blockedByLeadTime} slots blocked, ${filteredSlots.length} remaining`)
    }
    
    // Apply Travel-Time Validation if location has pickup settings
    if (selectedLocation.value && selectedInstructor.value && selectedCategory.value) {
      try {
        // Get location PLZ
        const locationPLZ = extractPLZFromAddress(selectedLocation.value.address)
        
        if (locationPLZ) {
          // Get max travel time from category pickup settings for this location
          let maxTravelTime = 15 // Default fallback
          
          if (selectedLocation.value.category_pickup_settings) {
            const categorySettings = selectedLocation.value.category_pickup_settings[selectedCategory.value.code]
            if (categorySettings && categorySettings.pickup_radius_minutes) {
              maxTravelTime = categorySettings.pickup_radius_minutes
              console.log(`📍 Using pickup radius for category ${selectedCategory.value.code}: ${maxTravelTime} min`)
            }
          }
          
          // Get Google API key from runtime config
          const config = useRuntimeConfig()
          const googleApiKey = (config.public?.googleMapsApiKey || config.googleMapsApiKey) as string | undefined
          
          // Travel-time validation with proper request batching
          if (googleApiKey && typeof googleApiKey === 'string') {
            console.log('🚗 Applying travel-time validation...')
            
            // Load appointments for all dates in the current view
            // This populates the appointmentsCache needed for travel time validation
            const uniqueDates = new Set<string>()
            console.log('📅 Total filteredSlots before date extraction:', filteredSlots.length)
            filteredSlots.forEach(slot => {
              // Extract YYYY-MM-DD from either ISO format (2025-11-11T09:00:00.000Z) or local format (2025-11-11 09:00:00)
              const date = slot.start_time.split(/[T ]/)[0] // Split by T or space
              console.log('📅 Extracting date from slot:', slot.start_time, '→', date)
              uniqueDates.add(date)
            })
            
            const datesArray = Array.from(uniqueDates)
            console.log('📅 Unique dates extracted:', datesArray)
            console.log('📅 Loading appointments for dates:', datesArray)
            console.log('📅 Sample slots:', filteredSlots.slice(0, 3).map(s => ({ start: s.start_time, staff: s.staff_id })))
            for (const date of datesArray) {
              // skipFutureFilter = true to load ALL appointments for travel-time validation
              await loadAppointments(date, currentTenant.value?.id, true)
            }
            
            // Validate slots with travel time (with timeout)
            try {
              const validationPromise = validateSlotsWithTravelTime(
                filteredSlots,
                selectedInstructor.value.id,
                locationPLZ as string, // Already checked to be non-null in outer if
                maxTravelTime,
                googleApiKey as string // Already checked in outer if
              )
              
              // Add a 15 second timeout
              const timeoutPromise = new Promise<any[]>((_, reject) => 
                setTimeout(() => reject(new Error('Travel-time validation timeout')), 15000)
              )
              
              const validatedSlots = await Promise.race([validationPromise, timeoutPromise])
              console.log(`✅ After travel-time validation: ${validatedSlots.length} slots remaining (was ${filteredSlots.length})`)
              filteredSlots = validatedSlots
            } catch (timeoutErr) {
              console.warn('⚠️ Travel-time validation timed out, showing all slots:', timeoutErr)
              // Continue with unvalidated slots
            }
          } else {
            console.warn('⚠️ Google API key not found, skipping travel-time validation')
          }
        }
      } catch (validationErr) {
        console.error('❌ Error during travel-time validation:', validationErr)
        // Continue with unvalidated slots
      }
    }
    
    availableTimeSlots.value = filteredSlots
    console.log(`✅ Final available slots: ${availableTimeSlots.value.length}`)
  } catch (err) {
    console.error('❌ Error generating time slots:', err)
  } finally {
    isLoadingTimeSlots.value = false
  }
}

const selectTimeSlot = async (slot: any) => {
  selectedSlot.value = slot
  console.log('✅ Time slot selected:', slot)
  
  // Reserve the slot for 5 minutes
  const reserved = await reserveSlot()
  if (!reserved) {
    selectedSlot.value = null
    return
  }
  
  // Go to final confirmation step (Pickup-Adresse oder Zusammenfassung)
  await waitForPressEffect()
  currentStep.value = 6
  
  // Initialize Google Places Autocomplete for pickup address
  if (selectedLocation.value?.isPickup) {
    nextTick(() => {
      initializeAddressAutocomplete()
    })
  }
}

// Initialize Google Places Autocomplete
const initializeAddressAutocomplete = () => {
  if (!pickupAddressInput.value) {
    console.warn('Pickup address input not found')
    return
  }
  
  if (typeof window === 'undefined' || !window.google || !window.google.maps) {
    console.warn('Google Maps not loaded')
    return
  }
  
  try {
    // Create autocomplete instance with restrictions
    autocomplete = new window.google.maps.places.Autocomplete(pickupAddressInput.value, {
      componentRestrictions: { country: 'ch' }, // Switzerland only
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['address'] // Only addresses, no businesses
    })
    
    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      
      if (!place.address_components) {
        console.warn('No address components found')
        return
      }
      
      // Extract PLZ from address components
      let extractedPLZ = ''
      let formattedAddress = place.formatted_address || ''
      
      for (const component of place.address_components) {
        if (component.types.includes('postal_code')) {
          extractedPLZ = component.long_name
          break
        }
      }
      
      // Update input value
      pickupAddress.value = formattedAddress
      
      // Validate the address
      if (!extractedPLZ) {
        pickupAddressDetails.value = {
          valid: false,
          error: 'Bitte geben Sie eine vollständige Adresse mit PLZ ein.'
        }
        return
      }
      
      if (extractedPLZ !== selectedLocation.value.pickupPLZ) {
        pickupAddressDetails.value = {
          valid: false,
          error: `Die Adresse muss in PLZ ${selectedLocation.value.pickupPLZ} liegen. Sie haben PLZ ${extractedPLZ} eingegeben.`
        }
        return
      }
      
      // Address is valid
      pickupAddressDetails.value = {
        valid: true,
        formatted: formattedAddress,
        plz: extractedPLZ,
        name: '',
        geometry: place.geometry
      }
      
      console.log('✅ Address selected:', pickupAddressDetails.value)
    })
    
    console.log('✅ Google Places Autocomplete initialized')
  } catch (error) {
    console.error('Error initializing autocomplete:', error)
  }
}

// Validate pickup address
let validateTimeout: NodeJS.Timeout | null = null
const validatePickupAddress = () => {
  // Clear previous timeout
  if (validateTimeout) {
    clearTimeout(validateTimeout)
  }
  
  // Reset validation state (nur wenn bereits eine Validierung stattgefunden hat)
  // Zeige keine Fehler während der Eingabe
  if (pickupAddressDetails.value && !pickupAddressDetails.value.valid) {
    pickupAddressDetails.value = null
  }
  
  // Don't validate empty input or very short input
  if (!pickupAddress.value || pickupAddress.value.length < 10) {
    return
  }
  
  // Debounce validation - längere Wartezeit für manuelle Eingabe
  validateTimeout = setTimeout(async () => {
    // Nur validieren wenn der User wirklich aufgehört hat zu tippen
    isValidatingAddress.value = true
    
    try {
      // Extract PLZ from address
      const plzMatch = pickupAddress.value.match(/\b(\d{4})\b/)
      const extractedPLZ = plzMatch ? plzMatch[1] : null
      
      // Check if PLZ matches the selected location's PLZ
      if (!extractedPLZ) {
        pickupAddressDetails.value = {
          valid: false,
          error: 'Bitte wählen Sie eine Adresse aus den Vorschlägen oder geben Sie eine vollständige Adresse mit PLZ ein.'
        }
        return
      }
      
      if (extractedPLZ !== selectedLocation.value.pickupPLZ) {
        pickupAddressDetails.value = {
          valid: false,
          error: `Die Adresse muss in PLZ ${selectedLocation.value.pickupPLZ} liegen. Sie haben PLZ ${extractedPLZ} eingegeben.`
        }
        return
      }
      
      // Address is valid
      pickupAddressDetails.value = {
        valid: true,
        formatted: pickupAddress.value,
        plz: extractedPLZ,
        name: ''
      }
      
    } catch (error) {
      console.error('Error validating address:', error)
      pickupAddressDetails.value = {
        valid: false,
        error: 'Fehler bei der Adressprüfung. Bitte versuchen Sie es erneut.'
      }
    } finally {
      isValidatingAddress.value = false
    }
  }, 1500) // 1.5 Sekunden Wartezeit - nur wenn User wirklich fertig ist
}

// State for modals
const showLoginModal = ref(false)
const loginModalTab = ref<'login' | 'register'>('register') // Default to register for booking flow
const showDocumentUploadModal = ref(false)
const requiredDocuments = ref<any[]>([])
const isCreatingBooking = ref(false)

// Confirm booking
const confirmBooking = async () => {
  try {
    console.log('🎯 Starting booking confirmation...')
    
    // Step 1: Check if user is authenticated
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('ℹ️ User not authenticated, showing registration modal')
      loginModalTab.value = 'register' // Show registration tab
      showLoginModal.value = true
      return
    }
    
    console.log('✅ User authenticated:', user.id)
    
    // Step 2: Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
    
    if (userError || !userData) {
      console.error('Error loading user data:', userError)
      alert('Fehler beim Laden der Benutzerdaten. Bitte versuchen Sie es erneut.')
      return
    }
    
    console.log('✅ User data loaded:', userData)
    
    // Step 3: Check document requirements for category
    const categoryRequirements = selectedCategory.value.document_requirements
    
    if (categoryRequirements) {
      const requirements = typeof categoryRequirements === 'string' 
        ? JSON.parse(categoryRequirements) 
        : categoryRequirements
      
      const requiredDocs = requirements.required || []
      const alwaysRequired = requiredDocs.filter((doc: any) => doc.when_required === 'always')
      
      if (alwaysRequired.length > 0) {
        console.log('📄 Category requires documents:', alwaysRequired)
        
        // Check which documents are missing
        const missingDocs = []
        
        for (const doc of alwaysRequired) {
          // Check if document exists in storage
          const { data: files } = await supabase.storage
            .from('user-documents')
            .list(`${userData.id}/${doc.storage_prefix}`)
          
          if (!files || files.length === 0) {
            missingDocs.push(doc)
          }
        }
        
        if (missingDocs.length > 0) {
          console.log('❌ Missing documents:', missingDocs)
          requiredDocuments.value = missingDocs
          showDocumentUploadModal.value = true
          return
        }
        
        console.log('✅ All required documents present')
      }
    }
    
    // Step 4: Create appointment
    await createAppointment(userData)
    
  } catch (error: any) {
    console.error('Error confirming booking:', error)
    isCreatingBooking.value = false
    alert(`Fehler bei der Buchung: ${error?.message || error?.data?.message || 'Bitte versuchen Sie es erneut.'}`)
  }
}

// Create appointment in database
const createAppointment = async (userData: any) => {
  isCreatingBooking.value = true
  
  try {
    console.log('🔄 Creating appointment...')
    
    // Check for collision one more time before creating
    const supabase = getSupabase()
    const startTime = new Date(selectedSlot.value.start_time).toISOString()
    const endTime = new Date(selectedSlot.value.end_time).toISOString()
    
    // Query for conflicts using RPC or direct query
    const { data: conflictingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('staff_id', selectedInstructor.value.id)
      .neq('status', 'reserved')
      .lt('end_time', endTime)
      .gt('start_time', startTime)
    
    if (conflictingAppointments && conflictingAppointments.length > 0) {
      throw new Error('Der Termin wurde leider soeben vergeben. Versuchen Sie es mit einem anderen Termin.')
    }
    
    const appointmentData = {
      user_id: userData.id,
      staff_id: selectedInstructor.value.id,
      location_id: selectedLocation.value.isPickup ? null : selectedLocation.value.id,
      custom_location_address: selectedLocation.value.isPickup ? pickupAddressDetails.value?.formatted : null,
      custom_location_name: selectedLocation.value.isPickup ? (pickupAddressDetails.value?.name || 'Pickup') : null,
      start_time: selectedSlot.value.start_time,
      end_time: selectedSlot.value.end_time,
      duration_minutes: selectedSlot.value.duration_minutes,
      type: selectedCategory.value.code,
      event_type_code: 'lesson',
      // All bookings from this flow are directly confirmed
      // - Authenticated users: self-booking, no approval needed
      // - Unauthenticated users: will pay via Wallee, then register
      status: 'confirmed',
      tenant_id: currentTenant.value.id
    }
    
    console.log('📝 Appointment data:', appointmentData)
    
    // Call API to create appointment
    const response = await $fetch<{
      success: boolean
      appointment_id: string
      payment_id: string | null
      confirmation_token: string
    }>('/api/booking/create-appointment', {
      method: 'POST',
      body: appointmentData
    })
    
    console.log('✅ Appointment created:', response)
    
    // If payment was created, check if automatic authorization is possible
    if (response.payment_id) {
      console.log('💳 Payment created, checking payment details...')
      
      // Get payment and user details
      const supabase = getSupabase()
      const { data: paymentData } = await supabase
        .from('payments')
        .select('payment_method, payment_status, payment_method_id')
        .eq('id', response.payment_id)
        .single()
      
      let hasToken = paymentData?.payment_method_id ? true : false
      const isWallee = paymentData?.payment_method === 'wallee'
      
      // If no payment_method_id on payment, check if user has a saved token
      if (!hasToken && isWallee) {
        console.log('ℹ️ No payment_method_id on payment, checking for user tokens...')
        console.log('🔍 Search criteria:', {
          user_id: userData.id,
          tenant_id: currentTenant.value.id,
          is_active: true,
          is_default: true
        })
        
        const { data: userToken } = await supabase
          .from('customer_payment_methods')
          .select('id')
          .eq('user_id', userData.id)
          .eq('tenant_id', currentTenant.value.id)
          .eq('is_active', true)
          .eq('is_default', true)
          .maybeSingle()
        
        console.log('📋 Query result:', userToken)
        
        if (userToken?.id) {
          console.log('✅ Found default user token:', userToken.id)
          // Link the token to the payment
          await supabase
            .from('payments')
            .update({ payment_method_id: userToken.id })
            .eq('id', response.payment_id)
          hasToken = true
        } else {
          console.log('⚠️ No default token found, trying to find ANY active token...')
          const { data: anyToken } = await supabase
            .from('customer_payment_methods')
            .select('id')
            .eq('user_id', userData.id)
            .eq('tenant_id', currentTenant.value.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
          
          console.log('📋 Any token result:', anyToken)
          
          if (anyToken?.id) {
            console.log('✅ Found any active user token:', anyToken.id)
            // Link the token to the payment
            await supabase
              .from('payments')
              .update({ payment_method_id: anyToken.id })
              .eq('id', response.payment_id)
            hasToken = true
          }
        }
      }
      
      console.log('🔍 Payment check:', {
        payment_method: paymentData?.payment_method,
        payment_status: paymentData?.payment_status,
        payment_method_id: paymentData?.payment_method_id,
        hasToken,
        isWallee
      })
      
      if (isWallee && paymentData?.payment_status === 'pending' && hasToken) {
        console.log('✅ Token available, attempting automatic authorization & capture...')
        
        // Try automatic authorization and capture
        try {
          const authResponse = await $fetch<{success: boolean}>(`/api/wallee/authorize-payment`, {
            method: 'POST',
            body: {
              paymentId: response.payment_id,
              userId: userData.id,
              tenantId: currentTenant.value.id
            }
          })
          
          if (authResponse?.success) {
            console.log('✅ Payment authorized')
            
            // Try capture immediately if within capture window
            const captureResponse = await $fetch<{success: boolean}>(`/api/wallee/capture-payment`, {
              method: 'POST',
              body: {
                paymentId: response.payment_id,
                userId: userData.id,
                tenantId: currentTenant.value.id
              }
            })
            
            if (captureResponse?.success) {
              console.log('✅ Payment captured successfully!')
              alert('Termin erfolgreich gebucht! Ihr Termin wurde bestätigt und die Zahlung verarbeitet.')
              await navigateTo(route.query.referrer as string || '/customer-dashboard')
              return
            }
          }
        } catch (err) {
          console.warn('⚠️ Automatic payment failed, redirecting to payment page:', err)
          // Fall back to payment process page
        }
      }
      
      // If no token or automatic payment failed, redirect to payment page
      if (isWallee && paymentData?.payment_status === 'pending') {
        console.log('🔄 Redirecting to payment process page...')
        await navigateTo(`/customer/payment-process?payments=${response.payment_id}`)
      } else {
        console.log('✅ Payment already processed or no payment needed')
        alert('Termin erfolgreich gebucht! Ihr Termin wurde bestätigt.')
        await navigateTo(route.query.referrer as string || '/customer-dashboard')
      }
    } else {
      alert('Termin erfolgreich gebucht! Ihr Termin wurde bestätigt.')
      await navigateTo(route.query.referrer as string || '/customer-dashboard')
    }
    
  } catch (error: any) {
    console.error('❌ Error creating appointment:', error)
    console.error('❌ Error details:', {
      message: error?.message,
      data: error?.data,
      statusCode: error?.statusCode,
      cause: error?.cause
    })
    alert(`Fehler bei der Buchung: ${error?.data?.message || error?.message || 'Bitte versuchen Sie es erneut.'}`)
  } finally {
    isCreatingBooking.value = false
  }
}

// Handle successful login/registration
const handleAuthSuccess = () => {
  showLoginModal.value = false
  // Retry booking
  confirmBooking()
}

// Handle successful document upload
const handleDocumentUploadSuccess = () => {
  showDocumentUploadModal.value = false
  // Retry booking
  confirmBooking()
}

const goBackToStep = (step: number) => {
  // Cancel reservation when going back to step 5 or earlier from step 6
  if (currentStep.value === 6 && step <= 5) {
    cancelReservation()
  }
  
  currentStep.value = step
  
  // Reset subsequent selections
  if (step < 6) {
    selectedSlot.value = null
    pickupAddress.value = ''
    pickupAddressDetails.value = null
    // Also cancel reservation if going back from 6
    if (currentReservationId.value) {
      cancelReservation()
    }
  }
  if (step < 5) {
    selectedSlot.value = null
  }
  if (step < 4) {
    selectedInstructor.value = null
    availableTimeSlots.value = []
  }
  if (step < 3) {
    selectedLocation.value = null
    availableInstructors.value = []
  }
  if (step < 2) {
    selectedDuration.value = null
    filters.value.duration_minutes = 45
    durationOptions.value = []
  }
  if (step < 1) {
    selectedCategory.value = null
    availableLocations.value = []
    availableStaff.value = []
    filters.value.category_code = ''
  }
}

const goBackToReferrer = () => {
  if (referrerUrl.value) {
    navigateTo(referrerUrl.value)
  } else {
    navigateTo('/customer-dashboard')
  }
}

const goToStep = (step: number) => {
  // Only allow going to steps that are already completed or current
  if (step <= currentStep.value) {
    goBackToStep(step)
    
    // Scroll to the clicked step on small screens
    if (isScreenSmall.value) {
      nextTick(() => {
        scrollToStep(step)
      })
    }
  }
}

const scrollToStep = (step: number) => {
  if (!stepsContainerRef.value) return
  
  // Find the button for this step
  const stepButton = stepsContainerRef.value.querySelector(`button[data-step="${step}"]`)
  if (stepButton) {
    stepButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
}

// Reservation functions
const reserveSlot = async (userId?: string) => {
  if (!selectedSlot.value || !selectedInstructor.value || !currentTenant.value) {
    console.warn('⚠️ Missing required data for reservation')
    return false
  }
  
  try {
    console.log('🔄 Reserving slot...')
    
    // Server will determine user_id from auth token or generate session ID
    const response = await $fetch<{
      success: boolean
      reservation_id: string
      reserved_until: string
    }>('/api/booking/reserve-slot', {
      method: 'POST',
      body: {
        staff_id: selectedInstructor.value.id,
        start_time: selectedSlot.value.start_time,
        end_time: selectedSlot.value.end_time,
        duration_minutes: selectedSlot.value.duration_minutes || selectedDuration.value,
        category_code: selectedCategory.value?.code,
        location_id: selectedLocation.value?.id,
        tenant_id: currentTenant.value.id
      }
    })

    if (response.success) {
      console.log('✅ Slot reserved:', response.reservation_id)
      currentReservationId.value = response.reservation_id
      reservedUntil.value = new Date(response.reserved_until)
      startCountdown()
      return true
    } else {
      console.error('❌ Reservation failed')
      return false
    }
  } catch (error: any) {
    console.error('❌ Error reserving slot:', error)
    alert(`Fehler bei der Reservierung: ${error?.data?.message || error?.message}`)
    return false
  }
}

const cancelReservation = async (silent: boolean = false) => {
  if (!currentReservationId.value) return

  try {
    console.log('🗑️ Cancelling reservation...')
    
    await $fetch('/api/booking/cancel-reservation', {
      method: 'POST',
      body: {
        reservation_id: currentReservationId.value
      }
    })

    console.log('✅ Reservation cancelled')
  } catch (error: any) {
    console.error('❌ Error cancelling reservation:', error)
    // Silently ignore cancellation errors - the reservation might already be gone
    if (!silent) {
      console.warn('⚠️ Could not cancel reservation, but continuing...')
    }
  } finally {
    // Always reset state regardless of cancellation success
    currentReservationId.value = null
    reservedUntil.value = null
    remainingSeconds.value = 0
    
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value)
      countdownInterval.value = null
    }
  }
}

const startCountdown = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  const updateCountdown = async () => {
    if (!reservedUntil.value) return

    const now = new Date()
    const diff = reservedUntil.value.getTime() - now.getTime()
    
    if (diff <= 0) {
      // Zeit abgelaufen
      console.log('⏰ Reservation expired')
      // Cancel silently - just clean up state
      await cancelReservation(true)
      // Notify user without alert - just go back
      console.log('🔄 Going back to step 5 due to reservation expiry')
      goBackToStep(5)
    } else {
      remainingSeconds.value = Math.ceil(diff / 1000)
    }
  }

  updateCountdown()
  countdownInterval.value = setInterval(updateCountdown, 1000)
}

const getCountdownText = computed(() => {
  const mins = Math.floor(remainingSeconds.value / 60)
  const secs = remainingSeconds.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const handleBackButton = () => {
  // On step 1, go back to referrer
  if (currentStep.value === 1) {
    goBackToReferrer()
  } else {
    // On other steps, go back one step
    goBackToStep(currentStep.value - 1)
  }
}

const proceedToRegistration = () => {
  if (!selectedSlot.value) return
  
  // TODO: Navigate to registration page with selected slot
  alert(`Termin ausgewählt: ${selectedSlot.value.staff_name} am ${formatDate(selectedSlot.value.start_time)} um ${formatTime(selectedSlot.value.start_time)}`)
}

const setTenantFromSlug = async (slugOrId: string) => {
  try {
    // First try to find tenant by slug
    let { data: tenantData, error } = await supabase
      .from('tenants')
      .select('id, name, slug, business_type, primary_color, secondary_color, accent_color')
      .eq('slug', slugOrId)
      .eq('is_active', true)
      .single()
    
    // If not found by slug, try by id (UUID format)
    if (error && error.code === 'PGRST116') {
      console.log('🔍 Tenant not found by slug, trying by ID:', slugOrId)
      const result = await supabase
        .from('tenants')
        .select('id, name, slug, business_type, primary_color, secondary_color, accent_color')
        .eq('id', slugOrId)
        .eq('is_active', true)
        .single()
      
      tenantData = result.data
      error = result.error
    }
    
    if (error) {
      console.error('❌ Error finding tenant by slug/ID:', error)
      return
    }
    
    currentTenant.value = tenantData
    
    // Reset category when tenant changes
    filters.value.category_code = ''
    // Clear search results
    availableStaff.value = []
    hasSearched.value = false
    
    // Load tenant settings and categories
    await Promise.all([
      loadTenantSettings(),
      loadCategories()
    ])
    
    console.log('✅ Tenant set from slug/ID:', tenantData?.name)
  } catch (err) {
    console.error('❌ Error setting tenant from slug/ID:', err)
  }
}

const loadTenantSettings = async () => {
  try {
    if (!currentTenant.value) return

    const { data, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', currentTenant.value.id)

    if (error) throw error

    // Convert array to object for easy access
    const settings: any = {}
    data?.forEach(setting => {
      settings[setting.setting_key] = setting.setting_value
    })

    tenantSettings.value = settings
    console.log('✅ Tenant settings loaded:', settings)
  } catch (err) {
    console.error('❌ Error loading tenant settings:', err)
    // Set defaults if loading fails
    tenantSettings.value = {
      default_working_start: '08:00',
      default_working_end: '18:00',
      slot_interval_minutes: '15',
      default_buffer_minutes: '15',
      min_advance_booking_hours: '2',
      max_advance_booking_days: '30'
    }
  }
}

const loadCategories = async () => {
  try {
    if (!currentTenant.value) {
      console.log('🚫 No current tenant selected')
      categories.value = []
      return
    }

    // Only load categories if business_type is driving_school
    if (currentTenant.value.business_type !== 'driving_school') {
      console.log('🚫 Categories not available for business_type:', currentTenant.value.business_type)
      categories.value = []
      return
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, code, name, description, lesson_duration_minutes, tenant_id')
      .eq('is_active', true)
      .eq('tenant_id', currentTenant.value.id)
      .order('code')
    
    if (error) throw error
    categories.value = data || []
    
    // Load locations count (nur standard locations)
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .eq('location_type', 'standard')
      .eq('tenant_id', currentTenant.value.id)
    
    if (locationsError) throw locationsError
    locationsCount.value = locations?.length || 0
    
  } catch (err) {
    console.error('❌ Error loading categories:', err)
  }
}
// Branding colors from tenant
const getBrandPrimary = (fallback = '#2563EB') => {
  const hex = currentTenant.value?.primary_color || fallback
  const isValid = /^#([0-9a-fA-F]{6})$/.test(hex)
  return isValid ? hex : fallback
}
const getBrandSecondary = (fallback = '#374151') => {
  const hex = currentTenant.value?.secondary_color || fallback
  const isValid = /^#([0-9a-fA-F]{6})$/.test(hex)
  return isValid ? hex : fallback
}

const lightenColor = (hex: string, amount: number) => {
  if (!/^#([0-9a-fA-F]{6})$/.test(hex)) return hex
  const clamp = (value: number) => Math.min(255, Math.max(0, value))
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const newR = clamp(Math.round(r + (255 - r) * amount))
  const newG = clamp(Math.round(g + (255 - g) * amount))
  const newB = clamp(Math.round(b + (255 - b) * amount))
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

const withAlpha = (hex: string, alpha: number) => {
  // Convert #RRGGBB to rgba
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// New availability logic functions
const determineDayMode = async (staffId: string, targetDate: Date): Promise<'free-day' | 'constrained'> => {
  try {
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    // Check for appointments on this day
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, location_id')
      .eq('staff_id', staffId)
      .eq('status', 'scheduled')
      .is('deleted_at', null)
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString())
    
    // Check for external busy times on this day
    const { data: externalBusy } = await supabase
      .from('external_busy_times')
      .select('id')
      .eq('staff_id', staffId)
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString())
    
    const hasAppointments = appointments && appointments.length > 0
    const hasExternalBusy = externalBusy && externalBusy.length > 0
    
    return (hasAppointments || hasExternalBusy) ? 'constrained' : 'free-day'
  } catch (err) {
    console.error('❌ Error determining day mode:', err)
    return 'constrained' // Default to constrained on error
  }
}

const generateFreeDaySlots = async (staff: any, location: any, targetDate: Date, workingStart: string, workingEnd: string, slotInterval: number) => {
  const slots: any[] = []
  
  // Parse working hours
  const [startHour, startMinute] = workingStart.split(':').map(Number)
  const [endHour, endMinute] = workingEnd.split(':').map(Number)
  
  const startTimeMinutes = startHour * 60 + startMinute
  const endTimeMinutes = endHour * 60 + endMinute
  
  // Generate slots in intervals
  for (let timeMinutes = startTimeMinutes; timeMinutes < endTimeMinutes; timeMinutes += slotInterval) {
    const slotTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 
      Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0)
    
    // Skip if slot is in the past
    if (slotTime < new Date()) continue
    
    const duration = Array.isArray(filters.value.duration_minutes) 
      ? filters.value.duration_minutes[0] || 45 
      : filters.value.duration_minutes || 45
    
    const endTime = new Date(slotTime.getTime() + duration * 60000)
    
    // Check if slot fits within working hours
    if (endTime.getHours() * 60 + endTime.getMinutes() > endTimeMinutes) continue
    
    slots.push({
      id: `${staff.id}-${location.id}-${slotTime.getTime()}`,
      staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      location_id: location.id,
      location_name: location.name,
      start_time: slotTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: duration,
      is_available: true,
      week_number: Math.ceil((targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
      day_name: slotTime.toLocaleDateString('de-DE', { weekday: 'long' }),
      date_formatted: slotTime.toLocaleDateString('de-DE'),
      time_formatted: slotTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    })
  }
  
  return slots
}

const generateConstrainedSlots = async (staff: any, location: any, targetDate: Date, workingStart: string, workingEnd: string, slotInterval: number, bufferMinutes: number) => {
  const slots: any[] = []
  
  try {
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    // Get appointments for this staff on this day at this location
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('staff_id', staff.id)
      .eq('location_id', location.id)
      .eq('status', 'scheduled')
      .is('deleted_at', null)
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString())
      .order('start_time')
    
    // Get external busy times for this staff on this day
    const { data: externalBusy } = await supabase
      .from('external_busy_times')
      .select('start_time, end_time')
      .eq('staff_id', staff.id)
      .gte('start_time', dayStart.toISOString())
      .lte('end_time', dayEnd.toISOString())
      .order('start_time')
    
    // Combine all busy times
    const allBusyTimes = [
      ...(appointments || []).map(apt => ({
        start: new Date(apt.start_time),
        end: new Date(apt.end_time)
      })),
      ...(externalBusy || []).map(ebt => ({
        start: new Date(ebt.start_time),
        end: new Date(ebt.end_time)
      }))
    ].sort((a, b) => a.start.getTime() - b.start.getTime())
    
    // Parse working hours
    const [startHour, startMinute] = workingStart.split(':').map(Number)
    const [endHour, endMinute] = workingEnd.split(':').map(Number)
    
    const workingStartTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), startHour, startMinute)
    const workingEndTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), endHour, endMinute)
    
    if (allBusyTimes.length === 0) {
      // No appointments, generate slots for entire working day
      return await generateFreeDaySlots(staff, location, targetDate, workingStart, workingEnd, slotInterval)
    }
    
    // Generate slots before first appointment
    const firstAppointment = allBusyTimes[0]
    const slotsBefore = await generateSlotsInRange(staff, location, targetDate, workingStartTime, 
      new Date(firstAppointment.start.getTime() - bufferMinutes * 60000), slotInterval)
    slots.push(...slotsBefore)
    
    // Generate slots after last appointment
    const lastAppointment = allBusyTimes[allBusyTimes.length - 1]
    const slotsAfter = await generateSlotsInRange(staff, location, targetDate, 
      new Date(lastAppointment.end.getTime() + bufferMinutes * 60000), workingEndTime, slotInterval)
    slots.push(...slotsAfter)
    
  } catch (err) {
    console.error('❌ Error generating constrained slots:', err)
  }
  
  return slots
}

const generateSlotsInRange = async (staff: any, location: any, targetDate: Date, startTime: Date, endTime: Date, slotInterval: number) => {
  const slots: any[] = []
  
  const slotIntervalMs = slotInterval * 60000
  const duration = Array.isArray(filters.value.duration_minutes) 
    ? filters.value.duration_minutes[0] || 45 
    : filters.value.duration_minutes || 45
  
  for (let time = startTime.getTime(); time < endTime.getTime(); time += slotIntervalMs) {
    const slotTime = new Date(time)
    const slotEndTime = new Date(time + duration * 60000)
    
    // Skip if slot is in the past
    if (slotTime < new Date()) continue
    
    // Skip if slot doesn't fit in range
    if (slotEndTime.getTime() > endTime.getTime()) continue
    
    slots.push({
      id: `${staff.id}-${location.id}-${slotTime.getTime()}`,
      staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      location_id: location.id,
      location_name: location.name,
      start_time: slotTime.toISOString(),
      end_time: slotEndTime.toISOString(),
      duration_minutes: duration,
      is_available: true,
      week_number: Math.ceil((targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
      day_name: slotTime.toLocaleDateString('de-DE', { weekday: 'long' }),
      date_formatted: slotTime.toLocaleDateString('de-DE'),
      time_formatted: slotTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    })
  }
  
  return slots
}

// Lifecycle
onMounted(async () => {
  console.log('🎯 onMounted called!')
  try {
    // Check screen size for responsive step scrolling
    const checkScreenSize = () => {
      isScreenSmall.value = window.innerWidth < 1000
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    // Load referrer URL from query parameter
    console.log('🔍 Route query params:', route.query)
    console.log('🔍 Route full URL:', window.location.href)
    const refParam = route.query.referrer as string
    console.log('🔍 Referrer param value:', refParam)
    if (refParam) {
      referrerUrl.value = refParam
      console.log('🔄 Referrer URL set:', referrerUrl.value)
    } else {
      console.log('⚠️ No referrer parameter found')
    }
    
    // Lade Features um Prüfung durchführen zu können
    await loadFeatures()
    
    // Nur Tenant laden wenn Online-Buchung aktiviert ist
    if (isOnlineBookingEnabled.value) {
      const slug = route.params.slug as string
      
      if (slug) {
        // Set the tenant from slug
        await setTenantFromSlug(slug)
        console.log('✅ Tenant set from slug:', slug)
      } else {
        console.error('❌ No tenant slug provided in URL')
      }
    }
    
    console.log('✅ Availability page loaded')
  } catch (err) {
    console.error('❌ Error initializing availability page:', err)
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  window.removeEventListener('resize', () => {
    isScreenSmall.value = window.innerWidth < 1000
  })
})
</script>
