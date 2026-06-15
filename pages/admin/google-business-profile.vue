<template>
  <div class="min-h-screen bg-gray-50/60 p-4 sm:p-6">
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center gap-4">
        <button @click="$router.back()" class="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900">Google Business Profile</h1>
          <p class="text-sm text-gray-500">Verwalte dein Google-Profil direkt aus dem Dashboard</p>
        </div>
      </div>

      <!-- Connection status -->
      <div v-if="statusLoading" class="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-24" />

      <!-- Feature not enabled — upgrade CTA -->
      <div v-else-if="featureBlocked" class="bg-white rounded-2xl p-8 border border-gray-100 text-center max-w-md mx-auto">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-5">
          <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
          </svg>
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-2">Google Business Profile Add-on</h2>
        <p class="text-sm text-gray-500 mb-6 leading-relaxed">
          Verwalte dein Google Business Profile direkt aus Simy. Beantworte Bewertungen,
          erstelle Posts und sieh Insights — alles an einem Ort.
        </p>
        <ul class="text-left space-y-2 mb-6 max-w-xs mx-auto">
          <li v-for="f in gbpFeatures" :key="f" class="flex items-center gap-2 text-sm text-gray-600">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            {{ f }}
          </li>
        </ul>
        <a href="/admin/billing" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          Add-on aktivieren
        </a>
      </div>

      <!-- OAuth error banner -->
      <div v-if="connectError" class="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div class="flex-1">
          <p class="text-sm font-semibold text-red-800">Verbindung fehlgeschlagen</p>
          <p class="text-xs text-red-600 mt-0.5">{{ connectErrorMsg }}</p>
        </div>
        <button @click="connectError = false" class="text-red-400 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Not connected -->
      <div v-else-if="!status?.connected" class="bg-white rounded-2xl p-6 border border-gray-100">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          </div>
          <div class="flex-1">
            <h2 class="text-base font-semibold text-gray-900 mb-1">Google Business Profile verbinden</h2>
            <p class="text-sm text-gray-500 mb-4 leading-relaxed">
              Verbinde dein Google-Konto um dein Business Profile direkt aus Simy zu verwalten.
              Du kannst Bewertungen beantworten, Posts erstellen und Insights einsehen.
            </p>
            <a
              href="/api/gbp/auth/start"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              Mit Google verbinden
            </a>
          </div>
        </div>
      </div>

      <!-- Connected -->
      <template v-else>

        <!-- Connection info -->
        <div class="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0"></span>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ status.locationName || 'Verbunden' }}</p>
              <p class="text-xs text-gray-400">{{ status.email }} · Verbunden {{ formatDate(status.connectedAt) }}</p>
            </div>
          </div>
          <button
            @click="disconnect"
            :disabled="disconnecting"
            class="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Trennen
          </button>
        </div>

        <!-- No location linked — show picker -->
        <div v-if="!status.locationName" class="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p class="text-sm font-semibold text-amber-900 mb-1">Kein Business Profile verknüpft</p>
          <p class="text-xs text-amber-700 mb-4">Wähle deinen Standort aus, um Bewertungen, Posts und Insights zu sehen.</p>
          <div v-if="accountsLoading" class="text-xs text-amber-600">Lade Business Profile Accounts…</div>
          <div v-else-if="accountsError" class="text-xs text-red-600">{{ accountsError }}</div>
          <div v-else-if="gbpAccounts.length === 0" class="space-y-4">
            <p class="text-xs text-amber-700">
              Die automatische Erkennung erfordert eine freigeschaltete Google API. Trage deine GBP-Daten manuell ein:
            </p>
            <div class="space-y-2">
              <div>
                <label class="text-xs font-medium text-amber-900 block mb-1">Account Name</label>
                <input
                  v-model="manualAccountName"
                  placeholder="accounts/123456789"
                  class="w-full text-sm border border-amber-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p class="text-xs text-amber-600 mt-1">Zu finden unter: business.google.com → URL enthält die Account-ID</p>
              </div>
              <div>
                <label class="text-xs font-medium text-amber-900 block mb-1">Location ID</label>
                <input
                  v-model="manualLocationId"
                  placeholder="locations/123456789012345"
                  class="w-full text-sm border border-amber-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <p class="text-xs text-amber-600 mt-1">Zu finden unter: Google Business Profile Manager → URL der Standort-Seite</p>
              </div>
              <div>
                <label class="text-xs font-medium text-amber-900 block mb-1">Name (optional)</label>
                <input
                  v-model="manualLocationName"
                  placeholder="Driving Team Fahrschule"
                  class="w-full text-sm border border-amber-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                @click="linkManualLocation"
                :disabled="!manualAccountName || !manualLocationId || linkingLocation"
                class="text-sm font-semibold px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-40"
              >
                Manuell verknüpfen
              </button>
            </div>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="location in allLocations"
              :key="location.locationId"
              class="flex items-center justify-between bg-white rounded-xl border border-amber-200 px-4 py-3"
            >
              <div>
                <p class="text-sm font-medium text-gray-900">{{ location.title || location.locationId }}</p>
                <p class="text-xs text-gray-400">{{ location.accountName }}</p>
              </div>
              <button
                @click="linkLocation(location)"
                :disabled="linkingLocation"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                Verknüpfen
              </button>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div v-if="status.locationName" class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >{{ tab.label }}</button>
        </div>


        <!-- Insights tab -->
        <div v-if="status.locationName && activeTab === 'insights'">
          <div v-if="insightsLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-24" />
          </div>
          <div v-else-if="insightsError" class="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <p class="text-sm text-gray-400">{{ insightsError }}</p>
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div v-for="metric in insightMetrics" :key="metric.label" class="bg-white rounded-2xl p-5 border border-gray-100">
              <p class="text-2xl font-bold text-gray-900">{{ metric.value.toLocaleString('de-CH') }}</p>
              <p class="text-xs text-gray-400 mt-1 font-medium">{{ metric.label }}</p>
              <p class="text-xs text-gray-300 mt-0.5">letzte 28 Tage</p>
            </div>
          </div>
        </div>

        <!-- Posts tab -->
        <div v-if="status.locationName && activeTab === 'posts'" class="space-y-4">
          <!-- New post form -->
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <p class="text-sm font-semibold text-gray-900">Neuer Post</p>
            <textarea
              v-model="newPost.summary"
              rows="4"
              placeholder="Was möchtest du teilen? Neues Feature, Angebot, Tipp…"
              class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              maxlength="1500"
            />
            <div class="flex flex-wrap gap-3">
              <select v-model="newPost.topicType" class="text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="STANDARD">Standard</option>
                <option value="OFFER">Angebot</option>
                <option value="EVENT">Event</option>
              </select>
              <select v-model="newPost.callToActionType" class="text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Kein Button</option>
                <option value="LEARN_MORE">Mehr erfahren</option>
                <option value="SIGN_UP">Registrieren</option>
                <option value="BOOK">Buchen</option>
                <option value="CALL">Anrufen</option>
              </select>
              <input v-if="newPost.callToActionType" v-model="newPost.callToActionUrl" placeholder="https://…" class="flex-1 min-w-40 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">{{ newPost.summary.length }}/1500 Zeichen</span>
              <button @click="publishPost" :disabled="!newPost.summary.trim() || postPublishing" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {{ postPublishing ? 'Veröffentlichen…' : 'Jetzt veröffentlichen' }}
              </button>
            </div>
          </div>

          <!-- Existing posts -->
          <div v-if="postsLoading" class="space-y-3">
            <div v-for="i in 2" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-24" />
          </div>
          <div v-else-if="posts.length === 0" class="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <p class="text-sm text-gray-400">Noch keine Posts veröffentlicht</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="post in posts" :key="post.name" class="bg-white rounded-2xl p-5 border border-gray-100">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                  <span class="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 mb-2">{{ post.topicType || 'Standard' }}</span>
                  <p class="text-sm text-gray-700 leading-relaxed">{{ post.summary }}</p>
                </div>
                <button @click="deletePost(post.name)" class="text-xs text-red-400 hover:text-red-600 flex-shrink-0 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">Löschen</button>
              </div>
              <p class="text-xs text-gray-400 mt-2">{{ formatDate(post.createTime) }}</p>
            </div>
          </div>
        </div>

        <!-- Photos tab -->
        <div v-if="status.locationName && activeTab === 'photos'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <p class="text-sm font-semibold text-gray-900">Foto hochladen</p>
            <p class="text-xs text-gray-400">Das Foto muss öffentlich zugänglich sein (z.B. via Supabase Storage oder Cloudinary).</p>
            <div class="flex gap-3">
              <input v-model="photoUrl" placeholder="https://example.com/foto.jpg" class="flex-1 text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select v-model="photoCategory" class="text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="INTERIOR">Innen</option>
                <option value="EXTERIOR">Aussen</option>
                <option value="LOGO">Logo</option>
                <option value="COVER">Titelbild</option>
                <option value="PRODUCT">Produkt</option>
              </select>
            </div>
            <button @click="uploadPhoto" :disabled="!photoUrl || photoUploading" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {{ photoUploading ? 'Hochladen…' : 'Foto hochladen' }}
            </button>
            <p v-if="photoResult" class="text-xs text-green-600">{{ photoResult }}</p>
          </div>
        </div>

        <!-- Reviews tab -->
        <div v-if="status.locationName && activeTab === 'reviews'" class="space-y-3">
          <div v-if="reviewsLoading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-28" />
          </div>
          <div v-else-if="reviewsError" class="bg-white rounded-2xl p-6 border border-gray-100 text-center">
            <p class="text-sm text-gray-400">{{ reviewsError }}</p>
          </div>
          <div v-else-if="reviews.length === 0" class="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <p class="text-sm text-gray-400">Noch keine Bewertungen</p>
          </div>
          <div v-else>
            <div class="flex items-center gap-3 mb-4">
              <div class="flex">
                <svg v-for="i in 5" :key="i" :class="['w-5 h-5', i <= Math.round(averageRating) ? 'text-yellow-400' : 'text-gray-200']" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <span class="text-sm font-semibold text-gray-700">{{ averageRating?.toFixed(1) }} / 5</span>
              <span class="text-sm text-gray-400">({{ totalReviewCount }} Bewertungen)</span>
            </div>
            <div v-for="review in reviews" :key="review.reviewId" class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900">{{ review.reviewer?.displayName || 'Anonym' }}</p>
                  <div class="flex mt-0.5">
                    <svg v-for="i in 5" :key="i" :class="['w-3.5 h-3.5', i <= starRating(review.starRating) ? 'text-yellow-400' : 'text-gray-200']" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                </div>
                <span class="text-xs text-gray-400 flex-shrink-0">{{ formatDate(review.updateTime) }}</span>
              </div>
              <p v-if="review.comment" class="text-sm text-gray-600 leading-relaxed">{{ review.comment }}</p>
              <div v-if="review.reviewReply" class="bg-gray-50 rounded-xl p-3 border-l-2 border-blue-200">
                <p class="text-xs font-semibold text-gray-500 mb-1">Deine Antwort</p>
                <p class="text-sm text-gray-600">{{ review.reviewReply.comment }}</p>
              </div>
              <div v-else>
                <div v-if="replyingTo === review.reviewId" class="space-y-2">
                  <textarea
                    v-model="replyText"
                    rows="3"
                    placeholder="Antwort schreiben…"
                    class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div class="flex gap-2 flex-wrap">
                    <button @click="submitReply(review.reviewId)" :disabled="replying" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {{ replying ? 'Senden…' : 'Antworten' }}
                    </button>
                    <button @click="generateAiReply(review)" :disabled="aiReplying === review.reviewId" class="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50">
                      {{ aiReplying === review.reviewId ? 'KI schreibt…' : '✦ KI-Vorschlag' }}
                    </button>
                    <button @click="replyingTo = null" class="px-3 py-1.5 rounded-lg text-gray-500 text-xs hover:bg-gray-100 transition-colors">Abbrechen</button>
                  </div>
                </div>
                <div v-else class="flex gap-3">
                  <button @click="replyingTo = review.reviewId; replyText = ''" class="text-xs text-blue-600 hover:text-blue-700 font-medium">Antworten</button>
                  <button @click="replyingTo = review.reviewId; generateAiReply(review)" class="text-xs text-purple-500 hover:text-purple-700 font-medium">✦ KI-Antwort</button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Google Business Profile' })

