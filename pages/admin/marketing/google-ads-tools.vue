<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-3">
            <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Google Ads</h1>
              <p v-if="gadsSettings?.connected" class="text-xs text-gray-400 mt-0.5">
                Konto: {{ gadsSettings.google_ads_customer_id }} · Alle Kampagnen werden PAUSED erstellt
              </p>
              <p v-else class="text-xs text-amber-600 mt-0.5 font-medium">Noch nicht verbunden</p>
            </div>
          </div>
          <!-- Connection status + quick edit -->
          <div class="flex items-center gap-2">
            <span v-if="gadsSettings?.connected" class="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              Verbunden
            </span>
            <span v-else class="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              Nicht verbunden
            </span>
            <button @click="showConnectionEdit = !showConnectionEdit" class="text-xs text-gray-500 hover:text-gray-800 underline">
              {{ gadsSettings?.connected ? 'Ändern' : 'Verbinden' }}
            </button>
          </div>
        </div>
        <!-- Inline customer ID editor -->
        <div v-if="showConnectionEdit" class="mt-4 p-4 bg-gray-50 rounded-xl border flex gap-3 items-end">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Google Ads Customer ID</label>
            <input
              v-model="editCustomerId"
              type="text"
              placeholder="191-669-8119"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <p class="text-xs text-gray-400 mt-1">Format: XXX-XXX-XXXX (10-stellige Nummer aus Google Ads → Konto → Einstellungen)</p>
          </div>
          <button
            @click="saveCustomerId"
            :disabled="savingCustomerId"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {{ savingCustomerId ? 'Speichern…' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Not connected gate -->
    <div v-if="gadsSettings && !gadsSettings.connected" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Google Ads noch nicht verbunden</h2>
      <p class="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Trage deine Google Ads Customer ID ein, um Kampagnen von hier aus zu verwalten.</p>
      <button @click="showConnectionEdit = true" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
        Jetzt verbinden
      </button>
    </div>

    <div v-else-if="gadsSettings?.connected" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      <!-- ═══════════════════════════════════════════════════════════════════
           SECTION 1: Promo-Kampagne
      ════════════════════════════════════════════════════════════════════ -->
      <section>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900">Promo-Kampagne</h2>
            <p class="text-sm text-gray-500">Zeitlich limitierte Aktionskampagne pro Standort (z.B. Halber Preis auf 1. Fahrstunde)</p>
          </div>
        </div>

        <div class="bg-white rounded-2xl border overflow-hidden">
          <div class="px-6 py-5 space-y-5">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Standort</label>
                <select v-model="promo.location" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="zuerich">Zürich</option>
                  <option value="lachen">Lachen</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tagesbudget (CHF)</label>
                <input v-model.number="promo.daily_budget_chf" type="number" min="5" max="200" step="5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Normalpreis (CHF)</label>
                <input v-model.number="promo.original_price_chf" type="number" min="10" max="500" step="5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Aktionspreis (CHF)</label>
                <input v-model.number="promo.offer_price_chf" type="number" min="5" max="500" step="0.5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Aktionsdauer bis</label>
                <input v-model="promo.offer_end_date" type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Rabatt
                </label>
                <div class="flex items-center h-10 text-sm font-semibold" :class="promoDiscount === 50 ? 'text-green-700' : 'text-gray-700'">
                  {{ promoDiscount }}% Rabatt
                  <span v-if="promoDiscount === 50" class="ml-2 text-xs font-normal text-green-600">(= Halber Preis)</span>
                </div>
              </div>
            </div>

            <!-- Landing page override -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Landing Page (optional, sonst Standardseite)</label>
              <input v-model="promo.landing_page" type="url" placeholder="https://drivingteam.ch/..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            <div class="flex flex-wrap gap-3 pt-1">
              <button @click="runPromo(true)" :disabled="promoLoading"
                class="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Vorschau
              </button>
              <button @click="runPromo(false)" :disabled="promoLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                <svg v-if="promoLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                {{ promoLoading ? 'Erstelle…' : 'Kampagne erstellen (PAUSED)' }}
              </button>
            </div>
          </div>

          <ToolResult :result="promoResult" />
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════════
           SECTION 2: Spezifische Kampagnen erstellen
      ════════════════════════════════════════════════════════════════════ -->
      <section>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900">Spezifische Kampagnen erstellen</h2>
            <p class="text-sm text-gray-500">Vorkonfigurierte Kampagnen für spezifische Angebote und Standorte</p>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <!-- Brand Campaign -->
          <ToolCard
            title="Brand-Kampagne"
            description="Driving Team Markenbegriffe schützen (drivingteam, fahrschule driving team…)"
            badge="Brand"
            badge-color="purple"
            :loading="brandLoading"
            :result="brandResult"
            @run="runEndpoint('/api/admin/gads-create-brand-campaign', {}, brandLoading, brandResult)"
          />

          <!-- CZV Kampagne -->
          <div class="bg-white rounded-2xl border overflow-hidden">
            <div class="px-5 py-4 border-b">
              <div class="flex items-start justify-between">
                <div>
                  <span class="text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">CZV</span>
                  <h3 class="text-sm font-semibold text-gray-900 mt-1.5">CZV Grundkurs Lachen</h3>
                  <p class="text-xs text-gray-500 mt-0.5">Berufschauffeure / LKW-Führerschein, 20km Radius Lachen</p>
                </div>
              </div>
              <label class="flex items-center gap-2 mt-3 cursor-pointer">
                <input v-model="czvAdsOnly" type="checkbox" class="rounded border-gray-300" />
                <span class="text-xs text-gray-600">Nur Anzeigen hinzufügen (Kampagne existiert bereits)</span>
              </label>
            </div>
            <div class="px-5 py-3 flex gap-2">
              <button @click="runEndpoint('/api/admin/gads-create-czv-campaign', { ads_only: czvAdsOnly }, czvLoading, czvResult)"
                :disabled="czvLoading"
                class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5">
                <svg v-if="czvLoading" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ czvLoading ? 'Erstelle…' : (czvAdsOnly ? 'Anzeigen hinzufügen' : 'Kampagne erstellen') }}
              </button>
            </div>
            <ToolResult :result="czvResult" compact />
          </div>

          <!-- Motorrad Zürich -->
          <ToolCard
            title="Motorrad Grundkurs Zürich"
            description="Motorradkurs Zürich, EXACT/PHRASE nur, 25km Radius Altstetten"
            badge="Moto"
            badge-color="red"
            :loading="motoLoading"
            :result="motoResult"
            @run="runEndpoint('/api/admin/gads-create-motorrad-zuerich', {}, motoLoading, motoResult)"
          />
        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════════
           SECTION 3: Keywords & Gebote
      ════════════════════════════════════════════════════════════════════ -->
      <section>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900">Keywords & Gebote</h2>
            <p class="text-sm text-gray-500">Keywords hinzufügen, optimieren und Gebote anpassen</p>
          </div>
        </div>

        <div class="space-y-4">

          <!-- Negative Keywords -->
          <div class="bg-white rounded-2xl border overflow-hidden">
            <div class="px-6 py-5 border-b">
              <h3 class="text-sm font-semibold text-gray-900">Negative Keywords hinzufügen</h3>
              <p class="text-xs text-gray-500 mt-0.5">Competitor-Namen und irrelevante Suchanfragen auf allen Kampagnen blockieren</p>
            </div>
            <div class="px-6 py-5 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Preset</label>
                <select v-model="negKw.preset" class="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="competitors_and_irrelevant">Competitors + Irrelevantes (empfohlen)</option>
                  <option value="competitors">Nur Competitors</option>
                  <option value="irrelevant">Nur Irrelevantes</option>
                </select>
              </div>
              <div class="flex gap-3">
                <button @click="runNegKw(true)" :disabled="negKwLoading"
                  class="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2">
                  Vorschau
                </button>
                <button @click="runNegKw(false)" :disabled="negKwLoading"
                  class="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2">
                  <svg v-if="negKwLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {{ negKwLoading ? 'Läuft…' : 'Anwenden' }}
                </button>
              </div>
            </div>
            <ToolResult :result="negKwResult" />
          </div>

          <!-- Missing Keywords -->
          <ToolCard
            title="Fehlende Keywords hinzufügen"
            description="Hochintentionale Keywords für BE/Anhänger (Zürich + Lachen), Fahrstunden Stadtteile Zürich"
            badge="Keywords"
            badge-color="green"
            :loading="missingKwLoading"
            :result="missingKwResult"
            confirm-message="Fehlende Keywords werden zu den entsprechenden Kampagnen hinzugefügt."
            @run="runEndpoint('/api/admin/gads-add-missing-keywords', {}, missingKwLoading, missingKwResult)"
          />

          <!-- Increase Bids / TIS -->
          <ToolCard
            title="Gebote erhöhen (TIS-Kampagnen)"
            description="CPC-Ceiling für Target Impression Share Kampagnen anpassen"
            badge="Gebote"
            badge-color="yellow"
            :loading="bidsLoading"
            :result="bidsResult"
            confirm-message="CPC-Ceilings der TIS-Kampagnen werden angepasst."
            @run="runEndpoint('/api/admin/gads-increase-bids', {}, bidsLoading, bidsResult)"
          />

          <!-- Fix Match Types -->
          <ToolCard
            title="Match-Types korrigieren"
            description="Broad-Match Keywords auf Phrase/Exact umstellen wo sinnvoll"
            badge="Match"
            badge-color="gray"
            :loading="matchLoading"
            :result="matchResult"
            confirm-message="Match-Types werden in allen Kampagnen bereinigt."
            @run="runEndpoint('/api/admin/gads-fix-match-types', {}, matchLoading, matchResult)"
          />

          <!-- Pause Low QS Keywords -->
          <ToolCard
            title="Schwache Keywords pausieren"
            description="Keywords mit Quality Score ≤ 3 und wenig Conversions pausieren"
            badge="QS"
            badge-color="red"
            :loading="pauseKwLoading"
            :result="pauseKwResult"
            confirm-message="Keywords mit schlechtem Quality Score werden pausiert."
            @run="runEndpoint('/api/admin/gads-pause-low-qs-keywords', {}, pauseKwLoading, pauseKwResult)"
          />

          <!-- Keyword Max-CPC -->
          <div class="bg-white rounded-2xl border overflow-hidden">
            <div class="px-6 py-5 border-b">
              <h3 class="text-sm font-semibold text-gray-900">Max-CPC global setzen</h3>
              <p class="text-xs text-gray-500 mt-0.5">Setzt das Max-CPC-Gebot für alle (oder gefilterte) Keywords auf einmal</p>
            </div>
            <div class="px-6 py-5 space-y-4">
              <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">CHF</span>
                  <input v-model.number="cpcForm.maxCpc" type="number" min="0.10" max="50" step="0.50"
                    class="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input v-model="cpcForm.useThreshold" type="checkbox" class="rounded border-gray-300" />
                  Nur über CHF
                  <input v-model.number="cpcForm.threshold" type="number" min="0" step="0.5"
                    class="w-16 px-1.5 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-300" />
                </label>
              </div>
              <div class="flex gap-3">
                <button @click="runCpc(true)" :disabled="cpcLoading"
                  class="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50">
                  Vorschau
                </button>
                <button @click="runCpc(false)" :disabled="cpcLoading"
                  class="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2">
                  <svg v-if="cpcLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {{ cpcLoading ? 'Läuft…' : 'Anwenden' }}
                </button>
              </div>
            </div>
            <ToolResult :result="cpcResult" />
          </div>

        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════════
           SECTION 4: Kampagnen-Management
      ════════════════════════════════════════════════════════════════════ -->
      <section>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900">Kampagnen-Management</h2>
            <p class="text-sm text-gray-500">Budgets, kampagnenübergreifende Optimierungen und Analyse</p>
          </div>
        </div>

        <div class="space-y-4">

          <!-- Update Budget -->
          <div class="bg-white rounded-2xl border overflow-hidden">
            <div class="px-6 py-5 border-b">
              <h3 class="text-sm font-semibold text-gray-900">Tagesbudget ändern</h3>
              <p class="text-xs text-gray-500 mt-0.5">Budget einer bestehenden Kampagne anpassen</p>
            </div>
            <div class="px-6 py-5 space-y-4">
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Kampagnenname (Teil)</label>
                  <input v-model="budgetForm.campaignName" type="text" placeholder="z.B. Fahrschule Zürich"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Neues Budget (CHF/Tag)</label>
                  <input v-model.number="budgetForm.newBudget" type="number" min="1" max="500" step="1"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <button
                @click="runEndpoint('/api/admin/gads-update-campaign-budget', { campaign_name: budgetForm.campaignName, daily_budget_chf: budgetForm.newBudget }, budgetLoading, budgetResult)"
                :disabled="budgetLoading || !budgetForm.campaignName"
                class="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2">
                <svg v-if="budgetLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ budgetLoading ? 'Läuft…' : 'Budget ändern' }}
              </button>
            </div>
            <ToolResult :result="budgetResult" />
          </div>

          <!-- Cross-campaign negatives -->
          <ToolCard
            title="Kampagnenübergreifende Negatives"
            description="Schliesst aus, dass eigene Kampagnen gegeneinander bieten (Lachen ↔ Zürich etc.)"
            badge="Negatives"
            badge-color="gray"
            :loading="crossNegLoading"
            :result="crossNegResult"
            confirm-message="Kampagnenübergreifende Negative Keywords werden gesetzt."
            @run="runEndpoint('/api/admin/gads-cross-campaign-negatives', {}, crossNegLoading, crossNegResult)"
          />

          <!-- Inspect Final URLs -->
          <div class="bg-white rounded-2xl border overflow-hidden">
            <div class="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-gray-900">Final URLs prüfen</h3>
                <p class="text-xs text-gray-500 mt-0.5">Listet alle Final URLs aller Anzeigen — 404s und fehlende Seiten erkennen</p>
              </div>
              <button @click="runInspectUrls" :disabled="urlsLoading"
                class="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2">
                <svg v-if="urlsLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {{ urlsLoading ? 'Prüfe…' : 'URLs prüfen' }}
              </button>
            </div>
            <ToolResult :result="urlsResult" />
          </div>

        </div>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════════
           SECTION 5: Neue generische Kampagne
      ════════════════════════════════════════════════════════════════════ -->
      <section>
        <button @click="showCampaignForm = !showCampaignForm"
          class="w-full bg-white rounded-2xl border px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition text-left">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900">Neue generische Search-Kampagne</h2>
              <p class="text-sm text-gray-500">Manuelle Kampagne mit eigenen Keywords und Anzeigen</p>
            </div>
          </div>
          <svg class="w-5 h-5 text-gray-400 transition-transform shrink-0" :class="{ 'rotate-180': showCampaignForm }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showCampaignForm" class="bg-white rounded-2xl border border-t-0 rounded-t-none px-6 py-6 space-y-5 -mt-2">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Kampagnenname</label>
              <input v-model="campaign.name" type="text" placeholder="z.B. Fahrschule Zürich – Auto Kat. B"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tagesbudget (CHF)</label>
              <input v-model.number="campaign.dailyBudget" type="number" min="1" max="500" step="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Geo-Targeting</label>
              <select v-model="campaign.geoTargetId"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option v-for="(id, name) in GEO_TARGETS" :key="id" :value="id">{{ name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Final URL</label>
              <input v-model="campaign.finalUrl" type="url" placeholder="https://drivingteam.ch/..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <!-- Keywords -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keywords</label>
              <button @click="addKeyword" class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Keyword</button>
            </div>
            <div class="space-y-2">
              <div v-for="(kw, i) in campaign.keywords" :key="i" class="flex gap-2 items-center">
                <input v-model="kw.text" type="text" placeholder="fahrschule zürich"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <select v-model="kw.match_type"
                  class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="EXACT">Exact</option>
                  <option value="PHRASE">Phrase</option>
                  <option value="BROAD">Broad</option>
                </select>
                <div class="flex items-center gap-1">
                  <span class="text-xs text-gray-400">CHF</span>
                  <input v-model.number="kw.max_cpc_chf" type="number" min="0.10" max="50" step="0.10"
                    class="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <button @click="campaign.keywords.splice(i, 1)" class="text-gray-300 hover:text-red-500 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Headlines -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Headlines ({{ campaign.headlines.length }}/15, min. 3)</label>
              <button v-if="campaign.headlines.length < 15" @click="campaign.headlines.push('')"
                class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Headline</button>
            </div>
            <div class="space-y-2">
              <div v-for="(_, i) in campaign.headlines" :key="i" class="flex gap-2 items-center">
                <div class="flex-1 relative">
                  <input v-model="campaign.headlines[i]" type="text" maxlength="30" :placeholder="`Headline ${i + 1}`"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 pr-10"
                    :class="campaign.headlines[i].length > 30 ? 'border-red-400' : 'border-gray-300'" />
                  <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                    :class="campaign.headlines[i].length > 28 ? 'text-red-500' : 'text-gray-400'">
                    {{ campaign.headlines[i].length }}/30
                  </span>
                </div>
                <button v-if="campaign.headlines.length > 3" @click="campaign.headlines.splice(i, 1)"
                  class="text-gray-300 hover:text-red-500 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Descriptions -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descriptions ({{ campaign.descriptions.length }}/4, min. 2)</label>
              <button v-if="campaign.descriptions.length < 4" @click="campaign.descriptions.push('')"
                class="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Description</button>
            </div>
            <div class="space-y-2">
              <div v-for="(_, i) in campaign.descriptions" :key="i" class="flex gap-2 items-center">
                <div class="flex-1 relative">
                  <input v-model="campaign.descriptions[i]" type="text" maxlength="90" :placeholder="`Description ${i + 1}`"
                    class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 pr-14"
                    :class="campaign.descriptions[i].length > 90 ? 'border-red-400' : 'border-gray-300'" />
                  <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono"
                    :class="campaign.descriptions[i].length > 85 ? 'text-red-500' : 'text-gray-400'">
                    {{ campaign.descriptions[i].length }}/90
                  </span>
                </div>
                <button v-if="campaign.descriptions.length > 2" @click="campaign.descriptions.splice(i, 1)"
                  class="text-gray-300 hover:text-red-500 transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-if="campaignValidationErrors.length" class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p class="text-xs font-semibold text-amber-800 mb-1">Bitte prüfen:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li v-for="err in campaignValidationErrors" :key="err" class="text-xs text-amber-700">{{ err }}</li>
            </ul>
          </div>

          <button
            @click="submitCampaign"
            :disabled="campaignLoading || campaignValidationErrors.length > 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
            <svg v-if="campaignLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ campaignLoading ? 'Erstelle Kampagne…' : 'Kampagne erstellen (PAUSED)' }}
          </button>

          <ToolResult :result="campaignResult" />
        </div>
      </section>

    </div><!-- /connected tools -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Google Ads - Admin' })

// ── Connection settings ──────────────────────────────────────────────────────
const gadsSettings = ref<{ google_ads_customer_id: string; connected: boolean } | null>(null)
const showConnectionEdit = ref(false)
const editCustomerId = ref('')
const savingCustomerId = ref(false)

onMounted(async () => {
  try {
    const data = await $fetch<any>('/api/admin/gads-settings')
    gadsSettings.value = data
    editCustomerId.value = data.google_ads_customer_id ?? ''
  } catch {
    gadsSettings.value = { google_ads_customer_id: '', connected: false }
  }
})

async function saveCustomerId() {
  savingCustomerId.value = true
  try {
    const data = await $fetch<any>('/api/admin/gads-settings', {
      method: 'POST',
      body: { google_ads_customer_id: editCustomerId.value },
    })
    gadsSettings.value = data
    showConnectionEdit.value = false
  } catch (err: any) {
    alert(err?.data?.statusMessage ?? 'Fehler beim Speichern')
  } finally {
    savingCustomerId.value = false
  }
}

// ── Shared helper: run any gads endpoint (session auth via cookie) ───────────
async function runEndpoint(
  path: string,
  body: Record<string, any>,
  loadingRef: Ref<boolean>,
  resultRef: Ref<any>,
) {
  loadingRef.value = true
  resultRef.value = null
  try {
    const res = await $fetch<any>(path, { method: 'POST', body })
    resultRef.value = res
  } catch (err: any) {
    resultRef.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler', detail: err?.data }
  } finally {
    loadingRef.value = false
  }
}

// ── Promo Campaign ──────────────────────────────────────────────────────────
const promoLoading = ref(false)
const promoResult = ref<any>(null)
const promo = ref({
  location: 'zuerich',
  offer_price_chf: 47.50,
  original_price_chf: 95,
  offer_end_date: '',
  daily_budget_chf: 20,
  landing_page: '',
})

const promoDiscount = computed(() =>
  Math.round(((promo.value.original_price_chf - promo.value.offer_price_chf) / promo.value.original_price_chf) * 100),
)

async function runPromo(dryRun: boolean) {
  promoLoading.value = true
  promoResult.value = null
  try {
    const body: Record<string, any> = {
      location: promo.value.location,
      offer_price_chf: promo.value.offer_price_chf,
      original_price_chf: promo.value.original_price_chf,
      offer_end_date: promo.value.offer_end_date,
      daily_budget_chf: promo.value.daily_budget_chf,
      dry_run: dryRun,
    }
    if (promo.value.landing_page) body.landing_page = promo.value.landing_page
    const res = await $fetch<any>('/api/admin/gads-create-promo-campaign', { method: 'POST', body })
    promoResult.value = res
  } catch (err: any) {
    promoResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    promoLoading.value = false
  }
}

// ── Campaign-specific states ────────────────────────────────────────────────
const brandLoading = ref(false)
const brandResult = ref<any>(null)
const czvLoading = ref(false)
const czvResult = ref<any>(null)
const czvAdsOnly = ref(false)
const motoLoading = ref(false)
const motoResult = ref<any>(null)

// ── Keywords & Bids ─────────────────────────────────────────────────────────
const negKw = ref({ preset: 'competitors_and_irrelevant' })
const negKwLoading = ref(false)
const negKwResult = ref<any>(null)

async function runNegKw(dryRun: boolean) {
  negKwLoading.value = true
  negKwResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/gads-add-negative-keywords', {
      method: 'POST',
      body: { preset: negKw.value.preset, dry_run: dryRun },
    })
    negKwResult.value = res
  } catch (err: any) {
    negKwResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    negKwLoading.value = false
  }
}

