<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl flex items-center justify-between">
        <h2 class="text-xl font-bold">{{ reglementTitle }}</h2>
        <button
          @click="closeModal"
          class="p-2 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-8">
        <div v-if="isLoading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Reglement...</p>
        </div>

        <div v-else-if="error" class="bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-lg font-medium text-red-800">Fehler beim Laden</h3>
              <p class="mt-2 text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>

        <div v-else class="prose prose-lg max-w-none">
          <!-- XSS Protected: Content sanitized via DOMPurify -->
          <div v-html="sanitizedContent"></div>
        </div>

        <!-- Last Updated -->
        <div v-if="!isLoading && !error" class="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
          Stand: {{ lastUpdated }}
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-8 py-4 rounded-b-xl border-t flex justify-end">
        <button
          @click="closeModal"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { logger } from '~/utils/logger'
import DOMPurify from 'isomorphic-dompurify'

interface Props {
  isOpen: boolean
  type?: string
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isLoading = ref(false)
const error = ref<string | null>(null)
const reglementContent = ref('')
const lastUpdated = ref('')

// XSS Protection: Sanitize HTML content before rendering
const sanitizedContent = computed(() => {
  if (!reglementContent.value) return ''
  return DOMPurify.sanitize(reglementContent.value, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style']
  })
})

// Reglement titles mapping
const reglementTitles: Record<string, string> = {
  'datenschutz': 'Datenschutzerklärung',
  'nutzungsbedingungen': 'Nutzungsbedingungen',
  'agb': 'Allgemeine Geschäftsbedingungen (AGB)',
  'haftung': 'Haftungsausschluss',
  'rueckerstattung': 'Rückerstattungsrichtlinien'
}

const reglementTitle = computed(() => reglementTitles[props.type || ''] || 'Reglement')

const closeModal = () => {
  emit('close')
  resetModal()
}

const resetModal = () => {
  isLoading.value = false
  error.value = null
  reglementContent.value = ''
  lastUpdated.value = ''
}

const loadReglement = async () => {
  if (!props.type) return

  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<any>('/api/customer/reglements', {
      method: 'GET',
      query: {
        type: props.type
      }
    })

    if (!response?.success || !response?.data) {
      throw new Error('Reglement nicht gefunden')
    }

    const regulation = response.data
    let content = regulation.content || getDefaultContent(props.type)
    
    if (response.tenant) {
      const { replacePlaceholders } = await import('~/utils/reglementPlaceholders')
      content = replacePlaceholders(content, {
        name: response.tenant.name,
        address: response.tenant.address,
        email: response.tenant.email,
        phone: response.tenant.phone,
        website: response.tenant.website
      })
    }
    
    reglementContent.value = content
    lastUpdated.value = regulation.updated_at ? new Date(regulation.updated_at).toLocaleDateString('de-CH') : new Date().toLocaleDateString('de-CH')
  } catch (err: any) {
    logger.error('❌ Error loading reglement:', err)
    const errorMessage = err?.data?.statusMessage || err?.message || 'Fehler beim Laden des Reglements'
    error.value = errorMessage
    reglementContent.value = getDefaultContent(props.type || '')
  } finally {
    isLoading.value = false
  }
}

// Default content for each reglement type
const getDefaultContent = (reglementType: string): string => {
  const defaults: Record<string, string> = {
    'datenschutz': `
      <h2>Datenschutzerklärung</h2>
      <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten.</p>
      
      <h3>1. Verantwortliche Stelle</h3>
      <p>Die verantwortliche Stelle für die Datenverarbeitung ist die Fahrschule, bei der Sie Ihre Fahrstunden buchen.</p>
      
      <h3>2. Erhebung und Speicherung personenbezogener Daten</h3>
      <p>Wir erheben und speichern folgende personenbezogene Daten:</p>
      <ul>
        <li>Name, Vorname</li>
        <li>E-Mail-Adresse</li>
        <li>Telefonnummer</li>
        <li>Adresse</li>
        <li>Termindaten</li>
        <li>Zahlungsdaten (verschlüsselt)</li>
      </ul>
    `,
    'nutzungsbedingungen': `
      <h2>Nutzungsbedingungen</h2>
      <p>Diese Nutzungsbedingungen regeln die Nutzung unserer Online-Plattform für die Buchung von Fahrstunden.</p>
      
      <h3>1. Geltungsbereich</h3>
      <p>Diese Bedingungen gelten für alle Nutzer unserer Plattform und alle damit verbundenen Dienstleistungen.</p>
    `,
    'agb': `
      <h2>Allgemeine Geschäftsbedingungen (AGB)</h2>
      <p>Diese Allgemeinen Geschäftsbedingungen regeln das Vertragsverhältnis zwischen Ihnen und der Fahrschule.</p>
    `,
    'haftung': `
      <h2>Haftungsausschluss</h2>
      <p>Diese Haftungsausschlussbestimmungen regeln die Haftung der Fahrschule für Schäden.</p>
    `,
    'rueckerstattung': `
      <h2>Rückerstattungsrichtlinien</h2>
      <p>Diese Richtlinien regeln die Bedingungen für Rückerstattungen von Zahlungen.</p>
    `
  }
  return defaults[reglementType] || '<p>Reglement nicht verfügbar</p>'
}

// Watch for modal open
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    loadReglement()
  }
})
</script>

<style scoped>
.prose {
  @apply text-gray-700;
}

.prose h2 {
  @apply text-2xl font-bold text-gray-900 mt-6 mb-4;
}

.prose h3 {
  @apply text-lg font-semibold text-gray-900 mt-4 mb-2;
}

.prose p {
  @apply text-gray-700 mb-4 leading-relaxed;
}

.prose ul, .prose ol {
  @apply ml-6 mb-4;
}

.prose li {
  @apply mb-2;
}

.prose a {
  @apply text-blue-600 hover:text-blue-700 underline;
}
</style>