const tabs = [
  { id: 'insights', label: 'Insights' },
  { id: 'reviews', label: 'Bewertungen' },
  { id: 'posts', label: 'Posts' },
  { id: 'photos', label: 'Fotos' },
]
const activeTab = ref('insights')

const gbpFeatures = [
  'Bewertungen direkt beantworten',
  'GBP Insights (Aufrufe, Anrufe, Klicks)',
  'Verbindung für alle Fahrschul-Accounts',
  'Automatische Token-Verwaltung',
]

// Status
const statusLoading = ref(true)
const status = ref<any>(null)
const featureBlocked = ref(false)
const disconnecting = ref(false)

async function loadStatus() {
  statusLoading.value = true
  try {
    status.value = await $fetch('/api/gbp/status')
  } catch (e: any) {
    if (e?.status === 403) featureBlocked.value = true
  } finally {
    statusLoading.value = false
  }
}

async function disconnect() {
  if (!confirm('Google Business Profile wirklich trennen?')) return
  disconnecting.value = true
  try {
    await $fetch('/api/gbp/disconnect', { method: 'DELETE' })
    status.value = { connected: false }
  } finally {
    disconnecting.value = false
  }
}

// Insights
const insightsLoading = ref(false)
const insightsError = ref('')
const insightMetrics = ref<{ label: string; value: number }[]>([])

