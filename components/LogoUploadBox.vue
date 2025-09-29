<!-- components/LogoUploadBox.vue -->
<template>
  <div class="space-y-3">
    <!-- Current Logo Display -->
    <div v-if="currentLogoUrl" class="text-center">
      <div 
        class="inline-block p-3 border-2 border-gray-200 rounded-lg bg-white"
        :class="containerClass"
      >
        <img 
          :src="currentLogoUrl" 
          :alt="`${logoType} Logo`"
          class="object-contain"
          :class="imageClass"
        >
      </div>
      <p class="text-xs text-gray-500 mt-1">Aktuell</p>
    </div>

    <!-- Upload Area -->
    <div 
      class="border-2 border-dashed rounded-lg p-4 hover:border-gray-400 transition-colors text-center"
      :class="uploadAreaClass"
    >
      <!-- Upload Button -->
      <div v-if="!isUploading">
        <div class="text-2xl text-gray-400 mb-2">{{ getUploadIcon() }}</div>
        
        <div class="relative inline-block">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button 
            class="bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
            :disabled="isUploading"
          >
            {{ currentLogoUrl ? '📝 Ändern' : '📁 Auswählen' }}
          </button>
        </div>
        
        <p class="text-xs text-gray-500 mt-2">
          {{ aspectRatio }} Format<br>
          Max. 2MB
        </p>
      </div>

      <!-- Upload Progress -->
      <div v-else class="py-2">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto mb-2"></div>
        <p class="text-xs text-gray-600">Wird hochgeladen...</p>
      </div>
    </div>

    <!-- Remove Button -->
    <div v-if="currentLogoUrl && !isUploading" class="text-center">
      <button
        @click="handleRemoveLogo"
        class="text-red-600 hover:text-red-800 text-xs font-medium hover:underline"
        :disabled="isUploading"
      >
        🗑️ Entfernen
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded p-2">
      <p class="text-xs text-red-700">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLogoUpload } from '~/composables/useLogoUpload'

// Props
interface Props {
  tenantId: string
  tenantSlug: string
  logoType: 'square' | 'wide'
  aspectRatio: string
  currentLogoUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  currentLogoUrl: null
})

// Emits
const emit = defineEmits<{
  'logo-updated': [logoType: string, logoUrl: string | null]
}>()

// Logo Upload Composable
const {
  isUploading,
  uploadError,
  validateImageFile
} = useLogoUpload()

// Local state
const fileInput = ref<HTMLInputElement>()
const error = ref<string | null>(null)

// Computed
const containerClass = computed(() => {
  const classes = ['overflow-hidden']
  
  switch (props.logoType) {
    case 'square':
      classes.push('w-16 h-16')
      break
    case 'wide':
      classes.push('w-20 h-7')
      break
    default:
      classes.push('w-16 h-12')
  }
  
  return classes.join(' ')
})

const imageClass = computed(() => {
  const classes = ['max-w-full max-h-full']
  
  switch (props.logoType) {
    case 'square':
      classes.push('w-full h-full')
      break
    case 'wide':
      classes.push('w-full')
      break
    default:
      classes.push('w-auto h-auto')
  }
  
  return classes.join(' ')
})

const uploadAreaClass = computed(() => {
  return props.currentLogoUrl ? 'border-gray-300' : 'border-gray-300'
})

// Methods
const getUploadIcon = () => {
  const icons = {
    'square': '⬜',
    'wide': '▬'
  }
  return icons[props.logoType] || '🖼️'
}

const handleFileSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  error.value = null

  // Validierung
  const validationError = validateImageFile(file)
  if (validationError) {
    error.value = validationError
    return
  }

  try {
    // Upload-Logik hier implementieren
    // TODO: Erweitere useLogoUpload für verschiedene Logo-Typen
    
    // Für jetzt: Simuliere Upload
    const logoUrl = await simulateUpload(file)
    
    if (logoUrl) {
      emit('logo-updated', props.logoType, logoUrl)
    }
    
  } catch (err: any) {
    console.error('Logo upload failed:', err)
    error.value = err.message || 'Upload fehlgeschlagen'
  }
  
  // Input zurücksetzen
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleRemoveLogo = async () => {
  if (!confirm(`Möchten Sie das ${getLogoTypeName()} wirklich entfernen?`)) return

  try {
    // Remove-Logik hier implementieren
    // TODO: API-Call zum Löschen des spezifischen Logo-Typs
    
    emit('logo-updated', props.logoType, null)
    
  } catch (err: any) {
    console.error('Logo removal failed:', err)
    error.value = err.message || 'Entfernen fehlgeschlagen'
  }
}

const getLogoTypeName = () => {
  const names = {
    'square': 'quadratische Logo',
    'wide': 'breite Logo (Hauptlogo)'
  }
  return names[props.logoType] || 'Logo'
}

// Simulate upload for now - replace with real API call
const simulateUpload = async (file: File): Promise<string> => {
  // Simuliere Upload-Delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Erstelle temporäre URL für Demo
  return URL.createObjectURL(file)
}

// Watch for upload errors
watch(uploadError, (newError) => {
  if (newError) {
    error.value = newError
  }
})
</script>
