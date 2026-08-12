<template>
  <div class="wz-setup min-h-screen overflow-x-hidden" :style="{ background: `linear-gradient(to bottom right, ${primaryColor}10, ${accentColor || primaryColor}1f)` }">
    <!-- Step Indicator -->
    <div class="wz-stepper-bar sticky top-0 z-10">
      <div class="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5">
        <div class="flex items-center gap-2 sm:gap-4">
          <div class="sm:hidden min-w-0 flex-1">
            <p class="text-[10px] font-semibold tracking-wide uppercase text-gray-400 leading-none">
              Schritt {{ currentStep + 1 }}/{{ steps.length }}
            </p>
            <p class="text-xs font-semibold text-gray-800 mt-0.5 truncate">
              {{ steps[currentStep].label }}
            </p>
          </div>

          <div class="hidden sm:block shrink-0 min-w-[7.5rem]">
            <p class="text-[10px] font-semibold tracking-wide uppercase text-gray-400 leading-none">Website Builder</p>
            <p class="text-xs text-gray-600 mt-1 leading-tight">
              <span class="font-semibold text-gray-800">{{ currentStep + 1 }}/{{ steps.length }}</span>
              <span class="text-gray-300 mx-1">·</span>
              <span>{{ steps[currentStep].label }}</span>
            </p>
          </div>

          <ol class="wz-steps flex-1 min-w-0" aria-label="Fortschritt">
            <li
              v-for="(step, idx) in steps"
              :key="idx"
              class="wz-step"
              :class="{
                'wz-step--done': currentStep > idx,
                'wz-step--active': currentStep === idx,
                'wz-step--todo': currentStep < idx,
              }"
            >
              <div
                v-if="idx < steps.length - 1"
                class="wz-step-line"
                :style="currentStep > idx ? { background: primaryColor } : {}"
                aria-hidden="true"
              />
              <button
                type="button"
                class="wz-step-btn"
                :disabled="idx > currentStep"
                :aria-current="currentStep === idx ? 'step' : undefined"
                :aria-label="`${step.label}${currentStep > idx ? ' (erledigt)' : ''}`"
                @click="idx <= currentStep && (currentStep = idx)"
              >
                <span
                  class="wz-step-dot"
                  :style="
                    currentStep === idx
                      ? { background: primaryColor, boxShadow: `0 0 0 3px ${primaryColor}22` }
                      : currentStep > idx
                        ? { background: primaryColor }
                        : {}
                  "
                >
                  <svg
                    v-if="currentStep > idx"
                    class="wz-step-check"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span v-else>{{ idx + 1 }}</span>
                </span>
                <span class="wz-step-label">{{ step.short || step.label }}</span>
              </button>
            </li>
          </ol>

          <p
            class="shrink-0 text-[11px] font-semibold tabular-nums w-8 text-right"
            :style="{ color: primaryColor }"
          >
            {{ Math.round(((currentStep + 1) / steps.length) * 100) }}%
          </p>
        </div>
      </div>
    </div>

    <!-- Tenant Info (compact strip) -->
    <div class="wz-tenant-strip border-b border-gray-200/80 bg-white/80">
      <div class="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p class="text-sm sm:text-lg font-bold tracking-tight shrink-0 max-w-[70%] truncate" :style="{ color: primaryColor }">
          {{ tenantInfo?.name || '—' }}
        </p>

        <div class="hidden sm:block h-4 w-px bg-gray-200 shrink-0" aria-hidden="true" />

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600 min-w-0 flex-1">
          <a
            v-if="tenantInfo?.contact_email"
            :href="`mailto:${tenantInfo.contact_email}`"
            class="truncate max-w-[11rem] sm:max-w-[14rem] hover:text-gray-900"
            :title="tenantInfo.contact_email"
          >{{ tenantInfo.contact_email }}</a>
          <span v-if="tenantInfo?.contact_phone" class="text-gray-300 hidden sm:inline">·</span>
          <a
            v-if="tenantInfo?.contact_phone"
            :href="`tel:${tenantInfo.contact_phone}`"
            class="whitespace-nowrap hover:text-gray-900"
          >{{ tenantInfo.contact_phone }}</a>
          <span v-if="tenantInfo?.address" class="text-gray-300 hidden md:inline">·</span>
          <span
            v-if="tenantInfo?.address"
            class="truncate max-w-[16rem] hidden md:inline"
            :title="tenantInfo.address"
          >{{ tenantInfo.address }}</span>
        </div>

        <div class="flex items-center gap-1 ml-auto" aria-label="Markenfarben">
          <span
            v-for="swatch in brandSwatches.slice(0, 4)"
            :key="swatch.key"
            class="wz-swatch"
            :style="{ backgroundColor: swatch.color || '#e5e7eb' }"
            :title="`${swatch.label}: ${swatch.color || '—'}`"
          />
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-28 sm:pb-24">
      <!-- Step 1: Who Are You? -->
      <div v-if="currentStep === 0" class="space-y-4 sm:space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1">👋 Willkommen!</h1>
          <p class="text-sm text-gray-600 leading-snug">
            Lass uns dein Website-Profil erstellen. Das dauert nur 5 Minuten!
          </p>
        </div>

        <div class="bg-white rounded-xl sm:rounded-lg p-3.5 sm:p-8 space-y-5 sm:space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">Dein Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
              placeholder="z.B. Pascal Kilchenmann"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2"
              >Kurze Bio (2-3 Sätze) *</label
            >
              <textarea
                v-model="formData.bio"
                class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 min-h-[6.5rem] sm:h-24 focus:ring-2 focus:border-transparent"
                :placeholder="`Kurzbeschreibung deiner ${terms.businessNoun}…`"
              />
            <AIOptimizationSuggestion
              :original="formData.bio"
              :context="formData.name || tenantInfo?.name || ''"
              content-type="bio"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="applyAiField('bio', $event)"
            />
          </div>

          <div class="space-y-4">
            <label class="block text-sm font-semibold">Bilder für deine Website</label>
            <p class="text-sm text-gray-600 -mt-2 leading-snug">
              Logo immer selbst hochladen. Für das Hero-Bild (erster Bildschirm) kannst du eigene Fotos, kostenlose Stock-Fotos oder AI wählen.
            </p>

            <!-- Logo always upload -->
            <div class="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
              <p class="text-sm font-medium">Logo (quadratisch)</p>
              <div class="h-24 sm:h-28 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                <img
                  v-if="formData.logo_url"
                  :src="formData.logo_url"
                  alt="Logo"
                  class="max-h-20 sm:max-h-24 max-w-full object-contain"
                />
                <span v-else class="text-xs text-gray-400">Noch kein Logo</span>
              </div>
              <label class="inline-flex items-center justify-center w-full min-h-[44px] px-3 py-2.5 text-sm font-medium rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50 active:bg-gray-100">
                {{ uploadingLogo ? 'Lädt…' : 'Logo hochladen' }}
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  :disabled="uploadingLogo || uploadingHero || suggestingHero || applyingHero"
                  @change="handleAssetUpload($event, 'logo')"
                />
              </label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                class="rounded-lg border px-3 py-3 text-left transition min-h-[64px]"
                :class="heroImageSource === 'own' ? 'border-transparent text-white' : 'border-gray-300 hover:bg-gray-50'"
                :style="heroImageSource === 'own' ? { background: primaryColor } : {}"
                @click="selectHeroSource('own')"
              >
                <span class="block font-semibold text-sm">Eigene Fotos</span>
                <span class="block text-xs opacity-80 mt-0.5">Authentisch · empfohlen</span>
              </button>
              <button
                type="button"
                class="rounded-lg border px-3 py-3 text-left transition min-h-[64px]"
                :class="heroImageSource === 'stock' ? 'border-transparent text-white' : 'border-gray-300 hover:bg-gray-50'"
                :style="heroImageSource === 'stock' ? { background: primaryColor } : {}"
                @click="selectHeroSource('stock')"
              >
                <span class="block font-semibold text-sm">Stock-Fotos</span>
                <span class="block text-xs opacity-80 mt-0.5">Kostenlos · Unsplash</span>
              </button>
              <button
                type="button"
                class="rounded-lg border px-3 py-3 text-left transition min-h-[64px]"
                :class="heroImageSource === 'ai' ? 'border-transparent text-white' : 'border-gray-300 hover:bg-gray-50'"
                :style="heroImageSource === 'ai' ? { background: primaryColor } : {}"
                @click="selectHeroSource('ai')"
              >
                <span class="block font-semibold text-sm">AI-generiert</span>
                <span class="block text-xs opacity-80 mt-0.5">Passend zu deinem Betrieb</span>
              </button>
            </div>

            <!-- Own: hero upload -->
            <div v-if="heroImageSource === 'own'" class="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
              <p class="text-sm font-medium">Hero-Bild (16:9)</p>
              <div class="h-32 sm:h-36 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                <img
                  v-if="formData.hero_image_url"
                  :src="formData.hero_image_url"
                  alt="Hero"
                  class="h-full w-full object-cover"
                />
                <span v-else class="text-xs text-gray-400">Noch kein Hero</span>
              </div>
              <label class="inline-flex items-center justify-center w-full min-h-[44px] px-3 py-2.5 text-sm font-medium rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                {{ uploadingHero ? 'Lädt…' : 'Hero hochladen' }}
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  :disabled="uploadingLogo || uploadingHero"
                  @change="handleAssetUpload($event, 'hero')"
                />
              </label>
            </div>

            <!-- Stock / AI suggestions -->
            <div v-else class="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium">
                    {{ heroImageSource === 'stock' ? 'Stock-Foto wählen' : 'AI-Bild wählen' }}
                  </p>
                  <p class="text-xs text-gray-500 mt-0.5 leading-snug">
                    Wir schlagen passende Motive aus deinem Profil vor — ohne dass du etwas tippen musst.
                  </p>
                </div>
                <button
                  type="button"
                  class="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 w-full sm:w-auto sm:flex-shrink-0 min-h-[40px]"
                  :disabled="suggestingHero || applyingHero"
                  @click="loadHeroSuggestions"
                >
                  {{ suggestingHero ? 'Lädt…' : (heroCandidates.length ? 'Neu laden' : 'Vorschläge laden') }}
                </button>
              </div>

              <details class="text-sm">
                <summary class="cursor-pointer text-gray-600 hover:text-gray-900 py-1">Beschreibung anpassen (optional)</summary>
                <div class="mt-2 space-y-2">
                  <input
                    v-model="heroHint"
                    type="text"
                    maxlength="200"
                    class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    placeholder="z.B. Abendstimmung vor dem Matterhorn"
                  />
                  <button
                    type="button"
                    class="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
                    :disabled="suggestingHero"
                    @click="loadHeroSuggestions"
                  >
                    Mit Beschreibung neu laden
                  </button>
                </div>
              </details>

              <p v-if="heroSuggestError" class="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
                {{ heroSuggestError }}
                <button type="button" class="ml-1 underline font-semibold" @click="selectHeroSource('own')">
                  Eigene Fotos nutzen
                </button>
              </p>

              <div v-if="suggestingHero" class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <div v-for="n in 3" :key="n" class="h-24 sm:h-28 bg-gray-100 rounded-lg animate-pulse" />
              </div>

              <div v-else-if="heroCandidates.length" class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                <button
                  v-for="c in heroCandidates"
                  :key="c.id"
                  type="button"
                  class="relative rounded-lg overflow-hidden border-2 text-left transition focus:outline-none"
                  :class="selectedHeroCandidateId === c.id ? 'border-blue-600 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'"
                  :disabled="applyingHero"
                  @click="applyHeroCandidate(c)"
                >
                  <img :src="c.preview_url" alt="" class="h-24 sm:h-28 w-full object-cover" />
                  <span
                    v-if="selectedHeroCandidateId === c.id || formData.hero_image_url === c.preview_url"
                    class="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[11px] font-semibold px-2 py-1"
                  >
                    {{ applyingHero && selectedHeroCandidateId === c.id ? 'Übernimmt…' : 'Ausgewählt' }}
                  </span>
                  <span
                    v-else-if="c.photographer"
                    class="absolute inset-x-0 bottom-0 bg-black/40 text-white text-[10px] px-2 py-1 truncate"
                  >
                    {{ c.photographer }}
                  </span>
                </button>
              </div>

              <div v-if="formData.hero_image_url && heroImageSource !== 'own'" class="rounded-lg overflow-hidden border border-gray-200">
                <p class="text-xs font-medium text-gray-600 px-3 py-2 bg-gray-50">Aktuelles Hero</p>
                <img :src="formData.hero_image_url" alt="Hero" class="h-36 w-full object-cover" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-3">Anrede auf der Website</label>
            <p class="text-xs text-gray-500 mb-3">
              Wie sprichst du Kunden auf der öffentlichen Seite an?
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="rounded-lg border px-4 py-3 text-left transition"
                :class="
                  formData.formal_address === 'sie'
                    ? 'border-transparent text-white'
                    : 'border-gray-300 hover:bg-gray-50'
                "
                :style="formData.formal_address === 'sie' ? { background: primaryColor } : {}"
                @click="formData.formal_address = 'sie'"
              >
                <span class="block font-semibold text-sm">Sie</span>
                <span class="block text-xs opacity-80 mt-0.5">Formell · Standard</span>
              </button>
              <button
                type="button"
                class="rounded-lg border px-4 py-3 text-left transition"
                :class="
                  formData.formal_address === 'du'
                    ? 'border-transparent text-white'
                    : 'border-gray-300 hover:bg-gray-50'
                "
                :style="formData.formal_address === 'du' ? { background: primaryColor } : {}"
                @click="formData.formal_address = 'du'"
              >
                <span class="block font-semibold text-sm">Du</span>
                <span class="block text-xs opacity-80 mt-0.5">Locker · persönlich</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-3"
              >Deine Spezialisierungen</label
            >
            <div class="space-y-2">
              <label v-for="spec in specializationOptions" :key="spec" class="flex items-center">
                <input
                  :checked="formData.specializations?.includes(spec)"
                  @change="toggleSpecialization(spec)"
                  type="checkbox"
                  class="w-4 h-4"
                  :style="{ accentColor: primaryColor }"
                />
                <span class="ml-2 text-sm">{{ spec }}</span>
              </label>
              <p v-if="!specializationOptions.length" class="text-sm text-gray-500">
                Keine {{ terms.categoriesLabel }} gefunden — du kannst später ergänzen.
              </p>
            </div>
          </div>

          <div class="rounded-lg p-3 sm:p-4 border" :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
            <p class="text-sm leading-snug">
              ✅ Diese Infos stammen aus deiner Simy-App und werden automatisch synchronisiert
            </p>
          </div>
        </div>
      </div>

      <!-- Step 2: Your Services -->
      <div v-if="currentStep === 1" class="space-y-4 sm:space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1">🎓 Deine Dienstleistungen</h1>
          <p class="text-sm text-gray-600 leading-snug">
            Preise werden automatisch von der App synchronisiert
          </p>
        </div>

        <div class="bg-white rounded-xl sm:rounded-lg p-3.5 sm:p-8">
          <div v-if="appServices.length > 0" class="space-y-3 sm:space-y-4">
            <div v-for="service in appServices" :key="service.id" class="border border-gray-200 rounded-lg p-3 sm:p-4">
              <div class="flex flex-wrap justify-between items-start gap-2 mb-3">
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-sm sm:text-base leading-snug">{{ service.name || service.category }}</h3>
                  <p class="text-sm text-gray-600">
                    {{ service.duration_minutes }} Min
                  </p>
                </div>
                <span class="text-base sm:text-lg font-bold shrink-0" :style="{ color: primaryColor }"
                  >CHF {{ (service.price / 100).toFixed(0) }}</span
                >
              </div>
              <textarea
                v-model="serviceDescriptions[service.id]"
                :placeholder="`Beschreibe diese ${terms.appointment}…`"
                class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[5rem] focus:ring-2 focus:border-transparent"
                @blur="persistWizardDraft({ serviceDescriptions: { [service.id]: serviceDescriptions[service.id] || '' } })"
              />
              <AIOptimizationSuggestion
                :original="serviceDescriptions[service.id] || ''"
                :context="service.name || service.category || ''"
                content-type="service_description"
                optimization-type="conversion"
                :formal-address="formData.formal_address"
                @apply="applyServiceDescription(service.id, $event)"
              />
            </div>
          </div>
          <div v-else class="text-center py-6 px-2">
            <p class="text-gray-600 text-sm">
              Keine Preise gefunden. Bitte hinterlege Preise in der App unter Kategorien.
            </p>
          </div>
        </div>
      </div>

      <!-- Step 3: Testimonials & Success -->
      <div v-if="currentStep === 2" class="space-y-4 sm:space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1">⭐ Kundenstimmen</h1>
          <p class="text-sm text-gray-600 leading-snug">
            Am besten Google verbinden. Sonst echte Zitate manuell erfassen — keine erfundenen Reviews.
          </p>
        </div>

        <div class="bg-white rounded-xl sm:rounded-lg p-3.5 sm:p-8 space-y-5 sm:space-y-6">
          <div class="rounded-lg p-3 sm:p-4 border" :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
            <p v-if="googleReviewsMeta.enabled" class="text-sm leading-snug break-words">
              ✅ Google Reviews aktiv für
              {{ googleReviewsMeta.places.map((p: any) => p.name || p.place_id).filter(Boolean).join(', ') || 'deine Standorte' }}.
              Die Landingpage lädt sie live (Cache 6h). Manuelle Zitate unten sind nur Fallback.
            </p>
            <div v-else class="text-sm space-y-3">
              <p class="leading-snug">
                <strong>Empfohlen:</strong> Google-Standort automatisch finden — ohne Place-ID-Kopieren, ohne CHF‑19-Add-on.
              </p>
              <button
                type="button"
                class="w-full px-4 py-2.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 min-h-[44px]"
                :style="{ background: primaryColor }"
                :disabled="googlePlaceBusy"
                @click="suggestGooglePlace"
              >
                {{ googlePlaceBusy ? 'Suche…' : 'Google-Standort finden' }}
              </button>
              <p v-if="googlePlaceError" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {{ googlePlaceError }}
              </p>
              <div v-if="googlePlaceCandidates.length" class="space-y-2">
                <p class="text-xs text-gray-600">Treffer tippen zum Verbinden:</p>
                <button
                  v-for="c in googlePlaceCandidates"
                  :key="c.place_id"
                  type="button"
                  class="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-white transition"
                  :disabled="googlePlaceBusy"
                  @click="confirmGooglePlace(c)"
                >
                  <span class="block font-semibold text-sm">{{ c.name }}</span>
                  <span class="block text-xs text-gray-600 mt-0.5">{{ c.address }}</span>
                  <span class="block text-xs text-gray-500 mt-1">
                    <template v-if="c.rating">{{ c.rating }}★ · {{ c.user_ratings_total || 0 }} Bewertungen · </template>
                    {{ c.confidence === 'high' ? 'Gute Übereinstimmung' : c.confidence === 'medium' ? 'Möglich' : 'Prüfen' }}
                  </span>
                </button>
              </div>
              <p class="text-gray-600 text-xs">
                Ohne Google: echte Kundenstimmen manuell erfassen. AI formt nur um, erfindet nichts.
              </p>
            </div>
          </div>

          <div>
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <label class="block text-sm font-semibold">
                Echte Kundenstimmen
              </label>
              <button
                type="button"
                class="text-sm font-medium px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 w-full sm:w-auto min-h-[40px]"
                @click="addManualTestimonial"
              >
                + Zitat hinzufügen
              </button>
            </div>

            <div v-if="!manualTestimonials.length" class="text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 sm:p-4 leading-snug">
              Noch keine Zitate. Füge z.B. Feedback aus WhatsApp, SMS oder mündlichen Rückmeldungen hinzu.
            </div>

            <div class="space-y-3">
              <div
                v-for="(t, idx) in manualTestimonials"
                :key="t.id"
                class="border border-gray-200 rounded-xl sm:rounded-lg p-3 sm:p-4 space-y-3"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="t.author"
                    type="text"
                    class="wz-input tenant-focus min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:border-transparent"
                    placeholder="Name (z.B. Anna M.)"
                    @blur="persistTestimonialsDraft"
                  />
                  <button
                    type="button"
                    class="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 hover:underline px-2 py-2 min-h-[44px]"
                    @click="removeManualTestimonial(idx)"
                  >
                    Entfernen
                  </button>
                </div>
                <textarea
                  v-model="t.text"
                  rows="4"
                  class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[6rem] focus:ring-2 focus:border-transparent"
                  placeholder="Echtes Zitat / Feedback…"
                  @blur="persistTestimonialsDraft"
                />
                <AIOptimizationSuggestion
                  :original="t.text"
                  :context="`${t.author || 'Kunde'} — nur umformulieren, nichts erfinden`"
                  content-type="testimonial"
                  optimization-type="readability"
                  :formal-address="formData.formal_address"
                  @apply="applyTestimonialAi(idx, $event)"
                />
                <label class="flex items-center gap-2 min-h-[44px]">
                  <input
                    type="checkbox"
                    :checked="selectedTestimonials.includes(t.id)"
                    class="w-4 h-4 shrink-0"
                    :style="{ accentColor: primaryColor }"
                    @change="toggleTestimonial(t.id)"
                  />
                  <span class="text-sm leading-snug">Auf Website anzeigen</span>
                </label>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-3">
              Hinweis: Nur echte Rückmeldungen. Erfundene Bewertungen schaden Vertrauen und SEO.
            </p>
          </div>
        </div>
      </div>

      <!-- Step 4: Contact & Booking -->
      <div v-if="currentStep === 3" class="space-y-4 sm:space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1">📍 Kontakt &amp; Buchung</h1>
          <p class="text-sm text-gray-600 leading-snug">
            Deine Kontaktdaten werden automatisch von der App übernommen
          </p>
        </div>

        <div class="bg-white rounded-xl sm:rounded-lg p-3.5 sm:p-8 space-y-5 sm:space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">Adresse</label>
            <input
              v-model="formData.address"
              type="text"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
              placeholder="z.B. Bahnhofstrasse 123, 8000 Zürich"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Telefon</label>
            <input
              v-model="formData.phone"
              type="tel"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Email</label>
            <input
              v-model="formData.email"
              type="email"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
            />
          </div>

          <div class="border border-gray-200 rounded-xl p-3.5 sm:p-5 space-y-3">
            <div>
              <p class="text-sm font-semibold text-gray-900">Kontaktarten auf der Website</p>
              <p class="text-xs text-gray-500 mt-0.5 leading-snug">
                Wähle, wie Kunden dich erreichen dürfen. Deaktiviert = nicht auf der Landingpage.
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                v-for="opt in contactChannelOptions"
                :key="opt.key"
                class="flex items-start gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors"
                :class="formData.contact_channels[opt.key] ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'"
              >
                <input
                  v-model="formData.contact_channels[opt.key]"
                  type="checkbox"
                  class="mt-1 rounded border-gray-300"
                  :style="{ accentColor: primaryColor }"
                  @change="persistContactChannelsDraft"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-gray-900">{{ opt.label }}</span>
                  <span class="block text-xs text-gray-500 leading-snug">{{ opt.hint }}</span>
                </span>
              </label>
            </div>
          </div>

          <div class="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <p class="text-sm font-semibold mb-2">✅ Buchungs-Link:</p>
            <code class="text-[11px] sm:text-xs bg-white px-2 py-1.5 rounded font-mono block break-all overflow-x-auto">{{
              bookingLink
            }}</code>
            <p class="text-xs text-gray-600 mt-2 leading-snug">
              Deine Kunden können direkt über deine Website buchen!
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-1">Eigene Domain (optional)</label>
              <p class="text-sm text-gray-600 mb-3 leading-snug">
                Verbinde z.B. www.meine-firma.ch mit dieser Landingpage. Die Domain bleibt bei deinem Registrar — du setzt nur einen DNS-Eintrag.
              </p>
              <div class="flex flex-col gap-2 sm:flex-row">
                <input
                  v-model="customDomainInput"
                  type="text"
                  class="wz-input tenant-focus flex-1 border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
                  placeholder="www.meine-firma.ch"
                  :disabled="customDomainBusy"
                />
                <button
                  type="button"
                  class="px-4 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 min-h-[44px] w-full sm:w-auto shrink-0"
                  :style="{ background: primaryColor }"
                  :disabled="customDomainBusy || !customDomainInput.trim()"
                  @click="saveCustomDomain"
                >
                  {{ customDomainBusy ? '…' : (customDomain?.domain ? 'Aktualisieren' : 'Verbinden') }}
                </button>
              </div>
            </div>

            <div v-if="customDomain?.domain" class="space-y-3 text-sm">
              <p>
                Status:
                <span class="font-semibold">{{ customDomainStatusLabel }}</span>
                <span v-if="customDomain.verified" class="text-green-600"> · aktiv</span>
              </p>
              <div v-if="customDomain.dns" class="bg-gray-50 rounded-lg p-3 font-mono text-[11px] sm:text-xs space-y-1 overflow-x-auto">
                <p class="font-sans font-semibold text-gray-700 mb-1">DNS setzen:</p>
                <p>Typ: {{ customDomain.dns.type }}</p>
                <p class="break-all">Host: {{ customDomain.dns.host }}</p>
                <p class="break-all">Wert: {{ customDomain.dns.value }}</p>
                <p class="font-sans text-gray-600 mt-2 leading-snug">{{ customDomain.dns.note }}</p>
                <template v-if="customDomain.dns.alt">
                  <p class="font-sans font-semibold text-gray-700 mt-3 mb-1">Optional zusätzlich:</p>
                  <p class="break-all">Typ: {{ customDomain.dns.alt.type }} · Host: {{ customDomain.dns.alt.host }} · Wert: {{ customDomain.dns.alt.value }}</p>
                </template>
              </div>
              <div v-if="vercelChallenges.length" class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1 break-all">
                <p class="font-semibold text-amber-900">Zusätzliche Verifikation (von Vercel):</p>
                <div v-for="(v, i) in vercelChallenges" :key="i">
                  {{ v.type }} · {{ v.domain }} · {{ v.value }}
                </div>
              </div>
              <div class="flex flex-col sm:flex-row flex-wrap gap-2">
                <button
                  type="button"
                  class="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
                  :disabled="customDomainBusy"
                  @click="verifyCustomDomain"
                >
                  DNS prüfen
                </button>
                <button
                  type="button"
                  class="px-4 py-2.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 min-h-[44px] w-full sm:w-auto"
                  :disabled="customDomainBusy"
                  @click="removeCustomDomain"
                >
                  Entfernen
                </button>
                <a
                  v-if="customDomain.live_url"
                  :href="customDomain.live_url"
                  target="_blank"
                  rel="noopener"
                  class="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px] inline-flex items-center justify-center w-full sm:w-auto"
                >
                  Öffnen
                </a>
              </div>
              <p v-if="customDomainMessage" class="text-xs text-gray-600">{{ customDomainMessage }}</p>
              <p v-if="!customDomain.vercel_api_configured" class="text-xs text-amber-700">
                Hinweis: Vercel-API nicht vollständig konfiguriert (Token +
                <code class="text-[10px]">VERCEL_PROJECT_ID</code>
                nötig). Domain ggf. manuell im Vercel-Projekt hinzufügen — DNS reicht dann zur Aktivierung.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: SEO Settings -->
      <div v-if="currentStep === 4" class="space-y-4 sm:space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1">🔍 SEO Einstellungen</h1>
          <p class="text-sm text-gray-600 leading-snug">
            Damit deine Website in Google gut rankt
          </p>
        </div>

        <div class="bg-white rounded-xl sm:rounded-lg p-3.5 sm:p-8 space-y-5 sm:space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">
              Website-Titel (für Google) *
            </label>
            <input
              v-model="formData.seo_title"
              type="text"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
              :placeholder="`z.B. ${terms.businessNoun} Pascal | ${terms.appointmentsPlural} in Zürich`"
              maxlength="60"
            />
            <div class="text-xs text-gray-600 mt-1">
              {{ formData.seo_title?.length || 0 }}/60 Zeichen
            </div>
            <AIOptimizationSuggestion
              :original="formData.seo_title"
              :context="formData.name || tenantInfo?.name || ''"
              content-type="seo_title"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="applyAiField('seo_title', $event)"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">
              Meta-Beschreibung (für Google) *
            </label>
            <textarea
              v-model="formData.seo_description"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 min-h-[5.5rem] focus:ring-2 focus:border-transparent"
              placeholder="z.B. Moderne Fahrausbildung mit hoher Erfolgsquote..."
              maxlength="160"
            />
            <div class="text-xs text-gray-600 mt-1">
              {{ formData.seo_description?.length || 0 }}/160 Zeichen
            </div>
            <AIOptimizationSuggestion
              :original="formData.seo_description"
              :context="formData.name || tenantInfo?.name || ''"
              content-type="seo_description"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="applyAiField('seo_description', $event)"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">
              Keywords (Komma-separiert)
            </label>
            <input
              v-model="formData.seo_keywords"
              type="text"
              class="wz-input tenant-focus w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-3 focus:ring-2 focus:border-transparent"
              :placeholder="`z.B. ${terms.staff}, ${terms.businessNoun}, ${terms.appointment}`"
            />
            <AIOptimizationSuggestion
              :original="formData.seo_keywords"
              :context="formData.name || tenantInfo?.name || ''"
              content-type="keywords"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="applyAiField('seo_keywords', $event)"
            />
          </div>

          <div
            class="rounded-lg border p-3 sm:p-4"
            :class="seoScorePanelClass"
          >
            <p class="text-sm">
              📊 <strong>SEO Score: {{ seoScore.score }}/{{ seoScore.max }}</strong>
              — {{ seoScore.label }}
            </p>
            <p v-if="seoScore.score >= 100" class="text-xs mt-2 opacity-80">
              Alles Wichtige im Wizard ist gesetzt. Nach dem Veröffentlichen indexiert Google die Seite mit etwas Verzögerung.
            </p>
            <div v-else class="mt-3 space-y-2">
              <p class="text-xs font-semibold opacity-90">So kommst du höher:</p>
              <ul class="space-y-2">
                <li
                  v-for="tip in seoScore.suggestions"
                  :key="tip.id"
                  class="flex items-start gap-2 text-xs leading-snug"
                >
                  <span
                    v-if="tip.points > 0"
                    class="shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/70 border border-black/5"
                  >+{{ tip.points }}</span>
                  <span v-else class="shrink-0 mt-0.5 text-[10px] opacity-60">Tipp</span>
                  <span class="flex-1">
                    {{ tip.text }}
                    <button
                      v-if="typeof tip.step === 'number' && tip.step !== currentStep"
                      type="button"
                      class="ml-1 underline font-medium"
                      @click="currentStep = tip.step!"
                    >
                      Zum Schritt →
                    </button>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="wz-nav-bar fixed bottom-0 left-0 right-0 z-20 bg-white/95 border-t border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div class="max-w-2xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <button
          v-if="currentStep > 0"
          type="button"
          @click="currentStep--"
          class="px-3 sm:px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition min-h-[44px] text-sm sm:text-base shrink-0"
        >
          ← Zurück
        </button>
        <div v-else class="w-16 sm:w-20 shrink-0" />

        <div class="flex gap-2 sm:gap-3 min-w-0 flex-1 justify-end">
          <button
            v-if="currentStep < steps.length - 1"
            type="button"
            @click="currentStep++"
            class="px-5 sm:px-8 py-2.5 text-white font-medium rounded-lg hover:opacity-90 transition min-h-[44px] text-sm sm:text-base"
            :style="{ background: primaryColor }"
          >
            Weiter →
          </button>
          <template v-else>
            <button
              type="button"
              @click="saveWebsite(false)"
              :disabled="savingLoading"
              class="px-3 sm:px-6 py-2.5 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition min-h-[44px] text-sm sm:text-base"
            >
              {{ savingLoading ? '…' : 'Entwurf' }}
            </button>
            <button
              type="button"
              @click="saveWebsite(true)"
              :disabled="savingLoading"
              class="px-4 sm:px-8 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition min-h-[44px] text-sm sm:text-base"
            >
              {{ savingLoading ? '…' : 'Veröffentlichen' }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Publish / save progress overlay -->
    <Teleport to="body">
      <div
        v-if="publishUi.open"
        class="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-label="publishUi.mode === 'publish' ? 'Website veröffentlichen' : 'Entwurf speichern'"
      >
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
        <div class="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] overflow-y-auto">
          <!-- Running -->
          <div v-if="publishUi.phase === 'running'" class="p-5 sm:p-6">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              {{ publishUi.mode === 'publish' ? 'Veröffentlichen' : 'Entwurf speichern' }}
            </p>
            <h2 class="text-xl font-bold text-slate-900 mb-1">
              {{ publishProgressSteps[publishUi.stepIndex]?.label || 'Bitte warten…' }}
            </h2>
            <p class="text-sm text-slate-600 mb-5 leading-snug">
              {{ publishProgressSteps[publishUi.stepIndex]?.detail }}
            </p>

            <div class="h-2 rounded-full bg-slate-100 overflow-hidden mb-5">
              <div
                class="h-full rounded-full transition-all duration-500 ease-out"
                :style="{
                  width: `${Math.round(((publishUi.stepIndex + 1) / publishProgressSteps.length) * 100)}%`,
                  background: primaryColor,
                }"
              />
            </div>

            <ol class="space-y-2.5">
              <li
                v-for="(s, i) in publishProgressSteps"
                :key="s.id"
                class="flex items-start gap-3 text-sm"
              >
                <span
                  class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border"
                  :class="
                    i < publishUi.stepIndex
                      ? 'bg-green-500 border-green-500 text-white'
                      : i === publishUi.stepIndex
                        ? 'border-transparent text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                  "
                  :style="i === publishUi.stepIndex ? { background: primaryColor, borderColor: primaryColor } : {}"
                >
                  <template v-if="i < publishUi.stepIndex">✓</template>
                  <template v-else-if="i === publishUi.stepIndex">
                    <span class="wz-spin w-2.5 h-2.5 border-2 border-white/40 border-t-white rounded-full" />
                  </template>
                  <template v-else>{{ i + 1 }}</template>
                </span>
                <div class="min-w-0 flex-1 pt-0.5">
                  <p
                    class="font-medium leading-snug"
                    :class="i <= publishUi.stepIndex ? 'text-slate-900' : 'text-slate-400'"
                  >
                    {{ s.label }}
                  </p>
                  <p
                    v-if="i === publishUi.stepIndex"
                    class="text-xs text-slate-500 mt-0.5 leading-snug"
                  >
                    {{ s.detail }}
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <!-- Success -->
          <div v-else-if="publishUi.phase === 'success'" class="p-5 sm:p-6">
            <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-2xl mb-4">
              ✓
            </div>
            <h2 class="text-xl font-bold text-slate-900 mb-1">
              {{ publishUi.mode === 'publish' ? 'Website ist live!' : 'Entwurf gespeichert' }}
            </h2>
            <p class="text-sm text-slate-600 mb-4 leading-snug">
              <template v-if="publishUi.mode === 'publish'">
                Deine Seite ist öffentlich erreichbar. Google indexiert sie mit etwas Verzögerung.
              </template>
              <template v-else>
                Du kannst den Entwurf in der Vorschau prüfen und später veröffentlichen.
              </template>
            </p>

            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {{ publishUi.mode === 'publish' ? 'Live-URL' : 'Vorschau' }}
              </p>
              <a
                :href="publishUi.mode === 'publish' ? publishUi.liveUrl : publishUi.previewUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block text-sm font-medium break-all underline decoration-slate-300 hover:decoration-slate-500"
                :style="{ color: primaryColor }"
              >
                {{ publishUi.mode === 'publish' ? publishUi.liveUrl : publishUi.previewUrl }}
              </a>
            </div>

            <p v-if="publishUi.subdomain" class="text-xs text-slate-500 mb-5">
              Subdomain: <span class="font-mono text-slate-700">{{ publishUi.subdomain }}</span>
            </p>

            <div class="flex flex-col gap-2">
              <a
                :href="publishUi.mode === 'publish' ? publishUi.liveUrl : publishUi.previewUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full text-center px-4 py-3 rounded-xl text-white font-semibold min-h-[48px] flex items-center justify-center"
                :style="{ background: primaryColor }"
              >
                {{ publishUi.mode === 'publish' ? 'Website öffnen' : 'Vorschau öffnen' }}
              </a>
              <button
                v-if="publishUi.mode === 'publish' && publishUi.previewUrl && publishUi.previewUrl !== publishUi.liveUrl"
                type="button"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium min-h-[44px] hover:bg-slate-50"
                @click="openExternal(publishUi.previewUrl)"
              >
                Vorschau mit ?preview=1
              </button>
              <button
                type="button"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium min-h-[44px] hover:bg-slate-50"
                @click="copyPublishUrl"
              >
                {{ publishUi.copied ? 'Link kopiert' : 'Link kopieren' }}
              </button>
              <button
                type="button"
                class="w-full px-4 py-2.5 rounded-xl text-slate-600 font-medium min-h-[44px] hover:bg-slate-50"
                @click="goToEditor"
              >
                Im Editor bearbeiten
              </button>
              <button
                type="button"
                class="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 min-h-[40px]"
                @click="closePublishUi"
              >
                Schliessen
              </button>
            </div>
          </div>

          <!-- Error -->
          <div v-else class="p-5 sm:p-6">
            <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4">
              !
            </div>
            <h2 class="text-xl font-bold text-slate-900 mb-1">Etwas ist schiefgelaufen</h2>
            <p class="text-sm text-slate-600 mb-4 leading-snug break-words">
              {{ publishUi.error || 'Speichern fehlgeschlagen. Bitte erneut versuchen.' }}
            </p>
            <div class="flex flex-col gap-2">
              <button
                type="button"
                class="w-full px-4 py-3 rounded-xl text-white font-semibold min-h-[48px]"
                :style="{ background: primaryColor }"
                @click="saveWebsite(publishUi.mode === 'publish')"
              >
                Erneut versuchen
              </button>
              <button
                type="button"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium min-h-[44px]"
                @click="closePublishUi"
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { compressImage, validateImageFile } from '~/utils/imageCompression'
import { scoreWizardSeo } from '~/utils/website-wizard-seo-score'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { primaryColor, accentColor } = useTenantBranding()

