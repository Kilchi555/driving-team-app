<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-slate-800">Kursanmeldung</h2>
          <button 
            @click="$emit('close')" 
            class="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Course Info -->
          <div class="rounded-lg p-4 mb-6" :style="{ backgroundColor: getTenantBackgroundColor() }">
            <h3 class="font-semibold text-gray-800">{{ course.name.split(' - ')[0] }}</h3>
            <p class="text-sm mt-1 text-gray-500">{{ course.description }}</p>
            <p class="text-lg font-bold mt-2 text-gray-800">CHF {{ formatPrice(course.price_per_participant_rappen) }}</p>
            
            <!-- Sessions overview -->
            <div class="mt-3 space-y-1">
              <div 
                v-for="(session, idx) in sessionGroups" 
                :key="idx" 
                class="text-sm p-2 rounded-lg"
                :class="session.isCustom ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'"
              >
                <span class="text-gray-800 font-medium">{{ session.label }}: </span>
                <span class="text-gray-800">{{ formatSessionDate(session.displayDate) }} </span>
                <span class="text-gray-500">{{ session.timeRange }}</span>
                <span v-if="session.isCustom" class="ml-2 text-xs text-blue-600">({{ session.customCourseName }})</span>
              </div>
            </div>
            
            <!-- Sessions anpassen Button -->
            <button
              v-if="hasChangeableSessions"
              @click="showSessionCustomizer = true"
              class="mt-3 w-full py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2"
              :style="{ 
                color: getTenantPrimaryColor(), 
                borderColor: getTenantPrimaryColor() 
              }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ hasCustomSessions ? 'Sessions bearbeiten' : 'Sessions anpassen' }}
            </button>
          </div>
          
          <!-- Session Customizer Modal -->
          <div 
            v-if="showSessionCustomizer" 
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            @click.self="showSessionCustomizer = false"
          >
            <div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
              <div class="p-4 border-b flex items-center justify-between">
                <h3 class="font-semibold text-gray-800">Sessions anpassen</h3>
                <button @click="showSessionCustomizer = false" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="p-4 overflow-y-auto max-h-[65vh]">
                <p class="text-sm text-gray-600 mb-4">
                  Wähle für jede Session das gewünschte Datum. Die erste Session ist fix.
                </p>
                
                <!-- All sessions list -->
                <div class="space-y-3">
                  <div 
                    v-for="session in sessionGroups" 
                    :key="session.position"
                    class="p-3 rounded-lg border"
                    :class="session.isCustom ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-medium text-gray-800">{{ session.label }}</span>
                        <span v-if="!session.isChangeable" class="ml-2 text-xs text-gray-400">(fix)</span>
                      </div>
                      <button
                        v-if="session.isChangeable"
                        @click="openSessionSwapModal(session)"
                        class="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                        :style="{ 
                          backgroundColor: getTenantPrimaryColor(),
                          color: 'white'
                        }"
                      >
                        Ändern
                      </button>
                    </div>
                    <div class="mt-1 text-sm">
                      <span class="text-gray-700">{{ formatSessionDate(session.displayDate) }}</span>
                      <span class="text-gray-500 ml-2">{{ session.timeRange }}</span>
                    </div>
                    <div v-if="session.isCustom" class="mt-1 text-xs text-blue-600">
                      {{ session.customCourseName }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="p-4 border-t">
                <button
                  @click="showSessionCustomizer = false"
                  class="w-full py-2 text-white font-medium rounded-lg transition-colors"
                  :style="{ backgroundColor: getTenantPrimaryColor() }"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
          
          <!-- Session Swap Options Modal (nested) -->
          <div 
            v-if="showSessionSwapModal" 
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            @click.self="closeSessionSwapModal"
          >
            <div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div class="p-4 border-b flex items-center justify-between">
                <h3 class="font-semibold text-gray-800">{{ swapModalTitle }}</h3>
                <button @click="closeSessionSwapModal" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="p-4 overflow-y-auto max-h-[60vh]">
                <div v-if="isLoadingSwapOptions" class="text-center py-8">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" :style="{ borderColor: getTenantPrimaryColor() }"></div>
                  <p class="text-sm text-gray-500">Lade verfügbare Sessions...</p>
                </div>
                
                <div v-else-if="availableSwapSessions.length === 0" class="text-center py-8 text-gray-500">
                  <p>Keine alternativen Sessions verfügbar.</p>
                </div>
                
                <div v-else class="space-y-2">
                  <!-- Option to reset to original -->
                  <button
                    v-if="swappingSession?.isCustom"
                    @click="resetSessionToOriginal"
                    class="w-full p-3 text-left rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <div class="font-medium text-gray-800">Original wiederherstellen</div>
                    <div class="text-sm text-gray-500">Zurück zur ursprünglichen Session</div>
                  </button>
                  
                  <!-- Available sessions -->
                  <button
                    v-for="option in availableSwapSessions"
                    :key="option.sessionId"
                    @click="selectSwapSession(option)"
                    class="w-full p-3 text-left rounded-lg border-2 transition-colors"
                    :class="option.isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'"
                  >
                    <div class="flex justify-between items-start">
                      <div>
                        <div class="font-medium text-gray-800">{{ formatSessionDate(option.date) }}</div>
                        <div class="text-sm text-gray-600">{{ formatSwapTime(option.startTime, option.endTime) }}</div>
                        <div class="text-xs text-gray-500 mt-1">{{ option.courseLocation }}</div>
                      </div>
                      <div class="text-right">
                        <span class="text-xs px-2 py-1 rounded-full" :class="option.freeSlots > 3 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                          {{ option.freeSlots }} frei
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 1: SARI Lookup -->
          <div v-if="step === 'lookup'">
            <h4 class="font-medium text-slate-800 mb-4">Schritt 1: Identifikation</h4>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Lernfahrausweis ID *</label>
                <input 
                  v-model="formData.faberid"
                  type="text"
                  placeholder=""
                  class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  :style="{ '--tw-ring-color': getTenantPrimaryColor(), borderColor: isFaberIdFocused ? getTenantPrimaryColor() : 'rgb(203, 213, 225)' }"
                  @focus="isFaberIdFocused = true"
                  @blur="isFaberIdFocused = false"
                />
                <p class="text-xs text-slate-500 mt-1">Für ZH & AG die Nummer im Adressfeld, andere Kantone Faber oder Reg-Nr</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Geburtsdatum</label>
                <input 
                  v-model="formData.birthdate"
                  type="date"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div v-if="lookupError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ lookupError }}
            </div>

              <button 
                @click="lookupSARI"
                :disabled="!canLookup || isLoading"
                class="mt-6 w-full py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                :style="{ backgroundColor: getTenantPrimaryColor() }"
              >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Wird geprüft...
              </span>
              <span v-else>Weiter</span>
            </button>
          </div>

          <!-- Step 2: Contact & Payment -->
          <div v-else-if="step === 'contact'">
            <h4 class="font-medium text-slate-800 mb-4">Schritt 2: Kontaktdaten & Zahlung</h4>
            
            <!-- SARI Data Display -->
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div class="flex items-center gap-2 text-green-700 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="font-medium">Daten verifiziert</span>
              </div>
              <p class="text-sm text-green-800">{{ sariData?.firstname }} {{ sariData?.lastname }}</p>
              <p class="text-sm text-green-700">{{ sariData?.address }}, {{ sariData?.zip }} {{ sariData?.city }}</p>
            </div>

            <!-- Contact Details -->
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">E-Mail *</label>
                <input 
                  v-model="formData.email"
                  type="email"
                  placeholder="deine@email.ch"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  :class="{ 'border-red-300': formData.email && !isValidEmail }"
                />
                <p v-if="formData.email && !isValidEmail" class="text-xs text-red-500 mt-1">Bitte gib eine gültige E-Mail ein</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Telefon *</label>
                <input 
                  v-model="formData.phone"
                  type="tel"
                  placeholder="+41"
                  class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  :style="{ '--tw-ring-color': getTenantPrimaryColor(), borderColor: isPhoneFocused ? getTenantPrimaryColor() : 'rgb(203, 213, 225)' }"
                  :class="{ 'border-red-300': formData.phone && !isValidPhone }"
                  @focus="isPhoneFocused = true"
                  @blur="isPhoneFocused = false; formatPhoneNumber()"
                />
                <p v-if="formData.phone && !isValidPhone" class="text-xs text-red-500 mt-1">Bitte gib eine gültige Telefonnummer ein</p>
              </div>
            </div>

            <!-- Payment Method -->
            <div class="border-t pt-4">
              <p class="text-sm font-medium text-slate-700 mb-2">Zahlungsart</p>
              <p class="text-slate-600">{{ paymentMethodLabel }}</p>
            </div>

            <div v-if="enrollmentError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ enrollmentError }}
            </div>

            <!-- AGB Checkbox -->
            <div class="mt-6 flex items-start gap-3">
              <input 
                id="agb-checkbox"
                v-model="agbAccepted"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                :style="{ accentColor: getTenantPrimaryColor() }"
              />
              <label for="agb-checkbox" class="text-sm text-slate-600">
                Ich habe die 
                <a 
                  :href="`/reglemente/agb?tenant=${props.tenantSlug}`" 
                  target="_blank" 
                  class="underline hover:no-underline"
                  :style="{ color: getTenantPrimaryColor() }"
                >AGB's</a> 
                gelesen und akzeptiere diese.
              </label>
            </div>

            <div class="flex gap-3 mt-4">
              <button 
                @click="step = 'lookup'"
                class="flex-1 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Zurück
              </button>
              <button 
                @click="submitEnrollment"
                :disabled="!canSubmit || isLoading"
                class="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                :style="{ backgroundColor: getTenantPrimaryColor() }"
              >
                <span v-if="isLoading" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Lädt...
                </span>
                <span v-else>{{ paymentMethod === 'WALLEE' ? 'Zur Zahlung' : 'Verbindlich anmelden' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { logger } from '~/utils/logger'
import { extractCityFromCourseDescription, determinePaymentMethod, getPaymentMethodLabel } from '~/utils/courseLocationUtils'
import { useTenant } from '~/composables/useTenant'

interface Props {
  isOpen: boolean
  course: any
  tenantId: string
  tenantSlug: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'enrolled'])

// Tenant hooks
const { tenantPrimaryColor } = useTenant()

// Helper functions for colors
const getTenantPrimaryColor = () => {
  return tenantPrimaryColor.value || '#3B82F6'
}

const getTenantBackgroundColor = () => {
  const primary = getTenantPrimaryColor()
  return primary + '10' // 10% opacity version
}

const getTextColor = () => {
  return { color: getTenantPrimaryColor() }
}

// State
const step = ref<'lookup' | 'contact'>('lookup')
const isLoading = ref(false)
const lookupError = ref<string | null>(null)
const enrollmentError = ref<string | null>(null)
const sariData = ref<any>(null)
const isFaberIdFocused = ref(false)
const isPhoneFocused = ref(false)

const formData = ref({
  faberid: '',
  birthdate: '',
  email: '',
  phone: ''
})

// Computed
const paymentMethod = computed(() => {
  const city = extractCityFromCourseDescription(props.course?.description || props.course?.name || '')
  return determinePaymentMethod(city)
})

const paymentMethodLabel = computed(() => getPaymentMethodLabel(paymentMethod.value))

const canLookup = computed(() => {
  return formData.value.faberid.length >= 6 && formData.value.birthdate
})

const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(formData.value.email)
})

