<!-- components/users/StaffTab.vue - Fahrlehrer-Tab mit Verfügbarkeits-Einstellungen -->
<template>
  <div v-if="isOnlineBookingEnabled" class="h-full flex flex-col">
    <!-- Header mit Add Button -->
    <div class="bg-white border-b p-3 sm:p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 class="text-base sm:text-lg font-medium text-gray-900">Verfügbarkeit & Online-Terminbuchung</h2>
        <button 
          v-if="currentUser.role === 'admin'"
          @click="addNewStaff"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap"
        >
          + Neuer Fahrlehrer
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <LoadingLogo size="xl" />
          <p class="text-gray-600 mt-4">Lade Fahrlehrer...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="loadStaff" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="staffList.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👨‍🏫</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Noch keine Fahrlehrer</h3>
          <p class="text-gray-600 mb-4">Fügen Sie den ersten Fahrlehrer hinzu</p>
          <button 
            v-if="currentUser.role === 'admin'"
            @click="addNewStaff"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Ersten Fahrlehrer hinzufügen
          </button>
        </div>
      </div>

      <!-- Staff Grid -->
      <div v-else class="h-full overflow-y-auto">
        <div class="p-3 sm:p-4 space-y-4 sm:space-y-6">
          <div
            v-for="staff in staffList"
            :key="staff.id"
            class="bg-white rounded-lg shadow-sm"
          >

            <!-- Verfügbarkeits-Einstellungen -->
            <div class="space-y-4">
              <!-- Verfügbarkeitsmodus -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbarkeitsmodus
                </label>
                <select 
                  v-model="staff.availability_mode"
                  @change="updateStaffAvailability(staff)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="standard">Nur Standard-Locations</option>
                  <option value="pickup">Umkreis-Abholung</option>
                  <option value="hybrid">Beide Optionen</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  {{ getAvailabilityModeDescription(staff.availability_mode) }}
                </p>
              </div>

              <!-- Peak-Time Konfiguration (nur bei Pickup-Modus) - Pro Fahrlehrer -->
              <div v-if="staff.availability_mode !== 'standard'" class="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <label class="block text-sm font-medium text-gray-900">
                    Stosszeiten für {{ staff.first_name }}
                  </label>
                </div>
                <p class="text-xs text-gray-600 mb-3">
                  Definieren Sie die individuellen Stosszeiten für diesen Fahrlehrer. In diesen Zeiten wird bei der Pickup-Berechnung mit erhöhtem Verkehr gerechnet.
                </p>
                
                <!-- Morgen-Stosszeit -->
                <div class="mb-3">
                  <label class="block text-xs font-medium text-gray-700 mb-2">Morgen (Mo-Fr)</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="time" 
                      v-model="staff.peak_time_morning_start"
                      @change="updateStaffAvailability(staff)"
                      class="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                    <span class="text-xs text-gray-600">bis</span>
                    <input 
                      type="time" 
                      v-model="staff.peak_time_morning_end"
                      @change="updateStaffAvailability(staff)"
                      class="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                  </div>
                </div>
                
                <!-- Abend-Stosszeit -->
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-2">Abend (Mo-Fr)</label>
                  <div class="flex items-center gap-2">
                    <input 
                      type="time" 
                      v-model="staff.peak_time_evening_start"
                      @change="updateStaffAvailability(staff)"
                      class="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                    <span class="text-xs text-gray-600">bis</span>
                    <input 
                      type="time" 
                      v-model="staff.peak_time_evening_end"
                      @change="updateStaffAvailability(staff)"
                      class="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                  </div>
                </div>
                
                <p class="text-xs text-gray-500 mt-3">
                  Standard: 07:00-09:00 und 17:00-19:00. Wochenenden sind immer Offpeak.
                </p>
              </div>
              
              <!-- Mindest-Vorlaufzeit für Buchungen -->
              <div class="border border-green-200 rounded-lg p-4 bg-green-50">
                <div class="flex items-center gap-2 mb-3">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <label class="block text-sm font-medium text-gray-900">
                    Mindest-Vorlaufzeit für Online-Buchungen
                  </label>
                </div>
                <p class="text-xs text-gray-600 mb-3">
                  Definieren Sie, wie viele Stunden im Voraus Kunden mindestens buchen müssen. Beispiel: Bei 8 Stunden können Kunden nur Termine buchen, die mindestens 8 Stunden in der Zukunft liegen.
                </p>
                
                <div class="flex items-center gap-3">
                  <input 
                    type="number" 
                    v-model.number="staff.minimum_booking_lead_time_hours"
                    @change="updateStaffAvailability(staff)"
                    min="0"
                    max="168"
                    class="w-24 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                  <span class="text-sm text-gray-700">Stunden im Voraus</span>
                </div>
                
                <p class="text-xs text-gray-500 mt-2">
                  Empfohlen: 8-24 Stunden (Standard: 24 Stunden)
                </p>
              </div>

              <!-- Standorte des Fahrlehrers -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="block text-sm font-medium text-gray-700">
                    Standorte
                  </label>
                  <button
                    @click="openLocationModal(staff)"
                    class="text-xs sm:text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Standort hinzufügen
                  </button>
                </div>
                
                <div v-if="staff.locations && staff.locations.length > 0" class="space-y-3">
                  <div 
                    v-for="location in staff.locations" 
                    :key="location.id"
                    class="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-gray-300 transition-colors"
                  >
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-900 text-sm sm:text-base truncate">{{ location.name }}</h4>
                        <p class="text-xs sm:text-sm text-gray-500 truncate">{{ location.address }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded whitespace-nowrap">
                          {{ location.location_type }}
                        </span>
                        <button
                          @click="openEditLocationModal(location)"
                          class="text-blue-600 hover:text-blue-700 p-1"
                          title="Standort bearbeiten"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          @click="removeLocation(staff, location)"
                          class="text-red-600 hover:text-red-700 p-1"
                          title="Standort entfernen"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <!-- Kategorien mit individuellen Pickup-Einstellungen -->
                    <div v-if="getStaffCategories(staff).length > 0" class="space-y-3">
                      <label class="text-xs sm:text-sm font-medium text-gray-700">Kategorien & Pickup-Einstellungen:</label>
                      
                      <div class="space-y-2">
                        <div 
                          v-for="categoryCode in getStaffCategories(staff)" 
                          :key="categoryCode"
                          class="border border-gray-200 rounded-lg p-3 bg-gray-50"
                        >
                          <!-- Kategorie aktivieren -->
                          <div class="flex items-center justify-between mb-2">
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                :value="categoryCode"
                                v-model="location.available_categories"
                                @change="updateLocationCategories(location)"
                                class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              >
                              <span class="text-sm font-medium text-gray-900">
                                {{ categoryCode }}
                              </span>
                            </label>
                          </div>
                          
                          <!-- Pickup-Einstellungen pro Kategorie (nur wenn Kategorie aktiv und Pickup-Modus aktiv) -->
                          <div 
                            v-if="location.available_categories?.includes(categoryCode) && staff.availability_mode !== 'standard'" 
                            class="ml-6 space-y-2 pt-2 border-t border-gray-200"
                          >
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                :checked="getLocationCategoryPickup(location, categoryCode)"
                                @change="toggleLocationCategoryPickup(location, categoryCode, $event)"
                                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              >
                              <span class="text-xs text-gray-700">Pickup für diese Kategorie</span>
                            </label>
                            
                            <div v-if="getLocationCategoryPickup(location, categoryCode)" class="ml-6">
                              <label class="block text-xs text-gray-600 mb-1">Pickup-Radius:</label>
                              <div class="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  :value="getLocationCategoryPickupRadius(location, categoryCode)"
                                  @change="updateLocationCategoryPickupRadius(location, categoryCode, ($event.target as HTMLInputElement).value)"
                                  min="5" 
                                  max="60" 
                                  class="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                <span class="text-xs text-gray-600">Min</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-xs text-gray-500 italic">
                      Keine Kategorien zugewiesen
                    </div>
                    
                    <!-- Zeitfenster für diesen Standort -->
                    <div class="mt-4 pt-4 border-t border-gray-200">
                      <div class="flex items-center justify-between mb-3">
                        <label class="text-xs sm:text-sm font-medium text-gray-700">
                          Verfügbare Zeitfenster
                        </label>
                        <button
                          @click="addTimeWindow(location)"
                          class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                          </svg>
                          Zeitfenster hinzufügen
                        </button>
                      </div>
                      
                      <div v-if="location.time_windows && location.time_windows.length > 0" class="space-y-2">
                        <div 
                          v-for="(window, idx) in location.time_windows" 
                          :key="idx"
                          class="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div class="flex-1 grid grid-cols-2 gap-2">
                            <input 
                              type="time" 
                              v-model="window.start"
                              @change="updateLocationTimeWindows(location)"
                              class="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                            <input 
                              type="time" 
                              v-model="window.end"
                              @change="updateLocationTimeWindows(location)"
                              class="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                          </div>
                          <div class="flex items-center gap-1">
                            <label 
                              v-for="day in [{n:1,l:'Mo'},{n:2,l:'Di'},{n:3,l:'Mi'},{n:4,l:'Do'},{n:5,l:'Fr'},{n:6,l:'Sa'},{n:0,l:'So'}]"
                              :key="day.n"
                              class="flex items-center"
                            >
                              <input 
                                type="checkbox" 
                                :value="day.n"
                                v-model="window.days"
                                @change="updateLocationTimeWindows(location)"
                                class="sr-only"
                              >
                              <span 
                                :class="[
                                  'w-6 h-6 flex items-center justify-center text-xs rounded cursor-pointer transition-colors',
                                  window.days?.includes(day.n) 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                ]"
                              >
                                {{ day.l }}
                              </span>
                            </label>
                          </div>
                          <button
                            @click="removeTimeWindow(location, idx)"
                            class="text-red-600 hover:text-red-700 p-1"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <p v-else class="text-xs text-gray-500 italic">
                        Keine Zeitfenster definiert - Standort ist immer verfügbar
                      </p>
                    </div>
                  </div>
                </div>
                
                <div v-else class="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg text-center">
                  Noch keine Standorte zugewiesen. Klicken Sie auf "Standort hinzufügen" um einen Standort hinzuzufügen.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Staff Modal -->
    <div v-if="showAddStaffModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showAddStaffModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Neuen Fahrlehrer hinzufügen</h3>
          
          <form @submit.prevent="createStaff">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input 
                  v-model="newStaff.first_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input 
                  v-model="newStaff.last_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input 
                  v-model="newStaff.email"
                  type="email" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showAddStaffModal = false"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isCreatingStaff"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {{ isCreatingStaff ? 'Erstelle...' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Add Location Modal -->
    <div v-if="showAddLocationModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showAddLocationModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Standort hinzufügen für {{ selectedStaffForLocation?.first_name }} {{ selectedStaffForLocation?.last_name }}
          </h3>
          
          <form @submit.prevent="createLocation">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Standort-Name *</label>
                <input 
                  v-model="newLocation.name"
                  type="text" 
                  required
                  placeholder="z.B. Hauptstandort Zürich"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                <input 
                  ref="newLocationAddressInput"
                  v-model="newLocation.address"
                  type="text" 
                  required
                  placeholder="z.B. Bahnhofstrasse 1, 8001 Zürich"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Standort-Typ *</label>
                <select 
                  v-model="newLocation.location_type"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="standard">Standard</option>
                  <option value="pickup">Pickup</option>
                  <option value="exam">Prüfung</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showAddLocationModal = false"
                :disabled="isCreatingLocation"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isCreatingLocation"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {{ isCreatingLocation ? 'Erstelle...' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Edit Location Modal -->
    <div v-if="showEditLocationModal" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showEditLocationModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Standort bearbeiten
          </h3>
          
          <form @submit.prevent="updateLocation">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Standort-Name *</label>
                <input 
                  v-model="editLocation.name"
                  type="text" 
                  required
                  placeholder="z.B. Hauptstandort Zürich"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                <input 
                  ref="editLocationAddressInput"
                  v-model="editLocation.address"
                  type="text" 
                  required
                  placeholder="z.B. Bahnhofstrasse 1, 8001 Zürich"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Standort-Typ *</label>
                <select 
                  v-model="editLocation.location_type"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="pickup">Pickup</option>
                  <option value="exam">Prüfung</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showEditLocationModal = false"
                :disabled="isEditingLocation"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isEditingLocation"
                class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {{ isEditingLocation ? 'Speichere...' : 'Speichern' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center p-6">
    <div class="text-center max-w-md">
      <div class="text-4xl mb-4">🚫</div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Online-Terminbuchung ist deaktiviert</h3>
      <p class="text-sm text-gray-600">Diese Funktion wurde vom Administrator deaktiviert.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useFeatures } from '~/composables/useFeatures'
import { useRuntimeConfig } from '#app'

// Props
const props = defineProps<{
  currentUser: any
  tenantSettings: any
}>()

// Emits
const emit = defineEmits<{
  settingsUpdated: [settings: any]
}>()

// Supabase client
const supabase = getSupabase()

// Composables
const uiStore = useUIStore()
const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

// Local state
const staffList = ref<any[]>([])
const availableCategories = ref<any[]>([])
const staffCategoryAvailability = ref<Record<string, any[]>>({}) // key: staffId -> rows
const isLoading = ref(false)
const error = ref<string | null>(null)
const showAddStaffModal = ref(false)
const isCreatingStaff = ref(false)
const newStaff = ref({
  first_name: '',
  last_name: '',
  email: ''
})

const showAddLocationModal = ref(false)
const showEditLocationModal = ref(false)
const isCreatingLocation = ref(false)
const isEditingLocation = ref(false)
const selectedStaffForLocation = ref<any>(null)
const editingLocation = ref<any>(null)
const newLocation = ref({
  name: '',
  address: '',
  location_type: 'standard'
})
const editLocation = ref({
  id: '',
  name: '',
  address: '',
  location_type: 'standard'
})

// Google Places Autocomplete refs
const newLocationAddressInput = ref<HTMLInputElement | null>(null)
const editLocationAddressInput = ref<HTMLInputElement | null>(null)
let newLocationAutocomplete: any = null
let editLocationAutocomplete: any = null

// Optional Filter: Wenn in Detailansicht eines Staffs verwendet, nur diesen laden
const staffIdFilter = computed<string | null>(() => {
  const id = (props as any)?.currentUser?.id
  return typeof id === 'string' ? id : null
})

// Computed
const getAvailabilityModeDescription = (mode: string) => {
  const descriptions = {
    standard: 'Nur an vordefinierten Standorten verfügbar',
    pickup: 'Kann Kunden im definierten Umkreis abholen',
    hybrid: 'Kann sowohl an Standorten als auch durch Abholung verfügbar sein'
  }
  return descriptions[mode as keyof typeof descriptions] || ''
}

// Methods
const loadStaff = async () => {
  if (!props.currentUser) return
  
  isLoading.value = true
  error.value = null
  
  try {
    console.log('🔄 Loading staff from database...')
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    // Load staff (optional: nur spezifischen Staff)
    let staffData: any[] = []
    let staffError: any = null
    if (staffIdFilter.value) {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          created_at,
          category
        `)
        .eq('role', 'staff')
        .eq('tenant_id', tenantId)
        .eq('id', staffIdFilter.value)
        .maybeSingle()
      staffError = error
      if (data) staffData = [data]
    } else {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          created_at,
          category
        `)
        .eq('role', 'staff')
        .eq('tenant_id', tenantId)
        .order('first_name', { ascending: true })
      staffError = error
      staffData = data || []
    }

    if (staffError) {
      throw new Error(`Database error: ${staffError.message}`)
    }

    // Load categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('code, name')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true })

    if (categoriesError) {
      console.warn('⚠️ Could not load categories:', categoriesError)
    } else {
      availableCategories.value = categoriesData || []
    }

    // Load staff availability settings
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('staff_availability_settings')
      .select('*')
      .in('staff_id', staffData.map(s => s.id))

    if (availabilityError) {
      console.warn('⚠️ Could not load availability settings:', availabilityError)
    }

    // Load staff locations (exclude exam locations)
    const { data: locationsData, error: locationsError } = await supabase
      .from('locations')
      .select(`
        id,
        staff_id,
        name,
        address,
        location_type,
        available_categories,
        pickup_enabled,
        pickup_radius_minutes,
        category_pickup_settings,
        time_windows
      `)
      .in('staff_id', staffData.map(s => s.id))
      .eq('is_active', true)
      .neq('location_type', 'exam')

    if (locationsError) {
      console.warn('⚠️ Could not load locations:', locationsError)
    }

    // Load per-category pickup availability
    const { data: scaData, error: scaError } = await supabase
      .from('staff_category_availability')
      .select('*')
      .in('staff_id', staffData.map(s => s.id))

    if (scaError) {
      console.warn('⚠️ Could not load staff_category_availability:', scaError)
    }

    const byStaff: Record<string, any[]> = {}
    ;(scaData || []).forEach(row => {
      if (!byStaff[row.staff_id]) byStaff[row.staff_id] = []
      byStaff[row.staff_id].push(row)
    })
    staffCategoryAvailability.value = byStaff

    // Combine data
    const enrichedStaff = (staffData || []).map(staff => {
      const availability = availabilityData?.find(a => a.staff_id === staff.id)
      const locations = locationsData?.filter(l => l.staff_id === staff.id) || []
      const categoryPickup = staffCategoryAvailability.value[staff.id] || []
      
      return {
        ...staff,
        availability_mode: availability?.availability_mode || 'standard',
        pickup_radius_minutes: availability?.pickup_radius_minutes || 10,
        peak_time_morning_start: availability?.peak_time_morning_start || '07:00',
        peak_time_morning_end: availability?.peak_time_morning_end || '09:00',
        peak_time_evening_start: availability?.peak_time_evening_start || '17:00',
        peak_time_evening_end: availability?.peak_time_evening_end || '19:00',
        minimum_booking_lead_time_hours: availability?.minimum_booking_lead_time_hours || 24,
        category_pickup: categoryPickup,
        locations: locations.map(location => ({
          ...location,
          available_categories: location.available_categories || [],
          pickup_enabled: location.pickup_enabled || false,
          pickup_radius_minutes: location.pickup_radius_minutes || 10,
          category_pickup_settings: location.category_pickup_settings || {},
          time_windows: location.time_windows || []
        }))
      }
    })

    staffList.value = enrichedStaff
    console.log('✅ Staff loaded successfully:', staffList.value.length)

  } catch (err: any) {
    console.error('❌ Error loading staff:', err)
    error.value = err.message || 'Fehler beim Laden der Fahrlehrer'
    staffList.value = []
  } finally {
    isLoading.value = false
  }
}

const getStaffCategories = (staff: any): string[] => {
  if (!staff.category) return []
  return Array.isArray(staff.category) ? staff.category : [staff.category]
}

// Time Windows Management
const addTimeWindow = (location: any) => {
  if (!location.time_windows) {
    location.time_windows = []
  }
  location.time_windows.push({
    start: '07:00',
    end: '09:00',
    days: [1, 2, 3, 4, 5] // Mo-Fr
  })
}

const removeTimeWindow = async (location: any, index: number) => {
  location.time_windows.splice(index, 1)
  await updateLocationTimeWindows(location)
}

const updateLocationTimeWindows = async (location: any) => {
  try {
    console.log('🔄 Updating location time windows:', location.id)
    
    const { error } = await supabase
      .from('locations')
      .update({
        time_windows: location.time_windows || []
      })
      .eq('id', location.id)

    if (error) throw error

    // Show toast after 1 second delay
    setTimeout(() => {
      uiStore.addNotification({
        type: 'success',
        title: 'Gespeichert',
        message: `Zeitfenster für ${location.name} wurden aktualisiert.`
      })
    }, 1000)

  } catch (err: any) {
    console.error('❌ Error updating location time windows:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Zeitfenster konnten nicht gespeichert werden.'
    })
  }
}


const updateStaffAvailability = async (staff: any) => {
  try {
    console.log('🔄 Updating staff availability:', staff.id, staff.availability_mode)
    
    const { error } = await supabase
      .from('staff_availability_settings')
      .upsert({
        staff_id: staff.id,
        availability_mode: staff.availability_mode,
        pickup_radius_minutes: staff.pickup_radius_minutes,
        peak_time_morning_start: staff.peak_time_morning_start || '07:00',
        peak_time_morning_end: staff.peak_time_morning_end || '09:00',
        peak_time_evening_start: staff.peak_time_evening_start || '17:00',
        peak_time_evening_end: staff.peak_time_evening_end || '19:00',
        minimum_booking_lead_time_hours: staff.minimum_booking_lead_time_hours || 24
      }, {
        onConflict: 'staff_id'
      })

    if (error) throw error

    // Show toast after 1 second delay
    setTimeout(() => {
      uiStore.addNotification({
        type: 'success',
        title: 'Gespeichert',
        message: `Einstellungen für ${staff.first_name} ${staff.last_name} wurden aktualisiert.`
      })
    }, 1000)

  } catch (err: any) {
    console.error('❌ Error updating staff availability:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Einstellungen konnten nicht gespeichert werden.'
    })
  }
}

