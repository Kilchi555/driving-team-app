<template>
  <div class="min-h-screen bg-gray-50/60 p-4 sm:p-6 overflow-x-hidden">
    <div class="max-w-4xl mx-auto space-y-6 min-w-0">

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

        <!-- Connection info: Google account (not a single location) -->
        <div class="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0"></span>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900">Google-Konto verbunden</p>
              <p class="text-xs text-gray-400 truncate">
                {{ status.email }}
                · Verbunden {{ formatDate(status.connectedAt) }}
                · {{ linkedLocations.length }} Standort{{ linkedLocations.length === 1 ? '' : 'e' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="disconnectAccount"
            :disabled="disconnecting"
            class="shrink-0 text-xs text-gray-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="OAuth komplett trennen (alle Standorte)"
          >
            {{ disconnecting ? '…' : 'Konto trennen' }}
          </button>
        </div>

        <!-- Location switcher (multi-location) -->
        <div v-if="linkedLocations.length > 0" class="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Standort</label>
          <select
            v-model="selectedLocationId"
            class="block w-full min-w-0 max-w-full truncate text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="onLocationChange"
          >
            <option v-for="loc in linkedLocations" :key="loc.id" :value="loc.id">
              {{ loc.title || loc.gbpLocationId }}
            </option>
          </select>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="toggleAddLocation"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              + Standort hinzufügen
            </button>
            <button
              type="button"
              @click="toggleUnlinkLocation"
              class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              Standorte trennen
            </button>
          </div>
        </div>

        <!-- Unlink locations (multi, like link picker) -->
        <div v-if="showUnlinkLocation && linkedLocations.length > 0" class="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div class="flex items-start justify-between gap-3 mb-1">
            <div>
              <p class="text-sm font-semibold text-red-900">Standorte trennen</p>
              <p class="text-xs text-red-700 mt-0.5">Entferne einen oder mehrere Standorte. Das Google-Konto bleibt verbunden.</p>
            </div>
            <button
              type="button"
              @click="showUnlinkLocation = false"
              class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 text-red-800 hover:bg-red-100"
            >
              Fertig
            </button>
          </div>
          <div class="space-y-2 mt-4">
            <div
              v-for="loc in linkedLocations"
              :key="loc.id"
              class="flex items-center justify-between bg-white rounded-xl border border-red-200 px-4 py-3 gap-3"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ loc.title || loc.gbpLocationId }}</p>
                <p class="text-xs text-gray-400 truncate">{{ loc.gbpAccountName }}</p>
              </div>
              <button
                type="button"
                @click="unlinkLocation(loc.id)"
                :disabled="unlinkingLocation"
                class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {{ unlinkingLocationId === loc.id ? 'Trenne…' : 'Trennen' }}
              </button>
            </div>
          </div>
        </div>

        <!-- No location linked — show picker from Google APIs only -->
        <div v-if="linkedLocations.length === 0 || showAddLocation" class="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div class="flex items-start justify-between gap-3 mb-1">
            <div>
              <p class="text-sm font-semibold text-amber-900">
                {{ linkedLocations.length === 0 ? 'Kein Business Profile verknüpft' : 'Weiteren Standort verknüpfen' }}
              </p>
              <p class="text-xs text-amber-700 mt-0.5">Wähle einen oder mehrere Standorte aus deinem Google-Konto.</p>
            </div>
            <button
              v-if="linkedLocations.length > 0"
              type="button"
              @click="showAddLocation = false"
              class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              Fertig
            </button>
          </div>
          <div v-if="accountsLoading" class="text-xs text-amber-600 mt-4">Lade Business Profile Accounts…</div>
          <div v-else-if="accountsError" class="text-xs text-red-600 mt-4">{{ accountsError }}</div>
          <div v-else-if="allLocations.length === 0" class="text-xs text-amber-700 mt-4">
            {{ hasGoogleLocations
              ? 'Alle gefundenen Standorte sind bereits verknüpft.'
              : 'Keine Standorte im Google-Konto gefunden. Stelle sicher, dass du Owner/Manager bist.' }}
          </div>
          <div v-else class="space-y-2 mt-4">
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
                {{ linkingLocationId === location.locationId ? 'Verknüpfe…' : 'Verknüpfen' }}
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
          <div v-else class="space-y-3">
            <p v-if="insightsMeta" class="text-xs text-gray-400">
              Gespeichert
              <template v-if="insightsMeta.historyFrom && insightsMeta.historyTo">
                · Historie {{ formatDate(insightsMeta.historyFrom) }}–{{ formatDate(insightsMeta.historyTo) }}
              </template>
              <template v-if="insightsMeta.lastSyncedAt">
                · zuletzt aktualisiert {{ formatDateTime(insightsMeta.lastSyncedAt) }}
              </template>
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div v-for="metric in insightMetrics" :key="metric.label" class="bg-white rounded-2xl p-5 border border-gray-100">
                <p class="text-2xl font-bold text-gray-900">{{ metric.value.toLocaleString('de-CH') }}</p>
                <p class="text-xs text-gray-400 mt-1 font-medium">{{ metric.label }}</p>
                <p class="text-xs text-gray-300 mt-0.5">letzte {{ insightsMeta?.displayDays ?? 28 }} Tage</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis tab -->
        <div v-if="selectedLocationId && activeTab === 'analysis'" class="space-y-4">
          <div class="bg-white rounded-2xl p-5 border border-gray-100">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">GBP-Analyse</p>
                <p class="text-xs text-gray-400 mt-0.5">
                  <template v-if="audit">Zuletzt analysiert {{ formatDateTime(audit.generatedAt) }}</template>
                  <template v-else>Noch keine Analyse durchgeführt</template>
                </p>
              </div>
              <button
                @click="runAnalysis"
                :disabled="analysisRunning"
                class="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {{ analysisRunning ? 'Analysiere… (bis zu 20s)' : (audit ? '↻ Neu analysieren' : '✦ Jetzt analysieren') }}
              </button>
            </div>
            <p v-if="analysisError" class="text-xs text-red-500 mt-2">{{ analysisError }}</p>
          </div>

          <div v-if="analysisLoading" class="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-40" />

          <template v-else-if="audit">
            <!-- Overall score -->
            <div class="bg-white rounded-2xl p-6 border border-gray-100 flex items-center gap-5">
              <div
                class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                :class="scoreRingClass(audit.overallScore)"
              >{{ audit.overallScore }}</div>
              <div>
                <p class="text-base font-semibold text-gray-900">{{ scoreLabel(audit.overallScore) }}</p>
                <p class="text-xs text-gray-400 mt-1">Gesamtscore aus Profil, Bewertungen, Aktualität und Sichtbarkeit</p>
              </div>
            </div>

            <!-- Category scores -->
            <div class="grid sm:grid-cols-2 gap-4">
              <div v-for="cat in audit.categories" :key="cat.key" class="bg-white rounded-2xl p-5 border border-gray-100 space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-semibold text-gray-900">{{ cat.label }}</p>
                  <span class="text-sm font-bold" :class="scoreTextClass(cat.score)">{{ cat.score }}</span>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div class="h-full rounded-full" :class="scoreBarClass(cat.score)" :style="{ width: cat.score + '%' }" />
                </div>
                <p class="text-xs text-gray-500">{{ cat.summary }}</p>
              </div>
            </div>

            <!-- Strengths -->
            <div v-if="audit.strengths?.length" class="bg-white rounded-2xl p-5 border border-gray-100 space-y-2">
              <p class="text-sm font-semibold text-gray-900">Was schon gut läuft</p>
              <ul class="space-y-1.5">
                <li v-for="(s, i) in audit.strengths" :key="i" class="flex items-start gap-2 text-sm text-gray-600">
                  <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  {{ s }}
                </li>
              </ul>
            </div>

            <!-- Recommendations -->
            <div v-if="audit.recommendations?.length" class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
              <p class="text-sm font-semibold text-gray-900">Empfehlungen für mehr Reichweite</p>
              <div v-for="(rec, i) in audit.recommendations" :key="i" class="border border-gray-100 rounded-xl p-4 space-y-2">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" :class="priorityBadgeClass(rec.priority)">
                      {{ priorityLabel(rec.priority) }}
                    </span>
                    <p class="text-sm font-semibold text-gray-900">{{ rec.title }}</p>
                  </div>
                  <button
                    v-if="rec.tab && tabs.some(t => t.id === rec.tab)"
                    type="button"
                    @click="activeTab = rec.tab"
                    class="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >Beheben →</button>
                </div>
                <p class="text-sm text-gray-600">{{ rec.description }}</p>
                <div class="flex gap-3 text-xs text-gray-400">
                  <span>Impact: <span class="font-medium text-gray-600">{{ impactLabel(rec.impact) }}</span></span>
                  <span>Aufwand: <span class="font-medium text-gray-600">{{ impactLabel(rec.effort) }}</span></span>
                </div>
              </div>
            </div>

            <!-- Raw facts -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100">
              <p class="text-sm font-semibold text-gray-900 mb-3">Zahlen im Überblick</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <p class="text-lg font-bold text-gray-900">{{ audit.facts.reviewCount }}</p>
                  <p class="text-xs text-gray-400">Bewertungen · Ø{{ audit.facts.averageRating.toFixed(1) }}★</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-gray-900">{{ audit.facts.lastPostDaysAgo ?? '–' }}</p>
                  <p class="text-xs text-gray-400">Tage seit letztem Post</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-gray-900">{{ audit.facts.photoCount }}</p>
                  <p class="text-xs text-gray-400">Veröffentlichte Fotos</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-gray-900">{{ audit.facts.hoursConfiguredDays }}/7</p>
                  <p class="text-xs text-gray-400">Öffnungstage hinterlegt</p>
                </div>
              </div>
            </div>
          </template>

          <div v-else class="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <p class="text-sm text-gray-500">Starte deine erste Analyse — dauert ca. 15–20 Sekunden.</p>
          </div>
        </div>

        <!-- Profile tab -->
        <div v-if="selectedLocationId && activeTab === 'profile'" class="space-y-4">
          <div v-if="profileLoading" class="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-40" />
          <template v-else>
            <!-- Beschreibung & Kontakt -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
              <p class="text-sm font-semibold text-gray-900">Über uns & Kontakt</p>
              <GbpAiTextField
                v-model="profileForm.description"
                context="profile_description"
                :location-id="selectedLocationId"
                :default-keywords="settingsKeywords"
                label="Beschreibung"
                placeholder="Rohtext oder Stichworte — dann SEO-Beschreibung generieren…"
                :max-length="750"
                :rows="5"
              />
              <div class="grid sm:grid-cols-2 gap-4">
                <label class="block space-y-1">
                  <span class="text-xs font-medium text-gray-600">Telefon</span>
                  <input v-model="profileForm.phoneNumber" placeholder="+41 44 000 00 00" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
                <label class="block space-y-1">
                  <span class="text-xs font-medium text-gray-600">Website</span>
                  <input v-model="profileForm.websiteUri" placeholder="https://…" class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
              </div>
              <div class="flex items-center justify-between">
                <p v-if="profileSaved" class="text-xs text-green-600">Gespeichert</p>
                <span v-else />
                <button @click="saveProfileBasics" :disabled="profileSaving" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {{ profileSaving ? 'Speichern…' : 'Speichern' }}
                </button>
              </div>
            </div>

            <!-- Öffnungszeiten -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
              <p class="text-sm font-semibold text-gray-900">Öffnungszeiten</p>
              <div class="space-y-2">
                <div v-for="day in weekDays" :key="day.id" class="flex flex-wrap items-center gap-3">
                  <span class="w-24 text-xs font-medium text-gray-600 shrink-0">{{ day.label }}</span>
                  <label class="flex items-center gap-1.5 text-xs text-gray-500">
                    <input type="checkbox" :checked="!hoursByDay[day.id].closed" @change="hoursByDay[day.id].closed = !($event.target as HTMLInputElement).checked" />
                    Geöffnet
                  </label>
                  <template v-if="!hoursByDay[day.id].closed">
                    <input v-model="hoursByDay[day.id].open" type="time" class="text-sm rounded-lg border border-gray-200 px-2 py-1.5" />
                    <span class="text-xs text-gray-400">bis</span>
                    <input v-model="hoursByDay[day.id].close" type="time" class="text-sm rounded-lg border border-gray-200 px-2 py-1.5" />
                  </template>
                  <span v-else class="text-xs text-gray-400">Geschlossen</span>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <p v-if="hoursSaved" class="text-xs text-green-600">Gespeichert</p>
                <span v-else />
                <button @click="saveHours" :disabled="hoursSaving" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {{ hoursSaving ? 'Speichern…' : 'Öffnungszeiten speichern' }}
                </button>
              </div>
            </div>

            <!-- Kategorien -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
              <p class="text-sm font-semibold text-gray-900">Kategorien</p>
              <div>
                <span class="text-xs font-medium text-gray-600 block mb-1">Hauptkategorie</span>
                <div v-if="profileForm.primaryCategory" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  {{ profileForm.primaryCategory.displayName }}
                  <button type="button" class="text-blue-400 hover:text-blue-800" @click="profileForm.primaryCategory = null">×</button>
                </div>
                <input
                  v-else
                  v-model="categorySearch.primary"
                  type="text"
                  placeholder="Kategorie suchen, z.B. Fahrschule…"
                  class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 mt-1"
                  @input="searchCategories('primary')"
                />
                <div v-if="categoryResults.primary.length" class="mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-48 overflow-y-auto">
                  <button
                    v-for="c in categoryResults.primary"
                    :key="c.categoryId"
                    type="button"
                    class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    @click="selectPrimaryCategory(c)"
                  >{{ c.displayName }}</button>
                </div>
              </div>
              <div>
                <span class="text-xs font-medium text-gray-600 block mb-1">Weitere Kategorien</span>
                <div class="flex flex-wrap gap-1.5 mb-2">
                  <span v-for="c in profileForm.additionalCategories" :key="c.categoryId" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    {{ c.displayName }}
                    <button type="button" class="text-gray-400 hover:text-gray-800" @click="removeAdditionalCategory(c.categoryId)">×</button>
                  </span>
                </div>
                <input
                  v-model="categorySearch.additional"
                  type="text"
                  placeholder="Weitere Kategorie hinzufügen…"
                  class="w-full text-sm rounded-lg border border-gray-200 px-3 py-2"
                  @input="searchCategories('additional')"
                />
                <div v-if="categoryResults.additional.length" class="mt-1 bg-white border border-gray-200 rounded-lg shadow-sm max-h-48 overflow-y-auto">
                  <button
                    v-for="c in categoryResults.additional"
                    :key="c.categoryId"
                    type="button"
                    class="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    @click="addAdditionalCategory(c)"
                  >{{ c.displayName }}</button>
                </div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <p v-if="categoriesSaved" class="text-xs text-green-600">Gespeichert</p>
                <span v-else />
                <button @click="saveCategories" :disabled="categoriesSaving || !profileForm.primaryCategory" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {{ categoriesSaving ? 'Speichern…' : 'Kategorien speichern' }}
                </button>
              </div>
            </div>

            <!-- Services -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-gray-900">Leistungen</p>
                  <p class="text-xs text-gray-400 mt-0.5">Erscheinen im Google-Profil als Service-Liste. Benötigt eine gesetzte Hauptkategorie.</p>
                </div>
                <button
                  type="button"
                  @click="generateServiceSuggestions"
                  :disabled="generatingServices"
                  class="shrink-0 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {{ generatingServices ? 'KI schreibt…' : '✦ Mit KI vorschlagen' }}
                </button>
              </div>
              <p v-if="serviceSuggestError" class="text-xs text-red-500">{{ serviceSuggestError }}</p>
              <div v-if="services.length === 0" class="text-sm text-gray-400 py-2">Noch keine Leistungen hinzugefügt</div>
              <div v-for="(s, i) in services" :key="i" class="flex items-start gap-3 border border-gray-100 rounded-xl p-3">
                <input type="checkbox" v-model="s.isOffered" class="mt-1" title="Wird angeboten" />
                <div class="flex-1 min-w-0 space-y-1">
                  <input v-model="s.name" placeholder="Name der Leistung" class="w-full text-sm font-medium rounded-lg border border-gray-200 px-2 py-1.5" />
                  <input v-model="s.description" placeholder="Beschreibung (optional)" class="w-full text-xs rounded-lg border border-gray-200 px-2 py-1.5" />
                </div>
                <button type="button" @click="services.splice(i, 1)" class="text-gray-300 hover:text-red-500 shrink-0 mt-1">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <button type="button" @click="services.push({ isOffered: true, name: '', description: null, priceAmount: null, priceCurrency: null })" class="text-xs font-semibold text-blue-600 hover:text-blue-700">
                + Leistung hinzufügen
              </button>
              <div class="flex items-center justify-between pt-1">
                <p v-if="servicesSaved" class="text-xs text-green-600">Gespeichert</p>
                <span v-else />
                <button @click="saveServices" :disabled="servicesSaving" class="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {{ servicesSaving ? 'Speichern…' : 'Leistungen speichern' }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Posts tab -->
        <div v-if="selectedLocationId && activeTab === 'posts'" class="space-y-4">
          <!-- New post form -->
          <div class="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
            <p class="text-sm font-semibold text-gray-900">Neuer Post</p>
            <GbpAiTextField
              v-model="newPost.summary"
              context="post"
              :location-id="selectedLocationId"
              :default-keywords="settingsKeywords"
              label="Post-Text"
              placeholder="Rohtext oder Stichworte — dann SEO-Text generieren…"
              :max-length="1500"
              :rows="5"
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
              <span class="text-xs text-gray-400">CTA & Typ unten wählen</span>
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

            <div class="space-y-3">
              <div>
                <span class="text-xs font-medium text-gray-600 mb-1.5 block">Datei</span>
                <input
                  ref="poolFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="onPoolFile"
                />
                <div
                  role="button"
                  tabindex="0"
                  class="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50/40 transition-colors cursor-pointer"
                  @click="poolFileInput?.click()"
                  @keydown.enter.prevent="poolFileInput?.click()"
                  @keydown.space.prevent="poolFileInput?.click()"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-blue-600">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-medium text-gray-900 truncate">
                      {{ poolFile ? poolFile.name : 'Bild auswählen' }}
                    </span>
                    <span class="block text-xs text-gray-400 truncate">
                      {{ poolFile ? formatFileSize(poolFile.size) : 'JPEG, PNG oder WebP' }}
                    </span>
                  </span>
                  <button
                    v-if="poolFile"
                    type="button"
                    @click.stop="clearPoolFile"
                    class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
                    aria-label="Datei entfernen"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select v-model="poolCategory" class="w-full sm:flex-1 bg-white text-gray-900 text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="INTERIOR">Innen</option>
                  <option value="EXTERIOR">Aussen</option>
                  <option value="LOGO">Logo</option>
                  <option value="COVER">Titelbild</option>
                  <option value="PRODUCT">Produkt</option>
                </select>
                <label class="flex items-center gap-2 text-xs text-gray-600 shrink-0">
                  <input type="checkbox" v-model="poolApprovedOnUpload" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Sofort freigeben
                </label>
              </div>

              <GbpAiTextField
                v-model="poolNotes"
                context="photo_caption"
                :location-id="selectedLocationId"
                :default-keywords="settingsKeywords"
                label="Foto-Beschreibung (optional, für Google SEO)"
                placeholder="Stichworte oder Rohtext — KI macht daraus eine Caption…"
                :max-length="250"
                :rows="3"
              />

              <button
                type="button"
                @click="uploadToPool"
                :disabled="!poolFile || poolUploading"
                class="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {{ poolUploading ? 'Upload…' : 'In Pool laden' }}
              </button>
            </div>

            <div class="border-t border-gray-100 pt-4 space-y-3">
              <p class="text-xs font-medium text-gray-500">Oder per URL hinzufügen</p>
              <input
                v-model="photoUrl"
                placeholder="https://example.com/foto.jpg"
                class="block w-full min-w-0 text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  @click="addUrlToPool"
                  :disabled="!photoUrl || poolUploading"
                  class="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  URL → Pool
                </button>
                <button
                  @click="uploadPhoto"
                  :disabled="!photoUrl || photoUploading"
                  class="w-full sm:w-auto px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
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
                  <p v-if="asset.notes" class="text-xs text-gray-500 line-clamp-2">{{ asset.notes }}</p>
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
                  <GbpAiTextField
                    v-model="replyText"
                    context="review_reply"
                    :location-id="selectedLocationId"
                    :default-keywords="settingsKeywords"
                    label="Antwort"
                    placeholder="Antwort schreiben oder KI generieren…"
                    :max-length="500"
                    :rows="3"
                    :review-context="{
                      reviewerName: review.reviewer?.displayName,
                      starRating: starRating(review.starRating),
                      reviewText: review.comment,
                    }"
                  />
                  <div class="flex gap-2 flex-wrap">
                    <button @click="submitReply(review.reviewId)" :disabled="replying" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                      {{ replying ? 'Senden…' : 'Antworten' }}
                    </button>
                    <button @click="replyingTo = null" class="px-3 py-1.5 rounded-lg text-gray-500 text-xs hover:bg-gray-100 transition-colors">Abbrechen</button>
                  </div>
                </div>
                <div v-else class="flex gap-3">
                  <button @click="replyingTo = review.reviewId; replyText = ''" class="text-xs text-blue-600 hover:text-blue-700 font-medium">Antworten</button>
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
                <GbpAiTextField
                  :model-value="ra.suggested_reply"
                  context="review_reply"
                  :location-id="selectedLocationId"
                  label="Antwort"
                  :max-length="500"
                  :rows="3"
                  :review-context="{
                    reviewerName: ra.reviewer_name,
                    starRating: ra.star_rating,
                    reviewText: ra.review_comment,
                  }"
                  @update:model-value="(v: string) => { ra.suggested_reply = v }"
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
  { id: 'analysis', label: 'Analyse' },
  { id: 'profile', label: 'Profil' },
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
const showUnlinkLocation = ref(false)
const unlinkingLocation = ref(false)
const unlinkingLocationId = ref<string | null>(null)

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
    if (status.value?.connected && selectedLocationId.value) {
      await loadSettingsKeywords()
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
  insightsMeta.value = null
  reviews.value = []
  posts.value = []
  scheduledPosts.value = []
  reviewActions.value = []
  mediaAssets.value = []
  await loadSettingsKeywords()
  audit.value = null
  analysisChecked.value = false
  if (activeTab.value === 'insights') loadInsights()
  if (activeTab.value === 'analysis') loadAnalysis()
  if (activeTab.value === 'profile') loadProfileTab()
  if (activeTab.value === 'reviews') loadReviews()
  if (activeTab.value === 'posts') loadPosts()
  if (activeTab.value === 'photos') loadMedia()
  if (activeTab.value === 'automation') loadQueue()
  if (activeTab.value === 'settings') loadSettings()
}

