<template>
  <Teleport to="body">
  <!-- Bottom Sheet Overlay -->
  <div
    class="fixed inset-0 z-[200] bg-black/40 flex items-end"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
    @click.self="$emit('close')"
  >
    <div class="bg-gray-100 rounded-t-3xl w-full max-w-4xl mx-auto max-h-[92svh] flex flex-col shadow-2xl">

      <!-- Drag Handle -->
      <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="w-9 h-1 bg-gray-300 rounded-full"></div>
      </div>

      <!-- Profile Header -->
      <div class="px-5 pt-2 pb-4 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0" :style="{ background: primaryColor }">
            {{ localUser.first_name?.charAt(0) || '?' }}{{ localUser.last_name?.charAt(0) || '' }}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-gray-900 text-base leading-tight">
                {{ localUser.first_name }} {{ localUser.last_name }}
              </span>
              <button
                @click="openEditProfile"
                title="Profil bearbeiten"
                class="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </button>
            </div>
            <div class="text-xs text-gray-500 mt-0.5 capitalize">{{ props.currentUser?.role?.replace('_', ' ') }}</div>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center active:opacity-60 transition-opacity"
        >
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Quick Actions Grid -->
      <div class="px-4 pb-3 flex-shrink-0">
        <div class="grid gap-3" :class="affiliateEnabled ? 'grid-cols-3' : 'grid-cols-2'">
          <button
            @click="openExamStatistics"
            class="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 active:opacity-60 transition-opacity shadow-sm"
          >
            <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-700">Statistik</span>
          </button>

          <button
            @click="openCashControl"
            class="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 active:opacity-60 transition-opacity shadow-sm"
          >
            <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-700">Kasse</span>
          </button>

          <button
            v-if="affiliateEnabled"
            @click="openAffiliateModal"
            class="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 active:opacity-60 transition-opacity shadow-sm"
          >
            <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-700">Empfehlen</span>
          </button>
        </div>
      </div>

      <!-- Scrollable Settings Content -->
      <div class="overflow-y-auto flex-1 px-4 pb-6">
        <div class="space-y-2">
        
        <!-- Error State -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ❌ {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="saveSuccess" class="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✅ Einstellungen erfolgreich gespeichert!
        </div>

        <!-- Accordion Sections -->
        <div class="space-y-2">

        <!-- Externe Kalender Einstellungen -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button  
            @click="toggleSection('externalCalendars')" 
            class="w-full px-4 py-3.5 text-left flex items-center gap-3 active:opacity-60 transition-opacity"
          >
            <div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <span class="text-sm font-medium text-gray-900 flex-1">Externe Kalender</span>
            <svg class="w-4 h-4 text-gray-300 transition-transform" :class="openSections.externalCalendars ? 'rotate-90' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          
          <div v-if="openSections.externalCalendars" class="px-4 pb-4 border-t">
            <ExternalCalendarSettings />
          </div>
        </div>

        <!-- Nur Arbeitsstunden für 4 Monate - KEINE lessons mehr! -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="w-full px-4 py-3.5 flex items-center gap-3">
            <button
              @click="toggleSection('workingStats')"
              class="flex items-center gap-3 flex-1 text-left active:opacity-60 transition-opacity"
            >
              <div class="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <span class="text-sm font-medium text-gray-900 flex-1">Arbeitsstunden</span>
              <svg class="w-4 h-4 text-gray-300 transition-transform" :class="openSections.workingStats ? 'rotate-90' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          
          <div v-if="openSections.workingStats" class="px-4 pb-4 border-t border-gray-100">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <!-- Kommender Monat - Geplant -->
              <div class="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                <h4 class="font-semibold text-orange-900 mb-3 text-center">{{ nextMonthName }}</h4>
                <div class="text-center">
                  <div class="text-sm text-orange-700 font-medium mb-1">Geplant</div>
                  <div class="text-2xl font-bold text-orange-800">
                    {{ monthlyStats.nextMonth.planned.toFixed(2) }}h
                  </div>
                </div>
              </div>
              
              <!-- Aktueller Monat - Kombiniert -->
              <div class="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border-2 border-blue-200">
                <h4 class="font-semibold text-gray-800 mb-4 text-center">{{ currentMonthName }}</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-sm text-blue-700 font-medium mb-1">Gearbeitet</div>
                    <div class="text-2xl font-bold text-blue-800">
                      {{ monthlyStats.currentMonth.worked.toFixed(2) }}h
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-sm text-green-700 font-medium mb-1">Geplant</div>
                    <div class="text-2xl font-bold text-green-800">
                      {{ monthlyStats.currentMonth.planned.toFixed(2) }}h
                    </div>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-300">
                  <div class="text-center">
                    <div class="text-xs text-gray-600 font-medium mb-1">Total</div>
                    <div class="text-lg font-bold text-gray-800">
                      {{ (monthlyStats.currentMonth.worked + monthlyStats.currentMonth.planned).toFixed(2) }}h
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Vormonat -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ previousMonthName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.previousMonth.worked.toFixed(2) }}h
                </div>
              </div>
              
              <!-- 2 Monate zurück -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ twoMonthsAgoName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.twoMonthsAgo.worked.toFixed(2) }}h
                </div>
              </div>
              
              <!-- 3 Monate zurück -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ threeMonthsAgoName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.threeMonthsAgo.worked.toFixed(2) }}h
                </div>
              </div>
              
            </div>
            <!-- Detailansicht Button -->
            <div class="mt-3 flex justify-end">
              <button
                @click="showMonthlyDetailModal = true; loadMonthlyHours()"
                class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
                :style="{ background: `${primaryColor}15`, color: primaryColor }"
              >Detaillierte Übersicht →</button>
            </div>
          </div>
        </div>

        <!-- 6. Prüfungsstandorte -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            @click="toggleSection('examLocations')"
            class="w-full px-4 py-3.5 text-left flex items-center gap-3 active:opacity-60 transition-opacity"
          >
            <div class="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <span class="text-sm font-medium text-gray-900 flex-1">Prüfungsstandorte</span>
            <svg class="w-4 h-4 text-gray-300 transition-transform" :class="openSections.examLocations ? 'rotate-90' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          
          <div v-if="openSections.examLocations" class="px-4 pb-4 border-t border-gray-100">
            <div class="space-y-4 mt-4">

              <!-- New Search Dropdown -->
              <div class="space-y-4">
                <ExamLocationSearchDropdown
                  :current-staff-id="props.currentUser?.id || ''"
                  @locations-changed="handleExamLocationsChanged"
                />
              </div>

            </div>
          </div>
        </div>

          
          <!-- 3. Treffpunkte/Standorte -->
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              @click="toggleSection('locations')"
              class="w-full px-4 py-3.5 text-left flex items-center gap-3 active:opacity-60 transition-opacity"
            >
              <div class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <span class="text-sm font-medium text-gray-900 flex-1">Treffpunkte / Standorte</span>
              <svg class="w-4 h-4 text-gray-300 transition-transform" :class="openSections.locations ? 'rotate-90' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            
            <div v-if="openSections.locations" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-4 mt-4">

                <!-- Header mit Button -->
                <div class="flex justify-between items-center">
                  <button
                    @click="showNewLocationModal = true"
                    class="px-4 py-2 text-md font-medium text-white rounded transition-colors hover:opacity-90"
                    :style="{ background: primaryColor }"
                  >
                    + Neuer Standort
                  </button>
                </div>

                <!-- Dropdown zum Hinzufügen von Standorten -->
                <div class="space-y-2">
                  <label class="block text-sm font-medium text-gray-700">Verfügbarer Standort hinzufügen:</label>
                  <select 
                    @change="(e: any) => {
                      const locationId = e.target.value
                      if (locationId) {
                        toggleLocationAssignment(locationId)
                        e.target.value = ''
                      }
                    }"
                    class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2"
                  >
                    <option value="">-- Wähle einen Standort --</option>
                    <option v-for="location in availableLocationsForSignup" :key="location.id" :value="location.id">
                      {{ location.name }} ({{ location.address }})
                    </option>
                  </select>
                </div>

                <!-- Ihre registrierten Standorte -->
                <div v-if="registeredLocations.length > 0">
                  <div class="space-y-2">
                    <div 
                      v-for="location in registeredLocations" 
                      :key="location.id"
                      class="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition"
                    >
                      <!-- Left Column: Location Info -->
                      <div class="flex-1">
                        <div class="font-medium text-gray-900">{{ location.name }}</div>
                        <div class="text-gray-600 text-xs">{{ location.address }}</div>
                      </div>
                      
                      <!-- Right Column: Toggle and Delete Button (stacked) -->
                      <div class="flex flex-col items-end gap-2">
                        <!-- ✨ Online Bookable Button -->
                        <button
                          @click="() => toggleLocationBookable(location.id, location.is_online_bookable === false ? true : false)"
                          :class="[
                            'px-3 py-1 rounded text-xs font-medium transition',
                            location.is_online_bookable !== false
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                          ]"
                        >
                          {{ location.is_online_bookable !== false ? 'Buchbar' : 'Nicht buchbar' }}
                        </button>
                        
                        <!-- Delete Button -->
                        <button
                          @click="toggleLocationAssignment(location.id)"
                          class="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-medium"
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Keine Standorte -->
                <div v-if="registeredLocations.length === 0" class="text-center py-6 text-gray-500">
                  <p class="text-sm">Keine Standorte ausgewählt</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Arbeitszeiten -->
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              @click="toggleSection('worktime')"
              class="w-full px-4 py-3.5 text-left flex items-center gap-3 active:opacity-60 transition-opacity"
            >
              <div class="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <span class="text-sm font-medium text-gray-900 flex-1">Arbeitszeiten</span>
              <svg class="w-4 h-4 text-gray-300 transition-transform" :class="openSections.worktime ? 'rotate-90' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            </button>
            
            <div v-if="openSections.worktime" class="px-2 pb-4 border-t border-gray-100">
              <div class="space-y-4 mt-4">
                
                <!-- Info Text -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <p class="text-sm text-blue-800">
                    💡 <strong>Arbeitszeiten:</strong> Sie können mehrere Arbeitszeit-Blöcke pro Tag erstellen (z.B. Vormittag und Nachmittag mit Mittagspause). Nicht-Arbeitszeiten werden automatisch als "gesperrt" im Kalender angezeigt.
                  </p>
                </div>

                <!-- Arbeitszeiten pro Wochentag -->
                <div class="space-y-4">
                  <div
                    v-for="day in weekdays"
                    :key="day.value"
                    class="border border-gray-200 rounded-lg p-2"
                  >
                    <!-- Wochentag Header -->
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-sm font-medium text-gray-700">{{ day.label }}</h4>
                      
                      <!-- Aktiv/Inaktiv Toggle Switch -->
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          v-model="workingDayForm[day.value].is_active"
                          @change="autoSaveWorkingDay(day.value)"
                          class="sr-only peer"
                        />
                        <div class="tenant-toggle relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                    
                    <!-- Arbeitszeit-Blöcke -->
                    <div v-if="workingDayForm[day.value].is_active" class="space-y-3">
                      <div
                        v-for="(block, blockIndex) in workingDayForm[day.value].blocks"
                        :key="blockIndex"
                        class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                      >
                        <!-- Start Zeit -->
                        <div class="flex-1">
                          <label class="block text-xs text-gray-500 mb-1">Von</label>
                          <input
                            v-model="block.start_time"
                            type="time"
                            @change="autoSaveWorkingDay(day.value)"
                            class="tenant-focus w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2"
                          >
                        </div>
                        
                        <!-- End Zeit -->
                        <div class="flex-1">
                          <label class="block text-xs text-gray-500 mb-1">Bis</label>
                          <input
                            v-model="block.end_time"
                            type="time"
                            @change="autoSaveWorkingDay(day.value)"
                            class="tenant-focus w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2"
                          >
                        </div>
                        
                        <!-- Block löschen Button -->
                        <div class="flex-shrink-0 pt-5">
                          <button
                            @click="removeWorkingBlock(day.value, blockIndex)"
                            class="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      
                      <!-- Block hinzufügen Button -->
                      <button
                        @click="addWorkingBlock(day.value)"
                        class="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 text-sm font-medium"
                      >
                        + Arbeitszeit-Block hinzufügen
                      </button>
                    </div>
                    
                    <!-- Inaktiv Zustand -->
                    <div v-else class="text-sm text-gray-500 text-center py-4">
                      Tag ist inaktiv
                    </div>
                  </div>
                </div>

                <!-- Auto-Save Indicator -->
                <div v-if="isSavingWorkingHours" class="text-sm pt-2" :style="{ color: primaryColor }">
                  💾 Speichere...
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gutschein & Rabattcodes (nur Admin) -->
      <div v-if="props.currentUser?.role === 'admin' || props.currentUser?.role === 'tenant_admin'" class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button
          @click="toggleSection('voucherCodes')"
          class="w-full px-4 py-3.5 text-left flex items-center gap-3 active:opacity-60 transition-opacity"
        >
          <div class="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
          </div>
          <span class="text-sm font-medium text-gray-900 flex-1">Gutschein- & Rabattcodes</span>
          <svg class="w-4 h-4 text-gray-300 transition-transform" :class="openSections.voucherCodes ? 'rotate-90' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <div v-if="openSections.voucherCodes" class="px-4 pb-4 border-t border-gray-100">
          <p class="mt-4 text-sm text-gray-500">Gutschein- & Rabattcodes werden in Kürze verfügbar sein.</p>
        </div>
      </div>
      </div><!-- end accordion wrapper -->

        <!-- Footer Actions -->
        <div class="mt-2 space-y-2">
          <button
            @click="openCalendarIntegration"
            class="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-60 transition-opacity shadow-sm"
          >
            <div class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-700 flex-1 text-left">Kalender-Link</span>
            <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          <button
            @click="handleLogout"
            class="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-60 transition-opacity shadow-sm"
          >
            <div class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </div>
            <span class="text-sm font-medium text-red-600 flex-1 text-left">Abmelden</span>
          </button>
        </div>

      </div><!-- end space-y-2 settings -->
      </div><!-- end overflow-y-auto -->
  </Teleport>

    <!-- Edit Profile Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showEditProfile" class="fixed inset-0 z-[400] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="showEditProfile = false">
          <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <h2 class="text-base font-semibold text-gray-900">Profil bearbeiten</h2>
              <button @click="showEditProfile = false" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Form -->
            <div class="px-5 py-4 space-y-3 max-h-[70svh] overflow-y-auto">
              <!-- Loading skeleton -->
              <div v-if="isLoadingProfile" class="space-y-3 animate-pulse">
                <div class="grid grid-cols-2 gap-3">
                  <div class="h-10 bg-gray-100 rounded-xl"/>
                  <div class="h-10 bg-gray-100 rounded-xl"/>
                </div>
                <div class="h-10 bg-gray-100 rounded-xl"/>
                <div class="h-10 bg-gray-100 rounded-xl"/>
                <div class="grid grid-cols-3 gap-3">
                  <div class="col-span-2 h-10 bg-gray-100 rounded-xl"/>
                  <div class="h-10 bg-gray-100 rounded-xl"/>
                </div>
                <div class="h-10 bg-gray-100 rounded-xl"/>
                <div class="h-28 bg-gray-100 rounded-xl"/>
              </div>

              <template v-else>
              <!-- Success / Error -->
              <Transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
                <div v-if="editProfileSuccess" class="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-800">
                  <svg class="w-4 h-4 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Profil erfolgreich gespeichert
                </div>
              </Transition>
              <div v-if="editProfileError" class="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{{ editProfileError }}</div>

              <!-- Name row -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Vorname</label>
                  <input v-model="editForm.first_name" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Nachname</label>
                  <input v-model="editForm.last_name" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">E-Mail</label>
                <input v-model="editForm.email" type="email" autocomplete="email" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
              </div>

              <!-- Phone -->
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                <input v-model="editForm.phone" type="tel" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
              </div>

              <!-- Street + Nr -->
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Strasse</label>
                  <input v-model="editForm.street" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">Nr.</label>
                  <input v-model="editForm.street_nr" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
                </div>
              </div>

              <!-- PLZ + City -->
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1">PLZ</label>
                  <input v-model="editForm.zip" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-500 mb-1">Ort</label>
                  <input v-model="editForm.city" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" :style="{ '--tw-ring-color': primaryColor }" />
                </div>
              </div>

              <!-- Categories -->
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">
                  Kategorien
                  <span class="ml-1 text-gray-400">({{ editForm.category.length }} ausgewählt)</span>
                </label>
                <div class="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl border border-gray-200 p-3 max-h-44 overflow-y-auto">
                  <label
                    v-for="cat in availableCategories"
                    :key="cat.id"
                    class="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none"
                  >
                    <input
                      v-model="editForm.category"
                      type="checkbox"
                      :value="cat.code"
                      class="w-4 h-4 rounded border-gray-300 flex-shrink-0"
                      :style="{ accentColor: primaryColor }"
                    />
                    {{ cat.name || cat.code }}
                  </label>
                  <p v-if="availableCategories.length === 0" class="col-span-2 text-sm text-gray-400 italic">Keine Kategorien verfügbar</p>
                </div>
              </div>

              <!-- Documents -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-medium text-gray-500">Führerausweis</label>
                  <div class="flex gap-1.5">
                    <input ref="licUploadFront" type="file" accept="image/*,.pdf" class="hidden" @change="uploadLicense($event, 'front')" />
                    <input ref="licUploadBack" type="file" accept="image/*,.pdf" class="hidden" @change="uploadLicense($event, 'back')" />
                    <button
                      type="button"
                      @click="(licUploadFront as any)?.click()"
                      :disabled="isUploadingLicense"
                      class="text-[11px] font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >+ Vorderseite</button>
                    <button
                      type="button"
                      @click="(licUploadBack as any)?.click()"
                      :disabled="isUploadingLicense"
                      class="text-[11px] font-medium px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >+ Rückseite</button>
                  </div>
                </div>

                <!-- Upload progress -->
                <div v-if="isUploadingLicense" class="flex items-center gap-2 text-sm text-gray-500 py-1">
                  <svg class="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Wird hochgeladen…
                </div>

                <div v-if="isLoadingDocuments" class="flex gap-2">
                  <div class="w-24 h-16 bg-gray-100 rounded-xl animate-pulse"/>
                  <div class="w-24 h-16 bg-gray-100 rounded-xl animate-pulse"/>
                </div>
                <div v-else-if="staffDocuments.length > 0" class="flex flex-wrap gap-2">
                  <button
                    v-for="doc in staffDocuments"
                    :key="doc.id"
                    type="button"
                    @click="lightboxUrl = doc.signedUrl"
                    class="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 w-24 h-16 flex-shrink-0 flex items-center justify-center hover:border-gray-400 transition-colors"
                    :title="doc.title || doc.file_name"
                  >
                    <img
                      v-if="doc.signedUrl && (doc.file_type?.startsWith('image/') || !doc.file_type)"
                      :src="doc.signedUrl"
                      class="w-full h-full object-cover"
                      alt=""
                    />
                    <div v-else class="flex flex-col items-center gap-1 text-gray-400">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                      <span class="text-[10px]">PDF</span>
                    </div>
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <svg class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                    </div>
                    <span v-if="doc.side" class="absolute bottom-0.5 left-0.5 text-[9px] font-semibold text-white bg-black/50 rounded px-1">{{ doc.side === 'front' ? 'Vorne' : doc.side === 'back' ? 'Hinten' : doc.side }}</span>
                    <span v-if="doc.is_verified" class="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </span>
                  </button>
                </div>
                <p v-else-if="!isUploadingLicense" class="text-sm text-gray-400 italic">Noch kein Dokument hochgeladen</p>
              </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="px-5 pb-5 pt-3 border-t border-gray-100" style="padding-bottom: max(20px, env(safe-area-inset-bottom, 20px))">
              <button
                @click="saveEditProfile"
                :disabled="isSavingProfile"
                class="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50 flex items-center justify-center gap-2"
                :style="{ background: primaryColor }"
              >
                <svg v-if="isSavingProfile" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {{ isSavingProfile ? 'Speichern…' : 'Speichern' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Document Lightbox -->
      <Transition enter-active-class="transition ease-out duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="lightboxUrl" class="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4" @click="lightboxUrl = null">
          <img :src="lightboxUrl" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Dokument" />
          <button @click="lightboxUrl = null" class="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- Exam Statistics Modal -->
    <StaffExamStatistics
      v-if="showExamStatistics"
      :current-user="props.currentUser"
      @close="showExamStatistics = false"
    />

    <!-- Cash Control Modal -->
    <div v-if="showCashControl" class="fixed inset-0 z-[300] bg-black bg-opacity-50 flex items-center justify-center p-4" style="padding-top: max(16px, env(safe-area-inset-top, 16px))">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h3 class="text-lg font-semibold text-gray-900">Meine Kassen</h3>
          <button
            @click="showCashControl = false"
            class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
          >
            ×
          </button>
        </div>
        <div class="p-4">
          <StaffCashBalance :current-user="props.currentUser" />
        </div>
      </div>
    </div>

    <!-- Affiliate Modal -->
    <div v-if="showAffiliateModal" class="fixed inset-0 z-[300] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
          <h3 class="text-lg font-semibold text-gray-900">🎁 Freunde empfehlen</h3>
          <button @click="showAffiliateModal = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold">×</button>
        </div>
        <div class="p-5 space-y-4 overflow-y-auto">

          <!-- Info Link -->
          <button @click="showAffiliateInfoModal = true" class="w-full flex items-center gap-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-xl px-4 py-3 transition text-left">
            <span class="w-5 h-5 rounded-full border border-green-500 text-green-600 text-[10px] font-bold flex items-center justify-center shrink-0">i</span>
            <span>Wie funktioniert das Empfehlungs- programm? <span class="underline font-medium">Mehr erfahren →</span></span>
          </button>

          <!-- Funnel Stats -->
          <div v-if="affiliateStats || !affiliateLoading" class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div class="relative bg-gray-50 rounded-xl p-3 text-center cursor-pointer hover:bg-gray-100 transition" @click="openReferralDetail('leads')">
                <span class="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[9px] font-bold flex items-center justify-center leading-none">i</span>
                <div class="text-xl font-bold text-gray-800">{{ affiliateLeads.filter(l => l.status !== 'converted').length }}</div>
                <div class="text-xs text-gray-500 mt-0.5">Interessenten</div>
              </div>
              <div class="relative bg-blue-50 rounded-xl p-3 text-center cursor-pointer hover:bg-blue-100 transition" @click="openReferralDetail('pending')">
                <span class="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-blue-300 text-blue-400 text-[9px] font-bold flex items-center justify-center leading-none">i</span>
                <div class="text-xl font-bold text-blue-700">{{ affiliateReferrals.filter(r => r.status === 'pending').length }}</div>
                <div class="text-xs text-gray-500 mt-0.5">Registrierungen</div>
              </div>
            </div>
            <div class="relative bg-green-50 rounded-xl p-3 text-center cursor-pointer hover:bg-green-100 transition" @click="openReferralDetail('credited')">
              <span class="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-green-300 text-green-400 text-[9px] font-bold flex items-center justify-center leading-none">i</span>
              <div class="text-xl font-bold text-green-700">{{ affiliateReferrals.filter(r => r.status === 'credited').length }}</div>
              <div class="text-xs text-gray-500 mt-0.5">1. Fahrstunde bezahlt</div>
            </div>
            <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-semibold text-green-800">Dein Guthaben</span>
              </div>
              <span class="text-base font-bold text-green-700">CHF {{ ((affiliateStats?.current_balance_rappen || 0) / 100).toFixed(0) }}</span>
            </div>
          </div>
          <div v-else class="flex justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>

          <!-- Link generieren -->
          <div v-if="!affiliateCode">
            <p class="text-sm text-gray-600 mb-3">Aktiviere deinen persönlichen Empfehlungslink und teile ihn mit Bekannten. Du erhältst eine Gutschrift, wenn jemand seine erste Fahrstunde bezahlt.</p>
            <button
              @click="generateAffiliateCode"
              :disabled="affiliateGenerating"
              class="w-full bg-purple-600 text-white rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50"
            >
              <span v-if="affiliateGenerating">Wird erstellt…</span>
              <span v-else>🚀 Link aktivieren</span>
            </button>
          </div>

          <!-- Link anzeigen -->
          <div v-else class="space-y-3">
            <div class="rounded-xl border-2 border-purple-400 overflow-hidden">
              <div class="px-3 py-2.5 bg-purple-50">
                <p class="text-xs font-mono truncate text-gray-700">{{ affiliateShareLink }}</p>
              </div>
              <button @click="copyAffiliateLink" class="w-full text-sm font-bold py-2.5 bg-purple-600 hover:bg-purple-700 text-white transition">
                {{ affiliateCopied ? '✓ Kopiert' : '📋 Link kopieren' }}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <a
                :href="`https://wa.me/?text=${encodeURIComponent('Ich empfehle dir die Fahrschule Driving Team! Melde dich hier an: ' + affiliateShareLink)}`"
                target="_blank"
                class="text-center font-semibold py-2.5 rounded-xl text-white text-sm transition"
                style="background-color: #25D366"
              >📱 WhatsApp</a>
              <a
                :href="`mailto:?subject=Fahrschule%20Empfehlung&body=${encodeURIComponent('Ich empfehle dir die Fahrschule Driving Team!\n\nMelde dich hier an: ' + affiliateShareLink)}`"
                class="text-center font-semibold py-2.5 rounded-xl text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >✉️ E-Mail</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Referral Detail Sub-Modal -->
    <Teleport to="body">
      <div v-if="showReferralDetail" class="fixed inset-0 z-[400] bg-black bg-opacity-50 flex items-center justify-center p-4" @click.self="showReferralDetail = false">
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[80vh] flex flex-col">
        <div class="border-b px-5 py-4 flex justify-between items-center shrink-0">
          <h3 class="font-semibold text-gray-900">{{ referralDetailTitle }}</h3>
          <button @click="showReferralDetail = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold">×</button>
        </div>
        <div class="overflow-y-auto p-4">
          <div v-if="filteredReferralDetail.length === 0" class="text-sm text-gray-400 text-center py-6">
            Keine Einträge
          </div>
          <div class="space-y-2">
            <template v-if="referralDetailFilter === 'leads'">
              <div v-for="lead in filteredReferralDetail" :key="lead.id" class="bg-gray-50 rounded-lg px-3 py-2.5">
                <div class="text-xs text-gray-400">Angemeldet am {{ new Date(lead.created_at).toLocaleDateString('de-CH') }}</div>
                <div class="text-sm font-medium text-gray-800 mt-0.5">{{ lead.first_name }} {{ lead.last_name }}</div>
              </div>
            </template>
            <template v-else-if="referralDetailFilter === 'credited'">
              <div v-for="tx in filteredReferralDetail" :key="tx.id" class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div class="min-w-0">
                  <div class="text-sm font-medium text-gray-800 truncate">{{ tx.referred_user_name }}</div>
                  <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <span>{{ new Date(tx.created_at).toLocaleDateString('de-CH') }}</span>
                    <span v-if="tx.category" class="inline-block bg-gray-200 text-gray-600 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none">{{ tx.category }}</span>
                  </div>
                </div>
                <span class="ml-3 shrink-0 text-sm font-bold text-green-700">+CHF {{ ((tx.amount_rappen || 0) / 100).toFixed(2) }}</span>
              </div>
              <div v-if="filteredReferralDetail.length > 0" class="mt-3 pt-3 border-t flex justify-between items-center">
                <span class="text-sm font-semibold text-gray-600">Total verdient</span>
                <span class="text-sm font-bold text-green-700">CHF {{ (filteredReferralDetail.reduce((sum: number, t: any) => sum + (t.amount_rappen ?? 0), 0) / 100).toFixed(2) }}</span>
              </div>
            </template>
            <template v-else>
              <div v-for="ref in filteredReferralDetail" :key="ref.id" class="bg-gray-50 rounded-lg px-3 py-2.5">
                <div class="text-xs text-gray-400">Registriert am {{ new Date(ref.created_at).toLocaleDateString('de-CH') }}</div>
                <div class="text-sm font-medium text-gray-800 mt-0.5">{{ ref.users?.first_name }} {{ ref.users?.last_name }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
      </div>
    </Teleport>

    <!-- Affiliate Info Modal -->
    <Teleport to="body">
      <div v-if="showAffiliateInfoModal" class="fixed inset-0 z-[400] bg-black bg-opacity-50 flex items-center justify-center p-4" @click.self="showAffiliateInfoModal = false">
        <div class="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[85vh] flex flex-col">
          <div class="border-b px-5 py-4 flex justify-between items-center shrink-0">
            <h3 class="font-semibold text-gray-900">Wie funktioniert's?</h3>
            <button @click="showAffiliateInfoModal = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold">×</button>
          </div>
          <div class="overflow-y-auto p-5 space-y-5">
            <div class="space-y-3">
              <div class="flex gap-3">
                <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">1</div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Link aktivieren & teilen</p>
                  <p class="text-xs text-gray-500 mt-0.5">Aktiviere zuerst deinen persönlichen Empfehlungslink und teile ihn dann mit Freunden, Familie oder Kollegen.</p>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">2</div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Person registriert sich</p>
                  <p class="text-xs text-gray-500 mt-0.5">Die Person meldet sich über deinen Link bei der Fahrschule an.</p>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">3</div>
                <div>
                  <p class="text-sm font-semibold text-gray-800">Erste Fahrstunde bezahlt</p>
                  <p class="text-xs text-gray-500 mt-0.5">Sobald diese Person die erste Fahrstunde bezahlt, wird dir automatisch eine Prämie gutgeschrieben.</p>
                </div>
              </div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <p class="text-sm font-bold text-amber-800">⚠️ Wichtig: Bitte zuerst teilen und dann anmelden!</p>
              <p class="text-xs text-amber-700 leading-relaxed">Schick deinen Link <span class="font-semibold">zuerst</span> – und bitte die Person, sich direkt darüber anzumelden. Danach können wir den Affiliate-Link leider nicht mehr aktivieren.</p>
            </div>
            <div>
              <p class="text-sm font-semibold text-gray-800 mb-2">Prämien pro Kategorie</p>
              <div v-if="affiliateRewardsList.length" class="space-y-1.5">
                <div v-for="r in affiliateRewardsList" :key="r.driving_category" class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span class="text-sm font-medium text-gray-700">Kategorie {{ r.driving_category }}</span>
                  <span class="text-sm font-bold text-green-700">CHF {{ (r.reward_rappen / 100).toFixed(0) }}</span>
                </div>
              </div>
            </div>
            <p class="text-xs text-gray-400 border-t pt-3">Das Guthaben wird deinem Konto gutgeschrieben und kann für Fahrstunden verwendet oder ausgezahlt werden.</p>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Calendar Integration Modal -->
    <div v-if="showCalendarIntegration" class="fixed inset-0 z-[300] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900">📅 Kalender-Integration</h3>
          <button
            @click="showCalendarIntegration = false"
            class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
          >
            ×
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Calendar Link Section -->
          <div class="space-y-4">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">📱</span>
              <h4 class="text-md font-semibold text-gray-900">Handy-Kalender Integration</h4>
            </div>
            
            <!-- Loading State -->
            <div v-if="isLoadingCalendarToken" class="flex items-center space-x-2 text-gray-500">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span class="text-sm">Laden...</span>
            </div>
            
            <!-- No Token Yet -->
            <div v-else-if="!calendarTokenLink" class="space-y-3">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start space-x-2">
                  <span class="text-blue-600 text-lg">ℹ️</span>
                  <div class="text-sm text-blue-800">
                    <strong>Kalender-Link erstellen</strong><br>
                    Generieren Sie einen persönlichen Link um Ihre Termine in Ihrem Handy-Kalender anzuzeigen.
                  </div>
                </div>
              </div>
              
              <button
                @click="generateCalendarToken"
                :disabled="isGeneratingToken"
                class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span v-if="isGeneratingToken" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span>{{ isGeneratingToken ? 'Generiere...' : 'Kalender-Link generieren' }}</span>
              </button>
            </div>
            
            <!-- Has Token -->
            <div v-else class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ihr Kalender-Link:</label>
                <div class="flex space-x-2">
                  <input
                    :value="calendarTokenLink"
                    readonly
                    class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 text-gray-600"
                  >
                  <button
                    @click="copyCalendarLink"
                    class="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    Kopieren
                  </button>
                </div>
              </div>
              
              <div class="bg-green-50 p-3 rounded-lg">
                <div class="flex items-start space-x-2">
                  <span class="text-green-600 text-sm">✅</span>
                  <div class="text-sm text-green-800">
                    <strong>Anleitung iPhone:</strong><br>
                    1. Kopieren Sie den Link<br>
                    2. Öffnen Sie Einstellungen → Kalender → Accounts<br>
                    3. Tippen Sie auf "Account hinzufügen" → "Kalenderabo hinzufügen"<br>
                    4. Fügen Sie den Link ein und bestätigen Sie
                  </div>
                </div>
              </div>
              
              <button
                @click="generateCalendarToken"
                :disabled="isGeneratingToken"
                class="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span v-if="isGeneratingToken" class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></span>
                <span>{{ isGeneratingToken ? 'Generiere...' : 'Neuen Link generieren (alter wird ungültig)' }}</span>
              </button>
            </div>
          </div>

          <!-- Registration Link Section -->
          <div class="space-y-4">
            <div class="flex items-center space-x-2">
              <span class="text-2xl">👥</span>
              <h4 class="text-md font-semibold text-gray-900">Schüler-Registrierung</h4>
            </div>
            
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Registrierungs-Link:</label>
                <div class="flex space-x-2">
                  <input
                    :value="registrationLink"
                    readonly
                    class="tenant-focus flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 focus:ring-2"
                  />
                  <button
                    @click="copyToClipboard(registrationLink, 'Registrierungs-Link')"
                    class="px-4 py-2 text-white rounded text-sm transition-colors hover:opacity-90"
                    :style="{ background: primaryColor }"
                  >
                    Kopieren
                  </button>
                </div>
              </div>
              
              <div class="bg-green-50 p-3 rounded-lg">
                <div class="flex items-start space-x-2">
                  <span class="text-green-600 text-sm">📧</span>
                  <div class="text-sm text-green-800">
                    <strong>Verwendung:</strong> Senden Sie diesen Link per SMS, E-Mail oder WhatsApp an neue Schüler. 
                    Sie können sich direkt registrieren und Termine buchen.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="border-t pt-4">
            <h4 class="text-md font-semibold text-gray-900 mb-3">Schnellaktionen</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                @click="shareViaWhatsApp"
                class="flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <span>📱</span>
                <span>WhatsApp teilen</span>
              </button>
              <button
                @click="shareViaEmail"
                class="flex items-center justify-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                :style="{ background: primaryColor }"
              >
                <span>📧</span>
                <span>E-Mail teilen</span>
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>

    <!-- Toast Notification -->
    <Toast
      :show="showToast"
      :type="toastType"
      :title="toastTitle"
      :message="toastMessage"
      @close="closeToast"
    />

    <!-- New Location Modal -->
    <div v-if="showNewLocationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300]">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h3 class="text-lg font-semibold">Neuen Standort erstellen</h3>
          <button @click="showNewLocationModal = false" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Standortname *</label>
            <input
              v-model="newLocationForm.name"
              type="text"
              placeholder="z.B. Treffpunkt A"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2"
            />
          </div>

          <!-- Address -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
            <div class="relative">
              <input
                v-model="newLocationForm.address"
                @input="onAddressSearch"
                @blur="hideAddressSuggestionsDelayed"
                @focus="showAddressSuggestions = true"
                @keyup.enter="selectFirstAddressSuggestion"
                type="text"
                placeholder="z.B. Bahnhofstrasse 1, 8048 Zürich"
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2"
              />
              
              <!-- Google Places Suggestions -->
              <div v-if="showAddressSuggestions && addressSuggestions.length > 0" class="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto mt-1">
                <div
                  v-for="suggestion in addressSuggestions"
                  :key="suggestion.place_id"
                  @mousedown.prevent="selectAddressSuggestion(suggestion)"
                  class="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div class="font-medium text-gray-900 text-sm">
                    {{ suggestion.structured_formatting?.main_text || suggestion.description }}
                  </div>
                  <div class="text-xs text-gray-600">
                    {{ suggestion.structured_formatting?.secondary_text || '' }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Available Categories -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Verfügbare Kategorien:</label>
            <div class="space-y-2">
              <label v-for="cat in availableCategories" :key="cat.id" class="flex items-center">
                <input
                  type="checkbox"
                  :value="cat.code"
                  v-model="newLocationForm.available_categories"
                  class="tenant-focus w-4 h-4 border-gray-300 rounded focus:ring-2"
                  :style="{ accentColor: primaryColor }"
                />
                <span class="ml-2 text-sm text-gray-700">{{ cat.name }} ({{ cat.code }})</span>
              </label>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-gray-50">
          <button
            @click="showNewLocationModal = false"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            Abbrechen
          </button>
          <button
            @click="createNewLocation"
            :disabled="!newLocationForm.name || !newLocationForm.address || newLocationForm.available_categories.length === 0"
            class="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors hover:opacity-90"
            :style="{ background: primaryColor }"
          >
            Erstellen & Hinzufügen
          </button>
        </div>
      </div>
    </div>

  <!-- ── Detail Modal: Persönliche Monatsübersicht ─────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showMonthlyDetailModal"
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      @click.self="showMonthlyDetailModal = false"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Meine Arbeitsstunden</h2>
            <div class="flex items-center gap-2 mt-0.5">
              <select
                v-model="monthlyHoursYear"
                @change="loadMonthlyHours"
                class="text-sm px-2 py-1 border border-gray-300 rounded-md"
              >
                <option v-for="y in monthlyHoursYears" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>
          <button @click="showMonthlyDetailModal = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <!-- Balance pills -->
        <div class="px-6 pt-4 flex items-center flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">Aktueller Saldo:</span>
            <span
              class="text-sm font-bold px-2 py-0.5 rounded-full"
              :class="monthlyHoursData.adjusted_balance >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'"
            >
              {{ formatMonthlyBalance(monthlyHoursData.adjusted_balance) }}
            </span>
            <span
              v-if="(monthlyHoursData.vacation_balance_hours ?? 0) < 0"
              class="text-xs text-orange-600"
              title="Ferien-Überschuss wird von der Überzeit abgezogen"
            >⚠ Ferien-Überschuss</span>
          </div>
          <div v-if="monthlyHoursData.vacation_balance_days != null" class="flex items-center gap-2">
            <span class="text-sm text-gray-500">Ferien-Saldo:</span>
            <span
              class="text-sm font-bold px-2 py-0.5 rounded-full"
              :class="monthlyHoursData.vacation_balance_days >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
            >
              {{ monthlyHoursData.vacation_balance_days > 0 ? '+' : '' }}{{ monthlyHoursData.vacation_balance_days }} T
            </span>
            <span class="text-xs text-gray-400">
              von {{ monthlyHoursData.vacation_entitlement_days ?? 20 }} Tagen
              <template v-if="(monthlyHoursData as any).vacation_carry_over_days > 0">
                <span class="text-green-600">(+{{ (monthlyHoursData as any).vacation_carry_over_days }} Vortrag)</span>
              </template>
            </span>
          </div>
          <span class="text-xs text-gray-400">{{ monthlyHoursData.weekly_contracted_hours }}h/Woche vertraglich</span>
        </div>
        <!-- Body -->
        <div class="overflow-auto flex-1 p-6 pt-3">
          <div v-if="isLoadingMonthlyHours" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
          </div>
          <div v-else-if="!monthlyHoursData.months?.length" class="text-center text-gray-400 py-8">
            <p class="font-medium">Noch keine Stundendaten für {{ monthlyHoursYear }}</p>
            <p class="text-xs mt-1 text-gray-400">Stunden werden automatisch jeden Monat berechnet.<br>Bitte Administrator kontaktieren falls Daten fehlen.</p>
          </div>
          <div v-else class="space-y-2">
            <div class="flex justify-end">
              <button
                @click="hoursTableExpanded = !hoursTableExpanded"
                class="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="hoursTableExpanded" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                </svg>
                {{ hoursTableExpanded ? 'Kompakt' : 'Alle Spalten' }}
              </button>
            </div>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th class="px-2 py-2 text-left">Monat</th>
                  <th v-if="hoursTableExpanded" class="px-2 py-2 text-right">Arbeits-<br>tage</th>
                  <th class="px-2 py-2 text-right">Soll</th>
                  <th class="px-2 py-2 text-right">Ist</th>
                  <th v-if="hoursTableExpanded" class="px-2 py-2 text-right">Ferien</th>
                  <th v-if="hoursTableExpanded" class="px-2 py-2 text-right">Krank</th>
                  <th v-if="hoursTableExpanded" class="px-2 py-2 text-right">Admin</th>
                  <th class="px-2 py-2 text-right">Diff</th>
                  <th class="px-2 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  v-for="m in monthlyHoursData.months"
                  :key="m.month"
                  :class="{ 'bg-blue-50/50': m.month === currentMonthNum && monthlyHoursYear === currentYear }"
                  class="hover:bg-gray-50"
                >
                  <td class="px-2 py-2 font-medium text-gray-900">{{ shortMonthNames[m.month - 1] }}</td>
                  <td v-if="hoursTableExpanded" class="px-2 py-2 text-right text-gray-500">{{ m.working_days ?? '–' }}</td>
                  <td class="px-2 py-2 text-right text-gray-500">
                    <span v-if="m.target_hours != null">{{ Math.round(m.target_hours) }}h</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td class="px-2 py-2 text-right font-medium text-gray-900">
                    <span v-if="m.actual_hours != null">{{ m.actual_hours.toFixed(1) }}h</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td v-if="hoursTableExpanded" class="px-2 py-2 text-right text-emerald-600">
                    <span v-if="m.vacation_hours != null && m.vacation_hours > 0">{{ m.vacation_hours.toFixed(1) }}h</span>
                    <span v-else class="text-gray-300">–</span>
                  </td>
                  <td v-if="hoursTableExpanded" class="px-2 py-2 text-right text-orange-600">{{ (m.sick_hours ?? 0) > 0 ? Number(m.sick_hours).toFixed(1) + 'h' : '–' }}</td>
                  <td v-if="hoursTableExpanded" class="px-2 py-2 text-right text-purple-600">{{ (m.admin_hours ?? 0) > 0 ? Number(m.admin_hours).toFixed(1) + 'h' : '–' }}</td>
                  <td class="px-2 py-2 text-right font-semibold" :class="m.overtime_hours != null && (m.cumulative_overtime !== null || m.actual_hours > 0) ? getOvertimeColor(m.overtime_hours) : 'text-gray-300'">
                    <span v-if="m.overtime_hours != null && (m.cumulative_overtime !== null || m.actual_hours > 0)">{{ formatMonthlyBalance(m.overtime_hours) }}</span>
                    <span v-else>–</span>
                  </td>
                  <td class="px-2 py-2 text-right font-bold" :class="m.cumulative_overtime !== null ? getOvertimeColor(m.cumulative_overtime) : 'text-gray-300'">
                    <span v-if="m.cumulative_overtime !== null">{{ formatMonthlyBalance(m.cumulative_overtime) }}</span>
                    <span v-else>–</span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
        <div class="px-6 py-3 border-t flex justify-end">
          <button @click="showMonthlyDetailModal = false" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700">Schliessen</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import { logger } from '~/utils/logger'
import { navigateTo } from '#app/composables/router'
// ✅ Removed direct Supabase import - using secure APIs via useDatabaseQuery
import Toast from '~/components/Toast.vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import ExamLocationSearchDropdown from './ExamLocationSearchDropdown.vue'
import StaffExamStatistics from './StaffExamStatistics.vue'
import StaffCashBalance from './StaffCashBalance.vue'
import { useStaffWorkingHours, WEEKDAYS, type WorkingDayForm, type WorkingHourBlock } from '~/composables/useStaffWorkingHours'
import { useTenant } from '~/composables/useTenant'
import { useDatabaseQuery } from '~/composables/useDatabaseQuery'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useAuthStore } from '~/stores/auth'

const { primaryColor } = useTenantBranding()

interface Props {
  currentUser: any
}

interface ExamLocation {
  id: string
  name: string
  address: string
  city?: string
  canton?: string
  postal_code?: string
  available_categories?: string[]
  contact_phone?: string   
  is_active: boolean
  display_order?: number
  created_at?: string
  updated_at?: string
}

interface StaffExamLocation {
  id: string
  staff_id: string
  name: string           
  address: string       
  categories: string[] 
  is_active: boolean
  created_at: string
  updated_at: string    
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'settings-updated': []
}>()

// Tenant composable
const { currentTenant, tenantSlug } = useTenant()

// Redirect to tenant login on expired/invalid session
const handleSessionError = (err: any): boolean => {
  const status = err?.response?.status ?? err?.statusCode ?? err?.status
  const message = (err?.message ?? '').toLowerCase()
  const isSessionError =
    status === 401 ||
    status === 403 ||
    message.includes('unauthorized') ||
    message.includes('not authenticated') ||
    message.includes('session expired') ||
    message.includes('jwt') ||
    message.includes('token expired')
  if (isSessionError) {
    navigateTo(tenantSlug.value ? `/${tenantSlug.value}` : '/login')
    return true
  }
  return false
}

// ── Edit Profile ──────────────────────────────────────────────────────────────
// Local copy of user data so the header updates immediately after save
const localUser = ref({ ...props.currentUser })

const showEditProfile = ref(false)
const isSavingProfile = ref(false)
const editProfileSuccess = ref(false)
const editProfileError = ref<string | null>(null)

const editForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  category: [] as string[],
})

const isLoadingProfile = ref(false)
const availableCategories = ref<{ id: string; code: string; name: string }[]>([])
const licUploadFront = ref<HTMLInputElement | null>(null)
const licUploadBack = ref<HTMLInputElement | null>(null)
const isUploadingLicense = ref(false)

const uploadLicense = async (event: Event, side: 'front' | 'back') => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  isUploadingLicense.value = true
  try {
    const fd = new FormData()
    fd.append('userId', props.currentUser.id)
    if (side === 'front') fd.append('frontFile', file)
    else fd.append('backFile', file)

    await $fetch('/api/admin/upload-license', { method: 'POST', body: fd })
    await loadStaffDocuments()
  } catch (err: any) {
    logger.warn('⚠️ License upload failed:', err?.message)
  } finally {
    isUploadingLicense.value = false
    // Reset input so the same file can be re-selected
    if (side === 'front' && licUploadFront.value) licUploadFront.value.value = ''
    if (side === 'back' && licUploadBack.value) licUploadBack.value.value = ''
  }
}

