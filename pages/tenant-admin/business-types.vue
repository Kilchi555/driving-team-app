<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Business-Types & Presets</h1>
        <p class="sa-page-sub">Branchen, Feature-Flags und UI-Labels verwalten</p>
      </div>
      <button @click="openCreateType" class="sa-btn-primary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Neuer Typ
      </button>
    </div>

    <div class="sa-card">
      <div class="sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Beschreibung</th><th>Status</th><th class="text-right">Aktionen</th></tr>
          </thead>
          <tbody>
            <tr v-for="bt in businessTypes" :key="bt.code">
              <td><span class="sa-code">{{ bt.code }}</span></td>
              <td style="color:#e2e8f0;font-weight:600;font-size:.82rem">{{ bt.name }}</td>
              <td class="sa-cell-muted text-xs">{{ bt.description || '—' }}</td>
              <td>
                <span :class="['sa-badge', bt.is_active ? 'sa-badge-green' : 'sa-badge-neutral']">
                  {{ bt.is_active ? 'Aktiv' : 'Inaktiv' }}
                </span>
              </td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-3">
                  <button @click="openEditType(bt)" class="sa-action-btn">Bearbeiten</button>
                  <button @click="openEditPreset(bt)" class="sa-action-btn-violet">Preset</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="businessTypes.length === 0" class="sa-empty">Keine Business-Types gefunden</div>
      </div>
    </div>

    <!-- Create/Edit Type Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showTypeModal" class="sa-modal-backdrop" @click.self="closeTypeModal">
          <div class="sa-modal">
            <div class="sa-modal-header">
              <h3 class="sa-modal-title">{{ editingType?.code ? 'Business-Type bearbeiten' : 'Business-Type erstellen' }}</h3>
            </div>
            <div class="sa-modal-body space-y-3">
              <div v-if="!editingType?.code">
                <label class="sa-label">Code *</label>
                <input v-model="typeForm.code" type="text" placeholder="z.B. physiotherapy" class="sa-input" />
              </div>
              <div>
                <label class="sa-label">Name *</label>
                <input v-model="typeForm.name" type="text" placeholder="Anzeigename" class="sa-input" />
              </div>
              <div>
                <label class="sa-label">Beschreibung</label>
                <textarea v-model="typeForm.description" rows="3" placeholder="Kurzbeschreibung…" class="sa-input" />
              </div>
              <label class="sa-check-label">
                <input type="checkbox" v-model="typeForm.is_active" class="sa-check" /> Aktiv
              </label>
            </div>
            <div class="sa-modal-footer">
              <button @click="saveType" :disabled="isSaving" class="sa-btn-primary-sm">
                {{ isSaving ? 'Speichern…' : 'Speichern' }}
              </button>
              <button @click="closeTypeModal" class="sa-btn-ghost">Abbrechen</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Preset Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPresetModal" class="sa-modal-backdrop" @click.self="closePresetModal">
          <div class="sa-modal sa-modal-wide">
            <div class="sa-modal-header">
              <h3 class="sa-modal-title">Preset: {{ presetType?.name }}</h3>
              <p class="sa-modal-sub">{{ presetType?.code }}</p>
            </div>
            <div class="sa-modal-body">
              <div class="sa-preset-grid">
                <!-- Feature Flags -->
                <div>
                  <p class="sa-section-label">Feature-Flags</p>
                  <div class="space-y-2">
                    <label v-for="flag in featureFlags" :key="flag.key" class="sa-feature-row">
                      <span class="sa-feature-label">{{ flag.label }}</span>
                      <input type="checkbox" v-model="presetForm.feature_flags[flag.key]" class="sa-check" />
                    </label>
                  </div>
                </div>
                <!-- UI Labels -->
                <div>
                  <p class="sa-section-label">UI-Labels (JSON)</p>
                  <textarea v-model="uiLabelsJson" rows="14" class="sa-code-input" placeholder='{"label_event_type_header": "Sitzungsart"}' />
                  <p v-if="uiLabelsError" class="sa-error">{{ uiLabelsError }}</p>
                </div>
              </div>
            </div>
            <div class="sa-modal-footer">
              <button @click="savePreset" :disabled="isSaving" class="sa-btn-primary-sm">
                {{ isSaving ? 'Speichern…' : 'Speichern' }}
              </button>
              <button @click="closePresetModal" class="sa-btn-ghost">Abbrechen</button>
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
import { getSupabase } from '~/utils/supabase'