// Google Maps Script Loading
let googleMapsLoaded = false
let googleMapsLoadingPromise: Promise<void> | null = null

const loadGoogleMapsScript = (): Promise<void> => {
  if (googleMapsLoaded && typeof (window as any).google !== 'undefined') {
    return Promise.resolve()
  }

  if (googleMapsLoadingPromise) {
    return googleMapsLoadingPromise
  }

  googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      googleMapsLoaded = true
      resolve()
      return
    }

    const config = useRuntimeConfig()
    const apiKey = config.public.googleMapsApiKey

    if (!apiKey) {
      reject(new Error('Google Maps API key not found'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      googleMapsLoaded = true
      resolve()
    }

    script.onerror = () => {
      googleMapsLoadingPromise = null
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })

  return googleMapsLoadingPromise
}

// Google Places Autocomplete initialization
const initializeNewLocationAutocomplete = async () => {
  try {
    await loadGoogleMapsScript()
    
    if (!newLocationAddressInput.value) {
      console.warn('New location address input not found')
      return
    }
    
    // Destroy existing autocomplete if any
    if (newLocationAutocomplete) {
      (window as any).google.maps.event.clearInstanceListeners(newLocationAddressInput.value)
    }
    
    // Create new autocomplete instance
    newLocationAutocomplete = new (window as any).google.maps.places.Autocomplete(
      newLocationAddressInput.value,
      {
        types: ['address'],
        componentRestrictions: { country: 'ch' },
        fields: ['formatted_address', 'address_components', 'geometry']
      }
    )
    
    // Listen for place selection
    newLocationAutocomplete.addListener('place_changed', () => {
      const place = newLocationAutocomplete?.getPlace()
      if (place?.formatted_address) {
        newLocation.value.address = place.formatted_address
      }
    })
    
    console.log('✅ Google Places Autocomplete initialized for new location')
  } catch (error) {
    console.error('❌ Error initializing Google Places Autocomplete:', error)
  }
}

