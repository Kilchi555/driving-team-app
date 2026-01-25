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
        <div 
          class="animate-spin rounded-full h-12 w-12 border-b-2" 
          :style="{ borderBottomColor: getBrandPrimary() }"
        ></div>
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
            <div class="flex items-center gap-2 sm:gap-4 flex-nowrap pr-4">
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
            <div 
              class="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto" 
              :style="{ borderBottomColor: getBrandPrimary() }"
            ></div>
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
                  @click="selectedSlot = slot; currentStep = 5"
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
              <div 
                class="animate-spin rounded-full h-4 w-4 border-b-2" 
                :style="{ borderBottomColor: getBrandPrimary() }"
              ></div>
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
        <div 
          class="animate-spin rounded-full h-12 w-12 border-b-2" 
          :style="{ borderBottomColor: getBrandPrimary() }"
        ></div>
        <p class="text-lg font-medium text-gray-900">Buchung wird erstellt...</p>
        <p class="text-sm text-gray-600 text-center">Bitte warten Sie einen Moment.</p>
      </div>
    </div>
  </div>

  <!-- Success Modal -->
  <div v-if="showSuccessModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-8 max-w-md mx-4 shadow-lg">
      <div class="flex flex-col items-center gap-4">
        <!-- Success Icon -->
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <!-- Title -->
        <h3 class="text-xl font-bold text-gray-900 text-center">{{ successMessage.title }}</h3>
        <!-- Description -->
        <p class="text-gray-600 text-center text-sm">{{ successMessage.description }}</p>
        <!-- Loading indicator -->
        <p class="text-xs text-gray-500 text-center">Sie werden weitergeleitet...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { logger } from '~/utils/logger'
import { useSecureAvailability } from '~/composables/useSecureAvailability'
import { useExternalCalendarSync } from '~/composables/useExternalCalendarSync'
import { getSupabase } from '~/utils/supabase'
import LoginRegisterModal from '~/components/booking/LoginRegisterModal.vue'
import DocumentUploadModal from '~/components/booking/DocumentUploadModal.vue'
import { useRoute, useRuntimeConfig } from '#app'
import { useFeatures } from '~/composables/useFeatures'
import { navigateTo } from '#app'
import AppointmentPreferencesForm from '~/components/booking/AppointmentPreferencesForm.vue'
import { parseTimeWindows } from '~/utils/travelTimeValidation'

// Page Meta
// @ts-ignore - definePageMeta is a Nuxt compiler macro
definePageMeta({
  layout: 'default'
})

// Composables - NEW: Secure Availability API
const {
  isLoading: isLoadingSlots,
  error: slotsError,
  availableSlots,
  fetchAvailableSlots,
  reserveSlot,
  createAppointment,
  groupSlotsByDate,
  generateSessionId
} = useSecureAvailability()

// Keep for UI compatibility
const isLoading = ref(false)
const error = ref<string | null>(null)

// Session management for slot reservation
const sessionId = ref(generateSessionId())
const reservedSlotId = ref<string | null>(null)
const reservationExpiry = ref<Date | null>(null)
const reservationCountdown = ref(600) // 10 minutes in seconds
let countdownInterval: any = null

const { autoSyncCalendars } = useExternalCalendarSync()

const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

const route = useRoute()
const supabase = getSupabase()

// ❌ REMOVED: checkBatchAvailability (replaced by backend API)
// Old function did 22+ direct DB queries - now handled by availability-calculator service
// NOTE: The following dead code should be removed in future refactoring
// @ts-ignore - Legacy code, no longer used but kept for reference
// eslint-disable-next-line

