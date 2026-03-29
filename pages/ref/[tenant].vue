<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4"
       :style="brandColor ? `background: linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 100%)` : 'background: linear-gradient(135deg, #d1fae5 0%, #bfdbfe 100%)'">

    <!-- Success screen -->
    <div v-if="submitted" class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
      <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
           :style="brandColor ? `background-color: ${brandColor}22` : 'background-color: #d1fae5'">
        <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900">Fast geschafft!</h2>
      <p class="text-gray-600 text-sm leading-relaxed">
        Du erhältst in Kürze eine SMS mit deinem persönlichen Anmeldelink.<br>
        Bitte prüfe dein Handy.
      </p>
      <p class="text-xs text-gray-400 mt-2">Der Link ist 30 Tage gültig.</p>
      <div v-if="logoUrl" class="pt-2">
        <img :src="logoUrl" :alt="branding?.name" class="h-8 mx-auto object-contain opacity-60" />
      </div>
    </div>

    <!-- Already active screen -->
    <div v-else-if="alreadyActive" class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
      <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900">Du bist bereits registriert</h2>
      <p class="text-gray-600 text-sm leading-relaxed">
        Diese Telefonnummer ist bereits mit einem Konto verknüpft.<br>
        Melde dich direkt an.
      </p>
      <NuxtLink v-if="tenantSlug" :to="`/${tenantSlug}`"
        class="inline-block w-full py-3 px-4 rounded-xl text-white font-semibold text-sm text-center transition"
        :style="brandColor ? `background-color: ${brandColor}` : 'background-color: #10b981'">
        Zur Anmeldung
      </NuxtLink>
    </div>

    <!-- Main form -->
    <div v-else class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <!-- Header with branding -->
      <div class="px-6 pt-8 pb-6 text-center bg-gray-50 border-b">
        <div v-if="logoUrl" class="mb-4">
          <img :src="logoUrl" :alt="branding?.name" class="h-12 mx-auto object-contain" />
        </div>
        <div v-else class="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold"
             :style="brandColor ? `background-color: ${brandColor}` : 'background-color: #10b981'">
          {{ branding?.name?.charAt(0) || 'F' }}
        </div>
        <h1 class="text-lg font-bold text-gray-900">{{ branding?.name || 'Fahrschule' }}</h1>
        <p class="text-sm text-gray-500 mt-1">
          <span v-if="referrerName">
            <strong>{{ referrerName }}</strong> empfiehlt dir diese Fahrschule
          </span>
          <span v-else>Jetzt kostenlos registrieren</span>
        </p>
      </div>

      <!-- Error banner -->
      <div v-if="formError" class="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {{ formError }}
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Vorname *</label>
            <input
              v-model="form.firstName"
              type="text"
              autocomplete="given-name"
              placeholder="Max"
              required
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nachname *</label>
            <input
              v-model="form.lastName"
              type="text"
              autocomplete="family-name"
              placeholder="Muster"
              required
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Handynummer *</label>
          <input
            v-model="form.phone"
            type="tel"
            autocomplete="tel"
            placeholder="079 123 45 67"
            required
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
          <p class="text-xs text-gray-400 mt-1">Du erhältst einen SMS-Link zur Registrierung.</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail (optional)</label>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="max@beispiel.ch"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          :disabled="loading || !canSubmit"
          class="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          :style="brandColor ? `background-color: ${brandColor}` : 'background-color: #10b981'"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 0 12 0v4a8 8 0 00-8 8H4z"/>
            </svg>
            Wird gesendet…
          </span>
          <span v-else>SMS-Link anfordern</span>
        </button>

        <p class="text-xs text-gray-400 text-center leading-relaxed">
          Mit dem Absenden stimmst du zu, eine SMS mit einem Registrierungslink zu erhalten.
          Deine Daten werden nur für die Registrierung bei {{ branding?.name || 'der Fahrschule' }} verwendet.
        </p>
      </form>
    </div>

    <!-- Bottom note -->
    <p class="mt-6 text-xs text-gray-500 text-center">
      Betrieben von <a href="https://simy.ch" target="_blank" class="underline hover:text-gray-700">simy.ch</a>
    </p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const tenantSlug = route.params.tenant as string
const refCode = (route.query.ref as string | undefined)?.trim().toUpperCase() || ''

// ---- Branding via useFetch (SSR + client dedup, no flash) ----
const { data: brandingResult } = await useFetch<any>(`/api/tenants/branding`, {
  query: { slug: tenantSlug },
  key: `ref-branding-${tenantSlug}`,
})
const branding = computed(() => brandingResult.value?.data ?? null)
const brandColor = computed(() => branding.value?.primary_color || null)
const logoUrl = computed(() => branding.value?.logo_wide_url || branding.value?.logo_square_url || branding.value?.logo_url || null)

const referrerName = ref<string | null>(null)

onMounted(async () => {
  if (refCode) {
    try {
      const result = await $fetch<any>(`/api/affiliate/referrer-name?slug=${tenantSlug}&ref=${refCode}`)
      referrerName.value = result?.firstName || null
    } catch {
      // Not critical
    }
  }
})

useHead({
  title: computed(() => branding.value?.name ? `Registrierung – ${branding.value.name}` : 'Registrierung'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// ---- Form ----
const form = reactive({ firstName: '', lastName: '', phone: '', email: '' })
const loading = ref(false)
const submitted = ref(false)
const alreadyActive = ref(false)
const formError = ref('')

const canSubmit = computed(() =>
  form.firstName.trim() && form.lastName.trim() && form.phone.trim().length >= 9
)

async function submit() {
  formError.value = ''
  loading.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/submit-lead', {
      method: 'POST',
      body: {
        tenantSlug,
        refCode,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
      },
    })
    if (result?.alreadyActive) {
      alreadyActive.value = true
    } else {
      submitted.value = true
    }
  } catch (err: any) {
    const msg = err?.statusMessage || err?.data?.message || err?.message || ''
    if (err?.statusCode === 429) {
      formError.value = 'Zu viele Versuche. Bitte warte eine Stunde und versuche es erneut.'
    } else if (msg) {
      formError.value = msg
    } else {
      formError.value = 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
    }
  } finally {
    loading.value = false
  }
}
</script>
