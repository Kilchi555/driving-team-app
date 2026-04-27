<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tenant-Management</h1>
          <p class="text-gray-600 mt-1">Verwalte alle Tenants und deren Einstellungen.</p>
        </div>
        <button 
          @click="showCreateModal = true"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Neuer Tenant
        </button>
      </div>
    </div>

    <!-- Tenants List -->
    <div class="bg-white rounded-xl shadow border">
      <div class="p-6">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benutzer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Online-Zahlung
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erstellt
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="tenant in tenants" :key="tenant.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-blue-600">
                          {{ tenant.name.charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ tenant.name }}</div>
                      <div class="text-sm text-gray-500">{{ tenant.slug }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    tenant.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  ]">
                    {{ tenant.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  <span v-if="tenant.is_trial" class="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Trial
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ tenant.subscription_plan }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ tenant.user_count || 0 }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    tenant.wallee_onboarding_status === 'active'  ? 'bg-green-100 text-green-800' :
                    tenant.wallee_onboarding_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-600'
                  ]">
                    {{ tenant.wallee_onboarding_status === 'active' ? '✅ Aktiv' :
                       tenant.wallee_onboarding_status === 'pending' ? '⏳ Ausstehend' : '—' }}
                  </span>
                  <button v-if="tenant.wallee_onboarding_status === 'pending'"
                          @click="openWalleeActivation(tenant)"
                          class="ml-2 text-xs text-blue-600 hover:underline">
                    Aktivieren
                  </button>
                  <button v-else-if="tenant.wallee_onboarding_status === 'active'"
                          @click="openWalleeActivation(tenant)"
                          class="ml-2 text-xs text-gray-500 hover:underline">
                    Verwalten
                  </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(tenant.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <button 
                      @click="editTenant(tenant)"
                      class="text-blue-600 hover:text-blue-900"
                    >
                      Bearbeiten
                    </button>
                    <button 
                      @click="viewTenant(tenant)"
                      class="text-green-600 hover:text-green-900"
                    >
                      Anzeigen
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="tenants.length === 0" class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Tenants</h3>
          <p class="mt-1 text-sm text-gray-500">Erstelle deinen ersten Tenant.</p>
        </div>
      </div>
    </div>

    <!-- Wallee Activation Modal -->
    <div v-if="showWalleeModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-6 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">
          {{ walleeTenant?.wallee_onboarding_status === 'active' ? 'Wallee verwalten' : 'Online-Zahlungen aktivieren' }}
        </h3>
        <p class="text-sm text-gray-500 mb-4">Tenant: <strong>{{ walleeTenant?.name }}</strong></p>

        <!-- Already active: show toggle + option to update credentials -->
        <template v-if="walleeTenant?.wallee_onboarding_status === 'active'">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
            <div>
              <p class="text-sm font-medium text-gray-900">Online-Zahlungen</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ walleeTenant?.wallee_enabled ? 'Aktiv' : 'Pausiert' }}</p>
            </div>
            <button
              @click="toggleWalleeAdmin"
              :disabled="walleeLoading"
              :class="[
                'relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50',
                walleeTenant?.wallee_enabled ? 'bg-blue-600' : 'bg-gray-200'
              ]"
            >
              <span :class="['inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200', walleeTenant?.wallee_enabled ? 'translate-x-5' : 'translate-x-0']" />
            </button>
          </div>
          <p class="text-xs text-gray-500 mb-4">
            Wallee Space ID: <strong>{{ walleeTenant?.wallee_space_id }}</strong> &nbsp;|&nbsp;
            User ID: <strong>{{ walleeTenant?.wallee_user_id }}</strong>
          </p>
          <p class="text-xs text-gray-400 mb-4">Um Credentials zu ändern, Space ID + User ID neu eingeben und erneut aktivieren.</p>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Wallee Space ID *</label>
            <input v-model="walleeForm.space_id" type="number" placeholder="z.B. 82592"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Wallee User ID *</label>
            <input v-model="walleeForm.user_id" type="number" placeholder="z.B. 140525"
                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div v-if="walleeTenant?.wallee_uid_number" class="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span class="text-gray-500">UID:</span> <strong>{{ walleeTenant.wallee_uid_number }}</strong></p>
            <p><span class="text-gray-500">IBAN:</span> <strong>{{ walleeTenant.wallee_iban }}</strong></p>
            <p v-if="walleeTenant.wallee_handelsregister_url">
              <a :href="walleeTenant.wallee_handelsregister_url" target="_blank" class="text-blue-600 hover:underline text-xs">
                📄 Handelsregister-PDF öffnen
              </a>
            </p>
            <p v-if="walleeTenant.wallee_application_notes" class="text-gray-600 text-xs italic">{{ walleeTenant.wallee_application_notes }}</p>
          </div>
          <p v-if="walleeError" class="text-sm text-red-600">{{ walleeError }}</p>
        </div>

        <div class="flex gap-3 mt-6">
          <button @click="activateWallee" :disabled="walleeLoading"
                  class="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
            {{ walleeLoading ? 'Wird aktiviert...' : '✅ Aktivieren' }}
          </button>
          <button v-if="walleeTenant?.wallee_onboarding_status === 'pending'"
                  @click="extendStripeTrial" :disabled="trialExtendLoading"
                  class="px-4 py-2 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50">
            {{ trialExtendLoading ? '…' : '⏱ +7 Tage' }}
          </button>
          <button @click="showWalleeModal = false"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ showCreateModal ? 'Neuen Tenant erstellen' : 'Tenant bearbeiten' }}
          </h3>
          
          <form @submit.prevent="saveTenant" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <UInput v-model="tenantForm.name" placeholder="Tenant Name" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <UInput v-model="tenantForm.slug" placeholder="tenant-slug" required />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <UInput v-model="tenantForm.contact_email" type="email" placeholder="contact@tenant.com" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <UInput v-model="tenantForm.contact_phone" placeholder="+41..." />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Geschäftstyp</label>
              <USelect 
                v-model="tenantForm.business_type" 
                :options="businessTypeOptions"
                placeholder="Geschäftstyp auswählen"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <USelect 
                  v-model="tenantForm.subscription_plan" 
                  :options="planOptions"
                  placeholder="Plan auswählen"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <USelect 
                  v-model="tenantForm.subscription_status" 
                  :options="statusOptions"
                  placeholder="Status auswählen"
                />
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="flex items-center">
                <UToggle v-model="tenantForm.is_active" color="primary" />
                <span class="ml-2 text-sm text-gray-700">Aktiv</span>
              </div>
              <div class="flex items-center">
                <UToggle v-model="tenantForm.is_trial" color="primary" />
                <span class="ml-2 text-sm text-gray-700">Trial</span>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <button 
                type="button"
                @click="closeModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isSaving"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ isSaving ? 'Speichern...' : 'Speichern' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'tenant-admin' })
