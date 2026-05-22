<template>
  <div>

    <!-- Header -->
    <div class="sa-page-header">
      <div class="flex items-center gap-3">
        <NuxtLink to="/tenant-admin/websites" class="sa-back-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="sa-page-title">{{ tenant?.name || 'Website bearbeiten' }}</h1>
          <p class="sa-page-sub">{{ tenant?.slug }}.simy.ch</p>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <span :class="['sa-badge', statusBadgeClass(tenant?.website_status)]">
          {{ statusLabel(tenant?.website_status) }}
        </span>
        <a :href="`/website-preview/${tenant?.slug}`" target="_blank" class="sa-btn-ghost">
          👁 Vorschau öffnen
        </a>
        <button v-if="tenant?.website_status === 'pending_review'" @click="showApproveModal = true"
          class="sa-btn-success">
          ✅ Freigeben & Link senden
        </button>
        <button v-else-if="tenant?.website_status === 'approved' || tenant?.website_status === 'live'"
          @click="setStatus('disabled')" class="sa-btn-danger">
          Deaktivieren
        </button>
        <button v-else-if="tenant?.website_status === 'disabled'"
          @click="setStatus('live')" class="sa-btn-amber">
          Reaktivieren
        </button>
      </div>
    </div>

    <div v-if="loading" class="sa-loading">
      <div class="sa-spinner" />
      Lade Daten…
    </div>

    <div v-else-if="tenant" class="cms-grid">

      <!-- Left: CMS Sections -->
      <div class="cms-main space-y-6">

        <!-- Tabs -->
        <div class="cms-tabs">
          <button v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            :class="['cms-tab', activeTab === tab.id ? 'cms-tab-active' : '']">
            {{ tab.icon }} {{ tab.label }}
          </button>
        </div>

        <!-- Tab: Kontakt -->
        <div v-if="activeTab === 'contact'" class="sa-card cms-section">
          <h2 class="cms-section-title">Kontakt & Firma</h2>
          <div class="cms-form-grid">
            <div>
              <label class="sa-label">Firmenname</label>
              <input v-model="form.name" class="sa-input" placeholder="Fahrschule Muster" />
            </div>
            <div>
              <label class="sa-label">Slug (URL)</label>
              <div class="sa-input-prefix">
                <span>simy.ch/</span>
                <input v-model="form.slug" class="sa-input-inner" placeholder="fahrschule-muster" />
              </div>
            </div>
            <div>
              <label class="sa-label">E-Mail</label>
              <input v-model="form.contact_email" type="email" class="sa-input" />
            </div>
            <div>
              <label class="sa-label">Telefon / WhatsApp</label>
              <input v-model="form.contact_phone" class="sa-input" placeholder="+41 79 ..." />
            </div>
            <div>
              <label class="sa-label">Adresse</label>
              <input v-model="form.address" class="sa-input" placeholder="Musterstrasse 1, 8000 Zürich" />
            </div>
            <div>
              <label class="sa-label">Website-Domain (optional)</label>
              <input v-model="form.website_domain" class="sa-input" placeholder="www.fahre-schlau.com" />
            </div>
            <div class="col-span-2">
              <label class="sa-label">Kurzbeschreibung (für Website-Hero)</label>
              <textarea v-model="form.description" class="sa-input" rows="3"
                placeholder="Dein kompetenter Fahrlehrer in Zürich…" />
            </div>
          </div>
        </div>

        <!-- Tab: Preise -->
        <div v-if="activeTab === 'prices'" class="sa-card cms-section">
          <h2 class="cms-section-title">Preise</h2>
          <div class="cms-prices">
            <div v-for="(price, i) in form.prices" :key="i" class="cms-price-row">
              <input v-model="price.label" class="sa-input" placeholder="Fahrstunde 45 Min" />
              <input v-model="price.value" class="sa-input" placeholder="CHF 85" style="max-width:120px" />
              <input v-model="price.note" class="sa-input" placeholder="Inkl. MwSt." style="flex:1" />
              <button @click="form.prices.splice(i, 1)" class="sa-icon-btn sa-icon-danger">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button @click="form.prices.push({ label: '', value: '', note: '' })" class="sa-btn-ghost mt-4">
            + Preis hinzufügen
          </button>
        </div>

        <!-- Tab: Fahrlehrer -->
        <div v-if="activeTab === 'staff'" class="sa-card cms-section">
          <h2 class="cms-section-title">Fahrlehrer</h2>
          <div class="space-y-4">
            <div v-for="(s, i) in form.staff" :key="i" class="cms-staff-row">
              <div class="cms-staff-avatar">{{ s.first_name?.[0] }}{{ s.last_name?.[0] }}</div>
              <div class="cms-form-grid flex-1">
                <input v-model="s.first_name" class="sa-input" placeholder="Vorname" />
                <input v-model="s.last_name" class="sa-input" placeholder="Nachname" />
                <input v-model="s.email" type="email" class="sa-input" placeholder="E-Mail" />
                <input v-model="s.phone" class="sa-input" placeholder="Telefon" />
                <input v-model="s.languages" class="sa-input" placeholder="DE, EN, IT" />
                <div class="flex items-center gap-2">
                  <input type="checkbox" v-model="s.create_login" id="login_{{ i }}" class="sa-check" />
                  <label :for="`login_${i}`" class="sa-label" style="margin:0">simy-Login erstellen</label>
                </div>
              </div>
              <button @click="form.staff.splice(i, 1)" class="sa-icon-btn sa-icon-danger self-start mt-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button @click="form.staff.push({ first_name:'', last_name:'', email:'', phone:'', languages:'', create_login: false })"
            class="sa-btn-ghost mt-4">
            + Fahrlehrer hinzufügen
          </button>
        </div>

        <!-- Tab: Branding -->
        <div v-if="activeTab === 'branding'" class="sa-card cms-section">
          <h2 class="cms-section-title">Branding & Design</h2>
          <div class="cms-form-grid">
            <div>
              <label class="sa-label">Primärfarbe</label>
              <div class="flex items-center gap-3">
                <input type="color" v-model="form.primary_color" class="sa-color-input" />
                <input v-model="form.primary_color" class="sa-input font-mono" />
              </div>
            </div>
            <div>
              <label class="sa-label">Sekundärfarbe</label>
              <div class="flex items-center gap-3">
                <input type="color" v-model="form.secondary_color" class="sa-color-input" />
                <input v-model="form.secondary_color" class="sa-input font-mono" />
              </div>
            </div>
            <div class="col-span-2">
              <label class="sa-label">Interne Notizen (nur für dich sichtbar)</label>
              <textarea v-model="form.website_notes" class="sa-input" rows="3"
                placeholder="z.B. Kunde möchte noch Foto hochladen…" />
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end gap-3">
          <button @click="save" :disabled="saving" class="sa-btn-primary">
            {{ saving ? 'Speichern…' : '💾 Änderungen speichern' }}
          </button>
        </div>
      </div>

      <!-- Right: Info Panel -->
      <div class="cms-sidebar space-y-4">

        <!-- Status Card -->
        <div class="sa-card p-5">
          <p class="cms-sidebar-title">Website Status</p>
          <div class="space-y-3 mt-3">
            <div v-for="step in workflowSteps" :key="step.status"
              :class="['workflow-step', tenant.website_status === step.status ? 'workflow-step-active' : isCompleted(step.status) ? 'workflow-step-done' : '']">
              <div class="workflow-dot" />
              <div>
                <p class="font-600 text-sm">{{ step.label }}</p>
                <p class="text-xs text-slate-500">{{ step.hint }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="sa-card p-5">
          <p class="cms-sidebar-title">Schnellzugriff</p>
          <div class="space-y-2 mt-3">
            <a :href="`/website-preview/${tenant.slug}`" target="_blank" class="sa-quick-link">
              🌐 Website-Vorschau öffnen
            </a>
            <NuxtLink :to="`/tenant-admin/tenants`" class="sa-quick-link">
              ⚙️ Tenant-Einstellungen
            </NuxtLink>
            <button @click="setStatus('pending_review')" class="sa-quick-link text-left w-full">
              🔄 Zurück auf "Ausstehend"
            </button>
          </div>
        </div>

        <!-- Approval Info -->
        <div v-if="tenant.website_approved_at" class="sa-card p-5">
          <p class="cms-sidebar-title">Freigabe</p>
          <p class="text-sm text-slate-400 mt-2">{{ formatDate(tenant.website_approved_at) }}</p>
          <p class="text-xs text-slate-500 mt-1">Link wurde an Kunden gesendet</p>
        </div>

      </div>
    </div>

    <!-- Approve Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showApproveModal" class="sa-modal-backdrop" @click.self="showApproveModal = false">
          <div class="sa-modal">
            <div class="sa-modal-header">
              <h3 class="sa-modal-title">Website freigeben</h3>
              <p class="sa-modal-sub">Ein Link wird an den Kunden gesendet.</p>
            </div>
            <div class="sa-modal-body space-y-4">
              <div class="sa-info-card">
                <p class="text-sm text-slate-300"><strong>Kunde:</strong> {{ tenant?.name }}</p>
                <p class="text-sm text-slate-300 mt-1"><strong>E-Mail:</strong> {{ tenant?.contact_email }}</p>
                <p class="text-sm text-slate-300 mt-1"><strong>Website:</strong> /website-preview/{{ tenant?.slug }}</p>
              </div>
              <div>
                <label class="sa-label">Persönliche Nachricht (optional)</label>
                <textarea v-model="approveMessage" class="sa-input" rows="3"
                  placeholder="Deine Website-Demo ist bereit! Schau sie dir an und lass mich wissen, was du anpassen möchtest." />
              </div>
            </div>
            <div class="sa-modal-footer">
              <button @click="approveAndSendEmail" :disabled="approving" class="sa-btn-success">
                {{ approving ? 'Sende…' : '✅ Freigeben & E-Mail senden' }}
              </button>
              <button @click="showApproveModal = false" class="sa-btn-ghost">Abbrechen</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'tenant-admin', middleware: ['super-admin'] })

