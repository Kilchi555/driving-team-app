<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      
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
        <div class="bg-white shadow rounded-lg p-4 mb-6">
          <div class="flex items-center justify-center">
            <div class="flex items-center space-x-2 sm:space-x-4">
              <div class="flex items-center">
                <div :class="['w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold', 
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600']">
                  1
                </div>
                <span :class="['ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:block', currentStep >= 1 ? 'text-blue-600' : 'text-gray-500']">
                  Kategorie
                </span>
              </div>
              <div class="w-4 sm:w-8 h-0.5 bg-gray-200"></div>
              <div class="flex items-center">
                <div :class="['w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold', 
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600']">
                  2
                </div>
                <span :class="['ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:block', currentStep >= 2 ? 'text-blue-600' : 'text-gray-500']">
                  Standort
                </span>
              </div>
              <div class="w-4 sm:w-8 h-0.5 bg-gray-200"></div>
              <div class="flex items-center">
                <div :class="['w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold', 
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600']">
                  3
                </div>
                <span :class="['ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:block', currentStep >= 3 ? 'text-blue-600' : 'text-gray-500']">
                  Fahrlehrer
                </span>
              </div>
              <div class="w-4 sm:w-8 h-0.5 bg-gray-200"></div>
              <div class="flex items-center">
                <div :class="['w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold', 
                  currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600']">
                  4
                </div>
                <span :class="['ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden sm:block', currentStep >= 4 ? 'text-blue-600' : 'text-gray-500']">
                  Termin
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: Category Selection -->
        <div v-if="currentStep === 1" class="bg-white shadow rounded-lg p-4">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wählen Sie Ihre Fahrkategorie</h2>
          </div>
          
          <div :class="`grid ${getGridClasses(categories.length)} gap-3`">
            <div 
              v-for="category in categories" 
              :key="category.id"
              @click="selectCategory(category)"
              class="group cursor-pointer rounded-xl p-3 sm:p-4 md:p-6 hover:shadow-lg transition-all duration-200 border-2"
              :style="getCategoryCardStyle(category)"
            >
              <div class="text-center">
                <div class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 md:mb-4 transition-colors"
                     :style="getCategoryBadgeStyle(category)">
                  <span class="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{{ category.code }}</span>
                </div>
                <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{{ category.name }}</h3>
                <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{{ category.description }}</p>
                <div class="text-xs font-medium text-gray-700">{{ category.lesson_duration_minutes }} Min.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Location Selection -->
        <div v-if="currentStep === 2" class="bg-white shadow rounded-lg p-4">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wählen Sie einen Standort</h2>
            <p class="text-sm sm:text-base text-gray-600">Wo möchten Sie Ihre Fahrstunde nehmen?</p>
            <div class="mt-2 text-sm text-blue-600">
              Kategorie: <span class="font-semibold">{{ selectedCategory?.code }} - {{ selectedCategory?.name }}</span>
            </div>
          </div>
          
          <div :class="`grid ${getGridClasses(availableLocations.length)} gap-4`">
            <div 
              v-for="location in availableLocations" 
              :key="location.id"
              @click="selectLocation(location)"
              class="group cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 sm:p-5 md:p-6 hover:border-green-400 hover:shadow-lg transition-all duration-200"
            >
              <div class="flex items-start space-x-3 sm:space-x-4">
                <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors flex-shrink-0">
                  <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 truncate">{{ location.name }}</h3>
                  <p v-if="location.address" class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{{ location.address }}</p>
                  <div class="text-xs text-green-600 font-medium">
                    {{ location.available_staff?.length || 0 }} Fahrlehrer
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-6 text-center">
            <button 
              @click="goBackToStep(1)"
              class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Zurück zur Kategorie-Auswahl
            </button>
          </div>
        </div>

        <!-- Step 3: Instructor Selection -->
        <div v-if="currentStep === 3" class="bg-white shadow rounded-lg p-4">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wählen Sie Ihren Fahrlehrer</h2>
            <p class="text-sm sm:text-base text-gray-600">Wer soll Ihre Fahrstunde durchführen?</p>
            <div class="mt-2 text-sm text-blue-600">
              {{ selectedCategory?.code }} - {{ selectedLocation?.name }}
            </div>
          </div>
          
          <div :class="`grid ${getGridClasses(availableInstructors.length)} gap-4`">
            <div 
              v-for="instructor in availableInstructors" 
              :key="instructor.id"
              @click="selectInstructor(instructor)"
              class="group cursor-pointer bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-4 sm:p-5 md:p-6 hover:border-purple-400 hover:shadow-lg transition-all duration-200"
            >
              <div class="flex items-start space-x-3 sm:space-x-4">
                <div class="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors flex-shrink-0">
                  <span class="text-sm sm:text-base md:text-xl font-bold text-purple-600">
                    {{ instructor.first_name.charAt(0) }}{{ instructor.last_name.charAt(0) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 truncate">
                    {{ instructor.first_name }} {{ instructor.last_name }}
                  </h3>
                  <p class="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">
                    Kategorien: {{ Array.isArray(instructor.category) ? instructor.category.join(', ') : 'N/A' }}
                  </p>
                  <div class="text-xs text-purple-600 font-medium">
                    Termine verfügbar
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="mt-6 text-center">
            <button 
              @click="goBackToStep(2)"
              class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Zurück zur Standort-Auswahl
            </button>
          </div>
        </div>

        <!-- Step 4: Time Slot Selection -->
        <div v-if="currentStep === 4" class="bg-white shadow rounded-lg p-4">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Wählen Sie einen Termin</h2>
            <p class="text-sm sm:text-base text-gray-600">Wann möchten Sie Ihre Fahrstunde haben?</p>
            <div class="mt-2 text-sm text-blue-600">
              {{ selectedCategory?.code }} - {{ selectedLocation?.name }} - {{ selectedInstructor?.first_name }} {{ selectedInstructor?.last_name }}
            </div>
          </div>
          
          <!-- Loading Time Slots -->
          <div v-if="isLoadingTimeSlots" class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">Verfügbare Termine werden geladen...</p>
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
                  class="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm rounded-lg border-2 border-green-200 bg-green-50 text-green-800 hover:border-green-400 hover:bg-green-100 transition-all duration-200"
                >
                  <div class="font-medium text-xs sm:text-sm">{{ slot.time_formatted }}</div>
                  <div class="text-xs text-green-600">{{ slot.duration_minutes }} Min.</div>
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
            <button 
              @click="goBackToStep(3)"
              class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Zurück zur Fahrlehrer-Auswahl
            </button>
          </div>
        </div>

        <!-- System Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 class="text-lg font-medium text-blue-800 mb-2">ℹ️ System-Informationen</h3>
          <div class="text-sm text-blue-700 space-y-1">
            <p><strong>Fahrschule:</strong> {{ currentTenant?.name || 'Nicht geladen' }}</p>
            <p><strong>Aktueller Schritt:</strong> {{ currentStep }} von 4</p>
            <p><strong>Gewählte Kategorie:</strong> {{ selectedCategory?.code || 'Keine' }}</p>
            <p><strong>Gewählter Standort:</strong> {{ selectedLocation?.name || 'Keiner' }}</p>
            <p><strong>Gewählter Fahrlehrer:</strong> {{ selectedInstructor ? `${selectedInstructor.first_name} ${selectedInstructor.last_name}` : 'Keiner' }}</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAvailabilitySystem } from '~/composables/useAvailabilitySystem'
import { useExternalCalendarSync } from '~/composables/useExternalCalendarSync'
import { getSupabase } from '~/utils/supabase'
import { useRoute } from '#app'
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
  activeStaff 
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
const currentWeek = ref(1)
const maxWeek = ref(4)

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
        const { data: staffLocations, error: slError } = await supabase
          .from('locations')
          .select('*')
          .eq('staff_id', staff.id)
          .eq('is_active', true)
          .eq('location_type', 'standard')
        
        if (slError) {
          console.error(`❌ Error loading locations for ${staff.first_name}:`, slError)
          return { staffId: staff.id, locations: [] }
        }
        
        console.log(`✅ Loaded ${staffLocations?.length || 0} standard locations for ${staff.first_name} ${staff.last_name}`)
        return { staffId: staff.id, locations: staffLocations || [] }
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
const selectCategory = async (category: any) => {
  selectedCategory.value = category
  filters.value.category_code = category.code
  filters.value.duration_minutes = category.lesson_duration_minutes || 45
  
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
  
  currentStep.value = 2
}

const selectLocation = (location: any) => {
  selectedLocation.value = location
  
  // Get instructors available at this location
  availableInstructors.value = location.available_staff || []
  
  currentStep.value = 3
}

const selectInstructor = async (instructor: any) => {
  selectedInstructor.value = instructor
  
  // Generate time slots for this specific instructor-location combination
  await generateTimeSlotsForSpecificCombination()
  
  currentStep.value = 4
}

const generateTimeSlotsForSpecificCombination = async () => {
  try {
    isLoadingTimeSlots.value = true
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
    
    availableTimeSlots.value = timeSlots.filter(slot => slot.is_available)
    console.log(`✅ Generated ${availableTimeSlots.value.length} available time slots`)
  } catch (err) {
    console.error('❌ Error generating time slots:', err)
  } finally {
    isLoadingTimeSlots.value = false
  }
}

const selectTimeSlot = (slot: any) => {
  selectedSlot.value = slot
  console.log('✅ Time slot selected:', slot)
  
  // TODO: Navigate to booking confirmation or show booking modal
  alert(`Termin ausgewählt: ${slot.staff_name} am ${slot.date_formatted} um ${slot.time_formatted}`)
}

const goBackToStep = (step: number) => {
  currentStep.value = step
  
  // Reset subsequent selections
  if (step < 4) {
    selectedInstructor.value = null
    availableTimeSlots.value = []
  }
  if (step < 3) {
    selectedLocation.value = null
    availableInstructors.value = []
  }
  if (step < 2) {
    selectedCategory.value = null
    availableLocations.value = []
    availableStaff.value = []
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

const withAlpha = (hex: string, alpha: number) => {
  // Convert #RRGGBB to rgba
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getCategoryCardStyle = (category: any) => {
  const base = getBrandPrimary()
  return {
    background: `linear-gradient(135deg, ${withAlpha(base, 0.08)} 0%, ${withAlpha(base, 0.15)} 100%)`,
    borderColor: withAlpha(base, 0.35)
  }
}

const getCategoryBadgeStyle = (category: any) => {
  const base = getBrandSecondary()
  return {
    backgroundColor: withAlpha(base, 0.18),
    border: `2px solid ${withAlpha(base, 0.5)}`
  }
}

const getCategoryTextStyle = (category: any) => {
  const base = getBrandSecondary()
  return {
    color: base
  }
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
  try {
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
</script>
