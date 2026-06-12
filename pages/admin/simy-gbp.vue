<template>
  <div class="min-h-screen bg-gray-50/60 p-4 sm:p-6">
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold text-gray-900">simy.ch — Google Business Profile</h1>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Super Admin</span>
          </div>
          <p class="text-sm text-gray-500">Verwalte das GBP von Simy IT Systems direkt</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-24" />

      <!-- Not connected -->
      <div v-else-if="!status?.connected" class="bg-white rounded-2xl p-6 border border-gray-100">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold text-gray-900 mb-1">simy.ch GBP noch nicht verbunden</h2>
            <p class="text-sm text-gray-500 mb-4">Verbinde das Google-Konto von Simy IT Systems.</p>
            <a href="/api/gbp/admin/start" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors">
              Mit Google verbinden
            </a>
          </div>
        </div>
      </div>

      <!-- Connected -->
      <template v-else>

        <!-- Status bar -->
        <div class="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-3">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0"></span>
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ status.locationName || 'Simy IT Systems' }}</p>
            <p class="text-xs text-gray-400">{{ status.email }} · Verbunden {{ formatDate(status.connectedAt) }}</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
            :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
            {{ tab.label }}
          </button>
        </div>

        <!-- Insights -->
        <div v-if="activeTab === 'insights'">
          <div v-if="insightsLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-24" />
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div v-for="m in insightMetrics" :key="m.label" class="bg-white rounded-2xl p-5 border border-gray-100">
              <p class="text-2xl font-bold text-gray-900">{{ m.value.toLocaleString('de-CH') }}</p>
              <p class="text-xs text-gray-400 mt-1 font-medium">{{ m.label }}</p>
              <p class="text-xs text-gray-300 mt-0.5">letzte 28 Tage</p>
            </div>
          </div>
        </div>

        <!-- Posts -->
        <div v-if="activeTab === 'posts'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <p class="text-sm font-semibold text-gray-900">Neuer Post für simy.ch</p>
            <textarea v-model="newPost.summary" rows="4" placeholder="Was möchtest du teilen?" maxlength="1500"
              class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">{{ newPost.summary.length }}/1500</span>
              <button @click="publishPost" :disabled="!newPost.summary.trim() || postPublishing"
                class="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
                {{ postPublishing ? 'Veröffentlichen…' : 'Jetzt veröffentlichen' }}
              </button>
            </div>
          </div>
          <div v-for="post in posts" :key="post.name" class="bg-white rounded-2xl p-5 border border-gray-100">
            <p class="text-sm text-gray-700">{{ post.summary }}</p>
            <p class="text-xs text-gray-400 mt-2">{{ formatDate(post.createTime) }}</p>
          </div>
        </div>

        <!-- Reviews -->
        <div v-if="activeTab === 'reviews'" class="space-y-3">
          <div v-if="reviewsLoading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-28" />
          </div>
          <div v-else v-for="review in reviews" :key="review.reviewId" class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ review.reviewer?.displayName || 'Anonym' }}</p>
                <div class="flex mt-0.5">
                  <svg v-for="i in 5" :key="i" :class="['w-3.5 h-3.5', i <= starRating(review.starRating) ? 'text-yellow-400' : 'text-gray-200']" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
              </div>
              <span class="text-xs text-gray-400">{{ formatDate(review.updateTime) }}</span>
            </div>
            <p v-if="review.comment" class="text-sm text-gray-600">{{ review.comment }}</p>
            <div v-if="review.reviewReply" class="bg-gray-50 rounded-xl p-3 border-l-2 border-purple-200">
              <p class="text-xs font-semibold text-gray-500 mb-1">Simy's Antwort</p>
              <p class="text-sm text-gray-600">{{ review.reviewReply.comment }}</p>
            </div>
            <div v-else>
              <div v-if="replyingTo === review.reviewId" class="space-y-2">
                <textarea v-model="replyText" rows="3" placeholder="Antwort schreiben…"
                  class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                <div class="flex gap-2">
                  <button @click="submitReply(review.reviewId)" :disabled="replying"
                    class="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
                    {{ replying ? 'Senden…' : 'Antworten' }}
                  </button>
                  <button @click="generateAiReply(review)" :disabled="aiReplying === review.reviewId"
                    class="px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 text-xs font-semibold hover:bg-purple-50 disabled:opacity-50 transition-colors">
                    {{ aiReplying === review.reviewId ? 'KI schreibt…' : '✦ KI-Vorschlag' }}
                  </button>
                  <button @click="replyingTo = null" class="px-3 py-1.5 rounded-lg text-gray-500 text-xs hover:bg-gray-100 transition-colors">Abbrechen</button>
                </div>
              </div>
              <div v-else class="flex gap-3">
                <button @click="replyingTo = review.reviewId; replyText = ''" class="text-xs text-purple-600 hover:text-purple-700 font-medium">Antworten</button>
                <button @click="replyingTo = review.reviewId; generateAiReply(review)" class="text-xs text-gray-400 hover:text-gray-600 font-medium">✦ KI-Antwort</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Photos -->
        <div v-if="activeTab === 'photos'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <p class="text-sm font-semibold text-gray-900">Foto hochladen</p>
            <div class="flex gap-3">
              <input type="file" ref="fileInput" accept="image/jpeg,image/png,image/webp" @change="onFileChange" class="hidden" />
              <button @click="(fileInput as any)?.click()" class="px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors">
                {{ selectedFile ? selectedFile.name : 'Datei auswählen…' }}
              </button>
              <select v-model="photoCategory" class="text-sm rounded-xl border border-gray-200 px-3 py-2">
                <option value="INTERIOR">Innen</option>
                <option value="EXTERIOR">Aussen</option>
                <option value="LOGO">Logo</option>
                <option value="COVER">Titelbild</option>
              </select>
            </div>
            <button @click="uploadPhoto" :disabled="!selectedFile || photoUploading"
              class="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
              {{ photoUploading ? 'Hochladen…' : 'Zu GBP hochladen' }}
            </button>
            <p v-if="photoResult" class="text-xs text-green-600">{{ photoResult }}</p>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'simy.ch GBP — Super Admin' })

