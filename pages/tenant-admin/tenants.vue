<template>
  <div>
    <!-- Page header -->
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Tenant Management</h1>
        <p class="sa-page-sub">{{ tenants.length }} Tenants registriert</p>
      </div>
      <button @click="showCreateModal = true" class="sa-btn-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Neuer Tenant
      </button>
    </div>

    <!-- Table card -->
    <div class="sa-card">
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Benutzer</th>
              <th>Online-Zahlung</th>
              <th>Trial Ende</th>
              <th>Erstellt</th>
              <th class="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tenant in tenants" :key="tenant.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="sa-tenant-avatar">{{ getInitials(tenant.name) }}</div>
                  <div>
                    <div class="sa-tenant-name">{{ tenant.name }}</div>
                    <div class="sa-tenant-slug">{{ tenant.slug }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span :class="['sa-badge', tenant.is_active ? 'sa-badge-green' : 'sa-badge-red']">
                    {{ tenant.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  <span v-if="tenant.is_trial" class="sa-badge sa-badge-amber">Trial</span>
                </div>
              </td>
              <td class="sa-cell-muted">{{ tenant.subscription_plan || '—' }}</td>
              <td class="sa-cell-muted">{{ tenant.user_count || 0 }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <span :class="['sa-badge',
                    tenant.wallee_onboarding_status === 'active'  ? 'sa-badge-green' :
                    tenant.wallee_onboarding_status === 'pending' ? 'sa-badge-amber' : 'sa-badge-neutral']">
                    {{ tenant.wallee_onboarding_status === 'active' ? 'Aktiv' :
                       tenant.wallee_onboarding_status === 'pending' ? 'Ausstehend' : '—' }}
                  </span>
                  <button
                    v-if="tenant.wallee_onboarding_status === 'pending' || tenant.wallee_onboarding_status === 'active'"
                    @click="openWalleeActivation(tenant)"
                    class="sa-action-btn">
                    {{ tenant.wallee_onboarding_status === 'active' ? 'Verwalten' : 'Aktivieren' }}
                  </button>
                  <button v-else @click="openWalleeActivation(tenant)" class="sa-action-btn">Setup</button>
                </div>
              </td>
              <td class="sa-cell-muted">
                <span v-if="tenant.trial_ends_at" :class="isTrialExpiring(tenant.trial_ends_at) ? 'text-amber-400' : ''">
                  {{ formatDate(tenant.trial_ends_at) }}
                </span>
                <span v-else>—</span>
              </td>
              <td class="sa-cell-muted">{{ formatDate(tenant.created_at) }}</td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="editTenant(tenant)" class="sa-action-btn">Bearbeiten</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="tenants.length === 0" class="sa-empty">
          <svg class="w-10 h-10 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
          </svg>
          Keine Tenants
        </div>
      </div>
    </div>

    <!-- Wallee Activation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showWalleeModal" class="sa-modal-backdrop" @click.self="showWalleeModal = false">
          <div class="sa-modal">
            <div class="sa-modal-header">
              <h3 class="sa-modal-title">
                {{ walleeTenant?.wallee_onboarding_status === 'active' ? 'Wallee verwalten' : 'Online-Zahlungen aktivieren' }}
              </h3>
              <p class="sa-modal-sub">{{ walleeTenant?.name }}</p>
            </div>

            <div class="sa-modal-body">
              <!-- Toggle when already active -->
              <template v-if="walleeTenant?.wallee_onboarding_status === 'active'">
                <div class="sa-toggle-row">
                  <div>
                    <p class="sa-toggle-label">Online-Zahlungen</p>
                    <p class="sa-toggle-sub">{{ walleeTenant?.wallee_enabled ? 'Aktiv – Kunden können online bezahlen' : 'Pausiert' }}</p>
                  </div>
                  <button @click="toggleWalleeAdmin" :disabled="walleeLoading"
                    :class="['sa-toggle', walleeTenant?.wallee_enabled ? 'sa-toggle-on' : 'sa-toggle-off']">
                    <span :class="['sa-toggle-thumb', walleeTenant?.wallee_enabled ? 'translate-x-5' : 'translate-x-0']" />
                  </button>
                </div>
                <div class="sa-info-row">
                  <span class="sa-info-label">Space ID</span>
                  <span class="sa-info-val">
                    {{ walleeTenant?.wallee_space_id || walleeForm.space_id || '—' }}
                    <span v-if="walleeTenant?.wallee_test_mode" class="ml-1 text-xs text-amber-600 font-medium">(Test-Modus aktiv)</span>
                  </span>
                  <span class="sa-info-label">User ID</span>
                  <span class="sa-info-val">{{ walleeTenant?.wallee_user_id || walleeForm.user_id || '—' }}</span>
                </div>
                <p class="sa-hint">Credentials ändern: Space ID + User ID eingeben und erneut aktivieren.</p>
              </template>

              <!-- Business info if present -->
              <div v-if="walleeTenant?.wallee_uid_number" class="sa-info-card">
                <div class="sa-info-row">
                  <span class="sa-info-label">UID</span><span class="sa-info-val">{{ walleeTenant.wallee_uid_number }}</span>
                  <span class="sa-info-label">IBAN</span><span class="sa-info-val">{{ walleeTenant.wallee_iban || '—' }}</span>
                </div>
                <a v-if="walleeTenant.wallee_handelsregister_url" :href="walleeTenant.wallee_handelsregister_url"
                  target="_blank" class="sa-link-sm block mt-2">Handelsregister-PDF öffnen</a>
                <p v-if="walleeTenant.wallee_application_notes" class="sa-hint mt-1">{{ walleeTenant.wallee_application_notes }}</p>
              </div>

              <!-- Credential inputs -->
              <div class="space-y-3">
                <p class="sa-hint -mb-1">Produktions-Credentials ändern oder neu setzen:</p>
                <div>
                  <label class="sa-label">Wallee Space ID *</label>
                  <input v-model="walleeForm.space_id" type="number" class="sa-input" @input="walleeTestResult = null" />
                </div>
                <div>
                  <label class="sa-label">Wallee User ID *</label>
                  <input v-model="walleeForm.user_id" type="number" class="sa-input" @input="walleeTestResult = null" />
                </div>
                <div>
                  <label class="sa-label">Wallee API Secret *</label>
                  <input v-model="walleeForm.secret_key" type="password" placeholder="••••••••  (neu eingeben zum Ändern)" class="sa-input" autocomplete="new-password" @input="walleeTestResult = null" />
                  <p class="sa-hint mt-1">Wallee → Account → Application Users → User auswählen → Authentication Key</p>
                </div>

                <!-- Test result banner -->
                <div v-if="walleeTestResult" :class="[
                  'rounded-lg px-4 py-3 text-sm flex items-start gap-2',
                  walleeTestResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                ]">
                  <span class="text-base leading-none mt-0.5">{{ walleeTestResult.success ? '✅' : '❌' }}</span>
                  <span v-if="walleeTestResult.success">
                    Verbindung erfolgreich — Space <strong>{{ walleeTestResult.spaceName }}</strong> (ID {{ walleeTestResult.spaceId }})
                  </span>
                  <span v-else>{{ walleeTestResult.error }}</span>
                </div>
              </div>

              <!-- ── Test-Modus Section ──────────────────────────────────── -->
              <div class="sa-info-card border-amber-200 bg-amber-50">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-base">🧪</span>
                  <p class="sa-toggle-label text-amber-900">Test-Modus</p>
                  <span v-if="walleeTenant?.wallee_test_mode"
                    class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Aktiv
                  </span>
                </div>
                <p class="sa-toggle-sub mb-3">
                  Neue Zahlungen laufen über einen separaten Test-Space.
                  Offene Transaktionen im Produktions-Space bleiben davon unberührt (Space-aware Webhook).
                </p>

                <!-- Test credential inputs -->
                <div class="space-y-2 mb-3">
                  <input v-model="walleeTestForm.space_id" type="number" placeholder="Test Space ID" class="sa-input" @input="walleeTestFormResult = null" />
                  <input v-model="walleeTestForm.user_id" type="number" placeholder="Test User ID" class="sa-input" @input="walleeTestFormResult = null" />
                  <input v-model="walleeTestForm.secret_key" type="password" placeholder="Test API Secret" class="sa-input" autocomplete="new-password" @input="walleeTestFormResult = null" />
                </div>

                <!-- Test form result banner -->
                <div v-if="walleeTestFormResult" :class="[
                  'rounded-lg px-3 py-2 text-sm flex items-start gap-2 mb-3',
                  walleeTestFormResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
                ]">
                  <span class="leading-none mt-0.5">{{ walleeTestFormResult.success ? '✅' : '❌' }}</span>
                  <span v-if="walleeTestFormResult.success">
                    Space <strong>{{ walleeTestFormResult.spaceName }}</strong> ({{ walleeTestFormResult.spaceId }}) — Verbindung OK
                  </span>
                  <span v-else>{{ walleeTestFormResult.error }}</span>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button @click="testWalleeTestCredentials" :disabled="walleeTestTesting || !walleeTestForm.space_id || !walleeTestForm.user_id || !walleeTestForm.secret_key"
                    class="sa-btn-ghost text-xs py-1.5 px-3">
                    {{ walleeTestTesting ? 'Wird getestet…' : '🔌 Verbindung testen' }}
                  </button>
                  <button @click="saveTestCredentials" :disabled="walleeTestSaving || !walleeTestFormResult?.success"
                    class="sa-btn-amber text-xs py-1.5 px-3"
                    :title="!walleeTestFormResult?.success ? 'Bitte zuerst Verbindung testen' : ''">
                    {{ walleeTestSaving ? 'Speichern…' : '💾 Test-Credentials speichern' }}
                  </button>
                </div>

                <!-- Test mode toggle + actions: show if just saved OR already active -->
                <div v-if="walleeTestCredentialsSaved || walleeTenant?.wallee_test_mode" class="mt-3 pt-3 border-t border-amber-200 space-y-3">

                  <!-- Warning when test mode is on: real customers affected -->
                  <div v-if="walleeTenant?.wallee_test_mode" class="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-800">
                    ⚠️ <strong>Test-Modus aktiv:</strong> Neue Kundenzahlungen gehen aktuell in den Test-Space. Nur für kurze Tests empfohlen.
                  </div>

                  <div class="sa-toggle-row">
                    <div>
                      <p class="sa-toggle-label text-amber-900">Test-Modus</p>
                      <p class="sa-toggle-sub">{{ walleeTenant?.wallee_test_mode ? 'An — neue Zahlungen → Test-Space' : 'Aus — Produktion läuft normal' }}</p>
                    </div>
                    <button @click="toggleTestMode" :disabled="walleeTestModeToggling"
                      :class="['sa-toggle', walleeTenant?.wallee_test_mode ? 'sa-toggle-on bg-amber-400' : 'sa-toggle-off']">
                      <span :class="['sa-toggle-thumb', walleeTenant?.wallee_test_mode ? 'translate-x-5' : 'translate-x-0']" />
                    </button>
                  </div>

                  <!-- Test payment: always available in this section -->
                  <div class="space-y-2">
                    <button @click="createTestPayment" :disabled="walleeTestPaymentLoading"
                      class="w-full text-xs py-2 px-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {{ walleeTestPaymentLoading ? 'Erstelle…' : '💳 Test-Zahlung erstellen (CHF 1.00)' }}
                    </button>

                    <div v-if="walleeTestPaymentResult" class="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 space-y-1.5">
                      <p class="font-medium">{{ walleeTestPaymentResult.message }}</p>

                      <a :href="walleeTestPaymentResult.paymentUrl" target="_blank"
                        class="flex items-center gap-1 underline text-blue-700 font-medium">
                        → Zahlung öffnen &amp; abschliessen (CHF {{ walleeTestPaymentResult.amount }})
                      </a>

                      <!-- Status checker -->
                      <div class="pt-1 border-t border-blue-200 flex items-center gap-2 flex-wrap">
                        <button @click="checkPaymentStatus" :disabled="walleeStatusChecking"
                          class="py-1 px-2 rounded font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 disabled:opacity-50 transition-colors">
                          {{ walleeStatusChecking ? 'Prüfe…' : '🔄 Status prüfen' }}
                        </button>

                        <span v-if="walleePaymentStatus" :class="[
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold',
                          walleePaymentStatus.dbStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          walleePaymentStatus.dbStatus === 'failed'    ? 'bg-red-100 text-red-800' :
                                                                          'bg-amber-100 text-amber-800'
                        ]">
                          {{ walleePaymentStatus.dbStatus === 'completed' ? '✅' : walleePaymentStatus.dbStatus === 'failed' ? '❌' : '⏳' }}
                          DB: {{ walleePaymentStatus.dbStatus }}
                          <span v-if="walleePaymentStatus.walleeState" class="opacity-70">/ Wallee: {{ walleePaymentStatus.walleeState }}</span>
                        </span>

                        <a v-if="walleePaymentStatus?.walleeDashboardUrl"
                          :href="walleePaymentStatus.walleeDashboardUrl" target="_blank"
                          class="underline text-blue-600">
                          Im Wallee-Dashboard öffnen →
                        </a>
                      </div>

                      <p class="text-blue-400">Transaction ID: {{ walleeTestPaymentResult.transactionId }}</p>
                    </div>
                  </div>

                  <!-- Promote: always available once test credentials exist -->
                  <div class="pt-1 border-t border-amber-200">
                    <button @click="promoteTestCredentials" :disabled="walleePromoting"
                      class="w-full text-xs py-2 px-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {{ walleePromoting ? 'Wird übertragen…' : '🚀 Als Produktions-Credentials übernehmen' }}
                    </button>
                    <p class="sa-hint mt-1">
                      Übernimmt Test-Credentials als neue Produktions-Credentials und deaktiviert den Test-Modus.
                      Test-Modus muss dafür nicht aktiv sein.
                    </p>
                  </div>
                </div>
              </div>

              <!-- PCI documents (per-tenant merchant docs for Wallee) -->
              <div class="sa-info-card">
                <p class="sa-toggle-label">PCI-Dokumente</p>
                <p class="sa-toggle-sub mb-2">
                  Compliance-Richtlinie + Incident-Response-Plan auf den Namen des Tenants
                  (Firma/Adresse/UID kommen automatisch aus den Stammdaten).
                </p>
                <div class="space-y-2">
                  <input v-model="pciForm.approver" type="text"
                    placeholder="Unterzeichner (z.B. Pascal Kilchenmann)" class="sa-input" />
                  <input v-model="pciForm.title" type="text"
                    placeholder="Funktion (z.B. Geschäftsführer)" class="sa-input" />
                </div>
                <button @click="openPciDocs" class="sa-btn-success mt-3">
                  PCI-Dokumente erzeugen &amp; öffnen
                </button>
                <p class="sa-hint mt-1">Öffnet eine Druckansicht → „Drucken / Als PDF speichern".</p>
              </div>

              <p v-if="walleeError" class="sa-error">{{ walleeError }}</p>
            </div>

            <div class="sa-modal-footer">
              <button @click="testWalleeCredentials" :disabled="walleeTesting || !walleeForm.space_id || !walleeForm.user_id || !walleeForm.secret_key" class="sa-btn-ghost">
                {{ walleeTesting ? 'Wird getestet…' : '🔌 Verbindung testen' }}
              </button>
              <button @click="activateWallee" :disabled="walleeLoading || !walleeTestResult?.success" class="sa-btn-success" :title="!walleeTestResult?.success ? 'Bitte zuerst die Verbindung testen' : ''">
                {{ walleeLoading ? 'Wird aktiviert…' : 'Aktivieren' }}
              </button>
              <button v-if="walleeTenant?.wallee_onboarding_status === 'pending'"
                @click="extendStripeTrial" :disabled="trialExtendLoading" class="sa-btn-amber">
                {{ trialExtendLoading ? '…' : '+7 Tage Trial' }}
              </button>
              <button @click="showWalleeModal = false" class="sa-btn-ghost">Abbrechen</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal || showEditModal" class="sa-modal-backdrop" @click.self="closeModal">
          <div class="sa-modal">
            <div class="sa-modal-header">
              <h3 class="sa-modal-title">{{ showCreateModal ? 'Neuen Tenant erstellen' : 'Tenant bearbeiten' }}</h3>
            </div>
            <form @submit.prevent="saveTenant" class="sa-modal-body">
              <div class="sa-form-grid">
                <div>
                  <label class="sa-label">Name *</label>
                  <input v-model="tenantForm.name" placeholder="Fahrschule Muster" required class="sa-input" />
                </div>
                <div>
                  <label class="sa-label">Slug *</label>
                  <input v-model="tenantForm.slug" placeholder="fahrschule-muster" required class="sa-input" />
                </div>
                <div>
                  <label class="sa-label">E-Mail</label>
                  <input v-model="tenantForm.contact_email" type="email" placeholder="info@..." class="sa-input" />
                </div>
                <div>
                  <label class="sa-label">Telefon</label>
                  <input v-model="tenantForm.contact_phone" placeholder="+41..." class="sa-input" />
                </div>
                <div>
                  <label class="sa-label">Plan</label>
                  <select v-model="tenantForm.subscription_plan" class="sa-input">
                    <option v-for="o in planOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
                <div>
                  <label class="sa-label">Status</label>
                  <select v-model="tenantForm.subscription_status" class="sa-input">
                    <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center gap-6 mt-2">
                <label class="sa-check-label">
                  <input v-model="tenantForm.is_active" type="checkbox" class="sa-check" /> Aktiv
                </label>
                <label class="sa-check-label">
                  <input v-model="tenantForm.is_trial" type="checkbox" class="sa-check" /> Trial
                </label>
              </div>
            </form>
            <div class="sa-modal-footer">
              <button @click="saveTenant" :disabled="isSaving" class="sa-btn-primary-sm">
                {{ isSaving ? 'Speichern…' : 'Speichern' }}
              </button>
              <button type="button" @click="closeModal" class="sa-btn-ghost">Abbrechen</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin' })