const initializeEditLocationAutocomplete = async () => {
  try {
    await loadGoogleMapsScript()
    
    if (!editLocationAddressInput.value) {
      console.warn('Edit location address input not found')
      return
    }
    
    // Destroy existing autocomplete if any
    if (editLocationAutocomplete) {
      (window as any).google.maps.event.clearInstanceListeners(editLocationAddressInput.value)
    }
    
    // Create new autocomplete instance
    editLocationAutocomplete = new (window as any).google.maps.places.Autocomplete(
      editLocationAddressInput.value,
      {
        types: ['address'],
        componentRestrictions: { country: 'ch' },
        fields: ['formatted_address', 'address_components', 'geometry']
      }
    )
    
    // Listen for place selection
    editLocationAutocomplete.addListener('place_changed', () => {
      const place = editLocationAutocomplete?.getPlace()
      if (place?.formatted_address) {
        editLocation.value.address = place.formatted_address
      }
    })
    
    console.log('✅ Google Places Autocomplete initialized for edit location')
  } catch (error) {
    console.error('❌ Error initializing Google Places Autocomplete:', error)
  }
}

const openLocationModal = async (staff: any) => {
  selectedStaffForLocation.value = staff
  newLocation.value = {
    name: '',
    address: '',
    location_type: 'standard'
  }
  showAddLocationModal.value = true
  
  // Initialize Google Places Autocomplete after modal is rendered
  await nextTick()
  initializeNewLocationAutocomplete()
}

