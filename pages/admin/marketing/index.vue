<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Marketing</h1>
        <p class="text-sm text-gray-500 mt-1">Email-Kampagnen, Leads-Datenbank und Templates</p>
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

      <!-- Opt-in / Opt-out Test Panel -->
      <div class="bg-white rounded-xl border p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-gray-900">Opt-in / Opt-out testen</div>
            <p class="text-sm text-gray-500">Schickt eine echte Test-Email mit klickbaren Opt-in & Opt-out Links</p>
          </div>
        </div>

        <div class="flex gap-3 items-end">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email-Adresse</label>
            <input
              v-model="testEmail"
              type="email"
              placeholder="deine@email.ch"
              class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            @click="sendConsentTest"
            :disabled="testLoading || !testEmail"
            class="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition whitespace-nowrap"
          >
            {{ testLoading ? 'Wird gesendet…' : 'Test senden' }}
          </button>
        </div>

        <div v-if="testResult" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
          <div class="font-semibold text-green-800 mb-2">Email gesendet! Klicke die Links zum Testen:</div>
          <div class="space-y-1.5">
            <div>
              <span class="text-gray-500 text-xs">Opt-in:</span>
              <a :href="testResult.consentLink" target="_blank" class="ml-2 text-green-700 underline break-all text-xs">{{ testResult.consentLink }}</a>
            </div>
            <div>
              <span class="text-gray-500 text-xs">Opt-out:</span>
              <a :href="testResult.unsubscribeLink" target="_blank" class="ml-2 text-red-600 underline break-all text-xs">{{ testResult.unsubscribeLink }}</a>
            </div>
          </div>
        </div>

        <div v-if="testError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {{ testError }}
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.href"
          :to="action.href"
          class="bg-white rounded-xl border p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" :class="action.iconBg">
            <svg class="w-5 h-5" :class="action.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="action.icon" />
            </svg>
          </div>
          <div class="font-semibold text-gray-900 group-hover:text-blue-600">{{ action.title }}</div>
          <div class="text-sm text-gray-500 mt-1">{{ action.description }}</div>
        </NuxtLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHead } from '#app'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Marketing - Admin' })

const authStore = useAuthStore()
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

// ── Opt-in / Opt-out test ─────────────────────────────────────────────────
const testEmail = ref('')
const testLoading = ref(false)
const testResult = ref<{ consentLink: string; unsubscribeLink: string } | null>(null)
const testError = ref('')

async function sendConsentTest() {
  testError.value = ''
  testResult.value = null
  testLoading.value = true
  try {
    const tenantId = authStore.userProfile?.tenant_id
    const res = await $fetch('/api/marketing/send-consent-test', {
      method: 'POST',
      body: { tenantId, email: testEmail.value },
    }) as any
    testResult.value = { consentLink: res.consentLink, unsubscribeLink: res.unsubscribeLink }
  } catch (e: any) {
    testError.value = e?.data?.statusMessage || 'Fehler beim Senden'
  } finally {
    testLoading.value = false
  }
}
</script>