interface BusinessType { code: string; name: string; description?: string; is_active: boolean }

const isLoading = ref(false)
const isSaving = ref(false)
const businessTypes = ref<BusinessType[]>([])

const showTypeModal = ref(false)
const editingType = ref<BusinessType | null>(null)
const typeForm = ref<BusinessType>({ code: '', name: '', description: '', is_active: true })

const showPresetModal = ref(false)
const presetType = ref<BusinessType | null>(null)
const presetForm = ref<any>({ feature_flags: {}, ui_labels: {}, defaults: {} })
const uiLabelsJson = ref('')
const uiLabelsError = ref('')

const featureFlags = [
  { key: 'booking_public_enabled', label: 'Öffentliche Buchung' },
  { key: 'invoices_enabled', label: 'Rechnungen' },
  { key: 'packages_enabled', label: 'Pakete' },
  { key: 'product_sales_enabled', label: 'Produktverkauf' },
  { key: 'calendar_sync_enabled', label: 'Kalender-Sync' },
]

const loadBusinessTypes = async () => {
  isLoading.value = true
  try {
    const sb = getSupabase()
    const { data, error } = await sb.from('business_types').select('code, name, description, is_active').order('name')
    if (error) throw error
    businessTypes.value = (data || []) as BusinessType[]
  } catch (e) { console.error(e) } finally { isLoading.value = false }
}

const openCreateType = () => {
  editingType.value = null
  typeForm.value = { code: '', name: '', description: '', is_active: true }
  showTypeModal.value = true
}
const openEditType = (bt: BusinessType) => { editingType.value = bt; typeForm.value = { ...bt }; showTypeModal.value = true }
const closeTypeModal = () => { showTypeModal.value = false }

const saveType = async () => {
  if (!typeForm.value.name || (!editingType.value && !typeForm.value.code)) return
  isSaving.value = true
  try {
    const sb = getSupabase()
    if (editingType.value) {
      const { error } = await sb.from('business_types').update({ name: typeForm.value.name, description: typeForm.value.description, is_active: typeForm.value.is_active }).eq('code', editingType.value.code)
      if (error) throw error
    } else {
      const { error } = await sb.from('business_types').insert({ code: typeForm.value.code, name: typeForm.value.name, description: typeForm.value.description, is_active: typeForm.value.is_active })
      if (error) throw error
    }
    showTypeModal.value = false
    await loadBusinessTypes()
  } catch (e) { console.error(e) } finally { isSaving.value = false }
}

const openEditPreset = async (bt: BusinessType) => {
  presetType.value = bt
  uiLabelsError.value = ''
  const sb = getSupabase()
  const { data } = await sb.from('business_type_presets').select('feature_flags, ui_labels, defaults').eq('business_type_code', bt.code).maybeSingle()
  presetForm.value = data || { feature_flags: {}, ui_labels: {}, defaults: {} }
  uiLabelsJson.value = JSON.stringify(presetForm.value.ui_labels || {}, null, 2)
  showPresetModal.value = true
}
const closePresetModal = () => { showPresetModal.value = false }

const savePreset = async () => {
  try { presetForm.value.ui_labels = uiLabelsJson.value ? JSON.parse(uiLabelsJson.value) : {}; uiLabelsError.value = '' }
  catch { uiLabelsError.value = 'Ungültiges JSON'; return }
  isSaving.value = true
  try {
    const sb = getSupabase()
    const { error } = await sb.from('business_type_presets').upsert({ business_type_code: presetType.value?.code, feature_flags: presetForm.value.feature_flags || {}, ui_labels: presetForm.value.ui_labels || {}, defaults: presetForm.value.defaults || {} }, { onConflict: 'business_type_code' })
    if (error) throw error
    showPresetModal.value = false
  } catch (e) { console.error(e) } finally { isSaving.value = false }
}

onMounted(loadBusinessTypes)
</script>