const openEditLocationModal = async (location: any) => {
  editingLocation.value = location
  editLocation.value = {
    id: location.id,
    name: location.name,
    address: location.address,
    location_type: location.location_type
  }
  showEditLocationModal.value = true
  
  // Initialize Google Places Autocomplete after modal is rendered
  await nextTick()
  initializeEditLocationAutocomplete()
}

const updateLocation = async () => {
  if (!editingLocation.value) return
  
  isEditingLocation.value = true
  
  try {
    const { error } = await supabase
      .from('locations')
      .update({
        name: editLocation.value.name,
        address: editLocation.value.address,
        location_type: editLocation.value.location_type
      })
      .eq('id', editLocation.value.id)
    
    if (error) throw error
    
    // Update local state
    editingLocation.value.name = editLocation.value.name
    editingLocation.value.address = editLocation.value.address
    editingLocation.value.location_type = editLocation.value.location_type
    
    alert(`Standort "${editLocation.value.name}" wurde erfolgreich aktualisiert!`)
    
    showEditLocationModal.value = false
  } catch (err: any) {
    console.error('❌ Error updating location:', err)
    alert('Fehler: Standort konnte nicht aktualisiert werden.')
  } finally {
    isEditingLocation.value = false
  }
}

const createLocation = async () => {
  if (!selectedStaffForLocation.value) return
  
  isCreatingLocation.value = true
  
  try {
    const authUser = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.data?.user?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }
    
    // Create location
    const { data: newLocationData, error: locationError } = await supabase
      .from('locations')
      .insert({
        name: newLocation.value.name,
        address: newLocation.value.address,
        location_type: newLocation.value.location_type,
        staff_id: selectedStaffForLocation.value.id,
        tenant_id: tenantId,
        is_active: true,
        available_categories: []
      })
      .select()
      .single()
    
    if (locationError) throw locationError
    
    // Add to local state
    if (!selectedStaffForLocation.value.locations) {
      selectedStaffForLocation.value.locations = []
    }
    selectedStaffForLocation.value.locations.push(newLocationData)
    
    alert(`Standort "${newLocation.value.name}" wurde erfolgreich hinzugefügt!`)
    
    showAddLocationModal.value = false
    newLocation.value = {
      name: '',
      address: '',
      location_type: 'standard'
    }
  } catch (err: any) {
    console.error('❌ Error creating location:', err)
    alert('Fehler: Standort konnte nicht erstellt werden.')
  } finally {
    isCreatingLocation.value = false
  }
}

