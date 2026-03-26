<template>
  <div class="min-h-screen flex flex-col bg-white">

    <!-- Navbar -->
    <nav class="px-6 py-5 border-b border-gray-100">
      <div class="max-w-5xl mx-auto flex items-center justify-between">
        <img
          v-if="tenant.logo"
          :src="tenant.logo"
          :alt="tenant.name"
          class="h-6 w-auto object-contain"
        />
        <div v-else class="w-9 h-9 rounded-xl text-white flex items-center justify-center text-base font-bold" :style="{ backgroundColor: tenant.primaryColor }">
          🤝
        </div>
        <span class="text-gray-400 text-sm font-medium tracking-wide uppercase">Affiliate Partner</span>
      </div>
    </nav>

    <!-- Loading -->
    <div v-if="loadingTenant" class="flex-1 flex items-center justify-center">
      <div class="text-gray-400 text-sm animate-pulse">Lade Partner-Seite…</div>
    </div>

    <!-- Error -->
    <div v-else-if="tenantError" class="flex-1 flex items-center justify-center p-6">
      <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600 text-sm text-center max-w-sm">
        <div class="text-3xl mb-3">⚠️</div>
        <p class="font-semibold mb-2">{{ tenantError }}</p>
        <NuxtLink :to="`/${tenant.slug || 'driving-team'}`" class="text-red-700 underline hover:text-red-900">
          Zurück zur Startseite →
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>

      <!-- Hero -->
      <div class="flex-1 flex flex-col items-center justify-center px-6 pt-6 pb-16">
        <div class="max-w-2xl w-full mx-auto text-center">

          <div class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
            :style="{ backgroundColor: `${tenant.primaryColor}10`, borderColor: `${tenant.primaryColor}30` }">
            <span class="w-2 h-2 rounded-full animate-pulse" :style="{ backgroundColor: tenant.primaryColor }"></span>
            <span class="text-xs font-medium tracking-wide" :style="{ color: tenant.primaryColor }">Affiliate Programm</span>
          </div>

          <h1 class="text-4xl lg:text-6xl font-black text-gray-900 leading-tight mb-5">
            Empfehle.<br/>
            <span :style="{ color: tenant.primaryColor }">Verdiene.</span><br/>
            Wiederhole.
          </h1>

          <p class="text-gray-500 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
            Werde Affiliate-Partner von {{ tenant.name }} und verdiene CHF-Guthaben für jede erfolgreiche Empfehlung – vollautomatisch, ohne Aufwand.
          </p>

          <!-- CTA Button -->
          <button
            @click="showModal = true"
            class="inline-flex items-center gap-2 text-white rounded-2xl px-8 py-4 font-bold text-base transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg"
            :style="{ backgroundColor: tenant.primaryColor, boxShadow: `0 8px 30px ${tenant.primaryColor}40` }"
          >
            Jetzt Partner werden →
          </button>

          <p class="text-gray-400 text-sm mt-4">Kostenlos · Kein Passwort · 2 Minuten</p>

          <!-- Benefits -->
          <div class="mt-14 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div v-for="benefit in benefits" :key="benefit.title" class="text-center">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mx-auto mb-3"
                :style="{ backgroundColor: `${tenant.primaryColor}12`, border: `1px solid ${tenant.primaryColor}25` }">
                {{ benefit.icon }}
              </div>
              <div class="text-gray-800 font-semibold text-sm">{{ benefit.title }}</div>
              <div class="text-gray-400 text-xs mt-0.5">{{ benefit.desc }}</div>
            </div>
          </div>

          <p class="text-center text-xs text-gray-400 mt-10">
            Bereits Schüler oder Mitarbeiter?
            <NuxtLink :to="`/${tenant.slug}`" class="text-gray-500 underline hover:text-gray-700 transition">Direkt einloggen →</NuxtLink>
          </p>
        </div>
      </div>

    </template>

    <!-- Modal Backdrop -->
    <Transition name="fade">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="closeModal"
      >
        <Transition name="slide-up">
          <div v-if="showModal" class="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">

            <!-- Close Button -->
            <button
              @click="closeModal"
              class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-600 hover:text-gray-900 z-10"
            >
              ✕
            </button>

            <!-- Existing User State (edge case: auth user creation failed) -->
            <div v-if="existingUser" class="p-10 pt-12 text-center">
              <div class="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
                ⚠️
              </div>
              <h2 class="text-2xl font-black text-gray-900 mb-2">Konto bereits vorhanden</h2>
              <p class="text-gray-500 text-sm leading-relaxed mb-8">
                Für <span class="font-semibold text-gray-700">{{ submittedEmail }}</span> existiert bereits ein Konto. Klicke unten um einen neuen Zugangslink anzufordern.
              </p>
              <button
                @click="existingUser = false; handleSubmit()"
                :disabled="loading"
                class="w-full text-white rounded-xl px-6 py-3.5 text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 mb-3"
                :style="{ backgroundColor: tenant.primaryColor }"
              >
                <span v-if="loading" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Wird gesendet…
                </span>
                <span v-else>Neuen Zugangslink anfordern →</span>
              </button>
              <button
                @click="closeModal"
                class="w-full border-2 border-gray-200 rounded-xl px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Schliessen
              </button>
            </div>

            <!-- Success State -->
            <div v-else-if="emailSent" class="p-10 pt-12 text-center">
              <div class="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
                📬
              </div>
              <h2 class="text-3xl font-black text-gray-900 mb-2">Zugangslink gesendet!</h2>
              <p class="text-gray-500 text-sm leading-relaxed mb-2">Wir haben einen Link an</p>
              <p class="text-gray-900 font-bold text-sm mb-6">{{ submittedEmail }}</p>
              <p class="text-gray-400 text-xs leading-relaxed mb-8">
                Öffne die E-Mail und klicke auf den Link, um dein Affiliate-Dashboard zu öffnen. Der Link ist 1 Stunde gültig.
              </p>

              <button
                @click="closeModal"
                class="w-full border-2 border-gray-200 rounded-xl px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Schliessen
              </button>
            </div>

            <!-- Form State -->
            <div v-else class="p-10 pt-12">
              <div class="mb-8">
                <h2 class="text-3xl font-black text-gray-900 mb-2">Jetzt starten</h2>
                <p class="text-gray-500 text-sm leading-relaxed">Kein Passwort nötig – du erhältst einen Zugangslink per E-Mail.</p>
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-5">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-gray-600 mb-2 tracking-wide uppercase">Vorname</label>
                    <input
                      v-model="form.firstName"
                      type="text"
                      required
                      placeholder="Max"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition"
                      :style="{ 'focus:ring-color': tenant.primaryColor + '30' }"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-600 mb-2 tracking-wide uppercase">Nachname</label>
                    <input
                      v-model="form.lastName"
                      type="text"
                      required
                      placeholder="Mustermann"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition"
                      :style="{ 'focus:ring-color': tenant.primaryColor + '30' }"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-600 mb-2 tracking-wide uppercase">E-Mail-Adresse</label>
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    placeholder="max@beispiel.ch"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition"
                    :style="{ 'focus:ring-color': tenant.primaryColor + '30' }"
                  />
                </div>

                <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm font-medium">
                  {{ errorMessage }}
                </div>

                <button
                  type="submit"
                  :disabled="loading"
                  class="w-full text-white rounded-xl px-6 py-4 font-bold text-sm transition-all disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg"
                  :style="{ backgroundColor: tenant.primaryColor }"
                >
                  <span v-if="loading" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Wird gesendet…
                  </span>
                  <span v-else>Zugangslink senden →</span>
                </button>
              </form>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ 
  layout: false,
  middleware: 'validate-tenant'
})

