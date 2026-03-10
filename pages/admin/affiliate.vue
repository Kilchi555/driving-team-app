<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">🤝 Affiliate-System</h1>
      <p class="text-gray-600">Reward-Betrag konfigurieren und Auszahlungsanträge verwalten</p>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow-sm border mb-6">
      <div class="flex border-b">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-6 py-3 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ── Tab: Einstellungen ───────────────────────────────────────── -->
    <div v-if="activeTab === 'settings'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6 max-w-lg">
        <h2 class="text-lg font-bold text-gray-900 mb-1">Reward-Betrag</h2>
        <p class="text-sm text-gray-500 mb-5">
          Dieser Betrag wird dem Affiliate-Partner gutgeschrieben, sobald ein geworbener Kunde
          seine <strong>erste Lektion absolviert</strong> hat.
        </p>
        <div class="flex items-center gap-3">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">CHF</span>
            <input
              v-model.number="rewardChf"
              type="number"
              min="0"
              step="1"
              class="w-full border border-gray-300 rounded-lg pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            @click="saveReward"
            :disabled="savingReward"
            class="bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {{ savingReward ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
        <p v-if="rewardSaved" class="text-green-600 text-sm mt-3">✓ Gespeichert</p>
        <p v-if="rewardError" class="text-red-600 text-sm mt-3">{{ rewardError }}</p>
      </div>

      <div class="bg-white rounded-lg shadow-sm border p-6 max-w-lg">
        <h2 class="text-lg font-bold text-gray-900 mb-1">System aktivieren / deaktivieren</h2>
        <p class="text-sm text-gray-500 mb-4">Wenn deaktiviert, können keine neuen Codes generiert werden.</p>
        <label class="flex items-center gap-3 cursor-pointer">
          <div
            @click="toggleEnabled"
            class="relative w-12 h-6 rounded-full transition-colors"
            :class="affiliateEnabled ? 'bg-blue-600' : 'bg-gray-300'"
          >
            <div
              class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              :class="affiliateEnabled ? 'translate-x-6' : 'translate-x-0.5'"
            ></div>
          </div>
          <span class="text-sm text-gray-700">{{ affiliateEnabled ? 'Aktiv' : 'Inaktiv' }}</span>
        </label>
      </div>
    </div>

    <!-- ── Tab: Auszahlungen ───────────────────────────────────────── -->
    <div v-if="activeTab === 'payouts'">
      <div v-if="loadingPayouts" class="text-center py-12 text-gray-400">Wird geladen…</div>
      <div v-else-if="!payoutRequests.length" class="text-center py-12 text-gray-400">
        Keine ausstehenden Auszahlungsanträge
      </div>
      <div v-else class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="text-left px-4 py-3 text-gray-600 font-medium">Partner</th>
              <th class="text-left px-4 py-3 text-gray-600 font-medium">Betrag</th>
              <th class="text-left px-4 py-3 text-gray-600 font-medium">IBAN</th>
              <th class="text-left px-4 py-3 text-gray-600 font-medium">Datum</th>
              <th class="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="req in payoutRequests" :key="req.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ req.user_name }}</div>
                <div class="text-gray-400 text-xs">{{ req.user_email }}</div>
              </td>
              <td class="px-4 py-3 font-medium">CHF {{ (req.amount_rappen / 100).toFixed(2) }}</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ req.iban }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(req.created_at) }}</td>
              <td class="px-4 py-3">
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :class="{
                    'bg-yellow-100 text-yellow-700': req.status === 'pending',
                    'bg-blue-100 text-blue-700': req.status === 'approved',
                    'bg-green-100 text-green-700': req.status === 'paid',
                    'bg-red-100 text-red-700': req.status === 'rejected',
                  }"
                >
                  {{ statusLabels[req.status] ?? req.status }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div v-if="req.status === 'pending'" class="flex gap-2">
                  <button @click="updatePayout(req.id, 'approved')" class="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1 hover:bg-blue-200">Genehmigen</button>
                  <button @click="updatePayout(req.id, 'rejected')" class="text-xs bg-red-100 text-red-700 rounded px-2 py-1 hover:bg-red-200">Ablehnen</button>
                </div>
                <div v-else-if="req.status === 'approved'">
                  <button @click="updatePayout(req.id, 'paid')" class="text-xs bg-green-100 text-green-700 rounded px-2 py-1 hover:bg-green-200">Als überwiesen markieren</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Tab: Übersicht ──────────────────────────────────────────── -->
    <div v-if="activeTab === 'overview'">
      <div v-if="loadingOverview" class="text-center py-12 text-gray-400">Wird geladen…</div>
      <div v-else>
        <!-- Summary stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-lg border p-4 text-center">
            <div class="text-2xl font-bold text-gray-900">{{ overview.total_codes }}</div>
            <div class="text-xs text-gray-500 mt-1">Aktive Codes</div>
          </div>
          <div class="bg-white rounded-lg border p-4 text-center">
            <div class="text-2xl font-bold text-gray-900">{{ overview.total_referrals }}</div>
            <div class="text-xs text-gray-500 mt-1">Empfehlungen Total</div>
          </div>
          <div class="bg-white rounded-lg border p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ overview.total_credited }}</div>
            <div class="text-xs text-gray-500 mt-1">Credited Referrals</div>
          </div>
          <div class="bg-white rounded-lg border p-4 text-center">
            <div class="text-2xl font-bold text-gray-900">CHF {{ (overview.total_credited_rappen / 100).toFixed(0) }}</div>
            <div class="text-xs text-gray-500 mt-1">Guthaben vergeben</div>
          </div>
        </div>

        <!-- Top affiliates -->
        <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div class="p-4 border-b">
            <h2 class="font-bold text-gray-900">Top-Partner</h2>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Code</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Empfehlungen</th>
                <th class="text-left px-4 py-3 text-gray-600 font-medium">Vergütet</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="code in overview.top_codes" :key="code.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">{{ code.user_name }}</td>
                <td class="px-4 py-3 font-mono text-xs">{{ code.code }}</td>
                <td class="px-4 py-3">{{ code.total_referrals }}</td>
                <td class="px-4 py-3">CHF {{ (code.total_credited_rappen / 100).toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'], layout: 'admin' })

const authStore = useAuthStore()
const token = computed(() => authStore.accessToken)

const tabs = [
  { id: 'settings', label: '⚙️ Einstellungen' },
  { id: 'payouts', label: '💸 Auszahlungen' },
  { id: 'overview', label: '📊 Übersicht' },
]
const activeTab = ref('settings')

const statusLabels: Record<string, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  paid: 'Überwiesen',
  rejected: 'Abgelehnt',
}

// ── Settings ─────────────────────────────────────────────────────────
const rewardChf = ref(50)
const savingReward = ref(false)
const rewardSaved = ref(false)
const rewardError = ref('')
const affiliateEnabled = ref(true)

async function loadSettings() {
  try {
    const result = await $fetch<any>('/api/affiliate/admin-settings', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    rewardChf.value = Math.round((result.data.reward_rappen ?? 5000) / 100)
    affiliateEnabled.value = result.data.enabled !== false
  } catch { /* use defaults */ }
}

async function saveReward() {
  savingReward.value = true
  rewardSaved.value = false
  rewardError.value = ''
  try {
    await $fetch('/api/affiliate/admin-settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token.value}` },
      body: { reward_rappen: rewardChf.value * 100, enabled: affiliateEnabled.value },
    })
    rewardSaved.value = true
    setTimeout(() => { rewardSaved.value = false }, 3000)
  } catch (err: any) {
    rewardError.value = err?.data?.message || 'Fehler beim Speichern.'
  } finally {
    savingReward.value = false
  }
}

async function toggleEnabled() {
  affiliateEnabled.value = !affiliateEnabled.value
  await saveReward()
}

// ── Payout requests ───────────────────────────────────────────────────
const payoutRequests = ref<any[]>([])
const loadingPayouts = ref(false)

async function loadPayouts() {
  loadingPayouts.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/admin-payouts', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    payoutRequests.value = result.data ?? []
  } finally {
    loadingPayouts.value = false
  }
}

async function updatePayout(id: string, status: string) {
  await $fetch(`/api/affiliate/admin-payouts/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token.value}` },
    body: { status },
  })
  await loadPayouts()
}

// ── Overview ─────────────────────────────────────────────────────────
const loadingOverview = ref(false)
const overview = ref({ total_codes: 0, total_referrals: 0, total_credited: 0, total_credited_rappen: 0, top_codes: [] as any[] })

async function loadOverview() {
  loadingOverview.value = true
  try {
    const result = await $fetch<any>('/api/affiliate/admin-overview', {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    overview.value = result.data
  } finally {
    loadingOverview.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'payouts' && !payoutRequests.value.length) loadPayouts()
  if (tab === 'overview') loadOverview()
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(() => {
  loadSettings()
  loadPayouts()
})
</script>
