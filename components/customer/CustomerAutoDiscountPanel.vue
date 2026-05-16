<template>
  <div class="bg-white rounded-xl shadow-lg border border-gray-200">
    <div class="px-4 sm:px-6 py-4 border-b border-gray-200">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
        </svg>
        <h2 class="text-base font-semibold text-gray-900">Mein Dauerrabatt</h2>
      </div>
      <p class="text-xs text-gray-500 mt-1">Gib einmal einen Rabattcode ein – er wird automatisch auf alle deine Buchungen angewendet.</p>
    </div>

    <div class="px-4 sm:px-6 py-4 space-y-4">

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center gap-2 text-sm text-gray-500">
        <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Wird geladen…
      </div>

      <!-- Active registered codes -->
      <div v-else-if="activeDiscounts.length > 0" class="space-y-2">
        <div
          v-for="udc in activeDiscounts"
          :key="udc.id"
          class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <div>
              <p class="text-sm font-semibold text-green-800 tracking-wider uppercase">{{ udc.code }}</p>
              <p class="text-xs text-green-700">
                {{ formatDiscountLabel(udc.discounts) }}
                <span v-if="udc.expires_at || udc.discounts?.valid_until" class="ml-1 text-green-600">
                  · gültig bis {{ formatDate(udc.expires_at || udc.discounts?.valid_until) }}
                </span>
              </p>
            </div>
          </div>
          <button
            @click="deactivateCode(udc)"
            :disabled="isDeactivating === udc.id"
            class="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Rabatt entfernen"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <p v-else-if="!isLoading" class="text-sm text-gray-500">
        Noch kein Dauerrabatt aktiv.
      </p>

      <!-- Register new code -->
      <div class="border-t pt-4">
        <p class="text-xs font-medium text-gray-600 mb-2">Code registrieren</p>
        <div class="flex gap-2">
          <input
            v-model="codeInput"
            type="text"
            placeholder="Code eingeben"
            :disabled="isRegistering"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            @keydown.enter.prevent="registerCode"
            @input="registerError = null; registerSuccess = null"
          />
          <button
            type="button"
            @click="registerCode"
            :disabled="!codeInput.trim() || isRegistering"
            class="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <span v-if="isRegistering" class="flex items-center gap-1">
              <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </span>
            <span v-else>Speichern</span>
          </button>
        </div>

        <!-- Success -->
        <div v-if="registerSuccess" class="mt-2 flex items-center gap-1.5 text-sm text-green-700">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ registerSuccess }}
        </div>

        <!-- Error -->
        <div v-if="registerError" class="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ registerError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isLoading = ref(true)
const activeDiscounts = ref<any[]>([])
const codeInput = ref('')
const isRegistering = ref(false)
const isDeactivating = ref<string | null>(null)
const registerError = ref<string | null>(null)
const registerSuccess = ref<string | null>(null)

const loadDiscounts = async () => {
  try {
    isLoading.value = true
    const res = await $fetch('/api/discounts/my-auto-discounts') as any
    activeDiscounts.value = res.discounts || []
  } catch {
    activeDiscounts.value = []
  } finally {
    isLoading.value = false
  }
}

const registerCode = async () => {
  const code = codeInput.value.trim()
  if (!code) return

  isRegistering.value = true
  registerError.value = null
  registerSuccess.value = null

  try {
    const res = await $fetch('/api/discounts/register-for-user', {
      method: 'POST',
      body: { code }
    }) as any

    if (res.success) {
      codeInput.value = ''
      registerSuccess.value = `Code gespeichert – ${formatDiscountLabel(res.discount)} wird ab sofort auf alle Buchungen angewendet.`
      await loadDiscounts()
    } else {
      registerError.value = res.error || 'Code konnte nicht registriert werden'
    }
  } catch (err: any) {
    registerError.value = err?.data?.statusMessage || 'Code konnte nicht geprüft werden'
  } finally {
    isRegistering.value = false
  }
}

const deactivateCode = async (udc: any) => {
  isDeactivating.value = udc.id
  try {
    await $fetch('/api/discounts/deactivate-user-code', {
      method: 'POST',
      body: { id: udc.id }
    })
    await loadDiscounts()
  } catch {
    // silently ignore – refresh list anyway
    await loadDiscounts()
  } finally {
    isDeactivating.value = null
  }
}

const formatDiscountLabel = (discount: any) => {
  if (!discount) return ''
  if (discount.discount_type === 'percentage') return `${discount.discount_value}% Rabatt`
  if (discount.discount_type === 'fixed') return `CHF ${parseFloat(discount.discount_value).toFixed(2)} Rabatt`
  if (discount.discount_type === 'free_lesson') return 'Gratisstunde'
  return discount.name || 'Rabatt'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(loadDiscounts)
</script>
