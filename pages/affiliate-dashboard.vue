<template>
  <div class="min-h-screen" :style="{ backgroundColor: brandConfig.background_color || '#f9fafb' }">
    <!-- Auth loading -->
    <div v-if="authLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-gray-300 rounded-full animate-spin mx-auto mb-4" :style="{ borderTopColor: brandConfig.primary_color }"></div>
        <p :style="{ color: brandConfig.text_secondary_color }">Wird geladen…</p>
      </div>
    </div>

    <!-- Not authenticated -->
    <div v-else-if="!isAuthenticated" class="flex items-center justify-center min-h-screen p-4">
      <div class="rounded-2xl shadow-lg p-8 max-w-sm w-full text-center" :style="{ backgroundColor: brandConfig.surface_color }">
        <div class="text-4xl mb-4">{{ sessionExpired ? '⏰' : '🔒' }}</div>
        <h2 class="text-xl font-bold mb-2" :style="{ color: brandConfig.text_color }">
          {{ sessionExpired ? 'Sitzung abgelaufen' : 'Zugang erforderlich' }}
        </h2>
        <p v-if="tokenError" class="text-sm mb-4 p-3 rounded-lg bg-red-50 text-red-600">{{ tokenError }}</p>
        <p v-else class="text-sm mb-6" :style="{ color: brandConfig.text_secondary_color }">
          {{ sessionExpired ? 'Deine Sitzung ist abgelaufen. Bitte fordere einen neuen Zugangslink an.' : 'Bitte melde dich an oder fordere einen neuen Zugangslink an.' }}
        </p>
        <NuxtLink :to="tenantSlug ? `/partner/${tenantSlug}` : '/partner'" class="block rounded-lg px-5 py-2.5 font-semibold text-sm text-white transition hover:opacity-90" :style="{ backgroundColor: brandConfig.primary_color }">
          Neuen Link anfordern
        </NuxtLink>
      </div>
    </div>

    <!-- Dashboard -->
    <div v-else>
      <!-- Header with gradient -->
      <div class="relative overflow-hidden" :style="{ backgroundColor: brandConfig.primary_color }">
        <div class="absolute inset-0 opacity-10">
          <div class="absolute inset-0" :style="{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff, transparent)' }"></div>
        </div>
        
        <nav class="relative px-4 py-6">
          <div class="max-w-6xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Debug Info -->
              <div v-if="false" class="text-white text-xs">
                Logo URL: {{ brandConfig.logo_square_url ? 'EXISTS (' + brandConfig.logo_square_url.substring(0, 50) + '...)' : 'MISSING' }}
              </div>
              
              <!-- Logo Container -->
              <div v-if="brandConfig.logo_square_url" class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-md border border-white border-opacity-30 bg-white flex items-center justify-center">
                <img 
                  :src="brandConfig.logo_square_url"
                  :alt="brandConfig.name"
                  class="w-full h-full object-contain"
                  @error="() => { console.error('❌ Logo failed to load'); console.log('URL was:', brandConfig.logo_square_url); }"
                  @load="() => console.log('✅ Logo loaded successfully')"
                />
              </div>
              <div v-else class="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" :style="{ backgroundColor: `${brandConfig.primary_color}30` }">
                <span class="text-lg">🤝</span>
              </div>
              
              <div>
                <p class="text-white font-bold text-sm">{{ brandConfig.name || 'Affiliate Partner' }}</p>
                <p class="text-white text-opacity-80 text-xs">{{ userName }}</p>
              </div>
            </div>
            <button @click="goBack" class="text-white text-opacity-80 hover:text-opacity-100 text-sm font-medium transition flex items-center gap-1">
              ← Zurück
            </button>
          </div>
        </nav>
      </div>

      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <!-- Info Link -->
        <button @click="showInfoModal = true" class="w-full flex items-center gap-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-xl px-4 py-3 transition text-left shadow-sm">
          <span class="w-5 h-5 rounded-full border border-green-500 text-green-600 text-[10px] font-bold flex items-center justify-center shrink-0">i</span>
          <span>Wie funktioniert das Empfehlungs- programm? <span class="underline font-medium">Mehr erfahren →</span></span>
        </button>

        <!-- Hero Stats Section -->
        <div class="rounded-2xl shadow-lg p-5" :style="{ backgroundColor: brandConfig.surface_color }">
          <div class="grid grid-cols-2 gap-3 text-center mb-3">
            <div class="relative bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition" @click="openDetail('leads')">
              <span class="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[9px] font-bold flex items-center justify-center leading-none">i</span>
              <div class="text-xl font-bold text-gray-800">{{ stats?.leads?.filter((l: any) => l.status !== 'converted')?.length ?? 0 }}</div>
              <div class="text-xs text-gray-500 mt-0.5">Interessenten</div>
            </div>
            <div class="relative bg-blue-50 rounded-xl p-3 cursor-pointer hover:bg-blue-100 transition" @click="openDetail('pending')">
              <span class="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-blue-300 text-blue-400 text-[9px] font-bold flex items-center justify-center leading-none">i</span>
              <div class="text-xl font-bold text-blue-700">{{ stats?.referrals?.filter((r: any) => r.status === 'pending')?.length ?? 0 }}</div>
              <div class="text-xs text-gray-500 mt-0.5">Registrierungen</div>
            </div>
          </div>
          <div class="relative bg-green-50 rounded-xl p-3 text-center mb-3 cursor-pointer hover:bg-green-100 transition" @click="openDetail('credited')">
            <span class="absolute top-1.5 left-1.5 w-4 h-4 rounded-full border border-green-300 text-green-400 text-[9px] font-bold flex items-center justify-center leading-none">i</span>
            <div class="text-xl font-bold text-green-700">{{ stats?.referrals?.filter((r: any) => r.status === 'credited')?.length ?? 0 }}</div>
            <div class="text-xs text-gray-500 mt-0.5">1. Fahrstunde bezahlt</div>
          </div>
          <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-semibold text-green-800">Dein Guthaben</span>
            </div>
            <span class="text-lg font-bold text-green-700">CHF {{ ((stats?.summary?.current_balance_rappen ?? 0) / 100).toFixed(0) }}</span>
          </div>
        </div>
        <div class="rounded-2xl shadow-lg p-8" :style="{ backgroundColor: brandConfig.surface_color }">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">🔗</span>
            <h2 class="text-2xl font-bold" :style="{ color: brandConfig.text_color }">Dein Empfehlungslink</h2>
          </div>
          <p class="text-sm mb-6" :style="{ color: brandConfig.text_secondary_color }">Teile deinen persönlichen Link und verdiene automatisch für jede erfolgreiche Empfehlung.</p>

          <div v-if="!affiliateCode" class="text-center py-8">
            <button
              @click="generateCode"
              :disabled="generatingCode"
              class="rounded-xl px-8 py-3 font-semibold text-white transition hover:scale-105 active:scale-95 disabled:opacity-50 inline-block"
              :style="{ backgroundColor: brandConfig.primary_color }"
            >
              <span v-if="generatingCode">⏳ Wird erstellt…</span>
              <span v-else>🚀 Link aktivieren</span>
            </button>
          </div>

          <div v-else class="space-y-4">
            <div class="rounded-xl border-2 overflow-hidden" :style="{ borderColor: brandConfig.primary_color }">
              <div class="px-3 py-2.5" :style="{ backgroundColor: `${brandConfig.primary_color}08` }">
                <p class="text-xs font-mono truncate" :style="{ color: brandConfig.text_color }">{{ shareLink }}</p>
              </div>
              <button
                @click="copyLink"
                class="w-full text-sm font-bold py-2.5 transition hover:opacity-90 active:opacity-75 text-white"
                :style="{ backgroundColor: brandConfig.primary_color }"
              >
                {{ copied ? '✓ Kopiert' : '📋 Link kopieren' }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <a
                :href="`https://wa.me/?text=${encodeURIComponent(generateWhatsAppMessage())}`"
                target="_blank"
                class="text-center font-semibold py-3 rounded-xl text-white transition hover:scale-105 active:scale-95"
                style="background-color: #25D366"
              >
                📱 WhatsApp
              </a>
              <a
                :href="`mailto:?subject=Empfehlung%20von%20${encodeURIComponent(userName)}&body=${encodeURIComponent(generateEmailMessage())}`"
                class="text-center font-semibold py-3 rounded-xl transition hover:scale-105 active:scale-95"
                :style="{ color: brandConfig.primary_color, backgroundColor: `${brandConfig.primary_color}15` }"
              >
                ✉️ E-Mail
              </a>
            </div>
          </div>
        </div>

        <!-- Payout Section -->
        <div class="rounded-2xl shadow-lg p-8" :style="{ backgroundColor: brandConfig.surface_color }">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-2xl">💳</span>
            <h2 class="text-2xl font-bold" :style="{ color: brandConfig.text_color }">Auszahlung</h2>
          </div>
          <p class="text-sm mb-6" :style="{ color: brandConfig.text_secondary_color }">Dein verfügbares Guthaben: <span class="font-bold" :style="{ color: brandConfig.primary_color }">{{ formatChf(stats?.summary.current_balance_rappen ?? 0) }}</span></p>

          <div v-if="!showPayoutForm" class="grid grid-cols-2 gap-3">
            <button
              @click="() => { payoutType = 'bank'; showPayoutForm = true }"
              :disabled="(stats?.summary.current_balance_rappen ?? 0) < 100"
              class="rounded-xl py-3 text-sm font-semibold text-white transition hover:scale-105 active:scale-95 disabled:opacity-40"
              :style="{ backgroundColor: brandConfig.primary_color }"
            >
              🏦 Banküberweisung
            </button>
            <button
              @click="() => { payoutType = 'credit'; showPayoutForm = true }"
              class="rounded-xl py-3 text-sm font-semibold transition hover:scale-105 active:scale-95"
              :style="{ color: brandConfig.primary_color, backgroundColor: `${brandConfig.primary_color}15` }"
            >
              📚 Fahrstunden-Guthaben
            </button>
          </div>

          <!-- Step 2: SMS OTP confirmation -->
          <div v-else-if="payoutType === 'bank' && pendingPayoutId" class="space-y-4">
            <div class="text-center">
              <div class="text-3xl mb-3">📱</div>
              <h4 class="font-semibold mb-1" :style="{ color: brandConfig.text_color }">SMS-Bestätigung erforderlich</h4>
              <p class="text-sm" :style="{ color: brandConfig.text_secondary_color }">
                Wir haben dir einen 6-stelligen Code per SMS gesendet. Bitte gib ihn ein um die Auszahlung zu bestätigen.
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" :style="{ color: brandConfig.text_color }">Bestätigungscode</label>
              <input
                v-model="payoutOtp"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="000000"
                autofocus
                class="w-full rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 transition border"
                :style="{ borderColor: `${brandConfig.primary_color}50`, backgroundColor: `${brandConfig.primary_color}08`, color: brandConfig.text_color }"
              />
            </div>
            <p v-if="payoutError" class="text-sm p-4 rounded-lg" :style="{ backgroundColor: '#ef444415', color: '#ef4444' }">{{ payoutError }}</p>
            <div class="flex gap-3">
              <button type="button" @click="cancelPayout" class="flex-1 rounded-lg py-3 text-sm font-semibold transition hover:scale-105"
                :style="{ color: brandConfig.text_color, backgroundColor: `${brandConfig.primary_color}15` }">
                Abbrechen
              </button>
              <button type="button" :disabled="payoutLoading || payoutOtp.length !== 6" @click="confirmPayout"
                class="flex-1 rounded-lg py-3 text-sm font-semibold text-white transition hover:scale-105 disabled:opacity-50"
                :style="{ backgroundColor: brandConfig.primary_color }">
                {{ payoutLoading ? '⏳ Wird geprüft…' : '✓ Bestätigen' }}
              </button>
            </div>
          </div>

          <form v-else-if="payoutType === 'bank'" @submit.prevent="submitPayout" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" :style="{ color: brandConfig.text_color }">Betrag (CHF)</label>
              <input
                v-model.number="payoutForm.amountChf"
                type="number"
                min="1"
                :max="Math.floor((stats?.summary.current_balance_rappen ?? 0) / 100)"
                step="1"
                required
                class="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition border"
                :style="{ borderColor: `${brandConfig.primary_color}30`, backgroundColor: `${brandConfig.primary_color}08`, color: brandConfig.text_color }"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" :style="{ color: brandConfig.text_color }">IBAN</label>
              <input
                v-model="payoutForm.iban"
                type="text"
                placeholder="CH00 0000 0000 0000 0000 0"
                required
                class="w-full rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 transition border"
                :style="{ borderColor: `${brandConfig.primary_color}30`, backgroundColor: `${brandConfig.primary_color}08`, color: brandConfig.text_color }"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" :style="{ color: brandConfig.text_color }">Kontoinhaber</label>
              <input
                v-model="payoutForm.accountHolder"
                type="text"
                required
                class="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition border"
                :style="{ borderColor: `${brandConfig.primary_color}30`, backgroundColor: `${brandConfig.primary_color}08`, color: brandConfig.text_color }"
              />
            </div>
            <p v-if="payoutError" class="text-sm p-4 rounded-lg" :style="{ backgroundColor: '#ef444415', color: '#ef4444' }">{{ payoutError }}</p>
            <div class="flex gap-3">
              <button type="button" @click="showPayoutForm = false" class="flex-1 rounded-lg py-3 text-sm font-semibold transition hover:scale-105"
                :style="{ color: brandConfig.text_color, backgroundColor: `${brandConfig.primary_color}15` }">
                Abbrechen
              </button>
              <button type="submit" :disabled="payoutLoading" class="flex-1 rounded-lg py-3 text-sm font-semibold text-white transition hover:scale-105 disabled:opacity-50"
                :style="{ backgroundColor: brandConfig.primary_color }">
                {{ payoutLoading ? '⏳ Wird gesendet…' : '✓ Antrag senden' }}
              </button>
            </div>
          </form>

          <div v-else class="text-center py-6">
            <p class="text-sm mb-4" :style="{ color: brandConfig.text_secondary_color }">Dein Guthaben bleibt als Fahrstunden-Guthaben gespeichert und kann direkt für Lektionen eingelöst werden.</p>
            <button @click="showPayoutForm = false" class="rounded-lg px-6 py-2 text-sm font-semibold transition hover:scale-105"
              :style="{ color: brandConfig.primary_color, backgroundColor: `${brandConfig.primary_color}15` }">
              ✓ Verstanden
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <Teleport to="body">
    <div v-if="showDetailModal" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" @click.self="showDetailModal = false">
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[80vh] flex flex-col">
        <div class="border-b px-5 py-4 flex justify-between items-center shrink-0">
          <h3 class="font-semibold text-gray-900">{{ detailTitle }}</h3>
          <button @click="showDetailModal = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold">×</button>
        </div>
        <div class="overflow-y-auto p-4">
          <div v-if="filteredDetail.length === 0" class="text-sm text-gray-400 text-center py-6">Keine Einträge</div>
          <div class="space-y-2">
            <template v-if="detailFilter === 'leads'">
              <div v-for="lead in filteredDetail" :key="lead.id" class="bg-gray-50 rounded-lg px-3 py-2.5">
                <div class="text-xs text-gray-400">Angemeldet am {{ new Date(lead.created_at).toLocaleDateString('de-CH') }}</div>
                <div class="text-sm font-medium text-gray-800 mt-0.5">{{ lead.first_name }} {{ lead.last_name }}</div>
              </div>
            </template>
            <template v-else-if="detailFilter === 'credited'">
              <div v-for="tx in filteredDetail" :key="tx.id" class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div class="min-w-0">
                  <div class="text-sm font-medium text-gray-800 truncate">{{ tx.referred_user_name }}</div>
                  <div class="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <span>{{ new Date(tx.created_at).toLocaleDateString('de-CH') }}</span>
                    <span v-if="tx.category" class="inline-block bg-gray-200 text-gray-600 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none">{{ tx.category }}</span>
                  </div>
                </div>
                <span class="ml-3 shrink-0 text-sm font-bold text-green-700">+CHF {{ ((tx.amount_rappen || 0) / 100).toFixed(2) }}</span>
              </div>
              <div v-if="filteredDetail.length > 0" class="mt-3 pt-3 border-t flex justify-between items-center">
                <span class="text-sm font-semibold text-gray-600">Total verdient</span>
                <span class="text-sm font-bold text-green-700">CHF {{ (filteredDetail.reduce((sum: number, t: any) => sum + (t.amount_rappen ?? 0), 0) / 100).toFixed(2) }}</span>
              </div>
            </template>
            <template v-else>
              <div v-for="ref in filteredDetail" :key="ref.id" class="bg-gray-50 rounded-lg px-3 py-2.5">
                <div class="text-xs text-gray-400">Registriert am {{ new Date(ref.created_at).toLocaleDateString('de-CH') }}</div>
                <div class="text-sm font-medium text-gray-800 mt-0.5">{{ ref.users?.first_name }} {{ ref.users?.last_name }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Info Modal -->
  <Teleport to="body">
    <div v-if="showInfoModal" class="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center p-4" @click.self="showInfoModal = false">
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[85vh] flex flex-col">
        <div class="border-b px-5 py-4 flex justify-between items-center shrink-0">
          <h3 class="font-semibold text-gray-900">Wie funktioniert's?</h3>
          <button @click="showInfoModal = false" class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold">×</button>
        </div>
        <div class="overflow-y-auto p-5 space-y-5">
          <!-- Steps -->
          <div class="space-y-3">
            <div class="flex gap-3">
              <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">1</div>
              <div>
                <p class="text-sm font-semibold text-gray-800">Link aktivieren & teilen</p>
                <p class="text-xs text-gray-500 mt-0.5">Aktiviere zuerst deinen persönlichen Empfehlungslink und teile ihn dann mit Freunden, Familie oder Kollegen.</p>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">2</div>
              <div>
                <p class="text-sm font-semibold text-gray-800">Person registriert sich</p>
                <p class="text-xs text-gray-500 mt-0.5">Die Person meldet sich über deinen Link bei der Fahrschule an.</p>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">3</div>
              <div>
                <p class="text-sm font-semibold text-gray-800">Erste Fahrstunde bezahlt</p>
                <p class="text-xs text-gray-500 mt-0.5">Sobald diese Person die erste Fahrstunde bezahlt, wird dir automatisch eine Prämie gutgeschrieben.</p>
              </div>
            </div>
          </div>

          <!-- Important note -->
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
            <p class="text-sm font-bold text-amber-800">⚠️ Wichtig: Bitte zuerst teilen und dann anmelden!</p>
            <p class="text-xs text-amber-700 leading-relaxed">Schick deinen Link <span class="font-semibold">zuerst</span> – und bitte die Person, sich direkt darüber anzumelden. Danach können wir den Affiliate-Link leider nicht mehr aktivieren.</p>
          </div>

          <!-- Rewards -->
          <div>
            <p class="text-sm font-semibold text-gray-800 mb-2">Prämien pro Kategorie</p>
            <div v-if="affiliateRewards.length" class="space-y-1.5">
              <div
                v-for="r in affiliateRewards"
                :key="r.driving_category"
                class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <span class="text-sm font-medium text-gray-700">Kategorie {{ r.driving_category }}</span>
                <span class="text-sm font-bold text-green-700">CHF {{ (r.reward_rappen / 100).toFixed(0) }}</span>
              </div>
            </div>
          </div>

          <!-- Note -->
          <p class="text-xs text-gray-400 border-t pt-3">Das Guthaben wird deinem Konto gutgeschrieben und kann für Fahrstunden verwendet oder ausgezahlt werden.</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useFavicon } from '~/composables/useFavicon'
import { getSupabase } from '~/utils/supabase'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const supabase = getSupabase()
const { setFavicon } = useFavicon()

const tenantSlug = computed(() => route.query.tenant as string | undefined)

const authLoading = ref(true)
const isAuthenticated = ref(false)
const tokenError = ref('')
const accessToken = ref<string | null>(null)
const sessionExpired = ref(false)

// Always fetch the current (possibly refreshed) token from Supabase — never use a stale cache
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    accessToken.value = session.access_token
    return { Authorization: `Bearer ${session.access_token}` }
  }
  // Fallback: try to refresh manually
  const { data: refreshData } = await supabase.auth.refreshSession()
  if (refreshData?.session?.access_token) {
    accessToken.value = refreshData.session.access_token
    return { Authorization: `Bearer ${refreshData.session.access_token}` }
  }
  return {}
}

