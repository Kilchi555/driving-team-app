<template>
  <div>
    <div class="sa-page-header">
      <div>
        <h1 class="sa-page-title">Vercel Error Reviews</h1>
        <p class="sa-page-sub">Tägliche Zusammenfassung von Vercel Errors &amp; Warnings der letzten 24h</p>
      </div>
      <div class="flex gap-2">
        <button @click="loadReviews" :disabled="isLoading" class="sa-btn-primary">
          <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div v-if="accessDenied" class="sa-card sa-empty">
      Kein Zugriff – diese Ansicht ist Super-Admins vorbehalten.
    </div>

    <template v-else>
      <div class="sa-filter-bar">
        <select v-model="statusFilter" class="sa-select" @change="loadReviews">
          <option value="">Alle Status</option>
          <option value="open">Offen</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Verworfen</option>
        </select>
      </div>

      <div class="sa-card">
        <div v-if="isLoading" class="sa-loading"><div class="sa-spinner" /><p>Wird geladen…</p></div>
        <div v-else-if="reviews.length === 0" class="sa-empty">Keine Reviews vorhanden</div>
        <div v-else class="sa-table-wrap">
          <table class="sa-table">
            <thead>
              <tr><th>Zeitraum</th><th>Errors</th><th>Warnings</th><th>Status</th><th class="text-right">Details</th></tr>
            </thead>
            <tbody>
              <tr v-for="review in reviews" :key="review.id" class="cursor-pointer" @click="openDetail(review)">
                <td class="sa-cell-muted font-mono text-xs">{{ formatDateTime(review.period_start) }} – {{ formatDateTime(review.period_end) }}</td>
                <td><span class="sa-badge sa-badge-red">{{ review.error_count }}</span></td>
                <td><span class="sa-badge sa-badge-amber">{{ review.warning_count }}</span></td>
                <td>
                  <select v-model="review.status" @click.stop @change="updateStatus(review)" :class="['sa-status-select',
                    review.status === 'open' ? 'sa-status-open' :
                    review.status === 'reviewed' ? 'sa-status-fixed' : 'sa-status-ignore']">
                    <option value="open">Offen</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="dismissed">Verworfen</option>
                  </select>
                </td>
                <td class="text-right">
                  <button @click.stop="openDetail(review)" class="sa-action-btn">Details</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedReview" class="sa-modal-backdrop" @click.self="selectedReview = null">
          <div class="sa-modal">
            <div class="sa-modal-header">
              <div class="flex items-center justify-between">
                <h2 class="sa-modal-title">Review Details</h2>
                <button @click="selectedReview = null" class="sa-modal-close">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div class="sa-modal-body space-y-4">
              <div v-if="isLoadingDetail" class="sa-loading"><div class="sa-spinner" /></div>
              <template v-else>
                <div>
                  <p class="sa-label mb-1">Top Issues</p>
                  <div v-for="(issue, idx) in selectedReview.top_issues" :key="idx" class="sa-code-block mb-2">
                    <div class="flex items-center justify-between">
                      <span :class="['sa-badge', issue.level === 'error' ? 'sa-badge-red' : 'sa-badge-amber']">{{ issue.count }}×</span>
                      <span v-if="issue.status_code" class="text-xs font-mono text-slate-400">{{ issue.status_code }}</span>
                    </div>
                    <p v-if="issue.path" class="text-xs font-mono text-slate-300 mt-1">{{ issue.path }}</p>
                    <p class="text-xs text-slate-400 mt-1 break-words">{{ issue.message }}</p>
                  </div>
                </div>
                <div v-if="detailEvents.length > 0">
                  <p class="sa-label mb-1">Einzelereignisse ({{ detailEvents.length }})</p>
                  <div class="sa-code-block max-h-64 overflow-auto">
                    <div v-for="ev in detailEvents" :key="ev.id" class="text-xs text-slate-400 py-1 border-b border-white/5 last:border-0">
                      <span class="font-mono">{{ formatDateTime(ev.occurred_at) }}</span> ·
                      <span :class="ev.level === 'error' ? 'text-rose-400' : 'text-amber-400'">{{ ev.level }}</span>
                      <span v-if="ev.status_code"> · {{ ev.status_code }}</span>
                      <span v-if="ev.path"> · {{ ev.path }}</span>
                    </div>
                  </div>
                </div>
              </template>
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

const isLoading = ref(false)
const isLoadingDetail = ref(false)
const reviews = ref<any[]>([])
const detailEvents = ref<any[]>([])
const selectedReview = ref<any>(null)
const accessDenied = ref(false)
const statusFilter = ref('')

