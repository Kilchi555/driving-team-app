<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center" :style="{ background: primaryColor + '20' }">
            <svg class="w-4 h-4" :style="{ color: primaryColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 class="text-xl font-bold text-gray-900">KI-Marketing-Assistent</h1>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- Input card -->
      <div class="bg-white rounded-2xl border p-6 space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1.5">
            Thema / Kampagnenziel <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="topic"
            rows="2"
            placeholder="z.B. Frühlingsaktion für Motorrad-Kategorie A, Sommer-Schnupperkurs, Reaktivierung inaktiver Leads…"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
            :style="{ '--tw-ring-color': primaryColor }"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Zielgruppe (optional)</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="cat in categories"
              :key="cat.value"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-all"
              :class="selectedCategories.includes(cat.value)
                ? 'border-transparent text-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'"
              :style="selectedCategories.includes(cat.value) ? { background: primaryColor } : {}"
            >
              <input type="checkbox" :value="cat.value" v-model="selectedCategories" class="sr-only" />
              {{ cat.label }}
            </label>
            <span v-if="categories.length === 0" class="text-sm text-gray-400">Alle Leads</span>
          </div>
        </div>

        <button
          @click="generate"
          :disabled="loading || !topic.trim()"
          class="w-full py-3 text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          :style="{ background: primaryColor }"
        >
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ loading ? 'KI generiert…' : 'Vorschläge generieren' }}
        </button>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>

      <!-- Results -->
      <template v-if="result">

        <!-- Campaign Ideas -->
        <div class="bg-white rounded-2xl border p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-lg">💡</span>
            <h2 class="font-semibold text-gray-900">Kampagnenideen</h2>
          </div>
          <div class="space-y-3">
            <div
              v-for="(idea, i) in result.campaignIdeas"
              :key="i"
              class="rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                  <div class="font-semibold text-gray-900 text-sm">{{ idea.title }}</div>
                  <p class="text-sm text-gray-600 mt-1">{{ idea.strategy }}</p>
                  <div class="flex items-center gap-1 mt-2">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="text-xs text-gray-400">{{ idea.timing }}</span>
                  </div>
                </div>
                <button
                  @click="copyText(idea.title + '\n\n' + idea.strategy)"
                  class="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                  title="Kopieren"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Subject Lines -->
        <div class="bg-white rounded-2xl border p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">✉️</span>
              <h2 class="font-semibold text-gray-900">Betreffzeilen für A/B/C-Tests</h2>
            </div>
            <button
              @click="useAllSubjects"
              class="text-xs font-medium px-3 py-1.5 rounded-lg border transition hover:opacity-80"
              :style="{ color: primaryColor, borderColor: primaryColor + '50' }"
            >
              Alle als Varianten übernehmen →
            </button>
          </div>
          <div class="space-y-2">
            <div
              v-for="(line, i) in result.subjectLines"
              :key="i"
              class="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 group transition"
            >
              <span class="text-xs font-bold w-5 text-center rounded-full py-0.5" :class="variantBadgeClass(variantLabels[i])">
                {{ variantLabels[i]?.toUpperCase() }}
              </span>
              <span class="flex-1 text-sm text-gray-800">{{ line }}</span>
              <span class="text-xs text-gray-400">{{ line.length }} Z.</span>
              <button
                @click="copyText(line)"
                class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                title="Kopieren"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Email Draft -->
        <div class="bg-white rounded-2xl border p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">📝</span>
              <h2 class="font-semibold text-gray-900">Email-Entwurf</h2>
            </div>
            <div class="flex gap-2">
              <button
                @click="copyText(result.emailDraft)"
                class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Kopieren
              </button>
              <NuxtLink
                to="/admin/marketing/templates"
                class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition hover:opacity-90"
                :style="{ background: primaryColor }"
              >
                Als Template speichern →
              </NuxtLink>
            </div>
          </div>
          <div class="relative">
            <textarea
              v-model="result.emailDraft"
              rows="16"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 resize-y"
              :style="{ '--tw-ring-color': primaryColor }"
            />
            <p class="text-xs text-gray-400 mt-1.5">
              Tipp: <code class="bg-gray-100 px-1 rounded">&#123;&#123;first_name&#125;&#125;</code> wird beim Senden durch den echten Vornamen ersetzt.
            </p>
          </div>
        </div>

        <!-- Copy feedback -->
        <div
          v-if="copiedFeedback"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 pointer-events-none"
        >
          ✓ Kopiert
        </div>

      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHead } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'KI-Assistent - Marketing - Admin' })

const authStore = useAuthStore()
const { primaryColor } = useTenantBranding()

const topic = ref('')
const categories = ref<{ value: string; label: string }[]>([])
const selectedCategories = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const result = ref<any>(null)
const copiedFeedback = ref(false)

const variantLabels = ['a', 'b', 'c', 'd', 'e']

const VARIANT_BADGES: Record<string, string> = {
  a: 'bg-blue-100 text-blue-700',
  b: 'bg-orange-100 text-orange-700',
  c: 'bg-green-100 text-green-700',
  d: 'bg-purple-100 text-purple-700',
  e: 'bg-rose-100 text-rose-700',
}
function variantBadgeClass(label: string) { return VARIANT_BADGES[label] ?? 'bg-gray-100 text-gray-600' }

async function generate() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId || !topic.value.trim()) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const res = await $fetch<any>('/api/marketing/ai-suggest', {
      method: 'POST',
      body: {
        tenantId,
        topic: topic.value.trim(),
        categories: selectedCategories.value,
      },
    })
    result.value = res
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Fehler beim Generieren — bitte versuche es erneut.'
  } finally {
    loading.value = false
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedFeedback.value = true
    setTimeout(() => { copiedFeedback.value = false }, 1800)
  } catch {}
}

function useAllSubjects() {
  if (!result.value?.subjectLines?.length) return
  // Navigate to campaign creation with subject lines pre-filled via query
  const params = new URLSearchParams()
  result.value.subjectLines.slice(0, 5).forEach((s: string, i: number) => {
    params.set(`subject_${i}`, s)
  })
  navigateTo(`/admin/marketing/campaigns?${params.toString()}`)
}

onMounted(async () => {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  try {
    const res = await $fetch<any>('/api/marketing/lead-categories', { query: { tenantId } })
    categories.value = (res.categories ?? []).map((c: any) => ({ value: c.code, label: c.name }))
  } catch {}
})
</script>