// Keep access token in sync with Supabase's automatic refresh cycle
let authStateUnsubscribe: (() => void) | null = null
function setupAuthListener() {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && session?.access_token) {
      accessToken.value = session.access_token
    } else if (event === 'SIGNED_OUT') {
      if (isAuthenticated.value) {
        isAuthenticated.value = false
        sessionExpired.value = true
      }
    }
  })
  authStateUnsubscribe = () => subscription.unsubscribe()
}

onUnmounted(() => {
  authStateUnsubscribe?.()
})
const userName = ref('')
const logoLoadError = ref(false)

const stats = ref<any>(null)
const affiliateCode = ref<string | null>(null)
const shareLink = ref('')
const copied = ref(false)
const generatingCode = ref(false)

// Detail modal
const showDetailModal = ref(false)
const detailFilter = ref<'leads' | 'pending' | 'credited'>('leads')

// Info modal
const showInfoModal = ref(false)

const affiliateRewards = computed(() => (stats.value?.category_rewards ?? []))

const detailTitle = computed(() => ({
  leads: 'Interessenten',
  pending: 'Registrierungen',
  credited: '1. Fahrstunde bezahlt',
}[detailFilter.value]))

const filteredDetail = computed(() => {
  if (detailFilter.value === 'leads') {
    return (stats.value?.leads ?? []).filter((l: any) => l.status !== 'converted')
  }
  if (detailFilter.value === 'credited') {
    return stats.value?.reward_transactions ?? []
  }
  const referrals: any[] = stats.value?.referrals ?? []
  return referrals.filter((r: any) => r.status === detailFilter.value)
})