function toggleAddLocation() {
  showUnlinkLocation.value = false
  showAddLocation.value = !showAddLocation.value
  if (showAddLocation.value) loadAccounts()
}

function toggleUnlinkLocation() {
  showAddLocation.value = false
  showUnlinkLocation.value = !showUnlinkLocation.value
}

async function unlinkLocation(id: string) {
  unlinkingLocation.value = true
  unlinkingLocationId.value = id
  try {
    await $fetch(`/api/gbp/locations/${id}`, { method: 'DELETE' })
    showUnlinkLocation.value = true
    await loadStatus()
    if (linkedLocations.value.length === 0) {
      showUnlinkLocation.value = false
      showAddLocation.value = true
      await loadAccounts()
    }
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Standort konnte nicht getrennt werden')
  } finally {
    unlinkingLocation.value = false
    unlinkingLocationId.value = null
  }
}

async function disconnectAccount() {
  if (!confirm('Google-Konto wirklich komplett trennen? Alle Standorte und die OAuth-Verbindung werden entfernt.')) return
  disconnecting.value = true
  try {
    await $fetch('/api/gbp/disconnect', { method: 'DELETE' })
    status.value = { connected: false }
    linkedLocations.value = []
    selectedLocationId.value = null
    showAddLocation.value = false
    showUnlinkLocation.value = false
  } finally {
    disconnecting.value = false
  }
}