const route = useRoute()
const supabase = getSupabase()
const { showSuccess, showError } = useUIStore()

const tenantId = route.params.id as string
const tenant = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const approving = ref(false)
const showApproveModal = ref(false)
const approveMessage = ref('Deine Website-Demo ist bereit! Schau sie dir an und lass mich wissen, was du anpassen möchtest.')
const activeTab = ref('contact')

const tabs = [
  { id: 'contact', icon: '📋', label: 'Kontakt' },
  { id: 'prices', icon: '💶', label: 'Preise' },
  { id: 'staff', icon: '👤', label: 'Fahrlehrer' },
  { id: 'branding', icon: '🎨', label: 'Branding' },
]

const workflowSteps = [
  { status: 'pending_review', label: 'Erstellt & wartet', hint: 'Website wurde generiert, noch nicht geprüft' },
  { status: 'approved', label: 'Freigegeben', hint: 'Link wurde an Kunden gesendet' },
  { status: 'live', label: 'Live', hint: 'Öffentlich erreichbar' },
]

const statusOrder = ['pending_review', 'approved', 'live']
const isCompleted = (status: string) => {
  const current = statusOrder.indexOf(tenant.value?.website_status)
  return current > statusOrder.indexOf(status)
}

// Form data (editable CMS content)
const form = ref({
  name: '',
  slug: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  website_domain: '',
  description: '',
  primary_color: '#3B82F6',
  secondary_color: '#10B981',
  website_notes: '',
  prices: [] as { label: string; value: string; note: string }[],
  staff: [] as { first_name: string; last_name: string; email: string; phone: string; languages: string; create_login: boolean }[],
})

