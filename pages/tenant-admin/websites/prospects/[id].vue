<template>
  <div>
    <div class="sa-page-header">
      <div>
        <NuxtLink to="/tenant-admin/websites/prospects" class="sa-back">← Prospects</NuxtLink>
        <h1 class="sa-page-title">{{ prospect?.name || 'Prospect' }}</h1>
        <p class="sa-page-sub">{{ prospect?.city || '—' }} · {{ prospect?.business_type }}</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <span v-if="prospect" :class="['sa-badge', statusBadge(prospect.status)]">{{ statusLabel(prospect.status) }}</span>
        <a v-if="prospect?.existing_url" :href="prospect.existing_url" target="_blank" class="sa-btn-ghost">Ihre Seite</a>
        <a v-if="prospect?.preview_url" :href="prospect.preview_url" target="_blank" class="sa-btn-ghost">Simy-Vorschau</a>
      </div>
    </div>

    <div v-if="loading" class="sa-muted">Lade…</div>
    <div v-else-if="!prospect" class="sa-muted">Nicht gefunden.</div>

    <div v-else class="sa-cols">
      <section class="sa-card sa-pad">
        <h2 class="sa-h2">Scores</h2>
        <div class="sa-kpis">
          <div>
            <div class="sa-kpi">{{ prospect.opportunity_score ?? '—' }}</div>
            <div class="sa-kpi-l">Opportunity</div>
          </div>
          <div>
            <div class="sa-kpi">{{ prospect.seo_score ?? '—' }}</div>
            <div class="sa-kpi-l">SEO</div>
          </div>
          <div>
            <div class="sa-kpi">{{ prospect.speed_score ?? '—' }}</div>
            <div class="sa-kpi-l">Speed</div>
          </div>
          <div>
            <div class="sa-kpi">{{ prospect.freshness_score ?? '—' }}</div>
            <div class="sa-kpi-l">Aktualität</div>
          </div>
        </div>
        <p class="sa-summary">{{ prospect.analysis?.summary }}</p>
        <ul class="sa-findings">
          <li v-for="f in prospect.analysis?.findings || []" :key="f.id">
            <strong :class="f.severity">{{ f.title }}</strong>
            <span>{{ f.detail }}</span>
          </li>
        </ul>
        <p v-if="prospect.pagespeed?.source && prospect.pagespeed.source !== 'psi'" class="sa-hint">
          PageSpeed: {{ prospect.pagespeed.source }}{{ prospect.pagespeed.error ? ` (${prospect.pagespeed.error})` : '' }}
        </p>
        <div v-if="architecture" class="sa-arch">
          <p class="sa-kpi-l">Architektur</p>
          <p class="sa-arch-mode">{{ architecture.mode === 'multi' ? 'Multipager' : 'One-Pager' }}</p>
          <p class="sa-hint">{{ architecture.reason }}</p>
          <ul v-if="architecture.intents?.length" class="sa-arch-pages">
            <li v-for="intent in architecture.intents" :key="intent.slug || intent.title">
              <a
                v-if="addonPreview(intent.slug)"
                :href="addonPreview(intent.slug)"
                target="_blank"
                class="sa-link"
              >{{ intent.title }}</a>
              <span v-else>{{ intent.title }}</span>
              <em>{{ intent.type }}</em>
            </li>
          </ul>
          <p v-if="/Stockfotos:/i.test(prospect.analysis?.summary || '')" class="sa-hint">
            Fehlende Section-Bilder wurden mit passenden Unsplash-Stockfotos gefüllt. Eigene Fotos bleiben.
          </p>
        </div>
      </section>

      <section class="sa-card sa-pad">
        <h2 class="sa-h2">Umsatzrange / Monat</h2>
        <p v-if="prospect.revenue_model" class="sa-money">
          {{ chf(prospect.revenue_model.monthly_low_chf) }} – {{ chf(prospect.revenue_model.monthly_high_chf) }}
        </p>
        <p v-if="prospect.revenue_model" class="sa-hint">
          12 Monate: {{ chf(prospect.revenue_model.yearly_low_chf) }} – {{ chf(prospect.revenue_model.yearly_high_chf) }}
        </p>
        <ul class="sa-assumptions">
          <li v-for="a in prospect.revenue_model?.assumptions || []" :key="a">{{ a }}</li>
        </ul>
      </section>

      <section class="sa-card sa-pad sa-span">
        <h2 class="sa-h2">Vergleich</h2>
        <div class="sa-compare">
          <div>
            <p class="sa-kpi-l">Aktuell</p>
            <a v-if="prospect.existing_url" :href="prospect.existing_url" target="_blank" class="sa-link">{{ prospect.existing_url }}</a>
            <p v-else class="sa-hint">Keine URL</p>
          </div>
          <div>
            <p class="sa-kpi-l">Simy-Vorschau (nicht indexiert)</p>
            <a v-if="prospect.preview_url" :href="localPreview || prospect.preview_url" target="_blank" class="sa-link">{{ localPreview || prospect.preview_url }}</a>
            <div class="mt-2 flex gap-2 flex-wrap">
              <button class="sa-btn-primary" :disabled="generating" @click="generate">
                {{ generating ? 'Baut Seite…' : prospect.preview_url ? 'Erneut generieren' : 'Website jetzt generieren' }}
              </button>
            </div>
            <p v-if="prospect.preview_url" class="sa-hint">
              Baut Home, Extra-Seiten, Fotos und Stock neu. Tenant und URL bleiben.
            </p>
          </div>
        </div>
        <p class="sa-warn">
          Website-Paket (CHF 490 + 19/Mt.): Kontakt und Anfrage. Die Booking-Section (Kalender, freie Termine) geht nur mit Simy Starter ab CHF 49/Mt. — auf der Vorschau bewusst nicht live.
        </p>
        <p v-if="prospect.matched_tenant_id" class="sa-warn">Möglicher bestehender Simy-Tenant: {{ prospect.matched_tenant_id }}</p>
      </section>

      <section class="sa-card sa-pad sa-span">
        <h2 class="sa-h2">Mail-Draft — wird nicht automatisch gesendet</h2>
        <label class="sa-field">
          Betreff
          <input v-model="draft.subject" class="sa-input" />
        </label>
        <label class="sa-field">
          Text
          <textarea v-model="draft.text" rows="16" class="sa-input sa-area" />
        </label>
        <div class="flex gap-2 flex-wrap">
          <button class="sa-btn-ghost" @click="copyText">Text kopieren</button>
          <button class="sa-btn-ghost" :disabled="saving" @click="saveDraft">Draft speichern</button>
          <button class="sa-btn-success" :disabled="saving" @click="setStatus('approved')">Freigeben (nicht senden)</button>
          <button class="sa-btn-ghost" :disabled="saving" @click="setStatus('skipped')">Skip</button>
          <button class="sa-btn-danger" :disabled="saving" @click="setStatus('rejected')">Ablehnen</button>
        </div>
        <p v-if="flash" class="sa-hint">{{ flash }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'tenant-admin', middleware: ['superadmin'] })

