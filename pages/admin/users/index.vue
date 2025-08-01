<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        👥 Benutzerverwaltung
      </h1>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Alle Benutzer</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalUsers }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">👥</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Kunden</p>
            <p class="text-2xl font-bold text-green-600">{{ clientCount }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">🚗</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Fahrlehrer</p>
            <p class="text-2xl font-bold text-purple-600">{{ staffCount }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">👨‍🏫</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Neue (7 Tage)</p>
            <p class="text-2xl font-bold text-orange-600">{{ newUsersCount }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">✨</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow-sm border mb-6">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h2 class="text-xl font-semibold text-gray-900">
            Benutzer ({{ filteredUsers.length }})
          </h2>
          
          <div class="flex flex-col sm:flex-row gap-3">
            <!-- Search -->
            <div class="relative">
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Name oder E-Mail suchen..."
                class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center">
                <span class="text-gray-400">🔍</span>
              </div>
            </div>

            <!-- Role Filter -->
            <select
              v-model="selectedRole"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Rollen</option>
              <option value="client">Kunden</option>
              <option value="staff">Fahrlehrer</option>
              <option value="admin">Admins</option>
            </select>

            <!-- Status Filter -->
            <select
              v-model="selectedStatus"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="unpaid">Mit offenen Zahlungen</option>
            </select>

            <!-- New User Button -->
            <button
              @click="showCreateUserModal = true"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              ➕ Neuer Benutzer
            </button>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benutzer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rolle</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontakt</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-600">
                      {{ getInitials(user.first_name, user.last_name) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ user.first_name }} {{ user.last_name }}
                    </div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>

              <td class="px-6 py-4">
                <span :class="getRoleBadgeClass(user.role)"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ getRoleLabel(user.role) }}
                </span>
              </td>

              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ user.phone || '-' }}</div>
                <div class="text-xs text-gray-500">{{ user.preferred_payment_method || 'Nicht festgelegt' }}</div>
              </td>

              <td class="px-6 py-4">
                <span :class="user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ user.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>

              <td class="px-6 py-4">
                <div class="flex space-x-2">
                  <NuxtLink :to="`/admin/users/${user.id}`"
                            class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Details
                  </NuxtLink>
                  <button
                    @click="editUser(user)"
                    class="text-green-600 hover:text-green-800 text-sm font-medium">
                    Bearbeiten
                  </button>
                  <button
                    @click="toggleUserStatus(user)"
                    :class="user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'"
                    class="text-sm font-medium">
                    {{ user.is_active ? 'Deaktivieren' : 'Aktivieren' }}
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="filteredUsers.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                <div class="text-lg">👤 Keine Benutzer gefunden</div>
                <div class="text-sm mt-2">
                  {{ searchTerm ? 'Versuchen Sie eine andere Suche' : 'Erstellen Sie den ersten Benutzer' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta } from '#imports'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

// Types
interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  role: string
  preferred_payment_method: string | null
  is_active: boolean
  created_at: string
  appointment_count?: number
  completed_appointments?: number
  unpaid_count?: number
  unpaid_amount?: number
}

// State
const supabase = getSupabase()
const isLoading = ref(true)
const users = ref<User[]>([])
const searchTerm = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const showCreateUserModal = ref(false)

// Computed
const totalUsers = computed(() => users.value.length)
const clientCount = computed(() => users.value.filter(u => u.role === 'client').length)
const staffCount = computed(() => users.value.filter(u => u.role === 'staff').length)
const newUsersCount = computed(() => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return users.value.filter(u => new Date(u.created_at) > weekAgo).length
})

