<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Business-Types & Presets</h1>
        <p class="sa-page-sub">Branchen, Feature-Flags, UI-Labels und Signup-Templates verwalten</p>
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
                  <button @click="openTemplates(bt)" class="sa-action-btn-amber">Templates</button>
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

              <div v-if="!editingType?.code" class="sa-clone-box">
                <label class="sa-label">Defaults von bestehendem Typ übernehmen (empfohlen)</label>
                <select v-model="cloneFromCode" class="sa-input">
                  <option value="">— Keine (leer starten) —</option>
                  <option v-for="bt in businessTypes" :key="bt.code" :value="bt.code">{{ bt.name }} ({{ bt.code }})</option>
                </select>
                <p class="sa-hint">
                  Kopiert Kategorien, Terminarten und Feature-Flags/UI-Labels als Startpunkt.
                  Ohne das bleibt der neue Typ komplett leer — Tenants dieses Typs bekämen beim
                  Signup 0 Kategorien und 0 Terminarten.
                </p>
              </div>
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

    <!-- Templates Modal (categories + event types new tenants of this type receive at signup) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showTemplatesModal" class="sa-modal-backdrop" @click.self="closeTemplatesModal">
          <div class="sa-modal sa-modal-wide">
            <div class="sa-modal-header">
              <h3 class="sa-modal-title">Signup-Templates: {{ templatesType?.name }}</h3>
              <p class="sa-modal-sub">{{ templatesType?.code }} — das erhält jeder neue Tenant dieses Typs automatisch</p>
            </div>
            <div class="sa-modal-body">
              <div v-if="templatesLoading" class="sa-empty">Lade…</div>
              <div v-else class="sa-preset-grid">
                <!-- Categories -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <p class="sa-section-label" style="margin-bottom:0">Kategorien ({{ templateCategories.length }})</p>
                    <button @click="addCategoryRow" class="sa-action-btn">+ Hinzufügen</button>
                  </div>
                  <div v-if="templateCategories.length === 0" class="sa-empty-inline">
                    Keine Kategorien — Signups dieses Typs bekommen aktuell 0 Kategorien.
                  </div>
                  <div v-for="cat in templateCategories" :key="cat.id" class="sa-template-row">
                    <input v-model="cat.code" class="sa-input sa-input-sm" placeholder="Code" style="width:5rem" />
                    <input v-model="cat.name" class="sa-input sa-input-sm" placeholder="Name" />
                    <input v-model="cat.color" type="color" class="sa-color-input" />
                    <button @click="saveCategoryRow(cat)" :disabled="savingRowId === cat.id" class="sa-action-btn">Speichern</button>
                    <button @click="deleteCategoryRow(cat)" class="sa-action-btn-danger">✕</button>
                  </div>
                </div>
                <!-- Event Types -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <p class="sa-section-label" style="margin-bottom:0">Terminarten ({{ templateEventTypes.length }})</p>
                    <button @click="addEventTypeRow" class="sa-action-btn">+ Hinzufügen</button>
                  </div>
                  <div v-if="templateEventTypes.length === 0" class="sa-empty-inline">
                    Keine Terminarten — Signups dieses Typs bekommen aktuell 0 Terminarten.
                  </div>
                  <div v-for="et in templateEventTypes" :key="et.id" class="sa-template-row">
                    <input v-model="et.code" class="sa-input sa-input-sm" placeholder="Code" style="width:5rem" />
                    <input v-model="et.name" class="sa-input sa-input-sm" placeholder="Name" />
                    <input v-model.number="et.default_duration_minutes" type="number" class="sa-input sa-input-sm" style="width:4.5rem" placeholder="Min." />
                    <label class="sa-check-label sa-check-label-sm">
                      <input type="checkbox" v-model="et.require_payment" class="sa-check" /> Bezahlung
                    </label>
                    <button @click="saveEventTypeRow(et)" :disabled="savingRowId === et.id" class="sa-action-btn">Speichern</button>
                    <button @click="deleteEventTypeRow(et)" class="sa-action-btn-danger">✕</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="sa-modal-footer">
              <button @click="closeTemplatesModal" class="sa-btn-ghost">Schliessen</button>
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
interface TemplateCategory { id: number; code: string; name: string; color?: string; is_active?: boolean }
interface TemplateEventType { id: string; code: string; name: string; default_duration_minutes?: number; require_payment?: boolean; is_active?: boolean }

const isLoading = ref(false)
const isSaving = ref(false)
const businessTypes = ref<BusinessType[]>([])

const showTypeModal = ref(false)
const editingType = ref<BusinessType | null>(null)
const typeForm = ref<BusinessType>({ code: '', name: '', description: '', is_active: true })
const cloneFromCode = ref('')

const showPresetModal = ref(false)
const presetType = ref<BusinessType | null>(null)
const presetForm = ref<any>({ feature_flags: {}, ui_labels: {}, defaults: {} })
const uiLabelsJson = ref('')
const uiLabelsError = ref('')

