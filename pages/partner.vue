<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-4">
      <div class="max-w-lg mx-auto flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">🤝</div>
        <span class="font-bold text-gray-900">Affiliate Partner</span>
      </div>
    </div>

    <div class="flex-1 flex items-start justify-center p-4 pt-10">
      <div class="w-full max-w-md">

        <!-- Success state -->
        <div v-if="emailSent" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div class="text-5xl mb-4">📬</div>
          <h2 class="text-xl font-bold text-gray-900 mb-3">E-Mail gesendet!</h2>
          <p class="text-gray-600 text-sm mb-2">
            Wir haben einen Zugangslink an <strong>{{ submittedEmail }}</strong> gesendet.
          </p>
          <p class="text-gray-500 text-sm">Öffne die E-Mail und klicke auf den Link, um dein Affiliate-Dashboard zu öffnen. Der Link ist 1 Stunde gültig.</p>
        </div>

        <!-- Form state -->
        <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div class="mb-6">
            <h1 class="text-xl font-bold text-gray-900 mb-1">Partner-Zugang</h1>
            <p class="text-sm text-gray-500">Kein Passwort nötig – du erhältst einen Zugangslink per E-Mail.</p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Vorname</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  placeholder="Max"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">Nachname</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  placeholder="Mustermann"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">E-Mail-Adresse</label>
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="max@beispiel.ch"
                class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            <p v-if="errorMessage" class="text-red-600 text-sm bg-red-50 rounded-lg p-3">{{ errorMessage }}</p>

            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-gray-900 text-white rounded-lg px-6 py-3 font-semibold text-sm hover:bg-gray-700 transition disabled:opacity-50"
            >
              <span v-if="loading">Wird gesendet…</span>
              <span v-else">Zugangslink senden →</span>
            </button>
          </form>
        </div>

        <!-- Info boxes -->
        <div class="mt-6 grid grid-cols-3 gap-3">
          <div class="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div class="text-xl mb-1">💸</div>
            <div class="text-xs font-semibold text-gray-700">CHF-Guthaben</div>
            <div class="text-xs text-gray-400">pro Empfehlung</div>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div class="text-xl mb-1">🔗</div>
            <div class="text-xs font-semibold text-gray-700">Einmal aktivieren</div>
            <div class="text-xs text-gray-400">dann automatisch</div>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div class="text-xl mb-1">🏦</div>
            <div class="text-xs font-semibold text-gray-700">Auszahlbar</div>
            <div class="text-xs text-gray-400">per Überweisung</div>
          </div>
        </div>

        <p class="text-center text-xs text-gray-400 mt-6">
          Bereits Schüler oder Mitarbeiter?
          <NuxtLink :to="loginPath" class="text-gray-600 underline">Direkt einloggen →</NuxtLink>
        </p>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const form = ref({ firstName: '', lastName: '', email: '' })
const loading = ref(false)
const emailSent = ref(false)
const submittedEmail = ref('')
const errorMessage = ref('')

const loginPath = computed(() => {
  if (process.client) {
    const slug = localStorage.getItem('last_tenant_slug')
    if (slug) return `/${slug}`
  }
  return '/driving-team'
})

async function handleSubmit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await $fetch('/api/affiliate/register-partner', {
      method: 'POST',
      body: {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim(),
        email: form.value.email.trim().toLowerCase(),
      }
    })
    submittedEmail.value = form.value.email
    emailSent.value = true
  } catch (err: any) {
    errorMessage.value = err?.data?.message || err?.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
  } finally {
    loading.value = false
  }
}
</script>
