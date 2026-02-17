<template>
  <div class="min-h-screen bg-gray-50 py-4">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-4 flex items-center justify-between gap-4">
        <button 
          v-if="currentStep > 0"
          @click="handleBackButton"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg shadow hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          ← Zurück
        </button>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Fahrstunde buchen</h1>
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

        <!-- Step 1: Main Category Selection -->
        <div v-if="currentStep === 1" class="space-y-4">
          <!-- Main Category Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Wähle deine Hauptkategorie</h2>
              <div class="mt-2 text-xs sm:text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedMainCategory?.name }}</span>
              </div>
            </div>
          
          <!-- Show only main categories (where parent_category_id is null) -->
          <div :class="`grid ${getGridClasses(categories.length)} gap-3`">
            <div 
              v-for="mainCategory in categories.filter((c: any) => !c.parent_category_id)" 
              :key="mainCategory.id"
              @click="selectMainCategory(mainCategory)"
              class="group cursor-pointer rounded-2xl p-3 sm:p-4 md:p-6 transition-all duration-200 transform active:translate-y-0.5"
              :style="getInteractiveCardStyle(
                selectedMainCategory?.id === mainCategory.id || hoveredCategoryId === mainCategory.id,
                hoveredCategoryId === mainCategory.id
              )"
              @mouseenter="hoveredCategoryId = mainCategory.id"
              @mouseleave="hoveredCategoryId = null"
            >
              <div class="text-center pt-2 sm:pt-3 md:pt-4">
                <!-- SVG Icon without circle background -->
                <div v-if="mainCategory.icon_svg" class="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5">
                  <div class="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 [&>svg]:w-full [&>svg]:h-full" v-html="mainCategory.icon_svg"></div>
                </div>
                <!-- Fallback: code letter with circle -->
                <div v-else class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5 transition-colors border"
                     :style="getInteractiveBadgeStyle(
                       selectedMainCategory?.id === mainCategory.id || hoveredCategoryId === mainCategory.id
                     )">
                  <span class="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{{ mainCategory.code }}</span>
                </div>
                <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{{ mainCategory.name }}</h3>
                <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{{ mainCategory.description }}</p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Step 2: Subcategory Selection -->
        <div v-if="currentStep === 2 && selectedMainCategory" class="space-y-4">
          <!-- Subcategory Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Wähle deine Unterkategorie</h2>
              <div class="mt-2 text-xs sm:text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedMainCategory?.name }}</span>
                <span v-if="selectedCategory" class="font-semibold"> • {{ selectedCategory?.name }}</span>
              </div>
            </div>

            <!-- Show only subcategories for selected main category -->
            <div :class="`grid ${getGridClasses(selectedMainCategory?.children?.length || 1)} gap-3`">
            <div 
              v-for="subCategory in selectedMainCategory?.children || []" 
              :key="subCategory.id"
              @click="selectSubcategory(subCategory)"
              class="group cursor-pointer rounded-2xl p-3 sm:p-4 md:p-6 transition-all duration-200 transform active:translate-y-0.5"
              :style="getInteractiveCardStyle(
                selectedCategory?.id === subCategory.id || hoveredCategoryId === subCategory.id,
                hoveredCategoryId === subCategory.id
              )"
              @mouseenter="hoveredCategoryId = subCategory.id"
              @mouseleave="hoveredCategoryId = null"
            >
              <div class="text-center pt-2 sm:pt-3 md:pt-4">
                <!-- SVG Icon without circle background -->
                <div v-if="subCategory.icon_svg" class="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5">
                  <div class="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 [&>svg]:w-full [&>svg]:h-full" v-html="subCategory.icon_svg"></div>
                </div>
                <!-- Fallback: code letter with full-width underline -->
                <div v-else class="mx-auto mb-3 sm:mb-4 md:mb-5">
                  <div class="flex justify-center" :style="{ borderBottomWidth: '2px', borderBottomColor: getBrandPrimary() }">
                    <span class="text-base sm:text-lg md:text-xl font-bold px-3 sm:px-4 md:px-5 pb-2" :style="{ color: getBrandPrimary() }">{{ subCategory.code }}</span>
                  </div>
                </div>
                <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{{ subCategory.name }}</h3>
                <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{{ subCategory.description }}</p>
              </div>
            </div>
          </div>

          <div v-if="!selectedMainCategory?.children?.length" class="text-center py-6">
            <p class="text-sm text-gray-600">Für diese Kategorie sind noch keine Unterkategorien verfügbar.</p>
          </div>
          </div>
        </div>

        <!-- Step 3: Lesson Duration Selection -->
        <div v-if="currentStep === 3" class="space-y-4">
          <!-- Duration Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
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
                  <div v-if="durationPrices.get(duration)" class="mt-2 text-sm font-semibold" :style="{ color: getBrandPrimary() }">
                    CHF {{ durationPrices.get(duration)?.price_chf }}
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
        <div v-if="currentStep === 4" class="space-y-4">
          <!-- Location Selection Card -->
          <div class="bg-white shadow rounded-lg p-4 sm:p-6">
            <div class="text-center mb-6">
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
                v-for="location in displayableLocations" 
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
        <div v-if="currentStep === 5" class="space-y-4">
          <!-- Instructor Selection Card -->
          <div class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wähle deinen Fahrlehrer</h2>
              <div class="mt-2 text-sm" :style="{ color: getBrandPrimary() }">
                <span class="font-semibold">{{ selectedCategory?.name }}</span>
                <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
                <span v-if="selectedLocation" class="font-semibold"> • {{ selectedLocation?.name }}</span>
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
              <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900">
                {{ instructor.first_name }} {{ instructor.last_name }}
              </h3>
            </div>
          </div>
          </div>
        </div>

        <!-- Step 5: Time Slot Selection -->
        <div v-if="currentStep === 6" class="space-y-4">
          <!-- Time Slot Selection Card - only show header if slots are available AND not showing proposal form -->
          <div v-if="(isLoadingTimeSlots || availableTimeSlots.length > 0) && !showProposalFormManually" class="bg-white shadow rounded-lg p-4">
            <div class="text-center mb-6">
              <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wähle deinen Termin</h2>
              
              <!-- Countdown Timer (wenn Termin reserviert) -->
            </div>
            <div v-if="currentReservationId" class="max-w-2xl mx-auto mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-blue-900">Termin reserviert</span>
                <div class="text-lg font-bold" :style="{ color: remainingSeconds < 60 ? '#dc2626' : getBrandPrimary() }">
                  {{ getCountdownText }}
                </div>
              </div>
              <p class="text-xs text-blue-700 mt-2">Ihre Reservation läuft in {{ getCountdownText }} ab.</p>
            </div>
          </div>
          
          <!-- Summary Info - Show between steps and content -->
          <div v-if="currentStep === 6" class="mt-4 mb-6 text-center">
            <div class="text-sm" :style="{ color: getBrandPrimary() }">
              <span class="font-semibold">{{ selectedCategory?.name }}</span>
              <span v-if="selectedDuration" class="font-semibold"> • {{ selectedDuration }} Min.</span>
              <span v-if="selectedLocation" class="font-semibold"> • {{ selectedLocation?.name }}</span>
            </div>
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
          <div v-else-if="availableTimeSlots.length > 0 && !showProposalFormManually" class="space-y-6">
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
                  :disabled="!slot.is_available || slot.reserved_by_session || slot.has_conflict"
                  class="px-2 sm:px-3 md:px-4 py-2 sm:py:3 text-xs sm:text-sm rounded-xl transition-all duration-200 transform active:translate-y-0.5 disabled:cursor-not-allowed"
                  :style="getSlotCardStyle(
                    slot,
                    selectedSlot?.id === slot.id || hoveredSlotId === slot.id,
                    hoveredSlotId === slot.id
                  )"
                  :title="slot.conflict_reason || (slot.has_conflict ? 'Nicht verfügbar' : '')"
                  @mouseenter="hoveredSlotId = slot.id"
                  @mouseleave="hoveredSlotId = null"
                >
                  <div class="font-medium text-xs sm:text-sm text-gray-900">{{ slot.time_formatted }}</div>
                  <div class="text-xs text-gray-600">{{ slot.duration_minutes }} Min.</div>
                  <div v-if="slot.has_conflict" class="text-xs text-red-600 mt-1">⚠️ Nicht verfügbar</div>
                </button>
              </div>
            </div>
            
            <!-- NEW: Button to show proposal form if no suitable slots -->
            <div class="mt-6 text-center">
              <button
                @click="showProposalFormManually = true"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow hover:bg-blue-100 transition-colors"
              >
                Keinen passenden Termin gefunden? Vorschlag machen!
              </button>
            </div>

          </div>
          
          <!-- No Available Slots - Show Proposal Form -->
          <div v-else>
            <BookingProposalForm
              :tenant_id="currentTenant?.id"
              :category="selectedCategory"
              :duration_minutes="selectedDuration || 45"
              :location="selectedLocation"
              :staff="selectedInstructor"
              @submitted="handleProposalSubmitted"
            />
          </div>
          
          <div class="mt-6 text-center">
          </div>
        </div>

        <!-- Step 6: Pickup Address (nur wenn Pickup gewählt) -->
        <div v-if="currentStep === 7 && selectedLocation?.isPickup" class="space-y-4">
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
        <div v-if="currentStep === 7 && !selectedLocation?.isPickup" class="space-y-4">
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

  <!-- Step 9: Proposal Confirmation -->
  <div v-if="currentStep === 9" class="max-w-3xl mx-auto px-4 py-8">
    <div class="space-y-4">
      <!-- Confirmation Card -->
      <div class="bg-white shadow rounded-lg p-6 sm:p-8">
        <div class="text-center mb-8">
          <!-- Success Icon -->
          <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Anfrage erfolgreich eingereicht!</h2>
          <p class="text-gray-600 mb-2">Vielen Dank für deine Anfrage</p>
          <p class="text-sm text-gray-500">Proposal-ID: {{ currentReservationId }}</p>
        </div>

        <!-- Message -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p class="text-blue-900 text-center">
            ✅ Wir haben deine bevorzugten Zeitfenster erhalten. Unser Team wird dich in Kürze kontaktieren, um einen passenden Termin zu vereinbaren.
          </p>
        </div>

        <!-- Booking Summary -->
        <div class="space-y-4 bg-gray-50 rounded-lg p-6 mb-6">
          <div class="border-b border-gray-200 pb-4">
            <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Kategorie</p>
            <p class="text-lg font-medium text-gray-900">{{ selectedCategory?.name }}</p>
          </div>
          <div class="border-b border-gray-200 pb-4">
            <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Standort</p>
            <p class="text-lg font-medium text-gray-900">{{ selectedLocation?.name }}</p>
            <p v-if="selectedLocation?.address" class="text-sm text-gray-600 mt-1">{{ selectedLocation?.address }}</p>
          </div>
          <div class="border-b border-gray-200 pb-4">
            <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Fahrlehrer</p>
            <p class="text-lg font-medium text-gray-900">{{ selectedInstructor?.first_name }} {{ selectedInstructor?.last_name }}</p>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Dauer</p>
            <p class="text-lg font-medium text-gray-900">{{ selectedDuration }} Minuten</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3 sm:flex sm:gap-3 sm:space-y-0">
          <button
            @click="currentStep = 0"
            class="flex-1 px-4 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Neue Anfrage
          </button>
          <button
            @click="showLoginModal = true"
            :style="{ backgroundColor: getBrandPrimary() }"
            class="flex-1 px-4 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Anmelden / Registrieren →
          </button>
        </div>
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
import { useCustomerConflictCheck } from '~/composables/useCustomerConflictCheck'
import LoginRegisterModal from '~/components/booking/LoginRegisterModal.vue'
import DocumentUploadModal from '~/components/booking/DocumentUploadModal.vue'
import BookingProposalForm from '~/components/BookingProposalForm.vue'
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
const remainingSeconds = ref(300) // 5 minutes in seconds
const countdownInterval = ref<NodeJS.Timeout | null>(null)

