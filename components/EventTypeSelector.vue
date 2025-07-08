<template>
  <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
    <!-- Header mit Zurück-Button -->
    <div class="flex justify-between items-center mb-3">
      <label class="block text-sm font-semibold text-gray-900">
        📋 Terminart auswählen
      </label>
      <button
        @click="$emit('back-to-student')"
        class="text-md text-purple-600 hover:text-purple-800 text-bold"
      >
        ← Zurück
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
      <p class="text-sm text-gray-600">Terminarten werden geladen...</p>
    </div>

    <!-- Event Types Grid -->
    <div v-else class="grid grid-cols-2 gap-2 mb-4">
      <button
        v-for="eventType in eventTypes" 
        :key="eventType.code"
        @click="selectEventType(eventType)"
        :class="[
          'p-3 text-sm rounded border text-left transition-colors duration-200',
          selectedType === eventType.code
            ? 'bg-purple-600 text-white border-purple-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ eventType.emoji }} {{ eventType.name }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && eventTypes.length === 0" class="text-center py-4">
      <p class="text-sm text-gray-500">Keine Terminarten verfügbar</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Types
interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
}

// Props
interface Props {
  selectedType?: string | null
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedType: null,
  autoLoad: true
})

// Emits
const emit = defineEmits<{
  'event-type-selected': [eventType: EventType]
  'back-to-student': []
}>()

// State
const eventTypes = ref<EventType[]>([])
const isLoading = ref(false)

// Methods
const loadEventTypes = async () => {
  isLoading.value = true
  try {
    console.log('🔄 Loading event types from database...')
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (error) throw error

    eventTypes.value = (data || []) as EventType[]
    console.log('✅ Event types loaded:', {
      count: eventTypes.value.length,
      types: eventTypes.value.map((et: EventType) => `${et.emoji} ${et.name} (${et.default_duration_minutes}min)`)
    })
  } catch (error) {
    console.error('❌ Error loading event types:', error)
    // Fallback: Statische Event-Types falls DB-Abfrage fehlschlägt
    eventTypes.value = [
      {
        code: 'meeting',
        name: 'Sitzung',
        emoji: '🤝',
        description: 'Team-Meeting',
        default_duration_minutes: 180,
        default_color: '#019ee5'
      },
      {
        code: 'course',
        name: 'Kurs',
        emoji: '☕',
        description: 'Verkehrskunde',
        default_duration_minutes: 300,
        default_color: '#62b22f'
      },
      {
        code: 'other',
        name: 'Sonstiges',
        emoji: '📝',
        description: 'Individueller Termin',
        default_duration_minutes: 45,
        default_color: '#666666'
      }
    ] as EventType[]
    console.log('🔄 Using fallback event types')
  } finally {
    isLoading.value = false
  }
}

const selectEventType = (eventType: EventType) => {
  try {
    console.log('📋 Selecting event type:', eventType)
    // Sichere Checks
    if (!eventType || !eventType.code) {
      console.error('❌ Invalid event type:', eventType)
      return
    }
    
    console.log('✅ Event type selected successfully:', {
      code: eventType.code,
      name: eventType.name,
      duration: eventType.default_duration_minutes
    })
    
    emit('event-type-selected', eventType)
  } catch (error) {
    console.error('❌ Error in selectEventType:', error)
  }
}

// Lifecycle
onMounted(() => {
  if (props.autoLoad) {
    loadEventTypes()
  }
})

// Expose methods for manual loading
defineExpose({
  loadEventTypes
})
</script>