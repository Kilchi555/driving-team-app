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
      <div v-else-if="featureBlocked" class="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 max-w-lg mx-auto">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5">
          <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
          </svg>
        </div>
        <h2 class="text-lg font-bold text-gray-900 mb-2">Mehr Reichweite, Anfragen und Umsatz</h2>
        <p class="text-sm text-gray-500 mb-5 leading-relaxed">
          Ein aktives Google-Profil bringt dich bei lokalen Suchen weiter nach oben —
          mehr Sichtbarkeit, mehr Anfragen, mehr neue Schüler. Simy hält dein Profil
          automatisch aktuell, während du dich um den Unterricht kümmerst.
        </p>
        <ul class="space-y-2.5 mb-6">
          <li v-for="(f, i) in gbpFeatures" :key="f" class="flex items-start gap-2.5 text-sm" :class="i === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'">
            <svg class="w-4 h-4 flex-shrink-0 mt-0.5" :class="i === 0 ? 'text-blue-600' : 'text-green-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            {{ f }}
          </li>
        </ul>
        <NuxtLink
          to="/upgrade?addon=gbp"
          class="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Add-on jetzt aktivieren
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </NuxtLink>
        <p class="text-xs text-gray-400 mt-3">Du wirst zur Upgrade-Seite weitergeleitet — GBP ist dort bereits vorausgewählt.</p>
      </div>

      <template v-else>
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
      <div v-if="!status?.connected" class="bg-white rounded-2xl p-6 border border-gray-100">
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
              <p class="text-sm font-semibold text-gray-900">{{ selectedLocationTitle || 'Verbunden — Standort wählen' }}</p>
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

        <!-- Location switcher (multi-location) -->
        <div v-if="linkedLocations.length > 0" class="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Standort</label>
          <select
            v-model="selectedLocationId"
            class="text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="onLocationChange"
          >
            <option v-for="loc in linkedLocations" :key="loc.id" :value="loc.id">
              {{ loc.title || loc.gbpLocationId }}
            </option>
          </select>
          <button
            @click="toggleAddLocation"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            + Standort hinzufügen
          </button>
        </div>

        <!-- No location linked — show picker from Google APIs only -->
        <div v-if="linkedLocations.length === 0 || showAddLocation" class="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p class="text-sm font-semibold text-amber-900 mb-1">
            {{ linkedLocations.length === 0 ? 'Kein Business Profile verknüpft' : 'Weiteren Standort verknüpfen' }}
          </p>
          <p class="text-xs text-amber-700 mb-4">Wähle einen Standort aus deinem Google-Konto.</p>
          <div v-if="accountsLoading" class="text-xs text-amber-600">Lade Business Profile Accounts…</div>
          <div v-else-if="accountsError" class="text-xs text-red-600">{{ accountsError }}</div>
          <div v-else-if="allLocations.length === 0" class="text-xs text-amber-700">
            Keine Standorte im Google-Konto gefunden. Stelle sicher, dass du Owner/Manager bist.
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
        <div v-if="selectedLocationId" class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          >{{ tab.label }}</button>
        </div>


        <!-- Insights tab -->
        <div v-if="selectedLocationId && activeTab === 'insights'">
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
        <div v-if="selectedLocationId && activeTab === 'posts'" class="space-y-4">
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
        <div v-if="selectedLocationId && activeTab === 'photos'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <p class="text-sm font-semibold text-gray-900">Foto-Pool</p>
            <p class="text-xs text-gray-400">Fotos hier ablegen, freigeben — Automation oder manuell nach GBP publishen.</p>

            <div class="flex flex-wrap gap-3 items-end">
              <label class="block space-y-1">
                <span class="text-xs font-medium text-gray-600">Datei</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" @change="onPoolFile" class="text-sm" />
              </label>
              <select v-model="poolCategory" class="text-sm rounded-xl border border-gray-200 px-3 py-2">
                <option value="INTERIOR">Innen</option>
                <option value="EXTERIOR">Aussen</option>
                <option value="LOGO">Logo</option>
                <option value="COVER">Titelbild</option>
                <option value="PRODUCT">Produkt</option>
              </select>
              <label class="flex items-center gap-2 text-xs text-gray-600">
                <input type="checkbox" v-model="poolApprovedOnUpload" />
                Sofort freigeben
              </label>
              <button
                @click="uploadToPool"
                :disabled="!poolFile || poolUploading"
                class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {{ poolUploading ? 'Upload…' : 'In Pool laden' }}
              </button>
            </div>

            <div class="border-t border-gray-100 pt-4 space-y-2">
              <p class="text-xs font-medium text-gray-500">Oder per URL hinzufügen</p>
              <div class="flex gap-3">
                <input v-model="photoUrl" placeholder="https://example.com/foto.jpg" class="flex-1 text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button @click="addUrlToPool" :disabled="!photoUrl || poolUploading" class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                  URL → Pool
                </button>
                <button @click="uploadPhoto" :disabled="!photoUrl || photoUploading" class="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
                  {{ photoUploading ? '…' : 'Direkt zu GBP' }}
                </button>
              </div>
              <p v-if="photoResult" class="text-xs text-green-600">{{ photoResult }}</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold text-gray-900">Pool ({{ mediaAssets.length }})</p>
              <button @click="loadMedia" class="text-xs text-gray-500 hover:text-gray-700">Aktualisieren</button>
            </div>
            <div v-if="mediaLoading" class="text-xs text-gray-400">Lade…</div>
            <div v-else-if="mediaAssets.length === 0" class="text-sm text-gray-400 text-center py-6">Noch keine Pool-Fotos</div>
            <div v-else class="grid sm:grid-cols-2 gap-3">
              <div v-for="asset in mediaAssets" :key="asset.id" class="border border-gray-100 rounded-xl overflow-hidden">
                <img :src="asset.public_url" :alt="asset.category" class="w-full h-36 object-cover bg-gray-50" />
                <div class="p-3 space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-gray-600">{{ asset.category }}</span>
                    <span :class="['text-xs font-semibold', asset.approved ? 'text-green-600' : 'text-amber-600']">
                      {{ asset.approved ? 'Freigegeben' : 'Wartend' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-400">
                    Publishes: {{ asset.publish_count || 0 }}
                    <span v-if="asset.last_published_at"> · zuletzt {{ formatDate(asset.last_published_at) }}</span>
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-if="!asset.approved"
                      @click="approveAsset(asset.id, true)"
                      class="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold"
                    >Freigeben</button>
                    <button
                      v-else
                      @click="approveAsset(asset.id, false)"
                      class="px-2.5 py-1 rounded-lg border border-gray-200 text-xs"
                    >Sperren</button>
                    <button
                      @click="publishAsset(asset.id)"
                      :disabled="publishingAssetId === asset.id"
                      class="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
                    >{{ publishingAssetId === asset.id ? '…' : 'Zu GBP' }}</button>
                    <button @click="deleteAsset(asset.id)" class="px-2.5 py-1 rounded-lg text-red-500 text-xs">Löschen</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews tab -->
        <div v-if="selectedLocationId && activeTab === 'reviews'" class="space-y-3">
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

        <!-- Automation tab -->
        <div v-if="selectedLocationId && activeTab === 'automation'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p class="text-sm font-semibold text-gray-900">Post-Queue</p>
                <p class="text-xs text-gray-400 mt-0.5">KI-Drafts & geplante Posts — vor dem Publish freigeben.</p>
              </div>
              <div class="flex gap-2">
                <button
                  @click="generateAiPost"
                  :disabled="generatingPost"
                  class="px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 text-xs font-semibold hover:bg-purple-50 disabled:opacity-50"
                >
                  {{ generatingPost ? 'KI schreibt…' : '✦ KI-Draft erzeugen' }}
                </button>
                <button
                  @click="loadQueue"
                  class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  Aktualisieren
                </button>
              </div>
            </div>

            <div v-if="queueLoading" class="text-xs text-gray-400">Lade Queue…</div>
            <div v-else-if="scheduledPosts.length === 0" class="text-sm text-gray-400 py-4 text-center">Keine Drafts / geplanten Posts</div>
            <div v-else class="space-y-3">
              <div v-for="sp in scheduledPosts" :key="sp.id" class="border border-gray-100 rounded-xl p-4 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ sp.status }} · {{ sp.source }}</span>
                  <span class="text-xs text-gray-400">{{ sp.scheduled_for ? formatDate(sp.scheduled_for) : 'ohne Termin' }}</span>
                </div>
                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ sp.summary }}</p>
                <div class="flex gap-2 flex-wrap">
                  <button
                    v-if="sp.status !== 'published'"
                    @click="publishScheduled(sp.id)"
                    :disabled="publishingId === sp.id"
                    class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ publishingId === sp.id ? '…' : 'Jetzt publishen' }}
                  </button>
                  <button
                    v-if="sp.status === 'draft'"
                    @click="schedulePost(sp.id)"
                    class="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                  >
                    In 1h planen
                  </button>
                  <button
                    v-if="sp.status !== 'published'"
                    @click="deleteScheduled(sp.id)"
                    class="px-3 py-1.5 rounded-lg text-red-500 text-xs hover:bg-red-50"
                  >
                    Löschen
                  </button>
                </div>
                <p v-if="sp.error_message" class="text-xs text-red-500">{{ sp.error_message }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div>
              <p class="text-sm font-semibold text-gray-900">Review-Vorschläge</p>
              <p class="text-xs text-gray-400 mt-0.5">Vom Cron erzeugt — prüfen und freigeben.</p>
            </div>
            <div v-if="reviewActions.length === 0" class="text-sm text-gray-400 py-4 text-center">Keine offenen Vorschläge</div>
            <div v-else class="space-y-3">
              <div v-for="ra in reviewActions" :key="ra.id" class="border border-gray-100 rounded-xl p-4 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-gray-900">{{ ra.reviewer_name || 'Anonym' }} · {{ ra.star_rating }}/5</p>
                  <span class="text-xs text-gray-400">{{ ra.status }}</span>
                </div>
                <p v-if="ra.review_comment" class="text-sm text-gray-600">{{ ra.review_comment }}</p>
                <textarea
                  v-model="ra.suggested_reply"
                  rows="3"
                  class="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 resize-none"
                />
                <div class="flex gap-2">
                  <button
                    @click="publishReviewAction(ra)"
                    :disabled="publishingReviewId === ra.id"
                    class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {{ publishingReviewId === ra.id ? '…' : 'Antwort publishen' }}
                  </button>
                  <button
                    @click="skipReviewAction(ra.id)"
                    class="px-3 py-1.5 rounded-lg text-gray-500 text-xs hover:bg-gray-100"
                  >
                    Überspringen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings tab -->
        <div v-if="selectedLocationId && activeTab === 'settings'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <div>
              <p class="text-sm font-semibold text-gray-900">Automation-Einstellungen</p>
              <p class="text-xs text-gray-400 mt-1">Tenant-Defaults — gelten für alle Standorte, sofern nicht überschrieben.</p>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <label class="block space-y-1">
                <span class="text-xs font-medium text-gray-600">Review-Antworten</span>
                <select v-model="settingsForm.review_reply_mode" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2">
                  <option value="off">Aus</option>
                  <option value="suggest">Nur KI-Vorschlag (empfohlen)</option>
                  <option value="auto_ge_4">Auto ab 4★ (noch nicht aktiv)</option>
                  <option value="auto_all">Auto alle (noch nicht aktiv)</option>
                </select>
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-gray-600">Posts pro Woche</span>
                <select v-model.number="settingsForm.posts_per_week" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2">
                  <option :value="1">1</option>
                  <option :value="2">2 (empfohlen)</option>
                  <option :value="3">3</option>
                  <option :value="4">4</option>
                </select>
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-gray-600">Foto-Automation</span>
                <select v-model="settingsForm.photo_mode" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2">
                  <option value="off">Aus</option>
                  <option value="approved_only">Nur freigegebene Pool-Fotos (empfohlen)</option>
                  <option value="pool_auto">Pool automatisch (freigegebene)</option>
                </select>
              </label>
              <label class="block space-y-1">
                <span class="text-xs font-medium text-gray-600">Standard-CTA</span>
                <select v-model="settingsForm.default_cta_type" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2">
                  <option value="">Kein Default</option>
                  <option value="BOOK">Buchen</option>
                  <option value="LEARN_MORE">Mehr erfahren</option>
                  <option value="CALL">Anrufen</option>
                  <option value="SIGN_UP">Registrieren</option>
                </select>
              </label>
            </div>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-gray-600">CTA-URL</span>
              <input v-model="settingsForm.default_cta_url" placeholder="https://…" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2" />
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-gray-600">Brand Voice</span>
              <textarea v-model="settingsForm.brand_voice" rows="2" placeholder="z.B. freundlich, Schweizer Hochdeutsch, short & klar" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 resize-none" />
            </label>
            <label class="block space-y-1">
              <span class="text-xs font-medium text-gray-600">Keywords (kommagetrennt)</span>
              <input v-model="keywordsInput" placeholder="Fahrschule Zürich, Motorradgrundkurs, …" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2" />
            </label>
            <div class="flex items-center justify-between">
              <p v-if="settingsSaved" class="text-xs text-green-600">Gespeichert</p>
              <span v-else />
              <button
                @click="saveSettings"
                :disabled="settingsSaving"
                class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {{ settingsSaving ? 'Speichern…' : 'Einstellungen speichern' }}
              </button>
            </div>
          </div>
        </div>

      </template>
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
  { id: 'automation', label: 'Automation' },
  { id: 'settings', label: 'Einstellungen' },
]
const activeTab = ref('insights')

