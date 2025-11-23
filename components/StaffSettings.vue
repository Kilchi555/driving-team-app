<template>
  <!-- Modal Wrapper -->
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 min-h-[100svh]">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[calc(100svh-80px-env(safe-area-inset-bottom,0px))] overflow-y-auto">
      
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b px-4 py-2 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <!-- Exam Statistics Button -->
          <button
            @click="openExamStatistics"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <span>Statistik</span>
          </button>
          
          <!-- Cash Control Button -->
          <button
            @click="openCashControl"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <span>Kasse</span>
          </button>
          
          
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
        >
          ×
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-4 space-y-2">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-16 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ❌ {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="saveSuccess" class="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✅ Einstellungen erfolgreich gespeichert!
        </div>

        <!-- Accordion Sections -->
        <div v-if="!isLoading" class="space-y-2">

        <!-- Externe Kalender Einstellungen -->
        <div class="border border-gray-200 rounded-lg">
          <button  
            @click="toggleSection('externalCalendars')" 
            class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <span class="text-xl">📅</span>
              <div>
                <h3 class="font-medium text-gray-900">Externe Kalender</h3>
              </div>
            </div>
            <span class="text-gray-600 font-bold">{{ openSections.externalCalendars ? '−' : '+' }}</span>

          </button>
          
          <div v-if="openSections.externalCalendars" class="px-4 pb-4 border-t">
            <ExternalCalendarSettings />
          </div>
        </div>

        <!-- Nur Arbeitsstunden für 4 Monate - KEINE lessons mehr! -->
        <div class="border border-gray-200 rounded-lg">
          <button  
            @click="toggleSection('workingStats')" 
            class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
          >
            <span class="font-medium text-gray-900">⏰ Arbeitsstunden</span>
            <span class="text-gray-600 font-bold">{{ openSections.workingStats ? '−' : '+' }}</span>
          </button>
          
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
          </div>
        </div>

        <!-- 6. Prüfungsstandorte -->
        <div class="border border-gray-200 rounded-lg">
          <button
            @click="toggleSection('examLocations')"
            class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
          >
            <span class="font-medium text-gray-900">🏛️ Prüfungsstandorte</span>
            <span class="text-gray-600 font-bold">{{ openSections.examLocations ? '−' : '+' }}</span>
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
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('locations')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">📍 Treffpunkte/Standorte</span>
              <span class="text-gray-600 font-bold">{{ openSections.locations ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.locations" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-4 mt-4">

                <!-- Header mit Button -->
                <div class="flex justify-between items-center">
                  <button
                    @click="showNewLocationModal = true"
                    class="px-4 py-2 text-md font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
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
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      class="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition"
                    >
                      <div class="flex-1">
                        <div class="font-medium text-gray-900">{{ location.name }}</div>
                        <div class="text-gray-600 text-xs">{{ location.address }}</div>
                      </div>
                      <button
                        @click="toggleLocationAssignment(location.id)"
                        class="ml-2 px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-medium"
                      >
                        Entfernen
                      </button>
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
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('worktime')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">⏰ Arbeitszeiten</span>
              <span class="text-gray-600 font-bold">{{ openSections.worktime ? '−' : '+' }}</span>
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
                        <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                            class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                        </div>
                        
                        <!-- End Zeit -->
                        <div class="flex-1">
                          <label class="block text-xs text-gray-500 mb-1">Bis</label>
                          <input
                            v-model="block.end_time"
                            type="time"
                            @change="autoSaveWorkingDay(day.value)"
                            class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div v-if="isSavingWorkingHours" class="text-sm text-blue-600 pt-2">
                  💾 Speichere...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer with Logout Button and Calendar Link -->
      <div class="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between items-center">
        <button
          @click="openCalendarIntegration"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>Kalender-Link</span>
        </button>
        <button
          @click="handleLogout"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <span>Abmelden</span>
        </button>
      </div>
    </div>

    <!-- Exam Statistics Modal -->
    <StaffExamStatistics
      v-if="showExamStatistics"
      :current-user="props.currentUser"
      @close="showExamStatistics = false"
    />

    <!-- Cash Control Modal -->
    <div v-if="showCashControl" class="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
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

    <!-- Calendar Integration Modal -->
    <div v-if="showCalendarIntegration" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
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
            
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kalender-Link:</label>
                <div class="flex space-x-2">
                  <input
                    :value="calendarLink"
                    readonly
                    class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                  <button
                    @click="copyToClipboard(calendarLink, 'Kalender-Link')"
                    class="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    Kopieren
                  </button>
                </div>
              </div>
              
              <div class="bg-blue-50 p-3 rounded-lg">
                <div class="flex items-start space-x-2">
                  <span class="text-blue-600 text-sm">💡</span>
                  <div class="text-sm text-blue-800">
                    <strong>Anleitung:</strong> Fügen Sie diesen Link in Ihren Handy-Kalender ein (Google Calendar, Apple Calendar, etc.). 
                    Alle Ihre Termine werden automatisch synchronisiert.
                  </div>
                </div>
              </div>
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
                    class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                  <button
                    @click="copyToClipboard(registrationLink, 'Registrierungs-Link')"
                    class="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
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
                class="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
    <div v-if="showNewLocationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              placeholder="z.B. Baslerstrasse 145"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <!-- Address -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
            <input
              v-model="newLocationForm.address"
              type="text"
              placeholder="z.B. 8048 Zürich"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
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
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            Erstellen & Hinzufügen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { navigateTo } from '#app/composables/router'
import { getSupabase } from '~/utils/supabase'
import Toast from '~/components/Toast.vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import ExamLocationSearchDropdown from './ExamLocationSearchDropdown.vue'
import StaffExamStatistics from './StaffExamStatistics.vue'
import StaffCashBalance from './StaffCashBalance.vue'
import { useStaffWorkingHours, WEEKDAYS, type WorkingDayForm, type WorkingHourBlock } from '~/composables/useStaffWorkingHours'
import { useTenant } from '~/composables/useTenant'
import { useTenantBranding } from '~/composables/useTenantBranding'

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
const { currentTenant } = useTenant()

// Exam Statistics Modal State
const showExamStatistics = ref(false)

// Cash Control Modal State
const showCashControl = ref(false)

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
  deviceManager: false
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


// Data
const availableCategories = ref<any[]>([])
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
const calendarLink = computed(() => {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://simy.ch'
  const staffId = props.currentUser?.id
  return `${baseUrl}/api/calendar/ics?staff_id=${staffId}`
})

const registrationLink = computed(() => {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://simy.ch'
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
  const date = new Date()
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const previousMonthName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const twoMonthsAgoName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() - 2)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const threeMonthsAgoName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() - 3)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const nextMonthName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
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
    const supabase = getSupabase();
    const staffId = props.currentUser.id;

    // 1. Alle verfügbaren globalen Prüfungsstandorte laden (tenant_id = null, staff_ids = empty/null)
    const { data: allLocations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .is('tenant_id', null) // Global locations (no tenant assigned)
      .eq('is_active', true)
      .order('name');

    if (locationsError) throw locationsError;
    availableExamLocations.value = allLocations || [];

    // 2. Die spezifischen Präferenzen des aktuellen Mitarbeiters laden (where staffId is in staff_ids)
    const { data: allExamLocations, error: allExamError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .eq('is_active', true)
      .order('name');

    if (allExamError) throw allExamError;
    
    // Filter: nur die, wo staffId im staff_ids Array ist
    staffExamLocations.value = (allExamLocations || []).filter((loc: any) => {
      const staffIds = loc.staff_ids || []
      return Array.isArray(staffIds) && staffIds.includes(staffId)
    });

      console.log('✅ Prüfungsstandorte geladen:', {
      verfügbar: availableExamLocations.value.length,
      aktiviert_durch_Mitarbeiter: staffExamLocations.value.length,
      aktive_namen: staffExamLocations.value.map(loc => loc.name)
      });

  } catch (err: any) {
    console.error('❌ Fehler beim Laden der Prüfungsstandorte:', err);
    error.value = `Fehler beim Laden: ${err.message}`;
  } finally {
    isLoadingExamLocations.value = false
  }
}

// Hilfsfunktionen für localStorage (falls noch nicht vorhanden)
const getStaffExamPreferences = (staffId: string): string[] => {
  const key = `staff_exam_preferences_${staffId}`
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

const saveStaffExamPreferences = (staffId: string, locationIds: string[]) => {
  const key = `staff_exam_preferences_${staffId}`
  localStorage.setItem(key, JSON.stringify(locationIds))
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
    const supabase = getSupabase();
    const staffId = props.currentUser.id;

    // Wir identifizieren einen Standort nicht nur über die ID, sondern auch über Name & Adresse
    // Dies ist nötig, da wir für die Präferenzen neue Zeilen erstellen.
    const { data: existingPreference, error: fetchError } = await supabase
      .from('locations')
      .select('id')
      .eq('staff_id', staffId)
      .eq('name', location.name)
      .eq('address', location.address)
      .eq('location_type', 'exam')
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingPreference) {
      // Wenn die Präferenz-Zeile existiert, löschen wir sie
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', existingPreference.id);

      if (deleteError) throw deleteError;
      console.log('✅ Prüfungsstandort-Präferenz gelöscht für:', location.name);
    } else {
      // Wenn keine Präferenz-Zeile existiert, erstellen wir eine neue
      const { error: insertError } = await supabase
        .from('locations')
        .insert({
          staff_id: staffId,
          name: location.name,
          address: location.address,
          location_type: 'exam',
          is_active: true,
          city: location.city,
          canton: location.canton,
          postal_code: location.postal_code,
          // Füge hier weitere relevante Spalten aus dem globalen Standort hinzu
        });

      if (insertError) throw insertError;
      console.log('✅ Neue Prüfungsstandort-Präferenz erstellt für:', location.name);
    }

  } catch (err: any) {
    console.error('❌ Fehler beim Umschalten des Prüfungsstandorts:', err);
    error.value = `Fehler beim Speichern der Präferenz: ${err.message}`;
  } finally {
    isSavingExamLocation.value = false;
    // Lade die Daten neu, damit die UI den neuen Status anzeigt
    await loadExamLocations();
  }
}


const loadAllData = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Exam Locations werden nur in der Prüfungsstandorte-Sektion geladen
    // Standard Locations werden separat geladen
    console.log('✅ Basic data loading completed')
  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
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
  console.log('🔄 Exam locations changed:', locations.length)
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
    const supabase = getSupabase()
    const staffId = props.currentUser.id

    // Remove from database
    const { error: deleteError } = await supabase
      .from('locations')
      .delete()
      .eq('staff_id', staffId)
      .eq('name', location.name)
      .eq('address', location.address)
      .eq('location_type', 'exam')

    if (deleteError) throw deleteError

    console.log('✅ Prüfungsstandort entfernt:', location.name)
    
    // Reload the data
    await loadExamLocations()

  } catch (err: any) {
    console.error('❌ Fehler beim Entfernen des Prüfungsstandorts:', err)
    error.value = `Fehler beim Entfernen: ${err.message}`
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
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('locations') // 👈 Tabelle auf 'locations' geändert
      .insert({
        staff_ids: [props.currentUser.id], // Use staff_ids array instead of staff_id
        tenant_id: props.currentUser.tenant_id,
        name: newExamLocation.value.name,
        address: newExamLocation.value.address,
        available_categories: newExamLocation.value.categories, // 👈 Feldname korrigiert
        location_type: 'exam', // 👈 Diese Zeile wurde hinzugefügt
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    examLocations.value.push(data)
    
    // Reset form
    newExamLocation.value = {
      name: '',
      address: '',
      categories: []
    }

    console.log('✅ Exam location added:', data)

  } catch (err: any) {
    console.error('❌ Error adding exam location:', err)
    error.value = `Fehler beim Hinzufügen: ${err.message}`
  }
}


// Create new location
const createNewLocation = async () => {
  if (!props.currentUser?.tenant_id || !newLocationForm.value.name || !newLocationForm.value.address) {
    alert('Bitte füllen Sie alle erforderlichen Felder aus')
    return
  }

  try {
    const supabase = getSupabase()
    
    // Create new location with current staff_id in staff_ids array
    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: newLocationForm.value.name,
        address: newLocationForm.value.address,
        staff_ids: [props.currentUser.id], // Add current staff to the location
        tenant_id: props.currentUser.tenant_id,
        available_categories: newLocationForm.value.available_categories,
        location_type: 'standard',
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    // Add to local state
    allTenantLocations.value.push(data)
    
    // Reset form and close modal
    resetLocationForm()
    showNewLocationModal.value = false
    
    console.log('✅ Location created successfully:', data)
  } catch (err: any) {
    console.error('❌ Error creating location:', err)
    error.value = `Fehler beim Erstellen: ${err.message}`
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

// Toggle Location Assignment (Hinzufügen/Entfernen)
const toggleLocationAssignment = async (locationId: string) => {
  try {
    const supabase = getSupabase()
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
      console.log(`🔥 Removing staff ${staffId} from location ${locationId}`)
    } else {
      // Hinzufügen
      currentStaffIds.push(staffId)
      console.log(`🔥 Adding staff ${staffId} to location ${locationId}`)
    }

    // Update in Datenbank
    const { error } = await supabase
      .from('locations')
      .update({ staff_ids: currentStaffIds })
      .eq('id', locationId)

    if (error) throw error

    // Optimistic Update in UI
    const locationIndex = allTenantLocations.value.findIndex(loc => loc.id === locationId)
    if (locationIndex >= 0) {
      allTenantLocations.value[locationIndex].staff_ids = currentStaffIds
    }

    console.log('✅ Location assignment updated successfully')

  } catch (err: any) {
    console.error('❌ Error in toggleLocationAssignment:', err)
    error.value = `Fehler: ${err.message}`
  }
}

const removeLocation = async (locationId: string) => {
  try {
    console.log('🔥 Removing location:', locationId)
    
    await saveWithOfflineSupport(
      'locations',           // table
      {},                   // data (leer bei delete)
      'delete',             // action
      { id: locationId },   // where
      `Standort löschen`    // operation name
    )
    
    console.log('🔍 Delete response - success')
    
    // Optimistic Update - sofort aus UI entfernen
    myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
    console.log('✅ Location removed successfully')
    
  } catch (err: any) {
    console.error('❌ Error in removeLocation:', err)
    
    // Spezielle Behandlung für Foreign Key Constraint (behält Ihre Logik bei)
    if (err.code === '23503') {
      error.value = 'Dieser Standort kann nicht gelöscht werden, da er noch von Terminen verwendet wird. Bitte löschen Sie zuerst alle Termine an diesem Standort.'
      return
    }
    
    // Offline-Support: Benutzerfreundliche Meldung
    if (err.message?.includes('synchronisiert')) {
      // Optimistic Update auch bei Offline
      myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
      error.value = null // Kein Fehler anzeigen
      
      // Optional: Success-Message für Offline
      console.log('📦 Location will be deleted when online')
      // Sie könnten hier eine Notification anzeigen:
      // showMessage("Standort wird gelöscht sobald Internet verfügbar ist")
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
    const supabase = getSupabase()

    console.log('🔥 Loading staff settings data...')

    // Kategorien laden (nur für aktuellen Tenant)
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', props.currentUser.tenant_id)
      .eq('is_active', true)
      .order('name')

    if (categoriesError) throw categoriesError
    availableCategories.value = categories || []

    // Alle Standard-Standorte des Tenants laden (mit allen staff_ids)
    const { data: allLocations, error: allLocationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', props.currentUser.tenant_id)
      .eq('location_type', 'standard') // Nur Standard Locations, keine Exam/Prüfungs Locations

    if (allLocationsError) throw allLocationsError
    allTenantLocations.value = allLocations || []

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
    console.log('🔥 Staff settings loading disabled - table does not exist')

    console.log('✅ All data loaded successfully')

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = `Fehler beim Laden: ${err.message}`
  } finally {
    isLoading.value = false
  }
   await loadExamLocations() 
}

// Debug-Version der loadWorkingHoursData Funktion:

// Vollständige Debug-Version für alle 4 Monate:

const loadWorkingHoursData = async () => {
  console.log('🔍 DEBUG: Starting loadWorkingHoursData')
  
  if (!props.currentUser?.id) {
    console.log('❌ DEBUG: No currentUser.id found')
    return
  }
  
  try {
    const supabase = getSupabase()
    
    console.log('🔍 DEBUG: Querying appointments for staff_id:', props.currentUser.id)
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('staff_id', props.currentUser.id)
    
    if (error) {
      console.error('❌ DEBUG: Database error:', error)
      return
    }
    
    console.log('🔍 DEBUG: Total appointments found:', appointments?.length || 0)
    
    if (!appointments || appointments.length === 0) {
      console.log('⚠️ DEBUG: No appointments found')
      return
    }
    
    // Filter nicht-gelöschte Termine
    const validAppointments = appointments.filter(apt => 
      !apt.deleted_at // Nur nicht gelöschte Termine
    )
    
    // Aktuelle Zeit
    const now = new Date()
    
    // Filter Termine nach Zeitpunkt (in der Vergangenheit = gearbeitet, in der Zukunft = geplant)
    const workedAppointments = validAppointments.filter(apt => {
      const appointmentDate = parseLocalDateTime(apt.appointment_datetime || apt.start_time)
      return appointmentDate < now // Start-Zeit in der Vergangenheit = gearbeitet
    })
    
    const plannedAppointments = validAppointments.filter(apt => {
      const appointmentDate = parseLocalDateTime(apt.appointment_datetime || apt.start_time)
      return appointmentDate >= now // Start-Zeit in der Zukunft = geplant
    })
    
    console.log('🔍 DEBUG: Worked appointments (in past):', workedAppointments.length)
    console.log('🔍 DEBUG: Planned appointments (in future):', plannedAppointments.length)
    
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
    
    console.log('🔍 DEBUG: Hours calculated:', {
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
    const supabase = getSupabase()

    // 1. Arbeitszeiten speichern
    console.log('💾 Saving working hours...')
    try {
      isSavingWorkingHours.value = true
      for (const day of weekdays) {
        const formData = workingHoursForm.value[day.value]
        console.log(`💾 Saving day ${day.value}:`, formData)
        
        await saveWorkingHour(props.currentUser.id, {
          day_of_week: day.value,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_active: formData.is_active
        })
      }
      console.log('✅ Working hours saved via saveAllSettings')
      isSavingWorkingHours.value = false
    } catch (whErr: any) {
      isSavingWorkingHours.value = false
      console.error('❌ Working hours save failed:', whErr)
      throw whErr
    }

    // 2. Staff-Kategorien speichern (temporär deaktiviert - Tabelle existiert nicht)
    console.log('🔥 Staff categories saving disabled - table does not exist')
    // TODO: Implementiere staff_categories Tabelle oder alternative Lösung

    // 3. Lektionsdauern speichern (temporär deaktiviert - Tabelle existiert nicht)
    console.log('🔥 Lesson durations saving disabled - table does not exist')
    // TODO: Implementiere staff_category_durations Tabelle oder alternative Lösung

    // 3. Staff Settings speichern (temporär deaktiviert - Tabelle existiert nicht)
    console.log('🔥 Staff settings saving disabled - table does not exist')
    // TODO: Implementiere staff_settings Tabelle oder alternative Lösung

    console.log('✅ All settings saved successfully!')
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

// Logout Funktion
const handleLogout = async () => {
  try {
    const supabase = getSupabase()
    
    // Direct logout without confirmation for better UX
    
    // Logout aus Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ Logout error:', error)
      showErrorToast('Abmeldung fehlgeschlagen', 'Bitte versuchen Sie es erneut.')
      return
    }
    
    // Erfolgreiche Abmeldung
    showSuccessToast('Erfolgreich abgemeldet', 'Sie werden zur Anmeldeseite weitergeleitet.')
    
    // Kurze Verzögerung für Toast-Anzeige
    setTimeout(async () => {
      // Schließe das Modal
      emit('close')
      
      // Navigiere zur tenant-spezifischen Login-Seite
      const { currentTenantBranding } = useTenantBranding()
      const slug = currentTenantBranding.value?.slug
      await navigateTo(slug ? `/${slug}` : '/login')
    }, 1500)
    
  } catch (err: any) {
    console.error('❌ Logout error:', err)
    showErrorToast('Abmeldung fehlgeschlagen', 'Ein unerwarteter Fehler ist aufgetreten.')
  }
}

// Helper function to extract HH:MM from working hours data
const formatWorkingTime = (timeValue: any): string => {
  if (!timeValue) return '08:00'
  
  // If it's already HH:MM format
  if (typeof timeValue === 'string' && timeValue.includes(':')) {
    const [hours, minutes] = timeValue.split(':')
    return `${hours.padStart(2, '0')}:${minutes.slice(0, 2).padStart(2, '0')}`
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
    
    console.log(`🔍 Initializing day ${day.value}:`, dayWorkingHours)
    
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
  
  console.log('✅ Working day form initialized:', workingDayForm.value)
}

// Auto-Save für einzelnen Arbeitstag (Legacy)
const autoSaveWorkingHour = async (dayOfWeek: number) => {
  if (!props.currentUser?.id) return
  
  isSavingWorkingHours.value = true
  try {
    const formData = workingHoursForm.value[dayOfWeek]
    console.log(`💾 Auto-saving day ${dayOfWeek}:`, formData)
    
    await saveWorkingHour(props.currentUser.id, {
      day_of_week: dayOfWeek,
      start_time: formData.start_time,
      end_time: formData.end_time,
      is_active: formData.is_active
    })
    
    console.log(`✅ Day ${dayOfWeek} auto-saved successfully`)
    
    // Reload working hours to update calendar
    await loadWorkingHours(props.currentUser.id)
    console.log('🔄 Working hours reloaded after save')
    
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
const autoSaveWorkingDay = async (dayOfWeek: number) => {
  if (!props.currentUser?.id) return
  
  isSavingWorkingHours.value = true
  try {
    const dayData = workingDayForm.value[dayOfWeek]
    console.log(`💾 Auto-saving working day ${dayOfWeek}:`, dayData)
    
    await saveWorkingDay(props.currentUser.id, dayData)
    
    console.log(`✅ Working day ${dayOfWeek} auto-saved successfully`)
    
    // Reload working hours to update calendar
    await loadWorkingHours(props.currentUser.id)
    console.log('🔄 Working hours reloaded after save')
    
    // Emit event to notify parent (calendar needs to reload)
    emit('settings-updated')
    
  } catch (err: any) {
    console.error(`❌ Error auto-saving working day ${dayOfWeek}:`, err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    setTimeout(() => {
      isSavingWorkingHours.value = false
    }, 500) // Kurz anzeigen, dann ausblenden
  }
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
    console.log('💾 Saving working hours for staff:', props.currentUser.id)
    console.log('📊 Form data:', workingHoursForm.value)
    
    // Save each day's working hours (including inactive ones)
    for (const day of weekdays) {
      const formData = workingHoursForm.value[day.value]
      console.log(`💾 Saving day ${day.value}:`, formData)
      
      try {
        await saveWorkingHour(props.currentUser.id, {
          day_of_week: day.value,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_active: formData.is_active
        })
        console.log(`✅ Day ${day.value} saved successfully`)
      } catch (dayErr: any) {
        console.error(`❌ Error saving day ${day.value}:`, dayErr)
        throw dayErr
      }
    }
    
    console.log('✅ All working hours saved successfully')
    
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
    const supabase = getSupabase()
    
    // Delete all working hours for this staff
    const { error } = await supabase
      .from('staff_working_hours')
      .delete()
      .eq('staff_id', props.currentUser.id)
    
    if (error) throw error
    
    // Reload and reinitialize form
    await loadWorkingHours(props.currentUser.id)
    initializeWorkingHoursForm()
    
    console.log('✅ All working hours cleared')
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
  await loadData()
  await loadWorkingHoursData()
  await loadExamLocations()
  
  // Load working hours from composable
  if (props.currentUser?.id) {
    await loadWorkingHours(props.currentUser.id)
  }
  
  // Initialize working hours form after data is loaded
  initializeWorkingHoursForm()
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
</style>