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
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
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
  eventType: 'lesson' | 'staff_meeting' | 'other'
  selectedStudent?: any
  selectedSpecialType?: string
  categoryCode?: string
  selectedLocation?: any
  disabled?: boolean
  maxLength?: number
  showSuggestions?: boolean
  showCharacterCount?: boolean
  autoGenerate?: boolean
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
  } else {
    return !!props.selectedSpecialType
  }
})

const labelText = computed(() => {
  switch (props.eventType) {
    case 'lesson': return 'Titel'
    case 'staff_meeting': return 'Titel'
    case 'other': return 'Titel des Termins'
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
  
  return 'Titel eingeben...'
})

const suggestions = computed(() => {
  if (!shouldShow.value) return []
  
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const firstName = props.selectedStudent.first_name
    const lastName = props.selectedStudent.last_name
    const fullName = `${firstName} ${lastName}`
    const category = props.categoryCode ? ` ${props.categoryCode}` : ''
    // ✅ NEU: Vollständige Adresse mit Ort verwenden
    let location = 'Treffpunkt'
    
    // ✅ PRIORITÄT 1: Verwende die custom_location_address falls verfügbar (enthält den vollständigen Ort)
    if (props.selectedLocation?.custom_location_address) {
      const customAddress = props.selectedLocation.custom_location_address
      if (customAddress.address && customAddress.address.includes(',')) {
        location = customAddress.address
        console.log('📍 TitleInput - Using custom_location_address:', location)
      } else if (customAddress.name) {
        location = customAddress.name
        console.log('📍 TitleInput - Using custom_location_address name:', location)
      }
    }
    // ✅ PRIORITÄT 2: Fallback auf normale Location-Daten
    else if (props.selectedLocation?.name) {
      location = props.selectedLocation.name
      console.log('📍 TitleInput - Using location name:', location)
    } else if (props.selectedLocation?.address) {
      location = props.selectedLocation.address
      console.log('📍 TitleInput - Using location address:', location)
    }
    
    // ✅ DEBUG: Zeige was für die Location verwendet wird
    console.log('📍 TitleInput - Location data:', {
      name: props.selectedLocation?.name,
      address: props.selectedLocation?.address,
      custom_location_address: props.selectedLocation?.custom_location_address,
      selectedLocation: props.selectedLocation,
      finalLocation: location
    })
    
    // ✅ NEU: Wenn die Location nur den Namen hat, aber wir brauchen den vollständigen Ort,
    // versuche die Adresse zu extrahieren
    if (location && !location.includes(',')) {
      // Der Name enthält wahrscheinlich nicht den vollständigen Ort
      // Versuche die Adresse zu verwenden, falls vorhanden
      if (props.selectedLocation?.address && props.selectedLocation.address.includes(',')) {
        location = props.selectedLocation.address
        console.log('📍 TitleInput - Using full address instead of name:', location)
      }
    }
    
    return [
      `${fullName} - ${location}`,
      `${fullName} - Fahrstunde ${location}`,
      `${firstName} ${lastName} - ${location}${category}`,
      `${fullName} - Übungsfahrt ${location}`,
      `${fullName} - Prüfungsvorbereitung ${location}`,
      `${firstName} ${lastName} - Erste Fahrstunde ${location}`,
      `${fullName} - Autobahnfahrt ab ${location}`,
      `${firstName} ${lastName} - Nachtfahrt ${location}`
    ]
  }
  
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
  
  if (props.eventType === 'other') {
    return [
      'Beratung',
      'Theorieunterricht',
      'Fahrzeugwartung',
      'Prüfung',
      'Verwaltung',
      'Pause'
    ]
  }
  
  return []
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
  // Auto-update if current title matches a previous suggestion pattern
  if (props.eventType === 'lesson' && props.selectedStudent) {
    const firstName = props.selectedStudent.first_name
    const lastName = props.selectedStudent.last_name
    return props.title.includes(firstName) || props.title.includes(lastName)
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
    if (!props.title || shouldAutoUpdate()) {
      console.log('✅ Auto-generating title:', suggestions.value[0])
      emit('update:title', suggestions.value[0])
      emit('title-generated', suggestions.value[0])
    } else {
      console.log('❌ Auto-generate skipped - title exists and shouldAutoUpdate=false')
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