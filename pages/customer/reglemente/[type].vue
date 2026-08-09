<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              @click="$router.back()"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl font-bold text-gray-900">{{ reglementTitle }}</h1>
              <p class="text-sm text-gray-600 mt-1">Stand: {{ lastUpdated }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="bg-white rounded-xl shadow-lg p-8">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { replacePlaceholders } from '~/utils/reglementPlaceholders'
import { getDefaultReglementContent } from '~/utils/defaultReglementContent'
import DOMPurify from 'isomorphic-dompurify'
import { logger } from '~/utils/logger'

// Meta
definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

const route = useRoute()
const type = computed(() => route.params.type as string)

const isLoading = ref(true)
const error = ref<string | null>(null)
const reglementContent = ref('')
const lastUpdated = ref('')
const tenantBusinessType = ref<string | null>(null)

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

const reglementTitle = computed(() => reglementTitles[type.value] || 'Reglement')

// Load reglement content
const loadReglement = async () => {
  isLoading.value = true
  error.value = null

  try {
    // ✅ Call secure API endpoint instead of direct DB query
    const response = await $fetch<any>('/api/customer/reglements', {
      method: 'GET',
      query: {
        type: type.value
      }
    })

    if (!response?.success || !response?.data) {
      throw new Error('Reglement nicht gefunden')
    }

    const regulation = response.data

    // Content is already placeholder-resolved by the API
    let content = regulation.content || getDefaultReglementContent(type.value, response.tenant?.business_type)
    
    if (response.tenant) {
      tenantBusinessType.value = response.tenant.business_type || null
      if (content.includes('{{')) {
        content = replacePlaceholders(content, {
          name: response.tenant.name,
          address: response.tenant.address,
          email: response.tenant.email,
          phone: response.tenant.phone,
          website: response.tenant.website,
          city: response.tenant.city,
          zip: response.tenant.zip,
          country: response.tenant.country,
          cancellationHoursBefore: response.tenant.cancellationHoursBefore,
        })
      }
    }
    
    reglementContent.value = content
    lastUpdated.value = regulation.updated_at ? new Date(regulation.updated_at).toLocaleDateString('de-CH') : new Date().toLocaleDateString('de-CH')

  } catch (err: any) {
    logger.error('❌ Error loading reglement:', err)
    const errorMessage = err?.data?.statusMessage || err?.message || 'Fehler beim Laden des Reglements'
    error.value = errorMessage
    reglementContent.value = getDefaultReglementContent(type.value, tenantBusinessType.value)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadReglement()
})
</script>

<style scoped>
.prose {
  color: #374151;
}

.prose h2 {
  color: #111827;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.prose h3 {
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.prose p {
  margin-bottom: 1rem;
  line-height: 1.75;
}

.prose ul {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.prose li {
  margin-bottom: 0.5rem;
}
</style>