const filteredUsers = computed(() => {
  let filtered = users.value

  // Search filter
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(user =>
      (user.first_name?.toLowerCase().includes(search)) ||
      (user.last_name?.toLowerCase().includes(search)) ||
      user.email.toLowerCase().includes(search)
    )
  }

  // Role filter
  if (selectedRole.value) {
    filtered = filtered.filter(user => user.role === selectedRole.value)
  }

  // Status filter
  if (selectedStatus.value) {
    switch (selectedStatus.value) {
      case 'active':
        filtered = filtered.filter(user => user.is_active)
        break
      case 'inactive':
        filtered = filtered.filter(user => !user.is_active)
        break
      case 'unpaid':
        filtered = filtered.filter(user => (user.unpaid_amount ?? 0) > 0)
        break
    }
  }

  return filtered.sort((a, b) => {
    // Sort by last name, then first name
    const aName = `${a.last_name || ''} ${a.first_name || ''}`.trim()
    const bName = `${b.last_name || ''} ${b.first_name || ''}`.trim()
    return aName.localeCompare(bName)
  })
})

// Methods
const loadUsers = async () => {
  try {
    console.log('🔄 Loading users...')
    
    // Load users with their appointment statistics
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        preferred_payment_method,
        is_active,
        created_at
      `)
      .order('last_name', { ascending: true })

    if (usersError) throw usersError

    // Load appointment statistics for each user
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        user_id,
        is_paid,
        status,
        price_per_minute,
        duration_minutes,
        discount
      `)

    if (appointmentsError) {
      console.warn('Warning loading appointments:', appointmentsError)
    }

    // Process users with statistics
    const processedUsers = (usersData || []).map(user => {
      const userAppointments = (appointmentsData || []).filter(apt => apt.user_id === user.id)
      const completedAppointments = userAppointments.filter(apt => apt.status === 'completed')
      const unpaidAppointments = userAppointments.filter(apt => !apt.is_paid)
      
      // Calculate unpaid amount
      const unpaidAmount = unpaidAppointments.reduce((sum, apt) => {
        const basePrice = (apt.price_per_minute || 0) * (apt.duration_minutes || 0)
        return sum + (basePrice - (apt.discount || 0))
      }, 0)

      return {
        ...user,
        appointment_count: userAppointments.length,
        completed_appointments: completedAppointments.length,
        unpaid_count: unpaidAppointments.length,
        unpaid_amount: Math.round(unpaidAmount * 100) // Convert to Rappen
      }
    })

    users.value = processedUsers
    console.log('✅ Users loaded:', users.value.length)

  } catch (error: any) {
    console.error('❌ Error loading users:', error)
  } finally {
    isLoading.value = false
  }
}

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '??'
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    'client': 'Kunde',
    'staff': 'Fahrlehrer',
    'admin': 'Admin'
  }
  return labels[role] || role
}

const getRoleBadgeClass = (role: string): string => {
  const classes: Record<string, string> = {
    'client': 'bg-blue-100 text-blue-800',
    'staff': 'bg-purple-100 text-purple-800',
    'admin': 'bg-red-100 text-red-800'
  }
  return classes[role] || 'bg-gray-100 text-gray-800'
}

const editUser = (user: User) => {
  console.log('Edit user:', user)
  // TODO: Implement edit user modal
  alert(`Bearbeiten von ${user.first_name} ${user.last_name} - Wird implementiert`)
}

const toggleUserStatus = async (user: User) => {
  try {
    console.log(`${user.is_active ? 'Deactivating' : 'Activating'} user:`, user.email)
    
    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: !user.is_active,
        updated_at: toLocalTimeString(new Date)
      })
      .eq('id', user.id)

    if (error) throw error

    // Update local state
    user.is_active = !user.is_active
    
    const status = user.is_active ? 'aktiviert' : 'deaktiviert'
    alert(`✅ ${user.first_name} ${user.last_name} wurde ${status}`)

  } catch (error: any) {
    console.error('❌ Error toggling user status:', error)
    alert(`❌ Fehler: ${error.message}`)
  }
}

// Lifecycle
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Table hover effects */
tbody tr:hover {
  background-color: #f9fafb;
}

/* Input focus states */
input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>