const removeLocation = async (staff: any, location: any) => {
  if (!confirm(`Möchten Sie den Standort "${location.name}" wirklich von diesem Fahrlehrer entfernen?`)) {
    return
  }
  
  try {
    const { error } = await supabase
      .from('locations')
      .update({
        staff_id: null,
        is_active: false
      })
      .eq('id', location.id)
    
    if (error) throw error
    
    // Remove from local state
    const index = staff.locations.findIndex((l: any) => l.id === location.id)
    if (index > -1) {
      staff.locations.splice(index, 1)
    }
    
    console.log('✅ Location removed successfully')
    alert(`Standort "${location.name}" wurde erfolgreich von ${staff.first_name} ${staff.last_name} entfernt.`)
  } catch (err: any) {
    console.error('❌ Error removing location:', err)
    alert('Fehler: Standort konnte nicht entfernt werden.')
  }
}

// Helper: Initialisiere category_pickup_settings wenn nicht vorhanden
const ensureLocationCategoryPickupSettings = (location: any) => {
  if (!location.category_pickup_settings) {
    location.category_pickup_settings = {}
  }
  return location.category_pickup_settings
}

// Prüfe ob Pickup für eine Kategorie aktiviert ist
const getLocationCategoryPickup = (location: any, categoryCode: string): boolean => {
  const settings = location.category_pickup_settings || {}
  return settings[categoryCode]?.enabled || false
}

