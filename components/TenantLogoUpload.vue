<!-- components/TenantLogoUpload.vue -->
<template>
  <div class="space-y-4">
    <div class="text-center">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Logo hochladen</h3>
      <p class="text-sm text-gray-600 mb-4">
        Unterstützte Formate: JPG, PNG, GIF, WebP (max. 2MB)
      </p>
    </div>

    <!-- Current Logo Display -->
    <div v-if="currentLogoUrl" class="text-center mb-4">
      <div class="inline-block p-4 border-2 border-gray-200 rounded-lg bg-white">
        <img 
          :src="currentLogoUrl" 
          :alt="`${tenantName} Logo`"
          class="h-20 w-auto mx-auto object-contain"
        >
      </div>
      <p class="text-xs text-gray-500 mt-2">Aktuelles Logo</p>
    </div>

    <!-- Upload Area -->
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
      <!-- Upload Button -->
      <div v-if="!isUploading" class="text-center">
        <div class="text-4xl text-gray-400 mb-4">🖼️</div>
        
        <div class="relative inline-block">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button 
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            :disabled="isUploading"
          >
            {{ currentLogoUrl ? '📝 Logo ändern' : '📁 Logo auswählen' }}
          </button>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-else class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-sm text-gray-600">Logo wird hochgeladen...</p>
        <div v-if="uploadProgress > 0" class="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="uploadError" class="bg-red-50 border border-red-200 rounded-lg p-3">
      <div class="flex items-center">
        <div class="text-red-600 mr-2">❌</div>
        <p class="text-sm text-red-700">{{ uploadError }}</p>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="showSuccess" class="bg-green-50 border border-green-200 rounded-lg p-3">
      <div class="flex items-center">
        <div class="text-green-600 mr-2">✅</div>
        <p class="text-sm text-green-700">Logo erfolgreich hochgeladen!</p>
      </div>
    </div>

    <!-- Remove Logo Button -->
    <div v-if="currentLogoUrl && !isUploading" class="text-center pt-2">
      <button
        @click="handleRemoveLogo"
        class="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
        :disabled="isUploading"
      >
        🗑️ Logo entfernen
      </button>
    </div>

    <!-- Debug Info (Development) -->
    <div v-if="isDevelopment && currentLogoUrl" class="mt-4 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
      <p><strong>Debug Info:</strong></p>
      <p>Logo URL: {{ currentLogoUrl }}</p>
      <p>Tenant: {{ tenantName }} ({{ tenantSlug }})</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLogoUpload } from '~/composables/useLogoUpload'

// Props
interface Props {
  tenantId: string
  tenantName: string
  tenantSlug: string
  currentLogoUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  currentLogoUrl: null
})

// Emits
const emit = defineEmits<{
  'logo-updated': [logoUrl: string | null]
}>()

// Logo Upload Composable
const {
  isUploading,
  uploadError,
  uploadProgress,
  uploadAndSetLogo,
  removeTenantLogo,
  validateImageFile
} = useLogoUpload()

// Local state
const fileInput = ref<HTMLInputElement>()
const showSuccess = ref(false)
const isDevelopment = process.dev

// Methods
const handleFileSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Validierung
  const validationError = validateImageFile(file)
  if (validationError) {
    alert(validationError)
    return
  }

  try {
    // Upload und Update
    const logoUrl = await uploadAndSetLogo(file, props.tenantId, props.tenantSlug)
    
    if (logoUrl) {
      // Success
      showSuccess.value = true
      emit('logo-updated', logoUrl)
      
      // Success message ausblenden nach 3 Sekunden
      setTimeout(() => {
        showSuccess.value = false
      }, 3000)
    }
    
  } catch (error) {
    console.error('Logo upload failed:', error)
  }
  
  // Input zurücksetzen
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleRemoveLogo = async () => {
  if (!confirm('Möchten Sie das Logo wirklich entfernen?')) return

  try {
    const success = await removeTenantLogo(props.tenantId, props.currentLogoUrl || undefined)
    
    if (success) {
      emit('logo-updated', null)
      showSuccess.value = true
      
      // Success message ausblenden nach 3 Sekunden
      setTimeout(() => {
        showSuccess.value = false
      }, 3000)
    }
    
  } catch (error) {
    console.error('Logo removal failed:', error)
  }
}
</script>
