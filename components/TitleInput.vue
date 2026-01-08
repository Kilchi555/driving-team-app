<!-- TitleInput.vue -->
<template>
  <div v-if="shouldShow" class="space-y-2">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📝 {{ labelText }}
    </label>
    
    <input
      :value="title"
      @input="updateTitle(($event.target as HTMLInputElement)?.value || '')"
      @blur="handleBlur"
      type="text"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors text-black bg-white"
      :placeholder="computedPlaceholder"
      :disabled="disabled"
      :maxlength="maxLength"
    />
  </div>
</template>

<script setup lang="ts">

import { computed, ref, watch } from 'vue'

interface Props {
  title: string
  eventType: 'lesson' | 'staff_meeting' | 'other' | 'meeting' | 'break' | 'training' | 'maintenance' | 'admin' | 'team_invite' | 'nothelfer' | 'vku'
  selectedStudent?: any
  selectedSpecialType?: string
  categoryCode?: string
  selectedLocation?: any
  disabled?: boolean
  maxLength?: number
  showSuggestions?: boolean
  showCharacterCount?: boolean
  autoGenerate?: boolean
  isLoadingFromDatabase?: boolean  // ✅ NEW: Flag to indicate title is from DB
  userId?: string  // ✅ NEW: For checking if user == staff (no customer)
  staffId?: string  // ✅ NEW: For checking if user == staff (no customer)
  eventTypeCode?: string  // ✅ NEW: Event type code to append (vku, nothelfer, etc.)
}

interface Emits {
  (e: 'update:title', value: string): void
  (e: 'title-generated', title: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  maxLength: 100,
  showSuggestions: true,
  showCharacterCount: true,
  autoGenerate: false
})

const emit = defineEmits<Emits>()

// State
const currentSuggestion = ref('')

// Computed Properties
const shouldShow = computed(() => {
  if (props.eventType === 'lesson') {
    return !!props.selectedStudent
  } else if (props.eventType === 'nothelfer' || props.eventType === 'vku') {
    return true // Always show for these event types
  } else {
    return !!props.selectedSpecialType
  }
})

const labelText = computed(() => {
  switch (props.eventType) {
    case 'lesson': return 'Titel'
    case 'staff_meeting': return 'Titel'
    case 'other': return 'Titel des Termins'
    case 'nothelfer': return 'Titel des Termins'
    case 'vku': return 'Titel des Termins'
    default: return 'Titel'
  }
})

const computedPlaceholder = computed(() => {
  if (!shouldShow.value) return ''
  
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const name = `${props.selectedStudent.first_name} ${props.selectedStudent.last_name}`
    const location = props.selectedLocation?.name || 'Treffpunkt'
    return `${name} - ${location}`
  }
  
  if (props.eventType === 'other' && props.selectedSpecialType) {
    return props.selectedSpecialType
  }
  
  if (props.eventType === 'nothelfer') {
    return 'Nothelfer-Begrüssung'
  }
  
  if (props.eventType === 'vku') {
    return 'VKU'
  }
  
  return 'Titel eingeben...'
})