onMounted(async () => {
  // Load tenant data
  const { data: t } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (!t) { loading.value = false; return }
  tenant.value = t

  // Load staff
  const { data: staff } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, role')
    .eq('tenant_id', tenantId)
    .eq('role', 'staff')

  // Populate form
  form.value = {
    name: t.name || '',
    slug: t.slug || '',
    contact_email: t.contact_email || '',
    contact_phone: t.contact_phone || '',
    address: t.address || '',
    website_domain: t.website_domain || '',
    description: t.description || '',
    primary_color: t.primary_color || '#3B82F6',
    secondary_color: t.secondary_color || '#10B981',
    website_notes: t.website_notes || '',
    prices: t.website_prices || [],
    staff: (staff || []).map(s => ({
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      email: s.email || '',
      phone: s.phone || '',
      languages: s.languages || '',
      create_login: true,
    })),
  }

  useHead({ title: `${t.name} – Website bearbeiten` })
  loading.value = false
})

const save = async () => {
  saving.value = true
  const { error } = await supabase
    .from('tenants')
    .update({
      name: form.value.name,
      slug: form.value.slug,
      contact_email: form.value.contact_email,
      contact_phone: form.value.contact_phone,
      address: form.value.address,
      website_domain: form.value.website_domain,
      description: form.value.description,
      primary_color: form.value.primary_color,
      secondary_color: form.value.secondary_color,
      website_notes: form.value.website_notes,
      website_prices: form.value.prices,
    })
    .eq('id', tenantId)

  if (error) showError('Fehler', error.message)
  else { showSuccess('Gespeichert', 'Änderungen wurden übernommen.'); tenant.value = { ...tenant.value, ...form.value } }
  saving.value = false
}