interface StaffDocument {
  id: string
  document_type: string
  side: string | null
  file_name: string
  file_type: string
  storage_path: string
  title: string | null
  is_verified: boolean
  created_at: string
  signedUrl: string | null
}
const staffDocuments = ref<StaffDocument[]>([])
const isLoadingDocuments = ref(false)
const lightboxUrl = ref<string | null>(null)

const loadStaffDocuments = async () => {
  isLoadingDocuments.value = true
  try {
    const res = await $fetch<{ data: StaffDocument[] }>('/api/staff/get-my-documents')
    staffDocuments.value = res?.data || []
  } catch (err: any) {
    logger.warn('⚠️ Could not load staff documents:', err?.message)
  } finally {
    isLoadingDocuments.value = false
  }
}

const openEditProfile = async () => {
  editProfileSuccess.value = false
  editProfileError.value = null
  showEditProfile.value = true
  isLoadingProfile.value = true

  // Pre-fill from what we have so the modal isn't blank while loading
  editForm.value = {
    first_name: localUser.value.first_name || '',
    last_name: localUser.value.last_name || '',
    email: localUser.value.email || '',
    phone: localUser.value.phone || '',
    street: localUser.value.street || '',
    street_nr: localUser.value.street_nr || '',
    zip: localUser.value.zip || '',
    city: localUser.value.city || '',
    category: localUser.value.category ? [...localUser.value.category] : [],
  }

  try {
    const [profileRes, catRes] = await Promise.all([
      $fetch<{ data: any }>(`/api/staff/get-user`, {
        query: {
          id: props.currentUser.id,
          fields: 'id,first_name,last_name,email,phone,street,street_nr,zip,city,category',
        },
      }),
      availableCategories.value.length === 0
        ? $fetch<{ success: boolean; data: any[] }>('/api/staff/get-categories')
        : Promise.resolve(null),
      loadStaffDocuments(),
    ])

    if (profileRes?.data) {
      Object.assign(localUser.value, profileRes.data)
      editForm.value = {
        first_name: profileRes.data.first_name || '',
        last_name: profileRes.data.last_name || '',
        email: profileRes.data.email || '',
        phone: profileRes.data.phone || '',
        street: profileRes.data.street || '',
        street_nr: profileRes.data.street_nr || '',
        zip: profileRes.data.zip || '',
        city: profileRes.data.city || '',
        category: profileRes.data.category ? [...profileRes.data.category] : [],
      }
    }

    if (catRes?.data) {
      const all = catRes.data
      const subs = all.filter((c: any) => c.parent_category_id != null)
      const parents = all.filter((c: any) => c.parent_category_id == null)
      const parentIdsWithSubs = new Set(subs.map((c: any) => c.parent_category_id).filter(Boolean))
      const parentsWithoutSubs = parents.filter((p: any) => !parentIdsWithSubs.has(p.id))
      const merged = [...subs, ...parentsWithoutSubs].sort((a, b) =>
        String(a.name || a.code || '').localeCompare(String(b.name || b.code || ''), 'de', { sensitivity: 'base' })
      )
      availableCategories.value = merged
    }
  } catch (err: any) {
    logger.warn('⚠️ Could not load full profile for edit:', err?.message)
  } finally {
    isLoadingProfile.value = false
  }
}

