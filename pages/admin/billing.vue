<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

    <!-- Header -->
    <div class="mb-2">
      <h1 class="text-2xl font-bold text-gray-900">Abonnement</h1>
      <p class="text-sm text-gray-500 mt-0.5">Dein Simy-Plan, Add-ons und Rechnungen</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-gray-100 animate-pulse" />
    </div>

    <template v-else>

      <!-- ── Trial Banner ─────────────────────────────────────────────────────── -->
      <div v-if="billing?.is_trial" class="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-6 shadow-lg">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-violet-200 mb-1">Aktueller Status</p>
            <h2 class="text-2xl font-extrabold">Kostenloser Trial</h2>
            <p class="text-violet-200 text-sm mt-1">
              <template v-if="trialDaysLeft !== null && trialDaysLeft > 0">
                Noch <strong class="text-white">{{ trialDaysLeft }} {{ trialDaysLeft === 1 ? 'Tag' : 'Tage' }}</strong> übrig
              </template>
              <template v-else-if="trialDaysLeft === 0">
                Läuft heute ab
              </template>
              <template v-else>
                Trial abgelaufen
              </template>
            </p>
          </div>
          <div class="flex-shrink-0">
            <NuxtLink to="/upgrade"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white font-bold text-sm transition-all hover:bg-violet-50"
              :style="{ color: '#6000BD' }">
              Jetzt upgraden →
            </NuxtLink>
          </div>
        </div>
        <p class="text-xs text-violet-300 mt-4">
          Voller Funktionsumfang — keine Kreditkarte für den Trial nötig.
        </p>
      </div>

      <!-- ── Current Plan Card ───────────────────────────────────────────────── -->
      <div v-else class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        <!-- Cancellation warning banner -->
        <div v-if="billing?.subscription_cancel_at"
          class="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2 text-amber-800 text-sm">
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <span>Kündigung geplant — Abo endet am <strong>{{ formatDate(billing.subscription_cancel_at) }}</strong></span>
          </div>
          <button @click="revokeCancel" :disabled="actionLoading"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors disabled:opacity-50 whitespace-nowrap">
            {{ actionLoading ? '…' : 'Kündigung widerrufen' }}
          </button>
        </div>

        <div class="p-6">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Aktiver Plan</p>
              <h2 class="text-2xl font-extrabold text-gray-900">{{ planLabel }}</h2>
              <p class="text-sm text-gray-500 mt-0.5">{{ planTagline }}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-black text-gray-900">
                <span v-if="pricesLoading" class="inline-block w-20 h-8 rounded-lg bg-gray-100 animate-pulse" />
                <span v-else-if="currentPlanPrice">{{ currentPlanPrice }}</span>
                <span v-else class="text-base font-normal text-gray-400">–</span>
              </div>
              <p v-if="currentPlanPrice" class="text-xs text-gray-400">/Monat (exkl. MwSt.)</p>
            </div>
          </div>

          <!-- Billing Date -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p class="text-xs text-gray-400 font-medium mb-0.5">Nächste Abrechnung</p>
              <p class="text-sm font-semibold text-gray-800">{{ billing?.current_period_end ? formatDate(billing.current_period_end) : '–' }}</p>
            </div>
            <div class="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p class="text-xs text-gray-400 font-medium mb-0.5">Fahrlehrer-Seats</p>
              <p class="text-sm font-semibold text-gray-800">
                {{ includedSeats }} inklusive
                <span v-if="billing?.addon_seats && billing.addon_seats > 0" class="text-violet-600">
                  + {{ billing.addon_seats }} extra
                </span>
              </p>
            </div>
          </div>

          <!-- Add-ons -->
          <div v-if="activeAddons.length > 0" class="mb-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Aktive Add-ons</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="addon in activeAddons" :key="addon"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
                {{ addon }}
              </span>
            </div>
          </div>

          <!-- Total Monthly Cost -->
          <div v-if="!pricesLoading && totalMonthlyCost" class="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 mb-5 flex justify-between items-center">
            <span class="text-sm font-medium text-violet-700">Total pro Monat</span>
            <span class="text-lg font-black text-violet-800">{{ totalMonthlyCost }}</span>
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            <NuxtLink to="/upgrade"
              class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
              style="background: linear-gradient(135deg, #6000BD, #8B2FE8); box-shadow: 0 4px 14px rgba(96,0,189,0.25)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
              </svg>
              Plan / Add-ons anpassen
            </NuxtLink>

            <button v-if="billing?.has_stripe_customer" @click="openPortal" :disabled="portalLoading"
              class="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              {{ portalLoading ? 'Öffne…' : 'Zahlungsmethode & Rechnungen' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Included Features ───────────────────────────────────────────────── -->
      <div v-if="!billing?.is_trial" class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Im Plan enthalten</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <div v-for="feature in planFeatures" :key="feature"
            class="flex items-center gap-2 text-sm text-gray-700">
            <svg class="w-4 h-4 flex-shrink-0 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            {{ feature }}
          </div>
        </div>
      </div>

      <!-- ── Danger Zone ─────────────────────────────────────────────────────── -->
      <div v-if="!billing?.is_trial && billing?.has_stripe_subscription && !billing?.subscription_cancel_at"
        class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Abonnement beenden</p>
        <p class="text-sm text-gray-500 mb-4">
          Mit 1 Monat Kündigungsfrist. Alle Daten bleiben noch 30 Tage nach Ablauf erhalten.
        </p>
        <button @click="showCancelDialog = true"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Abonnement kündigen
        </button>
      </div>

    </template>

    <!-- Error -->
    <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- ── Cancel Confirmation Dialog ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showCancelDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 text-center mb-2">Abonnement kündigen?</h3>
            <p class="text-sm text-gray-500 text-center mb-6">
              Das Abo bleibt bis Ende der 1-monatigen Kündigungsfrist vollständig aktiv.
              Du kannst jederzeit widerrufen.
            </p>
            <div class="flex gap-3">
              <button @click="showCancelDialog = false"
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button @click="cancelSubscription" :disabled="actionLoading"
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
                {{ actionLoading ? 'Wird gekündigt…' : 'Ja, kündigen' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PLANS } from '~/utils/planFeatures'
import type { PricingResponse } from '~/server/api/stripe/prices.get'

definePageMeta({ middleware: 'admin', layout: 'admin' })

const loading = ref(true)
const pricesLoading = ref(true)
const actionLoading = ref(false)
const portalLoading = ref(false)
const error = ref<string | null>(null)
const showCancelDialog = ref(false)

interface BillingStatus {
  plan: string
  is_trial: boolean
  trial_ends_at: string | null
  current_period_end: string | null
  subscription_cancel_at: string | null
  addon_seats: number
  addon_courses_enabled: boolean
  addon_affiliate_enabled: boolean
  has_stripe_subscription: boolean
  has_stripe_customer: boolean
}

const billing = ref<BillingStatus | null>(null)
const pricing = ref<PricingResponse | null>(null)

/** Resolve a fresh access token – mirrors the logic in upgrade.vue.
 *  1. Check client-side session (only trust if still valid for ≥60s).
 *  2. Fall back to server-side refresh via the httpOnly refresh-token cookie.
 *  Returns null only when the user has no valid session at all. */
const resolveFreshToken = async (): Promise<string | null> => {
  try {
    const { getSupabase } = await import('~/utils/supabase')
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    const nowSec = Math.floor(Date.now() / 1000)
    if (session?.access_token && (session.expires_at ?? 0) - nowSec > 60) {
      return session.access_token
    }
  } catch { /* ignore */ }

  try {
    const refreshed = await $fetch<{ session: { access_token: string } }>('/api/auth/refresh', { method: 'POST' })
    if (refreshed?.session?.access_token) return refreshed.session.access_token
  } catch { /* no valid refresh cookie → truly unauthenticated */ }

  return null
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await resolveFreshToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

onMounted(async () => {
  await Promise.all([loadBillingStatus(), loadPrices()])
})

async function loadBillingStatus() {
  loading.value = true
  error.value = null
  try {
    billing.value = await $fetch<BillingStatus>('/api/admin/billing-status', {
      headers: await authHeaders(),
    })
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Abonnement-Daten konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

async function loadPrices() {
  pricesLoading.value = true
  try {
    pricing.value = await $fetch<PricingResponse>('/api/stripe/prices')
  } catch { /* non-critical – prices just won't show */ }
  finally { pricesLoading.value = false }
}

const planDef = computed(() => PLANS.find(p => p.id === billing.value?.plan))
const planLabel = computed(() => planDef.value?.name ?? billing.value?.plan ?? '–')
const planTagline = computed(() => planDef.value?.tagline ?? '')
const planFeatures = computed(() => planDef.value?.features ?? [])
const includedSeats = computed(() => planDef.value?.includedSeats ?? 1)

const currentPlanPrice = computed(() => {
  if (!pricing.value || !billing.value?.plan) return null
  const amount = pricing.value.plans?.[billing.value.plan]?.unitAmount
  if (!amount) return null
  return `CHF ${(amount / 100).toFixed(2)}`
})

const totalMonthlyCost = computed(() => {
  if (!pricing.value || !billing.value) return null
  let total = pricing.value.plans?.[billing.value.plan]?.unitAmount ?? 0
  if (billing.value.addon_seats > 0) {
    total += billing.value.addon_seats * (pricing.value.addons?.seats?.unitAmount ?? 0)
  }
  if (billing.value.addon_courses_enabled) {
    total += pricing.value.addons?.courses?.unitAmount ?? 0
  }
  if (billing.value.addon_affiliate_enabled) {
    total += pricing.value.addons?.affiliate?.unitAmount ?? 0
  }
  if (total === 0) return null
  return `CHF ${(total / 100).toFixed(2)}`
})

const activeAddons = computed(() => {
  const addons: string[] = []
  if (!billing.value) return addons
  if (billing.value.addon_seats > 0) addons.push(`${billing.value.addon_seats} Extra-Seat${billing.value.addon_seats !== 1 ? 's' : ''}`)
  if (billing.value.addon_courses_enabled) addons.push('Kursbuchungsseite')
  if (billing.value.addon_affiliate_enabled) addons.push('Affiliate-System')
  return addons
})

const trialDaysLeft = computed(() => {
  if (!billing.value?.trial_ends_at) return null
  const days = Math.ceil((new Date(billing.value.trial_ends_at).getTime() - Date.now()) / 86400000)
  return Math.max(0, days)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function openPortal() {
  portalLoading.value = true
  error.value = null
  try {
    const res = await $fetch<{ url: string }>('/api/stripe/customer-portal', {
      method: 'POST',
      headers: await authHeaders(),
    })
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Stripe-Portal konnte nicht geöffnet werden.'
  } finally {
    portalLoading.value = false
  }
}

async function cancelSubscription() {
  actionLoading.value = true
  error.value = null
  try {
    const res = await $fetch<{ message: string }>('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: await authHeaders(),
    })
    showCancelDialog.value = false
    await loadBillingStatus()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Kündigung fehlgeschlagen.'
  } finally {
    actionLoading.value = false
  }
}

async function revokeCancel() {
  actionLoading.value = true
  error.value = null
  try {
    await $fetch('/api/stripe/revoke-cancellation', {
      method: 'POST',
      headers: await authHeaders(),
    })
    await loadBillingStatus()
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Widerruf fehlgeschlagen.'
  } finally {
    actionLoading.value = false
  }
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
