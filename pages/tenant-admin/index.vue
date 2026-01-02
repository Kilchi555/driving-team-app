<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Gesamt Tenants</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.totalTenants }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Aktive Tenants</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.activeTenants }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Trial Tenants</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.trialTenants }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow border p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Gesamt Benutzer</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.totalUsers }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- Quick Actions Card -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Schnellaktionen</h2>
        <div class="space-y-3">
          <NuxtLink
            to="/tenant-admin/tenants/create"
            class="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Neuen Tenant erstellen</p>
              <p class="text-sm text-gray-500">Erstelle einen neuen Tenant mit Standardeinstellungen</p>
            </div>
          </NuxtLink>

        <NuxtLink
          to="/tenant-admin/business-types"
          class="flex items-center gap-3 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
        >
          <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18"></path>
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-900">Business-Types & Presets</p>
            <p class="text-sm text-gray-500">Branchen, Feature-Flags und UI-Labels verwalten</p>
          </div>
        </NuxtLink>

          <NuxtLink
            to="/tenant-admin/tenants"
            class="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Alle Tenants verwalten</p>
              <p class="text-sm text-gray-500">Übersicht und Verwaltung aller Tenants</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/tenant-admin/analytics"
            class="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Analytics & Monitoring</p>
              <p class="text-sm text-gray-500">System-Performance und Nutzungsstatistiken</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/tenant-admin/errors"
            class="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v2M9 3a9 9 0 1118 0 9 9 0 01-18 0z"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Error Monitoring</p>
              <p class="text-sm text-gray-500">Fehler und Probleme überwachen</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/tenant-admin/security"
            class="flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Sicherheit & Rate Limiting</p>
              <p class="text-sm text-gray-500">Anmeldeversuche und Blockierungen</p>
            </div>
          </NuxtLink>

          <NuxtLink
            to="/tenant-admin/settings"
            class="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">System-Einstellungen</p>
              <p class="text-sm text-gray-500">Globale Systemkonfigurationen</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h2>
        <div class="space-y-3">
          <div v-for="activity in recentActivities" :key="activity.id" class="flex items-start gap-3">
            <div :class="[
              'w-8 h-8 rounded-lg flex items-center justify-center',
              activity.type === 'create' ? 'bg-green-100' : 
              activity.type === 'update' ? 'bg-blue-100' : 'bg-gray-100'
            ]">
              <svg class="w-4 h-4" :class="[
                activity.type === 'create' ? 'text-green-600' : 
                activity.type === 'update' ? 'text-blue-600' : 'text-gray-600'
              ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path v-if="activity.type === 'create'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                <path v-else-if="activity.type === 'update'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900">{{ activity.description }}</p>
              <p class="text-xs text-gray-500">{{ formatTimeAgo(activity.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Tenants -->
    <div class="bg-white rounded-xl shadow border p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Neueste Tenants</h2>
        <NuxtLink
          to="/tenant-admin/tenants"
          class="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Alle anzeigen →
        </NuxtLink>
      </div>
      
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
                Erstellt
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="tenant in recentTenants" :key="tenant.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-8 w-8">
                    <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span class="text-sm font-medium text-blue-600">
                        {{ tenant.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-3">
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
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ tenant.subscription_plan }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(tenant.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <NuxtLink
                  :to="`/tenant-admin/tenants/${tenant.id}`"
                  class="text-blue-600 hover:text-blue-900"
                >
                  Anzeigen
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ 
  layout: 'tenant-admin'
})
import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// State
const stats = ref({
  totalTenants: 0,
  activeTenants: 0,
  trialTenants: 0,
  totalUsers: 0
})

const recentTenants = ref([])
const recentActivities = ref([])

// Functions
const loadStats = async () => {
  try {
    // Load tenant stats - simplified approach
    const { data: tenantsData, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, is_active, is_trial')

    const tenants = tenantsError ? [] : (tenantsData || [])

    logger.debug('🔍 TENANT LOADING DEBUG:')
    logger.debug('- Tenants data:', tenants)
    logger.debug('- Tenants error:', tenantsError)
    logger.debug('- Tenants count:', tenants?.length || 0)

    if (tenantsError) {
      console.error('❌ Tenants loading failed:', tenantsError)
    }

    // Load user stats
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_user_id, tenant_id, role')

    logger.debug('🔍 USER LOADING DEBUG:')
    logger.debug('- Users data:', users)
    logger.debug('- Users error:', usersError)
    logger.debug('- Users count:', users?.length || 0)
    
    // Get current user role separately (use auth_user_id for matching)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const currentUserRole = users?.find(u => u.auth_user_id === currentUser?.id)?.role
    logger.debug('- Current user role:', currentUserRole)

    if (usersError) {
      console.error('❌ Users loading failed:', usersError)
      throw usersError
    }

    stats.value = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.is_active).length,
      trialTenants: tenants.filter(t => t.is_trial).length,
      totalUsers: users.length
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const loadRecentTenants = async () => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    recentTenants.value = data
  } catch (error) {
    console.error('Error loading recent tenants:', error)
  }
}



const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('de-DE')
}

const formatTimeAgo = (dateString) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Vor wenigen Minuten'
  if (diffInHours < 24) return `Vor ${diffInHours} Stunden`
  const diffInDays = Math.floor(diffInHours / 24)
  return `Vor ${diffInDays} Tagen`
}

const loadRecentActivities = async () => {
  try {
    // Get recent rate limit blocks as security activities
    const { data, error } = await supabase
      .from('rate_limit_logs')
      .select('*')
      .eq('status', 'blocked')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    
    recentActivities.value = (data || []).map(log => ({
      id: log.id,
      type: 'security',
      description: `${log.operation === 'login' ? 'Anmeldeattempt' : 'Operation'} blockiert: ${log.ip_address}${log.email ? ` (${log.email})` : ''}`,
      created_at: log.created_at
    }))
  } catch (error) {
    console.error('Error loading recent activities:', error)
  }
}

onMounted(() => {
  loadStats()
  loadRecentTenants()
  loadRecentActivities()
})
</script>

<style scoped>
</style>