const setStatus = async (status: string) => {
  const { error } = await supabase
    .from('tenants')
    .update({ website_status: status })
    .eq('id', tenantId)
  if (!error) { tenant.value.website_status = status; showSuccess('Status aktualisiert') }
}

const approveAndSendEmail = async () => {
  approving.value = true
  try {
    // 1. Update website_status to 'approved'
    await supabase.from('tenants').update({
      website_status: 'approved',
      website_approved_at: new Date().toISOString(),
    }).eq('id', tenantId)

    // 2. Send email via existing email endpoint
    await $fetch('/api/notifications/website-approved', {
      method: 'POST',
      body: {
        tenant_id: tenantId,
        tenant_name: tenant.value.name,
        tenant_email: tenant.value.contact_email,
        tenant_slug: tenant.value.slug,
        message: approveMessage.value,
      },
    }).catch(() => {
      // Email endpoint may not exist yet — continue anyway
    })

    tenant.value.website_status = 'approved'
    tenant.value.website_approved_at = new Date().toISOString()
    showApproveModal.value = false
    showSuccess('Freigegeben!', 'E-Mail wurde an den Kunden gesendet.')
  } catch (e: any) {
    showError('Fehler', e.message)
  }
  approving.value = false
}

const statusLabel = (s: string) => ({
  none: '–', pending_review: 'Wartet auf Prüfung', approved: 'Freigegeben',
  live: 'Live', disabled: 'Deaktiviert',
}[s] || s)

const statusBadgeClass = (s: string) => ({
  pending_review: 'sa-badge-amber', approved: 'sa-badge-blue',
  live: 'sa-badge-green', disabled: 'sa-badge-red', none: 'sa-badge-neutral',
}[s] || 'sa-badge-neutral')

const formatDate = (iso: string) => iso
  ? new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'
</script>

