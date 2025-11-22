<!-- pages/register.vue - Dynamic Tenant Selection -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-t-xl">
        <h1 class="text-3xl font-bold mb-2">Registrierung</h1>
        <p class="text-blue-100">Wählen Sie einen Anbieter, um sich zu registrieren</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-12 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Anbieter werden geladen...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8">
        <div class="bg-red-50 border-l-4 border-red-400 p-6 rounded">
          <h3 class="text-lg font-semibold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-700">{{ error }}</p>
          <button
            @click="loadTenants"
            class="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Tenants Grouped by Business Type -->
      <div v-else class="p-8 space-y-8">
        <div v-for="businessType in groupedTenants" :key="businessType.code" class="space-y-4">
          <!-- Business Type Header -->
          <div class="flex items-center space-x-3 pb-2 border-b-2 border-gray-200">
            <div class="text-2xl">
              {{ businessType.code === 'driving_school' ? '🚗' : '💡' }}
            </div>
            <h2 class="text-2xl font-bold text-gray-800">{{ businessType.name }}</h2>
            <p class="text-gray-500 ml-auto">{{ businessType.tenants.length }} Anbieter</p>
          </div>

          <!-- Tenants Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              v-for="tenant in businessType.tenants"
              :key="tenant.id"
              @click="navigateToRegister(tenant.slug)"
              class="p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
            >
              <!-- Logo -->
              <div v-if="tenant.logo_url || tenant.logo_square_url" class="mb-4">
                <img
                  :src="(tenant.logo_url || tenant.logo_square_url) as string"
                  :alt="tenant.name"
                  class="h-12 w-12 object-contain group-hover:scale-110 transition-transform"
                />
              </div>

              <!-- Tenant Info -->
              <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {{ tenant.name }}
              </h3>
              <p class="text-sm text-gray-600 mt-1">{{ tenant.contact_email }}</p>
              <p class="text-xs text-gray-500 mt-2">{{ tenant.address }}</p>

              <!-- Trial Badge -->
              <div v-if="tenant.is_trial" class="mt-3">
                <span class="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  Trial
                </span>
              </div>

              <!-- CTA -->
              <div class="mt-4 flex items-center text-blue-600 group-hover:text-blue-700 font-semibold">
                <span>Registrieren</span>
                <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- No Tenants -->
        <div v-if="groupedTenants.length === 0" class="text-center py-12">
          <p class="text-gray-600 mb-4">Keine aktiven Anbieter gefunden</p>
          <button
            @click="navigateTo('/')"
            class="text-blue-600 hover:text-blue-800 font-semibold"
          >
            Zur Startseite
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-4 bg-gray-50 border-t rounded-b-xl text-center">
        <p class="text-sm text-gray-600">
          Bereits registriert?
          <button
            @click="navigateTo('/login')"
            class="text-blue-600 hover:text-blue-800 font-semibold ml-1"
          >
            Jetzt anmelden
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'

interface Tenant {
  id: string
  name: string
  slug: string
  business_type: string
  logo_url?: string | null
  logo_square_url?: string | null
  contact_email: string
  address: string
  is_trial: boolean
  is_active: boolean
}

interface BusinessType {
  code: string
  name: string
  tenants: Tenant[]
}

// Router
const router = useRouter()

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const tenants = ref<Tenant[]>([])

// Computed
const groupedTenants = computed(() => {
  const groups = new Map<string, BusinessType>()

  // Initialize business types
  const businessTypeNames: Record<string, string> = {
    driving_school: 'Fahrschulen',
    mental_coach: 'Coaching & Beratung'
  }

  // Group tenants by business type
  tenants.value.forEach(tenant => {
    if (!groups.has(tenant.business_type)) {
      groups.set(tenant.business_type, {
        code: tenant.business_type,
        name: businessTypeNames[tenant.business_type] || tenant.business_type,
        tenants: []
      })
    }
    groups.get(tenant.business_type)!.tenants.push(tenant)
  })

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
})

// Methods
const loadTenants = async () => {
  isLoading.value = true
  error.value = null

  try {
    const supabase = getSupabase()
    const { data, error: supabaseError } = await supabase
      .from('tenants')
      .select('id, name, slug, business_type, logo_url, logo_square_url, contact_email, address, is_trial, is_active')
      .eq('is_active', true)
      .order('name')

    if (supabaseError) throw supabaseError
    if (!data) throw new Error('Keine Anbieter gefunden')

    tenants.value = data as Tenant[]
    console.log('✅ Tenants loaded:', tenants.value.length)
  } catch (err: any) {
    console.error('❌ Error loading tenants:', err)
    error.value = err.message || 'Fehler beim Laden der Anbieter'
  } finally {
    isLoading.value = false
  }
}

const navigateToRegister = (slug: string) => {
  router.push(`/register/${slug}`)
}

// Lifecycle
onMounted(() => {
  loadTenants()
})

// Meta
definePageMeta({
  layout: false
})
</script>