async function loadInsights() {
  if (!status.value?.connected) return
  insightsLoading.value = true
  insightsError.value = ''
  try {
    const data = await $fetch<any>('/api/gbp/insights')
    const series = data.insights?.multiDailyMetricTimeSeries ?? []
    const sum = (metricType: string) => {
      const s = series.find((s: any) => s.dailyMetric === metricType)
      return (s?.timeSeries?.datedValues ?? []).reduce((acc: number, v: any) => acc + (parseInt(v.value) || 0), 0)
    }
    insightMetrics.value = [
      { label: 'Profilaufrufe Maps', value: sum('BUSINESS_IMPRESSIONS_MOBILE_MAPS') + sum('BUSINESS_IMPRESSIONS_DESKTOP_MAPS') },
      { label: 'Website-Klicks', value: sum('WEBSITE_CLICKS') },
      { label: 'Anruf-Klicks', value: sum('CALL_CLICKS') },
      { label: 'Routenanfragen', value: sum('BUSINESS_DIRECTION_REQUESTS') },
    ]
  } catch (e: any) {
    insightsError.value = e?.data?.statusMessage || 'Insights konnten nicht geladen werden'
  } finally {
    insightsLoading.value = false
  }
}

// Reviews
const reviewsLoading = ref(false)
const reviewsError = ref('')
const reviews = ref<any[]>([])
const totalReviewCount = ref(0)
const averageRating = ref(0)
const replyingTo = ref<string | null>(null)
const replyText = ref('')
const replying = ref(false)
const aiReplying = ref<string | null>(null)