const gbpFeatures = [
  'Mehr Reichweite, Anfragen und Umsatz durch ein aktives Google-Profil',
  'Automatische Posts & Fotos — dein Profil bleibt sichtbar',
  'Bewertungen schneller beantworten — besserer Ruf, mehr Vertrauen',
  'Alle Standorte zentral steuern — ein Google-Konto, mehrere Filialen',
]

// Status
const statusLoading = ref(true)
const status = ref<any>(null)
const featureBlocked = ref(false)
const disconnecting = ref(false)
const linkedLocations = ref<{ id: string; title: string | null; gbpAccountName: string; gbpLocationId: string }[]>([])
const selectedLocationId = ref<string | null>(null)
const showAddLocation = ref(false)

const selectedLocationTitle = computed(() => {
  const loc = linkedLocations.value.find(l => l.id === selectedLocationId.value)
  return loc?.title || status.value?.locationName || null
})

function locQuery() {
  return selectedLocationId.value ? { locationId: selectedLocationId.value } : undefined
}

async function loadStatus() {
  statusLoading.value = true
  featureBlocked.value = false
  try {
    status.value = await $fetch('/api/gbp/status')
    if (status.value?.featureEnabled === false) {
      featureBlocked.value = true
      status.value = null
      return
    }
    linkedLocations.value = status.value?.locations ?? []
    if (!selectedLocationId.value && linkedLocations.value.length > 0) {
      selectedLocationId.value = linkedLocations.value[0].id
    }
    if (selectedLocationId.value && !linkedLocations.value.some(l => l.id === selectedLocationId.value)) {
      selectedLocationId.value = linkedLocations.value[0]?.id ?? null
    }
  } catch (e: any) {
    const code = e?.statusCode ?? e?.status ?? e?.response?.status ?? e?.data?.statusCode
    if (code === 403) {
      featureBlocked.value = true
      status.value = null
    }
  } finally {
    statusLoading.value = false
  }
}