const { autoSyncCalendars } = useExternalCalendarSync()

const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

const route = useRoute()

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
    
    // Removed 8+ direct Supabase queries and consolidated into single API call
    
    // Load all availability data via comprehensive API endpoint
    let externalBusyTimes: any[] = []
    let workingHoursFromAPI: any[] = []
    let appointmentsFromAPI: any[] = []
    
    try {
      const response = await $fetch('/api/booking/get-availability', {
        method: 'POST',
        body: {
          tenant_id: currentTenant.value?.id,
          staff_id: staffId,
          start_date: minDate.toISOString(),
          end_date: maxDate.toISOString(),
          action: 'get-availability-data'
        }
      }) as any

      if (response?.success) {
        externalBusyTimes = response.data.external_busy_times || []
        workingHoursFromAPI = response.data.working_hours || []
        appointmentsFromAPI = response.data.appointments || []
        logger.debug('✅ Fetched availability data via API:', {
          external_busy_times: externalBusyTimes.length,
          working_hours: workingHoursFromAPI.length,
          appointments: appointmentsFromAPI.length
        })
      } else {
        console.warn('⚠️ Error fetching availability data:', response?.message)
      }
    } catch (err) {
      console.error('❌ Error calling get-availability API:', err)
    }
    
    const finalWorkingHours = workingHoursFromAPI || []
    const finalAppointments = appointmentsFromAPI || []
    
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