const saveEditProfile = async () => {
  isSavingProfile.value = true
  editProfileError.value = null
  editProfileSuccess.value = false
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/staff/update-profile', {
      method: 'POST',
      body: editForm.value,
    })
    if (res?.data) {
      Object.assign(localUser.value, res.data)
    }
    editProfileSuccess.value = true
    setTimeout(() => {
      showEditProfile.value = false
      editProfileSuccess.value = false
    }, 1500)
  } catch (err: any) {
    editProfileError.value = err?.data?.statusMessage || 'Speichern fehlgeschlagen'
  } finally {
    isSavingProfile.value = false
  }
}

// Exam Statistics Modal State
const showExamStatistics = ref(false)

// Cash Control Modal State
const showCashControl = ref(false)

// Affiliate Modal State
const showAffiliateModal = ref(false)
const showAffiliateInfoModal = ref(false)
const affiliateCode = ref<string | null>(null)
const affiliateShareLink = ref('')
const affiliateStats = ref<any>(null)
const affiliateReferrals = ref<any[]>([])
const affiliateRewardTransactions = ref<any[]>([])
const affiliateLeads = ref<any[]>([])
const showReferralDetail = ref(false)
const referralDetailFilter = ref<'leads' | 'credited' | 'pending'>('leads')

const affiliateRewardsList = computed(() => affiliateStats.value?.category_rewards ?? [])