import { ref, onMounted } from 'vue'

const API = '/api/admin/tenants-manage'

const tenants = ref<any[]>([])
const showCreateModal = ref(false)
const showEditModal = ref(false)
const isSaving = ref(false)
const editingTenant = ref<any>(null)

const tenantForm = ref({
  name: '', slug: '', contact_email: '', contact_phone: '',
  business_type: '', subscription_plan: 'trial',
  subscription_status: 'active', is_active: true, is_trial: true
})

const planOptions   = [{ label: 'Trial', value: 'trial' }, { label: 'Basic', value: 'basic' }, { label: 'Premium', value: 'premium' }]
const statusOptions = [{ label: 'Aktiv', value: 'active' }, { label: 'Pausiert', value: 'suspended' }, { label: 'Gekündigt', value: 'cancelled' }]

const showWalleeModal    = ref(false)
const walleeTenant       = ref<any>(null)
const walleeError        = ref('')
const walleeLoading      = ref(false)
const walleeForm         = ref({ space_id: '', user_id: '', secret_key: '' })
const walleeTesting      = ref(false)
const walleeTestResult   = ref<{ success: boolean; spaceName?: string; spaceId?: number; error?: string } | null>(null)
const trialExtendLoading = ref(false)
const pciForm            = ref({ approver: '', title: '' })