async function onLocationChange() {
  insightMetrics.value = []
  reviews.value = []
  posts.value = []
  scheduledPosts.value = []
  reviewActions.value = []
  mediaAssets.value = []
  if (activeTab.value === 'insights') loadInsights()
  if (activeTab.value === 'reviews') loadReviews()
  if (activeTab.value === 'posts') loadPosts()
  if (activeTab.value === 'photos') loadMedia()
  if (activeTab.value === 'automation') loadQueue()
  if (activeTab.value === 'settings') loadSettings()
}

function toggleAddLocation() {
  showAddLocation.value = !showAddLocation.value
  if (showAddLocation.value) loadAccounts()
}

async function disconnect() {
  if (!confirm('Google Business Profile wirklich trennen?')) return
  disconnecting.value = true
  try {
    await $fetch('/api/gbp/disconnect', { method: 'DELETE' })
    status.value = { connected: false }
    linkedLocations.value = []
    selectedLocationId.value = null
  } finally {
    disconnecting.value = false
  }
}

// Insights
const insightsLoading = ref(false)
const insightsError = ref('')
const insightMetrics = ref<{ label: string; value: number }[]>([])

async function loadInsights() {
  if (!status.value?.connected || !selectedLocationId.value) return
  insightsLoading.value = true
  insightsError.value = ''
  try {
    const data = await $fetch<any>('/api/gbp/insights', { query: locQuery() })
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
const photoUploading = ref(false)
const photoResult = ref('')
const mediaAssets = ref<any[]>([])
const mediaLoading = ref(false)
const poolFile = ref<File | null>(null)
const poolCategory = ref<'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'>('INTERIOR')
const poolApprovedOnUpload = ref(true)
const poolUploading = ref(false)
const publishingAssetId = ref<string | null>(null)

function onPoolFile(e: Event) {
  const input = e.target as HTMLInputElement
  poolFile.value = input.files?.[0] ?? null
}

async function loadMedia() {
  if (!selectedLocationId.value) return
  mediaLoading.value = true
  try {
    const data = await $fetch<any>('/api/gbp/media', { query: locQuery() })
    mediaAssets.value = data.assets ?? []
  } catch { /* ignore */ } finally {
    mediaLoading.value = false
  }
}

async function uploadToPool() {
  if (!poolFile.value || !selectedLocationId.value) return
  poolUploading.value = true
  photoResult.value = ''
  try {
    const fd = new FormData()
    fd.append('file', poolFile.value)
    fd.append('category', poolCategory.value)
    fd.append('locationId', selectedLocationId.value)
    fd.append('approved', poolApprovedOnUpload.value ? 'true' : 'false')
    await $fetch('/api/gbp/media/upload', { method: 'POST', body: fd })
    poolFile.value = null
    photoResult.value = 'Foto im Pool gespeichert'
    await loadMedia()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Pool-Upload fehlgeschlagen')
  } finally {
    poolUploading.value = false
  }
}

async function addUrlToPool() {
  if (!photoUrl.value || !selectedLocationId.value) return
  poolUploading.value = true
  try {
    await $fetch('/api/gbp/media', {
      method: 'POST',
      body: {
        publicUrl: photoUrl.value,
        category: poolCategory.value,
        locationId: selectedLocationId.value,
        approved: poolApprovedOnUpload.value,
      },
    })
    photoUrl.value = ''
    photoResult.value = 'URL im Pool gespeichert'
    await loadMedia()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Hinzufügen fehlgeschlagen')
  } finally {
    poolUploading.value = false
  }
}

async function approveAsset(id: string, approved: boolean) {
  await $fetch(`/api/gbp/media/${id}`, { method: 'PATCH', body: { approved } })
  await loadMedia()
}

async function publishAsset(id: string) {
  if (!selectedLocationId.value) return
  publishingAssetId.value = id
  try {
    await $fetch(`/api/gbp/media/${id}/publish`, {
      method: 'POST',
      body: { locationId: selectedLocationId.value },
    })
    photoResult.value = 'Foto zu GBP publiziert'
    await loadMedia()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'GBP-Publish fehlgeschlagen')
  } finally {
    publishingAssetId.value = null
  }
}

async function deleteAsset(id: string) {
  if (!confirm('Foto aus Pool löschen?')) return
  await $fetch(`/api/gbp/media/${id}`, { method: 'DELETE' })
  await loadMedia()
}

async function loadReviews() {
  if (!status.value?.connected || !selectedLocationId.value) return
  reviewsLoading.value = true
  reviewsError.value = ''
  try {
    const data = await $fetch<any>('/api/gbp/reviews', { query: locQuery() })
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
  if (!selectedLocationId.value) return
  postsLoading.value = true
  try {
    const data = await $fetch<any>('/api/gbp/posts', { query: locQuery() })
    posts.value = data.posts ?? []
  } catch { /* ignore */ } finally {
    postsLoading.value = false
  }
}

async function publishPost() {
  if (!newPost.value.summary.trim() || !selectedLocationId.value) return
  postPublishing.value = true
  try {
    await $fetch('/api/gbp/posts', {
      method: 'POST',
      body: {
        summary: newPost.value.summary,
        topicType: newPost.value.topicType,
        locationId: selectedLocationId.value,
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
  if (!photoUrl.value || !selectedLocationId.value) return
  photoUploading.value = true
  photoResult.value = ''
  try {
    await $fetch('/api/gbp/photos', {
      method: 'POST',
      body: {
        photoUrl: photoUrl.value,
        category: poolCategory.value,
        locationId: selectedLocationId.value,
      },
    })
    photoResult.value = 'Foto erfolgreich hochgeladen!'
    photoUrl.value = ''
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Upload fehlgeschlagen')
  } finally {
    photoUploading.value = false
  }
}

async function submitReply(reviewId: string) {
  if (!replyText.value.trim() || !selectedLocationId.value) return
  replying.value = true
  try {
    await $fetch(`/api/gbp/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: { comment: replyText.value.trim(), locationId: selectedLocationId.value },
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

async function linkLocation(location: { locationId: string; title: string; gbpAccountName: string }) {
  linkingLocation.value = true
  try {
    const res = await $fetch<any>('/api/gbp/link-location', {
      method: 'POST',
      body: {
        gbpAccountName: location.gbpAccountName,
        gbpLocationId: location.locationId,
        gbpLocationName: location.title,
      },
    })
    showAddLocation.value = false
    await loadStatus()
    if (res?.location?.id) selectedLocationId.value = res.location.id
    if (selectedLocationId.value) {
      loadInsights()
      loadReviews()
    }
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Verknüpfung fehlgeschlagen')
  } finally {
    linkingLocation.value = false
  }
}

// Settings
const settingsForm = ref({
  review_reply_mode: 'suggest',
  posts_per_week: 2,
  photo_mode: 'off',
  brand_voice: '',
  default_cta_type: 'BOOK',
  default_cta_url: '',
})
const keywordsInput = ref('')
const settingsSaving = ref(false)
const settingsSaved = ref(false)

async function loadSettings() {
  try {
    const data = await $fetch<any>('/api/gbp/settings', { query: { scope: 'tenant' } })
    const s = data.settings ?? {}
    settingsForm.value = {
      review_reply_mode: s.review_reply_mode ?? 'suggest',
      posts_per_week: s.posts_per_week ?? 2,
      photo_mode: s.photo_mode ?? 'off',
      brand_voice: s.brand_voice ?? '',
      default_cta_type: s.default_cta_type ?? 'BOOK',
      default_cta_url: s.default_cta_url ?? '',
    }
    keywordsInput.value = Array.isArray(s.keywords) ? s.keywords.join(', ') : ''
  } catch { /* ignore */ }
}

async function saveSettings() {
  settingsSaving.value = true
  settingsSaved.value = false
  try {
    const keywords = keywordsInput.value
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    await $fetch('/api/gbp/settings', {
      method: 'PUT',
      body: {
        ...settingsForm.value,
        brand_voice: settingsForm.value.brand_voice || null,
        default_cta_url: settingsForm.value.default_cta_url || null,
        default_cta_type: settingsForm.value.default_cta_type || null,
        keywords,
      },
    })
    settingsSaved.value = true
    setTimeout(() => { settingsSaved.value = false }, 2500)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Speichern fehlgeschlagen')
  } finally {
    settingsSaving.value = false
  }
}

// Automation queue
const scheduledPosts = ref<any[]>([])
const reviewActions = ref<any[]>([])
const queueLoading = ref(false)
const generatingPost = ref(false)
const publishingId = ref<string | null>(null)
const publishingReviewId = ref<string | null>(null)

async function loadQueue() {
  if (!selectedLocationId.value) return
  queueLoading.value = true
  try {
    const [postsRes, actionsRes] = await Promise.all([
      $fetch<any>('/api/gbp/scheduled-posts', { query: locQuery() }),
      $fetch<any>('/api/gbp/review-actions', { query: { ...locQuery(), status: 'suggested' } }),
    ])
    scheduledPosts.value = (postsRes.posts ?? []).filter((p: any) => p.status !== 'published')
    reviewActions.value = actionsRes.actions ?? []
  } catch { /* ignore */ } finally {
    queueLoading.value = false
  }
}

async function generateAiPost() {
  if (!selectedLocationId.value) return
  generatingPost.value = true
  try {
    await $fetch('/api/gbp/generate-post', {
      method: 'POST',
      body: { locationId: selectedLocationId.value, status: 'draft' },
    })
    await loadQueue()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'KI-Draft fehlgeschlagen')
  } finally {
    generatingPost.value = false
  }
}

async function publishScheduled(id: string) {
  publishingId.value = id
  try {
    await $fetch(`/api/gbp/scheduled-posts/${id}/publish`, { method: 'POST' })
    await loadQueue()
    await loadPosts()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Publish fehlgeschlagen')
    await loadQueue()
  } finally {
    publishingId.value = null
  }
}

async function schedulePost(id: string) {
  const scheduledFor = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  try {
    await $fetch(`/api/gbp/scheduled-posts/${id}`, {
      method: 'PATCH',
      body: { status: 'scheduled', scheduledFor },
    })
    await loadQueue()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Planen fehlgeschlagen')
  }
}

async function deleteScheduled(id: string) {
  if (!confirm('Draft löschen?')) return
  await $fetch(`/api/gbp/scheduled-posts/${id}`, { method: 'DELETE' })
  await loadQueue()
}

async function publishReviewAction(ra: any) {
  publishingReviewId.value = ra.id
  try {
    await $fetch(`/api/gbp/review-actions/${ra.id}/publish`, {
      method: 'POST',
      body: { comment: ra.suggested_reply },
    })
    await loadQueue()
    await loadReviews()
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Antwort fehlgeschlagen')
  } finally {
    publishingReviewId.value = null
  }
}

async function skipReviewAction(id: string) {
  await $fetch(`/api/gbp/review-actions/${id}/skip`, { method: 'POST' })
  await loadQueue()
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
  no_refresh_token: 'Kein Refresh-Token erhalten. Bitte erneut verbinden und alle Berechtigungen erlauben.',
  db_error: 'Verbindungsdaten konnten nicht gespeichert werden. Bitte versuche es erneut.',
  access_denied: 'Zugriff verweigert. Bitte bestätige alle Berechtigungen bei Google.',
}

onMounted(async () => {
  await loadStatus()
  if (status.value?.connected && selectedLocationId.value) {
    loadInsights()
    loadReviews()
  } else if (status.value?.connected && linkedLocations.value.length === 0) {
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
  if (tab === 'photos') loadMedia()
  if (tab === 'automation') loadQueue()
  if (tab === 'settings') loadSettings()
})
</script>