const route = useRoute()
const loading = ref(true)
const generating = ref(false)
const saving = ref(false)
const flash = ref('')
const prospect = ref<any>(null)
const draft = reactive({ subject: '', text: '', html: '' })

useHead({ title: computed(() => `${prospect.value?.name || 'Prospect'} – Review`) })

const authHeaders = async () => {
  const sb = getSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

const localPreview = computed(() => {
  const raw = String(prospect.value?.preview_url || '')
  const m = raw.match(/\/s\/[^/?#]+/)
  return m ? `http://127.0.0.1:3000${m[0]}?preview=1` : ''
})

const architecture = computed(() => prospect.value?.analysis?.architecture || null)

const addonPreview = (slug?: string) => {
  if (!slug) return ''
  const raw = String(prospect.value?.preview_url || '')
  const m = raw.match(/\/s\/[^/?#]+/)
  return m ? `http://127.0.0.1:3000${m[0]}/${encodeURIComponent(slug)}?preview=1` : ''
}

const applyProspect = (row: any) => {
  prospect.value = row
  draft.subject = row.email_draft?.subject || ''
  draft.text = row.email_draft?.text || ''
  draft.html = row.email_draft?.html || ''
}

const load = async () => {
  loading.value = true
  try {
    const res = await $fetch<{ prospect: any }>(`/api/tenant-admin/website-prospects/${route.params.id}`, {
      headers: await authHeaders(),
    })
    applyProspect(res.prospect)
  } finally {
    loading.value = false
  }
}

const generate = async () => {
  generating.value = true
  flash.value = ''
  try {
    const res = await $fetch<{ prospect: any }>(`/api/tenant-admin/website-prospects/${route.params.id}/generate`, {
      method: 'POST',
      headers: await authHeaders(),
      timeout: 90_000,
    })
    applyProspect(res.prospect)
    flash.value = 'Neu gebaut — Vorschau hart neu laden.'
  } catch (e: any) {
    flash.value = e?.data?.statusMessage || e?.message || 'Generate fehlgeschlagen'
  } finally {
    generating.value = false
  }
}

const saveDraft = async () => {
  saving.value = true
  try {
    const res = await $fetch<{ prospect: any }>(`/api/tenant-admin/website-prospects/${route.params.id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: { email_draft: { ...draft } },
    })
    applyProspect(res.prospect)
    flash.value = 'Draft gespeichert.'
  } finally {
    saving.value = false
  }
}

const setStatus = async (status: string) => {
  saving.value = true
  try {
    await saveDraft()
    const res = await $fetch<{ prospect: any }>(`/api/tenant-admin/website-prospects/${route.params.id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: { status },
    })
    applyProspect(res.prospect)
    flash.value = `Status: ${statusLabel(status)}`
  } finally {
    saving.value = false
  }
}

const copyText = async () => {
  await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.text}`)
  flash.value = 'In die Zwischenablage kopiert.'
}

const chf = (n?: number) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n)

const statusLabel = (s: string) =>
  ({
    discovered: 'Neu',
    scored: 'Analysiert',
    generated: 'Generiert',
    review: 'Review',
    approved: 'Freigegeben',
    sent: 'Gesendet',
    claimed: 'Claimed',
    skipped: 'Skip',
    rejected: 'Abgelehnt',
  }[s] || s)

const statusBadge = (s: string) =>
  ({
    review: 'sa-badge-amber',
    scored: 'sa-badge-blue',
    approved: 'sa-badge-green',
    generated: 'sa-badge-blue',
    skipped: 'sa-badge-neutral',
    rejected: 'sa-badge-red',
  }[s] || 'sa-badge-neutral')

onMounted(load)
</script>

<style scoped>
.sa-page-header { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem; }
.sa-back { display:inline-block; font-size:0.75rem; color:#818cf8; text-decoration:none; margin-bottom:0.35rem; }
.sa-page-title { font-size:1.375rem; font-weight:800; color:#f1f5f9; }
.sa-page-sub { font-size:0.8rem; color:#64748b; margin-top:0.15rem; }
.sa-cols { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.sa-span { grid-column:1 / -1; }
.sa-card { background:#1a1d2e; border:1px solid rgba(255,255,255,0.06); border-radius:14px; }
.sa-pad { padding:1.15rem 1.25rem; }
.sa-h2 { font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.75rem; }
.sa-kpis { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0.75rem; }
.sa-kpi { font-size:1.5rem; font-weight:800; color:#f1f5f9; font-variant-numeric:tabular-nums; }
.sa-kpi-l { font-size:0.7rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; }
.sa-summary { margin-top:1rem; color:#cbd5e1; font-size:0.88rem; line-height:1.5; }
.sa-findings { margin-top:0.85rem; display:flex; flex-direction:column; gap:0.55rem; }
.sa-findings li { display:flex; flex-direction:column; gap:0.15rem; font-size:0.82rem; color:#94a3b8; }
.sa-findings strong { color:#e2e8f0; }
.sa-findings strong.high { color:#fbbf24; }
.sa-money { font-size:1.45rem; font-weight:800; color:#fbbf24; }
.sa-assumptions { margin-top:0.75rem; color:#94a3b8; font-size:0.78rem; line-height:1.5; display:flex; flex-direction:column; gap:0.35rem; }
.sa-compare { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.sa-link { color:#a5b4fc; font-size:0.82rem; word-break:break-all; }
.sa-hint { color:#64748b; font-size:0.78rem; margin-top:0.5rem; }
.sa-arch { margin-top:1.1rem; padding-top:0.9rem; border-top:1px solid rgba(255,255,255,0.06); }
.sa-arch-mode { font-size:1rem; font-weight:800; color:#f1f5f9; margin-top:0.2rem; }
.sa-arch-pages { margin-top:0.55rem; display:flex; flex-direction:column; gap:0.35rem; }
.sa-arch-pages li { display:flex; gap:0.5rem; align-items:baseline; font-size:0.82rem; color:#cbd5e1; }
.sa-arch-pages em { font-style:normal; color:#64748b; font-size:0.7rem; text-transform:uppercase; }
.sa-warn { margin-top:0.75rem; color:#fbbf24; font-size:0.78rem; }
.sa-muted { color:#64748b; padding:2rem 0; }
.sa-field { display:flex; flex-direction:column; gap:0.35rem; font-size:0.72rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:0.75rem; }
.sa-input { width:100%; padding:0.55rem 0.75rem; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background:#121526; color:#e2e8f0; font-size:0.85rem; }
.sa-area { font-family:ui-monospace,monospace; font-size:0.78rem; line-height:1.45; }
.sa-badge { display:inline-flex; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.7rem; font-weight:700; }
.sa-badge-green { background:rgba(16,185,129,0.12); color:#34d399; }
.sa-badge-amber { background:rgba(245,158,11,0.12); color:#fbbf24; }
.sa-badge-red { background:rgba(239,68,68,0.1); color:#f87171; }
.sa-badge-blue { background:rgba(99,102,241,0.12); color:#a5b4fc; }
.sa-badge-neutral { background:rgba(100,116,139,0.15); color:#64748b; }
.sa-btn-primary, .sa-btn-ghost, .sa-btn-success, .sa-btn-danger {
  padding:0.45rem 0.85rem; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer; border:1px solid transparent; text-decoration:none;
}
.sa-btn-primary { background:linear-gradient(135deg,#4f46e5,#7c3aed); color:white; }
.sa-btn-ghost { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.08); color:#cbd5e1; }
.sa-btn-success { background:rgba(16,185,129,0.15); color:#34d399; }
.sa-btn-danger { background:rgba(239,68,68,0.12); color:#f87171; }
@media (max-width: 900px) {
  .sa-cols, .sa-compare, .sa-kpis { grid-template-columns:1fr 1fr; }
  .sa-span { grid-column:span 1; }
}
</style>