const isValidPhone = computed(() => {
  const phoneClean = formData.value.phone.replace(/\s/g, '')
  return phoneClean.length >= 10
})

const agbAccepted = ref(false)

// Session swap state
const customSessions = ref<Record<string, any>>({})
const showSessionCustomizer = ref(false)
const showSessionSwapModal = ref(false)
const swappingSession = ref<any>(null)
const availableSwapSessions = ref<any[]>([])
const isLoadingSwapOptions = ref(false)

// Check if any sessions can be changed
const hasChangeableSessions = computed(() => {
  return sessionGroups.value.some(s => s.isChangeable)
})

// Check if user has customized any sessions
const hasCustomSessions = computed(() => {
  return Object.keys(customSessions.value).length > 0
})

const canSubmit = computed(() => {
  return isValidEmail.value && isValidPhone.value && sariData.value && agbAccepted.value
})

const groupedSessions = computed(() => {
  if (!props.course?.course_sessions?.length) return []
  
  const sorted = [...props.course.course_sessions].sort((a: any, b: any) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  const grouped: { date: string; startTime: string; endTime: string; parts: number }[] = []
  let currentDate = ''
  let currentGroup: { date: string; startTime: string; endTime: string; parts: number } | null = null
  
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    
    if (date !== currentDate) {
      if (currentGroup) grouped.push(currentGroup)
      currentDate = date
      currentGroup = {
        date,
        startTime: session.start_time,
        endTime: session.end_time,
        parts: 1
      }
    } else if (currentGroup) {
      currentGroup.endTime = session.end_time
      currentGroup.parts++
    }
  }
  
  if (currentGroup) grouped.push(currentGroup)
  
  return grouped.map(g => ({
    date: g.date,
    timeRange: `${formatTime(g.startTime)} - ${formatTime(g.endTime)}`,
    parts: g.parts
  }))
})