// Test payment state
const walleeTestPaymentLoading = ref(false)
const walleeTestPaymentResult  = ref<{ paymentUrl: string; transactionId: string; paymentId: string; spaceId: number; isTestMode: boolean; amount: number; message: string } | null>(null)
const walleeStatusChecking     = ref(false)
const walleePaymentStatus      = ref<{ dbStatus: string; walleeState: string | null; walleeDashboardUrl: string | null } | null>(null)

// Test-Modus state
const walleeTestForm            = ref({ space_id: '', user_id: '', secret_key: '' })
const walleeTestTesting         = ref(false)
const walleeTestFormResult      = ref<{ success: boolean; spaceName?: string; spaceId?: number; error?: string } | null>(null)
const walleeTestSaving          = ref(false)
const walleeTestCredentialsSaved = ref(false)
const walleeTestModeToggling    = ref(false)
const walleePromoting           = ref(false)

const openWalleeActivation = async (tenant: any) => {
  walleeTenant.value = tenant
  walleeForm.value   = { space_id: '', user_id: '', secret_key: '' }
  walleeTestResult.value = null
  walleeTestForm.value = { space_id: '', user_id: '', secret_key: '' }
  walleeTestFormResult.value = null
  walleeTestCredentialsSaved.value = false
  walleeTestPaymentResult.value = null
  walleePaymentStatus.value = null
  pciForm.value      = { approver: '', title: '' }
  walleeError.value  = ''
  showWalleeModal.value = true

  // Load current space/user IDs from tenant_secrets (non-secret, safe to display)
  try {
    const ids = await $fetch<any>('/api/admin/wallee-get-space-ids', {
      query: { tenant_id: tenant.id },
    })
    if (ids.prod.space_id) walleeForm.value.space_id = ids.prod.space_id
    if (ids.prod.user_id)  walleeForm.value.user_id  = ids.prod.user_id
    if (ids.test.space_id) walleeTestForm.value.space_id = ids.test.space_id
    if (ids.test.user_id)  walleeTestForm.value.user_id  = ids.test.user_id
    // Mark as having saved test creds if test space_id exists
    if (ids.test.space_id) walleeTestCredentialsSaved.value = true
  } catch { /* non-fatal */ }
}