const formatDateTime = (d: string) => new Date(d).toLocaleString('de-CH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const loadReviews = async () => {
  isLoading.value = true
  accessDenied.value = false
  try {
    const r = await $fetch<any>('/api/super-admin/vercel-log-reviews', {
      params: { status: statusFilter.value || undefined }
    })
    if (r?.success) reviews.value = r.data.reviews || []
  } catch (e: any) {
    if (e?.statusCode === 401 || e?.statusCode === 403) accessDenied.value = true
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const openDetail = async (review: any) => {
  selectedReview.value = review
  isLoadingDetail.value = true
  detailEvents.value = []
  try {
    const r = await $fetch<any>(`/api/super-admin/vercel-log-reviews/${review.id}`)
    if (r?.success) {
      selectedReview.value = r.data.review
      detailEvents.value = r.data.events || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoadingDetail.value = false
  }
}

const updateStatus = async (review: any) => {
  try {
    await $fetch('/api/super-admin/vercel-log-review-status', {
      method: 'POST',
      body: { reviewId: review.id, status: review.status }
    })
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => loadReviews())
</script>

<style scoped>
.sa-page-header { display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;gap:1rem; }
.sa-page-title  { font-size:1.75rem;font-weight:800;color:#f1f5f9;letter-spacing:-.03em; }
.sa-page-sub    { font-size:.85rem;color:#64748b;margin-top:.25rem; }
.sa-btn-primary { display:inline-flex;align-items:center;gap:.375rem;padding:.5rem 1rem;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;font-size:.8rem;font-weight:600;border-radius:8px;border:none;cursor:pointer; }

.sa-filter-bar { display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.25rem;align-items:center; }
.sa-select { padding:.4rem .75rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;font-size:.78rem;border-radius:7px;cursor:pointer; }
.sa-select option { background:#1e2130; }

.sa-card { background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden; }

.sa-table-wrap { overflow-x:auto; }
.sa-table { width:100%;border-collapse:collapse; }
.sa-table th { padding:.625rem .875rem;text-align:left;font-size:.7rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.2); }
.sa-table td { padding:.75rem .875rem;font-size:.78rem;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,.04); }
.sa-table tr:last-child td { border-bottom:none; }
.sa-table tr:hover td { background:rgba(255,255,255,.025); }
.sa-cell-muted { color:#64748b!important; }

.sa-badge { display:inline-flex;align-items:center;padding:.15rem .55rem;border-radius:999px;font-size:.68rem;font-weight:600; }
.sa-badge-red    { background:rgba(239,68,68,.1); color:#fca5a5;border:1px solid rgba(239,68,68,.2); }
.sa-badge-amber  { background:rgba(245,158,11,.1);color:#fcd34d;border:1px solid rgba(245,158,11,.2); }

.sa-status-select { padding:.15rem .375rem;border-radius:6px;font-size:.7rem;font-weight:600;border:none;cursor:pointer; }
.sa-status-open   { background:rgba(245,158,11,.15); color:#fcd34d; }
.sa-status-fixed  { background:rgba(16,185,129,.15); color:#6ee7b7; }
.sa-status-ignore { background:rgba(100,116,139,.1); color:#94a3b8; }

.sa-action-btn { font-size:.72rem;font-weight:500;color:#6366f1;background:none;border:none;cursor:pointer; }
.sa-action-btn:hover { color:#a5b4fc; }

.sa-modal-backdrop { position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1.5rem; }
.sa-modal { background:#141620;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:640px;max-height:85vh;overflow-y:auto;box-shadow:0 40px 80px rgba(0,0,0,.5); }
.sa-modal-header { padding:1.5rem 1.5rem .75rem; }
.sa-modal-title  { font-size:1rem;font-weight:700;color:#f1f5f9; }
.sa-modal-close  { color:#64748b;background:none;border:none;cursor:pointer; }
.sa-modal-close:hover { color:#94a3b8; }
.sa-modal-body   { padding:1rem 1.5rem 1.5rem; }
.sa-label { font-size:.72rem;font-weight:500;color:#64748b; }
.sa-code-block { background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:.75rem; }

.sa-loading { display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:3rem;color:#64748b;font-size:.8rem; }
.sa-spinner { width:32px;height:32px;border:3px solid rgba(99,102,241,.2);border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.sa-empty { text-align:center;padding:3rem;color:#475569;font-size:.8rem; }

.modal-enter-active,.modal-leave-active { transition:all .2s ease; }
.modal-enter-from,.modal-leave-to { opacity:0;transform:scale(.97); }
</style>