// Hole Pickup-Radius für eine Kategorie
const getLocationCategoryPickupRadius = (location: any, categoryCode: string): number => {
  const settings = location.category_pickup_settings || {}
  return settings[categoryCode]?.radius_minutes || 10
}

// Toggle Pickup für eine Kategorie
const toggleLocationCategoryPickup = async (location: any, categoryCode: string, event: Event) => {
  const enabled = (event.target as HTMLInputElement).checked
  const settings = ensureLocationCategoryPickupSettings(location)
  
  if (!settings[categoryCode]) {
    settings[categoryCode] = { enabled: false, radius_minutes: 10 }
  }
  settings[categoryCode].enabled = enabled
  
  await updateLocationCategoryPickupSettings(location)
}

// Update Pickup-Radius für eine Kategorie
const updateLocationCategoryPickupRadius = async (location: any, categoryCode: string, value: string) => {
  const settings = ensureLocationCategoryPickupSettings(location)
  
  if (!settings[categoryCode]) {
    settings[categoryCode] = { enabled: true, radius_minutes: 10 }
  }
  settings[categoryCode].radius_minutes = parseInt(value) || 10
  
  await updateLocationCategoryPickupSettings(location)
}

// Speichere category_pickup_settings in DB
const updateLocationCategoryPickupSettings = async (location: any) => {
  try {
    const { error } = await supabase
      .from('locations')
      .update({
        category_pickup_settings: location.category_pickup_settings || {}
      })
      .eq('id', location.id)

    if (error) throw error

    console.log('✅ Location category pickup settings updated')
    
    // Show toast after 1 second delay
    setTimeout(() => {
      uiStore.addNotification({
        type: 'success',
        title: 'Gespeichert',
        message: `Pickup-Einstellungen für ${location.name} wurden aktualisiert.`
      })
    }, 1000)
  } catch (err: any) {
    console.error('❌ Error updating location category pickup settings:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Pickup-Einstellungen konnten nicht gespeichert werden.'
    })
  }
}