// NEW: Fetch pre-computed availability slots from secure API
const fetchAvailableSlotsForCombination = async (timeSlots: any[] = [], staffId: string = '') => {
  try {
    if (timeSlots.length === 0) return []
    
    // Get date range for all slots (extend range to catch timezone differences)
    const minDate = new Date(Math.min(...timeSlots.map(slot => slot.startTime.getTime())))
    const maxDate = new Date(Math.max(...timeSlots.map(slot => slot.endTime.getTime())))
    
    // Extend range by 24 hours to catch timezone differences
    minDate.setDate(minDate.getDate() - 1)
    maxDate.setDate(maxDate.getDate() + 1)
    
    logger.debug('🔍 Batch checking availability for staff:', staffId, 'from', minDate.toISOString(), 'to', maxDate.toISOString())
    
    // Load all appointments for this staff in the extended date range
    // Include ALL statuses except those that are logically deleted
    // Need to check for any overlap: start <= maxDate AND end >= minDate
    const { data: appointments, error: dbError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, title, status')
      .eq('staff_id', staffId)
      .not('status', 'eq', 'deleted')
      .is('deleted_at', null)
      .lte('start_time', maxDate.toISOString())  // Appointment starts before or at maxDate
      .gte('end_time', minDate.toISOString())    // Appointment ends after or at minDate
    
    if (dbError) {
      console.error('❌ Error checking batch availability:', dbError)
      return timeSlots.map(() => true) // Assume available on error
    }
    
    logger.debug('📊 Appointments loaded for batch check (FULL):', appointments?.map(a => ({
      id: a.id.substring(0, 8),
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      title: a.title
    })) || [])
    
    // Load working hours for this staff
    const { data: workingHours, error: whError } = await supabase
      .from('staff_working_hours')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('staff_id', staffId)
      .eq('is_active', true)
    
    if (whError) {
      console.error('❌ Error loading working hours:', whError)
    }
    
    // Load availability data for this staff via backend API
    // This bypasses RLS and allows public access (backend validates tenant_id)
    let externalBusyTimes: any[] = []
    let workingHoursFromAPI: any[] = []
    let appointmentsFromAPI: any[] = []
    
    try {
      const response = await fetch('/api/booking/get-availability-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: currentTenant.value?.id,
          staff_id: staffId,
          start_date: minDate.toISOString(),
          end_date: maxDate.toISOString(),
          include_working_hours: true,
          include_busy_times: true,
          include_appointments: true
        })
      })
      const data = await response.json()
      if (data.success) {
        externalBusyTimes = data.external_busy_times || []
        workingHoursFromAPI = data.working_hours || []
        appointmentsFromAPI = data.appointments || []
        logger.debug('✅ Fetched availability data via API:', {
          external_busy_times: externalBusyTimes.length,
          working_hours: workingHoursFromAPI.length,
          appointments: appointmentsFromAPI.length
        })
      } else {
        console.warn('⚠️ Error fetching availability data:', data.message)
      }
    } catch (err) {
      console.error('❌ Error calling get-availability-data API:', err)
    }
    
    // Use API data if available, otherwise use direct queries
    const finalWorkingHours = (workingHoursFromAPI && workingHoursFromAPI.length > 0) ? workingHoursFromAPI : (workingHours || [])
    const finalAppointments = (appointmentsFromAPI && appointmentsFromAPI.length > 0) ? appointmentsFromAPI : (appointments || [])
    
    logger.debug('📅 Found', finalAppointments.length, 'appointments,', externalBusyTimes?.length || 0, 'external busy times, and', finalWorkingHours.length, 'working hours')
    
    // Check each slot against appointments and working hours
    const availabilityResults = timeSlots.map(slot => {
      // Check if slot is within working hours
      const dayOfWeek = slot.startTime.getDay() // 0=Sunday, 1=Monday, etc.
      const slotHour = slot.startTime.getHours()
      const slotMinute = slot.startTime.getMinutes()
      const slotTimeMinutes = slotHour * 60 + slotMinute
      
      // Find working hours for this day
      const dayWorkingHours = finalWorkingHours.find((wh: any) => wh.day_of_week === dayOfWeek)
      
      if (!dayWorkingHours) {
        logger.debug('🚫 No working hours for day', dayOfWeek, '(Sunday=0)', slot.startTime.toLocaleDateString('de-DE'))
        return false // Not available if no working hours defined
      }
      
      // Parse working hours (format: "HH:MM")
      const [startHour, startMinute] = dayWorkingHours.start_time.split(':').map(Number)
      const [endHour, endMinute] = dayWorkingHours.end_time.split(':').map(Number)
      const startTimeMinutes = startHour * 60 + startMinute
      const endTimeMinutes = endHour * 60 + endMinute
      
      // Check if slot is within working hours
      // Allow slot if it starts during working hours (includes end time boundary)
      const withinWorkingHours = slotTimeMinutes >= startTimeMinutes && slotTimeMinutes <= endTimeMinutes
      
      // Debug 18:00 slot
      if (slot.startTime.getHours() === 17 && slot.startTime.getMinutes() === 0) {
        logger.debug('🔍 DEBUG 17:00 UTC (18:00 CET) working hours check:', {
          slotHour: slot.startTime.getHours(),
          slotTimeMinutes,
          startTimeMinutes,
          endTimeMinutes,
          withinWorkingHours,
          workingHours: `${dayWorkingHours.start_time} - ${dayWorkingHours.end_time}`
        })
      }
      
      if (!withinWorkingHours) {
        logger.debug('🚫 Slot outside working hours:', {
          slot: slot.startTime.toLocaleString('de-DE'),
          workingHours: `${dayWorkingHours.start_time} - ${dayWorkingHours.end_time}`,
          dayOfWeek: dayOfWeek,
          slotTimeMinutes,
          startTimeMinutes,
          endTimeMinutes
        })
        return false
      }
      
      // Check for conflicts with any appointment OR external busy time
      const hasConflict = (finalAppointments.some(apt => {
        // Parse appointment times - DB may return in ISO format (2025-11-20T08:00:00+00:00) or space format (2025-11-20 08:00:00+00)
        let aptStartISO = apt.start_time
        let aptEndISO = apt.end_time
        
        // Normalize format: convert space format to ISO if needed
        if (aptStartISO.includes(' ') && !aptStartISO.includes('T')) {
          aptStartISO = aptStartISO.replace(' ', 'T')
        }
        if (aptEndISO.includes(' ') && !aptEndISO.includes('T')) {
          aptEndISO = aptEndISO.replace(' ', 'T')
        }
        // Ensure timezone suffix is properly formatted
        if (!aptStartISO.includes('+') && !aptStartISO.includes('Z')) {
          aptStartISO += '+00:00'
        }
        if (!aptEndISO.includes('+') && !aptEndISO.includes('Z')) {
          aptEndISO += '+00:00'
        }
        
        const aptStartDate = new Date(aptStartISO)
        const aptEndDate = new Date(aptEndISO)
        
        // Check for time overlap: slot starts before appointment ends AND slot ends after appointment starts
        const overlaps = slot.startTime < aptEndDate && slot.endTime > aptStartDate
        
        if (overlaps) {
          logger.debug('⚠️ Time conflict detected (appointment):', {
            slot: `${slot.startTime.toLocaleString('de-DE')} - ${slot.endTime.toLocaleString('de-DE')}`,
            appointment: `${aptStartDate.toLocaleString('de-DE')} - ${aptEndDate.toLocaleString('de-DE')}`,
            appointmentTitle: apt.title,
            slotISO: `${slot.startTime.toISOString()} - ${slot.endTime.toISOString()}`,
            appointmentISO: `${apt.start_time} - ${apt.end_time}`
          })
        }
        
        return overlaps
      }) || false) || (externalBusyTimes?.some(ebt => {
        // Parse external busy time - now stored as UTC (same as appointments)
        // Format: "2025-11-20 12:00:00+00" (space format with UTC indicator)
        let ebtStartStr = ebt.start_time
        let ebtEndStr = ebt.end_time
        
        // Normalize format: convert space format to ISO if needed
        if (ebtStartStr.includes(' ') && !ebtStartStr.includes('T')) {
          ebtStartStr = ebtStartStr.replace(' ', 'T')
        }
        if (ebtEndStr.includes(' ') && !ebtEndStr.includes('T')) {
          ebtEndStr = ebtEndStr.replace(' ', 'T')
        }
        // Ensure timezone suffix is properly formatted
        if (ebtStartStr.includes('+00') && !ebtStartStr.includes('+00:00')) {
          ebtStartStr = ebtStartStr.replace('+00', '+00:00')
        }
        if (ebtEndStr.includes('+00') && !ebtEndStr.includes('+00:00')) {
          ebtEndStr = ebtEndStr.replace('+00', '+00:00')
        }
        if (!ebtStartStr.includes('+') && !ebtStartStr.includes('Z')) {
          ebtStartStr += '+00:00'
        }
        if (!ebtEndStr.includes('+') && !ebtEndStr.includes('Z')) {
          ebtEndStr += '+00:00'
        }
        
        const ebtStartDate = new Date(ebtStartStr)
        const ebtEndDate = new Date(ebtEndStr)
        
        // Check for time overlap: slot starts before external busy time ends AND slot ends after external busy time starts
        const overlaps = slot.startTime < ebtEndDate && slot.endTime > ebtStartDate
        
        if (overlaps) {
          logger.debug('⚠️ Time conflict detected (external busy time):', {
            slot: `${slot.startTime.toLocaleString('de-DE')} - ${slot.endTime.toLocaleString('de-DE')}`,
            externalBusyTime: `${ebtStartDate.toLocaleString('de-DE')} - ${ebtEndDate.toLocaleString('de-DE')}`,
            eventTitle: ebt.event_title,
            syncSource: ebt.sync_source,
            slotISO: `${slot.startTime.toISOString()} - ${slot.endTime.toISOString()}`,
            externalBusyTimeISO: `${ebtStartStr} - ${ebtEndStr}`
          })
        }
        
        return overlaps
      }) || false)
      
      return !hasConflict
    })
    
    const availableCount = availabilityResults.filter(result => result).length
    const conflictCount = availabilityResults.filter(result => !result).length
    logger.debug('✅ Batch availability check complete:', availableCount, 'available,', conflictCount, 'conflicts out of', timeSlots.length, 'total slots')
    
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

