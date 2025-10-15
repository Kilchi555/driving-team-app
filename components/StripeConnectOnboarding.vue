<template>
  <div class="bg-white rounded-lg shadow-lg p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-semibold text-gray-900">
        Stripe Connect Setup
      </h3>
      <div v-if="accountStatus" class="flex items-center space-x-2">
        <div 
          :class="[
            'w-3 h-3 rounded-full',
            accountStatus.charges_enabled && accountStatus.payouts_enabled 
              ? 'bg-green-500' 
              : 'bg-yellow-500'
          ]"
        ></div>
        <span class="text-sm font-medium">
          {{ accountStatus.charges_enabled && accountStatus.payouts_enabled 
            ? 'Aktiv' 
            : 'Setup erforderlich' }}
        </span>
      </div>
    </div>

    <div v-if="!accountStatus" class="text-center py-8">
      <div class="mb-4">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
      <h4 class="text-lg font-medium text-gray-900 mb-2">
        Zahlungsabwicklung einrichten
      </h4>
      <p class="text-gray-600 mb-6">
        Richten Sie Ihr Stripe Connect Konto ein, um Zahlungen von Ihren Kunden zu empfangen.
      </p>
      <button
        @click="startOnboarding"
        :disabled="loading"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {{ loading ? 'Wird erstellt...' : 'Stripe Connect einrichten' }}
      </button>
    </div>

    <div v-else-if="!accountStatus.charges_enabled || !accountStatus.payouts_enabled" class="text-center py-8">
      <div class="mb-4">
        <svg class="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h4 class="text-lg font-medium text-gray-900 mb-2">
        Onboarding noch nicht abgeschlossen
      </h4>
      <p class="text-gray-600 mb-6">
        Bitte vervollständigen Sie die Stripe Connect Einrichtung, um Zahlungen zu empfangen.
      </p>
      <button
        @click="continueOnboarding"
        :disabled="loading"
        class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {{ loading ? 'Wird geladen...' : 'Onboarding fortsetzen' }}
      </button>
    </div>

    <div v-else class="text-center py-8">
      <div class="mb-4">
        <svg class="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h4 class="text-lg font-medium text-gray-900 mb-2">
        Stripe Connect ist aktiv!
      </h4>
      <p class="text-gray-600 mb-6">
        Ihr Konto ist vollständig eingerichtet und Sie können Zahlungen empfangen.
      </p>
      <div class="space-y-2 text-sm text-gray-500">
        <p>Account ID: {{ accountStatus.id }}</p>
        <p>Zahlungen: {{ accountStatus.charges_enabled ? 'Aktiviert' : 'Deaktiviert' }}</p>
        <p>Auszahlungen: {{ accountStatus.payouts_enabled ? 'Aktiviert' : 'Deaktiviert' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StripeAccountStatus {
  id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements: any
  business_profile: any
}

const props = defineProps<{
  tenantId: string
  tenantEmail: string
  businessName?: string
}>()

const loading = ref(false)
const accountStatus = ref<StripeAccountStatus | null>(null)

const startOnboarding = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/stripe/connect/create-account', {
      method: 'POST',
      body: {
        tenantId: props.tenantId,
        email: props.tenantEmail,
        businessName: props.businessName
      }
    })

    // Redirect to Stripe onboarding
    window.location.href = response.onboardingUrl
  } catch (error: any) {
    console.error('Onboarding start failed:', error)
    alert('Fehler beim Starten des Onboardings: ' + error.message)
  } finally {
    loading.value = false
  }
}

const continueOnboarding = async () => {
  // Create new onboarding link for existing account
  loading.value = true
  try {
    const response = await $fetch('/api/stripe/connect/create-account', {
      method: 'POST',
      body: {
        tenantId: props.tenantId,
        email: props.tenantEmail,
        businessName: props.businessName
      }
    })

    window.location.href = response.onboardingUrl
  } catch (error: any) {
    console.error('Onboarding continue failed:', error)
    alert('Fehler beim Fortsetzen des Onboardings: ' + error.message)
  } finally {
    loading.value = false
  }
}

const checkAccountStatus = async () => {
  if (!props.tenantId) return
  
  try {
    // TODO: Get account ID from tenant data
    // For now, we'll need to store the account ID in the tenant record
    const response = await $fetch(`/api/stripe/connect/account-status?accountId=${props.tenantId}`)
    accountStatus.value = response
  } catch (error) {
    console.error('Account status check failed:', error)
  }
}

onMounted(() => {
  checkAccountStatus()
})
</script>
