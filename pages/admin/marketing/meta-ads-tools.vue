<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </NuxtLink>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Meta Ads Tools</h1>
            <p class="text-xs text-gray-400 mt-0.5">Konto: Driving Team CH</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- ── Bild-Upload & neue Ad erstellen ── -->
      <div class="bg-white rounded-2xl border overflow-hidden">
        <div class="px-6 py-5 border-b">
          <h2 class="text-base font-semibold text-gray-900">Bild hochladen & Ad erstellen</h2>
          <p class="text-sm text-gray-500 mt-1">
            Lädt das Bild hoch, erstellt ein Ad Creative und fügt die Ad als PAUSED zum gewählten Ad Set hinzu.
          </p>
        </div>

        <div class="px-6 py-5 space-y-5">

          <!-- Ad Set Auswahl -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Ad Set</label>
            <div class="space-y-2">
              <div
                v-for="adset in KNOWN_AD_SETS"
                :key="adset.id"
                @click="form.adSetId = adset.id"
                class="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                :class="form.adSetId === adset.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'"
              >
                <div
                  class="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                  :class="adset.color"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900">{{ adset.label }}</div>
                  <div class="text-xs text-gray-400 font-mono truncate">{{ adset.id }}</div>
                </div>
                <div
                  class="w-4 h-4 rounded-full border-2 shrink-0 transition-all"
                  :class="form.adSetId === adset.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'"
                >
                  <svg v-if="form.adSetId === adset.id" class="w-full h-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>

              <!-- Benutzerdefinierte ID -->
              <div
                @click="form.adSetId = ''"
                class="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
                :class="!KNOWN_AD_SETS.find(a => a.id === form.adSetId)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'"
              >
                <div class="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 bg-gray-400" />
                <div class="flex-1">
                  <div class="text-sm font-medium text-gray-900 mb-1.5">Andere Ad Set ID</div>
                  <input
                    v-model="customAdSetId"
                    @click.stop
                    @focus="form.adSetId = customAdSetId"
                    @input="form.adSetId = customAdSetId"
                    type="text"
                    placeholder="z.B. 120207012345678"
                    class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Bild-Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Bild</label>
            <div
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="handleDrop"
              class="relative rounded-xl border-2 border-dashed transition-all cursor-pointer"
              :class="isDragging
                ? 'border-blue-400 bg-blue-50'
                : imagePreview
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'"
            >
              <!-- Preview -->
              <div v-if="imagePreview" class="flex items-center gap-4 p-4">
                <img :src="imagePreview" class="w-24 h-24 object-cover rounded-lg border border-gray-200 shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-900 truncate">{{ form.imageName }}</div>
                  <div class="text-xs text-gray-400 mt-0.5">{{ imageFileSizeLabel }}</div>
                  <button
                    @click.stop="clearImage"
                    class="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="flex flex-col items-center justify-center py-10 px-6 text-center">
                <svg class="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-sm font-medium text-gray-700">Bild hier ablegen oder klicken</p>
                <p class="text-xs text-gray-400 mt-1">JPG, PNG · empfohlen 1200×628 px (1.91:1)</p>
              </div>

              <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
            </div>
          </div>

          <!-- Ad-Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Ad-Name <span class="text-gray-400 font-normal">(intern)</span></label>
            <input
              v-model="form.adName"
              type="text"
              placeholder="z.B. Auto Bild 3 — Juni 2026"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <!-- KI Copy Generator -->
          <div class="rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
            <div class="px-4 py-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span class="text-sm font-semibold text-indigo-900">KI Ad Copy Generator</span>
              </div>
              <button
                @click="generateCopy"
                :disabled="aiLoading || !selectedAdSetProduct"
                class="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <svg v-if="aiLoading" class="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {{ aiLoading ? 'Generiere…' : 'Generieren' }}
              </button>
            </div>
            <div class="px-4 pb-3 flex items-center gap-2">
              <input
                v-model="aiContext"
                type="text"
                placeholder="Optionaler Kontext (z.B. &quot;Sommer-Aktion, Fokus auf Schnelligkeit&quot;)"
                class="flex-1 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-gray-400"
              />
            </div>
            <p v-if="!selectedAdSetProduct" class="px-4 pb-3 text-xs text-indigo-600">
              Wähle zuerst ein Ad Set aus um passende Copy zu generieren.
            </p>

            <!-- KI Ergebnisse -->
            <div v-if="aiResult" class="border-t border-indigo-200 bg-white divide-y divide-gray-100">

              <!-- Tips -->
              <div v-if="aiResult.tips?.length" class="px-4 py-3">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Performance-Tipps</div>
                <ul class="space-y-1">
                  <li v-for="(tip, i) in aiResult.tips" :key="i" class="text-xs text-gray-600 flex items-start gap-1.5">
                    <span class="text-indigo-400 shrink-0 mt-0.5">→</span>{{ tip }}
                  </li>
                </ul>
              </div>

              <!-- Headlines -->
              <div class="px-4 py-3">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Headlines <span class="font-normal text-gray-400">(max. 40 Zeichen)</span></div>
                <div class="space-y-1.5">
                  <div
                    v-for="(h, i) in aiResult.headlines"
                    :key="i"
                    @click="form.headline = h.text"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition group"
                    :class="form.headline === h.text ? 'border-blue-400 bg-blue-50' : 'border-gray-200'"
                  >
                    <span class="flex-1 text-sm text-gray-900">{{ h.text }}</span>
                    <span
                      class="text-xs font-mono shrink-0"
                      :class="h.chars > 40 ? 'text-red-500' : 'text-gray-400'"
                    >{{ h.chars }}</span>
                    <span class="text-xs text-gray-400 shrink-0 hidden group-hover:inline">← übernehmen</span>
                    <svg v-if="form.headline === h.text" class="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Primärtexte -->
              <div class="px-4 py-3">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Primärtexte <span class="font-normal text-gray-400">(max. 125 Zeichen)</span></div>
                <div class="space-y-1.5">
                  <div
                    v-for="(p, i) in aiResult.primaryTexts"
                    :key="i"
                    @click="form.primaryText = p.text"
                    class="flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition group"
                    :class="form.primaryText === p.text ? 'border-blue-400 bg-blue-50' : 'border-gray-200'"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-gray-900">{{ p.text }}</div>
                      <div v-if="p.hook" class="text-xs text-indigo-500 mt-0.5">{{ p.hook }}</div>
                    </div>
                    <div class="shrink-0 text-right">
                      <span
                        class="text-xs font-mono"
                        :class="p.chars > 125 ? 'text-red-500' : 'text-gray-400'"
                      >{{ p.chars }}</span>
                      <div class="text-xs text-gray-400 hidden group-hover:block mt-0.5">← übernehmen</div>
                      <svg v-if="form.primaryText === p.text" class="w-3.5 h-3.5 text-blue-500 mt-1 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Beschreibungen -->
              <div class="px-4 py-3">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Beschreibungen <span class="font-normal text-gray-400">(max. 30 Zeichen)</span></div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="(d, i) in aiResult.descriptions"
                    :key="i"
                    @click="form.description = d.text"
                    class="px-3 py-1.5 rounded-lg border text-xs transition"
                    :class="form.description === d.text
                      ? 'border-blue-400 bg-blue-50 text-blue-900 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'"
                  >
                    {{ d.text }}
                    <span class="ml-1.5 font-mono" :class="d.chars > 30 ? 'text-red-400' : 'text-gray-400'">{{ d.chars }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Primärtext & Headline -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Primärtext</label>
              <textarea
                v-model="form.primaryText"
                rows="3"
                placeholder="Haupttext der Anzeige…"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
              <div class="text-xs mt-1 text-right" :class="form.primaryText.length > 125 ? 'text-red-500 font-medium' : 'text-gray-400'">{{ form.primaryText.length }} / 125</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Headline</label>
              <input
                v-model="form.headline"
                type="text"
                placeholder="Überschrift der Anzeige"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <div class="text-xs mt-1 text-right" :class="form.headline.length > 40 ? 'text-red-500 font-medium' : 'text-gray-400'">{{ form.headline.length }} / 40</div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5 mt-3">Beschreibung <span class="text-gray-400 font-normal">(optional)</span></label>
              <input
                v-model="form.description"
                type="text"
                placeholder="Kurze Beschreibung…"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <!-- Link URL & CTA -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Ziel-URL</label>
              <input
                v-model="form.linkUrl"
                type="url"
                placeholder="https://drivingteam.ch?utm_source=…"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Call-to-Action</label>
              <select
                v-model="form.callToAction"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="LEARN_MORE">Learn More</option>
                <option value="BOOK_TRAVEL">Book Now</option>
                <option value="SIGN_UP">Sign Up</option>
                <option value="CONTACT_US">Contact Us</option>
                <option value="GET_QUOTE">Get Quote</option>
                <option value="APPLY_NOW">Apply Now</option>
              </select>
            </div>
          </div>

          <!-- Ad-Vorschau -->
          <div v-if="imagePreview || form.headline" class="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
            <div class="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Vorschau</span>
            </div>
            <div class="p-4">
              <div class="max-w-sm bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <img v-if="imagePreview" :src="imagePreview" class="w-full h-40 object-cover" />
                <div v-else class="w-full h-40 bg-gray-100 flex items-center justify-center">
                  <span class="text-xs text-gray-400">Kein Bild</span>
                </div>
                <div class="p-3">
                  <div class="text-xs text-gray-400 mb-1">drivingteam.ch · Gesponsert</div>
                  <div class="text-sm font-semibold text-gray-900 leading-snug">{{ form.headline || 'Headline hier' }}</div>
                  <div v-if="form.description" class="text-xs text-gray-500 mt-0.5">{{ form.description }}</div>
                  <div class="mt-2 flex items-center justify-between">
                    <div class="text-xs text-gray-400 truncate max-w-[180px]">{{ form.linkUrl || 'drivingteam.ch' }}</div>
                    <span class="text-xs font-medium text-blue-600 shrink-0">{{ ctaLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Validierungsfehler -->
          <div v-if="validationError" class="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p class="text-sm font-semibold text-amber-900">Fehlende Felder</p>
            <p class="text-sm text-amber-700 mt-0.5">{{ validationError }}</p>
          </div>

          <!-- Buttons -->
          <div class="flex flex-wrap gap-3 pt-1">
            <button
              @click="submitAd"
              :disabled="loading"
              class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {{ loading ? uploadStatus || 'Hochladen…' : 'Ad hochladen (PAUSED)' }}
            </button>
            <button
              @click="resetForm"
              :disabled="loading"
              class="px-4 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
            >
              Zurücksetzen
            </button>
          </div>
        </div>

        <!-- Ergebnis -->
        <div v-if="result" class="mx-6 mb-5">
          <!-- Fehler -->
          <div v-if="result.error" class="bg-red-50 border border-red-200 rounded-xl p-4">
            <p class="text-sm font-semibold text-red-800">Fehler beim Hochladen</p>
            <p class="text-xs text-red-700 mt-1 font-mono whitespace-pre-wrap">{{ result.error }}</p>
          </div>

          <!-- Erfolg -->
          <div v-else class="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm font-semibold text-green-900">{{ result.message }}</p>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div class="bg-white rounded-lg border border-green-100 px-3 py-2">
                <div class="text-gray-500">Image Hash</div>
                <div class="font-mono text-gray-900 truncate mt-0.5">{{ result.imageHash }}</div>
              </div>
              <div class="bg-white rounded-lg border border-green-100 px-3 py-2">
                <div class="text-gray-500">Creative ID</div>
                <div class="font-mono text-gray-900 truncate mt-0.5">{{ result.creativeId }}</div>
              </div>
              <div class="bg-white rounded-lg border border-green-100 px-3 py-2">
                <div class="text-gray-500">Ad ID</div>
                <div class="font-mono text-gray-900 truncate mt-0.5">{{ result.adId }}</div>
              </div>
            </div>
            <p class="text-xs text-green-700">
              Die Ad ist jetzt <strong>PAUSED</strong> im Meta Ads Manager.
              Überprüfe sie dort und aktiviere sie manuell wenn bereit.
            </p>
            <a
              href="https://www.facebook.com/adsmanager"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-green-800 underline hover:text-green-900"
            >
              Im Meta Ads Manager öffnen
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- ── Info-Box: Ad Set IDs ── -->
      <div class="bg-white rounded-2xl border overflow-hidden">
        <div class="px-6 py-5 border-b">
          <h2 class="text-base font-semibold text-gray-900">Kampagnenstruktur</h2>
          <p class="text-sm text-gray-500 mt-1">Übersicht der bestehenden Ad Sets und deren Targeting.</p>
        </div>
        <div class="divide-y">
          <div
            v-for="adset in KNOWN_AD_SETS"
            :key="adset.id"
            class="px-6 py-4 flex items-start gap-3"
          >
            <div class="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" :class="adset.color" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">{{ adset.label }}</div>
              <div class="text-xs text-gray-400 mt-0.5">{{ adset.description }}</div>
              <div class="text-xs font-mono text-gray-400 mt-0.5">{{ adset.id }}</div>
            </div>
            <button
              @click="prefillFromAdSet(adset)"
              class="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Auswählen
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Meta Ads Tools - Admin' })

// ── Bekannte Ad Sets (IDs aus Meta Ads Manager eintragen) ────────────────────
const KNOWN_AD_SETS = [
  {
    id: 'ADSET_ID_AUTO_LOOKALIKE',
    label: 'Auto — Lookalike 1% Zürich',
    description: 'Kat. B · Alter 17–30 · Zürich Altstetten +15km · CHF 10/Tag',
    color: 'bg-blue-500',
    defaults: {
      primaryText: 'Führerschein Zürich — schnell, flexibel, fair. Online buchen, sofort bestätigt.',
      headline: 'Führerschein Zürich — ab CHF 95/Lektion',
      linkUrl: 'https://drivingteam.ch?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_lookalike_zh',
    },
  },
  {
    id: 'ADSET_ID_AUTO_BROAD',
    label: 'Auto — Broad 17–30 Altstetten',
    description: 'Kat. B · Alter 17–30 · Zürich Altstetten +15km · CHF 10/Tag',
    color: 'bg-blue-300',
    defaults: {
      primaryText: 'Deine Fahrschule in Altstetten & Lachen. Zertifizierte Fahrlehrer, faire Preise.',
      headline: 'Online buchen, sofort bestätigt. Kat. B',
      linkUrl: 'https://drivingteam.ch?utm_source=facebook&utm_medium=paid_social&utm_campaign=auto_broad_zh',
    },
  },
  {
    id: 'ADSET_ID_ANHAENGER',
    label: 'Anhänger — Broad 25–55 Dual-Location',
    description: 'Kat. BE · Alter 25–55 · Zürich + Lachen · CHF 12/Tag',
    color: 'bg-green-500',
    defaults: {
      primaryText: 'Wohnwagen, Pferdeanhänger, Bootsanhänger — alles erlaubt mit Kat. BE.',
      headline: 'Anhängerkurs Zürich & Lachen — Kat. BE',
      linkUrl: 'https://drivingteam.ch?utm_source=facebook&utm_medium=paid_social&utm_campaign=anhaenger_broad',
    },
  },
  {
    id: 'ADSET_ID_LKW',
    label: 'LKW C/CE — Broad 21–55 Lachen+Zürich',
    description: 'Kat. C/CE · Alter 21–55 · Lachen +40km + Zürich · CHF 10/Tag',
    color: 'bg-orange-500',
    defaults: {
      primaryText: 'LKW-Führerschein C/CE in Lachen. Theorie und Praxis kombiniert. Flexible Termine.',
      headline: 'Lastwagen Führerschein C/CE — Lachen',
      linkUrl: 'https://drivingteam.ch?utm_source=facebook&utm_medium=paid_social&utm_campaign=lkw_broad_lachen',
    },
  },
  {
    id: 'ADSET_ID_RETARGETING',
    label: 'Retargeting — Website 30d Dual-Location',
    description: 'Alle Produkte · Alter 17–55 · Zürich + Lachen · CHF 8/Tag',
    color: 'bg-purple-500',
    defaults: {
      primaryText: 'Immer noch auf der Suche nach deiner Fahrschule? Starte jetzt bei Driving Team.',
      headline: 'Über 500 Fahrschüler. 4.9 Sterne.',
      linkUrl: 'https://drivingteam.ch?utm_source=facebook&utm_medium=paid_social&utm_campaign=retargeting_all',
    },
  },
]

// ── Form State ────────────────────────────────────────────────────────────────
const form = ref({
  adSetId: '',
  imageName: '',
  imageBase64: '',
  adName: '',
  primaryText: '',
  headline: '',
  description: '',
  linkUrl: 'https://drivingteam.ch',
  callToAction: 'LEARN_MORE',
})

const customAdSetId = ref('')
const imagePreview = ref('')
const imageFileSizeLabel = ref('')
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const uploadStatus = ref('')
const result = ref<any>(null)
const validationError = ref('')

// ── KI Copy Generator ─────────────────────────────────────────────────────────
const aiLoading = ref(false)
const aiContext = ref('')
const aiResult = ref<{
  headlines: Array<{ text: string; chars: number; angle: string }>
  primaryTexts: Array<{ text: string; chars: number; hook: string }>
  descriptions: Array<{ text: string; chars: number }>
  tips: string[]
} | null>(null)

const PRODUCT_BY_ADSET: Record<string, string> = {
  ADSET_ID_AUTO_LOOKALIKE: 'auto',
  ADSET_ID_AUTO_BROAD: 'auto',
  ADSET_ID_ANHAENGER: 'anhaenger',
  ADSET_ID_LKW: 'lkw',
  ADSET_ID_RETARGETING: 'retargeting',
}

const selectedAdSetProduct = computed(() => PRODUCT_BY_ADSET[form.value.adSetId] ?? null)

async function generateCopy() {
  aiLoading.value = true
  aiResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/meta-ads-copy', {
      method: 'POST',
      body: {
        product: selectedAdSetProduct.value,
        context: aiContext.value || undefined,
      },
    })
    aiResult.value = res
  } catch (err: any) {
    console.error('AI copy generation failed:', err)
  } finally {
    aiLoading.value = false
  }
}

