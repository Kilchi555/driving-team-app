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
const loadTenants = async () => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading tenants:', error)
    return
  }

  // Get user counts for each tenant
  const tenantsWithCounts = await Promise.all(
    data.map(async (tenant) => {
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)

      return {
        ...tenant,
        user_count: userCount || 0
      }
    })
  )

  tenants.value = tenantsWithCounts
}

const saveTenant = async () => {
  isSaving.value = true
  try {
    if (editingTenant.value) {
      // Update existing tenant
      const { error } = await supabase
        .from('tenants')
        .update(tenantForm.value)
        .eq('id', editingTenant.value.id)
      
      if (error) throw error
    } else {
      // Create new tenant
      const { error } = await supabase
        .from('tenants')
        .insert([tenantForm.value])
      
      if (error) throw error
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
  // TODO: Navigate to tenant detail page
  logger.debug('View tenant:', tenant)
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
