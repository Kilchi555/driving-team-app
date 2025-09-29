<!-- components/TenantMultiLogoUpload.vue -->
<template>
  <div class="space-y-8">
    <div class="text-center">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Logo-Varianten hochladen</h3>
      <p class="text-sm text-gray-600 mb-6">
        Laden Sie verschiedene Logo-Formate für optimale Darstellung hoch.<br>
        Unterstützte Formate: JPG, PNG, GIF, WebP (max. 2MB pro Datei)
      </p>
    </div>

    <!-- Logo-Varianten Grid -->
    <div class="grid md:grid-cols-2 gap-8">
      
      <!-- Wide Logo (Hauptlogo) -->
      <div class="space-y-4">
        <div class="text-center">
          <h4 class="font-semibold text-gray-900 mb-1">Hauptlogo (Breit)</h4>
          <p class="text-xs text-gray-500 mb-3">Header, Banner, Hauptverwendung (3:1)</p>
        </div>
        
        <LogoUploadBox
          :current-logo-url="currentLogos.wide"
          :tenant-id="tenantId"
          :tenant-slug="tenantSlug"
          logo-type="wide"
          :aspect-ratio="'3:1'"
          @logo-updated="handleLogoUpdate"
        />
      </div>

      <!-- Square Logo -->
      <div class="space-y-4">
        <div class="text-center">
          <h4 class="font-semibold text-gray-900 mb-1">Quadratisch</h4>
          <p class="text-xs text-gray-500 mb-3">Favicons, Profile (1:1)</p>
        </div>
        
        <LogoUploadBox
          :current-logo-url="currentLogos.square"
          :tenant-id="tenantId"
          :tenant-slug="tenantSlug"
          logo-type="square"
          :aspect-ratio="'1:1'"
          @logo-updated="handleLogoUpdate"
        />
      </div>

    </div>

    <!-- Bulk Actions -->
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 class="font-medium text-gray-900 mb-1">Bulk-Aktionen</h4>
          <p class="text-sm text-gray-600">Mehrere Logos gleichzeitig verwalten</p>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <button
            @click="removeAllLogos"
            :disabled="!hasAnyLogo"
            class="text-red-600 hover:text-red-800 text-sm font-medium hover:underline disabled:text-gray-400 disabled:no-underline"
          >
            🗑️ Alle entfernen
          </button>
          
          <button
            @click="generateMissingFromWide"
            :disabled="!currentLogos.wide"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium px-3 py-1 rounded"
          >
            🔄 Square aus Wide generieren
          </button>
        </div>
      </div>
    </div>

    <!-- Usage Examples -->
    <div class="bg-blue-50 rounded-lg p-4">
      <h4 class="font-medium text-blue-900 mb-2">💡 Verwendungstipps</h4>
      <div class="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
        <div>
          <p class="font-medium mb-1">Quadratisch (1:1):</p>
          <p>• Favicons, App-Icons<br>• Social Media Profile<br>• Runde Avatare</p>
        </div>
        <div>
          <p class="font-medium mb-1">Breit (3:1 - Hauptlogo):</p>
          <p>• Website-Header<br>• E-Mail-Signaturen<br>• Banner, Werbung<br>• Hauptverwendung überall</p>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" class="rounded-lg p-3" :class="messageClass">
      <div class="flex items-center">
        <div class="mr-2">{{ message.type === 'success' ? '✅' : '❌' }}</div>
        <p class="text-sm font-medium">{{ message.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LogoUploadBox from './LogoUploadBox.vue'

// Props
interface Props {
  tenantId: string
  tenantSlug: string
  currentLogos: {
    square?: string | null
    wide?: string | null
  }
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'logos-updated': [logos: { square?: string | null, wide?: string | null }]
}>()

// State
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)

// Computed
const hasAnyLogo = computed(() => {
  return Object.values(props.currentLogos).some(logo => logo)
})

const messageClass = computed(() => {
  if (!message.value) return ''
  return message.value.type === 'success' 
    ? 'bg-green-50 border border-green-200 text-green-700'
    : 'bg-red-50 border border-red-200 text-red-700'
})

// Methods
const handleLogoUpdate = (logoType: string, logoUrl: string | null) => {
  const updatedLogos = { ...props.currentLogos }
  
  switch (logoType) {
    case 'square':
      updatedLogos.square = logoUrl
      break
    case 'wide':
      updatedLogos.wide = logoUrl
      break
  }
  
  emit('logos-updated', updatedLogos)
  
  // Success message
  showMessage('success', `${getLogoTypeName(logoType)} ${logoUrl ? 'hochgeladen' : 'entfernt'}`)
}

const removeAllLogos = async () => {
  if (!confirm('Möchten Sie wirklich alle Logos entfernen?')) return
  
  try {
    // Hier würde die API alle Logos löschen
    const clearedLogos = {
      square: null,
      wide: null
    }
    
    emit('logos-updated', clearedLogos)
    showMessage('success', 'Alle Logos wurden entfernt')
    
  } catch (error) {
    console.error('Failed to remove all logos:', error)
    showMessage('error', 'Fehler beim Entfernen der Logos')
  }
}

const generateMissingFromWide = async () => {
  if (!props.currentLogos.wide) return
  
  try {
    showMessage('success', 'Varianten-Generierung wird implementiert...')
    // TODO: API-Call um aus Standard-Logo andere Varianten zu generieren
    // z.B. automatisches Cropping/Resizing
    
  } catch (error) {
    console.error('Failed to generate logo variants:', error)
    showMessage('error', 'Fehler bei der Varianten-Generierung')
  }
}

const getLogoTypeName = (type: string): string => {
  const names = {
    'square': 'Quadratisches Logo',
    'wide': 'Breites Logo (Hauptlogo)'
  }
  return names[type as keyof typeof names] || type
}

const showMessage = (type: 'success' | 'error', text: string) => {
  message.value = { type, text }
  
  // Message nach 5 Sekunden ausblenden
  setTimeout(() => {
    message.value = null
  }, 5000)
}
</script>