const ctaLabel = computed(() => {
  const map: Record<string, string> = {
    LEARN_MORE: 'Mehr erfahren',
    BOOK_TRAVEL: 'Jetzt buchen',
    SIGN_UP: 'Registrieren',
    CONTACT_US: 'Kontakt',
    GET_QUOTE: 'Angebot',
    APPLY_NOW: 'Bewerben',
  }
  return map[form.value.callToAction] ?? form.value.callToAction
})

// ── Bild-Handling ─────────────────────────────────────────────────────────────
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

function processFile(file: File) {
  if (!file.type.startsWith('image/')) return
  form.value.imageName = file.name

  const sizeMB = file.size / 1024 / 1024
  imageFileSizeLabel.value = sizeMB < 1
    ? `${Math.round(file.size / 1024)} KB`
    : `${sizeMB.toFixed(1)} MB`

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    imagePreview.value = dataUrl
    form.value.imageBase64 = dataUrl
  }
  reader.readAsDataURL(file)
}

function clearImage() {
  imagePreview.value = ''
  imageFileSizeLabel.value = ''
  form.value.imageBase64 = ''
  form.value.imageName = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// ── Ad Set Vorausfüllen ───────────────────────────────────────────────────────
function prefillFromAdSet(adset: typeof KNOWN_AD_SETS[0]) {
  form.value.adSetId = adset.id
  form.value.primaryText = adset.defaults.primaryText
  form.value.headline = adset.defaults.headline
  form.value.linkUrl = adset.defaults.linkUrl
  if (!form.value.adName) {
    form.value.adName = `${adset.label} — ${new Date().toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}`
  }
}

// ── Formular zurücksetzen ─────────────────────────────────────────────────────
function resetForm() {
  clearImage()
  form.value = {
    adSetId: '',
    imageName: '',
    imageBase64: '',
    adName: '',
    primaryText: '',
    headline: '',
    description: '',
    linkUrl: 'https://drivingteam.ch',
    callToAction: 'LEARN_MORE',
  }
  customAdSetId.value = ''
  result.value = null
  validationError.value = ''
}

// ── Ad hochladen ──────────────────────────────────────────────────────────────
async function submitAd() {
  validationError.value = ''
  result.value = null

  const missing: string[] = []
  if (!form.value.adSetId) missing.push('Ad Set')
  if (!form.value.imageBase64) missing.push('Bild')
  if (!form.value.primaryText) missing.push('Primärtext')
  if (!form.value.headline) missing.push('Headline')
  if (!form.value.linkUrl) missing.push('Ziel-URL')

  if (missing.length) {
    validationError.value = `Bitte fülle folgende Felder aus: ${missing.join(', ')}`
    return
  }

  loading.value = true
  uploadStatus.value = 'Bild hochladen…'

  try {
    const res = await $fetch<any>('/api/admin/meta-upload-ad', {
      method: 'POST',
      body: {
        imageBase64: form.value.imageBase64,
        imageName: form.value.imageName || 'bild.jpg',
        adSetId: form.value.adSetId,
        adName: form.value.adName || form.value.headline,
        primaryText: form.value.primaryText,
        headline: form.value.headline,
        description: form.value.description || undefined,
        linkUrl: form.value.linkUrl,
        callToAction: form.value.callToAction,
        status: 'PAUSED',
      },
    })
    result.value = res
  } catch (err: any) {
    result.value = { error: err?.data?.statusMessage ?? err?.message ?? 'Unbekannter Fehler' }
  } finally {
    loading.value = false
    uploadStatus.value = ''
  }
}
</script>