// Insights
const insightsLoading = ref(false)
const insightsError = ref('')
const insightMetrics = ref<{ label: string; value: number }[]>([])
const insightsMeta = ref<{
  displayDays: number
  historyFrom: string | null
  historyTo: string | null
  lastSyncedAt: string | null
} | null>(null)

async function loadInsights() {
  if (!status.value?.connected || !selectedLocationId.value) return
  insightsLoading.value = true
  insightsError.value = ''
  try {
    const data = await $fetch<any>('/api/gbp/insights', { query: locQuery() })
    const t = data.totals ?? {}
    insightMetrics.value = [
      { label: 'Profilaufrufe Maps', value: (t.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) + (t.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) },
      { label: 'Website-Klicks', value: t.WEBSITE_CLICKS || 0 },
      { label: 'Anruf-Klicks', value: t.CALL_CLICKS || 0 },
      { label: 'Routenanfragen', value: t.BUSINESS_DIRECTION_REQUESTS || 0 },
    ]
    insightsMeta.value = {
      displayDays: data.displayDays ?? 28,
      historyFrom: data.historyFrom ?? null,
      historyTo: data.historyTo ?? null,
      lastSyncedAt: data.lastSyncedAt ?? null,
    }
  } catch (e: any) {
    insightsError.value = e?.data?.statusMessage || e?.message || 'Insights konnten nicht geladen werden'
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

// Analysis tab
const audit = ref<any>(null)
const analysisLoading = ref(false)
const analysisRunning = ref(false)
const analysisError = ref('')
const analysisChecked = ref(false)

async function loadAnalysis() {
  analysisLoading.value = true
  analysisError.value = ''
  try {
    const res = await $fetch<any>('/api/gbp/analysis', { query: locQuery() })
    audit.value = res.audit
    analysisChecked.value = true
  } catch (e: any) {
    analysisError.value = e?.data?.statusMessage || 'Analyse konnte nicht geladen werden'
  } finally {
    analysisLoading.value = false
  }
}

async function runAnalysis() {
  analysisRunning.value = true
  analysisError.value = ''
  try {
    const res = await $fetch<any>('/api/gbp/analysis', { method: 'POST', body: { locationId: selectedLocationId.value } })
    audit.value = res.audit
    analysisChecked.value = true
  } catch (e: any) {
    analysisError.value = e?.data?.statusMessage || 'Analyse fehlgeschlagen'
  } finally {
    analysisRunning.value = false
  }
}

function scoreLabel(score: number): string {
  if (score >= 85) return 'Exzellent aufgestellt'
  if (score >= 70) return 'Gut ausgebaut'
  if (score >= 50) return 'Ausbaufähig'
  return 'Kritischer Handlungsbedarf'
}
function scoreRingClass(score: number): string {
  if (score >= 85) return 'bg-green-50 text-green-600'
  if (score >= 70) return 'bg-blue-50 text-blue-600'
  if (score >= 50) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}
function scoreTextClass(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}
function scoreBarClass(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}
function priorityLabel(p: string): string {
  return p === 'critical' ? 'Kritisch' : p === 'important' ? 'Wichtig' : 'Optional'
}
function priorityBadgeClass(p: string): string {
  if (p === 'critical') return 'bg-red-100 text-red-700'
  if (p === 'important') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}
function impactLabel(v: string): string {
  return v === 'high' ? 'Hoch' : v === 'medium' ? 'Mittel' : 'Niedrig'
}

// Profile tab
const weekDays = [
  { id: 'MONDAY', label: 'Montag' },
  { id: 'TUESDAY', label: 'Dienstag' },
  { id: 'WEDNESDAY', label: 'Mittwoch' },
  { id: 'THURSDAY', label: 'Donnerstag' },
  { id: 'FRIDAY', label: 'Freitag' },
  { id: 'SATURDAY', label: 'Samstag' },
  { id: 'SUNDAY', label: 'Sonntag' },
]
type CategoryOption = { categoryId: string; displayName: string }
const profileLoading = ref(false)
const profileForm = ref<{
  description: string
  phoneNumber: string
  websiteUri: string
  primaryCategory: CategoryOption | null
  additionalCategories: CategoryOption[]
} | null>(null)
const profileSaving = ref(false)
const profileSaved = ref(false)
const hoursByDay = reactive<Record<string, { closed: boolean; open: string; close: string }>>(
  Object.fromEntries(weekDays.map(d => [d.id, { closed: true, open: '09:00', close: '18:00' }]))
)
const hoursSaving = ref(false)
const hoursSaved = ref(false)
const categorySearch = reactive({ primary: '', additional: '' })
const categoryResults = reactive<{ primary: CategoryOption[]; additional: CategoryOption[] }>({ primary: [], additional: [] })
let categorySearchTimer: ReturnType<typeof setTimeout> | null = null
const categoriesSaving = ref(false)
const categoriesSaved = ref(false)
const services = ref<{ isOffered: boolean; name: string; description: string | null; priceAmount: number | null; priceCurrency: string | null }[]>([])
const servicesSaving = ref(false)
const servicesSaved = ref(false)
const generatingServices = ref(false)
const serviceSuggestError = ref('')

async function generateServiceSuggestions() {
  generatingServices.value = true
  serviceSuggestError.value = ''
  try {
    const res = await $fetch<any>('/api/gbp/services/ai-generate', {
      method: 'POST',
      body: {
        locationId: selectedLocationId.value,
        existingServiceNames: services.value.map(s => s.name).filter(Boolean),
      },
    })
    const existingNames = new Set(services.value.map(s => s.name.trim().toLowerCase()))
    for (const s of res.suggestions ?? []) {
      if (!existingNames.has(s.name.trim().toLowerCase())) {
        services.value.push({ isOffered: true, name: s.name, description: s.description || null, priceAmount: null, priceCurrency: null })
        existingNames.add(s.name.trim().toLowerCase())
      }
    }
  } catch (e: any) {
    serviceSuggestError.value = e?.data?.statusMessage || 'Vorschläge konnten nicht geladen werden'
  } finally {
    generatingServices.value = false
  }
}

async function loadProfileTab() {
  profileLoading.value = true
  try {
    const [profileRes, servicesRes] = await Promise.all([
      $fetch<any>('/api/gbp/profile', { query: locQuery() }),
      $fetch<any>('/api/gbp/services', { query: locQuery() }),
    ])
    const p = profileRes.profile
    profileForm.value = {
      description: p.description || '',
      phoneNumber: p.phoneNumber || '',
      websiteUri: p.websiteUri || '',
      primaryCategory: p.primaryCategory,
      additionalCategories: p.additionalCategories || [],
    }
    for (const day of weekDays) hoursByDay[day.id] = { closed: true, open: '09:00', close: '18:00' }
    for (const period of p.regularHours || []) {
      if (hoursByDay[period.openDay]) {
        hoursByDay[period.openDay] = { closed: false, open: period.openTime, close: period.closeTime }
      }
    }
    services.value = servicesRes.services || []
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Profil konnte nicht geladen werden')
  } finally {
    profileLoading.value = false
  }
}

async function saveProfileBasics() {
  if (!profileForm.value) return
  profileSaving.value = true
  profileSaved.value = false
  try {
    await $fetch('/api/gbp/profile', {
      method: 'PUT',
      body: {
        locationId: selectedLocationId.value,
        description: profileForm.value.description,
        phoneNumber: profileForm.value.phoneNumber,
        websiteUri: profileForm.value.websiteUri,
      },
    })
    profileSaved.value = true
    setTimeout(() => (profileSaved.value = false), 2500)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Speichern fehlgeschlagen')
  } finally {
    profileSaving.value = false
  }
}

async function saveHours() {
  hoursSaving.value = true
  hoursSaved.value = false
  try {
    const regularHours = weekDays
      .filter(d => !hoursByDay[d.id].closed)
      .map(d => ({
        openDay: d.id,
        closeDay: d.id,
        openTime: hoursByDay[d.id].open,
        closeTime: hoursByDay[d.id].close,
      }))
    await $fetch('/api/gbp/profile', {
      method: 'PUT',
      body: { locationId: selectedLocationId.value, regularHours },
    })
    hoursSaved.value = true
    setTimeout(() => (hoursSaved.value = false), 2500)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Öffnungszeiten konnten nicht gespeichert werden')
  } finally {
    hoursSaving.value = false
  }
}

function searchCategories(target: 'primary' | 'additional') {
  if (categorySearchTimer) clearTimeout(categorySearchTimer)
  categorySearchTimer = setTimeout(async () => {
    const q = categorySearch[target].trim()
    if (q.length < 2) {
      categoryResults[target] = []
      return
    }
    try {
      const res = await $fetch<any>('/api/gbp/categories', { query: { q } })
      categoryResults[target] = res.categories || []
    } catch {
      categoryResults[target] = []
    }
  }, 300)
}

function selectPrimaryCategory(c: CategoryOption) {
  if (!profileForm.value) return
  profileForm.value.primaryCategory = c
  categorySearch.primary = ''
  categoryResults.primary = []
}

function addAdditionalCategory(c: CategoryOption) {
  if (!profileForm.value) return
  if (!profileForm.value.additionalCategories.some(x => x.categoryId === c.categoryId)) {
    profileForm.value.additionalCategories.push(c)
  }
  categorySearch.additional = ''
  categoryResults.additional = []
}

function removeAdditionalCategory(categoryId: string) {
  if (!profileForm.value) return
  profileForm.value.additionalCategories = profileForm.value.additionalCategories.filter(c => c.categoryId !== categoryId)
}

async function saveCategories() {
  if (!profileForm.value?.primaryCategory) return
  categoriesSaving.value = true
  categoriesSaved.value = false
  try {
    await $fetch('/api/gbp/profile', {
      method: 'PUT',
      body: {
        locationId: selectedLocationId.value,
        primaryCategoryId: profileForm.value.primaryCategory.categoryId,
        additionalCategoryIds: profileForm.value.additionalCategories.map(c => c.categoryId),
      },
    })
    categoriesSaved.value = true
    setTimeout(() => (categoriesSaved.value = false), 2500)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Kategorien konnten nicht gespeichert werden')
  } finally {
    categoriesSaving.value = false
  }
}

async function saveServices() {
  servicesSaving.value = true
  servicesSaved.value = false
  try {
    await $fetch('/api/gbp/services', {
      method: 'PUT',
      body: { locationId: selectedLocationId.value, services: services.value.filter(s => s.name.trim()) },
    })
    servicesSaved.value = true
    setTimeout(() => (servicesSaved.value = false), 2500)
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Leistungen konnten nicht gespeichert werden')
  } finally {
    servicesSaving.value = false
  }
}

// Posts
const posts = ref<any[]>([])
const postsLoading = ref(false)
const newPost = ref({ summary: '', topicType: 'STANDARD', callToActionType: '', callToActionUrl: '' })
const postPublishing = ref(false)
const settingsKeywords = ref<string[]>([])

// Photos
const photoUrl = ref('')
const photoUploading = ref(false)
const photoResult = ref('')
const mediaAssets = ref<any[]>([])
const mediaLoading = ref(false)
const poolFile = ref<File | null>(null)
const poolFileInput = ref<HTMLInputElement | null>(null)
const poolCategory = ref<'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'>('INTERIOR')
const poolNotes = ref('')
const poolApprovedOnUpload = ref(true)
const poolUploading = ref(false)
const publishingAssetId = ref<string | null>(null)

function onPoolFile(e: Event) {
  const input = e.target as HTMLInputElement
  poolFile.value = input.files?.[0] ?? null
}

function clearPoolFile() {
  poolFile.value = null
  if (poolFileInput.value) poolFileInput.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
    if (poolNotes.value.trim()) fd.append('notes', poolNotes.value.trim())
    await $fetch('/api/gbp/media/upload', { method: 'POST', body: fd })
    clearPoolFile()
    poolNotes.value = ''
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
        notes: poolNotes.value.trim() || undefined,
      },
    })
    photoUrl.value = ''
    poolNotes.value = ''
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