const referralDetailTitle = computed(() => ({
  leads: 'Interessenten',
  credited: '1. Fahrstunde bezahlt',
  pending: 'Registrierungen',
}[referralDetailFilter.value]))

const filteredReferralDetail = computed(() => {
  if (referralDetailFilter.value === 'leads') {
    return affiliateLeads.value.filter(l => l.status !== 'converted')
  }
  if (referralDetailFilter.value === 'credited') {
    return affiliateRewardTransactions.value
  }
  return affiliateReferrals.value.filter(r => r.status === 'pending')
})

const openReferralDetail = (filter: 'leads' | 'credited' | 'pending') => {
  referralDetailFilter.value = filter
  showReferralDetail.value = true
}
const affiliateCopied = ref(false)
const affiliateGenerating = ref(false)
const affiliateLoading = ref(false)
const affiliateEnabled = ref(
  typeof window !== 'undefined' && localStorage.getItem('staff_affiliateEnabled') === 'true'
)

// Calendar Integration Modal State
const showCalendarIntegration = ref(false)

// Toast State
const showToast = ref(false)
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('info')
const toastTitle = ref('')
const toastMessage = ref('')

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveSuccess = ref(false)
const availableExamLocations = ref<ExamLocation[]>([])
const staffExamLocations = ref<StaffExamLocation[]>([])
const isLoadingExamLocations = ref(false)
const isSavingExamLocation = ref(false)


// Accordion State
const openSections = reactive({
  externalCalendars: false,
  locations: false,
  categories: false,
  durations: false,
  worktime: false,
  notifications: false,
  workingStats: false,
  examLocations: false,
  deviceManager: false,
  voucherCodes: false
})

// NEUE STATE für Prüfungsstandorte
const examLocations = ref<any[]>([])
const newExamLocation = ref({
  name: '',
  address: '',
  categories: [] as string[]
})

// NEUE STATE für Arbeitszeit
const monthlyStats = ref({
  currentMonth: { worked: 0, planned: 0 },
  nextMonth: { planned: 0 },
  previousMonth: { worked: 0 },
  twoMonthsAgo: { worked: 0 },
  threeMonthsAgo: { worked: 0 }
})