<style scoped>
.sa-page-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;gap:1rem; }
.sa-page-title  { font-size:1.75rem;font-weight:800;color:#f1f5f9;letter-spacing:-.03em; }
.sa-page-sub    { font-size:.85rem;color:#64748b;margin-top:.25rem; }
.sa-btn-primary { display:inline-flex;align-items:center;gap:.375rem;padding:.5rem 1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:.8rem;font-weight:600;border-radius:8px;border:none;cursor:pointer;box-shadow:0 0 16px rgba(99,102,241,.3);transition:all .2s; }
.sa-btn-primary:hover { filter:brightness(1.1); }

.sa-card { background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden; }
.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%;border-collapse:collapse; }
.sa-table th { padding:.625rem .875rem;text-align:left;font-size:.7rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2); }
.sa-table td { padding:.875rem;font-size:.8rem;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,.04); }
.sa-table tr:last-child td { border-bottom:none; }
.sa-table tr:hover td { background:rgba(255,255,255,.025); }
.sa-code { font-family:monospace;font-size:.78rem;background:rgba(99,102,241,.1);color:#a5b4fc;padding:.1rem .4rem;border-radius:4px; }
.sa-cell-muted { color:#64748b!important; }
.sa-badge { display:inline-flex;align-items:center;padding:.15rem .55rem;border-radius:999px;font-size:.68rem;font-weight:600; }
.sa-badge-green   { background:rgba(16,185,129,.1); color:#6ee7b7;border:1px solid rgba(16,185,129,.2); }
.sa-badge-neutral { background:rgba(100,116,139,.1);color:#94a3b8;border:1px solid rgba(100,116,139,.2); }
.sa-action-btn        { font-size:.72rem;font-weight:500;color:#6366f1;background:none;border:none;cursor:pointer; }
.sa-action-btn:hover  { color:#a5b4fc; }
.sa-action-btn-violet        { font-size:.72rem;font-weight:500;color:#a78bfa;background:none;border:none;cursor:pointer; }
.sa-action-btn-violet:hover  { color:#c4b5fd; }
.sa-empty { text-align:center;padding:3rem;color:#475569;font-size:.8rem; }

/* Modals */
.sa-modal-backdrop { position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
.sa-modal { background:#141620;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:460px;box-shadow:0 40px 80px rgba(0,0,0,.5);overflow:hidden; }
.sa-modal-wide { max-width:680px; }
.sa-modal-header { padding:1.5rem 1.5rem 0; }
.sa-modal-title  { font-size:1.1rem;font-weight:700;color:#f1f5f9; }
.sa-modal-sub    { font-size:.78rem;color:#64748b;margin-top:.2rem; }
.sa-modal-body   { padding:1.25rem 1.5rem; }
.sa-modal-footer { padding:1rem 1.5rem 1.5rem;display:flex;gap:.75rem;border-top:1px solid rgba(255,255,255,.06); }

.sa-label { display:block;font-size:.75rem;font-weight:500;color:#94a3b8;margin-bottom:.375rem; }
.sa-input { width:100%;padding:.5rem .75rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.8rem;color:#e2e8f0;transition:border-color .15s; }
.sa-input:focus { outline:none;border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.sa-check-label { display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#94a3b8;cursor:pointer; }
.sa-check { accent-color:#6366f1; }
.sa-btn-primary-sm { padding:.5rem 1.25rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:.8rem;font-weight:600;border-radius:8px;border:none;cursor:pointer; }
.sa-btn-ghost { padding:.5rem .875rem;background:transparent;border:none;color:#64748b;font-size:.8rem;cursor:pointer; }
.sa-btn-ghost:hover { color:#94a3b8; }
.sa-error { font-size:.72rem;color:#f87171;margin-top:.375rem; }

.sa-preset-grid { display:grid;grid-template-columns:1fr;gap:1.5rem; }
@media(min-width:600px) { .sa-preset-grid { grid-template-columns:1fr 1fr; } }
.sa-section-label { font-size:.72rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem; }
.sa-feature-row { display:flex;align-items:center;justify-content:space-between;padding:.5rem .625rem;border-radius:7px;background:rgba(255,255,255,.03);cursor:pointer; }
.sa-feature-row:hover { background:rgba(255,255,255,.05); }
.sa-feature-label { font-size:.78rem;color:#94a3b8; }
.sa-code-input { width:100%;padding:.625rem .75rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-family:monospace;font-size:.72rem;color:#a5b4fc;resize:vertical; }
.sa-code-input:focus { outline:none;border-color:#6366f1; }

.modal-enter-active,.modal-leave-active { transition:all .2s ease; }
.modal-enter-from,.modal-leave-to { opacity:0;transform:scale(.97); }
</style>