const updateLocationCategories = async (location: any) => {
  try {
    console.log('🔄 Updating location categories:', location.id, location.available_categories)
    
    const { error } = await supabase
      .from('locations')
      .update({
        available_categories: location.available_categories
      })
      .eq('id', location.id)

    if (error) throw error

    console.log('✅ Location categories updated')
    
    // Show toast after 1 second delay
    setTimeout(() => {
      uiStore.addNotification({
        type: 'success',
        title: 'Gespeichert',
        message: `Kategorien für ${location.name} wurden aktualisiert.`
      })
    }, 1000)
  } catch (err: any) {
    console.error('❌ Error updating location categories:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Kategorie-Zuordnung konnte nicht gespeichert werden.'
    })
  }
}

const updateLocationPickup = async (location: any) => {
  try {
    console.log('🔄 Updating location pickup:', location.id, location.pickup_enabled)
    
    const { error } = await supabase
      .from('locations')
      .update({
        pickup_enabled: location.pickup_enabled,
        pickup_radius_minutes: location.pickup_radius_minutes
      })
      .eq('id', location.id)

    if (error) throw error

    // Show toast after 1 second delay
    setTimeout(() => {
      uiStore.addNotification({
        type: 'success',
        title: 'Gespeichert',
        message: `Pickup-Einstellungen für ${location.name} wurden aktualisiert.`
      })
    }, 1000)

  } catch (err: any) {
    console.error('❌ Error updating location pickup:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Pickup-Einstellungen konnten nicht gespeichert werden.'
    })
  }
}