const openPciDocs = () => {
  if (!walleeTenant.value) return
  const params = new URLSearchParams({ tenant_id: walleeTenant.value.id })
  if (pciForm.value.approver.trim()) params.set('approver', pciForm.value.approver.trim())
  if (pciForm.value.title.trim()) params.set('title', pciForm.value.title.trim())
  window.open(`/api/admin/pci-docs?${params.toString()}`, '_blank')
}

const testWalleeCredentials = async () => {
  walleeTestResult.value = null
  walleeTesting.value = true
  try {
    const result = await $fetch<any>('/api/admin/wallee-test-credentials', {
      method: 'POST',
      body: {
        wallee_space_id: walleeForm.value.space_id,
        wallee_user_id: walleeForm.value.user_id,
        wallee_secret_key: walleeForm.value.secret_key,
      },
    })
    walleeTestResult.value = result
  } catch (err: any) {
    walleeTestResult.value = {
      success: false,
      error: err?.data?.statusMessage || 'Verbindungstest fehlgeschlagen',
    }
  } finally {
    walleeTesting.value = false
  }
}

const activateWallee = async () => {
  walleeError.value = ''
  walleeLoading.value = true
  try {
    await $fetch('/api/admin/wallee-activate', {
      method: 'POST',
      body: { tenant_id: walleeTenant.value.id, wallee_space_id: walleeForm.value.space_id, wallee_user_id: walleeForm.value.user_id, wallee_secret_key: walleeForm.value.secret_key },
    })
    showWalleeModal.value = false
    await loadTenants()
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Aktivieren'
  } finally { walleeLoading.value = false }
}