// ── Monatliche Stundenübersicht (Monatslohn) ──────────────────────────────────
const currentYear = new Date().getFullYear()
const currentMonthNum = new Date().getMonth() + 1
const monthlyHoursYear = ref(currentYear)
const monthlyHoursYears = computed(() => [currentYear - 1, currentYear, currentYear + 1])
const isLoadingMonthlyHours = ref(false)
const monthlyHoursData = ref<{
  salary_type: string
  weekly_contracted_hours: number
  current_balance: number
  adjusted_balance: number
  vacation_balance_hours?: number
  vacation_balance_days?: number | null
  vacation_entitlement_days?: number
  months: any[]
}>({ salary_type: 'hourly', weekly_contracted_hours: 0, current_balance: 0, adjusted_balance: 0, months: [] })

const shortMonthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

const showMonthlyDetailModal = ref(false)
const hoursTableExpanded = ref(false)

const loadMonthlyHours = async () => {
  isLoadingMonthlyHours.value = true
  try {
    const response = await $fetch('/api/staff/monthly-hours', {
      query: { year: monthlyHoursYear.value }
    }) as any
    if (response.success) {
      monthlyHoursData.value = response
    }
  } catch (err) {
    // Silently fail – user may be hourly staff
  } finally {
    isLoadingMonthlyHours.value = false
  }
}

// ── Ferien-Übersicht (Stundenlohn-Staff) ──────────────────────────────────────
const vacationApptsYear = ref(currentYear)
const isLoadingVacationApts = ref(false)
const vacationApptsData = ref<{
  periods: { from: string; to: string; days: number }[]
  used_vacation_days: number
  remaining_vacation_days: number
}>({ periods: [], used_vacation_days: 0, remaining_vacation_days: 0 })

const loadVacationAppointments = async () => {
  isLoadingVacationApts.value = true
  try {
    const response = await $fetch('/api/staff/vacation-appointments', {
      query: { year: vacationApptsYear.value }
    }) as any
    if (response.success) {
      vacationApptsData.value = response
    }
  } catch {
    // non-fatal
  } finally {
    isLoadingVacationApts.value = false
  }
}

const formatMonthlyBalance = (hours: number): string => {
  const abs = Math.abs(hours)
  const h = Math.floor(abs)
  const m = Math.round((abs - h) * 60)
  const formatted = m > 0 ? `${h}h ${m}m` : `${h}h`
  return hours >= 0 ? `+${formatted}` : `-${formatted}`
}

const getOvertimeColor = (hours: number): string => {
  if (hours > 0.05) return 'text-blue-600'
  if (hours < -0.05) return 'text-red-600'
  return 'text-gray-500'
}


// Data
const selectedCategories = ref<number[]>([])
const myLocations = ref<any[]>([])
const allTenantLocations = ref<any[]>([]) // Alle Standard-Standorte des Tenants
const categoryDurations = ref<Record<string, number[]>>({})

// Working Hours Management
const { 
  workingHours: staffWorkingHours,
  isLoading: isLoadingWorkingHours,
  loadWorkingHours,
  saveWorkingHour,
  saveWorkingDay,
  workingHoursByDay
} = useStaffWorkingHours()

// Working Hours Form (per day) - Legacy für Kompatibilität
const workingHoursForm = ref<Record<number, { start_time: string; end_time: string; is_active: boolean }>>({})

// Neue Working Day Form (mehrere Blöcke pro Tag)
const workingDayForm = ref<Record<number, WorkingDayForm>>({})
const weekdays = WEEKDAYS
const isSavingWorkingHours = ref(false)

// New Location Modal
const showNewLocationModal = ref(false)

// New Location Form
const newLocationForm = ref({
  name: '',
  address: '',
  available_categories: [] as string[]
})

// Address autocomplete
const addressSuggestions = ref<any[]>([])
const showAddressSuggestions = ref(false)
let addressSuggestionsTimeout: any = null

// Google Places Library
let placesLibrary: any = null
let newApiBlocked = false

// Initialize Google Places
const initGooglePlaces = async () => {
  if (placesLibrary) return
  
  try {
    const { Place, AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
    placesLibrary = { Place, AutocompleteSuggestion }
    logger.debug('✅ Google Places (New API) initialized')
  } catch (error) {
    console.warn('⚠️ New Places API failed, using legacy API:', error)
    placesLibrary = null
    if (window.google?.maps?.places) {
      logger.debug('✅ Google Places (Legacy) initialized')
    }
  }
}

// Address search with Google Places
const onAddressSearch = async () => {
  const query = newLocationForm.value.address.trim()
  
  if (query.length < 3) {
    addressSuggestions.value = []
    showAddressSuggestions.value = false
    return
  }

  try {
    // Try new API first
    if (placesLibrary?.AutocompleteSuggestion && !newApiBlocked) {
      try {
        const request = {
          input: query,
          includedRegionCodes: ['CH'],
          language: 'de'
        }

        const { suggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        
        if (suggestions && suggestions.length > 0) {
          addressSuggestions.value = suggestions.map((suggestion: any) => ({
            place_id: suggestion.placePrediction?.placeId || `new_${Date.now()}_${Math.random()}`,
            description: suggestion.placePrediction?.text?.text || 'Unbekannter Ort',
            structured_formatting: {
              main_text: suggestion.placePrediction?.mainText?.text || '',
              secondary_text: suggestion.placePrediction?.secondaryText?.text || ''
            }
          }))
          showAddressSuggestions.value = true
          return
        }
      } catch (newApiError) {
        console.warn('New Places API failed:', newApiError)
        newApiBlocked = true
      }
    }

    // Fall back to legacy API
    if (window.google?.maps?.places?.AutocompleteService) {
      const autocompleteService = new window.google.maps.places.AutocompleteService()
      
      const request = {
        input: query,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'ch' },
        language: 'de'
      }

      autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          addressSuggestions.value = predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting
          }))
          showAddressSuggestions.value = true
        } else {
          addressSuggestions.value = []
        }
      })
    }
  } catch (err: any) {
    console.error('Error searching places:', err)
    addressSuggestions.value = []
  }
}

// Select address suggestion
const selectAddressSuggestion = (suggestion: any) => {
  newLocationForm.value.address = suggestion.description
  addressSuggestions.value = []
  showAddressSuggestions.value = false
}

// Select first suggestion on enter
const selectFirstAddressSuggestion = () => {
  if (addressSuggestions.value.length > 0) {
    selectAddressSuggestion(addressSuggestions.value[0])
  }
}

// Hide address suggestions after delay
const hideAddressSuggestionsDelayed = () => {
  addressSuggestionsTimeout = setTimeout(() => {
    showAddressSuggestions.value = false
  }, 200)
}

// Constants
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Computed
const filteredCategoriesForDurations = computed(() => {
  return availableCategories.value.filter(cat => 
    selectedCategories.value.includes(cat.id)
  )
})

// Registered Locations (wo Staff bereits eintragen ist)
const registeredLocations = computed(() => {
  return allTenantLocations.value.filter(loc => 
    loc.staff_ids && Array.isArray(loc.staff_ids) && loc.staff_ids.includes(props.currentUser?.id)
  )
})

// Available Locations (wo Staff sich noch eintragen kann)
const availableLocationsForSignup = computed(() => {
  return allTenantLocations.value.filter(loc => 
    !loc.staff_ids || !Array.isArray(loc.staff_ids) || !loc.staff_ids.includes(props.currentUser?.id)
  )
})

// Calendar Integration Links
const calendarTokenLink = ref<string | null>(null)
const isGeneratingToken = ref(false)
const isLoadingCalendarToken = ref(false)

// Legacy computed (fallback)
const calendarLink = computed(() => {
  if (calendarTokenLink.value) return calendarTokenLink.value
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const staffId = props.currentUser?.id
  return `${baseUrl}/api/calendar/ics?staff_id=${staffId}`
})

// Load existing calendar token on mount
const loadCalendarToken = async () => {
  if (!props.currentUser?.id) return
  
  isLoadingCalendarToken.value = true
  try {
    logger.debug('📅 Loading existing calendar token...')
    
    const response = await $fetch<{ success: boolean; token: string | null; calendarLink: string | null }>('/api/calendar/get-token')
    
    if (response?.calendarLink) {
      calendarTokenLink.value = response.calendarLink
      logger.debug('✅ Calendar token loaded:', calendarTokenLink.value)
    } else {
      logger.debug('ℹ️ No active calendar token found')
      calendarTokenLink.value = null
    }
  } catch (error: any) {
    logger.error('❌ Error loading calendar token:', error)
  } finally {
    isLoadingCalendarToken.value = false
  }
}

// Generate new calendar token (invalidates old one)
const generateCalendarToken = async () => {
  if (!props.currentUser?.id) return
  
  isGeneratingToken.value = true
  try {
    // ✅ Use secure API - Auth is handled via HTTP-Only cookies automatically
    const response: any = await $fetch('/api/calendar/generate-token', {
      method: 'POST'
    })
    
    if (response?.success && response?.calendarLink) {
      calendarTokenLink.value = response.calendarLink
      logger.debug('✅ Calendar token generated:', response.calendarLink)
      showSuccessToast('Kalender-Link generiert', 'Neuer Link wurde erstellt. Der alte Link ist nun ungültig.')
    } else {
      throw new Error(response?.message || 'Token generation failed')
    }
  } catch (error: any) {
    logger.error('❌ Error generating calendar token:', error)
    showErrorToast('Fehler', error?.message || 'Kalender-Link konnte nicht generiert werden')
  } finally {
    isGeneratingToken.value = false
  }
}

// Copy calendar link to clipboard
const copyCalendarLink = async () => {
  if (!calendarTokenLink.value) {
    showErrorToast('Fehler', 'Bitte generieren Sie zuerst einen Kalender-Link')
    return
  }
  await copyToClipboard(calendarTokenLink.value, 'Kalender-Link')
}

const registrationLink = computed(() => {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  // Use the service selection page first
  return `${baseUrl}/services/driving-team`
})

const activeExamLocations = computed(() => {
  // Filtere basierend auf Namen-Matching (wie in StaffSettings)
  return availableExamLocations.value.filter(examLoc => {
    return staffExamLocations.value.some(staffLoc => 
      staffLoc.name === examLoc.name && staffLoc.is_active
    )
  })
})