const currentStep = ref(0)
const savingLoading = ref(false)
const uploadingLogo = ref(false)
const uploadingHero = ref(false)
const resultUrl = ref('')

type PublishPhase = 'running' | 'success' | 'error'
type PublishMode = 'publish' | 'draft'

const publishUi = ref({
  open: false,
  mode: 'publish' as PublishMode,
  phase: 'running' as PublishPhase,
  stepIndex: 0,
  error: '',
  liveUrl: '',
  previewUrl: '',
  subdomain: '',
  copied: false,
})

const publishProgressSteps = computed(() => {
  if (publishUi.value.mode === 'draft') {
    return [
      { id: 'init', label: 'Website-Konto prüfen', detail: 'Subdomain und Basis-Einstellungen…' },
      { id: 'content', label: 'Inhalte zusammenstellen', detail: 'Texte, Services und Kundenstimmen…' },
      { id: 'build', label: 'Landing Page aufbauen', detail: 'Layout, SEO und Buchungslinks…' },
      { id: 'save', label: 'Als Entwurf speichern', detail: 'Seite in die Datenbank schreiben…' },
    ]
  }
  return [
    { id: 'init', label: 'Website-Konto vorbereiten', detail: 'Subdomain und Einstellungen prüfen…' },
    { id: 'content', label: 'Inhalte zusammenstellen', detail: 'Texte, Services und Kundenstimmen…' },
    { id: 'build', label: 'Landing Page generieren', detail: 'Layout, SEO und Buchungslinks…' },
    { id: 'save', label: 'Seite speichern', detail: 'Blöcke und SEO in die Datenbank…' },
    { id: 'live', label: 'Online schalten', detail: 'Website öffentlich machen…' },
  ]
})