const route = useRoute()
const { setFavicon } = useFavicon()
const form = ref({ firstName: '', lastName: '', email: '' })
const loading = ref(false)
const emailSent = ref(false)
const submittedEmail = ref('')
const errorMessage = ref('')
const loadingTenant = ref(true)
const tenantError = ref('')
const existingCodeInfo = ref<{ code: string; link: string } | null>(null)
const showModal = ref(false)
const existingUser = ref(false)

const tenant = reactive({
  id: '',
  name: 'Driving Team',
  slug: 'driving-team',
  primaryColor: '#6366f1',
  logo: '',
  affiliateEnabled: false,
})

const benefits = [
  { icon: '💸', title: 'CHF-Guthaben', desc: 'Pro Empfehlung' },
  { icon: '⚡', title: 'Automatisch', desc: 'Einmal aktivieren' },
  { icon: '🏦', title: 'Auszahlbar', desc: 'Per Überweisung' },
]

function closeModal() {
  showModal.value = false
}

async function loadTenant() {
  loadingTenant.value = true
  tenantError.value = ''
  try {
    const slug = String(route.params.slug || '').trim().toLowerCase()
    if (!slug) throw new Error('Tenant-Slug fehlt.')

    const response = await $fetch('/api/tenants/branding', {
      method: 'GET',
      query: { slug },
    }) as any

    if (!response?.data?.id) throw new Error('Tenant nicht gefunden.')

    tenant.id = response.data.id
    tenant.name = response.data.brand_name || response.data.name || 'Driving Team'
    tenant.slug = response.data.slug || slug
    tenant.primaryColor = response.data.primary_color || '#6366f1'
    tenant.logo = response.data.logo_square_url || response.data.logo_url || ''

    // Set favicon from tenant logo
    setFavicon(tenant.logo, '🤝')

    // Check if affiliate system is enabled
    tenant.affiliateEnabled = response.data.features?.affiliate_enabled === true

    if (!tenant.affiliateEnabled) {
      tenantError.value = 'Das Affiliate-Programm ist derzeit nicht aktiviert.'
    }
  } catch (error: any) {
    tenantError.value = error?.data?.message || error?.message || 'Tenant konnte nicht geladen werden.'
  } finally {
    loadingTenant.value = false
  }
}