// computed properties:
const currentMonthName = computed(() => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth(), 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const previousMonthName = computed(() => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const twoMonthsAgoName = computed(() => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const threeMonthsAgoName = computed(() => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const nextMonthName = computed(() => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

// Helper function für lokale Zeit-Parsing
const parseLocalDateTime = (dateTimeStr: string): Date => {
  // Entferne Timezone-Indikatoren (Z, +00:00, +00)
  const cleanStr = dateTimeStr.replace('+00:00', '').replace('+00', '').replace('Z', '').trim()
  
  // Parse als lokale Zeit - unterstützt beide Formate (mit T oder Leerzeichen)
  const parts = cleanStr.includes('T') ? cleanStr.split('T') : cleanStr.split(' ')
  
  if (parts.length < 2) {
    console.warn('Invalid datetime format:', dateTimeStr)
    return new Date()
  }
  
  const [datePart, timePart] = parts
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = timePart.split(':').map(Number)
  
  // Erstelle Date-Objekt in lokaler Zeitzone
  return new Date(year, month - 1, day, hour, minute, second || 0)
}

// Methods
// In StaffSettings.vue - ersetzen Sie die Funktion mit dieser typisierten Version:
import { saveWithOfflineSupport } from '~/utils/offlineQueue'

const loadExamLocations = async () => {
  if (!props.currentUser?.id) return;

  isLoadingExamLocations.value = true;
  error.value = null;

  try {
    const staffId = props.currentUser.id;

    // 1. Load all available exam locations for this tenant
    logger.debug('🔍 Loading all Swiss exam locations (global)')
    const allResponse = await $fetch<any>('/api/staff/get-all-exam-locations')
    const allLocations = allResponse?.data || []
    logger.debug('✅ Loaded exam locations:', allLocations.length)
    logger.debug('🔍 First few locations:', allLocations.slice(0, 5))
    
    // All locations for the tenant (to show all possible options)
    availableExamLocations.value = allLocations;

    // 2. Staff-specific: filter to only ones where this staff is in staff_ids
    staffExamLocations.value = allLocations.filter((loc: any) => {
      const staffIds = Array.isArray(loc.staff_ids) ? loc.staff_ids : []
      return staffIds.includes(staffId)
    });

    logger.debug('✅ Prüfungsstandorte geladen:', {
      verfügbar: availableExamLocations.value.length,
      aktiviert_durch_Mitarbeiter: staffExamLocations.value.length,
      aktive_namen: staffExamLocations.value.map((loc: any) => loc.name)
    });

  } catch (err: any) {
    console.error('❌ Fehler beim Laden der Prüfungsstandorte:', err);
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Laden: ${err.message}`;
    }
  } finally {
    isLoadingExamLocations.value = false
  }
}

// Exam preferences state
const examPreferences = ref<string[]>([])

// API-based exam preferences functions
const getStaffExamPreferences = (): string[] => {
  // Preferences sind jetzt server-side in der Session/API
  // Diese Funktion gibt nur den aktuellen UI-State zurück
  return examPreferences.value
}

const saveStaffExamPreferences = async (staffId: string, locationIds: string[]) => {
  try {
    const result = await $fetch('/api/staff/exam-preferences', {
      method: 'POST',
      body: {
        staffId,
        locationIds
      }
    })
    examPreferences.value = locationIds
    logger.debug('✅ Exam preferences saved via API:', locationIds)
    return result
  } catch (err: any) {
    logger.error('Error saving exam preferences:', err)
    throw err
  }
}

// Neue Funktion für das Toggling von Exam Locations
const toggleExamLocation = async (location: any) => {
  if (!props.currentUser?.id) {
    console.error('❌ Keine Benutzer-ID vorhanden, kann Standort nicht umschalten.');
    return;
  }

  isSavingExamLocation.value = true;
  error.value = null;

  try {
    const authStore = useAuthStore()
    const staffId = props.currentUser.id;
    const authUserId = authStore.user?.id;

    if (!authUserId) throw new Error('Not authenticated')

    const isCurrentlyActive = isExamLocationActive(location.id)
    const action = isCurrentlyActive ? 'removeLocation' : 'addLocation'

    await $fetch('/api/staff/exam-locations', {
      method: 'POST',
      body: {
        action,
        data: { authUserId, staffId, location }
      }
    })

    logger.debug(`✅ Prüfungsstandort ${action === 'addLocation' ? 'aktiviert' : 'deaktiviert'}:`, location.name)

  } catch (err: any) {
    console.error('❌ Fehler beim Umschalten des Prüfungsstandorts:', err);
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Speichern der Präferenz: ${err.message}`;
    }
  } finally {
    isSavingExamLocation.value = false;
    await loadExamLocations();
  }
}


const loadAllData = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Exam Locations werden nur in der Prüfungsstandorte-Sektion geladen
    // Standard Locations werden separat geladen
    logger.debug('✅ Basic data loading completed')
  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    if (!handleSessionError(err)) {
      error.value = err.message
    }
  } finally {
    isLoading.value = false
  }
}

const isExamLocationActive = (examLocationId: string): boolean => {
  // Finde die Location anhand der ID in availableExamLocations
  const examLocation = availableExamLocations.value.find(loc => loc.id === examLocationId)
  if (!examLocation) return false
  
  // Prüfe ob ein Staff-Location mit dem gleichen Namen existiert und aktiv ist
  return staffExamLocations.value.some(staffLoc => 
    staffLoc.name === examLocation.name && staffLoc.is_active
  )
}

const getExamLocationMapsUrl = (location: any): string => {
  const query = encodeURIComponent(location.address)
  return `https://maps.google.com/maps?q=${query}`
}

// New function to handle exam locations changes from dropdown
const handleExamLocationsChanged = (locations: any[]) => {
  logger.debug('🔄 Exam locations changed:', locations.length)
  // Reload the staff exam locations to reflect changes
  loadExamLocations()
}

// New function to remove exam location
const removeExamLocation = async (location: any) => {
  if (!props.currentUser?.id) {
    console.error('❌ Keine Benutzer-ID vorhanden, kann Standort nicht entfernen.')
    return
  }

  isSavingExamLocation.value = true
  error.value = null

  try {
    const { query } = useDatabaseQuery()
    const staffId = props.currentUser.id

    // Remove from database
    await query({
      action: 'delete',
      table: 'locations',
      filters: [
        { column: 'staff_id', operator: 'eq', value: staffId },
        { column: 'name', operator: 'eq', value: location.name },
        { column: 'address', operator: 'eq', value: location.address },
        { column: 'location_type', operator: 'eq', value: 'exam' }
      ]
    })

    logger.debug('✅ Prüfungsstandort entfernt:', location.name)
    
    // Reload the data
    await loadExamLocations()

  } catch (err: any) {
    console.error('❌ Fehler beim Entfernen des Prüfungsstandorts:', err)
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Entfernen: ${err.message}`
    }
  } finally {
    isSavingExamLocation.value = false
  }
}


const toggleSection = (section: keyof typeof openSections) => {
  openSections[section] = !openSections[section]
}

const getAllPossibleDurations = () => {
  const durations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

const getRelevantDurations = (category: any) => {
  // Zeige nur relevante Dauern basierend auf Kategorie
  const allDurations = getAllPossibleDurations()
  const baseMinutes = category.lesson_duration_minutes || 45
  
  if (baseMinutes <= 45) {
    return allDurations.filter(d => d.value <= 135)
  } else if (baseMinutes <= 90) {
    return allDurations.filter(d => d.value >= 90 && d.value <= 180)
  } else {
    return allDurations.filter(d => d.value >= 135)
  }
}

const isDurationSelectedForCategory = (categoryCode: string, duration: number) => {
  return categoryDurations.value[categoryCode]?.includes(duration) || false
}

const toggleDurationForCategory = (categoryCode: string, duration: number) => {
  if (!categoryDurations.value[categoryCode]) {
    categoryDurations.value[categoryCode] = []
  }
  
  const index = categoryDurations.value[categoryCode].indexOf(duration)
  if (index > -1) {
    categoryDurations.value[categoryCode].splice(index, 1)
  } else {
    categoryDurations.value[categoryCode].push(duration)
    categoryDurations.value[categoryCode].sort((a, b) => a - b)
  }
}

const toggleCategory = (categoryId: number) => {
  const index = selectedCategories.value.indexOf(categoryId)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryId)
  }
}

// Legacy function - not used in new working hours system
// const toggleDay = (dayNumber: number) => {
//   const index = availableDays.value.indexOf(dayNumber)
//   if (index > -1) {
//     availableDays.value.splice(index, 1)
//   } else {
//     availableDays.value.push(dayNumber)
//   }
// }

// Old location creation function - now handled by createNewLocation modal

const addExamLocation = async () => {
  if (!newExamLocation.value.name || !newExamLocation.value.address) return

  try {
    const { query } = useDatabaseQuery()
    
    // Insert via secure API
    const data = await query({
      action: 'insert',
      table: 'locations',
      data: {
        staff_ids: [props.currentUser.id],
        tenant_id: props.currentUser.tenant_id,
        name: newExamLocation.value.name,
        address: newExamLocation.value.address,
        available_categories: newExamLocation.value.categories,
        location_type: 'exam',
        is_active: true
      }
    })

    if (data && data.length > 0) {
      examLocations.value.push(data[0])
      
      // Reset form
      newExamLocation.value = {
        name: '',
        address: '',
        categories: []
      }

      logger.debug('✅ Exam location added:', data[0])
    }

  } catch (err: any) {
    console.error('❌ Error adding exam location:', err)
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Hinzufügen: ${err.message}`
    }
  }
}


// Create new location
const createNewLocation = async () => {
  if (!props.currentUser?.tenant_id || !newLocationForm.value.name || !newLocationForm.value.address) {
    alert('Bitte füllen Sie alle erforderlichen Felder aus')
    return
  }

  try {
    const { query } = useDatabaseQuery()
    
    // Insert via secure API
    const data = await query({
      action: 'insert',
      table: 'locations',
      data: {
        name: newLocationForm.value.name,
        address: newLocationForm.value.address,
        staff_ids: [props.currentUser.id],
        tenant_id: props.currentUser.tenant_id,
        available_categories: newLocationForm.value.available_categories,
        location_type: 'standard',
        is_active: true
      }
    })

    if (data && data.length > 0) {
      // Add to local state
      allTenantLocations.value.push(data[0])
      
      // Reset form and close modal
      resetLocationForm()
      showNewLocationModal.value = false
      
      logger.debug('✅ Location created successfully:', data[0])
    }
  } catch (err: any) {
    console.error('❌ Error creating location:', err)
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Erstellen: ${err.message}`
    }
    alert(`Fehler: ${err.message}`)
  }
}

// Reset location form
const resetLocationForm = () => {
  newLocationForm.value = {
    name: '',
    address: '',
    available_categories: []
  }
}

// Toggle Location Assignment (Hinzufügen/Entfernen) - für Standard Locations
const toggleLocationAssignment = async (locationId: string) => {
  try {
    const { query } = useDatabaseQuery()
    const staffId = props.currentUser?.id

    // Finde die Location
    const location = allTenantLocations.value.find(loc => loc.id === locationId)
    if (!location) {
      throw new Error('Location nicht gefunden')
    }

    // Aktuelle staff_ids (Array oder leer)
    let currentStaffIds = Array.isArray(location.staff_ids) ? [...location.staff_ids] : []

    // Toggle: hinzufügen oder entfernen
    if (currentStaffIds.includes(staffId)) {
      // Entfernen
      currentStaffIds = currentStaffIds.filter(id => id !== staffId)
      logger.debug(`🔥 Removing staff ${staffId} from location ${locationId}`)
    } else {
      // Hinzufügen
      currentStaffIds.push(staffId)
      logger.debug(`🔥 Adding staff ${staffId} to location ${locationId}`)
    }

    // Update via secure API
    await query({
      action: 'update',
      table: 'locations',
      filters: [{ column: 'id', operator: 'eq', value: locationId }],
      data: { staff_ids: currentStaffIds }
    });

    const locationIndex = allTenantLocations.value.findIndex(loc => loc.id === locationId)
    if (locationIndex >= 0) {
      allTenantLocations.value[locationIndex].staff_ids = currentStaffIds
    }

    logger.debug('✅ Location assignment updated successfully')
  } catch (err: any) {
    console.error('❌ Error in toggleLocationAssignment:', err)
    handleSessionError(err)
  }
}

// ✨ NEW: Toggle Location Online Bookable Status
const toggleLocationBookable = async (locationId: string, isOnlineBookable: boolean) => {
  try {
    logger.debug(`📍 Toggling online bookable for location ${locationId} to ${isOnlineBookable}`)
    
    const staffId = props.currentUser?.id
    if (!staffId) {
      throw new Error('Staff ID nicht gefunden')
    }

    // Call the API to update staff_locations.is_online_bookable
    const response = await $fetch<{ success: boolean }>('/api/staff/update-location-booking', {
      method: 'POST',
      body: {
        location_id: locationId,
        is_online_bookable: isOnlineBookable
      }
    })

    if (response.success) {
      // Update local state
      const locationIndex = allTenantLocations.value.findIndex(loc => loc.id === locationId)
      if (locationIndex >= 0) {
        allTenantLocations.value[locationIndex].is_online_bookable = isOnlineBookable
      }
      
      logger.debug(`✅ Location booking status updated: ${isOnlineBookable ? 'online' : 'offline'}`)
      saveSuccess.value = true
      setTimeout(() => { saveSuccess.value = false }, 3000)
    }
  } catch (err: any) {
    console.error('❌ Error toggling location bookable status:', err)
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Aktualisieren: ${err.message}`
    }
  }
}

// Toggle Exam Location Assignment - für Prüfungsstandorte
// Automatisches Erstellen wenn nicht vorhanden, oder Update von staff_ids
const toggleExamLocationAssignment = async (sourceLocation: any) => {
  try {
    const { query } = useDatabaseQuery()
    const staffId = props.currentUser?.id
    const tenantId = props.currentUser?.tenant_id

    if (!staffId || !tenantId) {
      throw new Error('Staff ID oder Tenant ID fehlt')
    }

    logger.debug(`🔍 Toggling exam location: ${sourceLocation.name} for staff ${staffId} in tenant ${tenantId}`)

    // Step 1: Prüfe ob diese Location bereits im Tenant existiert via secure API
    const existingLocations = await query({
      action: 'select',
      table: 'locations',
      select: '*',
      filters: [
        { column: 'name', operator: 'eq', value: sourceLocation.name },
        { column: 'address', operator: 'eq', value: sourceLocation.address },
        { column: 'location_type', operator: 'eq', value: 'exam' },
        { column: 'tenant_id', operator: 'eq', value: tenantId }
      ]
    })

    const existingLocation = existingLocations && existingLocations.length > 0 ? existingLocations[0] : null

    if (existingLocation) {
      // Step 2a: Location existiert bereits → Update staff_ids
      logger.debug(`📍 Location exists, updating staff_ids`)
      let currentStaffIds = Array.isArray(existingLocation.staff_ids) ? [...existingLocation.staff_ids] : []

      if (currentStaffIds.includes(staffId)) {
        // Entfernen
        currentStaffIds = currentStaffIds.filter(id => id !== staffId)
        logger.debug(`➖ Removing staff from location`)
      } else {
        // Hinzufügen
        currentStaffIds.push(staffId)
        logger.debug(`➕ Adding staff to location`)
      }

      await query({
        action: 'update',
        table: 'locations',
        filters: [{ column: 'id', operator: 'eq', value: existingLocation.id }],
        data: { staff_ids: currentStaffIds }
      })

      logger.debug(`✅ Updated staff_ids: ${currentStaffIds.join(', ')}`)
    } else {
      // Step 2b: Location existiert nicht → Neuen Eintrag erstellen via secure API
      logger.debug(`📍 Location doesn't exist, creating new one`)
      await query({
        action: 'insert',
        table: 'locations',
        data: {
          name: sourceLocation.name,
          address: sourceLocation.address,
          city: sourceLocation.city,
          postal_code: sourceLocation.postal_code,
          canton: sourceLocation.canton,
          location_type: 'exam',
          is_active: true,
          tenant_id: tenantId,
          staff_ids: [staffId],
          google_place_id: sourceLocation.google_place_id || null
        }
      })

      logger.debug(`✅ Created new exam location with staff ${staffId}`)
    }

    // Reload exam locations
    await loadExamLocations()

  } catch (err: any) {
    console.error('❌ Error in toggleExamLocationAssignment:', err)
    if (!handleSessionError(err)) {
      error.value = `Fehler: ${err.message}`
    }
  }
}