const toggleWalleeAdmin = async () => {
  if (!walleeTenant.value) return
  walleeLoading.value = true
  walleeError.value   = ''
  const newVal = !walleeTenant.value.wallee_enabled
  try {
    await $fetch('/api/admin/wallee-activate', {
      method: 'POST',
      body: {
        tenant_id: walleeTenant.value.id, deactivate: !newVal,
        ...(newVal ? { wallee_space_id: walleeTenant.value.wallee_space_id, wallee_user_id: walleeTenant.value.wallee_user_id } : {}),
      },
    })
    walleeTenant.value = { ...walleeTenant.value, wallee_enabled: newVal }
    await loadTenants()
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Umschalten'
  } finally { walleeLoading.value = false }
}

const checkPaymentStatus = async () => {
  if (!walleeTestPaymentResult.value?.paymentId) return
  walleeStatusChecking.value = true
  try {
    const result = await $fetch<any>('/api/admin/wallee-check-payment-status', {
      query: { payment_id: walleeTestPaymentResult.value.paymentId },
    })
    walleePaymentStatus.value = result
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Status konnte nicht geladen werden'
  } finally {
    walleeStatusChecking.value = false
  }
}

const createTestPayment = async () => {
  if (!walleeTenant.value) return
  walleeTestPaymentLoading.value = true
  walleeTestPaymentResult.value = null
  walleeError.value = ''
  try {
    const result = await $fetch<any>('/api/admin/wallee-create-test-payment', {
      method: 'POST',
      body: { tenant_id: walleeTenant.value.id },
    })
    walleeTestPaymentResult.value = result
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Erstellen der Test-Zahlung'
  } finally {
    walleeTestPaymentLoading.value = false
  }
}