async function handleSubmit() {
  errorMessage.value = ''
  existingCodeInfo.value = null
  existingUser.value = false
  loading.value = true
  try {
    const response = await $fetch('/api/affiliate/register-partner', {
      method: 'POST',
      body: {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        email: form.value.email.trim().toLowerCase(),
        tenantSlug: tenant.slug,
      }
    }) as any

    if (
      response?.affiliateCode?.code &&
      response?.affiliateCode?.link &&
      String(response?.status || '').startsWith('existing_user_code')
    ) {
      // Existing user — if the magic link was successfully sent, show the email-sent screen
      submittedEmail.value = form.value.email
      if (response?.emailSent === true) {
        // Magic link sent → show same success screen as new users
        emailSent.value = true
        return
      }
      // emailSent = false AND status = error_no_auth_user — show error in form
      if (response?.status === 'error_no_auth_user') {
        errorMessage.value = response?.message || 'Zugang konnte nicht erstellt werden.'
        return
      }
      // Other existing_user edge case — show fallback state with retry button
      existingUser.value = true
      existingCodeInfo.value = null
      return
    }

    submittedEmail.value = form.value.email
    emailSent.value = response?.emailSent === true
    if (!emailSent.value && !errorMessage.value && response?.message) {
      errorMessage.value = response.message
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
  } finally {
    loading.value = false
  }
}

const copied = ref(false)

function copyLink(link: string) {
  navigator.clipboard.writeText(link)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function shareWhatsapp(link: string) {
  const text = encodeURIComponent(`Schau dir das mal an – mein Affiliate-Link für ${tenant.name}: ${link}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}

function shareMail(link: string) {
  const subject = encodeURIComponent(`Mein Affiliate-Link – ${tenant.name}`)
  const body = encodeURIComponent(`Hallo,\n\nhier ist mein persönlicher Affiliate-Link für ${tenant.name}:\n${link}\n\nViele Grüsse`)
  window.open(`mailto:?subject=${subject}&body=${body}`)
}

await loadTenant()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.slide-up-leave-active {
  transition: all 0.18s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.97);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
</style>
