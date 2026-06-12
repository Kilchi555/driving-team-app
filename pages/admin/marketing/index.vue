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

      <!-- Import from Users -->
      <div class="bg-white rounded-xl border p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-gray-900">Bestehende Kunden importieren</div>
            <p class="text-sm text-gray-500">Alle aktiven User als Leads importieren und automatisch Consent-Mails versenden</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Kategorien zuweisen</label>
          <div class="flex flex-wrap gap-3">
            <label v-for="cat in userImportCategories" :key="cat.value" class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :value="cat.value" v-model="userImportSelectedCategories" class="rounded" />
              <span class="text-sm text-gray-700">{{ cat.label }}</span>
            </label>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            @click="importFromUsers"
            :disabled="userImportLoading"
            class="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition whitespace-nowrap flex items-center gap-2"
          >
            <svg v-if="userImportLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ userImportLoading ? 'Importiere…' : 'Kunden importieren' }}
          </button>
        </div>

        <div v-if="userImportResult" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          <span class="font-semibold">{{ userImportResult.imported }} importiert</span>
          · {{ userImportResult.skipped }} bereits vorhanden
          · {{ userImportResult.total }} User total
          <span v-if="userImportResult.imported > 0"> — Consent-Mails werden gerade versendet.</span>
          <div v-if="userImportResult.error" class="mt-2 text-red-700 font-medium">Fehler: {{ userImportResult.error }}</div>
        </div>
        <div v-if="userImportError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {{ userImportError }}
        </div>
      </div>

      <!-- Import from imported_customers -->
      <div class="bg-white rounded-xl border p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-gray-900">Importierte Kunden als Leads übernehmen</div>
            <p class="text-sm text-gray-500">E-Mails aus der Kundendatenbank (Legacy-Import) übernehmen — <strong>ohne</strong> Consent-Mails zu versenden</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Kategorien zuweisen</label>
          <div class="flex flex-wrap gap-3">
            <label v-for="cat in userImportCategories" :key="'c-' + cat.value" class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :value="cat.value" v-model="customerImportSelectedCategories" class="rounded" />
              <span class="text-sm text-gray-700">{{ cat.label }}</span>
            </label>
          </div>
        </div>

        <button
          @click="importFromCustomers"
          :disabled="customerImportLoading"
          class="px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition whitespace-nowrap flex items-center gap-2"
        >
          <svg v-if="customerImportLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ customerImportLoading ? 'Importiere…' : 'Kunden übernehmen (ohne Mails)' }}
        </button>

        <div v-if="customerImportResult" class="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
          <span class="font-semibold">{{ customerImportResult.imported }} neu importiert</span>
          · {{ customerImportResult.skipped }} bereits vorhanden
          · {{ customerImportResult.total }} mit E-Mail gefunden
          <div v-if="customerImportResult.error" class="mt-2 text-red-700 font-medium">Fehler: {{ customerImportResult.error }}</div>
        </div>
        <div v-if="customerImportError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {{ customerImportError }}
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

// ── User import ───────────────────────────────────────────────────────────────
const { data: categoriesData } = await useFetch('/api/marketing/lead-categories', {
  query: { tenantId: computed(() => authStore.userProfile?.tenant_id) },
})
const userImportCategories = computed(() =>
  (categoriesData.value?.categories ?? []).map((c: any) => ({ value: c.code, label: c.name }))
)
const userImportSelectedCategories = ref<string[]>([])
const userImportLoading = ref(false)
const userImportResult = ref<{ imported: number; skipped: number; total: number } | null>(null)
const userImportError = ref('')

async function importFromUsers() {
  userImportError.value = ''
  userImportResult.value = null
  userImportLoading.value = true
  try {
    const tenantId = authStore.userProfile?.tenant_id
    const res = await $fetch('/api/marketing/import-from-users', {
      method: 'POST',
      body: { tenantId, categories: userImportSelectedCategories.value },
    }) as any
    userImportResult.value = res
    stats.value = await $fetch('/api/marketing/stats', { query: { tenantId } })
  } catch (e: any) {
    userImportError.value = e?.data?.statusMessage || 'Fehler beim Importieren'
  } finally {
    userImportLoading.value = false
  }
}

// ── Import from imported_customers (no consent emails) ────────────────────────
const customerImportSelectedCategories = ref<string[]>([])
const customerImportLoading = ref(false)
const customerImportResult = ref<{ imported: number; skipped: number; total: number; error?: string } | null>(null)
const customerImportError = ref('')

async function importFromCustomers() {
  customerImportError.value = ''
  customerImportResult.value = null
  customerImportLoading.value = true
  try {
    const tenantId = authStore.userProfile?.tenant_id
    const res = await $fetch('/api/marketing/import-from-customers', {
      method: 'POST',
      body: { tenantId, categories: customerImportSelectedCategories.value },
    }) as any
    customerImportResult.value = res
    stats.value = await $fetch('/api/marketing/stats', { query: { tenantId } })
  } catch (e: any) {
    customerImportError.value = e?.data?.statusMessage || 'Fehler beim Importieren'
  } finally {
    customerImportLoading.value = false
  }
}

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

<style scoped>
.tenant-action-card:hover {
  border-color: color-mix(in srgb, var(--color-primary, #1E40AF) 30%, transparent);
}
.tenant-action-card:hover .tenant-action-title {
  color: var(--color-primary, #1E40AF);
}
</style>