const missingKwLoading = ref(false)
const missingKwResult = ref<any>(null)
const bidsLoading = ref(false)
const bidsResult = ref<any>(null)
const matchLoading = ref(false)
const matchResult = ref<any>(null)
const pauseKwLoading = ref(false)
const pauseKwResult = ref<any>(null)

// ── Max-CPC ─────────────────────────────────────────────────────────────────
const cpcForm = ref({ maxCpc: 3.0, useThreshold: false, threshold: 3.0 })
const cpcLoading = ref(false)
const cpcResult = ref<any>(null)

async function runCpc(dryRun: boolean) {
  cpcLoading.value = true
  cpcResult.value = null
  try {
    const body: Record<string, any> = { max_cpc_chf: cpcForm.value.maxCpc, dry_run: dryRun }
    if (cpcForm.value.useThreshold) body.only_above_chf = cpcForm.value.threshold
    const res = await $fetch<any>('/api/admin/set-keyword-max-cpc', { method: 'POST', body })
    cpcResult.value = res
  } catch (err: any) {
    cpcResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    cpcLoading.value = false
  }
}

// ── Budget ───────────────────────────────────────────────────────────────────
const budgetForm = ref({ campaignName: '', newBudget: 20 })
const budgetLoading = ref(false)
const budgetResult = ref<any>(null)

