<template>
  <!-- Past-due payment banner (highest priority) -->
  <div v-if="isPastDue" class="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 p-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-red-800">
            ❌ Zahlung fehlgeschlagen – bitte Zahlungsmethode aktualisieren
          </p>
        </div>
      </div>
      <div class="flex-shrink-0">
        <button
          @click="openCustomerPortal"
          :disabled="portalLoading"
          class="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {{ portalLoading ? 'Lade…' : 'Zahlung aktualisieren' }}
          <svg class="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Trial banner -->
  <div v-else-if="showBanner" class="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-yellow-800">
            <span v-if="trialStatus.status === 'expired'">
              ⚠️ Ihr Trial ist abgelaufen
            </span>
            <span v-else-if="trialStatus.status === 'warning'">
              ⏰ Ihr Trial endet in {{ trialStatus.daysLeft }} {{ trialStatus.daysLeft === 1 ? 'Tag' : 'Tagen' }}
            </span>
            <span v-else>
              🆓 Trial läuft noch {{ trialStatus.daysLeft }} {{ trialStatus.daysLeft === 1 ? 'Tag' : 'Tage' }}
            </span>
          </p>
        </div>
      </div>
      <div class="flex-shrink-0">
        <NuxtLink 
          to="/upgrade" 
          class="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
        >
          {{ trialStatus.status === 'expired' ? 'Jetzt upgraden' : 'Upgrade ansehen' }}
          <svg class="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { showTrialWarning, getTrialStatus } = useTrialFeatures()

const trialStatus = computed(() => getTrialStatus())
const showBanner = computed(() => showTrialWarning.value || trialStatus.value.status === 'expired')

// ── Past-due detection ────────────────────────────────────────────────────────
const isPastDue = ref(false)
const portalLoading = ref(false)

onMounted(async () => {
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { useAuthStore } = await import('~/stores/auth')
    const auth = useAuthStore()
    const tenantId = auth.userProfile?.tenant_id
    if (!tenantId) return

    const { data } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('setting_key', 'subscription_status')
      .maybeSingle()

    if (data?.setting_value) {
      const parsed = JSON.parse(data.setting_value)
      isPastDue.value = parsed.status === 'past_due'
    }
  } catch { /* non-critical */ }
})

async function openCustomerPortal() {
  portalLoading.value = true
  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/customer-portal', { method: 'POST' })
    if (url) window.location.href = url
  } catch {
    alert('Stripe Portal konnte nicht geöffnet werden. Bitte kontaktiere info@simy.ch.')
  } finally {
    portalLoading.value = false
  }
}
</script>