// Session groups with swap capability
const sessionGroups = computed(() => {
  if (!props.course?.course_sessions?.length) return []
  
  const sorted = [...props.course.course_sessions].sort((a: any, b: any) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  // Group by date
  const byDate: Map<string, any[]> = new Map()
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(session)
  }
  
  // Build session groups
  const groups: any[] = []
  let position = 0
  
  for (const [date, sessions] of byDate.entries()) {
    position++
    const isGrouped = sessions.length > 1 // Multiple sessions on same day = grouped
    
    // Check if this session has been customized
    const customSession = customSessions.value[position.toString()]
    
    groups.push({
      position,
      label: `Teil ${position}${isGrouped ? `-${position + sessions.length - 1}` : ''}`,
      date,
      displayDate: customSession?.date || date,
      startTime: sessions[0].start_time,
      endTime: sessions[sessions.length - 1].end_time,
      timeRange: customSession 
        ? formatSwapTime(customSession.startTime, customSession.endTime)
        : `${formatTime(sessions[0].start_time)} - ${formatTime(sessions[sessions.length - 1].end_time)}`,
      parts: sessions.length,
      isChangeable: position > 1, // Can change any session/group except the first one
      isCustom: !!customSession,
      customCourseName: customSession?.courseName?.split(' - ')[0],
      originalSariIds: sessions.map((s: any) => s.sari_session_id).filter(Boolean),
      sariIds: customSession?.sariSessionId ? [customSession.sariSessionId] : sessions.map((s: any) => s.sari_session_id).filter(Boolean)
    })
    
    // If grouped, skip the additional positions
    if (isGrouped) {
      position += sessions.length - 1
    }
  }
  
  return groups
})