const testWalleeTestCredentials = async () => {
  walleeTestFormResult.value = null
  walleeTestTesting.value = true
  try {
    const result = await $fetch<any>('/api/admin/wallee-test-credentials', {
      method: 'POST',
      body: {
        wallee_space_id: walleeTestForm.value.space_id,
        wallee_user_id: walleeTestForm.value.user_id,
        wallee_secret_key: walleeTestForm.value.secret_key,
      },
    })
    walleeTestFormResult.value = result
  } catch (err: any) {
    walleeTestFormResult.value = { success: false, error: err?.data?.statusMessage || 'Verbindungstest fehlgeschlagen' }
  } finally {
    walleeTestTesting.value = false
  }
}

const saveTestCredentials = async () => {
  if (!walleeTenant.value) return
  walleeTestSaving.value = true
  walleeError.value = ''
  try {
    await $fetch('/api/admin/wallee-save-test-credentials', {
      method: 'POST',
      body: {
        tenant_id: walleeTenant.value.id,
        wallee_space_id: walleeTestForm.value.space_id,
        wallee_user_id: walleeTestForm.value.user_id,
        wallee_secret_key: walleeTestForm.value.secret_key,
      },
    })
    walleeTestCredentialsSaved.value = true
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Speichern der Test-Credentials'
  } finally {
    walleeTestSaving.value = false
  }
}

const toggleTestMode = async () => {
  if (!walleeTenant.value) return
  walleeTestModeToggling.value = true
  walleeError.value = ''
  const newTestMode = !walleeTenant.value.wallee_test_mode
  try {
    await $fetch('/api/admin/wallee-toggle-test-mode', {
      method: 'POST',
      body: { tenant_id: walleeTenant.value.id, test_mode: newTestMode },
    })
    walleeTenant.value = { ...walleeTenant.value, wallee_test_mode: newTestMode }
    await loadTenants()
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Umschalten des Test-Modus'
  } finally {
    walleeTestModeToggling.value = false
  }
}

const promoteTestCredentials = async () => {
  if (!walleeTenant.value) return
  if (!confirm(`Test-Credentials als neue Produktions-Credentials für "${walleeTenant.value.name}" übernehmen? Das kann nicht rückgängig gemacht werden.`)) return
  walleePromoting.value = true
  walleeError.value = ''
  try {
    const result = await $fetch<any>('/api/admin/wallee-promote-test-credentials', {
      method: 'POST',
      body: { tenant_id: walleeTenant.value.id },
    })
    walleeTenant.value = { ...walleeTenant.value, wallee_test_mode: false, wallee_space_id: result.newSpaceId }
    await loadTenants()
    alert(`✅ ${result.message}`)
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Übertragen der Credentials'
  } finally {
    walleePromoting.value = false
  }
}

