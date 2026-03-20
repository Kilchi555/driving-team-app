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
        <div class="text-4xl mb-4">🔒</div>
        <h2 class="text-xl font-bold mb-2" :style="{ color: brandConfig.text_color }">Zugang erforderlich</h2>
        <p class="text-sm mb-6" :style="{ color: brandConfig.text_secondary_color }">Bitte melde dich an oder fordere einen neuen Zugangslink an.</p>
        <NuxtLink to="/partner" class="block rounded-lg px-5 py-2.5 font-semibold text-sm text-white transition hover:opacity-90" :style="{ backgroundColor: brandConfig.primary_color }">
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

      <div class="max-w-6xl mx-auto px-4 py-12 space-y-8">

        <!-- Hero Stats Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="group rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden" :style="{ backgroundColor: brandConfig.surface_color }">
            <div class="h-1" :style="{ backgroundColor: brandConfig.primary_color }"></div>
            <div class="p-6">
              <p class="text-sm font-medium mb-2" :style="{ color: brandConfig.text_secondary_color }"><span>📊</span> Empfehlungen</p>
              <div class="text-4xl font-bold mb-1" :style="{ color: brandConfig.text_color }">{{ stats?.summary.total_referrals ?? 0 }}</div>
              <p class="text-xs" :style="{ color: brandConfig.text_secondary_color }">Neue Kunden</p>
            </div>
          </div>

          <div class="group rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden" :style="{ backgroundColor: brandConfig.surface_color }">
            <div class="h-1" :style="{ backgroundColor: brandConfig.secondary_color }"></div>
            <div class="p-6">
              <p class="text-sm font-medium mb-2" :style="{ color: brandConfig.text_secondary_color }"><span>💰</span> Verdient</p>
              <div class="text-4xl font-bold mb-1" :style="{ color: brandConfig.text_color }">{{ formatChf(stats?.summary.total_credited_rappen ?? 0) }}</div>
              <p class="text-xs" :style="{ color: brandConfig.text_secondary_color }">Insgesamt</p>
            </div>
          </div>

          <div class="group rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden" :style="{ backgroundColor: brandConfig.surface_color }">
            <div class="h-1" :style="{ backgroundColor: brandConfig.success_color }"></div>
            <div class="p-6">
              <p class="text-sm font-medium mb-2" :style="{ color: brandConfig.text_secondary_color }"><span>✨</span> Guthaben</p>
              <div class="text-4xl font-bold mb-1" :style="{ color: brandConfig.text_color }">{{ formatChf(stats?.summary.current_balance_rappen ?? 0) }}</div>
              <p class="text-xs" :style="{ color: brandConfig.text_secondary_color }">Verfügbar</p>
            </div>
          </div>
        </div>

        <!-- Share Link Section -->
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
            <div class="flex items-center gap-2 rounded-xl border-2 p-4" :style="{ borderColor: brandConfig.primary_color, backgroundColor: `${brandConfig.primary_color}08` }">
              <input type="text" :value="shareLink" readonly class="flex-1 bg-transparent text-sm font-mono focus:outline-none" :style="{ color: brandConfig.text_color }">
              <button
                @click="copyLink"
                class="shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition hover:scale-105"
                :style="{ color: brandConfig.primary_color, backgroundColor: `${brandConfig.primary_color}15` }"
              >
                {{ copied ? '✓ Kopiert' : '📋 Kopieren' }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <a
                :href="`https://wa.me/?text=Ich%20empfehle%20${encodeURIComponent(brandConfig.name || 'Driving Team')}%20%E2%80%93%20hier%20der%20Link%3A%20${encodeURIComponent(shareLink)}`"
                target="_blank"
                class="text-center font-semibold py-3 rounded-xl text-white transition hover:scale-105 active:scale-95"
                style="background-color: #25D366"
              >
                📱 WhatsApp
              </a>
              <a
                :href="`mailto:?subject=Empfehlung%20von%20${encodeURIComponent(brandConfig.name || 'Driving Team')}&body=Schau%20mal%3A%20${encodeURIComponent(shareLink)}`"
                class="text-center font-semibold py-3 rounded-xl transition hover:scale-105 active:scale-95"
                :style="{ color: brandConfig.primary_color, backgroundColor: `${brandConfig.primary_color}15` }"
              >
                ✉️ E-Mail
              </a>
            </div>
          </div>
        </div>

        <!-- Referrals Section -->
        <div class="rounded-2xl shadow-lg p-8" :style="{ backgroundColor: brandConfig.surface_color }">
          <div class="flex items-center gap-3 mb-6">
            <span class="text-2xl">👥</span>
            <h2 class="text-2xl font-bold" :style="{ color: brandConfig.text_color }">Deine Empfehlungen</h2>
          </div>

          <div v-if="!stats?.referrals?.length" class="text-center py-12">
            <p class="text-lg" :style="{ color: brandConfig.text_secondary_color }">🎯 Noch keine Empfehlungen</p>
            <p class="text-sm mt-2" :style="{ color: brandConfig.text_secondary_color }">Teile deinen Link oben und starten Sie zu verdienen!</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="ref in stats.referrals.slice(0, 10)"
              :key="ref.id"
              class="flex items-center justify-between p-4 rounded-xl transition"
              :style="{ backgroundColor: `${brandConfig.primary_color}08` }"
            >
              <div class="flex-1">
                <p class="font-medium" :style="{ color: brandConfig.text_color }">{{ ref.users?.first_name }} {{ ref.users?.last_name }}</p>
                <p class="text-xs mt-1" :style="{ color: brandConfig.text_secondary_color }">{{ formatDate(ref.created_at) }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span
                  class="text-xs px-3 py-1 rounded-full font-bold"
                  :class="ref.status === 'credited' ? 'bg-green-100' : 'bg-gray-100'"
                  :style="{ color: ref.status === 'credited' ? '#10b981' : brandConfig.text_secondary_color }"
                >
                  {{ ref.status === 'credited' ? '✓ Gutgeschrieben' : '⏳ Ausstehend' }}
                </span>
                <span v-if="ref.reward_rappen > 0" class="font-bold text-lg" :style="{ color: brandConfig.primary_color }">
                  {{ formatChf(ref.reward_rappen) }}
                </span>
              </div>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useFavicon } from '~/composables/useFavicon'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { setFavicon } = useFavicon()

const authLoading = ref(true)
const isAuthenticated = ref(false)
const userName = ref('')
const logoLoadError = ref(false)

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
      if (result?.action_link) {
        window.location.href = result.action_link
        return
      }
    } catch {
      // Token invalid/expired
    }
  }

  const user = authStore.user
  if (user) {
    isAuthenticated.value = true
    const u = authStore.userProfile
    userName.value = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || user.email || 'Partner'
    
    // Load tenant branding
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
        // Set favicon from tenant logo
        setFavicon(branding.data.logo_square_url, '🤝')
        console.log('🎨 Branding loaded with logos:', {
          logo_square_url: branding.data.logo_square_url ? 'Yes' : 'No',
          logo_url: branding.data.logo_url ? 'Yes' : 'No'
        })
        console.log('📝 brandConfig.value set to:', {
          logo_square_url_exists: !!brandConfig.value.logo_square_url
        })
      }
    } catch (e) {
      console.warn('Failed to load tenant branding', e)
    }
    
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