const showTemplatesModal = ref(false)
const templatesType = ref<BusinessType | null>(null)
const templatesLoading = ref(false)
const templateCategories = ref<TemplateCategory[]>([])
const templateEventTypes = ref<TemplateEventType[]>([])
const savingRowId = ref<string | number | null>(null)

const featureFlags = [
  { key: 'booking_public_enabled', label: 'Öffentliche Buchung' },
  { key: 'invoices_enabled', label: 'Rechnungen' },
  { key: 'packages_enabled', label: 'Pakete' },
  { key: 'product_sales_enabled', label: 'Produktverkauf' },
  { key: 'calendar_sync_enabled', label: 'Kalender-Sync' },
]

const authHeaders = async () => {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

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
  cloneFromCode.value = ''
  showTypeModal.value = true
}
const openEditType = (bt: BusinessType) => { editingType.value = bt; typeForm.value = { ...bt }; showTypeModal.value = true }
const closeTypeModal = () => { showTypeModal.value = false }

const saveType = async () => {
  if (!typeForm.value.name || (!editingType.value && !typeForm.value.code)) return
  isSaving.value = true
  try {
    const sb = getSupabase()
    const isNew = !editingType.value
    if (editingType.value) {
      const { error } = await sb.from('business_types').update({ name: typeForm.value.name, description: typeForm.value.description, is_active: typeForm.value.is_active }).eq('code', editingType.value.code)
      if (error) throw error
    } else {
      const { error } = await sb.from('business_types').insert({ code: typeForm.value.code, name: typeForm.value.name, description: typeForm.value.description, is_active: typeForm.value.is_active })
      if (error) throw error
    }

    // Clone defaults from an existing type so the new type never starts out
    // completely empty (the exact bug this whole feature exists to prevent).
    if (isNew && cloneFromCode.value) {
      await $fetch('/api/tenant-admin/business-type-templates/clone', {
        method: 'POST',
        headers: await authHeaders(),
        body: { sourceCode: cloneFromCode.value, targetCode: typeForm.value.code },
      })
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

// ─── Templates (categories + event types copied to new tenants at signup) ──
const openTemplates = async (bt: BusinessType) => {
  templatesType.value = bt
  showTemplatesModal.value = true
  templatesLoading.value = true
  try {
    const res = await $fetch<{ categories: TemplateCategory[]; eventTypes: TemplateEventType[] }>('/api/tenant-admin/business-type-templates', {
      query: { business_type: bt.code },
      headers: await authHeaders(),
    })
    templateCategories.value = res.categories || []
    templateEventTypes.value = res.eventTypes || []
  } catch (e) {
    console.error(e)
    templateCategories.value = []
    templateEventTypes.value = []
  } finally {
    templatesLoading.value = false
  }
}
const closeTemplatesModal = () => { showTemplatesModal.value = false }

const addCategoryRow = () => {
  templateCategories.value.push({ id: -Date.now(), code: '', name: '', color: '#6366f1', is_active: true })
}
const saveCategoryRow = async (cat: TemplateCategory) => {
  savingRowId.value = cat.id
  try {
    const res = await $fetch<{ category: TemplateCategory }>('/api/tenant-admin/business-type-templates', {
      method: 'POST',
      headers: await authHeaders(),
      body: { kind: 'category', id: cat.id > 0 ? cat.id : undefined, business_type: templatesType.value?.code, code: cat.code, name: cat.name, color: cat.color, is_active: cat.is_active ?? true },
    })
    Object.assign(cat, res.category)
  } catch (e) { console.error(e) } finally { savingRowId.value = null }
}
const deleteCategoryRow = async (cat: TemplateCategory) => {
  if (cat.id < 0) { templateCategories.value = templateCategories.value.filter(c => c !== cat); return }
  if (!confirm(`Kategorie "${cat.name}" wirklich löschen? Betrifft nur künftige Signups.`)) return
  try {
    await $fetch('/api/tenant-admin/business-type-templates', { method: 'DELETE', headers: await authHeaders(), query: { kind: 'category', id: cat.id } })
    templateCategories.value = templateCategories.value.filter(c => c !== cat)
  } catch (e) { console.error(e) }
}

const addEventTypeRow = () => {
  templateEventTypes.value.push({ id: `new-${Date.now()}`, code: '', name: '', default_duration_minutes: 45, require_payment: false, is_active: true })
}
const saveEventTypeRow = async (et: TemplateEventType) => {
  savingRowId.value = et.id
  try {
    const isNew = String(et.id).startsWith('new-')
    const res = await $fetch<{ eventType: TemplateEventType }>('/api/tenant-admin/business-type-templates', {
      method: 'POST',
      headers: await authHeaders(),
      body: { kind: 'event_type', id: isNew ? undefined : et.id, business_type: templatesType.value?.code, code: et.code, name: et.name, default_duration_minutes: et.default_duration_minutes, require_payment: et.require_payment, is_active: et.is_active ?? true },
    })
    Object.assign(et, res.eventType)
  } catch (e) { console.error(e) } finally { savingRowId.value = null }
}
const deleteEventTypeRow = async (et: TemplateEventType) => {
  if (String(et.id).startsWith('new-')) { templateEventTypes.value = templateEventTypes.value.filter(e => e !== et); return }
  if (!confirm(`Terminart "${et.name}" wirklich löschen? Betrifft nur künftige Signups.`)) return
  try {
    await $fetch('/api/tenant-admin/business-type-templates', { method: 'DELETE', headers: await authHeaders(), query: { kind: 'event_type', id: et.id } })
    templateEventTypes.value = templateEventTypes.value.filter(e => e !== et)
  } catch (e) { console.error(e) }
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
.sa-action-btn        { font-size:.72rem;font-weight:500;color:#6366f1;background:none;border:none;cursor:pointer;white-space:nowrap; }
.sa-action-btn:hover  { color:#a5b4fc; }
.sa-action-btn-violet        { font-size:.72rem;font-weight:500;color:#a78bfa;background:none;border:none;cursor:pointer; }
.sa-action-btn-violet:hover  { color:#c4b5fd; }
.sa-action-btn-amber        { font-size:.72rem;font-weight:500;color:#f59e0b;background:none;border:none;cursor:pointer; }
.sa-action-btn-amber:hover  { color:#fbbf24; }
.sa-action-btn-danger { font-size:.78rem;font-weight:600;color:#f87171;background:none;border:none;cursor:pointer;padding:0 .25rem; }
.sa-action-btn-danger:hover { color:#fca5a5; }
.sa-empty { text-align:center;padding:3rem;color:#475569;font-size:.8rem; }
.sa-empty-inline { padding:.75rem;color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;font-size:.72rem;margin-bottom:.5rem; }

/* Modals */
.sa-modal-backdrop { position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
.sa-modal { background:#141620;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:460px;box-shadow:0 40px 80px rgba(0,0,0,.5);overflow:hidden; }
.sa-modal-wide { max-width:760px;max-height:90vh;display:flex;flex-direction:column; }
.sa-modal-wide .sa-modal-body { overflow-y:auto; }
.sa-modal-header { padding:1.5rem 1.5rem 0; }
.sa-modal-title  { font-size:1.1rem;font-weight:700;color:#f1f5f9; }
.sa-modal-sub    { font-size:.78rem;color:#64748b;margin-top:.2rem; }
.sa-modal-body   { padding:1.25rem 1.5rem; }
.sa-modal-footer { padding:1rem 1.5rem 1.5rem;display:flex;gap:.75rem;border-top:1px solid rgba(255,255,255,.06); }

.sa-label { display:block;font-size:.75rem;font-weight:500;color:#94a3b8;margin-bottom:.375rem; }
.sa-input { width:100%;padding:.5rem .75rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.8rem;color:#e2e8f0;transition:border-color .15s; }
.sa-input:focus { outline:none;border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.sa-input-sm { padding:.35rem .5rem;font-size:.75rem;flex:1; }
.sa-color-input { width:2.25rem;height:2.25rem;padding:0;border:1px solid rgba(255,255,255,.1);border-radius:6px;background:transparent;cursor:pointer; }
.sa-check-label { display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#94a3b8;cursor:pointer; }
.sa-check-label-sm { font-size:.7rem;white-space:nowrap; }
.sa-check { accent-color:#6366f1; }
.sa-btn-primary-sm { padding:.5rem 1.25rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:.8rem;font-weight:600;border-radius:8px;border:none;cursor:pointer; }
.sa-btn-ghost { padding:.5rem .875rem;background:transparent;border:none;color:#64748b;font-size:.8rem;cursor:pointer; }
.sa-btn-ghost:hover { color:#94a3b8; }
.sa-error { font-size:.72rem;color:#f87171;margin-top:.375rem; }
.sa-hint { font-size:.7rem;color:#64748b;margin-top:.5rem;line-height:1.4; }
.sa-clone-box { padding-top:.5rem;border-top:1px solid rgba(255,255,255,.06); }

.sa-preset-grid { display:grid;grid-template-columns:1fr;gap:1.5rem; }
@media(min-width:600px) { .sa-preset-grid { grid-template-columns:1fr 1fr; } }
.sa-section-label { font-size:.72rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.75rem; }
.sa-feature-row { display:flex;align-items:center;justify-content:space-between;padding:.5rem .625rem;border-radius:7px;background:rgba(255,255,255,.03);cursor:pointer; }
.sa-feature-row:hover { background:rgba(255,255,255,.05); }
.sa-feature-label { font-size:.78rem;color:#94a3b8; }
.sa-code-input { width:100%;padding:.625rem .75rem;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-family:monospace;font-size:.72rem;color:#a5b4fc;resize:vertical; }
.sa-code-input:focus { outline:none;border-color:#6366f1; }
.sa-template-row { display:flex;align-items:center;gap:.4rem;margin-bottom:.4rem; }

.modal-enter-active,.modal-leave-active { transition:all .2s ease; }
.modal-enter-from,.modal-leave-to { opacity:0;transform:scale(.97); }
</style>