function closePublishUi() {
  publishUi.value.open = false
  publishUi.value.copied = false
}

function openExternal(url: string) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function copyPublishUrl() {
  const url =
    publishUi.value.mode === 'publish'
      ? publishUi.value.liveUrl || publishUi.value.previewUrl
      : publishUi.value.previewUrl || publishUi.value.liveUrl
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    publishUi.value.copied = true
    setTimeout(() => {
      publishUi.value.copied = false
    }, 2000)
  } catch {
    // ignore
  }
}

async function goToEditor() {
  closePublishUi()
  await navigateTo('/admin/website/editor')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
const heroImageSource = ref<'own' | 'stock' | 'ai'>('stock')
const heroHint = ref('')
const heroCandidates = ref<Array<{
  id: string
  preview_url: string
  hotlink_url?: string | null
  source: 'stock' | 'ai'
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
  download_location?: string | null
}>>([])
const selectedHeroCandidateId = ref('')
const suggestingHero = ref(false)
const applyingHero = ref(false)
const heroSuggestError = ref('')
const heroAttribution = ref<{
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
} | null>(null)

const steps = [
  { label: 'Wer bist du?', short: 'Profil' },
  { label: 'Services', short: 'Angebot' },
  { label: 'Kundenstimmen', short: 'Reviews' },
  { label: 'Kontakt', short: 'Kontakt' },
  { label: 'SEO', short: 'SEO' },
]

const formData = ref({
  name: '',
  bio: '',
  formal_address: 'sie' as 'sie' | 'du',
  specializations: [] as string[],
  address: '',
  phone: '',
  email: '',
  logo_url: '' as string,
  hero_image_url: '' as string,
  hero_image_source: 'stock' as 'own' | 'stock' | 'ai',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  contact_channels: {
    phone: true,
    email: true,
    whatsapp: true,
    form: true,
  },
})

const contactChannelOptions = [
  { key: 'phone' as const, label: 'Telefon', hint: 'Anruf-Link auf der Website' },
  { key: 'email' as const, label: 'E-Mail', hint: 'mailto-Link anzeigen' },
  { key: 'whatsapp' as const, label: 'WhatsApp', hint: 'Direkt-Chat im Header & Kontakt' },
  { key: 'form' as const, label: 'Kontaktformular', hint: '«Nachricht schreiben»-Formular' },
]

const persistContactChannelsDraft = () => {
  void persistWizardDraft({ contact_channels: formData.value.contact_channels })
}

const appServices = ref<any[]>([])
const serviceDescriptions = ref<Record<string, string>>({})
const topTestimonials = ref<any[]>([])
const manualTestimonials = ref<Array<{ id: string; author: string; text: string; rating: number }>>([])
const selectedTestimonials = ref<string[]>([])
const tenantInfo = ref<any>(null)
const draftSaving = ref(false)

const newTestimonialId = () => `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const addManualTestimonial = () => {
  const id = newTestimonialId()
  manualTestimonials.value.push({ id, author: '', text: '', rating: 5 })
  if (!selectedTestimonials.value.includes(id)) selectedTestimonials.value.push(id)
  void persistTestimonialsDraft()
}

const removeManualTestimonial = (idx: number) => {
  const [removed] = manualTestimonials.value.splice(idx, 1)
  if (removed) {
    selectedTestimonials.value = selectedTestimonials.value.filter((id) => id !== removed.id)
  }
  void persistTestimonialsDraft()
}

const applyTestimonialAi = (idx: number, text: string) => {
  if (!manualTestimonials.value[idx]) return
  manualTestimonials.value[idx].text = text
  void persistTestimonialsDraft()
}

const persistTestimonialsDraft = () =>
  persistWizardDraft({
    testimonials: manualTestimonials.value,
    selectedTestimonials: selectedTestimonials.value,
  })

const applyServiceDescription = (serviceId: string, text: string) => {
  serviceDescriptions.value = {
    ...serviceDescriptions.value,
    [String(serviceId)]: text,
  }
  void persistWizardDraft({ serviceDescriptions: { [String(serviceId)]: text } })
}

const applyAiField = (
  field: 'bio' | 'seo_title' | 'seo_description' | 'seo_keywords',
  text: string,
) => {
  formData.value[field] = text
  void persistWizardDraft({ [field]: text })
}

const persistWizardDraft = async (partial?: Record<string, unknown>) => {
  if (draftSaving.value) {
    // Still send latest snapshot; queueing is overkill for this UX
  }
  draftSaving.value = true
  try {
    const body = {
      serviceDescriptions: serviceDescriptions.value,
      bio: formData.value.bio,
      seo_title: formData.value.seo_title,
      seo_description: formData.value.seo_description,
      seo_keywords: formData.value.seo_keywords,
      formal_address: formData.value.formal_address,
      contact_channels: formData.value.contact_channels,
      testimonials: manualTestimonials.value,
      selectedTestimonials: selectedTestimonials.value,
      ...partial,
    }
    // Keep a local backup so refresh recovers even if the API lags
    try {
      const key = `website-wizard-draft:${tenantInfo.value?.id || 'pending'}`
      localStorage.setItem(key, JSON.stringify(body))
    } catch {
      /* ignore quota / private mode */
    }
    await $fetch('/api/website/wizard-draft', { method: 'POST', body })
  } catch (error) {
    console.warn('Wizard draft save failed', error)
  } finally {
    draftSaving.value = false
  }
}
const brandSwatches = computed(() => {
  const t = tenantInfo.value || {}
  return [
    { key: 'primary', label: 'Primary', color: t.primary_color },
    { key: 'secondary', label: 'Secondary', color: t.secondary_color },
    { key: 'accent', label: 'Accent', color: t.accent_color },
    { key: 'success', label: 'Success', color: t.success_color },
    { key: 'error', label: 'Error', color: t.error_color },
    { key: 'info', label: 'Info', color: t.info_color },
  ].filter((s) => !!s.color)
})
const staffList = ref<any[]>([])
const categories = ref<any[]>([])
const stats = ref<any>(null)
const googleReviewsMeta = ref<{ enabled: boolean; places: any[] }>({ enabled: false, places: [] })
const googlePlaceBusy = ref(false)
const googlePlaceError = ref('')
const googlePlaceCandidates = ref<
  Array<{
    place_id: string
    name: string
    address?: string | null
    rating?: number | null
    user_ratings_total?: number | null
    maps_url?: string | null
    confidence: 'high' | 'medium' | 'low'
  }>
>([])
const terminology = ref(getTerminologyDefaults('driving_school'))
const customDomainInput = ref('')
const customDomain = ref<any>(null)
const customDomainBusy = ref(false)
const customDomainMessage = ref('')

const customDomainStatusLabel = computed(() => {
  const s = customDomain.value?.status
  if (customDomain.value?.verified || s === 'active') return 'Aktiv'
  if (s === 'dns_pending') return 'Warte auf DNS'
  if (s === 'error') return 'Fehler'
  if (s === 'pending') return 'Ausstehend'
  return 'Nicht verbunden'
})

const describedServiceCount = computed(
  () =>
    Object.values(serviceDescriptions.value).filter((d) => String(d || '').trim().length >= 20)
      .length,
)

const seoScore = computed(() =>
  scoreWizardSeo({
    name: formData.value.name || tenantInfo.value?.name,
    bio: formData.value.bio,
    address: formData.value.address || tenantInfo.value?.address,
    city: tenantInfo.value?.city,
    phone: formData.value.phone,
    email: formData.value.email,
    logo_url: formData.value.logo_url,
    hero_image_url: formData.value.hero_image_url,
    seo_title: formData.value.seo_title,
    seo_description: formData.value.seo_description,
    seo_keywords: formData.value.seo_keywords,
    businessNoun: terminology.value?.businessNoun,
    serviceCount: appServices.value.length,
    describedServiceCount: describedServiceCount.value,
    hasTestimonials:
      selectedTestimonials.value.some((id) =>
        manualTestimonials.value.some((t) => t.id === id && String(t.text || '').trim().length >= 20),
      ) || !!googleReviewsMeta.value?.enabled,
    hasGoogleReviews: !!googleReviewsMeta.value?.enabled,
    hasCustomDomain: !!(customDomain.value?.verified || customDomain.value?.status === 'active'),
  }),
)

const seoScorePanelClass = computed(() => {
  switch (seoScore.value.tone) {
    case 'great':
      return 'bg-green-50 border-green-200 text-green-950'
    case 'good':
      return 'bg-emerald-50 border-emerald-200 text-emerald-950'
    case 'ok':
      return 'bg-amber-50 border-amber-200 text-amber-950'
    default:
      return 'bg-orange-50 border-orange-200 text-orange-950'
  }
})

const vercelChallenges = computed(() => {
  const v = customDomain.value?.verification?.vercel
  const list = v?.verification || v?.payload?.verification || []
  return Array.isArray(list) ? list : []
})

const terms = computed(() => terminology.value)
const specializationOptions = computed(() =>
  (categories.value || []).map((c: any) => c.name).filter(Boolean),
)

const displayRating = computed(() => {
  const r = stats.value?.avg_rating
  return r && r > 0 ? `${Number(r).toFixed(1)}★` : '—'
})

const bookingLink = computed(() => {
  const slug = tenantInfo.value?.slug
  if (!slug || !import.meta.client) return '…'
  return `${window.location.origin}/booking/availability/${slug}`
})

const toggleSpecialization = (spec: string) => {
  const idx = formData.value.specializations.indexOf(spec)
  if (idx > -1) {
    formData.value.specializations.splice(idx, 1)
  } else {
    formData.value.specializations.push(spec)
  }
}

const toggleTestimonial = (id: string) => {
  const idx = selectedTestimonials.value.indexOf(id)
  if (idx > -1) {
    selectedTestimonials.value.splice(idx, 1)
  } else {
    selectedTestimonials.value.push(id)
  }
  void persistTestimonialsDraft()
}

const suggestGooglePlace = async () => {
  googlePlaceBusy.value = true
  googlePlaceError.value = ''
  googlePlaceCandidates.value = []
  try {
    const res = await $fetch<{
      candidates?: typeof googlePlaceCandidates.value
      auto?: (typeof googlePlaceCandidates.value)[number] | null
    }>('/api/website/google-place/suggest', {
      method: 'POST',
      body: {
        name: formData.value.name || tenantInfo.value?.name,
        address: formData.value.address || tenantInfo.value?.address,
        city: tenantInfo.value?.city,
      },
    })
    googlePlaceCandidates.value = res.candidates || []
    if (!googlePlaceCandidates.value.length) {
      googlePlaceError.value =
        'Kein Treffer. Prüfe Name/Adresse oder füge unten manuelle Zitate hinzu.'
      return
    }
    // High-confidence single match → auto-confirm
    if (res.auto && googlePlaceCandidates.value.length === 1) {
      await confirmGooglePlace(res.auto)
    }
  } catch (error: any) {
    googlePlaceError.value =
      error?.data?.statusMessage || error?.message || 'Google-Suche fehlgeschlagen.'
  } finally {
    googlePlaceBusy.value = false
  }
}

const confirmGooglePlace = async (c: (typeof googlePlaceCandidates.value)[number]) => {
  googlePlaceBusy.value = true
  googlePlaceError.value = ''
  try {
    const res = await $fetch<{ place: { name: string; place_id: string; url?: string } }>(
      '/api/website/google-place/confirm',
      {
        method: 'POST',
        body: {
          place_id: c.place_id,
          name: c.name,
          maps_url: c.maps_url,
        },
      },
    )
    googleReviewsMeta.value = {
      enabled: true,
      places: [res.place],
    }
    googlePlaceCandidates.value = []
  } catch (error: any) {
    googlePlaceError.value =
      error?.data?.statusMessage || error?.message || 'Verbinden fehlgeschlagen.'
  } finally {
    googlePlaceBusy.value = false
  }
}

const loadCustomDomain = async () => {
  try {
    customDomain.value = await $fetch('/api/website/custom-domain')
    if (customDomain.value?.domain) customDomainInput.value = customDomain.value.domain
  } catch {
    customDomain.value = null
  }
}

const saveCustomDomain = async () => {
  customDomainBusy.value = true
  customDomainMessage.value = ''
  try {
    await $fetch('/api/website/init', { method: 'POST' }).catch(() => null)
    const res = await $fetch<any>('/api/website/custom-domain', {
      method: 'POST',
      body: { domain: customDomainInput.value },
    })
    customDomainMessage.value = res.message || 'Gespeichert'
    await loadCustomDomain()
  } catch (error: any) {
    customDomainMessage.value = error?.data?.statusMessage || error?.message || 'Fehler'
  } finally {
    customDomainBusy.value = false
  }
}

const verifyCustomDomain = async () => {
  customDomainBusy.value = true
  customDomainMessage.value = ''
  try {
    const res = await $fetch<any>('/api/website/custom-domain/verify', { method: 'POST' })
    customDomainMessage.value = res.message || 'Geprüft'
    await loadCustomDomain()
  } catch (error: any) {
    customDomainMessage.value = error?.data?.statusMessage || error?.message || 'Prüfung fehlgeschlagen'
  } finally {
    customDomainBusy.value = false
  }
}

const removeCustomDomain = async () => {
  if (!confirm('Custom Domain wirklich entfernen?')) return
  customDomainBusy.value = true
  customDomainMessage.value = ''
  try {
    await $fetch('/api/website/custom-domain', { method: 'DELETE' })
    customDomainInput.value = ''
    customDomainMessage.value = 'Entfernt'
    await loadCustomDomain()
  } catch (error: any) {
    customDomainMessage.value = error?.data?.statusMessage || error?.message || 'Fehler'
  } finally {
    customDomainBusy.value = false
  }
}

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/webp'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new File([u8arr], filename, { type: mime })
}

const handleAssetUpload = async (event: Event, kind: 'logo' | 'hero') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const tenantId = tenantInfo.value?.id
  if (!tenantId) {
    alert('Tenant nicht geladen')
    return
  }

  const maxMb = kind === 'hero' ? 8 : 5
  const validation = validateImageFile(file, maxMb)
  if (!validation.valid) {
    alert(validation.error || 'Ungültige Datei')
    return
  }

  const loadingRef = kind === 'logo' ? uploadingLogo : uploadingHero
  loadingRef.value = true
  try {
    const compressType = kind === 'hero' ? 'hero' : 'square'
    const compressedBase64 = await compressImage(file, compressType)
    const webpFile = base64ToFile(compressedBase64, `${kind}-${Date.now()}.webp`)

    const form = new FormData()
    form.append('file', webpFile)
    form.append('assetType', kind === 'hero' ? 'banner' : 'logo_square')
    form.append('tenantId', tenantId)

    const response = await $fetch<{ asset: { url: string } }>('/api/tenant/upload-logo', {
      method: 'POST',
      body: form,
    })

    const url = response.asset.url
    if (kind === 'logo') formData.value.logo_url = url
    else {
      formData.value.hero_image_url = url
      heroImageSource.value = 'own'
      formData.value.hero_image_source = 'own'
      heroAttribution.value = null
      selectedHeroCandidateId.value = ''
    }
  } catch (error: any) {
    alert(error?.data?.statusMessage || error?.message || 'Upload fehlgeschlagen')
  } finally {
    loadingRef.value = false
    if (input) input.value = ''
  }
}

const selectHeroSource = async (source: 'own' | 'stock' | 'ai') => {
  heroImageSource.value = source
  formData.value.hero_image_source = source
  heroSuggestError.value = ''
  if (source === 'own') {
    heroCandidates.value = []
    selectedHeroCandidateId.value = ''
    return
  }
  if (!heroCandidates.value.length || heroCandidates.value[0]?.source !== source) {
    await loadHeroSuggestions()
  }
}

const loadHeroSuggestions = async () => {
  if (heroImageSource.value === 'own') return
  suggestingHero.value = true
  heroSuggestError.value = ''
  heroCandidates.value = []
  selectedHeroCandidateId.value = ''
  try {
    const res = await $fetch<{
      candidates: typeof heroCandidates.value
      source: 'stock' | 'ai'
    }>('/api/website/media/suggest-hero', {
      method: 'POST',
      body: {
        source: heroImageSource.value,
        hint: heroHint.value.trim() || undefined,
      },
    })
    heroCandidates.value = res.candidates || []
    if (!heroCandidates.value.length) {
      heroSuggestError.value = 'Keine Vorschläge gefunden.'
    }
  } catch (error: any) {
    heroSuggestError.value =
      error?.data?.statusMessage || error?.message || 'Vorschläge konnten nicht geladen werden.'
  } finally {
    suggestingHero.value = false
  }
}

const applyHeroCandidate = async (candidate: (typeof heroCandidates.value)[number]) => {
  applyingHero.value = true
  selectedHeroCandidateId.value = candidate.id
  heroSuggestError.value = ''
  try {
    const res = await $fetch<{
      hero_image_url: string
      hero_image_source: 'stock' | 'ai'
      hero_attribution: typeof heroAttribution.value
    }>('/api/website/media/apply-hero', {
      method: 'POST',
      body: {
        source: candidate.source,
        preview_url: candidate.preview_url,
        hotlink_url: candidate.hotlink_url || candidate.preview_url,
        photographer: candidate.photographer,
        photographer_url: candidate.photographer_url,
        unsplash_url: candidate.unsplash_url,
        download_location: candidate.download_location,
      },
    })
    formData.value.hero_image_url = res.hero_image_url
    formData.value.hero_image_source = res.hero_image_source
    heroImageSource.value = res.hero_image_source
    heroAttribution.value = res.hero_attribution || (
      candidate.source === 'stock'
        ? {
            photographer: candidate.photographer,
            photographer_url: candidate.photographer_url,
            unsplash_url: candidate.unsplash_url,
          }
        : null
    )
  } catch (error: any) {
    selectedHeroCandidateId.value = ''
    heroSuggestError.value =
      error?.data?.statusMessage || error?.message || 'Bild konnte nicht übernommen werden.'
  } finally {
    applyingHero.value = false
  }
}

const saveWebsite = async (publish = true) => {
  if (savingLoading.value) return
  savingLoading.value = true

  publishUi.value = {
    open: true,
    mode: publish ? 'publish' : 'draft',
    phase: 'running',
    stepIndex: 0,
    error: '',
    liveUrl: '',
    previewUrl: '',
    subdomain: '',
    copied: false,
  }

  let advanceTimer: ReturnType<typeof setInterval> | null = null
  const maxStepBeforeDone = () => Math.max(0, publishProgressSteps.value.length - 2)

  try {
    // Step 1: ensure website row
    publishUi.value.stepIndex = 0
    await $fetch('/api/website/init', { method: 'POST' }).catch(() => null)
    await sleep(350)

    // Advance through content/build while save runs
    publishUi.value.stepIndex = 1
    advanceTimer = setInterval(() => {
      if (publishUi.value.phase !== 'running') return
      if (publishUi.value.stepIndex < maxStepBeforeDone()) {
        publishUi.value.stepIndex += 1
      }
    }, 650)

    const result = await $fetch<any>('/api/website/wizard-save', {
      method: 'POST',
      body: {
        ...formData.value,
        hero_image_source: heroImageSource.value,
        hero_attribution: heroImageSource.value === 'stock' ? heroAttribution.value : null,
        serviceDescriptions: serviceDescriptions.value,
        selectedTestimonials: selectedTestimonials.value,
        services: appServices.value,
        testimonials: manualTestimonials.value.filter((t) => String(t.text || '').trim()),
        testimonials_source: 'manual',
        stats: stats.value,
        publish,
      },
    })

    if (advanceTimer) {
      clearInterval(advanceTimer)
      advanceTimer = null
    }

    // Final step(s)
    publishUi.value.stepIndex = publishProgressSteps.value.length - 1
    await sleep(400)

    const liveUrl = String(result?.live_url || '').trim()
    const previewUrl = String(result?.preview_url || liveUrl || '').trim()
    resultUrl.value = previewUrl || liveUrl

    publishUi.value.liveUrl = liveUrl || previewUrl
    publishUi.value.previewUrl = previewUrl || liveUrl
    publishUi.value.subdomain = String(result?.subdomain || '').trim()
    publishUi.value.phase = 'success'
  } catch (error: any) {
    if (advanceTimer) {
      clearInterval(advanceTimer)
      advanceTimer = null
    }
    publishUi.value.phase = 'error'
    publishUi.value.error =
      error?.data?.statusMessage || error?.message || 'Speichern fehlgeschlagen'
  } finally {
    savingLoading.value = false
  }
}

onMounted(async () => {
  try {
    await $fetch('/api/website/init', { method: 'POST' }).catch(() => null)

    const response = await $fetch<any>('/api/website/init-data')
    const data = response?.data || response

    tenantInfo.value = data.tenant
    staffList.value = data.staff || []
    categories.value = data.categories || []
    stats.value = data.stats
    googleReviewsMeta.value = data.google_reviews || { enabled: false, places: [] }
    terminology.value = data.terminology || getTerminologyDefaults(data.tenant?.business_type)
    appServices.value = data.services || []
    topTestimonials.value = data.testimonials || []

    // Restore service descriptions: draft (AI) > published landing > empty
    const draft = (data.wizard_draft || {}) as Record<string, any>
    const fromLanding = (data.service_descriptions || {}) as Record<string, string>
    serviceDescriptions.value = {
      ...fromLanding,
      ...(draft.serviceDescriptions || {}),
    }

    // Manual testimonials from draft, else published landing — no app-rating dependency
    if (Array.isArray(draft.testimonials) && draft.testimonials.length) {
      manualTestimonials.value = draft.testimonials.map((t: any) => ({
        id: String(t.id || newTestimonialId()),
        author: String(t.author || ''),
        text: String(t.text || ''),
        rating: Number(t.rating) || 5,
      }))
      selectedTestimonials.value = Array.isArray(draft.selectedTestimonials)
        ? draft.selectedTestimonials.map(String)
        : manualTestimonials.value.map((t) => t.id)
    } else if (Array.isArray(data.landing_testimonials) && data.landing_testimonials.length) {
      manualTestimonials.value = data.landing_testimonials.map((t: any) => ({
        id: String(t.id || newTestimonialId()),
        author: String(t.author || ''),
        text: String(t.text || ''),
        rating: Number(t.rating) || 5,
      }))
      selectedTestimonials.value = manualTestimonials.value.map((t) => t.id)
    } else {
      manualTestimonials.value = []
      selectedTestimonials.value = []
    }

    if (data.tenant?.name) formData.value.name = data.tenant.name
    if (data.suggestions?.bio) formData.value.bio = data.suggestions.bio
    if (typeof draft.bio === 'string' && draft.bio.trim()) formData.value.bio = draft.bio

    if (data.tenant?.contact_email || data.tenant?.email) {
      formData.value.email = data.tenant.contact_email || data.tenant.email
    }
    if (data.tenant?.contact_phone || data.tenant?.phone) {
      formData.value.phone = data.tenant.contact_phone || data.tenant.phone
    }
    if (data.tenant?.address) formData.value.address = data.tenant.address

    const restoreChannels = (raw: any) => {
      if (!raw || typeof raw !== 'object') return
      formData.value.contact_channels = {
        phone: raw.phone !== false,
        email: raw.email !== false,
        whatsapp: raw.whatsapp !== false,
        form: raw.form !== false,
      }
    }
    if (draft.contact_channels) restoreChannels(draft.contact_channels)
    else if (data.contact_channels) restoreChannels(data.contact_channels)

    if (data.branding?.logo_url) formData.value.logo_url = data.branding.logo_url
    if (data.branding?.hero_image_url) formData.value.hero_image_url = data.branding.hero_image_url

    // Default: own if hero already set, else stock for fastest magic
    if (formData.value.hero_image_url) {
      heroImageSource.value = 'own'
      formData.value.hero_image_source = 'own'
    } else {
      heroImageSource.value = 'stock'
      formData.value.hero_image_source = 'stock'
      // Prefetch stock suggestions so magic feels instant
      loadHeroSuggestions().catch(() => null)
    }

    formData.value.specializations = specializationOptions.value.slice(0, 6)

    if (data.suggestions?.seo_title) formData.value.seo_title = data.suggestions.seo_title
    if (data.suggestions?.seo_description) formData.value.seo_description = data.suggestions.seo_description
    if (data.suggestions?.seo_keywords) formData.value.seo_keywords = data.suggestions.seo_keywords
    if (data.suggestions?.formal_address === 'du' || data.suggestions?.formal_address === 'sie') {
      formData.value.formal_address = data.suggestions.formal_address
    }
    if (typeof draft.seo_title === 'string' && draft.seo_title.trim()) {
      formData.value.seo_title = draft.seo_title
    }
    if (typeof draft.seo_description === 'string' && draft.seo_description.trim()) {
      formData.value.seo_description = draft.seo_description
    }
    if (typeof draft.seo_keywords === 'string' && draft.seo_keywords.trim()) {
      formData.value.seo_keywords = draft.seo_keywords
    }
    if (draft.formal_address === 'du' || draft.formal_address === 'sie') {
      formData.value.formal_address = draft.formal_address
    }

    // Local backup (refresh without waiting on server draft)
    try {
      const key = `website-wizard-draft:${data.tenant?.id || 'pending'}`
      const raw = localStorage.getItem(key)
      if (raw) {
        const local = JSON.parse(raw)
        if (local?.serviceDescriptions && typeof local.serviceDescriptions === 'object') {
          serviceDescriptions.value = {
            ...serviceDescriptions.value,
            ...local.serviceDescriptions,
          }
        }
        for (const f of ['bio', 'seo_title', 'seo_description', 'seo_keywords'] as const) {
          if (typeof local?.[f] === 'string' && local[f].trim()) {
            formData.value[f] = local[f]
          }
        }
      }
    } catch {
      /* ignore */
    }

    await loadCustomDomain()
  } catch (error: any) {
    console.error('Failed to load website init data', error)
    alert('Daten konnten nicht geladen werden: ' + (error?.data?.statusMessage || error.message))
  }
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}

/* Prevent iOS zoom on focus; keep comfortable tap targets */
.wz-input {
  font-size: 16px;
}

.wz-setup {
  -webkit-tap-highlight-color: transparent;
}

.wz-stepper-bar {
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.wz-tenant-strip {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.wz-nav-bar {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}

@keyframes wz-spin {
  to {
    transform: rotate(360deg);
  }
}

.wz-spin {
  display: inline-block;
  animation: wz-spin 0.7s linear infinite;
}

.wz-swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.wz-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0;
}

.wz-step {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.wz-step-line {
  position: absolute;
  top: 11px;
  left: calc(50% + 12px);
  right: calc(-50% + 12px);
  height: 2px;
  background: #e5e7eb;
  border-radius: 999px;
  z-index: 0;
  transition: background-color 0.35s ease;
}

.wz-step-btn {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  width: 100%;
  max-width: 3.25rem;
  margin: 0 auto;
  padding: 0.15rem 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  min-height: 44px;
  justify-content: flex-start;
}

.wz-step-btn:disabled {
  cursor: default;
}

.wz-step-btn:not(:disabled):hover .wz-step-dot {
  transform: translateY(-1px);
}

.wz-step-dot {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: #e5e7eb;
  color: #6b7280;
  transition:
    transform 0.2s ease,
    background-color 0.25s ease,
    color 0.25s ease,
    box-shadow 0.25s ease;
}

.wz-step--active .wz-step-dot {
  color: #fff;
  transform: scale(1.04);
}

.wz-step--done .wz-step-dot {
  color: #fff;
}

.wz-step--todo .wz-step-dot {
  background: #f3f4f6;
  color: #9ca3af;
  box-shadow: inset 0 0 0 1px #e5e7eb;
}

.wz-step-check {
  width: 0.75rem;
  height: 0.75rem;
}

.wz-step-label {
  display: none;
  font-size: 0.62rem;
  line-height: 1.1;
  font-weight: 500;
  color: #9ca3af;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: color 0.2s ease;
}

.wz-step--active .wz-step-label {
  color: #111827;
  font-weight: 700;
}

.wz-step--done .wz-step-label {
  color: #4b5563;
}

@media (min-width: 480px) {
  .wz-step-label {
    display: block;
  }

  .wz-step-btn {
    max-width: 4.5rem;
  }
}

@media (min-width: 640px) {
  .wz-input {
    font-size: 0.875rem;
  }

  .wz-step-dot {
    width: 1.625rem;
    height: 1.625rem;
    font-size: 0.7rem;
  }

  .wz-step-label {
    font-size: 0.68rem;
  }

  .wz-step-btn {
    max-width: 5.25rem;
  }

  .wz-step-line {
    top: 12px;
    left: calc(50% + 15px);
    right: calc(-50% + 15px);
  }
}
</style>
