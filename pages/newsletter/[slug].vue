<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">

      <!-- Header -->
      <div class="p-8 text-center" :style="{ background: tenant?.primary_color || '#6366f1' }">
        <img v-if="tenant?.logo_square_url" :src="tenant.logo_square_url" class="h-12 w-auto mx-auto mb-4 object-contain" />
        <h1 class="text-2xl font-black text-white">Newsletter anmelden</h1>
        <p class="text-white/80 text-sm mt-1">{{ tenant?.name || 'Fahrschule' }}</p>
      </div>

      <!-- Success -->
      <div v-if="submitted" class="p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📬</div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Fast geschafft!</h2>
        <p class="text-gray-500 text-sm leading-relaxed">
          Wir haben dir eine Bestätigungs-Email geschickt.<br/>
          Klicke auf den Link in der Email um deine Anmeldung abzuschliessen.
        </p>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="submit" class="p-8 space-y-4">
        <p class="text-sm text-gray-600 leading-relaxed">
          Trag dich ein und erhalte Infos zu Aktionen, neuen Kursen und Tipps von {{ tenant?.name || 'uns' }}.
        </p>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Vorname</label>
            <input v-model="form.first_name" type="text" placeholder="Max"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Nachname</label>
            <input v-model="form.last_name" type="text" placeholder="Muster"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Email <span class="text-red-500">*</span></label>
          <input v-model="form.email" type="email" required placeholder="max@beispiel.ch"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{{ error }}</div>

        <button type="submit" :disabled="loading || !form.email"
          class="w-full text-white py-3.5 rounded-xl font-bold text-sm transition disabled:opacity-50"
          :style="{ background: tenant?.primary_color || '#6366f1' }">
          {{ loading ? 'Wird angemeldet…' : 'Anmelden & bestätigen →' }}
        </button>

        <p class="text-xs text-gray-400 text-center">
          Mit der Anmeldung erhältst du eine Bestätigungs-Email. Du kannst dich jederzeit abmelden.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').toLowerCase().trim())

const { data: brandingData } = await useFetch(() => `/api/tenants/branding`, {
  query: computed(() => ({ slug: slug.value })),
  key: computed(() => `newsletter-branding-${slug.value}`),
}) as any

const tenant = computed(() => {
  const d = brandingData.value?.data
  if (!d) return null
  return {
    name: d.brand_name || d.name,
    primary_color: d.primary_color || '#6366f1',
    logo_square_url: d.logo_square_url || '',
  }
})

useHead(computed(() => ({ title: `Newsletter – ${tenant.value?.name || 'Fahrschule'}` })))

const form = reactive({ first_name: '', last_name: '', email: '' })
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/marketing/public-signup', {
      method: 'POST',
      body: { tenantSlug: slug.value, ...form },
    })
    submitted.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
  } finally {
    loading.value = false
  }
}
</script>