function openDetail(filter: 'leads' | 'pending' | 'credited') {
  detailFilter.value = filter
  showDetailModal.value = true
}

const showPayoutForm = ref(false)
const payoutType = ref<'bank' | 'credit'>('bank')
const payoutForm = ref({ amountChf: 0, iban: '', accountHolder: '' })
const payoutLoading = ref(false)
const payoutError = ref('')
const pendingPayoutId = ref<string | null>(null)
const payoutOtp = ref('')

const brandConfig = ref<any>({
  name: 'Driving Team',
  primary_color: '#1f2937',
  secondary_color: '#6366f1',
  success_color: '#10b981',
  error_color: '#ef4444',
  background_color: '#f9fafb',
  surface_color: '#ffffff',
  text_color: '#111827',
  text_secondary_color: '#6b7280',
  logo_square_url: '',
})

definePageMeta({ 
  layout: false,
  middleware: 'validate-tenant'
})

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (token) {
    try {
      const result = await $fetch<any>('/api/auth/verify-affiliate-token', {
        method: 'POST',
        body: { token },
      })

      if (result?.email && result?.tempPassword) {
        // Sign in with the one-time temp password — guarantees a full session with refresh_token
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.tempPassword,
        })

        if (!signInError && signInData?.session?.user) {
          const supaUser = signInData.session.user
          accessToken.value = signInData.session.access_token ?? null
          authStore.user = supaUser as any
          await authStore.fetchUserProfile(supaUser.id)
          isAuthenticated.value = true
          sessionExpired.value = false
          setupAuthListener()
          userName.value = `${authStore.userProfile?.first_name ?? ''} ${authStore.userProfile?.last_name ?? ''}`.trim() || supaUser.email || 'Partner'
          await router.replace({ path: '/affiliate-dashboard', query: tenantSlug.value ? { tenant: tenantSlug.value } : {} })
          await loadBranding()
          await loadStats()
        } else {
          tokenError.value = signInError?.message || 'Session konnte nicht erstellt werden.'
        }
      }
    } catch (err: any) {
      tokenError.value = err?.data?.message || err?.message || 'Link ungültig oder abgelaufen.'
    }
    authLoading.value = false
    return
  }

  // No token — check existing session (cookie-based store or Supabase localStorage)
  let user = authStore.user
  if (!user) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user = session.user as any
      authStore.user = session.user as any
      accessToken.value = session.access_token ?? null
      if (!authStore.userProfile) {
        await authStore.fetchUserProfile(session.user.id)
      }
    }
  }

  if (user) {
    isAuthenticated.value = true
    sessionExpired.value = false
    setupAuthListener()
    userName.value = `${authStore.userProfile?.first_name ?? ''} ${authStore.userProfile?.last_name ?? ''}`.trim() || (user as any).email || 'Partner'
    await loadBranding()
    await loadStats()
  }

  authLoading.value = false
})

