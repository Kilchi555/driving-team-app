<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2 mt-2">
     ⏱️ Dauer
    </label>
    
    <div class="grid grid-cols-4 gap-2" v-if="!isLoading">
      <button
        v-for="duration in formattedDurations"
        :key="duration.value"
        @click="selectDuration(duration.value)"
        :disabled="props.isPastAppointment"
        :class="[
          'p-2 text-sm rounded border transition-colors',
          Number(modelValue) === Number(duration.value)
            ? props.isPastAppointment 
              ? 'bg-green-400 text-white border-green-400 cursor-not-allowed' 
              : 'bg-green-600 text-white border-green-600'
            : props.isPastAppointment
              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
        :title="`modelValue: ${modelValue} (${typeof modelValue}), duration.value: ${duration.value} (${typeof duration.value}), match: ${Number(modelValue) === Number(duration.value)}`"
      >
        {{ duration.label }}
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-4 gap-2">
      <div v-for="i in 4" :key="i" class="p-2 bg-gray-200 rounded animate-pulse h-10"></div>
    </div>
    
    <!-- Hinweis wenn keine Dauern verfügbar -->
    <div v-if="!isLoading && formattedDurations.length === 0" class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
      ⚠️ Keine Lektionsdauern für diese Kategorie konfiguriert. 
      <br>Bitte in den Profileinstellungen Dauern hinzufügen.
    </div>
    
    <!-- Error State -->
    <div v-if="error" class="mt-2 text-red-600 text-sm">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useDurationManager } from '~/composables/useDurationManager'
import { getSupabase } from '~/utils/supabase' 

interface Props {
  modelValue: number
  selectedCategory?: any
  currentUser?: any
  availableDurations?: number[]  
  pricePerMinute?: number
  adminFee?: number
  showDebugInfo?: boolean
  isPastAppointment?: boolean
  mode?: 'create' | 'edit' | 'view' // ✅ NEU: mode prop hinzugefügt
  selectedStudent?: any // ✅ NEU: Für letzte Dauer-Abfrage
}

interface Emits {
  (e: 'update:modelValue', value: number): void
  (e: 'duration-changed', duration: number): void
}

const props = withDefaults(defineProps<Props>(), {
  pricePerMinute: 0,
  adminFee: 0,
  availableDurations: () => [],
  showDebugInfo: false,
  isPastAppointment: false
})

const emit = defineEmits<Emits>()

const {
  isLoading,
  error,
  loadStaffDurations,  
  getDefaultDuration
} = useDurationManager()

// ✅ NEU: Funktion um die letzte Dauer eines Schülers zu laden
const getLastStudentDuration = async (studentId: string): Promise<number | null> => {
  try {
    const supabase = getSupabase()
    
    // ✅ TENANT-FILTER: Erst Benutzer-Tenant ermitteln
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')
    
    // ✅ TENANT-GEFILTERTE Suche nach dem letzten Termin des Schülers
    const { data: lastAppointment, error } = await supabase
      .from('appointments')
      .select('duration_minutes')
      .eq('user_id', studentId)
      .eq('tenant_id', userProfile.tenant_id)  // ✅ TENANT FILTER
      .order('start_time', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = keine Ergebnisse
      throw error
    }
    
    if (lastAppointment && lastAppointment.duration_minutes) {
      console.log('✅ Last student duration found:', lastAppointment.duration_minutes)
      return lastAppointment.duration_minutes
    }
    
    console.log('ℹ️ No previous appointments found for student')
    return null
    
  } catch (err) {
    console.error('❌ Error loading last student duration:', err)
    return null
  }
}

// Computed
const totalPrice = computed(() => {
  return props.modelValue * props.pricePerMinute
})

