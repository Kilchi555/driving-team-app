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
      <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-500 text-sm text-center max-w-sm">
        {{ tenantError }}
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
          <div v-if="showModal" class="bg-white rounded-3xl shadow-2xl w-full max-w-md relative">

            <!-- Close Button -->
            <button
              @click="closeModal"
              class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-500 text-sm"
            >
              ✕
            </button>

            <!-- Success State -->
            <div v-if="emailSent" class="p-8 text-center">
              <div class="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
                📬
              </div>
              <h2 class="text-2xl font-black text-gray-900 mb-3">Zugangslink gesendet!</h2>
              <p class="text-gray-500 text-sm leading-relaxed mb-1">Wir haben einen Link an</p>
              <p class="text-gray-900 font-semibold text-sm mb-4">{{ submittedEmail }}</p>
              <p class="text-gray-400 text-xs leading-relaxed mb-6">
                Öffne die E-Mail und klicke auf den Link, um dein Affiliate-Dashboard zu öffnen. Der Link ist 1 Stunde gültig.
              </p>

              <template v-if="existingCodeInfo">
                <div class="mt-2">
                  <p class="text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">Dein Affiliate-Link</p>
                  <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-3">
                    <span class="flex-1 text-xs text-gray-600 truncate">{{ existingCodeInfo.link }}</span>
                    <button @click="copyLink(existingCodeInfo!.link)" class="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg transition" :class="copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'">
                      {{ copied ? '✓ Kopiert' : 'Kopieren' }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button @click="shareWhatsapp(existingCodeInfo!.link)" class="flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.197a.75.75 0 0 0 .921.912l5.517-1.456A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.732 9.732 0 0 1-4.952-1.352l-.355-.21-3.676.97.985-3.595-.23-.368A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                      WhatsApp
                    </button>
                    <button @click="shareMail(existingCodeInfo!.link)" class="flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      E-Mail
                    </button>
                  </div>
                </div>
              </template>

              <button
                @click="closeModal"
                class="mt-4 w-full border border-gray-200 rounded-xl px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Schliessen
              </button>
            </div>

            <!-- Form State -->
            <div v-else class="p-8">
              <div class="mb-6">
                <h2 class="text-2xl font-black text-gray-900 mb-1.5">Jetzt starten</h2>
                <p class="text-gray-400 text-sm">Kein Passwort nötig – du erhältst einen Zugangslink per E-Mail.</p>
              </div>

              <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">Vorname</label>
                    <input
                      v-model="form.firstName"
                      type="text"
                      required
                      placeholder="Max"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">Nachname</label>
                    <input
                      v-model="form.lastName"
                      type="text"
                      required
                      placeholder="Mustermann"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-500 mb-2 tracking-wide uppercase">E-Mail-Adresse</label>
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    placeholder="max@beispiel.ch"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-gray-400 transition"
                  />
                </div>

                <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-xl p-3 text-red-500 text-sm">
                  {{ errorMessage }}
                </div>

                <div v-if="existingCodeInfo" class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
                  <p class="font-semibold mb-3">Dein Affiliate-Code: <strong>{{ existingCodeInfo.code }}</strong></p>
                  <p class="text-xs font-semibold text-emerald-600 mb-2 tracking-wide uppercase">Dein Affiliate-Link</p>
                  <div class="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-3 py-2.5 mb-3">
                    <span class="flex-1 text-xs text-gray-600 truncate">{{ existingCodeInfo.link }}</span>
                    <button @click="copyLink(existingCodeInfo!.link)" class="flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-lg transition" :class="copied ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'">
                      {{ copied ? '✓ Kopiert' : 'Kopieren' }}
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button @click="shareWhatsapp(existingCodeInfo!.link)" class="flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.197a.75.75 0 0 0 .921.912l5.517-1.456A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.732 9.732 0 0 1-4.952-1.352l-.355-.21-3.676.97.985-3.595-.23-.368A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                      WhatsApp
                    </button>
                    <button @click="shareMail(existingCodeInfo!.link)" class="flex items-center justify-center gap-2 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2V7a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      E-Mail
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  :disabled="loading"
                  class="w-full text-white rounded-xl px-6 py-3.5 font-bold text-sm transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]"
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

definePageMeta({ layout: false })

const route = useRoute()
const form = ref({ firstName: '', lastName: '', email: '' })
const loading = ref(false)
const emailSent = ref(false)
const submittedEmail = ref('')
const errorMessage = ref('')
const loadingTenant = ref(true)
const tenantError = ref('')
const existingCodeInfo = ref<{ code: string; link: string } | null>(null)
const showModal = ref(false)

const tenant = reactive({
  id: '',
  name: 'Driving Team',
  slug: 'driving-team',
  primaryColor: '#6366f1',
  logo: '',
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
  } catch (error: any) {
    tenantError.value = error?.data?.message || error?.message || 'Tenant konnte nicht geladen werden.'
  } finally {
    loadingTenant.value = false
  }
}

async function handleSubmit() {
  errorMessage.value = ''
  existingCodeInfo.value = null
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
      existingCodeInfo.value = {
        code: response.affiliateCode.code,
        link: response.affiliateCode.link,
      }
      errorMessage.value = response?.message || 'Für diese E-Mail existiert bereits ein Affiliate-Code.'
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
