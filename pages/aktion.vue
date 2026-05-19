<template>
  <div class="min-h-screen flex flex-col" style="background: #0a0f1e;">

    <!-- Hero Section -->
    <div class="relative flex-1 flex flex-col items-center justify-center px-5 pt-12 pb-6 overflow-hidden">

      <!-- Background glow -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
             style="background: radial-gradient(circle, #019ee5 0%, transparent 70%);" />
      </div>

      <!-- Logo / Brand -->
      <div class="relative z-10 flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
             style="background: #019ee5;">
          <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
          </svg>
        </div>
        <p class="text-sm font-semibold tracking-widest uppercase" style="color: #019ee5;">Driving Team</p>
      </div>

      <!-- Headline -->
      <div class="relative z-10 text-center mb-6 max-w-sm">
        <h1 class="text-4xl font-black text-white leading-tight mb-3">
          {{ headline }}
        </h1>
        <p class="text-lg text-gray-300 leading-relaxed">
          {{ subline }}
        </p>
      </div>

      <!-- Social proof pills -->
      <div class="relative z-10 flex flex-wrap justify-center gap-2 mb-8">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
             style="background: rgba(1,158,229,0.2); border: 1px solid rgba(1,158,229,0.4);">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          ★★★★★ Bewertet
        </div>
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
             style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);">
          🎓 500+ erfolgreiche Schüler
        </div>
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
             style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);">
          📍 Kanton Schwyz & Umgebung
        </div>
      </div>

      <!-- Form Card -->
      <div v-if="!submitted" class="relative z-10 w-full max-w-sm">
        <div class="rounded-2xl p-6 shadow-2xl" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(20px);">

          <!-- Offer badge -->
          <div v-if="offerText" class="flex items-center gap-2 mb-5 p-3 rounded-xl"
               style="background: rgba(1,158,229,0.15); border: 1px solid rgba(1,158,229,0.3);">
            <span class="text-xl">🎁</span>
            <span class="text-sm font-semibold text-white">{{ offerText }}</span>
          </div>

          <p class="text-sm font-semibold text-gray-300 mb-4">Jetzt kostenlos anmelden:</p>

          <div class="space-y-3">
            <div>
              <input
                v-model="firstName"
                type="text"
                placeholder="Dein Vorname"
                autocomplete="given-name"
                :disabled="loading"
                @keyup.enter="submit"
                class="w-full px-4 py-3.5 rounded-xl text-white text-base font-medium outline-none transition-all placeholder-gray-500"
                style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);"
                :style="focusedField === 'name' ? 'border-color: #019ee5; box-shadow: 0 0 0 3px rgba(1,158,229,0.2);' : ''"
                @focus="focusedField = 'name'"
                @blur="focusedField = null"
              />
            </div>
            <div>
              <input
                v-model="email"
                type="email"
                placeholder="Deine E-Mail-Adresse"
                autocomplete="email"
                :disabled="loading"
                @keyup.enter="submit"
                class="w-full px-4 py-3.5 rounded-xl text-white text-base font-medium outline-none transition-all placeholder-gray-500"
                style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);"
                :style="focusedField === 'email' ? 'border-color: #019ee5; box-shadow: 0 0 0 3px rgba(1,158,229,0.2);' : ''"
                @focus="focusedField = 'email'"
                @blur="focusedField = null"
              />
            </div>

            <p v-if="errorMsg" class="text-red-400 text-xs px-1">{{ errorMsg }}</p>

            <button
              @click="submit"
              :disabled="loading || !email"
              class="w-full py-4 rounded-xl text-white text-base font-black tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style="background: linear-gradient(135deg, #019ee5, #0077b3); box-shadow: 0 8px 32px rgba(1,158,229,0.4);"
              :style="!loading && email ? 'transform: translateY(0); box-shadow: 0 8px 32px rgba(1,158,229,0.4);' : ''"
            >
              <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>{{ loading ? 'Wird gesendet…' : ctaText }}</span>
              <svg v-if="!loading" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          </div>

          <p class="text-center text-xs text-gray-500 mt-4 leading-relaxed">
            🔒 Kein Spam. Jederzeit abmeldbar. Deine Daten sind sicher.
          </p>
        </div>
      </div>

      <!-- Success State -->
      <div v-else class="relative z-10 w-full max-w-sm">
        <div class="rounded-2xl p-8 text-center shadow-2xl" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(1,158,229,0.3); backdrop-filter: blur(20px);">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
               style="background: rgba(1,158,229,0.2);">
            <svg class="w-8 h-8" style="color: #019ee5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 class="text-2xl font-black text-white mb-2">Fast geschafft!</h2>
          <p class="text-gray-300 text-base leading-relaxed mb-6">
            Wir haben dir eine Bestätigungs-E-Mail geschickt.<br>
            <span class="font-semibold text-white">Klicke auf den Link</span> in der Mail, um deine Anmeldung abzuschliessen.
          </p>
          <div class="p-3 rounded-xl text-sm text-gray-400" style="background: rgba(255,255,255,0.05);">
            📬 Schaue auch im <span class="text-white font-medium">Spam-Ordner</span> nach, falls du keine Mail erhältst.
          </div>
        </div>
      </div>

    </div>

    <!-- Trust footer -->
    <div class="relative z-10 pb-8 pt-4 text-center px-5">
      <div class="flex justify-center gap-6 mb-3">
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Geprüfte Fahrlehrer
        </div>
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Flexible Zeiten
        </div>
        <div class="flex items-center gap-1.5 text-xs text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/>
          </svg>
          Faire Preise
        </div>
      </div>
      <p class="text-xs text-gray-600">© Fahrschule Driving Team · drivingteam.ch</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: false })
useHead({
  title: 'Jetzt anmelden – Fahrschule Driving Team',
  meta: [
    { name: 'description', content: 'Melde dich jetzt an und hol dir dein Angebot von der Fahrschule Driving Team.' },
    { name: 'robots', content: 'noindex' },
    { name: 'theme-color', content: '#0a0f1e' },
  ],
})

const route = useRoute()

// URL params for per-flyer tracking
const src = computed(() => (route.query.src as string) || 'flyer')
const offer = computed(() => (route.query.offer as string) || '')
const headline = computed(() => (route.query.headline as string) || 'Führerausweis. Schnell. Entspannt.')
const subline = computed(() => (route.query.sub as string) || 'Melde dich jetzt an und wir melden uns bei dir.')
const offerText = computed(() => offer.value || null)
const ctaText = computed(() => (route.query.cta as string) || 'Jetzt kostenlos anmelden →')

const firstName = ref('')
const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const errorMsg = ref('')
const focusedField = ref<string | null>(null)

async function submit() {
  errorMsg.value = ''
  if (!email.value.trim()) {
    errorMsg.value = 'Bitte gib deine E-Mail-Adresse ein.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errorMsg.value = 'Bitte gib eine gültige E-Mail-Adresse ein.'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/marketing/public-signup', {
      method: 'POST',
      body: {
        tenantSlug: 'driving-team',
        email: email.value.trim(),
        first_name: firstName.value.trim() || undefined,
        source_label: src.value,
      },
    })
    submitted.value = true
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Fehler beim Anmelden. Bitte versuche es nochmal.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
* { -webkit-font-smoothing: antialiased; }
input::placeholder { color: #6b7280; }
button:not(:disabled):active { transform: scale(0.98); }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 1s linear infinite; }
</style>
