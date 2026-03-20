<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Auth loading -->
    <div v-if="authLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500 text-sm">Wird geladen…</p>
      </div>
    </div>

    <!-- Not authenticated -->
    <div v-else-if="!isAuthenticated" class="flex items-center justify-center min-h-screen p-4">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center">
        <div class="text-4xl mb-4">🔒</div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Zugang erforderlich</h2>
        <p class="text-gray-500 text-sm mb-6">Bitte melde dich an oder fordere einen neuen Zugangslink an.</p>
        <NuxtLink to="/partner" class="block bg-gray-900 text-white rounded-lg px-5 py-2.5 font-semibold text-sm hover:bg-gray-700 transition">
          Neuen Link anfordern
        </NuxtLink>
      </div>
    </div>

    <!-- Dashboard -->
    <div v-else>
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-4 py-4">
        <div class="max-w-3xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm">
              {{ initials }}
            </div>
            <div>
              <p class="font-semibold text-gray-900 text-sm">{{ userName }}</p>
              <p class="text-xs text-gray-400">Affiliate-Partner</p>
            </div>
          </div>
          <button @click="logout" class="text-sm text-gray-500 hover:text-gray-700">Abmelden</button>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">

        <!-- Summary Cards -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div class="text-2xl font-bold text-gray-900">{{ stats?.summary.total_referrals ?? 0 }}</div>
            <div class="text-xs text-gray-500 mt-1">Empfehlungen</div>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div class="text-2xl font-bold text-gray-900">{{ formatChf(stats?.summary.total_credited_rappen ?? 0) }}</div>
            <div class="text-xs text-gray-500 mt-1">Verdient</div>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ formatChf(stats?.summary.current_balance_rappen ?? 0) }}</div>
            <div class="text-xs text-gray-500 mt-1">Guthaben</div>
          </div>
        </div>

        <!-- Share Link -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="font-bold text-gray-900 mb-1">Dein Empfehlungslink</h2>
          <p class="text-sm text-gray-500 mb-4">Teile diesen Link – neue Kunden werden dir automatisch zugeordnet.</p>

          <div v-if="!affiliateCode" class="text-center py-4">
            <button
              @click="generateCode"
              :disabled="generatingCode"
              class="bg-gray-900 text-white rounded-lg px-6 py-2.5 font-semibold text-sm hover:bg-gray-700 transition disabled:opacity-50"
            >
              <span v-if="generatingCode">Wird erstellt…</span>
              <span v-else>Link aktivieren →</span>
            </button>
          </div>

          <div v-else>
            <div class="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-3">
              <span class="text-sm text-gray-700 flex-1 truncate font-mono">{{ shareLink }}</span>
              <button
                @click="copyLink"
                class="shrink-0 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded px-3 py-1.5 transition"
              >
                {{ copied ? '✓ Kopiert' : 'Kopieren' }}
              </button>
            </div>
            <div class="flex gap-3 mt-3">
              <a
                :href="`https://wa.me/?text=Ich%20empfehle%20Driving%20Team%20%E2%80%93%20hier%20der%20Link%3A%20${encodeURIComponent(shareLink)}`"
                target="_blank"
                class="flex-1 text-center bg-green-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-600 transition"
              >
                WhatsApp
              </a>
              <a
                :href="`mailto:?subject=Fahrschule%20Empfehlung&body=Schau%20mal%3A%20${encodeURIComponent(shareLink)}`"
                class="flex-1 text-center bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-200 transition"
              >
                E-Mail
              </a>
            </div>
          </div>
        </div>

        <!-- Referrals List -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="font-bold text-gray-900 mb-4">Empfehlungen</h2>
          <div v-if="!stats?.referrals?.length" class="text-center py-8 text-gray-400 text-sm">
            Noch keine Empfehlungen. Teile deinen Link!
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="ref in stats.referrals"
              :key="ref.id"
              class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div>
                <div class="text-sm font-medium text-gray-700">
                  {{ ref.users?.first_name }} {{ ref.users?.last_name }}
                </div>
                <div class="text-xs text-gray-400">{{ formatDate(ref.created_at) }}</div>
              </div>
              <div class="flex items-center gap-3">
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :class="ref.status === 'credited' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                >
                  {{ ref.status === 'credited' ? '✓ Gutgeschrieben' : 'Ausstehend' }}
                </span>
                <span v-if="ref.reward_rappen > 0" class="text-sm font-bold text-gray-900">
                  {{ formatChf(ref.reward_rappen) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Payout -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="font-bold text-gray-900 mb-1">Auszahlung beantragen</h2>
          <p class="text-sm text-gray-500 mb-4">
            Guthaben: <strong class="text-gray-900">{{ formatChf(stats?.summary.current_balance_rappen ?? 0) }}</strong>
          </p>

          <!-- Payout type selection -->
          <div v-if="!showPayoutForm" class="flex gap-3">
            <button
              @click="() => { payoutType = 'bank'; showPayoutForm = true }"
              :disabled="(stats?.summary.current_balance_rappen ?? 0) < 100"
              class="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Banküberweisung
            </button>
            <button
              @click="() => { payoutType = 'credit'; showPayoutForm = true }"
              class="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-200 transition"
            >
              Als Fahrstunden-Guthaben behalten
            </button>
          </div>

          <!-- Bank payout form -->
          <form v-else-if="payoutType === 'bank'" @submit.prevent="submitPayout" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Betrag (CHF)</label>
              <input
                v-model.number="payoutForm.amountChf"
                type="number"
                min="1"
                :max="Math.floor((stats?.summary.current_balance_rappen ?? 0) / 100)"
                step="1"
                required
                class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
              <input
                v-model="payoutForm.iban"
                type="text"
                placeholder="CH00 0000 0000 0000 0000 0"
                required
                class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kontoinhaber</label>
              <input
                v-model="payoutForm.accountHolder"
                type="text"
                required
                class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <p v-if="payoutError" class="text-red-600 text-sm bg-red-50 rounded-lg p-3">{{ payoutError }}</p>
            <div class="flex gap-3">
              <button type="button" @click="showPayoutForm = false" class="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2.5 text-sm font-semibold">
                Abbrechen
              </button>
              <button type="submit" :disabled="payoutLoading" class="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
                {{ payoutLoading ? 'Wird gesendet…' : 'Antrag senden' }}
              </button>
            </div>
          </form>

          <!-- Credit confirmation -->
          <div v-else class="text-center py-4">
            <p class="text-gray-600 text-sm mb-4">Dein Guthaben bleibt als Fahrstunden-Guthaben gespeichert und kann direkt für Lektionen eingelöst werden.</p>
            <button @click="showPayoutForm = false" class="bg-gray-100 text-gray-700 rounded-lg px-5 py-2 text-sm font-semibold">
              Verstanden
            </button>
          </div>

          <!-- Past payout requests -->
          <div v-if="stats?.payout_requests?.length" class="mt-6 border-t border-gray-100 pt-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Vergangene Anträge</h3>
            <div v-for="req in stats.payout_requests" :key="req.id" class="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
              <span class="text-gray-600">{{ formatDate(req.created_at) }}</span>
              <span class="font-medium">{{ formatChf(req.amount_rappen) }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="{
                  'bg-yellow-100 text-yellow-700': req.status === 'pending',
                  'bg-green-100 text-green-700': req.status === 'paid',
                  'bg-red-100 text-red-700': req.status === 'rejected',
                  'bg-blue-100 text-blue-700': req.status === 'approved',
                }"
              >
                {{ { pending: 'Ausstehend', approved: 'Genehmigt', paid: 'Überwiesen', rejected: 'Abgelehnt' }[req.status] ?? req.status }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const authLoading = ref(true)
const isAuthenticated = ref(false)
const userName = ref('')
const initials = ref('')

const stats = ref<any>(null)
const affiliateCode = ref<string | null>(null)
const shareLink = ref('')
const copied = ref(false)
const generatingCode = ref(false)

const showPayoutForm = ref(false)
const payoutType = ref<'bank' | 'credit'>('bank')
const payoutForm = ref({ amountChf: 0, iban: '', accountHolder: '' })
const payoutLoading = ref(false)
const payoutError = ref('')

definePageMeta({ layout: false })

onMounted(async () => {
  // Handle magic-link token in query
  const token = route.query.token as string | undefined
  if (token) {
    try {
      const result = await $fetch<any>('/api/auth/verify-affiliate-token', {
        method: 'POST',
        body: { token },
      })
      if (result?.action_link) {
        // Redirect to the Supabase magic link action URL which creates a session
        window.location.href = result.action_link
        return
      }
    } catch {
      // Token invalid/expired – show unauthenticated state
    }
  }

  // Check current auth state
  const user = authStore.user
  if (user) {
    isAuthenticated.value = true
    const u = authStore.userProfile
    userName.value = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || user.email || 'Partner'
    initials.value = userName.value.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    await loadStats()
  }

  authLoading.value = false
})

async function loadStats() {
  try {
    const result = await $fetch<any>('/api/affiliate/stats')
    stats.value = result.data
    affiliateCode.value = result.data.affiliate_code?.code ?? null
    shareLink.value = result.data.share_link ?? ''
  } catch (err) {
    console.error('Failed to load affiliate stats', err)
  }
}

async function generateCode() {
  generatingCode.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/generate-code', {
      method: 'POST',
    })
    affiliateCode.value = result.data.code
    shareLink.value = result.data.link
  } catch (err: any) {
    console.error('Failed to generate code', err)
  } finally {
    generatingCode.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Clipboard not available
  }
}

async function submitPayout() {
  payoutError.value = ''
  payoutLoading.value = true
  try {
    await $fetch('/api/affiliate/request-payout', {
      method: 'POST',
      body: {
        type: 'bank',
        amount_rappen: payoutForm.value.amountChf * 100,
        iban: payoutForm.value.iban,
        account_holder: payoutForm.value.accountHolder,
      },
    })
    showPayoutForm.value = false
    await loadStats()
  } catch (err: any) {
    payoutError.value = err?.data?.message || 'Fehler beim Einreichen des Antrags.'
  } finally {
    payoutLoading.value = false
  }
}

function logout() {
  authStore.logout()
  navigateTo('/partner')
}

function formatChf(rappen: number) {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>