// Posts
const posts = ref<any[]>([])
const postsLoading = ref(false)
const newPost = ref({ summary: '', topicType: 'STANDARD', callToActionType: '', callToActionUrl: '' })
const postPublishing = ref(false)

// Photos
const photoUrl = ref('')
const photoCategory = ref<'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'>('INTERIOR')
const photoUploading = ref(false)
const photoResult = ref('')

async function loadReviews() {
  if (!status.value?.connected) return
  reviewsLoading.value = true
  reviewsError.value = ''
  try {
    const data = await $fetch<any>('/api/gbp/reviews')
    reviews.value = data.reviews ?? []
    totalReviewCount.value = data.totalReviewCount ?? 0
    averageRating.value = data.averageRating ?? 0
  } catch (e: any) {
    reviewsError.value = e?.data?.statusMessage || 'Bewertungen konnten nicht geladen werden'
  } finally {
    reviewsLoading.value = false
  }
}

async function generateAiReply(review: any) {
  aiReplying.value = review.reviewId
  try {
    const data = await $fetch<any>(`/api/gbp/reviews/${review.reviewId}/ai-reply`, {
      method: 'POST',
      body: {
        reviewText: review.comment ?? '',
        reviewerName: review.reviewer?.displayName ?? '',
        starRating: starRating(review.starRating),
      },
    })
    replyText.value = data.suggestedReply
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'KI-Vorschlag fehlgeschlagen')
  } finally {
    aiReplying.value = null
  }
}

async function loadPosts() {
  postsLoading.value = true
  try {
    const data = await $fetch<any>('/api/gbp/posts')
    posts.value = data.posts ?? []
  } catch { /* ignore */ } finally {
    postsLoading.value = false
  }
}

async function publishPost() {
  if (!newPost.value.summary.trim()) return
  postPublishing.value = true
  try {
    await $fetch('/api/gbp/posts', {
      method: 'POST',
      body: {
        summary: newPost.value.summary,
        topicType: newPost.value.topicType,
        ...(newPost.value.callToActionType && {
          callToActionType: newPost.value.callToActionType,
          callToActionUrl: newPost.value.callToActionUrl,
        }),
      },
    })
    newPost.value = { summary: '', topicType: 'STANDARD', callToActionType: '', callToActionUrl: '' }
    await loadPosts()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Post fehlgeschlagen')
  } finally {
    postPublishing.value = false
  }
}

async function deletePost(name: string) {
  if (!confirm('Post löschen?')) return
  await $fetch(`/api/gbp/posts/${encodeURIComponent(name)}`, { method: 'DELETE' })
  await loadPosts()
}