const swapModalTitle = computed(() => {
  if (!swappingSession.value) return ''
  return `${swappingSession.value.label} ändern`
})

// Methods
const formatPrice = (rappen: number) => (rappen / 100).toFixed(2)

const formatSwapTime = (startTime: string, endTime: string) => {
  if (!startTime) return ''
  const start = formatTime(startTime)
  const end = endTime ? formatTime(endTime) : ''
  return end ? `${start} - ${end}` : start
}

// Session swap methods
const openSessionSwapModal = async (session: any) => {
  swappingSession.value = session
  showSessionSwapModal.value = true
  isLoadingSwapOptions.value = true
  availableSwapSessions.value = []
  
  try {
    // Get the date of the previous session for chronological validation
    const prevSession = sessionGroups.value.find((s: any) => s.position === session.position - 1)
    const afterDate = prevSession?.displayDate || prevSession?.date
    
    const response = await $fetch('/api/courses/available-sessions', {
      query: {
        tenantId: props.tenantId,
        category: props.course.category,
        sessionPosition: session.position,
        afterDate,
        excludeCourseId: props.course.id,
        courseLocation: props.course.description
      }
    }) as any
    
    if (response.success) {
      availableSwapSessions.value = response.sessions.map((s: any) => ({
        ...s,
        isSelected: customSessions.value[session.position.toString()]?.sariSessionId === s.sariSessionId
      }))
    }
  } catch (error) {
    console.error('Error loading swap options:', error)
  } finally {
    isLoadingSwapOptions.value = false
  }
}

