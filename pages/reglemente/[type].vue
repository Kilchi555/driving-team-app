<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              @click="goBack"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl font-bold text-gray-900">{{ reglementTitle }}</h1>
              <p v-if="tenantName" class="text-sm text-gray-600 mt-1">{{ tenantName }}</p>
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
          <div v-html="sanitizedContent"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DOMPurify from 'isomorphic-dompurify'

// NO AUTH MIDDLEWARE - This is a public page
definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()

const type = computed(() => route.params.type as string)
const tenantSlug = computed(() => route.query.tenant as string || null)

const isLoading = ref(true)
const error = ref<string | null>(null)
const reglementContent = ref('')
const tenantName = ref('')

const reglementTitle = computed(() => {
  const titles: Record<string, string> = {
    'agb': 'Allgemeine Geschäftsbedingungen',
    'datenschutz': 'Datenschutzerklärung',
    'nutzungsbedingungen': 'Nutzungsbedingungen',
    'widerruf': 'Widerrufsbelehrung'
  }
  return titles[type.value] || 'Reglement'
})

const sanitizedContent = computed(() => {
  if (!reglementContent.value) return ''
  return DOMPurify.sanitize(reglementContent.value, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style']
  })
})

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

onMounted(async () => {
  try {
    // If tenant slug provided, fetch tenant-specific regulation
    if (tenantSlug.value) {
      // Get tenant ID from slug
      const { data: tenantData } = await useFetch('/api/tenants/by-slug', {
        query: { slug: tenantSlug.value }
      })
      
      if (tenantData.value?.id) {
        tenantName.value = tenantData.value.name || ''
        
        // Fetch regulation for this tenant
        const { data: regData } = await useFetch('/api/reglemente/public', {
          query: { 
            tenantId: tenantData.value.id,
            type: type.value
          }
        })
        
        if (regData.value?.content) {
          reglementContent.value = regData.value.content
        } else {
          error.value = 'Reglement nicht gefunden'
        }
      } else {
        error.value = 'Tenant nicht gefunden'
      }
    } else {
      // No tenant - show generic message or default
      error.value = 'Bitte einen gültigen Link verwenden'
    }
  } catch (err: any) {
    console.error('Error loading regulation:', err)
    error.value = 'Fehler beim Laden des Reglements'
  } finally {
    isLoading.value = false
  }
})
</script>