// ── Cross-campaign negatives ──────────────────────────────────────────────────
const crossNegLoading = ref(false)
const crossNegResult = ref<any>(null)

// ── Inspect URLs ──────────────────────────────────────────────────────────────
const urlsLoading = ref(false)
const urlsResult = ref<any>(null)

async function runInspectUrls() {
  urlsLoading.value = true
  urlsResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/gads-inspect-final-urls')
    urlsResult.value = res
  } catch (err: any) {
    urlsResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    urlsLoading.value = false
  }
}

// ── Generic campaign form (existing) ─────────────────────────────────────────
const GEO_TARGETS: Record<string, string> = {
  'Schweiz': '2756',
  'Zürich': '20563',
  'Lachen SZ': '1003803',
  'Pfäffikon SZ': '1003888',
  'Schlieren': '1003851',
  'Dietikon': '1003815',
  'Spreitenbach': '1003857',
  'Wädenswil': '1003866',
  'Einsiedeln': '1003818',
  'Zug': '1003897',
}

const showCampaignForm = ref(false)
const campaignLoading = ref(false)
const campaignResult = ref<any>(null)

const campaign = ref({
  name: '',
  dailyBudget: 20,
  geoTargetId: '2756',
  finalUrl: '',
  keywords: [{ text: '', match_type: 'PHRASE' as 'EXACT' | 'PHRASE' | 'BROAD', max_cpc_chf: 3.0 }],
  headlines: ['', '', ''],
  descriptions: ['', ''],
})