async function loadSettingsKeywords() {
  if (!selectedLocationId.value) {
    settingsKeywords.value = []
    return
  }
  try {
    const data = await $fetch<any>('/api/gbp/settings', { query: locQuery() })
    const s = data.settings ?? data
    settingsKeywords.value = Array.isArray(s.keywords) ? s.keywords : []
  } catch {
    settingsKeywords.value = []
  }
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
        description: poolNotes.value.trim() || undefined,
      },
    })
    photoResult.value = 'Foto erfolgreich hochgeladen!'
    photoUrl.value = ''
    poolNotes.value = ''
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
  // Date-only (YYYY-MM-DD) → avoid timezone shift by treating as local calendar day
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Location picker
const gbpAccounts = ref<any[]>([])
const accountsLoading = ref(false)
const accountsError = ref('')
const linkingLocation = ref(false)
const linkingLocationId = ref<string | null>(null)

/** Normalize "accounts/…/locations/123" or "locations/123" → "locations/123" for comparisons. */
function normalizeGbpLocationResource(name: string): string {
  const match = name.match(/locations\/[^/]+$/)
  return match ? match[0] : name
}

const linkedLocationKeys = computed(() =>
  new Set(linkedLocations.value.map((l) => normalizeGbpLocationResource(l.gbpLocationId)))
)