const removeLocation = async (locationId: string) => {
  try {
    logger.debug('🔥 Removing location:', locationId)
    
    await saveWithOfflineSupport(
      'locations',           // table
      {},                   // data (leer bei delete)
      'delete',             // action
      { id: locationId },   // where
      `Standort löschen`    // operation name
    )
    
    logger.debug('🔍 Delete response - success')
    
    // Optimistic Update - sofort aus UI entfernen
    myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
    logger.debug('✅ Location removed successfully')
    
  } catch (err: any) {
    console.error('❌ Error in removeLocation:', err)
    
    // Spezielle Behandlung für Foreign Key Constraint (behält Ihre Logik bei)
    if (err.code === '23503') {
      error.value = 'Dieser Standort kann nicht gelöscht werden, da er noch von Terminen verwendet wird. Bitte löschen Sie zuerst alle Termine an diesem Standort.'
      return
    }
    
    if (handleSessionError(err)) return

    // Offline-Support: Benutzerfreundliche Meldung
    if (err.message?.includes('synchronisiert')) {
      // Optimistic Update auch bei Offline
      myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
      error.value = null // Kein Fehler anzeigen
      
      // Optional: Success-Message für Offline
      logger.debug('📦 Location will be deleted when online')
    } else {
      // Alle anderen Fehler normal behandeln
      error.value = `Fehler beim Löschen: ${err.message}`
    }
  }
}

const loadData = async () => {
  if (!props.currentUser?.id) return

  isLoading.value = true
  error.value = null

  try {
    logger.debug('🔥 Loading staff settings data...')

    // Kategorien laden via Backend API
    const categoriesResponse = await $fetch<any>('/api/staff/get-categories').catch(() => ({ data: [] }))
    const categories = categoriesResponse?.data || categoriesResponse?.categories || []
    
    // Filter categories: 
    // - Show all subcategories (parent_category_id != null)
    // - Show only main categories that DON'T have subcategories
    const allCategories = categories || []
    
    // Get IDs of all main categories that have subcategories
    const mainCatsWithSubs = new Set(
      allCategories
        .filter((cat: any) => cat.parent_category_id)
        .map((cat: any) => cat.parent_category_id)
    )
    
    // Show subcategories + main categories without subcategories
    availableCategories.value = allCategories.filter((cat: any) => 
      cat.parent_category_id || // All subcategories
      !mainCatsWithSubs.has(cat.id) // Main categories without subcategories
    )
    
    logger.debug('📋 Available categories for location creation:', {
      total: allCategories.length,
      subcategoriesCount: allCategories.filter((c: any) => c.parent_category_id).length,
      mainWithoutSubCount: allCategories.filter((c: any) => !c.parent_category_id && !mainCatsWithSubs.has(c.id)).length,
      displayCount: availableCategories.value.length
    })

    // Alle Standard-Standorte des Tenants laden via Backend API
    const locationsResponse = await $fetch<any>('/api/staff/get-locations').catch(() => ({ data: [] }))
    const allLocations = locationsResponse?.data || locationsResponse?.locations || []
    
    // Parse staff_ids from JSON strings to arrays
    allTenantLocations.value = (allLocations || []).map((loc: any) => ({
      ...loc,
      staff_ids: typeof loc.staff_ids === 'string' ? JSON.parse(loc.staff_ids) : loc.staff_ids
    }))

    // Load all staff_locations for this staff to get is_online_bookable status
    try {
      const staffLocResponse = await $fetch<{ staff_locations?: Array<{ location_id: string; is_online_bookable: boolean }> }>('/api/staff/get-location-bookable-status')
      const staffLocationRecords = staffLocResponse?.staff_locations || []

      if (staffLocationRecords && staffLocationRecords.length > 0) {
        // Create a map for quick lookup
        const staffLocMap = new Map(staffLocationRecords.map((sl: any) => [sl.location_id, sl.is_online_bookable]))
        
        // Enrich allTenantLocations with is_online_bookable status
        allTenantLocations.value = allTenantLocations.value.map((loc: any) => ({
          ...loc,
          is_online_bookable: staffLocMap.has(loc.id) ? staffLocMap.get(loc.id) : true // Default to true if no entry
        }))
        
        logger.debug('✅ Loaded staff_locations online bookable settings')
      }
    } catch (err: any) {
      logger.warn('⚠️ Could not load staff_locations online bookable status:', err.message)
      // Continue without the online bookable status - it will default to true
    }

    // myLocations für Backward-Compatibility (wird nicht mehr verwendet)
    myLocations.value = registeredLocations.value

    // Zugewiesene Kategorien laden (temporär deaktiviert - Tabelle existiert nicht)
    // TODO: Implementiere staff_categories Tabelle oder alternative Lösung
    selectedCategories.value = []

    // Lektionsdauern laden (temporär deaktiviert - Tabelle existiert nicht)
    // TODO: Implementiere staff_category_durations Tabelle oder alternative Lösung
    categoryDurations.value = {}

    // Staff Settings laden (temporär deaktiviert - Tabelle existiert nicht)
    // TODO: Implementiere staff_settings Tabelle oder alternative Lösung
    logger.debug('🔥 Staff settings loading disabled - table does not exist')

    logger.debug('✅ All data loaded successfully')

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    if (!handleSessionError(err)) {
      error.value = `Fehler beim Laden: ${err.message}`
    }
  } finally {
    isLoading.value = false
  }
   await loadExamLocations() 
}

// Debug-Version der loadWorkingHoursData Funktion:

// Vollständige Debug-Version für alle 4 Monate:

const loadWorkingHoursData = async () => {
  logger.debug('🔍 DEBUG: Starting loadWorkingHoursData')
  
  if (!props.currentUser?.id) {
    logger.debug('❌ DEBUG: No currentUser.id found')
    return
  }
  
  try {
    logger.debug('🔍 DEBUG: Querying appointments for staff_id:', props.currentUser.id)
    
    // Use the secure backend API instead of direct DB access
    const now = new Date()
    const threeMonthsAgoForQuery = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const nextMonthEndForQuery = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)

    const response = await $fetch<any>('/api/calendar/manage', {
      method: 'POST',
      body: {
        action: 'get-existing-appointments',
        staff_id: props.currentUser.id,
        start_date: threeMonthsAgoForQuery.toISOString(),
        end_date: nextMonthEndForQuery.toISOString()
      }
    })
    
    const appointments = response?.data || []
    
    logger.debug('🔍 DEBUG: Total appointments found:', appointments?.length || 0)
    
    if (!appointments || appointments.length === 0) {
      logger.debug('⚠️ DEBUG: No appointments found')
      return
    }
    
    // Filter nicht-gelöschte Termine
    const validAppointments = appointments.filter((apt: any) => 
      !apt.deleted_at // Nur nicht gelöschte Termine
    )
    
    // Filter Termine nach Zeitpunkt (in der Vergangenheit = gearbeitet, in der Zukunft = geplant)
    const workedAppointments = validAppointments.filter((apt: any) => {
      const appointmentDate = parseLocalDateTime(apt.appointment_datetime || apt.start_time)
      return appointmentDate < now // Start-Zeit in der Vergangenheit = gearbeitet
    })
    
    const plannedAppointments = validAppointments.filter((apt: any) => {
      const appointmentDate = parseLocalDateTime(apt.appointment_datetime || apt.start_time)
      return appointmentDate >= now // Start-Zeit in der Zukunft = geplant
    })
    
    logger.debug('🔍 DEBUG: Worked appointments (in past):', workedAppointments.length)
    logger.debug('🔍 DEBUG: Planned appointments (in future):', plannedAppointments.length)
    
    // Monatsgrenzen definieren
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    
    const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59)
    
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const threeMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59)
    
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
    
    // Hilfsfunktion zum Berechnen
    const calculateHoursFromAppointments = (appointments: any[]) => {
      const totalMinutes = appointments.reduce((sum, apt) => {
        const minutes = apt.duration_minutes || 45
        return sum + minutes
      }, 0)
      
      // Runde auf 0.05 genau (3 Minuten)
      return Math.round((totalMinutes / 60) * 20) / 20
    }
    
    // Hilfsfunktion zum Filtern nach Zeitraum
    const filterByPeriod = (appointments: any[], startDate: Date, endDate: Date) => {
      return appointments.filter(apt => {
        const appointmentDate = parseLocalDateTime(apt.appointment_datetime || apt.start_time)
        return appointmentDate >= startDate && appointmentDate <= endDate
      })
    }
    
    // Berechne GEARBEITETE Stunden (Vergangenheit) für alle Monate
    const currentMonthWorked = calculateHoursFromAppointments(
      filterByPeriod(workedAppointments, currentMonthStart, currentMonthEnd)
    )
    const previousMonthWorked = calculateHoursFromAppointments(
      filterByPeriod(workedAppointments, previousMonthStart, previousMonthEnd)
    )
    const twoMonthsAgoWorked = calculateHoursFromAppointments(
      filterByPeriod(workedAppointments, twoMonthsAgoStart, twoMonthsAgoEnd)
    )
    const threeMonthsAgoWorked = calculateHoursFromAppointments(
      filterByPeriod(workedAppointments, threeMonthsAgoStart, threeMonthsAgoEnd)
    )
    
    // Berechne GEPLANTE Stunden (Zukunft)
    const currentMonthPlanned = calculateHoursFromAppointments(
      filterByPeriod(plannedAppointments, currentMonthStart, currentMonthEnd)
    )
    const nextMonthPlanned = calculateHoursFromAppointments(
      filterByPeriod(plannedAppointments, nextMonthStart, nextMonthEnd)
    )
    
    logger.debug('🔍 DEBUG: Hours calculated:', {
      currentMonthWorked,
      currentMonthPlanned,
      nextMonthPlanned,
      previousMonthWorked,
      twoMonthsAgoWorked,
      threeMonthsAgoWorked
    })
    
    // Setze alle Werte
    monthlyStats.value.currentMonth.worked = currentMonthWorked
    monthlyStats.value.currentMonth.planned = currentMonthPlanned
    monthlyStats.value.nextMonth.planned = nextMonthPlanned
    monthlyStats.value.previousMonth.worked = previousMonthWorked
    monthlyStats.value.twoMonthsAgo.worked = twoMonthsAgoWorked
    monthlyStats.value.threeMonthsAgo.worked = threeMonthsAgoWorked
    
  } catch (error) {
    console.error('❌ DEBUG: Unexpected error:', error)
  }
}

const saveAllSettings = async () => {
  if (!props.currentUser?.id) return

  isSaving.value = true
  error.value = null
  saveSuccess.value = false

  try {
    // 1. Arbeitszeiten speichern
    logger.debug('💾 Saving working hours...')
    try {
      isSavingWorkingHours.value = true
      for (const day of weekdays) {
        const formData = workingHoursForm.value[day.value]
        logger.debug(`💾 Saving day ${day.value}:`, formData)
        
        await saveWorkingHour(props.currentUser.id, {
          day_of_week: day.value,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_active: formData.is_active
        })
      }
      logger.debug('✅ Working hours saved via saveAllSettings')
      isSavingWorkingHours.value = false
    } catch (whErr: any) {
      isSavingWorkingHours.value = false
      console.error('❌ Working hours save failed:', whErr)
      throw whErr
    }

    // 2. Staff-Kategorien speichern (temporär deaktiviert - Tabelle existiert nicht)
    logger.debug('🔥 Staff categories saving disabled - table does not exist')
    // TODO: Implementiere staff_categories Tabelle oder alternative Lösung

    // 3. Lektionsdauern speichern (temporär deaktiviert - Tabelle existiert nicht)
    logger.debug('🔥 Lesson durations saving disabled - table does not exist')
    // TODO: Implementiere staff_category_durations Tabelle oder alternative Lösung

    // 3. Staff Settings speichern (temporär deaktiviert - Tabelle existiert nicht)
    logger.debug('🔥 Staff settings saving disabled - table does not exist')
    // TODO: Implementiere staff_settings Tabelle oder alternative Lösung

    logger.debug('✅ All settings saved successfully!')
    saveSuccess.value = true
    emit('settings-updated')
    setTimeout(() => emit('close'), 1000)
    
    // Modal automatisch schließen nach erfolgreichem Speichern
    setTimeout(() => {
      saveSuccess.value = false
      emit('close')
    }, 1500)

  } catch (err: any) {
    console.error('❌ Error saving settings:', err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    isSaving.value = false
  }
}

// Exam Statistics Funktion
const openExamStatistics = () => {
  showExamStatistics.value = true
}

// Cash Control Funktion
const openCashControl = () => {
  showCashControl.value = true
}

// Affiliate Funktionen
const openAffiliateModal = async () => {
  showAffiliateModal.value = true
  affiliateLoading.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/stats')
    affiliateEnabled.value = result.data?.enabled !== false
    affiliateStats.value = result.data?.summary ?? null
    affiliateReferrals.value = result.data?.referrals ?? []
    affiliateRewardTransactions.value = result.data?.reward_transactions ?? []
    affiliateLeads.value = result.data?.leads ?? []
    if (result.data?.affiliate_code?.code) {
      affiliateCode.value = result.data.affiliate_code.code
      affiliateShareLink.value = result.data.share_link ?? ''
    }
  } catch (err) {
    console.error('Failed to load affiliate stats', err)
  } finally {
    affiliateLoading.value = false
  }
}

const generateAffiliateCode = async () => {
  affiliateGenerating.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/generate-code', { method: 'POST' })
    affiliateCode.value = result.data.code
    affiliateShareLink.value = result.data.link
  } catch (err) {
    console.error('Failed to generate affiliate code', err)
  } finally {
    affiliateGenerating.value = false
  }
}

