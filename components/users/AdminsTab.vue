<!-- components/users/AdminsTab.vue - Admins-Tab -->
<template>
  <div class="h-full flex flex-col">
    <!-- Header mit Add Button -->
    <div class="bg-white border-b p-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Administratoren</h2>
        <AdminInviteDialog @invited="loadAdmins" />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <LoadingLogo size="xl" />
          <p class="text-gray-600 mt-4">Lade Administratoren...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="loadAdmins" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="adminList.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👑</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Noch keine Administratoren</h3>
          <p class="text-gray-600 mb-4">Fügen Sie den ersten Administrator hinzu</p>
          <AdminInviteDialog
            label="Ersten Administrator einladen"
            button-class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            @invited="loadAdmins"
          />
        </div>
      </div>

      <!-- Admins List -->
      <div v-else class="h-full overflow-y-auto">
        <div class="p-4 space-y-4">
          <div
            v-for="admin in adminList"
            :key="admin.id"
            class="bg-white rounded-lg shadow-sm border p-4"
          >
            <!-- Admin Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span class="text-lg font-semibold text-purple-600">
                    {{ admin.first_name.charAt(0) }}{{ admin.last_name.charAt(0) }}
                  </span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ admin.first_name }} {{ admin.last_name }}
                  </h3>
                  <p class="text-sm text-gray-600">{{ admin.email }}</p>
                </div>
              </div>
              
              <!-- Role Badge -->
              <div class="flex items-center gap-2">
                <span :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  admin.role === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                ]">
                  {{ admin.is_primary_admin ? 'Hauptadministrator' : 'Administrator' }}
                </span>
                
                <!-- Status Badge -->
                <span :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  admin.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                ]">
                  {{ admin.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </div>
            </div>

            <!-- Admin Details -->
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">Erstellt:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(admin.created_at) }}</span>
                </div>
                <div>
                  <span class="text-gray-500">Letzte Aktivität:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(admin.last_sign_in_at) || 'Nie' }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button 
                @click="editAdmin(admin)"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                ✏️ Bearbeiten
              </button>
              <button
                v-if="callerIsPrimary && !admin.is_primary_admin && admin.is_active !== false"
                @click="transferPrimary(admin)"
                class="text-sm text-purple-700 hover:text-purple-900 font-medium"
              >
                Zum Hauptadmin machen
              </button>
              <button 
                @click="toggleAdminStatus(admin)"
                :class="[
                  'text-sm font-medium',
                  admin.is_active 
                    ? 'text-red-600 hover:text-red-800' 
                    : 'text-green-600 hover:text-green-800'
                ]"
              >
                {{ admin.is_active ? '🚫 Deaktivieren' : '✅ Aktivieren' }}
              </button>
              <button 
                v-if="admin.id !== currentUser.id"
                @click="deleteAdmin(admin)"
                class="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                🗑️ Löschen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Admin Modal -->
    <div v-if="showEditAdminModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showEditAdminModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            {{ editingAdmin?.first_name }} {{ editingAdmin?.last_name }} bearbeiten
          </h3>
          
          <form @submit.prevent="updateAdmin">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input 
                  v-model="editingAdmin.first_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input 
                  v-model="editingAdmin.last_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input 
                  v-model="editingAdmin.email"
                  type="email" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>

            </div>
            
            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showEditAdminModal = false"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isUpdatingAdmin"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {{ isUpdatingAdmin ? 'Speichere...' : 'Speichern' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
// import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'
import LoadingLogo from '~/components/LoadingLogo.vue'
import AdminInviteDialog from '~/components/users/AdminInviteDialog.vue'

// Props
const props = defineProps<{
  currentUser: any
}>()

// Emits
const emit = defineEmits<{
  userUpdated: [updateData: any]
}>()


// Composables
const uiStore = useUIStore()

// Local state
const adminList = ref<any[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showEditAdminModal = ref(false)
const isUpdatingAdmin = ref(false)
const editingAdmin = ref<any>(null)

const callerIsPrimary = computed(() =>
  props.currentUser?.role === 'admin' && props.currentUser?.is_primary_admin === true
)

// Methods
const loadAdmins = async () => {
  if (!props.currentUser) return
  
  isLoading.value = true
  error.value = null
  
  try {
    logger.debug('🔄 Loading admins via API...')
    
    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        action: 'get-admins',
        tenant_id: props.currentUser.tenant_id
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to load admins')
    }

    adminList.value = response.data || []
    logger.debug('✅ Admins loaded successfully via API:', adminList.value.length)

  } catch (err: any) {
    console.error('❌ Error loading admins:', err)
    error.value = err.message || 'Fehler beim Laden der Administratoren'
    adminList.value = []
  } finally {
    isLoading.value = false
  }
}

const apiErrorMessage = (err: any, fallback: string) =>
  err?.data?.statusMessage || err?.data?.message || err?.statusMessage || err?.message || fallback

const editAdmin = (admin: any) => {
  editingAdmin.value = { ...admin }
  showEditAdminModal.value = true
}

const updateAdmin = async () => {
  if (!editingAdmin.value) return
  
  isUpdatingAdmin.value = true
  
  try {
    logger.debug('🔄 Updating admin via API:', editingAdmin.value.id)
    
    const updateResponse = await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        action: 'update-admin',
        tenant_id: props.currentUser.tenant_id,
        user_id: editingAdmin.value.id,
        user_data: {
          first_name: editingAdmin.value.first_name,
          last_name: editingAdmin.value.last_name,
          email: editingAdmin.value.email
        }
      }
    }) as any

    if (!updateResponse?.success) throw new Error(updateResponse?.message)

    uiStore.addNotification({
      type: 'success',
      title: 'Administrator aktualisiert',
      message: `${editingAdmin.value.first_name} ${editingAdmin.value.last_name} wurde erfolgreich aktualisiert.`
    })

    showEditAdminModal.value = false
    await loadAdmins()
    emit('userUpdated', editingAdmin.value)

  } catch (err: any) {
    console.error('❌ Error updating admin:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Administrator konnte nicht aktualisiert werden.'
    })
  } finally {
    isUpdatingAdmin.value = false
  }
}

