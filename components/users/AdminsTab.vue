<!-- components/users/AdminsTab.vue - Admins-Tab -->
<template>
  <div class="h-full flex flex-col">
    <!-- Header mit Add Button -->
    <div class="bg-white border-b p-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Administratoren</h2>
        <button 
          @click="addNewAdmin"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Neuer Admin
        </button>
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
          <button 
            @click="addNewAdmin"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Ersten Administrator hinzufügen
          </button>
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
                  {{ admin.role === 'admin' ? 'Admin' : 'Sub-Admin' }}
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

    <!-- Add Admin Modal -->
    <div v-if="showAddAdminModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showAddAdminModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Neuen Administrator hinzufügen</h3>
          
          <form @submit.prevent="createAdmin">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input 
                  v-model="newAdmin.first_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input 
                  v-model="newAdmin.last_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input 
                  v-model="newAdmin.email"
                  type="email" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select 
                  v-model="newAdmin.role"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="admin">Administrator</option>
                  <option value="sub_admin">Sub-Administrator</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Sub-Admins haben eingeschränkte Berechtigungen
                </p>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showAddAdminModal = false"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isCreatingAdmin"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {{ isCreatingAdmin ? 'Erstelle...' : 'Erstellen' }}
              </button>
            </div>
          </form>
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

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select 
                  v-model="editingAdmin.role"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="admin">Administrator</option>
                  <option value="sub_admin">Sub-Administrator</option>
                </select>
              </div>

              <div>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    v-model="editingAdmin.is_active"
                    class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  >
                  <span class="text-sm text-gray-700">Aktiv</span>
                </label>
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
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'
import LoadingLogo from '~/components/LoadingLogo.vue'

// Props
const props = defineProps<{
  currentUser: any
}>()

// Emits
const emit = defineEmits<{
  userUpdated: [updateData: any]
}>()

// Supabase client
const supabase = getSupabase()

// Composables
const uiStore = useUIStore()

// Local state
const adminList = ref<any[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const showAddAdminModal = ref(false)
const showEditAdminModal = ref(false)
const isCreatingAdmin = ref(false)
const isUpdatingAdmin = ref(false)
const editingAdmin = ref<any>(null)
const newAdmin = ref({
  first_name: '',
  last_name: '',
  email: '',
  role: 'admin'
})

// Methods
const loadAdmins = async () => {
  if (!props.currentUser) return
  
  isLoading.value = true
  error.value = null
  
  try {
    logger.debug('🔄 Loading admins from database...')
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    // Load admins
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        created_at,
        last_sign_in_at
      `)
      .in('role', ['admin', 'sub_admin'])
      .eq('tenant_id', tenantId)
      .order('first_name', { ascending: true })

    if (adminError) {
      throw new Error(`Database error: ${adminError.message}`)
    }

    adminList.value = adminData || []
    logger.debug('✅ Admins loaded successfully:', adminList.value.length)

  } catch (err: any) {
    console.error('❌ Error loading admins:', err)
    error.value = err.message || 'Fehler beim Laden der Administratoren'
    adminList.value = []
  } finally {
    isLoading.value = false
  }
}

const addNewAdmin = () => {
  newAdmin.value = {
    first_name: '',
    last_name: '',
    email: '',
    role: 'admin'
  }
  showAddAdminModal.value = true
}

const createAdmin = async () => {
  if (!props.currentUser) return
  
  isCreatingAdmin.value = true
  
  try {
    logger.debug('🔄 Creating new admin...')
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    // Create admin user
    const { data: newAdminData, error: adminError } = await supabase
      .from('users')
      .insert({
        first_name: newAdmin.value.first_name,
        last_name: newAdmin.value.last_name,
        email: newAdmin.value.email,
        role: newAdmin.value.role,
        tenant_id: tenantId,
        is_active: true
      })
      .select()
      .single()

    if (adminError) throw adminError

    uiStore.addNotification({
      type: 'success',
      title: 'Administrator erstellt',
      message: `${newAdmin.value.first_name} ${newAdmin.value.last_name} wurde erfolgreich hinzugefügt.`
    })

    showAddAdminModal.value = false
    await loadAdmins()

  } catch (err: any) {
    console.error('❌ Error creating admin:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Administrator konnte nicht erstellt werden.'
    })
  } finally {
    isCreatingAdmin.value = false
  }
}

const editAdmin = (admin: any) => {
  editingAdmin.value = { ...admin }
  showEditAdminModal.value = true
}

const updateAdmin = async () => {
  if (!editingAdmin.value) return
  
  isUpdatingAdmin.value = true
  
  try {
    logger.debug('🔄 Updating admin:', editingAdmin.value.id)
    
    const { error } = await supabase
      .from('users')
      .update({
        first_name: editingAdmin.value.first_name,
        last_name: editingAdmin.value.last_name,
        email: editingAdmin.value.email,
        role: editingAdmin.value.role,
        is_active: editingAdmin.value.is_active
      })
      .eq('id', editingAdmin.value.id)

    if (error) throw error

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
    logger.debug('🔄 Toggling admin status:', admin.id, !admin.is_active)
    
    const { error } = await supabase
      .from('users')
      .update({
        is_active: !admin.is_active
      })
      .eq('id', admin.id)

    if (error) throw error

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
      message: 'Status konnte nicht geändert werden.'
    })
  }
}

const deleteAdmin = async (admin: any) => {
  if (!confirm(`Möchten Sie ${admin.first_name} ${admin.last_name} wirklich löschen?`)) {
    return
  }
  
  try {
    logger.debug('🔄 Deleting admin:', admin.id)
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', admin.id)

    if (error) throw error

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
      message: 'Administrator konnte nicht gelöscht werden.'
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