const formattedDurations = computed(() => {
  // ✅ Verwende Props-Dauern falls verfügbar, sonst Composable
  let durations: any = props.availableDurations || []
  
  // ✅ ROBUSTE BEHANDLUNG: Stelle sicher, dass wir immer ein Array haben
  if (typeof durations === 'string') {
    try {
      // Versuche JSON zu parsen falls es ein JSON-String ist
      const parsed = JSON.parse(durations)
      durations = Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      // Falls kein JSON, versuche Komma-getrennte Werte zu parsen
      durations = (durations as string).split(',').map((d: string) => parseInt(d.trim(), 10)).filter((d: number) => !isNaN(d))
    }
  } else if (!Array.isArray(durations)) {
    durations = [durations].filter(d => d !== null && d !== undefined)
  }
  
  // ✅ NEU: Behandle verschachtelte Arrays (z.B. [ [ 45, 60, 90 ] ])
  if (Array.isArray(durations) && durations.length > 0 && Array.isArray(durations[0])) {
    durations = durations.flat()
  }
  
  // ✅ Stelle sicher, dass alle Werte Zahlen sind
  durations = durations.map(d => {
    const num = parseInt(d.toString(), 10)
    return isNaN(num) ? 45 : num
  }).filter(d => d > 0)
  
  const result = durations.map(duration => {
    let label: string
    
    if (duration >= 120) {
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      
      if (minutes > 0) {
        label = `${hours}h ${minutes}min`
      } else {
        label = `${hours}h`
      }
    } else {
      label = `${duration}min`
    }
    
    // ✅ DEBUG: Log specific durations to identify the issue
    if (duration === 135) {
      console.log('🔍 DEBUG 135min formatting:', {
        duration,
        hours: Math.floor(duration / 60),
        minutes: duration % 60,
        label
      })
    }
    
    return {
      value: duration,
      label
    }
  })
  
  console.log('🔄 formattedDurations computed:', {
    availableDurations: props.availableDurations,
    processedDurations: durations,
    result: result,
    modelValue: props.modelValue,
    hasMatchingValue: result.some(d => d.value === props.modelValue)
  })
  
  return result
})

// Methods
const selectDuration = (duration: number) => {
  console.log('🔄 Duration selected:', duration)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (props.isPastAppointment) {
    console.log('🚫 Cannot change duration for past appointment')
    return
  }
  
  emit('update:modelValue', duration)
  emit('duration-changed', duration)
}

// Watchers
watch(() => props.availableDurations, async (newDurations) => {
  console.log('🔄 DurationSelector - Available durations changed:', newDurations, 'Mode:', props.mode)
  
  // ✅ KORRIGIERT: Verwende formattedDurations für die Prüfung
  const durations = formattedDurations.value.map(d => d.value)
  
  // ✅ KORRIGIERT: Immer eine Dauer setzen wenn verfügbar und keine gesetzt ist
  if (durations.length > 0 && (!props.modelValue || !durations.includes(props.modelValue))) {
    const isEditMode = props.mode === 'edit' || props.mode === 'view'
    
    if (!isEditMode) {
      // Fallback: Erste verfügbare Dauer verwenden
      console.log('⏱️ Auto-setting duration to first available (CREATE mode):', durations[0])
      emit('update:modelValue', durations[0])
      emit('duration-changed', durations[0])
    } else {
      console.log('📝 EDIT/VIEW mode detected - keeping existing duration:', props.modelValue)
    }
  }
}, { immediate: true })

// ✅ NEU: Watcher für selectedStudent - lade letzte Dauer wenn sich der Schüler ändert
watch(() => props.selectedStudent, async (newStudent) => {
  // ✅ KORRIGIERT: Immer im CREATE-Modus reagieren, auch wenn bereits eine Dauer gesetzt ist
  if (newStudent?.id && props.mode === 'create' && props.availableDurations.length > 0) {
    try {
      console.log('👤 Student changed, loading last duration for:', newStudent.first_name)
      const lastDuration = await getLastStudentDuration(newStudent.id)
      
      // ✅ KORRIGIERT: Verwende formattedDurations für die Prüfung
      const durations = formattedDurations.value.map(d => d.value)
      
      if (lastDuration && durations.includes(lastDuration)) {
        console.log('✅ Setting duration to student\'s last used duration:', lastDuration)
        emit('update:modelValue', lastDuration)
        emit('duration-changed', lastDuration)
      } else if (durations.length > 0) {
        console.log('⚠️ Last duration not available, using first available:', durations[0])
        emit('update:modelValue', durations[0])
        emit('duration-changed', durations[0])
      }
    } catch (err) {
      console.error('❌ Error loading last student duration:', err)
      // Fallback zur ersten verfügbaren Dauer
      const durations = formattedDurations.value.map(d => d.value)
      if (durations.length > 0) {
        emit('update:modelValue', durations[0])
        emit('duration-changed', durations[0])
      }
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* Animations für smooth transitions */
.duration-button {
  transition: all 0.2s ease-in-out;
}

.duration-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Grid responsiveness */
@media (max-width: 640px) {
  .duration-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>