const addNewStaff = () => {
  newStaff.value = {
    first_name: '',
    last_name: '',
    email: ''
  }
  showAddStaffModal.value = true
}

const createStaff = async () => {
  if (!props.currentUser) return
  
  isCreatingStaff.value = true
  
  try {
    console.log('🔄 Creating new staff member...')
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    // Create staff user
    const { data: newStaffData, error: staffError } = await supabase
      .from('users')
      .insert({
        first_name: newStaff.value.first_name,
        last_name: newStaff.value.last_name,
        email: newStaff.value.email,
        role: 'staff',
        tenant_id: tenantId,
        is_active: true
      })
      .select()
      .single()

    if (staffError) throw staffError

    // Create default availability settings
    const { error: availabilityError } = await supabase
      .from('staff_availability_settings')
      .insert({
        staff_id: newStaffData.id,
        availability_mode: 'standard',
        pickup_radius_minutes: 10
      })

    if (availabilityError) {
      console.warn('⚠️ Could not create default availability settings:', availabilityError)
    }

    uiStore.addNotification({
      type: 'success',
      title: 'Fahrlehrer erstellt',
      message: `${newStaff.value.first_name} ${newStaff.value.last_name} wurde erfolgreich hinzugefügt.`
    })

    showAddStaffModal.value = false
    await loadStaff()

  } catch (err: any) {
    console.error('❌ Error creating staff:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Fahrlehrer konnte nicht erstellt werden.'
    })
  } finally {
    isCreatingStaff.value = false
  }
}

const editWorkingHours = (staff: any) => {
  console.log('Edit working hours for:', staff)
  // TODO: Implement working hours modal
}

// Typisierter Change-Handler für Checkbox (verhindert TS-Fehler mit $event.target)
// Lifecycle
onMounted(async () => {
  // Lade Features um Prüfung durchführen zu können
  await loadFeatures()
  await loadStaff()
})
</script>

<style scoped>
/* Custom styles for better UX */
.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>
