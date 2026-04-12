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
    <div v-else-if="!isAuthenticated" class="flex items-center justify-center min-h-screen p-4" :style="{ backgroundColor: brandConfig.background_color || '#f9fafb' }">
      <div class="rounded-2xl shadow-lg p-8 max-w-sm w-full text-center" :style="{ backgroundColor: brandConfig.surface_color }">
        <!-- Logo -->
        <div class="mb-6 flex justify-center">
          <div v-if="brandConfig.logo_square_url" class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-md border border-gray-200 bg-white flex items-center justify-center">
            <img 
              :src="brandConfig.logo_square_url"
              :alt="brandConfig.name"
              class="w-full h-full object-contain"
              @error="() => { logoLoadError = true }"
            />
          </div>
          <div v-else class="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ backgroundColor: `${brandConfig.primary_color}20` }">
            <span class="text-3xl">🤝</span>
          </div>
        </div>
        
        <!-- Tenant name -->
        <p v-if="brandConfig.name" class="text-sm font-semibold mb-3" :style="{ color: brandConfig.text_secondary_color }">
          {{ brandConfig.name }}
        </p>
        
        <!-- Icon & Title -->
        <div class="text-4xl mb-3">{{ sessionExpired ? '⏰' : '🔒' }}</div>
        <h2 class="text-xl font-bold mb-2" :style="{ color: brandConfig.text_color }">
          {{ sessionExpired ? 'Sitzung abgelaufen' : 'Zugang erforderlich' }}
        </h2>
        
        <!-- Error or message -->
        <p v-if="tokenError" class="text-sm mb-4 p-3 rounded-lg bg-red-50 text-red-600">{{ tokenError }}</p>
        <p v-else class="text-sm mb-6" :style="{ color: brandConfig.text_secondary_color }">
          {{ sessionExpired ? 'Deine Sitzung ist abgelaufen. Bitte fordere einen neuen Zugangslink an.' : 'Bitte melde dich an oder fordere einen neuen Zugangslink an.' }}
        </p>
        
        <!-- Button -->
        <NuxtLink :to="partnerPortalSlug ? `/partner/${partnerPortalSlug}` : '/partner'" class="block rounded-lg px-5 py-2.5 font-semibold text-sm text-white transition hover:opacity-90" :style="{ backgroundColor: brandConfig.primary_color }">
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

        <!-- Hero Stats Section (isolate + hoher z-index: nichts darf Klicks zum Guthaben-Button abfangen) -->
        <div class="relative z-20 isolate pointer-events-auto rounded-2xl shadow-lg p-5" :style="{ backgroundColor: brandConfig.surface_color }">
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
          <div class="relative z-0 overflow-hidden rounded-xl bg-green-50 p-3 text-center transition-colors hover:bg-green-100/90 cursor-pointer" role="button" tabindex="0" @click="openDetail('credited')" @keydown.enter.prevent="openDetail('credited')" @keydown.space.prevent="openDetail('credited')">
            <span class="pointer-events-none absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-green-300 text-[9px] font-bold leading-none text-green-400">i</span>
            <div class="pointer-events-none text-xl font-bold text-green-700">{{ stats?.referrals?.filter((r: any) => r.status === 'credited')?.length ?? 0 }}</div>
            <div class="pointer-events-none mt-0.5 text-xs text-gray-500">1. Fahrstunde bezahlt</div>
          </div>

          <button
            type="button"
            class="group mt-4 w-full flex items-center justify-between gap-3 rounded-xl px-5 py-4 text-left transition-all duration-300 relative overflow-hidden"
            :style="{
              backgroundColor: brandConfig.primary_color,
              border: `2px solid ${brandConfig.primary_color}`
            }"
            title="Guthaben anzeigen"
            @click="openWalletTransactionHistory"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div class="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300" :style="{ backgroundColor: `${brandConfig.primary_color}40`, color: brandConfig.primary_color }">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="relative z-10 min-w-0 flex-1">
              <span class="block text-sm font-semibold text-white transition-colors duration-300">Dein Guthaben</span>
              <span class="text-xs text-white/70">Tippen für Verlauf</span>
            </div>
            <span class="relative z-10 flex-shrink-0 text-xl font-bold text-white tabular-nums transition-transform duration-300 group-hover:scale-110">
              CHF {{ ((stats?.summary?.current_balance_rappen ?? 0) / 100).toFixed(0) }}
            </span>
            <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
              <svg class="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
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

        <!-- Auszahlung & Guthaben (gleicher Flow wie Kunden-Zahlungen) -->
        <div class="rounded-2xl shadow-lg overflow-hidden" :style="{ backgroundColor: brandConfig.surface_color }">
          <div class="px-5 pt-6 pb-2">
            <div class="flex items-center gap-3 mb-1">
              <span class="text-2xl">💳</span>
              <h2 class="text-xl font-bold" :style="{ color: brandConfig.text_color }">Auszahlung & Guthaben</h2>
            </div>
            <p class="text-sm pb-4" :style="{ color: brandConfig.text_secondary_color }">
              Verfügbares Guthaben in der Übersicht oben; hier dieselben Aktionen wie unter «Zahlungen»: auszahlen, aufladen, Gutschein einlösen, Verlauf.
            </p>
          </div>
          <div class="px-4 pb-6">
            <CustomerCreditWalletPanel
              always-show-actions
              :get-headers="getAuthHeaders"
              @balance-updated="loadStats"
            />
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

  <!-- Guthaben-Verlauf (Hero) — eigenes Modal auf Seitenebene, unabhängig vom Wallet-Panel unten -->
  <Teleport to="body">
    <div
      v-if="showAffiliateCreditHistory"
      class="fixed inset-0 z-[450] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="affiliate-credit-history-title"
    >
      <div class="absolute inset-0 bg-black/50" @click="showAffiliateCreditHistory = false" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
        <button
          type="button"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Schließen"
          @click="showAffiliateCreditHistory = false"
        >
          <span class="text-2xl leading-none font-bold">×</span>
        </button>
        <h2 id="affiliate-credit-history-title" class="text-lg font-bold text-gray-900 mb-1">Guthaben-Verlauf</h2>
        <p class="text-sm text-gray-500 mb-4">Alle Transaktionen deines Guthabens</p>
        <div class="overflow-y-auto flex-1 min-h-0">
          <div v-if="affiliateCreditTxLoading" class="flex justify-center py-8">
            <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div v-else-if="affiliateCreditTx.length === 0" class="text-center py-8 text-gray-400 text-sm">
            Noch keine Transaktionen vorhanden.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="tx in affiliateCreditTx"
              :key="tx.id"
              class="flex items-start justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-2 h-2 rounded-full shrink-0"
                    :class="tx.amount_rappen >= 0 ? 'bg-green-500' : 'bg-red-400'"
                  />
                  <span class="text-sm font-medium text-gray-800">{{ affiliateCreditTxLabel(tx) }}</span>
                </div>
                <div v-if="tx.notes" class="text-xs text-gray-400 mt-0.5 ml-4">{{ tx.notes }}</div>
                <div class="text-xs text-gray-400 mt-0.5 ml-4">{{ formatAffiliateCreditTxDate(tx.created_at) }}</div>
              </div>
              <div class="text-right ml-4 shrink-0">
                <span class="text-sm font-semibold" :class="tx.amount_rappen >= 0 ? 'text-green-600' : 'text-red-500'">
                  {{ tx.amount_rappen >= 0 ? '+' : '' }}CHF {{ (Math.abs(tx.amount_rappen) / 100).toFixed(2) }}
                </span>
                <div class="text-xs text-gray-400">Saldo: CHF {{ (tx.balance_after_rappen / 100).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import CustomerCreditWalletPanel from '~/components/customer/CustomerCreditWalletPanel.vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useFavicon } from '~/composables/useFavicon'
import { getSupabase } from '~/utils/supabase'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const supabase = getSupabase()
const { setFavicon } = useFavicon()

/** Partner-Seite für «Neuen Link» — Query, dann zuletzt bekannte Session/Tenant (localStorage). */
const AFFILIATE_PARTNER_SLUG_KEY = 'affiliate_dashboard_partner_slug'

function readStoredPartnerSlug(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const own = localStorage.getItem(AFFILIATE_PARTNER_SLUG_KEY)?.trim()
    if (own) return own
    return localStorage.getItem('last_tenant_slug')?.trim() || undefined
  } catch {
    return undefined
  }
}

function writeStoredPartnerSlug(slug: string) {
  if (typeof window === 'undefined' || !slug?.trim()) return
  const s = slug.trim()
  try {
    localStorage.setItem(AFFILIATE_PARTNER_SLUG_KEY, s)
    localStorage.setItem('last_tenant_slug', s)
    persistedPartnerSlug.value = s
  } catch {
    /* ignore */
  }
}

const persistedPartnerSlug = ref<string | undefined>(readStoredPartnerSlug())

function queryTenantRaw(): string | undefined {
  const q = route.query.tenant
  if (typeof q === 'string' && q.trim()) return q.trim()
  if (Array.isArray(q) && q[0] && String(q[0]).trim()) return String(q[0]).trim()
  return undefined
}

const partnerPortalSlug = computed(
  () => queryTenantRaw() || persistedPartnerSlug.value || readStoredPartnerSlug()
)

watch(
  () => route.query.tenant,
  () => {
    const t = queryTenantRaw()
    if (t) writeStoredPartnerSlug(t)
  },
  { immediate: true }
)

async function persistAffiliatePartnerSlugFromProfile() {
  const fromQuery = queryTenantRaw()
  if (fromQuery) {
    writeStoredPartnerSlug(fromQuery)
    return
  }
  const tid = authStore.userProfile?.tenant_id
  if (!tid) return
  try {
    const res = (await $fetch(`/api/tenants/get-slug?id=${tid}`)) as any
    const slug = res?.data?.slug ?? res?.slug
    if (slug && typeof slug === 'string') writeStoredPartnerSlug(slug)
  } catch {
    /* noop */
  }
}

function tryPersistSlugFromShareUrl(url: string | undefined | null) {
  if (!url) return
  if (queryTenantRaw() || persistedPartnerSlug.value) return
  const m = String(url).match(/\/ref\/([^/?#]+)/)
  if (m?.[1]) writeStoredPartnerSlug(m[1])
}

const showAffiliateCreditHistory = ref(false)
const affiliateCreditTx = ref<any[]>([])
const affiliateCreditTxLoading = ref(false)

function affiliateCreditTxLabel(tx: any): string {
  const typeMap: Record<string, string> = {
    deposit: 'Bareinzahlung',
    refund: 'Rückerstattung',
    topup: 'Guthaben aufgeladen',
    credit_topup: 'Guthaben aufgeladen',
    voucher: 'Gutschein eingelöst',
    manual: 'Manuelle Buchung',
    cash_deposit: 'Bar-Einzahlung',
    cancellation: 'Stornierung',
    cancellation_credit_refund: 'Stornierung (Rückerstattung)',
    duration_reduction_credit: 'Fahrstunde verkürzt (Rückerstattung)',
    payment: 'Fahrstunde bezahlt',
    appointment: 'Fahrstunde bezahlt',
    appointment_payment: 'Fahrstunde bezahlt',
    withdrawal: 'Auszahlung',
    withdrawal_pending: 'Auszahlung (ausstehend)',
    withdrawal_completed: 'Auszahlung abgeschlossen',
  }
  return typeMap[tx.transaction_type] || tx.transaction_type || 'Transaktion'
}

function formatAffiliateCreditTxDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function openWalletTransactionHistory() {
  console.log('🔵 openWalletTransactionHistory called')
  showAffiliateCreditHistory.value = true
  affiliateCreditTxLoading.value = true
  affiliateCreditTx.value = []
  try {
    const headers = await getAuthHeaders()
    console.log('📍 Fetching credit transactions with headers:', Object.keys(headers))
    const data = await $fetch<any[]>('/api/customer/get-credit-transactions', { method: 'GET', headers })
    console.log('✅ Credit transactions loaded:', data?.length)
    affiliateCreditTx.value = data || []
  } catch (e: any) {
    console.error('❌ Error loading credit transactions:', e)
    affiliateCreditTx.value = []
  } finally {
    affiliateCreditTxLoading.value = false
  }
}

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
          await persistAffiliatePartnerSlugFromProfile()
          isAuthenticated.value = true
          sessionExpired.value = false
          setupAuthListener()
          userName.value = `${authStore.userProfile?.first_name ?? ''} ${authStore.userProfile?.last_name ?? ''}`.trim() || supaUser.email || 'Partner'
          const slug = partnerPortalSlug.value
          await router.replace({ path: '/affiliate-dashboard', query: slug ? { tenant: slug } : {} })
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
      await persistAffiliatePartnerSlugFromProfile()
    }
  }

  if (user) {
    isAuthenticated.value = true
    sessionExpired.value = false
    setupAuthListener()
    userName.value = `${authStore.userProfile?.first_name ?? ''} ${authStore.userProfile?.last_name ?? ''}`.trim() || (user as any).email || 'Partner'
    await persistAffiliatePartnerSlugFromProfile()
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
    tryPersistSlugFromShareUrl(shareLink.value)
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
    tryPersistSlugFromShareUrl(shareLink.value)
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
</script>

<style scoped>
input:focus {
  outline: none;
}

button:disabled {
  cursor: not-allowed;
}
</style>