const suggestions = computed(() => {
  if (!shouldShow.value) return []
  
  // ✅ WICHTIG: Im Edit Mode (isLoadingFromDatabase) KEINE Suggestions generieren!
  // Der Title kommt aus der DB und soll nicht überschrieben werden
  if (props.isLoadingFromDatabase) {
    logger.debug('🛑 TitleInput - Edit mode: Skip suggestion generation, use DB title')
    return []
  }
  
  // ✅ NEW LOGIC: Generate title based on requirements
  // Format: [Name -] Location [EVENT_CODE]
  // If user_id === staff_id: Only "Location [EVENT_CODE]" (no customer name)
  
  // 1. Get location
  let location = 'Treffpunkt'
  
  if (props.selectedLocation?.custom_location_address) {
    const customAddress = props.selectedLocation.custom_location_address
    if (customAddress.address && customAddress.address.includes(',')) {
      location = customAddress.address
    } else if (customAddress.name) {
      location = customAddress.name
    }
  } else if (props.selectedLocation?.name) {
    location = props.selectedLocation.name
  } else if (props.selectedLocation?.address) {
    location = props.selectedLocation.address
  }
  
  // If location name doesn't include city, try to use full address
  if (location && !location.includes(',')) {
    if (props.selectedLocation?.address && props.selectedLocation.address.includes(',')) {
      location = props.selectedLocation.address
    }
  }
  
  // 2. Event type code suffix - REMOVED (not needed anymore)
  // Titles will be clean without [VKU], [NOTHELFER] suffixes
  
  // 3. Check if appointment is without customer
  // Case 1: user_id === staff_id (staff created appointment for themselves)
  // Case 2: user_id is empty (no student selected - "Other Event Types")
  const isWithoutCustomer = (!props.userId || props.userId === '') || 
                           (props.userId && props.staffId && props.userId === props.staffId)
  
  // 4. Generate title
  const suggestions: string[] = []
  
  if (isWithoutCustomer || !props.selectedStudent) {
    // No customer: Just "Location" (without event code)
    suggestions.push(`${location}`)
    
    // Additional variations for events without customers
    if (props.selectedSpecialType) {
      suggestions.push(`${props.selectedSpecialType} - ${location}`)
    }
    if (props.eventTypeCode === 'vku') {
      suggestions.push(`Verkehrskunde - ${location}`)
      suggestions.push(`VKU ${location}`)
    }
    if (props.eventTypeCode === 'nothelfer') {
      suggestions.push(`Nothelfer - ${location}`)
      suggestions.push(`Nothelferkurs ${location}`)
    }
  } else if (props.selectedStudent) {
    // With customer: "Name - Location [EVENT_CODE]"
    const firstName = props.selectedStudent.first_name
    const lastName = props.selectedStudent.last_name
    const fullName = `${firstName} ${lastName}`
    const category = props.categoryCode ? ` ${props.categoryCode}` : ''
    
    // Main suggestion without event type code
    suggestions.push(`${fullName} - ${location}`)
    
    // Additional variations
    suggestions.push(`${fullName} - Fahrstunde ${location}`)
    suggestions.push(`${firstName} ${lastName} - ${location}${category}`)
    suggestions.push(`${fullName} - Übungsfahrt ${location}`)
    suggestions.push(`${fullName} - Prüfungsvorbereitung ${location}`)
    suggestions.push(`${firstName} ${lastName} - Erste Fahrstunde ${location}`)
    suggestions.push(`${fullName} - Autobahnfahrt ab ${location}`)
    suggestions.push(`${firstName} ${lastName} - Nachtfahrt ${location}`)
  } else {
    // Fallback for other event types
    if (props.eventType === 'staff_meeting') {
      return [
        'Team Meeting',
        'Wochenplanung',
        'Kundenbesprechu',
        'Qualitätssicherung',
        'Fahrzeugkontrolle',
        'Administration'
      ]
    }
    
    if (props.eventType === 'other' || props.eventType === 'nothelfer' || props.eventType === 'vku') {
      // For "other" events without specific data, just use location (without event code)
      suggestions.push(`${location}`)
      
      if (props.selectedSpecialType) {
        suggestions.push(`${props.selectedSpecialType} - ${location}`)
      }
      
      suggestions.push('Beratung')
      suggestions.push('Theorieunterricht')
      suggestions.push('Fahrzeugwartung')
      suggestions.push('Prüfung')
      suggestions.push('Verwaltung')
      suggestions.push('Pause')
    }
  }
  
  logger.debug('📍 TitleInput - Generated suggestions:', {
    location,
    isWithoutCustomer,
    userId: props.userId,
    staffId: props.staffId,
    suggestions
  })
  
  return suggestions
})

const validationMessage = computed(() => {
  if (!props.title) return ''
  
  if (props.title.length < 3) {
    return '⚠️ Titel sollte mindestens 3 Zeichen haben'
  }
  
  if (props.title.length > props.maxLength) {
    return `❌ Titel ist zu lang (max. ${props.maxLength} Zeichen)`
  }
  
  if (props.title.length > props.maxLength * 0.8) {
    return `⚠️ Titel wird lang (${props.title.length}/${props.maxLength})`
  }
  
  return '✅ Titel ist gültig'
})