const hasGoogleLocations = computed(() =>
  gbpAccounts.value.some((a) => (a.locations ?? []).length > 0)
)

const allLocations = computed(() => {
  const locs: { locationId: string; title: string; accountName: string; gbpAccountName: string }[] = []
  const linked = linkedLocationKeys.value
  for (const account of gbpAccounts.value) {
    for (const loc of account.locations ?? []) {
      const locationId = loc.name as string
      if (linked.has(normalizeGbpLocationResource(locationId))) continue
      locs.push({
        locationId,
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
  linkingLocationId.value = location.locationId
  const previousSelected = selectedLocationId.value
  try {
    const res = await $fetch<any>('/api/gbp/link-location', {
      method: 'POST',
      body: {
        gbpAccountName: location.gbpAccountName,
        gbpLocationId: location.locationId,
        gbpLocationName: location.title,
      },
    })
    // Stay in the picker so multiple locations can be linked; user closes with "Fertig".
    showAddLocation.value = true
    await loadStatus()
    // Only auto-select when this was the first linked location
    if (!previousSelected && res?.location?.id) {
      selectedLocationId.value = res.location.id
      loadInsights()
      loadReviews()
    }
  } catch (e: any) {
    alert(e?.data?.statusMessage || 'Verknüpfung fehlgeschlagen')
  } finally {
    linkingLocation.value = false
    linkingLocationId.value = null
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
  if (tab === 'analysis' && !analysisChecked.value && !analysisLoading.value) loadAnalysis()
  if (tab === 'profile' && !profileForm.value) loadProfileTab()
  if (tab === 'reviews' && reviews.value.length === 0) loadReviews()
  if (tab === 'posts' && posts.value.length === 0) loadPosts()
  if (tab === 'photos') loadMedia()
  if (tab === 'automation') loadQueue()
  if (tab === 'settings') loadSettings()
})
</script>