const extendStripeTrial = async () => {
  if (!walleeTenant.value) return
  trialExtendLoading.value = true
  walleeError.value = ''
  try {
    const result = await $fetch<{ message: string }>('/api/admin/extend-stripe-trial', {
      method: 'POST', body: { tenant_id: walleeTenant.value.id },
    })
    alert(`✅ ${result.message}`)
  } catch (err: any) {
    walleeError.value = err?.data?.statusMessage || 'Fehler beim Verlängern des Trials'
  } finally { trialExtendLoading.value = false }
}

const loadTenants = async () => {
  try {
    const result = await $fetch<any>(API)
    tenants.value = result.data ?? []
  } catch (e) { console.error('Error loading tenants:', e) }
}

const saveTenant = async () => {
  isSaving.value = true
  try {
    if (editingTenant.value) {
      await $fetch(API, { method: 'PATCH', body: { id: editingTenant.value.id, ...tenantForm.value } })
    } else {
      await $fetch(API, { method: 'POST', body: tenantForm.value })
    }
    await loadTenants()
    closeModal()
  } catch (e) {
    console.error('Error saving tenant:', e)
  } finally { isSaving.value = false }
}

const editTenant = (tenant: any) => {
  editingTenant.value = tenant
  tenantForm.value = { ...tenant }
  showEditModal.value = true
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value   = false
  editingTenant.value   = null
  tenantForm.value = { name: '', slug: '', contact_email: '', contact_phone: '', business_type: '', subscription_plan: 'trial', subscription_status: 'active', is_active: true, is_trial: true }
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('de-CH') : '—'

const isTrialExpiring = (d: string) => {
  const days = (new Date(d).getTime() - Date.now()) / 86400000
  return days >= 0 && days <= 7
}

onMounted(() => loadTenants())
</script>

<style scoped>
.sa-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:2rem; gap:1rem; }
.sa-page-title  { font-size:1.75rem; font-weight:800; color:#f1f5f9; letter-spacing:-0.03em; }
.sa-page-sub    { font-size:0.85rem; color:#64748b; margin-top:0.25rem; }

.sa-btn-primary {
  display:inline-flex; align-items:center; gap:0.375rem;
  padding:0.5rem 1rem; background:linear-gradient(135deg,#4f46e5,#7c3aed);
  color:white; font-size:0.8rem; font-weight:600; border-radius:8px;
  text-decoration:none; border:none; cursor:pointer;
  box-shadow:0 0 16px rgba(99,102,241,0.3); transition:all 0.2s; white-space:nowrap;
}
.sa-btn-primary:hover { filter:brightness(1.1); transform:translateY(-1px); }

.sa-card {
  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
  border-radius:14px; overflow:hidden;
}
.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%; border-collapse:collapse; }
.sa-table th {
  padding:0.625rem 0.875rem; text-align:left; font-size:0.7rem; font-weight:600;
  color:#475569; text-transform:uppercase; letter-spacing:0.06em;
  border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.2);
}
.sa-table td {
  padding:0.875rem; font-size:0.8rem; color:#cbd5e1;
  border-bottom:1px solid rgba(255,255,255,0.04);
}
.sa-table tr:last-child td { border-bottom:none; }
.sa-table tr:hover td { background:rgba(255,255,255,0.025); }
.sa-tenant-avatar {
  width:32px; height:32px; border-radius:8px;
  background:linear-gradient(135deg,#4f46e5,#7c3aed);
  display:flex; align-items:center; justify-content:center;
  font-size:0.7rem; font-weight:700; color:white; flex-shrink:0;
}
.sa-tenant-name { font-size:0.82rem; font-weight:600; color:#e2e8f0; }
.sa-tenant-slug { font-size:0.7rem; color:#64748b; }
.sa-cell-muted  { color:#64748b !important; }

.sa-badge { display:inline-flex; align-items:center; padding:0.15rem 0.55rem; border-radius:999px; font-size:0.68rem; font-weight:600; }
.sa-badge-green  { background:rgba(16,185,129,0.1);  color:#6ee7b7; border:1px solid rgba(16,185,129,0.2); }
.sa-badge-red    { background:rgba(239,68,68,0.1);   color:#fca5a5; border:1px solid rgba(239,68,68,0.2); }
.sa-badge-amber  { background:rgba(245,158,11,0.1);  color:#fcd34d; border:1px solid rgba(245,158,11,0.2); }
.sa-badge-neutral{ background:rgba(100,116,139,0.1); color:#94a3b8; border:1px solid rgba(100,116,139,0.2); }

.sa-action-btn {
  font-size:0.72rem; font-weight:500; color:#6366f1;
  background:none; border:none; cursor:pointer; padding:0; text-decoration:none;
}
.sa-action-btn:hover { color:#a5b4fc; }

.sa-empty { text-align:center; padding:3rem 1rem; color:#475569; font-size:0.8rem; }

/* Modals */
.sa-modal-backdrop {
  position:fixed; inset:0; z-index:100;
  background:rgba(0,0,0,0.7); backdrop-filter:blur(4px);
  display:flex; align-items:center; justify-content:center; padding:1.5rem;
}
.sa-modal {
  background:#141620; border:1px solid rgba(255,255,255,0.1);
  border-radius:16px; width:100%; max-width:480px;
  box-shadow:0 40px 80px rgba(0,0,0,0.5);
  display:flex; flex-direction:column;
  max-height:calc(100svh - 3rem);
  overflow:hidden;
}
.sa-modal-header { padding:1.5rem 1.5rem 0; flex-shrink:0; }
.sa-modal-title  { font-size:1.1rem; font-weight:700; color:#f1f5f9; }
.sa-modal-sub    { font-size:0.8rem; color:#64748b; margin-top:0.25rem; }
.sa-modal-body   { padding:1.25rem 1.5rem; space-y:1rem; overflow-y:auto; flex:1; }
.sa-modal-footer { padding:1rem 1.5rem 1.5rem; display:flex; gap:0.75rem; align-items:center; border-top:1px solid rgba(255,255,255,0.06); flex-shrink:0; }

.sa-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.875rem; }
.sa-label { display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem; }
.sa-input {
  width:100%; padding:0.5rem 0.75rem;
  background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
  border-radius:8px; font-size:0.8rem; color:#e2e8f0;
  transition:border-color 0.15s;
}
.sa-input:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
.sa-input option { background:#1e2130; color:#e2e8f0; }

.sa-check-label { display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; color:#94a3b8; cursor:pointer; }
.sa-check { accent-color:#6366f1; }

.sa-toggle-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:0.875rem; background:rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.07); border-radius:10px; margin-bottom:0.875rem;
}
.sa-toggle-label { font-size:0.85rem; font-weight:600; color:#e2e8f0; }
.sa-toggle-sub   { font-size:0.72rem; color:#64748b; margin-top:0.2rem; }
.sa-toggle {
  position:relative; width:44px; height:24px; border-radius:999px;
  border:none; cursor:pointer; transition:background 0.2s;
}
.sa-toggle-on  { background:#4f46e5; }
.sa-toggle-off { background:#374151; }
.sa-toggle-thumb {
  position:absolute; top:2px; left:2px;
  width:20px; height:20px; border-radius:50%; background:white;
  box-shadow:0 1px 4px rgba(0,0,0,0.3); transition:transform 0.2s;
}

.sa-info-row {
  display:grid; grid-template-columns:auto 1fr auto 1fr;
  gap:0.375rem 0.75rem; align-items:center;
  padding:0.75rem; background:rgba(255,255,255,0.03);
  border-radius:8px; margin-bottom:0.75rem;
}
.sa-info-label { font-size:0.7rem; color:#64748b; font-weight:500; }
.sa-info-val   { font-size:0.78rem; color:#e2e8f0; font-weight:600; }
.sa-info-card  { padding:0.75rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; margin-bottom:0.875rem; }
.sa-hint  { font-size:0.7rem; color:#475569; }
.sa-error { font-size:0.75rem; color:#f87171; margin-top:0.5rem; }
.sa-link-sm { font-size:0.75rem; color:#6366f1; text-decoration:none; }
.sa-link-sm:hover { color:#a5b4fc; }

.sa-btn-success {
  flex:1; padding:0.5rem 1rem; background:linear-gradient(135deg,#059669,#10b981);
  color:white; font-size:0.8rem; font-weight:600; border-radius:8px; border:none; cursor:pointer;
}
.sa-btn-success:hover { filter:brightness(1.1); }
.sa-btn-success:disabled { opacity:0.5; cursor:not-allowed; }
.sa-btn-amber {
  padding:0.5rem 0.875rem; background:rgba(245,158,11,0.15);
  border:1px solid rgba(245,158,11,0.3); color:#fcd34d;
  font-size:0.75rem; font-weight:600; border-radius:8px; cursor:pointer;
}
.sa-btn-amber:hover { background:rgba(245,158,11,0.25); }
.sa-btn-ghost {
  padding:0.5rem 0.875rem; background:transparent;
  border:none; color:#64748b; font-size:0.8rem; cursor:pointer;
}
.sa-btn-ghost:hover { color:#94a3b8; }
.sa-btn-primary-sm {
  padding:0.5rem 1.25rem; background:linear-gradient(135deg,#4f46e5,#7c3aed);
  color:white; font-size:0.8rem; font-weight:600; border-radius:8px; border:none; cursor:pointer;
}

/* Transition */
.modal-enter-active, .modal-leave-active { transition:all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity:0; transform:scale(0.97); }
</style>
