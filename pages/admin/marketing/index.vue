<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Marketing</h1>
            <p class="text-sm text-gray-500 mt-0.5">Email-Kampagnen, Leads-Datenbank und Templates</p>
          </div>
          <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <NuxtLink
              v-for="action in quickActions"
              :key="action.href"
              :to="action.href"
              class="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 hover:shadow-sm transition-all"
            >
              <div class="w-6 h-6 rounded flex items-center justify-center shrink-0" :class="action.iconBg">
                <svg class="w-3.5 h-3.5" :class="action.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="action.icon" />
                </svg>
              </div>
              {{ action.title }}
            </NuxtLink>
            <!-- AI Suggestions -->
            <NuxtLink
              to="/admin/marketing/ai"
              class="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-sm"
              :style="{ background: primaryColor }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              KI-Assistent
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl border p-5">
          <div class="text-sm font-medium text-gray-500">Leads gesamt</div>
          <div class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.leads.total ?? '—' }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ stats?.leads.active ?? 0 }} aktiv</div>
        </div>
        <div class="bg-white rounded-xl border p-5">
          <div class="text-sm font-medium text-gray-500">Warten auf Consent</div>
          <div class="text-3xl font-bold text-yellow-600 mt-1">{{ stats?.leads.pendingConsent ?? '—' }}</div>
          <NuxtLink
            v-if="stats && stats.leads.pendingConsent > 0"
            to="/admin/marketing/campaigns"
            class="inline-block mt-1 text-xs font-medium text-yellow-700 underline hover:text-yellow-900"
          >
            Kampagne erstellen →
          </NuxtLink>
          <div v-else class="text-xs text-gray-400 mt-1">Re-Consent ausstehend</div>
        </div>
        <div class="bg-white rounded-xl border p-5">
          <div class="text-sm font-medium text-gray-500">Emails versendet</div>
          <div class="text-3xl font-bold text-blue-600 mt-1">{{ stats?.campaigns.totalEmailsSent ?? '—' }}</div>
          <div class="text-xs text-gray-400 mt-1">{{ stats?.campaigns.sent ?? 0 }} Kampagnen</div>
        </div>
        <div class="bg-white rounded-xl border p-5">
          <div class="text-sm font-medium text-gray-500">Templates</div>
          <div class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.templates.total ?? '—' }}</div>
          <div class="text-xs text-gray-400 mt-1">Email-Vorlagen</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHead } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Marketing - Admin' })

const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()
const stats = ref<any>(null)

const quickActions = [
  {
    href: '/admin/marketing/import',
    title: 'Leads importieren',
    description: 'CSV-Datei hochladen und Kontakte importieren',
    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    href: '/admin/marketing/leads',
    title: 'Leads verwalten',
    description: 'Leads anzeigen, filtern und bearbeiten',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    href: '/admin/marketing/templates',
    title: 'Email-Templates',
    description: 'Vorlagen erstellen und verwalten',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    href: '/admin/marketing/campaigns',
    title: 'Kampagnen',
    description: 'Kampagnen erstellen und versenden',
    icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    href: '/admin/marketing/meta-ads-tools',
    title: 'Meta Ads',
    description: 'Bilder zu Meta-Kampagnen hochladen',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    href: '/admin/google-business-profile',
    title: 'Google Business',
    description: 'Bewertungen beantworten und Posts erstellen',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    href: '/admin/marketing/google-ads-tools',
    title: 'Google Ads',
    description: 'Kampagnen, Keywords und Gebote verwalten',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
]

onMounted(async () => {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  try {
    stats.value = await $fetch('/api/marketing/stats', { query: { tenantId } })
  } catch (e) {
    console.error('Failed to load marketing stats', e)
  }
})
</script>

<style scoped>
.tenant-action-card:hover {
  border-color: color-mix(in srgb, var(--color-primary, #1E40AF) 30%, transparent);
}
.tenant-action-card:hover .tenant-action-title {
  color: var(--color-primary, #1E40AF);
}
</style>