const toggleAdminStatus = async (admin: any) => {
  try {
    logger.debug('🔄 Toggling admin status via API:', admin.id, !admin.is_active)

    const endpoint = admin.is_active ? '/api/users/deactivate' : '/api/users/reactivate'
    const toggleResponse = await $fetch(endpoint, {
      method: 'POST',
      body: {
        user_id: admin.id,
        reason: admin.is_active ? 'Deaktiviert' : undefined
      }
    }) as any

    if (!toggleResponse?.success) throw new Error(toggleResponse?.message)

    uiStore.addNotification({
      type: 'success',
      title: 'Status geändert',
      message: `${admin.first_name} ${admin.last_name} wurde ${!admin.is_active ? 'aktiviert' : 'deaktiviert'}.`
    })

    await loadAdmins()

  } catch (err: any) {
    console.error('❌ Error toggling admin status:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: apiErrorMessage(err, 'Status konnte nicht geändert werden.')
    })
  }
}

const transferPrimary = async (admin: any) => {
  if (!confirm(`${admin.first_name} ${admin.last_name} zum Hauptadministrator machen?`)) return
  try {
    const response = await $fetch('/api/admin/transfer-primary', {
      method: 'POST',
      body: { target_user_id: admin.id }
    }) as any
    if (!response?.success) throw new Error(response?.message)
    uiStore.addNotification({
      type: 'success',
      title: 'Hauptadministrator übertragen',
      message: `${admin.first_name} ${admin.last_name} ist jetzt Hauptadministrator.`
    })
    await loadAdmins()
  } catch (err: any) {
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: apiErrorMessage(err, 'Hauptadministrator konnte nicht übertragen werden.')
    })
  }
}

const deleteAdmin = async (admin: any) => {
  if (!confirm(`Möchten Sie ${admin.first_name} ${admin.last_name} wirklich löschen?`)) {
    return
  }
  
  try {
    logger.debug('🔄 Deleting admin via API:', admin.id)
    
    const deleteResponse = await $fetch('/api/users/deactivate', {
      method: 'POST',
      body: {
        user_id: admin.id,
        reason: 'Deaktiviert'
      }
    }) as any

    if (!deleteResponse?.success) throw new Error(deleteResponse?.message)

    uiStore.addNotification({
      type: 'success',
      title: 'Administrator gelöscht',
      message: `${admin.first_name} ${admin.last_name} wurde erfolgreich gelöscht.`
    })

    await loadAdmins()

  } catch (err: any) {
    console.error('❌ Error deleting admin:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: apiErrorMessage(err, 'Administrator konnte nicht deaktiviert werden.')
    })
  }
}

// Utility functions
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Nie'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH')
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

// Lifecycle
onMounted(async () => {
  await loadAdmins()
})
</script>

<style scoped>
/* Custom styles for better UX */
.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