const tabs = [
  { id: 'insights', label: 'Insights' },
  { id: 'reviews', label: 'Bewertungen' },
  { id: 'posts', label: 'Posts' },
  { id: 'photos', label: 'Fotos' },
]
const activeTab = ref('insights')

// Status
const loading = ref(true)
const status = ref<any>(null)

// Insights
const insightsLoading = ref(false)
const insightMetrics = ref<{ label: string; value: number }[]>([])

// Reviews
const reviews = ref<any[]>([])
const reviewsLoading = ref(false)
const replyingTo = ref<string | null>(null)
const replyText = ref('')
const replying = ref(false)
const aiReplying = ref<string | null>(null)

// Posts
const posts = ref<any[]>([])
const newPost = ref({ summary: '' })
const postPublishing = ref(false)

// Photos
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const photoCategory = ref('INTERIOR')
const photoUploading = ref(false)
const photoResult = ref('')

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
}

async function loadStatus() {
  loading.value = true
  try {
    status.value = await $fetch('/api/gbp/admin/status')
    if (status.value?.connected) {
      loadInsights()
      loadReviews()
      loadPosts()
    }
  } catch { status.value = { connected: false } }
  finally { loading.value = false }
}

async function loadInsights() {
  insightsLoading.value = true
  try {
    const data = await $fetch<any>('/api/gbp/admin/insights')
    const series = data.insights?.multiDailyMetricTimeSeries ?? []
    const sum = (m: string) => (series.find((s: any) => s.dailyMetric === m)?.timeSeries?.datedValues ?? [])
      .reduce((acc: number, v: any) => acc + (parseInt(v.value) || 0), 0)
    insightMetrics.value = [
      { label: 'Profilaufrufe', value: sum('BUSINESS_IMPRESSIONS_MOBILE_MAPS') + sum('BUSINESS_IMPRESSIONS_DESKTOP_MAPS') },
      { label: 'Website-Klicks', value: sum('WEBSITE_CLICKS') },
      { label: 'Anrufe', value: sum('CALL_CLICKS') },
      { label: 'Routenanfragen', value: sum('BUSINESS_DIRECTION_REQUESTS') },
    ]
  } catch { /* ignore */ } finally { insightsLoading.value = false }
}

async function loadReviews() {
  reviewsLoading.value = true
  try {
    const data = await $fetch<any>('/api/gbp/admin/reviews')
    reviews.value = data.reviews ?? []
  } catch { /* ignore */ } finally { reviewsLoading.value = false }
}

async function loadPosts() {
  try {
    const data = await $fetch<any>('/api/gbp/admin/posts')
    posts.value = data.posts ?? []
  } catch { /* ignore */ }
}

async function publishPost() {
  postPublishing.value = true
  try {
    await $fetch('/api/gbp/admin/posts', { method: 'POST', body: { summary: newPost.value.summary } })
    newPost.value.summary = ''
    await loadPosts()
  } catch (e: any) { alert(e?.data?.statusMessage || 'Fehler') }
  finally { postPublishing.value = false }
}

async function generateAiReply(review: any) {
  aiReplying.value = review.reviewId
  try {
    const data = await $fetch<any>('/api/gbp/admin/reviews/ai-reply', {
      method: 'POST',
      body: { reviewText: review.comment ?? '', reviewerName: review.reviewer?.displayName ?? '', starRating: starRating(review.starRating), businessName: 'Simy IT Systems' },
    })
    replyText.value = data.suggestedReply
  } catch { /* ignore */ } finally { aiReplying.value = null }
}

async function submitReply(reviewId: string) {
  replying.value = true
  try {
    await $fetch('/api/gbp/admin/reviews/reply', { method: 'POST', query: { reviewId }, body: { comment: replyText.value } })
    replyingTo.value = null
    await loadReviews()
  } catch (e: any) { alert(e?.data?.statusMessage || 'Fehler') }
  finally { replying.value = false }
}

async function uploadPhoto() {
  if (!selectedFile.value) return
  photoUploading.value = true
  photoResult.value = ''
  try {
    const form = new FormData()
    form.append('file', selectedFile.value)
    form.append('category', photoCategory.value)
    await $fetch('/api/gbp/admin/photos', { method: 'POST', body: form })
    photoResult.value = 'Foto erfolgreich hochgeladen!'
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (e: any) { alert(e?.data?.statusMessage || 'Upload fehlgeschlagen') }
  finally { photoUploading.value = false }
}

function starRating(r: string) { return { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r] ?? 0 }
function formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString('de-CH') : '' }

watch(activeTab, (tab) => {
  if (tab === 'insights' && !insightMetrics.value.length) loadInsights()
  if (tab === 'reviews' && !reviews.value.length) loadReviews()
  if (tab === 'posts' && !posts.value.length) loadPosts()
})

const route = useRoute()
onMounted(async () => {
  await loadStatus()
  if (route.query.gbp === 'connected') useRouter().replace('/admin/simy-gbp')
})
</script>