const copyAffiliateLink = async () => {
  try {
    await navigator.clipboard.writeText(affiliateShareLink.value)
    affiliateCopied.value = true
    setTimeout(() => { affiliateCopied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

// Calendar Integration Funktion
const openCalendarIntegration = () => {
  showCalendarIntegration.value = true
}

// Copy to Clipboard Funktion
const copyToClipboard = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text)
    showSuccessToast(`${type} kopiert!`, 'Der Link wurde in die Zwischenablage kopiert.')
  } catch (err) {
    console.error('Failed to copy:', err)
    showErrorToast('Kopieren fehlgeschlagen', 'Bitte kopieren Sie den Link manuell.')
  }
}

// Share via WhatsApp
const shareViaWhatsApp = () => {
  const message = `Hallo! Hier ist der Link zur Registrierung für Fahrstunden: ${registrationLink.value}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(whatsappUrl, '_blank')
}

// Share via Email
const shareViaEmail = () => {
  const subject = 'Fahrstunden-Registrierung'
  const body = `Hallo!\n\nHier ist der Link zur Registrierung für Fahrstunden:\n${registrationLink.value}\n\nBeste Grüsse`
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoUrl)
}

// Toast functions
const showSuccessToast = (title: string, message: string = '') => {
  toastType.value = 'success'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
}

const showErrorToast = (title: string, message: string = '') => {
  toastType.value = 'error'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
}

const showWarningToast = (title: string, message: string = '') => {
  toastType.value = 'warning'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
}

const closeToast = () => {
  showToast.value = false
}

// Logout Funktion - nutzt authStore für korrektes Cookie/Session-Handling
const handleLogout = async () => {
  try {
    const authStore = useAuthStore()
    emit('close')
    // authStore.logout() handles cookie clearing, localStorage, Supabase signOut and redirect
    await authStore.logout()
  } catch (err: any) {
    console.error('❌ Logout error:', err)
    showErrorToast('Abmeldung fehlgeschlagen', 'Ein unerwarteter Fehler ist aufgetreten.')
  }
}

// Helper function to extract HH:MM from working hours data
// NOTE: UTC conversion is now done in useStaffWorkingHours.ts composable
// This function only normalizes the format (e.g. "07:00:00" → "07:00")
const formatWorkingTime = (timeValue: any): string => {
  if (!timeValue) return '08:00'
  
  // Parse the time string (format: HH:MM:SS or HH:MM)
  if (typeof timeValue === 'string' && timeValue.includes(':')) {
    const [hours, minutes] = timeValue.split(':')
    // Just normalize to HH:MM format - no UTC conversion needed anymore
    return `${String(parseInt(hours)).padStart(2, '0')}:${String(parseInt(minutes)).padStart(2, '0')}`
  }
  
  return '08:00'
}

// Working Hours Methods
const initializeWorkingHoursForm = () => {
  // Initialize form for all weekdays (Legacy)
  weekdays.forEach(day => {
    const existingHour = workingHoursByDay.value[day.value]
    workingHoursForm.value[day.value] = {
      start_time: formatWorkingTime(existingHour?.start_time),
      end_time: formatWorkingTime(existingHour?.end_time),
      is_active: existingHour?.is_active || false
    }
  })
  
  // Initialize new working day form for all weekdays
  weekdays.forEach(day => {
    // Hole ALLE Arbeitszeit-Einträge für diesen Tag (nicht nur einen)
    const dayWorkingHours = staffWorkingHours.value.filter(
      (wh: any) => wh.day_of_week === day.value && wh.is_active === true
    )
    
    logger.debug(`🔍 Initializing day ${day.value}:`, dayWorkingHours)
    
    // Wenn aktive Arbeitszeiten vorhanden sind, lade alle Blöcke
    if (dayWorkingHours.length > 0) {
      workingDayForm.value[day.value] = {
        day_of_week: day.value,
        is_active: true,
        blocks: dayWorkingHours.map((wh: any) => ({
          id: wh.id,
          start_time: formatWorkingTime(wh.start_time),
          end_time: formatWorkingTime(wh.end_time),
          is_active: true
        }))
      }
    } else {
      // Standard-Initialisierung (Tag inaktiv)
      workingDayForm.value[day.value] = {
        day_of_week: day.value,
        is_active: false,
        blocks: []
      }
    }
  })
  
  logger.debug('✅ Working day form initialized:', workingDayForm.value)
}

// Auto-Save für einzelnen Arbeitstag (Legacy)
const autoSaveWorkingHour = async (dayOfWeek: number) => {
  if (!props.currentUser?.id) return
  
  isSavingWorkingHours.value = true
  try {
    const formData = workingHoursForm.value[dayOfWeek]
    logger.debug(`💾 Auto-saving day ${dayOfWeek}:`, formData)
    
    await saveWorkingHour(props.currentUser.id, {
      day_of_week: dayOfWeek,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_active: formData.is_active
    })
    
    logger.debug(`✅ Day ${dayOfWeek} auto-saved successfully`)
    
    // Reload working hours to update calendar
    await loadWorkingHours(props.currentUser.id)
    logger.debug('🔄 Working hours reloaded after save')
    
    // Emit event to notify parent (calendar needs to reload)
    emit('settings-updated')
    
  } catch (err: any) {
    console.error(`❌ Error auto-saving day ${dayOfWeek}:`, err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    setTimeout(() => {
      isSavingWorkingHours.value = false
    }, 500) // Kurz anzeigen, dann ausblenden
  }
}

// Auto-Save für Working Day mit mehreren Blöcken
// Debounce-Timeout-IDs pro Tag
const autoSaveTimeouts = ref<Record<number, NodeJS.Timeout>>({})
// Flag um Race Conditions zu verhindern
const isAutoSaveInProgress = ref(false)

const autoSaveWorkingDay = async (dayOfWeek: number) => {
  if (!props.currentUser?.id) return
  
  // Verhindere mehrfache gleichzeitige Saves
  if (isAutoSaveInProgress.value) {
    logger.debug(`⏳ Auto-save already in progress, skipping day ${dayOfWeek}`)
    return
  }
  
  // Debounce: Vorheriges Timeout für diesen Tag löschen
  if (autoSaveTimeouts.value[dayOfWeek]) {
    clearTimeout(autoSaveTimeouts.value[dayOfWeek])
  }
  
  // Debounce: Speichern nach 500ms Inaktivität
  autoSaveTimeouts.value[dayOfWeek] = setTimeout(async () => {
    if (isAutoSaveInProgress.value) {
      logger.debug(`⏳ Auto-save already in progress (debounced), skipping day ${dayOfWeek}`)
      return
    }
    
    isAutoSaveInProgress.value = true
    isSavingWorkingHours.value = true
    
    try {
      const dayData = workingDayForm.value[dayOfWeek]
      logger.debug(`💾 Auto-saving working day ${dayOfWeek}:`, dayData)
      
      await saveWorkingDay(props.currentUser!.id, dayData)
      
      logger.debug(`✅ Working day ${dayOfWeek} auto-saved successfully`)
      
      // Reload working hours to update calendar (NICHT die Form!)
      await loadWorkingHours(props.currentUser!.id)
      logger.debug('🔄 Working hours reloaded after save')
      
      // Emit event to notify parent (calendar needs to reload)
      emit('settings-updated')
      
    } catch (err: any) {
      console.error(`❌ Error auto-saving working day ${dayOfWeek}:`, err)
      error.value = `Fehler beim Speichern: ${err.message}`
    } finally {
      setTimeout(() => {
        isSavingWorkingHours.value = false
        isAutoSaveInProgress.value = false
      }, 500) // Kurz anzeigen, dann ausblenden
    }
  }, 500) // 500ms Debounce
}

// Arbeitszeit-Block hinzufügen
const addWorkingBlock = (dayOfWeek: number) => {
  if (!workingDayForm.value[dayOfWeek]) {
    workingDayForm.value[dayOfWeek] = {
      day_of_week: dayOfWeek,
      is_active: true,
      blocks: []
    }
  }
  
  // Neuen Block hinzufügen
  const newBlock: WorkingHourBlock = {
    start_time: '09:00',
    end_time: '17:00',
    is_active: true
  }
  
  workingDayForm.value[dayOfWeek].blocks.push(newBlock)
  
  // Auto-save
  autoSaveWorkingDay(dayOfWeek)
}

// Arbeitszeit-Block entfernen
const removeWorkingBlock = (dayOfWeek: number, blockIndex: number) => {
  if (workingDayForm.value[dayOfWeek]?.blocks) {
    workingDayForm.value[dayOfWeek].blocks.splice(blockIndex, 1)
    
    // Wenn keine Blöcke mehr vorhanden, Tag deaktivieren
    if (workingDayForm.value[dayOfWeek].blocks.length === 0) {
      workingDayForm.value[dayOfWeek].is_active = false
    }
    
    // Auto-save
    autoSaveWorkingDay(dayOfWeek)
  }
}

const saveWorkingHours = async () => {
  if (!props.currentUser?.id) return
  
  isSavingWorkingHours.value = true
  try {
    logger.debug('💾 Saving working hours for staff:', props.currentUser.id)
    logger.debug('📊 Form data:', workingHoursForm.value)
    
    // Save each day's working hours (including inactive ones)
    for (const day of weekdays) {
      const formData = workingHoursForm.value[day.value]
      logger.debug(`💾 Saving day ${day.value}:`, formData)
      
      try {
        await saveWorkingHour(props.currentUser.id, {
          day_of_week: day.value,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_active: formData.is_active
        })
        logger.debug(`✅ Day ${day.value} saved successfully`)
      } catch (dayErr: any) {
        console.error(`❌ Error saving day ${day.value}:`, dayErr)
        throw dayErr
      }
    }
    
    logger.debug('✅ All working hours saved successfully')
    
    // Reload to confirm
    await loadWorkingHours(props.currentUser.id)
    
  } catch (err: any) {
    console.error('❌ Error saving working hours:', err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    isSavingWorkingHours.value = false
  }
}


const clearWorkingHours = async () => {
  if (!props.currentUser?.id) return
  
  if (!confirm('Möchten Sie wirklich alle Arbeitszeiten löschen?')) return
  
  isSavingWorkingHours.value = true
  try {
    const { query } = useDatabaseQuery()
    
    // Delete all working hours for this staff
    await query({
      action: 'delete',
      table: 'staff_working_hours',
      filters: [{ column: 'staff_id', operator: 'eq', value: props.currentUser.id }]
    })
    
    // Reload and reinitialize form
    await loadWorkingHours(props.currentUser.id)
    initializeWorkingHoursForm()
    
    logger.debug('✅ All working hours cleared')
    showSuccessToast('Arbeitszeiten gelöscht', 'Alle Arbeitszeiten wurden erfolgreich gelöscht!')
    
  } catch (err: any) {
    console.error('❌ Error clearing working hours:', err)
    showErrorToast('Fehler beim Löschen', err.message)
  } finally {
    isSavingWorkingHours.value = false
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await loadData()
  } catch (err) {
    logger.warn('ℹ️ loadData failed (non-fatal):', err)
  }
  
  try {
    await loadWorkingHoursData()
  } catch (err) {
    logger.warn('ℹ️ loadWorkingHoursData failed (non-fatal):', err)
  }
  
  try {
    await loadExamLocations()
  } catch (err) {
    logger.warn('ℹ️ loadExamLocations failed (non-fatal):', err)
  }
  
  // Load working hours from composable
  if (props.currentUser?.id) {
    try {
      await loadWorkingHours(props.currentUser.id)
    } catch (err) {
      logger.warn('ℹ️ loadWorkingHours failed (non-fatal):', err)
    }
  }
  
  // Initialize working hours form after data is loaded
  initializeWorkingHoursForm()
  
  // Load calendar token for calendar integration
  await loadCalendarToken()
  
  // Initialize Google Places for address autocomplete
  await initGooglePlaces()

  // Load affiliate enabled state so button is hidden if system is disabled
  try {
    const result = await $fetch<any>('/api/affiliate/stats')
    affiliateEnabled.value = result.data?.enabled !== false
    localStorage.setItem('staff_affiliateEnabled', String(affiliateEnabled.value))
  } catch { /* non-fatal */ }

  // Load monthly hours (visible for monthly-salary staff)
  try {
    await loadMonthlyHours()
  } catch { /* non-fatal */ }

  // Load vacation appointments for hourly staff overview
  try {
    await loadVacationAppointments()
  } catch { /* non-fatal */ }
})

// Watch for modal open to clear suggestions when closing
watch(() => showNewLocationModal.value, (isOpen) => {
  if (!isOpen) {
    addressSuggestions.value = []
    showAddressSuggestions.value = false
    if (addressSuggestionsTimeout) {
      clearTimeout(addressSuggestionsTimeout)
    }
  }
})

// Cleanup - Auto-Save Timeouts löschen
onBeforeUnmount(() => {
  Object.values(autoSaveTimeouts.value).forEach(timeout => {
    clearTimeout(timeout)
  })
  autoSaveTimeouts.value = {}
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

/* Modal backdrop animation */
.modal-backdrop {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Hide default checkbox styling for custom design */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Tenant-aware focus and toggle helpers */
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.tenant-toggle {
  --tw-ring-color: color-mix(in srgb, var(--color-primary, #1E40AF) 30%, transparent);
}
.peer:checked ~ .tenant-toggle {
  background-color: var(--color-primary, #1E40AF);
}
</style>