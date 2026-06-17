<template>
  <section class="section-container">
    <div class="max-w-xl mx-auto">
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div class="text-center mb-6">
          <div class="text-3xl mb-3">🔔</div>
          <h2 class="text-xl font-bold text-gray-900">Auf Warteliste eintragen</h2>
          <p class="text-gray-600 text-sm mt-2">
            Aktuell sind keine Plätze frei. Trag dich ein – wir melden uns, sobald ein neuer {{ categoryLabel }} startet.
          </p>
        </div>

        <!-- Success State -->
        <div v-if="success" class="text-center py-4">
          <div class="text-4xl mb-3">✅</div>
          <p class="font-semibold text-gray-900">Eingetragen!</p>
          <p class="text-gray-600 text-sm mt-1">Du erhältst eine E-Mail-Bestätigung und wirst benachrichtigt, sobald ein Platz frei ist.</p>
        </div>

        <!-- Error -->
        <div v-else-if="alreadyOnList" class="text-center py-4">
          <div class="text-4xl mb-3">👍</div>
          <p class="font-semibold text-gray-900">Du stehst bereits auf der Warteliste.</p>
          <p class="text-gray-600 text-sm mt-1">Wir melden uns, sobald ein neuer Kurs verfügbar ist.</p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
            <input
              v-model="firstName"
              type="text"
              required
              autocomplete="given-name"
              placeholder="Max"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="max@beispiel.ch"
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div v-if="errorMsg" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {{ errorMsg }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary py-3 text-base font-semibold"
          >
            {{ loading ? 'Wird eingetragen...' : '🔔 Auf Warteliste eintragen' }}
          </button>
          <p class="text-xs text-gray-500 text-center">Kein Spam. Nur eine E-Mail, wenn ein neuer Kurs verfügbar ist.</p>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  categoryCode: string
  categoryLabel: string
  tenantId: string
}>()

const firstName = ref('')
const email = ref('')
const loading = ref(false)
const success = ref(false)
const alreadyOnList = ref(false)
const errorMsg = ref('')

async function submit() {
  loading.value = true
  errorMsg.value = ''

  try {
    await $fetch('/api/courses/category-waitlist-signup', {
      method: 'POST',
      body: {
        category_code: props.categoryCode,
        first_name: firstName.value,
        email: email.value,
        tenant_id: props.tenantId,
      },
    })
    success.value = true
  } catch (err: any) {
    if (err?.statusCode === 409) {
      alreadyOnList.value = true
    } else {
      errorMsg.value = err?.statusMessage || 'Eintragung fehlgeschlagen. Bitte versuche es erneut.'
    }
  } finally {
    loading.value = false
  }
}
</script>