async function loadBranding() {
  try {
    const branding = await $fetch<any>('/api/tenants/branding', { query: { slug: 'driving-team' } })
    if (branding?.data) {
      brandConfig.value = {
        name: branding.data.brand_name || branding.data.name,
        primary_color: branding.data.primary_color || '#1f2937',
        secondary_color: branding.data.secondary_color || '#6366f1',
        success_color: branding.data.success_color || '#10b981',
        error_color: branding.data.error_color || '#ef4444',
        background_color: branding.data.background_color || '#f9fafb',
        surface_color: branding.data.surface_color || '#ffffff',
        text_color: branding.data.text_color || '#111827',
        text_secondary_color: branding.data.text_secondary_color || '#6b7280',
        logo_url: branding.data.logo_url || '',
        logo_square_url: branding.data.logo_square_url || '',
        logo_wide_url: branding.data.logo_wide_url || '',
      }
      setFavicon(branding.data.logo_square_url, '🤝')
    }
  } catch (e) {
    console.warn('Failed to load tenant branding', e)
  }
}

async function loadStats() {
  try {
    const headers = await getAuthHeaders()
    const result = await $fetch<any>('/api/affiliate/stats', { headers })
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
    const headers = await getAuthHeaders()
    const result = await $fetch<any>('/api/affiliate/generate-code', {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders()
    const result = await $fetch<any>('/api/affiliate/request-payout', {
      method: 'POST',
      headers,
      body: {
        type: 'bank',
        amount_rappen: payoutForm.value.amountChf * 100,
        iban: payoutForm.value.iban,
        account_holder: payoutForm.value.accountHolder,
      },
    })
    if (result?.requiresSmsConfirmation) {
      pendingPayoutId.value = result.data.payout_request_id
      payoutOtp.value = ''
    } else {
      showPayoutForm.value = false
      await loadStats()
    }
  } catch (err: any) {
    payoutError.value = err?.data?.message || 'Fehler beim Einreichen des Antrags.'
  } finally {
    payoutLoading.value = false
  }
}

async function confirmPayout() {
  payoutError.value = ''
  payoutLoading.value = true
  try {
    const headers = await getAuthHeaders()
    await $fetch('/api/affiliate/confirm-payout', {
      method: 'POST',
      headers,
      body: {
        payoutRequestId: pendingPayoutId.value,
        otp: payoutOtp.value,
      },
    })
    pendingPayoutId.value = null
    payoutOtp.value = ''
    showPayoutForm.value = false
    await loadStats()
  } catch (err: any) {
    payoutError.value = err?.data?.message || 'Ungültiger Code. Bitte versuche es erneut.'
  } finally {
    payoutLoading.value = false
  }
}

function cancelPayout() {
  pendingPayoutId.value = null
  payoutOtp.value = ''
  payoutError.value = ''
  showPayoutForm.value = false
}

function generateWhatsAppMessage() {
  const firstName = userName.value.split(' ')[0] || 'Ich'
  return `Hallo, hier ist der Link zur Fahrschule ${brandConfig.value.name || 'Driving Team'}, die ich dir sehr empfehlen kann.

${shareLink.value}

Beste Grüsse
${firstName}`
}

function generateEmailMessage() {
  const firstName = userName.value.split(' ')[0] || 'Ich'
  return `Hallo, hier ist der Link zur Fahrschule ${brandConfig.value.name || 'Driving Team'}, die ich dir sehr empfehlen kann.

${shareLink.value}

Beste Grüsse
${firstName}`
}

function goBack() {
  router.back()
}

function formatChf(rappen: number) {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<style scoped>
input:focus {
  outline: none;
}

button:disabled {
  cursor: not-allowed;
}
</style>
