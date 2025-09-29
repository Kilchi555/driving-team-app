<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Back Button & Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <NuxtLink 
              :to="`/admin/users/${userId}`" 
              class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Zurück zu Benutzerdetails
            </NuxtLink>
            
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                ✏️ {{ displayName }} bearbeiten
              </h1>
              <p class="text-sm text-gray-500 mt-1">Benutzerinformationen aktualisieren</p>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex space-x-3">        
            <button
              @click="saveChanges"
              :disabled="isSaving"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isSaving" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ isSaving ? 'Speichern...' : 'Änderungen speichern' }}
            </button>
            
            <button
              @click="cancelEdit"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Abbrechen
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Benutzerdaten</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div v-else class="space-y-8">
        
        <!-- Allgemeine Informationen -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Allgemeine Informationen</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <!-- Vorname -->
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700">Vorname</label>
                <input
                  id="firstName"
                  v-model="editForm.first_name"
                  type="text"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Nachname -->
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700">Nachname</label>
                <input
                  id="lastName"
                  v-model="editForm.last_name"
                  type="text"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- E-Mail -->
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">E-Mail</label>
                <input
                  id="email"
                  v-model="editForm.email"
                  type="email"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Telefon -->
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  id="phone"
                  v-model="editForm.phone"
                  type="tel"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <!-- Rolle -->
              <div>
                <label for="role" class="block text-sm font-medium text-gray-700">Rolle</label>
                <select
                  id="role"
                  v-model="editForm.role"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="client">Kunde</option>
                  <option value="staff">Fahrlehrer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <!-- Status -->
              <div>
                <label for="isActive" class="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="isActive"
                  v-model="editForm.is_active"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option :value="true">Aktiv</option>
                  <option :value="false">Inaktiv</option>
                </select>
              </div>
              
            </div>
          </div>
        </div>

        <!-- Tenant-Zuweisung -->
        <div v-if="userDetails?.tenant_id" class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">Tenant-Zuweisung</h3>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="tenant" class="block text-sm font-medium text-gray-700">Tenant</label>
                <select
                  id="tenant"
                  v-model="editForm.tenant_id"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Kein Tenant</option>
                  <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
                    {{ tenant.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Erfolgsmeldung -->
        <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-green-800">{{ successMessage }}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { definePageMeta } from '#imports'

// Page Meta für Admin-Layout
definePageMeta({
  layout: 'admin'
})

// Types
interface UserDetails {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  is_active: boolean
  created_at: string
  tenant_id?: string | null
  tenant_name?: string | null
}

interface Tenant {
  id: string
  name: string
}

interface EditForm {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string | null
  is_active: boolean
  tenant_id: string | null
}

// Get route params and setup
const route = useRoute()
const supabase = getSupabase()
const userId = route.params.id as string

// Reactive state
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const userDetails = ref<UserDetails | null>(null)
const tenants = ref<Tenant[]>([])

const editForm = ref<EditForm>({
  first_name: null,
  last_name: null,
  email: null,
  phone: null,
  role: null,
  is_active: true,
  tenant_id: null
})

// Computed properties
const displayName = computed(() => {
  if (!userDetails.value) return 'Unbekannt'
  const firstName = userDetails.value.first_name || ''
  const lastName = userDetails.value.last_name || ''
  return `${firstName} ${lastName}`.trim() || 'Unbekannt'
})

// Methods
const loadUserDetails = async () => {
  try {
    const { data, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        is_active,
        created_at,
        tenant_id,
        tenants!inner(name)
      `)
      .eq('id', userId)
      .single()

    if (userError) {
      throw new Error(userError.message)
    }

    // Extract tenant name if available
    if (data.tenants) {
      data.tenant_name = data.tenants.name
    }
    
    userDetails.value = data
    
    // Populate edit form
    editForm.value = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      is_active: data.is_active,
      tenant_id: data.tenant_id
    }
    
    console.log('✅ User details loaded for editing:', data)

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Error loading user details:', errorMessage)
    error.value = errorMessage
  }
}

const loadTenants = async () => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    tenants.value = data || []
    console.log('✅ Tenants loaded:', data)

  } catch (err: unknown) {
    console.error('❌ Error loading tenants:', err)
  }
}

const saveChanges = async () => {
  if (!userDetails.value) return
  
  isSaving.value = true
  successMessage.value = null
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        first_name: editForm.value.first_name,
        last_name: editForm.value.last_name,
        email: editForm.value.email,
        phone: editForm.value.phone,
        role: editForm.value.role,
        is_active: editForm.value.is_active,
        tenant_id: editForm.value.tenant_id
      })
      .eq('id', userId)
    
    if (error) throw error
    
    successMessage.value = 'Benutzer erfolgreich aktualisiert!'
    
    // Reload user details to get updated data
    await loadUserDetails()
    
    console.log('✅ User updated successfully')
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      successMessage.value = null
    }, 3000)
    
  } catch (err: unknown) {
    console.error('❌ Error updating user:', err)
    alert('Fehler beim Aktualisieren des Benutzers')
  } finally {
    isSaving.value = false
  }
}

const cancelEdit = () => {
  if (confirm('Möchten Sie wirklich abbrechen? Alle ungespeicherten Änderungen gehen verloren.')) {
    window.location.href = `/admin/users/${userId}`
  }
}

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([
      loadUserDetails(),
      loadTenants()
    ])
  } catch (err) {
    console.error('❌ Error in onMounted:', err)
  } finally {
    isLoading.value = false
  }
})
</script>