async function uploadPhoto() {
  if (!photoUrl.value) return
  photoUploading.value = true
  photoResult.value = ''
  try {
    await $fetch('/api/gbp/photos', { method: 'POST', body: { photoUrl: photoUrl.value, category: photoCategory.value } })
    photoResult.value = 'Foto erfolgreich hochgeladen!'
    photoUrl.value = ''
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Upload fehlgeschlagen')
  } finally {
    photoUploading.value = false
  }
}

async function submitReply(reviewId: string) {
  if (!replyText.value.trim()) return
  replying.value = true
  try {
    await $fetch(`/api/gbp/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: { comment: replyText.value.trim() },
    })
    replyingTo.value = null
    await loadReviews()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Fehler beim Senden der Antwort')
  } finally {
    replying.value = false
  }
}

function starRating(rating: string): number {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
  return map[rating] ?? 0
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Location picker
const gbpAccounts = ref<any[]>([])
const accountsLoading = ref(false)
const accountsError = ref('')
const linkingLocation = ref(false)
const manualAccountName = ref('')
const manualLocationId = ref('')
const manualLocationName = ref('')

const allLocations = computed(() => {
  const locs: { locationId: string; title: string; accountName: string; gbpAccountName: string }[] = []
  for (const account of gbpAccounts.value) {
    for (const loc of account.locations ?? []) {
      locs.push({
        locationId: loc.name,
        title: loc.title ?? loc.name,
        accountName: account.accountName ?? account.name,
        gbpAccountName: account.name,
      })
    }
  }
  return locs
})

async function loadAccounts() {
  accountsLoading.value = true
  accountsError.value = ''
  try {
    const data = await $fetch<{ accounts: any[] }>('/api/gbp/accounts')
    gbpAccounts.value = data.accounts ?? []
  } catch (e: any) {
    accountsError.value = e?.data?.statusMessage || 'Fehler beim Laden der Accounts'
  } finally {
    accountsLoading.value = false
  }
}

async function linkManualLocation() {
  await linkLocation({
    locationId: manualLocationId.value.trim(),
    title: manualLocationName.value.trim() || manualLocationId.value.trim(),
    gbpAccountName: manualAccountName.value.trim(),
  })
}

async function linkLocation(location: { locationId: string; title: string; gbpAccountName: string }) {
  linkingLocation.value = true
  try {
    await $fetch('/api/gbp/link-location', {
      method: 'POST',
      body: { gbpAccountName: location.gbpAccountName, gbpLocationId: location.locationId, gbpLocationName: location.title },
    })
    await loadStatus()
    if (status.value?.connected) {
      loadInsights()
      loadReviews()
    }
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Verknüpfung fehlgeschlagen')
  } finally {
    linkingLocation.value = false
  }
}

// Route-based GBP connection feedback
const route = useRoute()
const connectError = ref(false)
const connectErrorMsg = ref('')

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Google hat keine Autorisierungsdaten gesendet.',
  invalid_state: 'Ungültiger Sicherheitsparameter. Bitte versuche es erneut.',
  server_config: 'Serverkonfiguration fehlt. Bitte Support kontaktieren.',
  token_fetch_failed: 'Verbindung zu Google fehlgeschlagen. Bitte versuche es erneut.',
  no_access_token: 'Google hat kein Access Token gesendet.',
  db_error: 'Verbindungsdaten konnten nicht gespeichert werden. Bitte versuche es erneut.',
  access_denied: 'Zugriff verweigert. Bitte bestätige alle Berechtigungen bei Google.',
}

onMounted(async () => {
  await loadStatus()
  if (status.value?.connected && status.value?.locationName) {
    loadInsights()
    loadReviews()
  } else if (status.value?.connected && !status.value?.locationName) {
    loadAccounts()
  }
  if (route.query.gbp === 'connected') {
    useRouter().replace('/admin/google-business-profile')
  }
  if (route.query.gbp === 'error') {
    const reason = (route.query.reason as string) || 'unknown'
    connectErrorMsg.value = ERROR_MESSAGES[reason] || `Fehler: ${reason}`
    connectError.value = true
    useRouter().replace('/admin/google-business-profile')
  }
})

watch(activeTab, (tab) => {
  if (tab === 'insights' && insightMetrics.value.length === 0) loadInsights()
  if (tab === 'reviews' && reviews.value.length === 0) loadReviews()
  if (tab === 'posts' && posts.value.length === 0) loadPosts()
})
</script>