const closeSessionSwapModal = () => {
  showSessionSwapModal.value = false
  swappingSession.value = null
  availableSwapSessions.value = []
}

const selectSwapSession = (option: any) => {
  if (!swappingSession.value) return
  
  customSessions.value[swappingSession.value.position.toString()] = {
    sariSessionId: option.sariSessionId,
    sessionId: option.sessionId,
    courseId: option.courseId,
    courseName: option.courseName,
    date: option.date,
    startTime: option.startTime,
    endTime: option.endTime
  }
  
  closeSessionSwapModal()
}

const resetSessionToOriginal = () => {
  if (!swappingSession.value) return
  
  delete customSessions.value[swappingSession.value.position.toString()]
  closeSessionSwapModal()
}

const formatSessionDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    const formatted = new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
    // Replace comma and format weekday to 2 chars + dot
    const parts = formatted.split(' ')
    if (parts.length > 0) {
      parts[0] = parts[0].slice(0, 2) + '.'
    }
    return parts.join(' ')
  } catch {
    return dateStr
  }
}

const formatTime = (isoString: string) => {
  try {
    if (!isoString) return ''
    const parts = isoString.split('T')
    if (parts.length < 2) return ''
    const timeWithZone = parts[1]
    return timeWithZone.substring(0, 5)
  } catch {
    return ''
  }
}

const lookupSARI = async () => {
  isLoading.value = true
  lookupError.value = null
  
  try {
    const faberidClean = formData.value.faberid.replace(/\./g, '')
    
    // Ensure birthdate is in YYYY-MM-DD format
    let birthdate = formData.value.birthdate
    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = birthdate.split('.')
      if (parts.length === 3) {
        birthdate = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
    }
    
    const response = await $fetch('/api/sari/lookup-customer', {
      method: 'POST',
      body: {
        faberid: faberidClean,
        birthdate: birthdate,
        tenantId: props.tenantId
      }
    }) as any
    
    if (response.success && response.customer) {
      sariData.value = response.customer
      formData.value.email = response.customer.email || ''
      formData.value.phone = response.customer.phone || ''
      step.value = 'contact'
    } else {
      lookupError.value = getGermanErrorMessage(response)
    }
  } catch (error: any) {
    logger.error('SARI lookup error:', error)
    lookupError.value = getGermanErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const submitEnrollment = async () => {
  isLoading.value = true
  enrollmentError.value = null
  
  try {
    const faberidClean = formData.value.faberid.replace(/\./g, '')
    
    // Ensure birthdate is in YYYY-MM-DD format
    let birthdate = formData.value.birthdate
    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = birthdate.split('.')
      if (parts.length === 3) {
        birthdate = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
    }
    
    const endpoint = paymentMethod.value === 'WALLEE' 
      ? '/api/courses/enroll-wallee'
      : '/api/courses/enroll-cash'
    
    // Build custom sessions object if any sessions were swapped
    const hasCustomSessions = Object.keys(customSessions.value).length > 0
    
    const response = await $fetch(endpoint, {
      method: 'POST',
      body: {
        courseId: props.course.id,
        faberid: faberidClean,
        birthdate: birthdate,
        tenantId: props.tenantId,
        email: formData.value.email,
        phone: formData.value.phone,
        customSessions: hasCustomSessions ? customSessions.value : null
      }
    }) as any
    
    if (response.success) {
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl
      } else {
        emit('enrolled')
      }
    } else {
      enrollmentError.value = getGermanErrorMessage(response)
    }
  } catch (error: any) {
    logger.error('Enrollment error:', error)
    enrollmentError.value = getGermanErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

// Reset on close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Start with session customizer open if called from course page
    showSessionCustomizer.value = false // Will open normally unless specified
  } else {
    step.value = 'lookup'
    lookupError.value = null
    enrollmentError.value = null
    sariData.value = null
    agbAccepted.value = false
    customSessions.value = {}
    showSessionCustomizer.value = false
    showSessionSwapModal.value = false
    swappingSession.value = null
    availableSwapSessions.value = []
    formData.value = { faberid: '', birthdate: '', email: '', phone: '' }
  }
})

