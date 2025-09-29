<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          Upgrade Ihr Konto
        </h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Wählen Sie den perfekten Plan für Ihr Business und erhalten Sie vollen Zugriff auf alle Features.
        </p>
      </div>

      <!-- Trial Status -->
      <div v-if="trialStatus.status !== 'active'" class="mb-8">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div class="flex items-center">
            <svg class="h-6 w-6 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 class="text-lg font-medium text-yellow-800">
                {{ trialStatus.status === 'expired' ? 'Trial abgelaufen' : 'Trial endet bald' }}
              </h3>
              <p class="text-yellow-700">{{ trialStatus.message }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pricing Plans -->
      <div class="grid md:grid-cols-3 gap-8 mb-12">
        <!-- Basic Plan -->
        <div class="bg-white rounded-lg shadow-lg p-8 relative">
          <div class="text-center">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
            <p class="text-gray-600 mb-6">Perfekt für kleine Fahrschulen</p>
            <div class="mb-6">
              <span class="text-4xl font-bold text-gray-900">CHF 29</span>
              <span class="text-gray-600">/Monat</span>
            </div>
            <ul class="space-y-3 mb-8">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Bis zu 100 Termine/Monat
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Bis zu 50 Kunden
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Basis-Kalender
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                E-Mail Support
              </li>
            </ul>
            <button 
              @click="selectPlan('basic')"
              :disabled="loading"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {{ loading ? 'Wird verarbeitet...' : 'Basic auswählen' }}
            </button>
          </div>
        </div>

        <!-- Professional Plan -->
        <div class="bg-white rounded-lg shadow-xl p-8 relative border-2 border-blue-500">
          <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span class="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              Beliebt
            </span>
          </div>
          <div class="text-center">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
            <p class="text-gray-600 mb-6">Ideal für wachsende Fahrschulen</p>
            <div class="mb-6">
              <span class="text-4xl font-bold text-gray-900">CHF 59</span>
              <span class="text-gray-600">/Monat</span>
            </div>
            <ul class="space-y-3 mb-8">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Bis zu 500 Termine/Monat
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Bis zu 250 Kunden
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Erweiterte Features
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Prioritäts-Support
              </li>
            </ul>
            <button 
              @click="selectPlan('professional')"
              :disabled="loading"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {{ loading ? 'Wird verarbeitet...' : 'Professional auswählen' }}
            </button>
          </div>
        </div>

        <!-- Enterprise Plan -->
        <div class="bg-white rounded-lg shadow-lg p-8 relative">
          <div class="text-center">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
            <p class="text-gray-600 mb-6">Für große Fahrschulen</p>
            <div class="mb-6">
              <span class="text-4xl font-bold text-gray-900">CHF 99</span>
              <span class="text-gray-600">/Monat</span>
            </div>
            <ul class="space-y-3 mb-8">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Unbegrenzte Termine
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Unbegrenzte Kunden
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Alle Features
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                24/7 Support
              </li>
            </ul>
            <button 
              @click="selectPlan('enterprise')"
              :disabled="loading"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {{ loading ? 'Wird verarbeitet...' : 'Enterprise auswählen' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Features Comparison -->
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">
          Feature-Vergleich
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-3 px-4 font-medium text-gray-900">Feature</th>
                <th class="text-center py-3 px-4 font-medium text-gray-900">Basic</th>
                <th class="text-center py-3 px-4 font-medium text-gray-900">Professional</th>
                <th class="text-center py-3 px-4 font-medium text-gray-900">Enterprise</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr>
                <td class="py-3 px-4 text-gray-700">Termine pro Monat</td>
                <td class="text-center py-3 px-4">100</td>
                <td class="text-center py-3 px-4">500</td>
                <td class="text-center py-3 px-4">Unbegrenzt</td>
              </tr>
              <tr>
                <td class="py-3 px-4 text-gray-700">Kunden</td>
                <td class="text-center py-3 px-4">50</td>
                <td class="text-center py-3 px-4">250</td>
                <td class="text-center py-3 px-4">Unbegrenzt</td>
              </tr>
              <tr>
                <td class="py-3 px-4 text-gray-700">Support</td>
                <td class="text-center py-3 px-4">E-Mail</td>
                <td class="text-center py-3 px-4">Priorität</td>
                <td class="text-center py-3 px-4">24/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Hinweis: Zahlungsabwicklung wird mit Stripe implementiert -->
    <div class="max-w-2xl mx-auto mt-8 text-center text-sm text-gray-500">
      Zahlungsabwicklung wird aktuell auf Stripe umgestellt.
    </div>
  </div>
</template>

<script setup lang="ts">
const { getTrialStatus } = useTrialFeatures()
const loading = ref(false)

const trialStatus = computed(() => getTrialStatus())

// Plan prices
const getPlanPrice = (plan: string) => {
  const prices = {
    basic: 29,
    professional: 59,
    enterprise: 99
  }
  return prices[plan as keyof typeof prices] || 0
}

const selectPlan = async (plan: string) => {
  loading.value = true
  try {
    // Stripe Checkout Session (single price) erstellen und weiterleiten
    const session = await $fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: {}
    })
    if (session?.url) {
      window.location.href = session.url
      return
    }
    throw new Error('Stripe Session konnte nicht erstellt werden')
  } catch (error: any) {
    console.error('❌ Stripe Checkout fehlgeschlagen:', error)
    alert('Checkout fehlgeschlagen. Bitte versuchen Sie es erneut.')
  } finally {
    loading.value = false
  }
}

// Meta
useHead({
  title: 'Upgrade - Simy',
  meta: [
    { name: 'description', content: 'Upgrade Ihr Simy-Konto und erhalten Sie vollen Zugriff auf alle Features.' }
  ]
})
</script>