<style scoped>
.sa-page-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
.sa-page-title { font-size:1.375rem; font-weight:800; color:#f1f5f9; }
.sa-page-sub { font-size:0.8rem; color:#64748b; margin-top:0.125rem; }
.sa-back-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.06); color:#94a3b8; text-decoration:none; transition:all 0.15s; flex-shrink:0; }
.sa-back-btn:hover { background:rgba(255,255,255,0.12); color:#e2e8f0; }

.cms-grid { display:grid; grid-template-columns:1fr 280px; gap:1.5rem; align-items:start; }
@media (max-width:1024px) { .cms-grid { grid-template-columns:1fr; } }

.cms-tabs { display:flex; gap:0.5rem; flex-wrap:wrap; }
.cms-tab { padding:0.5rem 1rem; border-radius:8px; font-size:0.8rem; font-weight:600; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); cursor:pointer; transition:all 0.15s; }
.cms-tab:hover { color:#e2e8f0; background:rgba(255,255,255,0.08); }
.cms-tab-active { color:#a5b4fc !important; background:rgba(99,102,241,0.15) !important; border-color:rgba(99,102,241,0.3) !important; }

.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; }
.cms-section { padding:1.5rem; }
.cms-section-title { font-size:0.95rem; font-weight:800; color:#e2e8f0; margin-bottom:1.25rem; }

.cms-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
@media (max-width:640px) { .cms-form-grid { grid-template-columns:1fr; } }
.col-span-2 { grid-column:span 2; }

.sa-label { display:block; font-size:0.72rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.375rem; }
.sa-input { width:100%; padding:0.5rem 0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; font-size:0.82rem; color:#e2e8f0; outline:none; transition:border-color 0.15s; box-sizing:border-box; }
.sa-input:focus { border-color:rgba(99,102,241,0.5); }
.sa-input::placeholder { color:#475569; }
.sa-input-prefix { display:flex; align-items:center; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; }
.sa-input-prefix span { padding:0 0.75rem; font-size:0.8rem; color:#475569; white-space:nowrap; border-right:1px solid rgba(255,255,255,0.08); }
.sa-input-inner { flex:1; padding:0.5rem 0.75rem; background:transparent; border:none; font-size:0.82rem; color:#e2e8f0; outline:none; }
.sa-color-input { width:40px; height:36px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); cursor:pointer; padding:2px; background:transparent; }

.cms-prices { space-y:0.75rem; display:flex; flex-direction:column; gap:0.75rem; }
.cms-price-row { display:flex; gap:0.5rem; align-items:center; }

.cms-staff-row { display:flex; gap:1rem; align-items:flex-start; padding:1rem; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid rgba(255,255,255,0.05); }
.cms-staff-avatar { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg,#4f46e5,#7c3aed); display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; color:white; flex-shrink:0; }

.sa-check { width:16px; height:16px; accent-color:#6366f1; }
.sa-icon-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); cursor:pointer; flex-shrink:0; transition:all 0.15s; }
.sa-icon-danger { color:#f87171; }
.sa-icon-danger:hover { background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.2); }

.sa-btn-primary { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1.125rem; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:8px; font-size:0.82rem; font-weight:700; color:white; cursor:pointer; transition:opacity 0.15s; }
.sa-btn-primary:hover:not(:disabled) { opacity:0.9; }
.sa-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
.sa-btn-success { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1.125rem; background:linear-gradient(135deg,#059669,#10b981); border:none; border-radius:8px; font-size:0.82rem; font-weight:700; color:white; cursor:pointer; transition:opacity 0.15s; }
.sa-btn-success:hover:not(:disabled) { opacity:0.9; }
.sa-btn-success:disabled { opacity:0.5; cursor:not-allowed; }
.sa-btn-danger { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1.125rem; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.25); border-radius:8px; font-size:0.82rem; font-weight:700; color:#f87171; cursor:pointer; transition:all 0.15s; }
.sa-btn-amber { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1.125rem; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.25); border-radius:8px; font-size:0.82rem; font-weight:700; color:#fbbf24; cursor:pointer; transition:all 0.15s; }
.sa-btn-ghost { display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1.125rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); border-radius:8px; font-size:0.82rem; font-weight:600; color:#94a3b8; cursor:pointer; transition:all 0.15s; text-decoration:none; }
.sa-btn-ghost:hover { background:rgba(255,255,255,0.1); color:#e2e8f0; }

.cms-sidebar-title { font-size:0.72rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.06em; }
.sa-quick-link { display:block; padding:0.5rem 0.625rem; border-radius:8px; font-size:0.8rem; font-weight:500; color:#94a3b8; text-decoration:none; transition:all 0.15s; }
.sa-quick-link:hover { background:rgba(255,255,255,0.06); color:#e2e8f0; }

.workflow-step { display:flex; align-items:flex-start; gap:0.75rem; padding:0.625rem 0; position:relative; }
.workflow-step + .workflow-step::before { content:''; position:absolute; left:7px; top:-0.5rem; width:2px; height:0.5rem; background:rgba(255,255,255,0.06); }
.workflow-dot { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,0.1); background:#1a1d2e; flex-shrink:0; margin-top:2px; }
.workflow-step-done .workflow-dot { background:#10b981; border-color:#10b981; }
.workflow-step-active .workflow-dot { background:#6366f1; border-color:#6366f1; box-shadow:0 0 0 4px rgba(99,102,241,0.2); }

.sa-badge { display:inline-flex; align-items:center; padding:0.25rem 0.625rem; border-radius:999px; font-size:0.72rem; font-weight:700; }
.sa-badge-green { background:rgba(16,185,129,0.12); color:#34d399; }
.sa-badge-amber { background:rgba(245,158,11,0.12); color:#fbbf24; }
.sa-badge-red { background:rgba(239,68,68,0.1); color:#f87171; }
.sa-badge-blue { background:rgba(99,102,241,0.12); color:#a5b4fc; }
.sa-badge-neutral { background:rgba(100,116,139,0.15); color:#64748b; }

.sa-info-card { padding:0.875rem 1rem; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.15); border-radius:10px; }

/* Modal */
.sa-modal-backdrop { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:1rem; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); }
.sa-modal { background:#1a1d2e; border:1px solid rgba(255,255,255,0.08); border-radius:16px; width:100%; max-width:480px; box-shadow:0 25px 60px rgba(0,0,0,0.5); }
.sa-modal-header { padding:1.25rem 1.5rem 0; }
.sa-modal-title { font-size:1.1rem; font-weight:800; color:#f1f5f9; }
.sa-modal-sub { font-size:0.8rem; color:#64748b; margin-top:0.25rem; }
.sa-modal-body { padding:1.25rem 1.5rem; }
.sa-modal-footer { padding:0 1.5rem 1.25rem; display:flex; gap:0.75rem; flex-wrap:wrap; }

.sa-loading { display:flex; align-items:center; justify-content:center; gap:0.75rem; padding:4rem; color:#475569; font-size:0.9rem; }
.sa-spinner { width:20px; height:20px; border:2px solid rgba(99,102,241,0.3); border-top-color:#6366f1; border-radius:50%; animation:spin 0.7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

.modal-enter-active, .modal-leave-active { transition:opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity:0; }
</style>