// New flow state
const currentStep = ref(1)
const showProposalFormManually = ref(false) // Manually trigger proposal form even if slots exist
const selectedMainCategory = ref<any>(null)  // NEW: Main category (B Auto, A Auto)
const selectedCategory = ref<any>(null)      // CHANGED: Now represents selected subcategory
const selectedLocation = ref<any>(null)
const selectedInstructor = ref<any>(null)
const availableLocations = ref<any[]>([])
const availableInstructors = ref<any[]>([])
const availableTimeSlots = ref<any[]>([])
const durationOptions = ref<number[]>([])
const selectedDuration = ref<number | null>(null)
const durationPrices = ref<Map<number, { price_rappen: number; price_chf: string }>>(new Map()) // Price per duration
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

// Display locations - show ALL available locations with their staff
const displayableLocations = computed(() => {
  if (!availableLocations.value) return []
  
  logger.debug('🔍 displayableLocations computed called', {
    availableLocationsCount: availableLocations.value?.length || 0
  })

  // Filter locations: show if has available staff
  const filtered = availableLocations.value.filter((loc: any) => {
    logger.debug(`  📍 Checking location: ${loc.name}`, {
      availableStaffCount: loc.available_staff?.length || 0,
      hasStaffOnlineBookable: !!loc.staffOnlineBookable,
      staffOnlineBookableLength: loc.staffOnlineBookable?.length || 0
    })

    // Show location if it has available staff
    if (!loc.available_staff || loc.available_staff.length === 0) {
      logger.debug(`    ❌ FILTERED OUT: No available staff for this location`)
      return false
    }

    logger.debug(`    ✅ KEEPING: Location has ${loc.available_staff.length} available staff`)
    return true
  })

  logger.debug(`📊 displayableLocations result: ${filtered.length}/${availableLocations.value.length}`)
  return filtered
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
    { id: 1, label: 'Hauptkat.' },
    { id: 2, label: 'Unterkat.' },
    { id: 3, label: 'Dauer' },
    { id: 4, label: 'Standort' },
    { id: 5, label: 'Fahrlehrer' },
    { id: 6, label: 'Termin' },
    { 
      id: 7, 
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
      slots: slots // Show both available AND reserved slots
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
  if (!canSearch.value || !currentTenant.value) return
  
  hasSearched.value = true
  lastSearchTime.value = new Date().toLocaleTimeString('de-DE')
  
  try {
    logger.debug('🔄 Loading staff via secure API...')
    
    const response = await fetch('/api/booking/get-locations-and-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: currentTenant.value.id,
        category_code: filters.value.category_code
      })
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.message || 'API error')

    logger.debug('✅ API:', data.staff_count, 'staff,', data.location_count, 'locations')

    // Build staff with their locations
    const staffMap = new Map<string, any>()
    data.locations.forEach((loc: any) => {
      loc.available_staff?.forEach((s: any) => {
        if (!staffMap.has(s.id)) {
          staffMap.set(s.id, { ...s, available_locations: [] })
        }
        staffMap.get(s.id)!.available_locations.push(loc)
      })
    })
    availableStaff.value = Array.from(staffMap.values())
    
  } catch (err: any) {
    logger.error('❌ loadStaffForCategory:', err)
    error.value = 'Fehler beim Laden der Fahrlehrer'
  }
}