import { ref, onMounted } from 'vue'

const API = '/api/admin/tenants-manage'

// State
const tenants = ref([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const isSaving = ref(false)
const editingTenant = ref(null)

// Form
const tenantForm = ref({
  name: '',
  slug: '',
  contact_email: '',
  contact_phone: '',
  business_type: '',
  subscription_plan: 'trial',
  subscription_status: 'active',
  is_active: true,
  is_trial: true
})

// Options
const businessTypeOptions = [
  { label: 'Fahrschule', value: 'driving_school' },
  { label: 'Andere', value: 'other' }
]

const planOptions = [
  { label: 'Trial', value: 'trial' },
  { label: 'Basic', value: 'basic' },
  { label: 'Premium', value: 'premium' }
]

const statusOptions = [
  { label: 'Aktiv', value: 'active' },
  { label: 'Pausiert', value: 'suspended' },
  { label: 'Gekündigt', value: 'cancelled' }
]

// Functions
const showWalleeModal = ref(false)
const walleeTenant   = ref<any>(null)
const walleeError    = ref('')
const walleeLoading  = ref(false)
const walleeForm     = ref({ space_id: '', user_id: '' })
const trialExtendLoading = ref(false)

const openWalleeActivation = (tenant: any) => {
  walleeTenant.value = tenant
  walleeForm.value   = { space_id: '', user_id: '' }
  walleeError.value  = ''
  showWalleeModal.value = true
}

const activateWallee = async () => {
  walleeError.value   = ''
  walleeLoading.value = true
  try {
    await $fetch('/api/admin/wallee-activate', {
      method: 'POST',
      body: {
        tenant_id:       walleeTenant.value.id,
        wallee_space_id: walleeForm.value.space_id,
        wallee_user_id:  walleeForm.value.user_id,
      },
    })
    showWalleeModal.value = false
    await loadTenants()
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Aktivieren'
  } finally {
    walleeLoading.value = false
  }
}

const toggleWalleeAdmin = async () => {
  if (!walleeTenant.value) return
  walleeLoading.value = true
  walleeError.value   = ''
  const newVal = !walleeTenant.value.wallee_enabled
  try {
    await $fetch('/api/admin/wallee-activate', {
      method: 'POST',
      body: {
        tenant_id: walleeTenant.value.id,
        deactivate: !newVal,
        ...(newVal ? {
          wallee_space_id: walleeTenant.value.wallee_space_id,
          wallee_user_id:  walleeTenant.value.wallee_user_id,
        } : {}),
      },
    })
    walleeTenant.value = { ...walleeTenant.value, wallee_enabled: newVal }
    await loadTenants()
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Umschalten'
  } finally {
    walleeLoading.value = false
  }
}

const extendStripeTrial = async () => {
  if (!walleeTenant.value) return
  trialExtendLoading.value = true
  walleeError.value = ''
  try {
    const result = await $fetch<{ message: string }>('/api/admin/extend-stripe-trial', {
      method: 'POST',
      body: { tenant_id: walleeTenant.value.id },
    })
    alert(`✅ ${result.message}`)
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Verlängern des Trials'
  } finally {
    trialExtendLoading.value = false
  }
}

const loadTenants = async () => {
  try {
    const result = await $fetch(API)
    tenants.value = result.data ?? []
  } catch (error) {
    console.error('Error loading tenants:', error)
  }
}

const saveTenant = async () => {
  isSaving.value = true
  try {
    if (editingTenant.value) {
      await $fetch(API, {
        method: 'PATCH',
        body: { id: editingTenant.value.id, ...tenantForm.value }
      })
    } else {
      await $fetch(API, {
        method: 'POST',
        body: tenantForm.value
      })
    }
    await loadTenants()
    closeModal()
  } catch (error) {
    console.error('Error saving tenant:', error)
    alert('Fehler beim Speichern des Tenants')
  } finally {
    isSaving.value = false
  }
}

const editTenant = (tenant) => {
  editingTenant.value = tenant
  tenantForm.value = { ...tenant }
  showEditModal.value = true
}

const viewTenant = (tenant) => {
  console.debug('View tenant:', tenant)
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingTenant.value = null
  tenantForm.value = {
    name: '',
    slug: '',
    contact_email: '',
    contact_phone: '',
    business_type: '',
    subscription_plan: 'trial',
    subscription_status: 'active',
    is_active: true,
    is_trial: true
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('de-DE')
}

onMounted(() => {
  loadTenants()
})
</script>

<style scoped>
</style>