// Slot reservation management
const remainingSeconds = ref(600) // 10 minutes countdown
const reservedUntil = ref<Date | null>(null)

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

// Booking notes and other details
const bookingNotes = ref('')

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

const staffCount = computed(() => availableStaff.value.length)

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
  const fmt = (d: Date) => d.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit' })
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
  // Convert UTC to Zurich timezone
  const date = new Date(dateTimeString)
  return date.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateTimeString: string) => {
  // Convert UTC to Zurich timezone
  const date = new Date(dateTimeString)
  return date.toLocaleDateString('de-DE', {
    timeZone: 'Europe/Zurich',
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
    // Ensure we have a tenant
    if (!currentTenant.value) return
    
    logger.debug('🔍 Current tenant:', {
      id: currentTenant.value.id,
      name: currentTenant.value.name,
      slug: currentTenant.value.slug
    })
    
    // Trigger external calendar sync for all staff
    logger.debug('🔄 Triggering external calendar sync...')
    await autoSyncCalendars()
    
    // Load staff categories from locations (available_categories + staff_ids)
    logger.debug('📚 Building staff categories from locations data...')
    
    // Load all tenant locations to build staff category map
    const { data: tenantLocations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, available_categories, staff_ids, is_active, tenant_id')
      .eq('is_active', true)
      .eq('tenant_id', currentTenant.value.id)
    
    logger.debug('📍 Loaded locations:', {
      count: tenantLocations?.length || 0,
      error: locationsError?.message || 'none',
      tenant_id_used: currentTenant.value.id,
      sample: tenantLocations?.slice(0, 2).map((l: any) => ({
        id: l.id,
        name: l.name,
        staff_ids: l.staff_ids,
        categories: l.available_categories,
        is_active: l.is_active
      }))
    })
    
    if (locationsError) {
      console.error('❌ Error loading locations:', locationsError)
    }
    
    // Build a map of staff_id -> [categories] from locations
    const staffCategoryMap = new Map<string, string[]>()
    
    if (tenantLocations) {
      tenantLocations.forEach((location: any) => {
        const availableCategories = location.available_categories || []
        const staffIds = location.staff_ids || []
        
        // Add each category to each staff member at this location
        staffIds.forEach((staffId: string) => {
          if (!staffCategoryMap.has(staffId)) {
            staffCategoryMap.set(staffId, [])
          }
          const staffCategories = staffCategoryMap.get(staffId)!
          // Add categories that aren't already there
          availableCategories.forEach((category: string) => {
            if (!staffCategories.includes(category)) {
              staffCategories.push(category)
            }
          })
        })
      })
    }
    
    logger.debug('📊 Built staff category map from locations:', Object.fromEntries(staffCategoryMap))
    
    // Load full staff data from users table
    const staffIds = Array.from(staffCategoryMap.keys())
    logger.debug('🔍 Loading full staff data for', staffIds.length, 'staff members:', staffIds)
    
    let staffData: any[] = []
    let staffError: any = null
    
    if (staffIds.length > 0) {
      // Try to load staff data
      const result = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, category, is_active')
        .in('id', staffIds)
      
      staffData = result.data || []
      staffError = result.error
      
      logger.debug('📊 Staff query result:', {
        requested_ids: staffIds,
        returned_count: staffData?.length || 0,
        error: staffError?.message || 'none',
        data_sample: staffData?.slice(0, 2)
      })
      
      if (staffError) {
        console.error('❌ Error loading staff data:', staffError)
        // Fallback: Try without filters
        logger.debug('🔄 Trying fallback query without filters...')
        const fallbackResult = await supabase
          .from('users')
          .select('id, first_name, last_name, email, role, category')
          .eq('role', 'staff')
        
        if (fallbackResult.data) {
          staffData = fallbackResult.data.filter((u: any) => staffIds.includes(u.id))
          logger.debug('✅ Fallback query succeeded, found', staffData.length, 'staff')
        }
      }
    }
    
    // Create a map of staff by id for quick lookup
    const staffDataMap = new Map<string, any>()
    staffData?.forEach((staff: any) => {
      staffDataMap.set(staff.id, staff)
    })
    
    // Get all staff that have locations assigned with full data
    const allStaffWithLocations = Array.from(staffCategoryMap.keys()).map(staffId => {
      const fullStaffData = staffDataMap.get(staffId) || {}
      return {
        id: staffId,
        first_name: fullStaffData.first_name || 'Unknown',
        last_name: fullStaffData.last_name || 'Staff',
        email: fullStaffData.email,
        category: fullStaffData.category
      }
    })
    
    // Filter staff who can teach the selected category
    const capableStaff = allStaffWithLocations.filter((staff: any) => {
      const categories = staffCategoryMap.get(staff.id) || []
      return categories.includes(filters.value.category_code)
    })
    
    // Add available_locations array to each staff
    availableStaff.value = capableStaff.map((staff: any) => ({
      ...staff,
      available_locations: []
    }))
    
    logger.debug('✅ Staff for category', filters.value.category_code, ':', availableStaff.value.length)
    logger.debug('🔍 Capable staff:', capableStaff.map((s: any) => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      categories: staffCategoryMap.get(s.id) || [] 
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
    logger.debug('🔄 Loading locations for all staff...')
    
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
            logger.debug(`⏭️ Skipping location ${location.name} for ${staff.first_name} - staff not registered`)
            return false
          }
          
          if (!hasCategory) {
            logger.debug(`⏭️ Skipping location ${location.name} for ${staff.first_name} - category ${filters.value.category_code} not available`)
          }
          
          return hasCategory && isStaffRegistered
        })
        
        logger.debug(`✅ Loaded ${filteredLocations.length}/${staffLocations?.length || 0} locations for ${staff.first_name} ${staff.last_name} (category: ${filters.value.category_code})`)
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
    
    logger.debug('✅ All standard locations loaded for staff')
    
    // Only generate time slots if explicitly requested
    if (generateTimeSlots) {
      logger.debug('🕒 Generating time slots for all staff-location combinations (explicit)')
      await loadTimeSlotsForAllStaff()
    } else {
      logger.debug('⏭️ Skipping time slot generation at category step')
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
    logger.debug('🕒 Loading time slots for all staff-location combinations...')
    
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
    
    logger.debug('✅ All time slots generated')
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
    const slotInterval = 15 // Hardcoded: Always 15 minutes (quarter-hourly slots)
    const bufferMinutes = parseInt(tenantSettings.value.default_buffer_minutes || '15')
    const minAdvanceHours = parseInt(tenantSettings.value.min_advance_booking_hours || '2')
    const maxAdvanceDays = parseInt(tenantSettings.value.max_advance_booking_days || '30')
    
    logger.debug(`🕒 Generating slots for ${staff.first_name} at ${location.name} with settings:`, {
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
      logger.debug(`📅 ${targetDate.toDateString()}: ${dayMode} mode`)
      
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
    
    logger.debug(`✅ Generated ${timeSlots.length} time slots for ${staff.first_name} at ${location.name}`)
  } catch (err) {
    console.error(`❌ Error generating time slots for ${staff.first_name} at ${location.name}:`, err)
  }
}

const loadTimeSlotsForStaffLocation = async (staff: any, location: any) => {
  try {
    // This function is now handled by loadTimeSlotsForAllStaff
    logger.debug('🕒 Time slots already loaded automatically')
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
    const startDate = new Date(firstSlot.start_time).toLocaleDateString('de-DE', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit' })
    const endDate = new Date(lastSlot.start_time).toLocaleDateString('de-DE', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit' })
    
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
  logger.debug('🎯 selectCategory called:', category.code)
  
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
  try {
    logger.debug('🔄 Calling loadStaffForCategory...')
    await loadStaffForCategory()
    logger.debug('✅ loadStaffForCategory completed')
  } catch (err: any) {
    logger.error('❌ loadStaffForCategory failed:', err)
    return
  }
  
  // Get unique locations from staff
  // Build unique locations from all staff, avoiding duplicates
  const locationsMap = new Map<string, any>()
  
  availableStaff.value.forEach((staff: any) => {
    if (staff.available_locations) {
      staff.available_locations.forEach((location: any) => {
        if (!locationsMap.has(location.id)) {
          locationsMap.set(location.id, {
            id: location.id,
            name: location.name,
            address: location.address,
            category_pickup_settings: location.category_pickup_settings || {},
            time_windows: parseTimeWindows(location.time_windows),
            available_staff: []
          })
        }
        // Add staff to this location (avoid duplicates)
        const locationEntry = locationsMap.get(location.id)!
        if (!locationEntry.available_staff.some((s: any) => s.id === staff.id)) {
          locationEntry.available_staff.push(staff)
        }
      })
    }
  })
  
  // Convert map to array
  availableLocations.value = Array.from(locationsMap.values())
  
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
    logger.debug('🔍 Checking pickup for category:', categoryCode)
    logger.debug('📍 Available locations:', availableLocations.value.length)
    
    // Find locations that offer pickup for this category
    const pickupLocations = availableLocations.value.filter((location: any) => {
      const categoryPickupSettings = location.category_pickup_settings || {}
      const hasPickup = categoryPickupSettings[categoryCode]?.enabled === true
      logger.debug(`  Location "${location.name}":`, {
        address: location.address,
        categoryPickupSettings,
        hasPickupForCategory: hasPickup
      })
      return hasPickup
    })
    
    logger.debug('✅ Locations with pickup for', categoryCode, ':', pickupLocations.length)
    
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
      
      logger.debug(`🚗 Checking location "${location.name}":`)
      logger.debug(`  Max radius: ${maxRadius} min`)
      
      // Extract PLZ from location address (assuming format "Street, PLZ City")
      const locationPLZ = extractPLZFromAddress(location.address)
      
      if (!locationPLZ) {
        console.warn(`⚠️ Could not extract PLZ from location address: ${location.address}`)
        continue
      }
      
      logger.debug(`  Location PLZ: ${locationPLZ}, Customer PLZ: ${pickupPLZ.value}`)
      
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
      
      logger.debug(`  Travel time: ${response.travelTime} min (max: ${maxRadius} min)`)
      
      if (response.travelTime !== null && response.travelTime !== undefined && response.travelTime <= maxRadius) {
        logger.debug(`  ✅ Within radius!`)
        if (response.travelTime < shortestTime) {
          shortestTime = response.travelTime
          closestLocation = {
            ...location,
            travelTime: response.travelTime,
            maxRadius
          }
        }
      } else {
        logger.debug(`  ❌ Outside radius (${response.travelTime} > ${maxRadius})`)
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

// ❌ REMOVED: Old generateTimeSlotsForSpecificCombination (replaced with secure API)
// New implementation uses pre-computed slots from availability_slots table

const generateTimeSlotsForSpecificCombination = async () => {
  try {
    isLoadingTimeSlots.value = true
    error.value = null
    
    logger.debug('🔄 Fetching available slots via secure API...')
    
    // Calculate date range (next 4 weeks, matching old behavior)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 28) // 4 weeks
    
    // Validate required filters
    if (!selectedInstructor.value?.id || !selectedLocation.value?.id || !selectedCategory.value?.code) {
      error.value = 'Bitte wählen Sie zuerst Kategorie, Dauer, und Standort aus.'
      isLoadingTimeSlots.value = false
      return
    }
    
    // Get duration (handle array format from old code)
    const duration = Array.isArray(filters.value.duration_minutes) 
      ? filters.value.duration_minutes[0] || 45 
      : filters.value.duration_minutes || 45
    
    // Fetch slots from secure API
    const slots = await fetchAvailableSlots({
      tenant_id: currentTenant.value?.id || '',
      staff_id: selectedInstructor.value.id,
      location_id: selectedLocation.value.id,
      category_code: selectedCategory.value.code,
      duration_minutes: duration,
      start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      end_date: endDate.toISOString().split('T')[0]
    })
    
    logger.debug('✅ Fetched', slots.length, 'pre-computed slots from API')
    
    // Convert to format expected by UI
    const timeSlots = slots.map(slot => {
      const slotStartDate = new Date(slot.start_time)
      const slotEndDate = new Date(slot.end_time)
      
      // Calculate week number (1-4)
      const weeksDiff = Math.floor((slotStartDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      
      return {
        id: slot.id,
        staff_id: slot.staff_id,
        staff_name: slot.staff_name,
        location_id: slot.location_id,
        location_name: slot.location_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        is_available: true, // Already filtered by API
        week_number: Math.max(1, Math.min(4, weeksDiff + 1)),
        day_name: slotStartDate.toLocaleDateString('de-DE', { weekday: 'long' }),
        date_formatted: slotStartDate.toLocaleDateString('de-DE'),
        time_formatted: slotStartDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        category_code: slot.category_code
      }
    })
    
    logger.debug(`✅ Converted ${timeSlots.length} slots for UI display`)
    
    // Store globally for UI
    availableTimeSlots.value = timeSlots
    
  } catch (err: any) {
    logger.error('❌ Error fetching slots:', err)
    error.value = err.message || 'Fehler beim Laden der Verfügbarkeit'
  } finally {
    isLoadingTimeSlots.value = false
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
      
      logger.debug('✅ Address selected:', pickupAddressDetails.value)
    })
    
    logger.debug('✅ Google Places Autocomplete initialized')
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
const showSuccessModal = ref(false)
const successMessage = ref({
  title: 'Termin erfolgreich gebucht!',
  description: 'Dein Termin wurde bestätigt und die Zahlung verarbeitet.'
})

// Confirm booking
const confirmBooking = async () => {
  try {
    logger.debug('🎯 Starting booking confirmation...')
    
    // Step 1: Check if user is authenticated
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      logger.debug('ℹ️ User not authenticated, showing registration modal')
      loginModalTab.value = 'register' // Show registration tab
      showLoginModal.value = true
      return
    }
    
    logger.debug('✅ User authenticated:', user.id)
    
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
    
    logger.debug('✅ User data loaded:', userData)
    
    // Step 3: Check document requirements for category
    const categoryRequirements = selectedCategory.value.document_requirements
    
    if (categoryRequirements) {
      const requirements = typeof categoryRequirements === 'string' 
        ? JSON.parse(categoryRequirements) 
        : categoryRequirements
      
      const requiredDocs = requirements.required || []
      const alwaysRequired = requiredDocs.filter((doc: any) => doc.when_required === 'always')
      
      if (alwaysRequired.length > 0) {
        logger.debug('📄 Category requires documents:', alwaysRequired)
        
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
          logger.debug('❌ Missing documents:', missingDocs)
          requiredDocuments.value = missingDocs
          showDocumentUploadModal.value = true
          return
        }
        
        logger.debug('✅ All required documents present')
      }
    }
    
    // Step 4: Create appointment via secure API
    const appointmentResult = await createAppointmentSecure(userData)
    
    if (appointmentResult.payment_required) {
      // Handle payment flow if needed
      logger.debug('💳 Payment required for appointment:', appointmentResult.appointment_id)
    } else {
      // Show success
      logger.debug('✅ Appointment booked successfully (no payment required)')
    }
    
  } catch (error: any) {
    console.error('Error confirming booking:', error)
    isCreatingBooking.value = false
    alert(`Fehler bei der Buchung: ${error?.message || error?.data?.message || 'Bitte versuchen Sie es erneut.'}`)
  }
}

// Create appointment in database
const createAppointmentSecure = async (userData: any) => {
  isCreatingBooking.value = true
  
  try {
    logger.debug('📅 Creating appointment via secure API...')
    
    // Get auth token
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Bitte melden Sie sich an um fortzufahren.')
    }
    
    if (!reservedSlotId.value) {
      throw new Error('Slot-Reservierung abgelaufen. Bitte wählen Sie erneut einen Zeitslot.')
    }
    
    // Use the new composable's createAppointment method
    const response = await createAppointment(
      {
        slot_id: reservedSlotId.value,
        session_id: sessionId.value,
        appointment_type: 'lesson',
        category_code: selectedCategory.value?.code || '',
        notes: bookingNotes.value || undefined
      },
      session.access_token
    )
    
    logger.debug('✅ Appointment created:', response.appointment.id)
    
    // Clear reservation
    reservedSlotId.value = null
    reservationExpiry.value = null
    if (countdownInterval) {
      clearInterval(countdownInterval)
    }
    
    // Return appointment ID for further processing
    return {
      success: true,
      appointment_id: response.appointment.id,
      payment_required: response.payment_required
    }
    
  } catch (err: any) {
    logger.error('❌ Appointment creation failed:', err)
    
    if (err.statusCode === 409) {
      // Reservation expired
      error.value = 'Ihre Reservierung ist abgelaufen. Bitte wählen Sie erneut einen Zeitslot.'
      // Go back to slot selection
      currentStep.value = 4
    } else {
      error.value = err.statusMessage || 'Buchung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
    
    throw err
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

// Auto-scroll steps bar when current step changes
watch(() => currentStep.value, (newStep: number) => {
  // Always scroll on small screens, optionally on large screens too
  if (isScreenSmall.value || true) { // Changed: always scroll to keep current step visible
    nextTick(() => {
      scrollToStep(newStep)
    })
  }
})

// Reservation functions - UPDATED to use new secure API
const reserveSlotSecure = async (userId?: string) => {
  if (!selectedSlot.value) {
    console.warn('⚠️ No slot selected')
    return false
  }
  
  try {
    isLoading.value = true
    logger.debug('🔒 Reserving slot via secure API...', selectedSlot.value.id)
    
    // Use the new composable's reserveSlot method
    const reservation = await reserveSlot({
      slot_id: selectedSlot.value.id,
      session_id: sessionId.value
    })
    
    if (reservation.success) {
      logger.debug('✅ Slot reserved:', reservation.slot.reserved_until)
      reservedSlotId.value = selectedSlot.value.id
      reservationExpiry.value = new Date(reservation.slot.reserved_until)
      startCountdown()
      return true
    } else {
      console.error('❌ Reservation failed')
      return false
    }
  } catch (error: any) {
    console.error('❌ Error reserving slot:', error)
    
    if (error.statusCode === 409) {
      // Slot already taken
      error.value = 'Dieser Zeitslot ist leider nicht mehr verfügbar. Bitte wählen Sie einen anderen.'
      // Refresh slots
      await generateTimeSlotsForSpecificCombination()
    } else {
      error.value = error.statusMessage || 'Reservierung fehlgeschlagen'
    }
    return false
  } finally {
    isLoading.value = false
  }
}

// Keep old function name for backwards compatibility
const reserveSlot_OLD = reserveSlotSecure

const cancelReservation = async (silent: boolean = false) => {
  if (!currentReservationId.value) return

  try {
    logger.debug('🗑️ Cancelling reservation...')
    
    await $fetch('/api/booking/cancel-reservation', {
      method: 'POST',
      body: {
        reservation_id: currentReservationId.value
      }
    })

    logger.debug('✅ Reservation cancelled')
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
      logger.debug('⏰ Reservation expired')
      // Cancel silently - just clean up state
      await cancelReservation(true)
      // Notify user without alert - just go back
      logger.debug('🔄 Going back to step 5 due to reservation expiry')
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
      logger.debug('🔍 Tenant not found by slug, trying by ID:', slugOrId)
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
    
    logger.debug('✅ Tenant set from slug/ID:', tenantData?.name)
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
    logger.debug('✅ Tenant settings loaded:', settings)
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
      logger.debug('🚫 No current tenant selected')
      categories.value = []
      return
    }

    // Only load categories if business_type is driving_school
    if (currentTenant.value.business_type !== 'driving_school') {
      logger.debug('🚫 Categories not available for business_type:', currentTenant.value.business_type)
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
    // Get Zurich offset
    const getZurichOffsetMs = (date: Date): number => {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Zurich',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0))
      const zurichTimeStr = formatter.format(utcMidnight)
      const match = zurichTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
      if (!match) return 0
      
      const [, , , , hour, min] = match
      const zurichMinutesFromMidnight = (parseInt(hour) * 60) + parseInt(min)
      return zurichMinutesFromMidnight * 60 * 1000
    }
    
    const offsetMs = getZurichOffsetMs(targetDate)
    
    // Convert local day boundaries to UTC
    const dayStartLocal = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0))
    const dayStartUtc = new Date(dayStartLocal.getTime() - offsetMs)
    
    const dayEndLocal = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999))
    const dayEndUtc = new Date(dayEndLocal.getTime() - offsetMs)
    
    // Check for appointments on this day
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, location_id')
      .eq('staff_id', staffId)
      .eq('status', 'scheduled')
      .is('deleted_at', null)
      .gte('start_time', dayStartUtc.toISOString())
      .lte('end_time', dayEndUtc.toISOString())
    
    // Check for external busy times on this day
    const { data: externalBusy } = await supabase
      .from('external_busy_times')
      .select('id')
      .eq('staff_id', staffId)
      .gte('start_time', dayStartUtc.toISOString())
      .lte('end_time', dayEndUtc.toISOString())
    
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
  
  // Helper function to get Zurich offset in milliseconds
  const getZurichOffsetMs = (date: Date): number => {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Zurich',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0))
    const zurichTimeStr = formatter.format(utcMidnight)
    
    // Parse "YYYY-MM-DD HH:MM:SS"
    const match = zurichTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
    if (!match) return 0
    
    const [, , , , hour, min, sec] = match
    const zurichMinutesFromMidnight = (parseInt(hour) * 60) + parseInt(min)
    const offsetMinutes = zurichMinutesFromMidnight // This is the offset from UTC
    
    return offsetMinutes * 60 * 1000
  }
  
  // Generate slots in intervals
  for (let timeMinutes = startTimeMinutes; timeMinutes < endTimeMinutes; timeMinutes += slotInterval) {
    const hours = Math.floor(timeMinutes / 60)
    const mins = timeMinutes % 60
    
    // Create the slot time as if it were UTC (we'll adjust after)
    const tempDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hours, mins, 0, 0))
    
    // Get the Zurich offset for this date
    const offsetMs = getZurichOffsetMs(targetDate)
    
    // The slot time in Zurich minus offset = UTC time
    const slotTimeUtc = new Date(tempDate.getTime() - offsetMs)
    
    // Skip if slot is in the past
    if (slotTimeUtc < new Date()) continue
    
    const duration = Array.isArray(filters.value.duration_minutes) 
      ? filters.value.duration_minutes[0] || 45 
      : filters.value.duration_minutes || 45
    
    const endTimeUtc = new Date(slotTimeUtc.getTime() + duration * 60000)
    
    // For display, convert back to Zurich time
    const slotTimeLocal = new Date(slotTimeUtc.getTime() + offsetMs)
    
    slots.push({
      id: `${staff.id}-${location.id}-${slotTimeUtc.getTime()}`,
      staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      location_id: location.id,
      location_name: location.name,
      start_time: slotTimeUtc.toISOString(),
      end_time: endTimeUtc.toISOString(),
      duration_minutes: duration,
      is_available: true,
      week_number: Math.ceil((targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
      day_name: slotTimeLocal.toLocaleDateString('de-DE', { weekday: 'long' }),
      date_formatted: slotTimeLocal.toLocaleDateString('de-DE'),
      time_formatted: slotTimeLocal.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    })
  }
  
  return slots
}

const generateConstrainedSlots = async (staff: any, location: any, targetDate: Date, workingStart: string, workingEnd: string, slotInterval: number, bufferMinutes: number) => {
  const slots: any[] = []
  
  try {
    // Get Zurich offset
    const getZurichOffsetMs = (date: Date): number => {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Zurich',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0))
      const zurichTimeStr = formatter.format(utcMidnight)
      const match = zurichTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
      if (!match) return 0
      
      const [, , , , hour, min] = match
      const zurichMinutesFromMidnight = (parseInt(hour) * 60) + parseInt(min)
      return zurichMinutesFromMidnight * 60 * 1000
    }
    
    const offsetMs = getZurichOffsetMs(targetDate)
    
    // Convert local day boundaries to UTC for database queries
    const dayStartLocal = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0))
    const dayStartUtc = new Date(dayStartLocal.getTime() - offsetMs)
    
    const dayEndLocal = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999))
    const dayEndUtc = new Date(dayEndLocal.getTime() - offsetMs)
    
    // Get appointments for this staff on this day at this location
    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('staff_id', staff.id)
      .eq('location_id', location.id)
      .eq('status', 'scheduled')
      .is('deleted_at', null)
      .gte('start_time', dayStartUtc.toISOString())
      .lte('end_time', dayEndUtc.toISOString())
      .order('start_time')
    
    // Get external busy times for this staff on this day
    const { data: externalBusy } = await supabase
      .from('external_busy_times')
      .select('start_time, end_time')
      .eq('staff_id', staff.id)
      .gte('start_time', dayStartUtc.toISOString())
      .lte('end_time', dayEndUtc.toISOString())
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
  
  // Get Zurich offset
  const getZurichOffsetMs = (date: Date): number => {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Zurich',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const utcMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0))
    const zurichTimeStr = formatter.format(utcMidnight)
    const match = zurichTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
    if (!match) return 0
    
    const [, , , , hour, min] = match
    const zurichMinutesFromMidnight = (parseInt(hour) * 60) + parseInt(min)
    return zurichMinutesFromMidnight * 60 * 1000
  }
  
  const offsetMs = getZurichOffsetMs(targetDate)
  
  // startTime and endTime are in LOCAL time (Zurich), convert to UTC for iteration
  const startTimeUtc = new Date(startTime.getTime() - offsetMs)
  const endTimeUtc = new Date(endTime.getTime() - offsetMs)
  
  const slotIntervalMs = slotInterval * 60000
  const duration = Array.isArray(filters.value.duration_minutes) 
    ? filters.value.duration_minutes[0] || 45 
    : filters.value.duration_minutes || 45
  
  for (let time = startTimeUtc.getTime(); time < endTimeUtc.getTime(); time += slotIntervalMs) {
    const slotTimeUtc = new Date(time)
    const slotEndTimeUtc = new Date(time + duration * 60000)
    
    // Skip if slot is in the past
    if (slotTimeUtc < new Date()) continue
    
    // Skip if slot doesn't fit in range
    if (slotEndTimeUtc.getTime() > endTimeUtc.getTime()) continue
    
    // For display, convert back to local time
    const slotTimeLocal = new Date(slotTimeUtc.getTime() + offsetMs)
    
    slots.push({
      id: `${staff.id}-${location.id}-${slotTimeUtc.getTime()}`,
      staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      location_id: location.id,
      location_name: location.name,
      start_time: slotTimeUtc.toISOString(),
      end_time: slotEndTimeUtc.toISOString(),
      duration_minutes: duration,
      is_available: true,
      week_number: Math.ceil((targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1,
      day_name: slotTimeLocal.toLocaleDateString('de-DE', { weekday: 'long' }),
      date_formatted: slotTimeLocal.toLocaleDateString('de-DE'),
      time_formatted: slotTimeLocal.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    })
  }
  
  return slots
}

// Lifecycle
onMounted(async () => {
  logger.debug('🎯 onMounted called!')
  try {
    // Check screen size for responsive step scrolling
    const checkScreenSize = () => {
      isScreenSmall.value = window.innerWidth < 1000
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    // Load referrer URL from query parameter
    logger.debug('🔍 Route query params:', route.query)
    logger.debug('🔍 Route full URL:', window.location.href)
    const refParam = route.query.referrer as string
    logger.debug('🔍 Referrer param value:', refParam)
    if (refParam) {
      referrerUrl.value = refParam
      logger.debug('🔄 Referrer URL set:', referrerUrl.value)
    } else {
      logger.debug('⚠️ No referrer parameter found')
    }
    
    // Lade Features um Prüfung durchführen zu können
    await loadFeatures()
    
    // Nur Tenant laden wenn Online-Buchung aktiviert ist
    if (isOnlineBookingEnabled.value) {
      const slug = route.params.slug as string
      
      if (slug) {
        // Set the tenant from slug
        await setTenantFromSlug(slug)
        logger.debug('✅ Tenant set from slug:', slug)
        
        // Load categories for all visitors (not just prefill)
        await loadCategories()
        logger.debug('✅ Categories loaded:', categories.value.length)
        
        // Check for pre-fill parameters (from returning customer)
        const prefill = route.query.prefill as string
        if (prefill === 'true' && route.query.category && route.query.staff && route.query.location && route.query.duration) {
          logger.debug('🎯 Pre-filling booking from previous appointment:', {
            category: route.query.category,
            staff: route.query.staff,
            location: route.query.location,
            duration: route.query.duration
          })
          
          // Categories are already loaded above
          const categoryToSelect = categories.value.find(c => c.code === route.query.category)
          
          if (categoryToSelect) {
            // Pre-select category (this loads staff and locations)
            await selectCategory(categoryToSelect)
            
            // Wait a bit for data to load
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Pre-select duration
            const durationValue = parseInt(route.query.duration as string)
            if (durationOptions.value.includes(durationValue)) {
              selectedDuration.value = durationValue
              filters.value.duration_minutes = durationValue
            }
            
            // Pre-select location
            const locationToSelect = availableLocations.value.find(l => l.id === route.query.location)
            if (locationToSelect) {
              selectedLocation.value = locationToSelect
              
              // Filter instructors for this location
              availableInstructors.value = locationToSelect.available_staff || []
              
              // Pre-select instructor
              const instructorToSelect = availableInstructors.value.find(i => i.id === route.query.staff)
              if (instructorToSelect) {
                // Call the actual selectInstructor to load time slots
                await selectInstructor(instructorToSelect)
                
                logger.debug('✅ Pre-filled all data, jumped to step 5 (time selection)')
              } else {
                console.warn('⚠️ Instructor not found, staying at step 3')
                currentStep.value = 3
              }
            } else {
              console.warn('⚠️ Location not found, staying at step 2')
              currentStep.value = 2
            }
          }
        } else if (prefill === 'partial' && route.query.category) {
          logger.debug('🎯 Partial pre-fill: category and/or staff')
          
          // Categories are already loaded above
          const categoryToSelect = categories.value.find(c => c.code === route.query.category)
          
          if (categoryToSelect) {
            // Pre-select category
            await selectCategory(categoryToSelect)
            currentStep.value = 2
            logger.debug('✅ Pre-selected category, user can continue from step 2')
          }
        }
      } else {
        console.error('❌ No tenant slug provided in URL')
      }
    }
    
    logger.debug('✅ Availability page loaded')
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