const loadLocationsForAllStaff = async (generateTimeSlots: boolean = false) => {
  try {
    isLoadingLocations.value = true
    logger.debug('🔄 Loading ALL standard locations for category via API...')
    
    // ✅ Use get-staff-for-category action which returns ALL locations with staff_ids
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        tenant_id: currentTenant.value?.id,
        staff_id: 'placeholder', // Not used for this action
        action: 'get-staff-for-category',
        category_code: filters.value.category_code
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to load locations')
    }

    const allLocations = response.locations || []
    logger.debug(`📍 API returned ${allLocations.length} total locations`)
    
    // ✅ Filter ALL locations for the category
    const categoryLocations = (allLocations || []).filter((location: any) => {
      // Check if category is available
      const availableCategories = location.available_categories || []
      const hasCategory = availableCategories.includes(filters.value.category_code)
      
      if (!hasCategory) {
        logger.debug(`⏭️ Skipping location "${location.name}" - category ${filters.value.category_code} not available`)
        return false
      }
      
      logger.debug(`✅ Including location "${location.name}" for category ${filters.value.category_code}`)
      return true
    })
    
    logger.debug(`📍 Found ${categoryLocations.length} standard locations for category ${filters.value.category_code}`)
    
    // ✅ Map locations with their available staff
    const locationsWithStaff = categoryLocations.map((location: any) => {
      // Get staff IDs from location
      const staffIds = location.staff_ids || []
      
      // Find matching staff from availableStaff
      const staffAtLocation = availableStaff.value.filter((staff: any) =>
        staffIds.includes(staff.id)
      )
      
      logger.debug(`  📍 ${location.name}: ${staffAtLocation.length} staff`, {
        staffIds: staffIds,
        foundStaff: staffAtLocation.map((s: any) => s.first_name)
      })
      
      return {
        ...location,
        available_staff: staffAtLocation,
        time_slots: []
      }
    })
    
    availableLocations.value = locationsWithStaff
    logger.debug(`✅ Prepared ${availableLocations.value.length} locations with ${availableStaff.value.length} available staff`)
    
    // ✅ Load staffOnlineBookable info for displaying which staff can book which location online
    if (availableLocations.value.length > 0 && availableStaff.value.length > 0) {
      try {
        const staffIds = availableStaff.value.map((s: any) => s.id)
        
        logger.debug('🔒 Loading staff_locations for online booking status', {
          staffCount: staffIds.length,
          locationCount: availableLocations.value.length
        })

        const response = await $fetch<{
          success: boolean
          data: Array<{
            staff_id: string
            location_id: string
            is_online_bookable: boolean
          }>
        }>('/api/staff/get-staff-locations', {
          method: 'POST',
          body: { staff_ids: staffIds }
        })

        if (response?.success && response.data) {
          // Build staffOnlineBookable array for each location
          availableLocations.value = availableLocations.value.map((loc: any) => ({
            ...loc,
            staffOnlineBookable: response.data.filter((sl: any) => sl.location_id === loc.id)
          }))
          
          logger.debug(`✅ Loaded online booking status for all staff-location combinations`)
        }
      } catch (err: any) {
        logger.warn('⚠️ Could not load staff_locations info:', err.message)
      }
    }
    
    // Reset prices map for new category
    durationPrices.value.clear()
    
    // Load prices for all available durations in parallel
    logger.debug('💰 Loading prices for all durations...')
    try {
      await Promise.all(
        durationOptions.value.map(duration => loadPricingForDuration(duration))
      )
      logger.debug('✅ All prices loaded')
    } catch (err: any) {
      logger.error('⚠️ Error loading prices:', err)
    }
    
    // Skip subcategory selection and go directly to duration selection
    currentStep.value = 3
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

// ============================================================
// HELPER: Filter slots based on 15-minute gap and reservations
// ============================================================
// Rule: A slot can only be shown if:
// 1. It's not reserved (reserved_until is null or expired)
// 2. There's a 15-minute gap between this slot's start and any other reserved/booked slot's end
const filterSlotsWithGapAndReservations = (allSlots: any[]) => {
  if (!allSlots || allSlots.length === 0) return []
  
  const GAP_MINUTES = 15
  const now = new Date()
  
  return allSlots.filter(slot => {
    // Rule 1: Check if slot itself is reserved
    if (slot.reserved_until) {
      const reservedUntilDate = new Date(slot.reserved_until)
      // If reservation is still valid and not by our session, hide the slot
      if (reservedUntilDate > now && slot.reserved_by_session !== sessionId.value) {
        return false
      }
    }
    
    // Rule 2: Check 15-minute gap from other reserved/booked slots
    // A slot can be shown if no other reserved slot ends within GAP_MINUTES before this slot starts
    const slotStartTime = new Date(slot.start_time)
    const minAllowedEndTime = new Date(slotStartTime.getTime() - GAP_MINUTES * 60 * 1000)
    
    // Check if any other slot would conflict with this gap
    const hasConflictingSlot = allSlots.some(otherSlot => {
      if (otherSlot.id === slot.id) return false // Don't check against itself
      
      const otherEndTime = new Date(otherSlot.end_time)
      
      // Check if other slot is reserved/booked
      const isOtherReserved = otherSlot.reserved_until && new Date(otherSlot.reserved_until) > now && otherSlot.reserved_by_session !== sessionId.value
      const isOtherBooked = otherSlot.is_available === false
      
      if (!isOtherReserved && !isOtherBooked) return false // Other slot is not reserved/booked
      
      // Check if other slot's end time violates the gap
      return otherEndTime > minAllowedEndTime && otherEndTime <= slotStartTime
    })
    
    return !hasConflictingSlot
  })
}

const getWeeksForLocation = (location: any) => {
  if (!location.time_slots || location.time_slots.length === 0) return []
  
  // Apply 15-minute gap filtering before grouping slots
  const filteredSlots = filterSlotsWithGapAndReservations(location.time_slots)
  
  // Group slots by week
  const weeksMap = new Map<number, any[]>()
  
  filteredSlots.forEach((slot: any) => {
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
      slots: slots // Show both available AND reserved slots
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

const getSlotCardStyle = (slot: any, isSelected: boolean, isHover = false): any => {
  const primary = getBrandPrimary()
  
  // Reservierte Slots (in Bearbeitung) - transparenter Hintergrund
  if (!slot.is_available && slot.reserved_by_session) {
    const lightBase = lightenColor(primary, 0.9)
    return {
      borderColor: withAlpha(primary, 0.4),
      background: `linear-gradient(145deg, ${withAlpha(primary, 0.08)}, ${withAlpha(primary, 0.04)})`,
      opacity: 0.7,
      cursor: 'not-allowed',
      boxShadow: 'none',
      transform: 'translateY(0)',
      transition: 'all 0.18s ease'
    } as any
  }
  
  // Verfügbare Slots - normales Styling
  return getInteractiveCardStyle(isSelected, isHover)
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
  
  // If instructor and location already selected, reload slots with new duration
  if (selectedInstructor.value?.id && selectedLocation.value?.id) {
    logger.debug('🔄 Duration changed and instructor/location selected - reloading slots...')
    try {
      await generateTimeSlotsForSpecificCombination()
    } catch (err: any) {
      logger.error('❌ Failed to reload slots with new duration:', err)
    }
  }
  
  await waitForPressEffect()
  currentStep.value = 4
}

// NEW: Load pricing for a duration
const loadPricingForDuration = async (duration: number) => {
  try {
    logger.debug('💰 Loading pricing for duration:', {
      category: selectedCategory.value?.code,
      duration
    })

    const response = await $fetch('/api/booking/get-pricing', {
      method: 'POST',
      body: {
        tenant_id: currentTenant.value?.id,
        category_code: selectedCategory.value?.code,
        duration_minutes: duration
      }
    })

    if ((response as any)?.success && (response as any)?.price_chf) {
      durationPrices.value.set(duration, {
        price_rappen: (response as any).price_rappen,
        price_chf: (response as any).price_chf
      })
      logger.debug('✅ Pricing loaded:', {
        duration,
        price_chf: (response as any).price_chf
      })
    }
  } catch (err: any) {
    logger.error('❌ Failed to load pricing for duration:', err)
    // Gracefully handle - just won't show price
  }
}

const getDurationButtonStyle = (isSelected: boolean, isHover = false) => 
  getInteractiveCardStyle(isSelected, isHover)

const getDurationBadgeStyle = (isSelected: boolean) => getInteractiveBadgeStyle(isSelected)

// NEW: Select main category and move to step 2
const selectMainCategory = async (category: any) => {
  logger.debug('🎯 selectMainCategory called:', category.name)
  selectedMainCategory.value = category
  selectedCategory.value = null // Reset subcategory
  
  // Check if this category has subcategories (stored in category.children)
  const subcategories = category.children || []
  
  if (subcategories.length === 0) {
    // No subcategories - use the parent category as the selected category and go directly to duration
    logger.debug('📌 No subcategories found - using parent category directly and going to duration selection')
    
    selectedCategory.value = category
    filters.value.category_code = category.code
    
    // Parse duration from category
    durationOptions.value = parseDurationValues(category.lesson_duration_minutes)
    
    logger.debug('⏱️ Duration options:', durationOptions.value)
    selectedDuration.value = null
    filters.value.duration_minutes = durationOptions.value[0] || 45
    
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
    // ONLY include locations that support the selected category
    // Use the already-filtered available_staff from the API response
    const locationsMap = new Map<string, any>()
    
    if (!availableStaff.value || availableStaff.value.length === 0) {
      logger.warn('⚠️ No available staff loaded - cannot build locations map')
    } else {
      availableStaff.value.forEach((staff: any) => {
        if (staff.available_locations && Array.isArray(staff.available_locations)) {
          staff.available_locations.forEach((location: any) => {
            // Filter: Only include locations that have the selected category
            const supportedCategories = location.available_categories || []
            const categoryCode = selectedCategory.value?.code
            
            if (!categoryCode) {
              logger.warn('⚠️ No category code selected')
              return
            }
            
            if (!supportedCategories.includes(categoryCode)) {
              logger.debug(`⏭️ Skipping location "${location.name}" - doesn't support category ${categoryCode}`)
              return
            }
            
            if (!locationsMap.has(location.id)) {
              locationsMap.set(location.id, {
                id: location.id,
                name: location.name,
                address: location.address,
                category_pickup_settings: location.category_pickup_settings || {},
                time_windows: parseTimeWindows(location.time_windows),
                // Use the already-filtered available_staff from the API
                available_staff: location.available_staff || []
              })
            } else {
              // Merge available_staff, avoiding duplicates
              const locationEntry = locationsMap.get(location.id)
              if (locationEntry) {
                (location.available_staff || []).forEach((s: any) => {
                  if (!locationEntry.available_staff.some((existing: any) => existing.id === s.id)) {
                    locationEntry.available_staff.push(s)
                  }
                })
              }
            }
          })
        }
      })
    }
    
    // Convert map to array
    availableLocations.value = Array.from(locationsMap.values())
    logger.debug(`✅ Built locations map: ${availableLocations.value.length} unique locations`)
    
    // 🔒 FILTER: Only show locations that are online_bookable for the selected staff
    // Load staff_locations to check is_online_bookable status
    if (selectedInstructor.value?.id && availableLocations.value.length > 0) {
      try {
        const locationIds = availableLocations.value.map((loc: any) => loc.id)
        logger.debug('🔒 Filtering locations by is_online_bookable status', {
          staffId: selectedInstructor.value.id,
          locationCount: locationIds.length
        })

        const response = await $fetch<{
          success: boolean
          data: Array<{
            staff_id: string
            location_id: string
            is_online_bookable: boolean
          }>
        }>('/api/staff/get-staff-locations', {
          method: 'POST',
          body: { staff_ids: [selectedInstructor.value.id] }
        })

        if (response?.success && response.data) {
          // Create a map of which locations are online_bookable
          const staffLocMap = new Map(
            response.data.map(sl => [sl.location_id, sl.is_online_bookable])
          )

          // Filter locations to only show those that are online_bookable
          availableLocations.value = availableLocations.value.filter((loc: any) => {
            const isOnlineBookable = staffLocMap.get(loc.id)
            // If no entry exists, default to true (backward compatible)
            // If entry exists, use that value
            const shouldShow = isOnlineBookable !== false
            if (!shouldShow) {
              logger.debug(`  🔍 Filtering out location: ${loc.name} (is_online_bookable=false)`)
            }
            return shouldShow
          })

          logger.debug(`✅ After filtering: ${availableLocations.value.length} locations available for online booking`)
        }
      } catch (err: any) {
        logger.warn('⚠️ Could not filter locations by online_bookable status:', err.message)
        // Continue with unfiltered locations if filtering fails
      }
    }
    
    // Reset prices map for new category
    durationPrices.value.clear()
    
    // Load prices for all available durations in parallel
    logger.debug('💰 Loading prices for all durations...')
    try {
      await Promise.all(
        durationOptions.value.map(duration => loadPricingForDuration(duration))
      )
      logger.debug('✅ All prices loaded')
    } catch (err: any) {
      logger.error('⚠️ Error loading prices:', err)
    }
    
    // Skip subcategory selection and go directly to duration selection
    currentStep.value = 3
  } else {
    // Has subcategories - go to subcategory selection
    logger.debug('📌 Found', subcategories.length, 'subcategories - going to subcategory selection')
    currentStep.value = 2
  }
}

// MODIFIED: Select subcategory (was selectCategory, now step 2)
const selectSubcategory = async (category: any) => {
  logger.debug('🎯 selectSubcategory called:', category.code)
  logger.debug('📦 Category object:', JSON.stringify(category, null, 2))
  
  selectedCategory.value = category
  filters.value.category_code = category.code
  
  // Parse duration from subcategory, fallback to parent category if empty
  durationOptions.value = parseDurationValues(category.lesson_duration_minutes)
  
  // Fallback: use parent category durations if subcategory doesn't have them
  if (!durationOptions.value.length && selectedMainCategory.value) {
    logger.debug('📌 No durations in subcategory, using parent category durations')
    durationOptions.value = parseDurationValues(selectedMainCategory.value.lesson_duration_minutes)
  }
  
  logger.debug('⏱️ Duration options:', durationOptions.value)
  selectedDuration.value = null
  filters.value.duration_minutes = durationOptions.value[0] || 45
  
  // Reset prices map for new category
  durationPrices.value.clear()
  
  // Load prices for all available durations in parallel
  logger.debug('💰 Loading prices for all durations...')
  try {
    await Promise.all(
      durationOptions.value.map(duration => loadPricingForDuration(duration))
    )
    logger.debug('✅ All prices loaded')
  } catch (err: any) {
    logger.error('⚠️ Error loading prices:', err)
    // Don't return, just continue without prices
  }
  
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
  // ONLY include locations that support the selected category
  // Use the already-filtered available_staff from the API response
  const locationsMap = new Map<string, any>()
  
  if (!availableStaff.value || availableStaff.value.length === 0) {
    logger.warn('⚠️ No available staff loaded - cannot build locations map')
  } else {
    // ✅ NEW: Get ALL standard locations for the category (from first staff member's locations)
    availableStaff.value.forEach((staff: any) => {
      if (staff.available_locations && Array.isArray(staff.available_locations)) {
        staff.available_locations.forEach((location: any) => {
          // Filter: Only include locations that have the selected category
          const supportedCategories = location.available_categories || []
          const categoryCode = selectedCategory.value?.code
          
          if (!categoryCode) {
            logger.warn('⚠️ No category code selected')
            return
          }
          
          if (!supportedCategories.includes(categoryCode)) {
            logger.debug(`⏭️ Skipping location "${location.name}" - doesn't support category ${categoryCode}`)
            return
          }
          
          if (!locationsMap.has(location.id)) {
            // Get all staff from availableStaff that work at this location
            const staffAtLocation = availableStaff.value.filter((s: any) => {
              const locIds = (s.available_locations || []).map((l: any) => l.id)
              return locIds.includes(location.id)
            })
            
            locationsMap.set(location.id, {
              id: location.id,
              name: location.name,
              address: location.address,
              category_pickup_settings: location.category_pickup_settings || {},
              time_windows: parseTimeWindows(location.time_windows),
              available_staff: staffAtLocation,
              staff_ids: location.staff_ids || []
            })
            logger.debug(`✅ Added location "${location.name}" with ${staffAtLocation.length} staff`)
          } else {
            // Merge available_staff, avoiding duplicates
            const locationEntry = locationsMap.get(location.id)
            if (locationEntry) {
              (availableStaff.value || []).forEach((s: any) => {
                if (!locationEntry.available_staff.some((existing: any) => existing.id === s.id)) {
                  const locIds = (s.available_locations || []).map((l: any) => l.id)
                  if (locIds.includes(location.id)) {
                    locationEntry.available_staff.push(s)
                  }
                }
              })
            }
          }
        })
      }
    })
  }
  
  // Convert map to array
  availableLocations.value = Array.from(locationsMap.values())
  logger.debug(`✅ Built locations map: ${availableLocations.value.length} unique locations`)
  
  // 🔒 LOAD ALL STAFF LOCATIONS for online_bookable filtering
  // We need this for all staff, not just selectedInstructor, because user hasn't selected one yet
  try {
    const staffIds = Array.from(new Set(
      availableStaff.value
        ?.filter((s: any) => s.id)
        .map((s: any) => s.id) || []
    ))

    if (staffIds.length > 0) {
      logger.debug('🔒 Pre-loading staff_locations for online_bookable filtering', {
        staffCount: staffIds.length,
        locationCount: availableLocations.value.length
      })

      const response = await $fetch<{
        success: boolean
        data: Array<{
          staff_id: string
          location_id: string
          is_online_bookable: boolean
        }>
      }>('/api/staff/get-staff-locations', {
        method: 'POST',
        body: { staff_ids: staffIds }
      })

      if (response?.success && response.data) {
        // Store in a map for filtering per staff/location
        const staffLocMap = new Map<string, Map<string, boolean>>()
        for (const sl of response.data) {
          if (!staffLocMap.has(sl.staff_id)) {
            staffLocMap.set(sl.staff_id, new Map())
          }
          staffLocMap.get(sl.staff_id)!.set(sl.location_id, sl.is_online_bookable)
        }

        // Add is_online_bookable info - ONLY for staff that are available for this location
        availableLocations.value = availableLocations.value.map((loc: any) => ({
          ...loc,
          // Only include staff_online_bookable for staff that are available for this location
          staffOnlineBookable: (loc.available_staff || []).map((staff: any) => ({
            staffId: staff.id,
            // Look up is_online_bookable from the staff_locations data
            isOnlineBookable: staffLocMap.get(staff.id)?.get(loc.id) === true // Only true, not default
          }))
        }))

        logger.debug(`✅ Enriched locations with staff_locations data`, {
          locationsCount: availableLocations.value.length,
          exampleLocation: availableLocations.value[0]?.name,
          exampleStaffOnlineBookableCount: availableLocations.value[0]?.staffOnlineBookable?.length || 0,
          exampleStaffOnlineBookable: availableLocations.value[0]?.staffOnlineBookable
        })
      }
    }
  } catch (err: any) {
    logger.warn('⚠️ Could not pre-load staff_locations:', err.message)
    // Continue without pre-loaded data - filtering will happen at display time
  }
  
  await waitForPressEffect()
  currentStep.value = 3
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
  currentStep.value = 5
}

const selectInstructor = async (instructor: any) => {
  selectedInstructor.value = instructor
  showProposalFormManually.value = false // Reset proposal form flag
  await waitForPressEffect()
  currentStep.value = 6 // Wechsel zu Termin-Auswahl (inkl. Loading-State)
  
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
    
    // ✅ NEW: Pre-load customer's existing appointments for conflict checking
    const { checkConflicts: checkCustomerConflicts, customerAppointments } = useCustomerConflictCheck()
    await checkCustomerConflicts(startDate, endDate)
    logger.debug('✅ Customer appointment conflict check initialized', {
      existingAppointments: customerAppointments.value.length
    })
    
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
    let timeSlots = slots.map(slot => {
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
        category_code: slot.category_code,
        has_conflict: false // Will be set below
      }
    })
    
    // ✅ NEW: Pre-filter slots that have conflicts (show them grayed out or disabled)
    if (customerAppointments.value.length > 0) {
      logger.debug('🔍 Pre-filtering slots for customer conflicts...', {
        slotsCount: timeSlots.length,
        existingAppointments: customerAppointments.value.length
      })

      try {
        // Call backend API to check conflicts (includes travel time)
        const conflictCheckResponse = await $fetch('/api/booking/check-slot-conflicts', {
          method: 'POST',
          body: {
            existingAppointments: customerAppointments.value,
            proposedSlots: timeSlots.map(s => ({
              id: s.id,
              start_time: s.start_time,
              end_time: s.end_time
            })),
            proposedLocationPostalCode: selectedLocation.value?.postal_code
          }
        })

        if ((conflictCheckResponse as any)?.success && (conflictCheckResponse as any)?.conflicts) {
          // Map conflicts back to slots
          const conflictMap = new Map(
            (conflictCheckResponse as any).conflicts.map((c: any) => [c.slot_id, c])
          )

          for (const slot of timeSlots) {
            const conflict = conflictMap.get((slot as any).id) as any
            if (conflict?.has_conflict) {
              const slotAny = slot as any
              slotAny.has_conflict = true
              slotAny.conflict_reason = conflict.conflict_reason
              logger.debug(`⚠️ Slot has conflict: ${slotAny.time_formatted}`, {
                reason: conflict.conflict_reason
              })
            }
          }

          const conflictCount = timeSlots.filter((s: any) => s.has_conflict).length
          logger.debug(`✅ Pre-filtering complete: ${conflictCount}/${timeSlots.length} slots have conflicts`)
        }
      } catch (err: any) {
        logger.warn('⚠️ Error checking slot conflicts via API:', err.message)
        // Non-critical: if API fails, show all slots as available (graceful degradation)
      }
    }
    
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

// ✅ NEW: Check for customer appointment conflicts and travel time
const selectTimeSlot = async (slot: any) => {
  try {
    if (slot.has_conflict) {
      logger.warn('⚠️ Attempting to select slot with conflict (should be disabled)')
      error.value = 'Dieser Termin hat einen Zeitkonflikt. Bitte wählen Sie einen anderen Termin.'
      setTimeout(() => { error.value = null }, 5000)
      return
    }

    logger.debug('✅ Slot selected (pre-filtered)', {
      slotStart: slot.start_time,
      location: selectedLocation.value?.name
    })

    selectedSlot.value = slot

    // CRITICAL: Reserve the slot in the database FIRST
    const isReserved = await reserveSlotSecure()

    if (isReserved) {
      currentStep.value = 7
      error.value = null
    } else {
      // Error message is already set by reserveSlotSecure if it fails
      logger.warn('❌ Failed to reserve slot, not proceeding to next step.')
    }
    
  } catch (err: any) {
    logger.error('❌ Error selecting slot:', err)
    error.value = 'Fehler beim Auswählen des Termins'
  }
}

// ✅ NEW: Handle proposal submission
const handleProposalSubmitted = async (proposalId: string) => {
  logger.debug('✅ Booking proposal submitted:', proposalId)
  
  // Store proposal ID for potential later use
  currentReservationId.value = proposalId
  
  // Redirect to proposal confirmation page (new step)
  await nextTick()
  currentStep.value = 9 // New step for proposal confirmation
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
const showProposalForm = ref(false) // Show proposal form when no slots available
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
    logger.debug('🎯 Starting booking confirmation via API...')
    
    // Validate that all required data is selected
    if (!selectedSlot.value?.id) {
      throw new Error('Bitte wählen Sie einen Zeitslot aus')
    }
    if (!selectedInstructor.value?.id) {
      throw new Error('Bitte wählen Sie einen Fahrlehrer aus')
    }
    if (!selectedCategory.value?.code) {
      throw new Error('Bitte wählen Sie eine Kategorie aus')
    }
    
    isCreatingBooking.value = true
    
    // FIRST: Check if user is authenticated BEFORE making any API calls
    logger.debug('🔐 Checking authentication status...')
    let isAuthenticated = false
    
    try {
      const currentUser = await $fetch('/api/auth/current-user')
      logger.debug('✅ User is authenticated:', (currentUser as any)?.id)
      isAuthenticated = true
    } catch (authError: any) {
      // User is not authenticated - this is expected
      logger.debug('🔑 User not authenticated, will show login modal', {
        statusCode: authError.statusCode,
        status: authError.status,
        data: authError.data,
        message: authError.message
      })
      isAuthenticated = false
    }
    
    // If not authenticated, show login modal instead of proceeding
    if (!isAuthenticated) {
      logger.debug('🔑 Showing login modal for unauthenticated user', {
        showLoginModalBefore: showLoginModal.value,
        isCreatingBooking: isCreatingBooking.value
      })
      isCreatingBooking.value = false
      showLoginModal.value = true
      loginModalTab.value = 'register'
      logger.debug('🔑 Login modal should now be visible', {
        showLoginModalAfter: showLoginModal.value
      })
      return
    }
    
    // Check for appointment conflicts (in case another booking was made in the meantime)
    logger.debug('🔍 Checking for appointment conflicts...')
    const conflictCheckResponse = await $fetch('/api/booking/check-conflicts', {
      method: 'POST',
      body: {
        slug: route.params.slug,
        start_time: selectedSlot.value.start_time,
        end_time: selectedSlot.value.end_time,
        staff_id: selectedInstructor.value.id
      }
    })
    
    if ((conflictCheckResponse as any)?.has_conflict) {
      logger.error('❌ Conflict detected')
      throw new Error('Der gewählte Zeitslot ist leider nicht mehr verfügbar. Ein anderer Termin überlappt sich. Bitte wählen Sie einen anderen Zeitslot.')
    }
    
    logger.debug('✅ No conflicts detected')
    
    // Create the appointment using the secure API
    // The appointment creation will handle the slot reservation internally
    const result = await createAppointmentSecure({
      slot_id: selectedSlot.value.id,
      session_id: sessionId.value,
      appointment_type: 'lesson',
      category_code: selectedCategory.value.code,
      notes: bookingNotes.value || undefined
    })

    logger.debug('✅ Appointment created:', result.appointment_id)
    
    isCreatingBooking.value = false
    
    // Redirect to customer dashboard with success message
    await navigateTo({
      path: '/customer-dashboard',
      query: {
        appointment_id: result.appointment_id,
        booking_success: 'true'
      }
    })
    
  } catch (error: any) {
    console.error('Error confirming booking:', error)
    isCreatingBooking.value = false
    
    // Check if it's a 401 Unauthorized error (authentication required)
    if (error.statusCode === 401 || error.data?.statusCode === 401) {
      logger.debug('🔑 Authentication required - showing login modal')
      showLoginModal.value = true
      loginModalTab.value = 'register' // Default to register for new users
      return
    }
    
    // Show error message to user
    let errorMessage = error?.message || error?.data?.message || 'Buchung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    
    // If error value was set, use that
    if (error.value) {
      errorMessage = error.value
    }
    
    // Only show alert if we're not already handling the error
    if (error.message === 'Slot-Reservierung fehlgeschlagen') {
      logger.warn('⚠️ Slot reservation failed - user returned to slot selection')
      error.value = errorMessage
    } else {
      alert(`Fehler bei der Buchung: ${errorMessage}`)
    }
  }
}

// Create appointment in database
const createAppointmentSecure = async (userData: any) => {
  isCreatingBooking.value = true
  
  try {
    logger.debug('📅 Creating appointment via secure API...')
    
    // Use the new composable's createAppointment method
    // The backend API will handle slot reservation
    const response = await createAppointment(
      {
        slot_id: userData.slot_id,
        session_id: userData.session_id,
        appointment_type: userData.appointment_type,
        category_code: userData.category_code || '',
        notes: userData.notes || undefined
      }
    )
    
    // ✅ Safety check: Ensure reservation data is returned
    if (!response?.reservation?.slot_id) {
      logger.error('❌ Reservation data missing from API response:', response)
      throw createError({
        statusCode: 500,
        statusMessage: 'Slot reservation failed - no reservation data returned'
      })
    }
    
    logger.debug('✅ Slot reserved successfully:', response.reservation.slot_id)
    
    // Return the appointment ID (use slot_id as identifier for this step)
    return {
      success: true,
      appointment_id: response.reservation.slot_id,
      reservation: response.reservation
    }
    
  } catch (err: any) {
    logger.error('❌ Appointment creation failed:', err)
    
    if (err.statusCode === 409) {
      // Reservation expired
      error.value = 'Ihre Reservierung ist abgelaufen. Bitte wählen Sie erneut einen Zeitslot.'
      // Go back to slot selection
      currentStep.value = 5
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
  // Cancel reservation when going to any step that's not the reservation confirmation (step 7)
  if (currentReservationId.value && step < 7) {
    cancelReservation()
  }
  
  currentStep.value = step
  
  // Reset subsequent selections
  if (step < 7) {
    selectedSlot.value = null
    pickupAddress.value = ''
    pickupAddressDetails.value = null
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

// Helper function to get the previous step, considering if subcategories exist
const getPreviousStep = (fromStep: number): number => {
  if (fromStep === 3 && selectedMainCategory.value) {
    // From step 3 (duration), check if main category has subcategories
    const hasSubcategories = (selectedMainCategory.value.children || []).length > 0
    if (!hasSubcategories) {
      // No subcategories - skip step 2 and go to step 1
      logger.debug('📌 No subcategories found - skipping step 2 when going back')
      return 1
    }
  }
  
  // Default: go back one step
  return fromStep - 1
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
      currentReservationId.value = selectedSlot.value.id
      reservationExpiry.value = new Date(reservation.slot.reserved_until)
      reservedUntil.value = reservationExpiry.value // Set reservedUntil here
      startCountdown()
      return true
    } else {
      console.error('❌ Reservation failed')
      return false
    }
  } catch (error: any) {
    console.error('❌ Error reserving slot:', error)
    
    if (error.statusCode === 409) {
      // Slot already taken - this is a race condition, offer retry with fresh slots
      logger.debug('🔄 Slot taken by another user, refreshing available slots...')
      error.value = 'Der gewählte Zeitslot wurde gerade von jemand anderem gebucht. Bitte wählen Sie aus den verfügbaren Slots einen anderen aus.'
      // Refresh slots so user can pick a different one
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
  if (!currentReservationId.value) {
    logger.debug('⚠️ No reservation to cancel (currentReservationId is empty)')
    return
  }

  try {
    logger.debug('🗑️ Cancelling reservation...', { 
      slot_id: currentReservationId.value, 
      session_id: sessionId.value 
    })
    
    const response = await $fetch('/api/booking/release-reservation', {
      method: 'POST',
      body: {
        slot_id: currentReservationId.value,
        session_id: sessionId.value
      }
    })

    logger.debug('✅ Reservation cancelled:', response)
  } catch (error: any) {
    logger.error('❌ Error cancelling reservation:', error)
    // Silently ignore cancellation errors - the reservation might already be gone
    if (!silent) {
      console.warn('⚠️ Could not cancel reservation, but continuing...', error)
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

const handleBackButton = async () => {
  // Release slot reservation if going back
  if (currentReservationId.value && sessionId.value) {
    try {
      logger.debug('🔓 Releasing slot reservation on back button...')
      await cancelReservation()
      logger.debug('✅ Slot reservation released')
    } catch (err: any) {
      logger.warn('⚠️ Failed to release slot reservation:', err)
    }
  }

  // On step 1, go back to referrer
  if (currentStep.value === 1) {
    goBackToReferrer()
  } else {
    // On other steps, go back one step (considering subcategory skip)
    const previousStep = getPreviousStep(currentStep.value)
    goBackToStep(previousStep)
  }
}

const proceedToRegistration = () => {
  if (!selectedSlot.value) return
  
  // TODO: Navigate to registration page with selected slot
  alert(`Termin ausgewählt: ${selectedSlot.value.staff_name} am ${formatDate(selectedSlot.value.start_time)} um ${formatTime(selectedSlot.value.start_time)}`)
}

const setTenantFromSlug = async (slugOrId: string) => {
  try {
    // Replaces direct Supabase queries at lines 2382 & 2392
    
    // For now, load tenant by trying basic logic on client
    // But this should ideally be an API call
    // Fetch tenant from API if available, otherwise use direct fetch
    
    // Option 1: Use API endpoint when available
    // For now doing direct calculation on client since tenants are public
    const response = await fetch('/api/booking/get-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: slugOrId,
        staff_id: 'placeholder',
        action: 'get-tenant-data'
      })
    }).catch(() => null)
    
    let tenantData = null
    
    if (response?.ok) {
      try {
        const data = await response.json()
        if (data?.success) {
          tenantData = data.data?.tenant
        }
      } catch (e) {
        // Fall back if API response is not JSON
      }
    }
    
    // If API failed or returned nothing, we need a public endpoint for tenant lookup
    // This is still necessary since tenants page is public
    if (!tenantData) {
      // Make a fetch call to a new public endpoint
      // For now, create one
      const tenantResponse = await $fetch('/api/booking/get-tenant-by-slug', {
        method: 'POST',
        body: { slug: slugOrId, id: slugOrId }
      }).catch(() => null) as any
      
      if (tenantResponse?.success) {
        tenantData = tenantResponse.data
      }
    }
    
    if (!tenantData) {
      console.error('❌ Tenant not found:', slugOrId)
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

    // Replaces direct Supabase query at line 2457
    
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        tenant_id: currentTenant.value.id,
        staff_id: 'placeholder',
        action: 'get-tenant-data'
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to load settings')
    }

    // Convert array to object for easy access
    const settings: any = {}
    response.data?.settings?.forEach((setting: any) => {
      settings[setting.setting_key] = setting.setting_value
    })

    tenantSettings.value = settings
    logger.debug('✅ Tenant settings loaded via API:', settings)
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

    // Replaces direct Supabase queries at lines 2510 & 2521
    
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        tenant_id: currentTenant.value.id,
        staff_id: 'placeholder',
        action: 'get-booking-setup'
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to load categories')
    }

    categories.value = response.data?.categories || []
    
    // Load locations count
    const allLocations = response.data?.locations || []
    locationsCount.value = allLocations.length
    
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
    
    // Replaces direct Supabase queries at lines 2604 & 2614
    
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        tenant_id: currentTenant.value?.id,
        staff_id: staffId,
        start_date: dayStartUtc.toISOString(),
        end_date: dayEndUtc.toISOString(),
        action: 'get-availability-data'
      }
    }) as any
    
    const appointments = response?.data?.appointments || []
    const externalBusy = response?.data?.external_busy_times || []
    
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
    
    // Replaces direct Supabase queries at lines 2750 & 2762
    
    const response = await $fetch('/api/booking/get-availability', {
      method: 'POST',
      body: {
        tenant_id: currentTenant.value?.id,
        staff_id: staff.id,
        start_date: dayStartUtc.toISOString(),
        end_date: dayEndUtc.toISOString(),
        action: 'get-availability-data'
      }
    }) as any
    
    const appointments = response?.data?.appointments || []
    const externalBusy = response?.data?.external_busy_times || []
    
    // Combine all busy times
    const allBusyTimes = [
      ...(appointments || []).map((apt: any) => ({
        start: new Date(apt.start_time),
        end: new Date(apt.end_time)
      })),
      ...(externalBusy || []).map((ebt: any) => ({
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
            await selectSubcategory(categoryToSelect)
            
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
                currentStep.value = 4
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
            await selectSubcategory(categoryToSelect)
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

watch(
  [selectedCategory, selectedDuration, selectedLocation, selectedInstructor],
  () => {
    showProposalFormManually.value = false
  },
  { deep: true }
)

// Reset proposal form flag when selection changes
watch(
  [selectedCategory, selectedDuration, selectedLocation, selectedInstructor],
  () => {
    showProposalFormManually.value = false
  },
  { deep: true }
)

// Cleanup on unmount
onBeforeUnmount(async () => {
  window.removeEventListener('resize', () => {
    isScreenSmall.value = window.innerWidth < 1000
  })

  // Release slot reservation if user leaves without completing booking
  if (reservedSlotId.value && sessionId.value) {
    try {
      logger.debug('🔓 Releasing slot reservation on page unmount...', {
        slot_id: reservedSlotId.value,
        session_id: sessionId.value
      })
      await $fetch('/api/booking/release-reservation', {
        method: 'POST',
        body: {
          slot_id: reservedSlotId.value,
          session_id: sessionId.value
        }
      })
      logger.debug('✅ Slot reservation released')
    } catch (err: any) {
      logger.warn('⚠️ Failed to release slot reservation:', err)
      // Non-critical - cleanup will happen on expiry
    }
  }
})
</script>