const validationClass = computed(() => {
  if (!props.title) return ''
  
  if (props.title.length < 3 || props.title.length > props.maxLength) {
    return 'text-red-600'
  }
  
  if (props.title.length > props.maxLength * 0.8) {
    return 'text-yellow-600'
  }
  
  return 'text-green-600'
})

const showSuggestions = computed(() => {
  return props.showSuggestions && !props.title && suggestions.value.length > 0
})

// Methods
const updateTitle = (value: string) => {
  emit('update:title', value)
}

const selectSuggestion = (suggestion: string) => {
  emit('update:title', suggestion)
  emit('title-generated', suggestion)
}

const handleBlur = () => {
  // Auto-generate title if empty and auto-generate is enabled
  if (!props.title && props.autoGenerate && suggestions.value.length > 0) {
    const autoTitle = suggestions.value[0]
    emit('update:title', autoTitle)
    emit('title-generated', autoTitle)
  }
}

// Set random suggestion as tip
const updateSuggestion = () => {
  if (suggestions.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * suggestions.value.length)
    currentSuggestion.value = suggestions.value[randomIndex]
  }
}

// Update suggestion when suggestions change
watch(() => suggestions.value, updateSuggestion, { immediate: true })

// Helper function to determine if we should auto-update
const shouldAutoUpdate = (): boolean => {
  // ✅ WICHTIG: Wenn Title aus DB geladen wurde, NICHT regenerieren!
  // Der User könnte ihn manuell angepasst haben
  if (props.isLoadingFromDatabase) {
    logger.debug('🛑 Title is from database - skip auto-update')
    return false
  }
  
  // ✅ Nur bei GENERISCHEN Titeln auto-updaten
  // Wenn der User einen Title eingegeben hat (nicht nur Name), nicht regenerieren!
  
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const firstName = props.selectedStudent.first_name
    const lastName = props.selectedStudent.last_name
    
    // ✅ ERWEITERT: Auch bei generischen Standard-Titeln auto-updaten
    const isGenericTitle = props.title === 'Fahrstunde' || 
                          props.title === 'Lektion' || 
                          props.title === 'Stunde' ||
                          props.title.trim() === ''
    
    // ✅ Nur regenerieren wenn komplett leer oder generisch
    // Wenn der Title irgendwas anderes ist, respektiere es!
    return isGenericTitle
  }
  return false
}

// Auto-generate title when key data changes
// Watch für Auto-Generierung debuggen:
watch([
  () => props.selectedStudent,
  () => props.selectedLocation,
  () => props.selectedSpecialType
], ([student, location, specialType]) => {
  
  if (props.autoGenerate && suggestions.value.length > 0) {
    const shouldUpdate = !props.title || shouldAutoUpdate()
    
    logger.debug('🎯 TitleInput Auto-Generate Check:', {
      autoGenerate: props.autoGenerate,
      hasTitle: !!props.title,
      currentTitle: props.title,
      shouldAutoUpdate: shouldAutoUpdate(),
      shouldUpdate,
      suggestionsCount: suggestions.value.length,
      firstSuggestion: suggestions.value[0]
    })
    
    if (shouldUpdate) {
      logger.debug('✅ Auto-generating title:', suggestions.value[0])
      emit('update:title', suggestions.value[0])
      emit('title-generated', suggestions.value[0])
    } else {
      logger.debug('❌ Auto-generate skipped - title exists and shouldAutoUpdate=false')
    }
  }
}, { deep: true, immediate: true })

// Expose für Parent-Component
defineExpose({
  suggestions,
  selectSuggestion,
  updateSuggestion
})

// Debug logging
watch(() => [props.eventType, props.selectedStudent, props.selectedSpecialType, props.title], 
  ([eventType, student, specialType, title]) => {
}, { immediate: true, deep: true })
</script>

<style scoped>
input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

input::placeholder {
  color: #9ca3af;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Smooth fade-in for suggestions */
.space-y-2 > div {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>