function addKeyword() {
  campaign.value.keywords.push({ text: '', match_type: 'PHRASE', max_cpc_chf: 3.0 })
}

const campaignValidationErrors = computed(() => {
  const errors: string[] = []
  const c = campaign.value
  if (!c.name.trim()) errors.push('Kampagnenname fehlt')
  if (!c.dailyBudget || c.dailyBudget <= 0) errors.push('Tagesbudget muss grösser als 0 sein')
  if (!c.finalUrl.startsWith('http')) errors.push('Final URL muss mit http beginnen')
  if (!c.keywords.length || c.keywords.some(k => !k.text.trim())) errors.push('Alle Keywords müssen einen Text haben')
  if (c.keywords.some(k => k.max_cpc_chf <= 0)) errors.push('Alle Max-CPC-Gebote müssen grösser als 0 sein')
  if (c.headlines.length < 3) errors.push('Mindestens 3 Headlines erforderlich')
  if (c.headlines.some(h => !h.trim())) errors.push('Alle Headlines müssen ausgefüllt sein')
  if (c.headlines.some(h => h.length > 30)) errors.push('Keine Headline darf länger als 30 Zeichen sein')
  if (c.descriptions.length < 2) errors.push('Mindestens 2 Descriptions erforderlich')
  if (c.descriptions.some(d => !d.trim())) errors.push('Alle Descriptions müssen ausgefüllt sein')
  if (c.descriptions.some(d => d.length > 90)) errors.push('Keine Description darf länger als 90 Zeichen sein')
  return errors
})

async function submitCampaign() {
  campaignLoading.value = true
  campaignResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/create-google-ads-campaign', {
      method: 'POST',
      body: {
        campaign_name: campaign.value.name,
        daily_budget_chf: campaign.value.dailyBudget,
        geo_target_id: campaign.value.geoTargetId,
        final_url: campaign.value.finalUrl,
        keywords: campaign.value.keywords,
        headlines: campaign.value.headlines,
        descriptions: campaign.value.descriptions,
      },
    })
    campaignResult.value = res
  } catch (err: any) {
    campaignResult.value = { error: err?.data?.message ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    campaignLoading.value = false
  }
}
</script>