const getCourseInfoStyle = () => {
  return {
    backgroundColor: getTenantBackgroundColor(),
    borderColor: getTenantPrimaryColor()
  }
}

const getGermanErrorMessage = (error: any): string => {
  // Try multiple error message locations
  const message = error.data?.message || error.message || error.statusMessage || error.data || ''
  const statusCode = error.data?.statusCode || error.statusCode
  
  // License errors from SARI
  if (message.includes('Lizenz') || message.includes('Fahrerlaubnis') || message.includes('Category')) {
    return message
  }
  if (message.includes('Dieser Kurs ist leider ausgebucht.')) {
    return 'Dieser Kurs ist leider ausgebucht.'
  }
  if (message.includes('Sie sind bereits für diesen Kurs angemeldet.')) {
    return 'Sie sind bereits für diesen Kurs angemeldet.'
  }
  if (message.includes('Die Lernfahrausweis ID ist ungültig.')) {
    return 'Überprüfen Sie Ihre Angaben. Die Lernfahrausweis ID scheint ungültig zu sein.'
  }
  if (message.includes('SARI validation failed')) {
    return 'Die eingegebenen Daten wurden nicht gefunden. Überprüfen Sie Ihre Angaben.'
  }
  if (message.includes('Ihre Fahrerlaubnis genügt nicht für diesen Kurs.')) {
    return 'Ihre Fahrerlaubnis genügt nicht für diesen Kurs.'
  }
  if (message.includes('Validation failed')) {
    return 'Ihre Eingaben sind ungültig. Bitte überprüfen Sie diese.'
  }
  if (message.includes('Missing required fields')) {
    return 'Es fehlen Pflichtfelder. Bitte füllen Sie alle Felder aus.'
  }
  if (message.includes('invalid input syntax for type uuid')) {
    return 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('SARI enrollment not possible')) {
    return 'Eine Anmeldung über SARI ist derzeit nicht möglich. Bitte kontaktieren Sie uns.'
  }
  if (message.includes('Could not verify course availability')) {
    return 'Die Kursverfügbarkeit konnte nicht überprüft werden. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Guest user could not be created')) {
    return 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Failed to create payment session')) {
    return 'Die Zahlung konnte nicht initialisiert werden. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Cash-on-site payment is only available for Einsiedeln courses')) {
    return 'Barzahlung vor Ort ist nur für Kurse in Einsiedeln verfügbar. Bitte wählen Sie Online-Zahlung.'
  }
  if (message.includes('Die E-Mail-Adresse ist ungültig.')) {
    return 'Überprüfen Sie Ihre Angaben. Die E-Mail-Adresse ist ungültig.'
  }
  if (message.includes('Die Telefonnummer ist ungültig.')) {
    return 'Überprüfen Sie Ihre Angaben. Die Telefonnummer ist ungültig.'
  }
  
  switch (statusCode) {
    case 400:
      return 'Überprüfen Sie Ihre Angaben. Diese scheinen ungültig zu sein.'
    case 401:
      return 'Sie sind nicht autorisiert. Bitte melden Sie sich an.'
    case 404:
      return 'Die angefragten Daten wurden nicht gefunden.'
    case 409:
      return 'Konflikt: Die Aktion konnte nicht ausgeführt werden (z.B. bereits angemeldet).'
    case 500:
      return 'Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    default:
      return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
}

const formatPhoneNumber = () => {
  let phone = formData.value.phone.replace(/\s/g, '').replace(/[^0-9+]/g, '')
  if (phone.startsWith('0041')) {
    phone = '+' + phone.substring(2)
  } else if (phone.startsWith('0')) {
    phone = '+41' + phone.substring(1)
  } else if (!phone.startsWith('+41') && phone.length > 0) {
    phone = '+41' + phone
  }
  formData.value.phone = phone
}
</script>

