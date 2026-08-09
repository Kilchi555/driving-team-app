<template>
  <div class="min-h-screen" :style="{ background: `linear-gradient(to bottom right, ${primaryColor}10, ${accentColor || primaryColor}1f)` }">
    <!-- Step Indicator -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div v-for="(step, idx) in steps" :key="idx" class="flex-1">
            <div
              :class="[
                'h-10 w-10 rounded-full flex items-center justify-center font-bold transition-all',
                currentStep > idx
                  ? 'bg-green-500 text-white'
                  : currentStep === idx
                    ? 'text-white'
                    : 'bg-gray-200 text-gray-600'
              ]"
              :style="currentStep === idx ? { background: primaryColor } : {}"
            >
              {{ idx + 1 }}
            </div>
            <p class="text-xs mt-2 text-center font-medium">{{ step.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="h-1 bg-gray-200">
      <div
        class="h-full transition-all duration-300"
        :style="{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: primaryColor }"
      />
    </div>

    <!-- Tenant Info Dashboard (full width, collapsible) -->
    <div class="bg-white border-b border-gray-200">
      <div class="w-full px-8 py-6 lg:px-16">
        <!-- Summary Header (always visible) -->
        <div class="pb-6 border-b border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Company Name -->
            <div class="md:col-span-1">
              <p class="text-3xl font-bold" :style="{ color: primaryColor }">{{ tenantInfo?.name || '-' }}</p>
            </div>
            <!-- Contact Info & Domain -->
            <div class="md:col-span-2">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p class="text-xs text-gray-500">Email</p>
                  <p class="font-semibold text-xs break-all">{{ tenantInfo?.contact_email || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Telefon</p>
                  <p class="font-semibold">{{ tenantInfo?.contact_phone || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Adresse</p>
                  <p class="font-semibold text-xs">{{ tenantInfo?.address || '-' }}</p>
                </div>
                <div v-if="tenantInfo?.domain">
                  <p class="text-xs text-gray-500">Domain</p>
                  <p class="font-semibold text-xs break-all">{{ tenantInfo.domain }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Branding Colors (2nd row, smaller) -->
          <div class="mt-3 pt-3 border-t border-gray-200">
            <div class="grid grid-cols-4 md:grid-cols-6 gap-2">
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-lg border-2 border-gray-200 mb-1" :style="{ backgroundColor: tenantInfo?.primary_color }"></div>
                <p class="text-xs text-gray-600 text-center">Primary</p>
                <p class="text-xs font-mono text-gray-500">{{ tenantInfo?.primary_color }}</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-lg border-2 border-gray-200 mb-1" :style="{ backgroundColor: tenantInfo?.secondary_color }"></div>
                <p class="text-xs text-gray-600 text-center">Secondary</p>
                <p class="text-xs font-mono text-gray-500">{{ tenantInfo?.secondary_color }}</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-lg border-2 border-gray-200 mb-1" :style="{ backgroundColor: tenantInfo?.accent_color }"></div>
                <p class="text-xs text-gray-600 text-center">Accent</p>
                <p class="text-xs font-mono text-gray-500">{{ tenantInfo?.accent_color }}</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-lg border-2 border-gray-200 mb-1" :style="{ backgroundColor: tenantInfo?.success_color }"></div>
                <p class="text-xs text-gray-600 text-center">Success</p>
                <p class="text-xs font-mono text-gray-500">{{ tenantInfo?.success_color }}</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-lg border-2 border-gray-200 mb-1" :style="{ backgroundColor: tenantInfo?.error_color }"></div>
                <p class="text-xs text-gray-600 text-center">Error</p>
                <p class="text-xs font-mono text-gray-500">{{ tenantInfo?.error_color }}</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-8 h-8 rounded-lg border-2 border-gray-200 mb-1" :style="{ backgroundColor: tenantInfo?.info_color }"></div>
                <p class="text-xs text-gray-600 text-center">Info</p>
                <p class="text-xs font-mono text-gray-500">{{ tenantInfo?.info_color }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step Content (max width container for form content) -->
    <div class="max-w-2xl mx-auto px-4 py-8 pb-24">
      <!-- Step 1: Who Are You? -->
      <div v-if="currentStep === 0" class="space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-4xl font-bold mb-2">👋 Willkommen!</h1>
          <p class="text-gray-600">
            Lass uns deine Website-Profil erstellen. Das dauert nur 5 Minuten!
          </p>
        </div>

        <div class="bg-white rounded-lg p-8 space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">Dein Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
              placeholder="z.B. Pascal Kilchenmann"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2"
              >Kurze Bio (2-3 Sätze) *</label
            >
              <textarea
                v-model="formData.bio"
                class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 h-24 focus:ring-2 focus:border-transparent"
                :placeholder="`Kurzbeschreibung deiner ${terms.businessNoun}…`"
              />
            <AIOptimizationSuggestion
              :original="formData.bio"
              content-type="bio"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="formData.bio = $event"
            />
          </div>

          <div class="space-y-4">
            <label class="block text-sm font-semibold">Logo & Hero-Bild</label>
            <p class="text-sm text-gray-600 -mt-2">
              Logo erscheint in der Navigation. Das Hero-Bild füllt den ersten Bildschirm deiner Landingpage.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="border border-gray-200 rounded-lg p-4 space-y-3">
                <p class="text-sm font-medium">Logo (quadratisch)</p>
                <div class="h-28 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    v-if="formData.logo_url"
                    :src="formData.logo_url"
                    alt="Logo"
                    class="max-h-24 max-w-full object-contain"
                  />
                  <span v-else class="text-xs text-gray-400">Noch kein Logo</span>
                </div>
                <label class="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                  {{ uploadingLogo ? 'Lädt…' : 'Logo hochladen' }}
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    :disabled="uploadingLogo || uploadingHero"
                    @change="handleAssetUpload($event, 'logo')"
                  />
                </label>
              </div>
              <div class="border border-gray-200 rounded-lg p-4 space-y-3">
                <p class="text-sm font-medium">Hero-Bild (16:9)</p>
                <div class="h-28 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    v-if="formData.hero_image_url"
                    :src="formData.hero_image_url"
                    alt="Hero"
                    class="h-full w-full object-cover"
                  />
                  <span v-else class="text-xs text-gray-400">Noch kein Hero</span>
                </div>
                <label class="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
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

          <div class="rounded-lg p-4 border" :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
            <p class="text-sm">
              ✅ Diese Infos stammen aus deiner Simy-App und werden automatisch synchronisiert
            </p>
          </div>
        </div>
      </div>

      <!-- Step 2: Your Services -->
      <div v-if="currentStep === 1" class="space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-4xl font-bold mb-2">🎓 Deine Dienstleistungen</h1>
          <p class="text-gray-600">
            Preise werden automatisch von der App synchronisiert
          </p>
        </div>

        <div class="bg-white rounded-lg p-8">
          <div v-if="appServices.length > 0" class="space-y-4">
            <div v-for="service in appServices" :key="service.id" class="border border-gray-200 rounded-lg p-4">
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h3 class="font-semibold">{{ service.name || service.category }}</h3>
                  <p class="text-sm text-gray-600">
                    {{ service.duration_minutes }} Min
                  </p>
                </div>
                <span class="text-lg font-bold" :style="{ color: primaryColor }"
                  >CHF {{ (service.price / 100).toFixed(0) }}</span
                >
              </div>
              <textarea
                v-model="serviceDescriptions[service.id]"
                :placeholder="`Beschreibe diese ${terms.appointment}…`"
                class="tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 focus:ring-2 focus:border-transparent"
              />
              <AIOptimizationSuggestion
                :original="serviceDescriptions[service.id]"
                content-type="service_description"
                optimization-type="conversion"
                :formal-address="formData.formal_address"
                @apply="serviceDescriptions[service.id] = $event"
              />
            </div>
          </div>
          <div v-else class="text-center py-8">
            <p class="text-gray-600">
              Keine Services gefunden. Bitte füge Services in deiner App hinzu.
            </p>
          </div>
        </div>
      </div>

      <!-- Step 3: Testimonials & Success -->
      <div v-if="currentStep === 2" class="space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-4xl font-bold mb-2">⭐ Deine Erfolgsgeschichte</h1>
          <p class="text-gray-600">
            Google-Bewertungen werden live auf der Website geladen (über deine hinterlegten Google-Standorte).
            App-Bewertungen dienen als Fallback.
          </p>
        </div>

        <div class="bg-white rounded-lg p-8 space-y-6">
          <div class="rounded-lg p-4 border" :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
            <p v-if="googleReviewsMeta.enabled" class="text-sm">
              ✅ Google Reviews aktiv für
              {{ googleReviewsMeta.places.map((p: any) => p.name || p.place_id).filter(Boolean).join(', ') || 'deine Standorte' }}.
              Die Landingpage lädt sie live (Cache 6h).
            </p>
            <p v-else class="text-sm">
              ℹ️ Noch keine Google Place IDs hinterlegt — es werden App-Bewertungen als Fallback genutzt.
              Place IDs kannst du unter den Google-Review-Standorten des Tenants pflegen.
            </p>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">
              Erfolgsquote (Auto-kalkuliert)
            </label>
            <div class="text-4xl font-bold text-green-600">{{ displayRating }}</div>
            <p class="text-sm text-gray-600">
              {{ stats?.total_testimonials || topTestimonials.length }} Bewertungen · {{ stats?.total_appointments || 0 }} Termine
            </p>
          </div>

          <div>
            <label class="block text-sm font-semibold mb-3">
              Top Bewertungen
            </label>
            <div class="space-y-3">
              <div
                v-for="testimonial in topTestimonials"
                :key="testimonial.id"
                class="border border-yellow-200 rounded-lg p-4 bg-yellow-50"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex text-yellow-400">
                    <span v-for="i in 5" :key="i">⭐</span>
                  </div>
                  <span class="font-semibold text-sm">{{
                    testimonial.author || testimonial.student_name
                  }}</span>
                </div>
                <p class="text-sm text-gray-700">{{ testimonial.text || testimonial.rating_text }}</p>
                <label class="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    :checked="selectedTestimonials.includes(testimonial.id)"
                    @change="toggleTestimonial(testimonial.id)"
                    class="w-4 h-4"
                    :style="{ accentColor: primaryColor }"
                  />
                  <span class="ml-2 text-sm">Auf Website anzeigen</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Contact & Booking -->
      <div v-if="currentStep === 3" class="space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-4xl font-bold mb-2">📍 Kontakt & Buchung</h1>
          <p class="text-gray-600">
            Deine Kontaktdaten werden automatisch von der App pulled
          </p>
        </div>

        <div class="bg-white rounded-lg p-8 space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">Adresse</label>
            <input
              v-model="formData.address"
              type="text"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
              placeholder="z.B. Bahnhofstrasse 123, 8000 Zürich"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Telefon</label>
            <input
              v-model="formData.phone"
              type="tel"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Email</label>
            <input
              v-model="formData.email"
              type="email"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
            />
          </div>

          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-sm font-semibold mb-2">✅ Buchungs-Link:</p>
            <code class="text-xs bg-white px-2 py-1 rounded font-mono">{{
              bookingLink
            }}</code>
            <p class="text-xs text-gray-600 mt-2">
              Deine Kunden können direkt über deine Website buchen!
            </p>
          </div>

          <div class="border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-1">Eigene Domain (optional)</label>
              <p class="text-sm text-gray-600 mb-3">
                Verbinde z.B. www.meine-firma.ch mit dieser Landingpage. Die Domain bleibt bei deinem Registrar — du setzt nur einen DNS-Eintrag.
              </p>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  v-model="customDomainInput"
                  type="text"
                  class="tenant-focus flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
                  placeholder="www.meine-firma.ch"
                  :disabled="customDomainBusy"
                />
                <button
                  type="button"
                  class="px-4 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
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
              <div v-if="customDomain.dns" class="bg-gray-50 rounded-lg p-3 font-mono text-xs space-y-1">
                <p class="font-sans font-semibold text-gray-700 mb-1">DNS setzen:</p>
                <p>Typ: {{ customDomain.dns.type }}</p>
                <p>Host: {{ customDomain.dns.host }}</p>
                <p>Wert: {{ customDomain.dns.value }}</p>
                <p class="font-sans text-gray-600 mt-2">{{ customDomain.dns.note }}</p>
                <template v-if="customDomain.dns.alt">
                  <p class="font-sans font-semibold text-gray-700 mt-3 mb-1">Optional zusätzlich:</p>
                  <p>Typ: {{ customDomain.dns.alt.type }} · Host: {{ customDomain.dns.alt.host }} · Wert: {{ customDomain.dns.alt.value }}</p>
                </template>
              </div>
              <div v-if="vercelChallenges.length" class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                <p class="font-semibold text-amber-900">Zusätzliche Verifikation (von Vercel):</p>
                <div v-for="(v, i) in vercelChallenges" :key="i">
                  {{ v.type }} · {{ v.domain }} · {{ v.value }}
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  :disabled="customDomainBusy"
                  @click="verifyCustomDomain"
                >
                  DNS prüfen
                </button>
                <button
                  type="button"
                  class="px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
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
                  class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Öffnen
                </a>
              </div>
              <p v-if="customDomainMessage" class="text-xs text-gray-600">{{ customDomainMessage }}</p>
              <p v-if="!customDomain.vercel_api_configured" class="text-xs text-amber-700">
                Hinweis: Vercel-API-Token noch nicht gesetzt — Domain ggf. manuell im Vercel-Projekt hinzufügen, DNS reicht dann zur Aktivierung.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5: SEO Settings -->
      <div v-if="currentStep === 4" class="space-y-6 animate-in fade-in">
        <div>
          <h1 class="text-4xl font-bold mb-2">🔍 SEO Einstellungen</h1>
          <p class="text-gray-600">
            Damit deine Website in Google gut rankt
          </p>
        </div>

        <div class="bg-white rounded-lg p-8 space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">
              Website-Titel (für Google) *
            </label>
            <input
              v-model="formData.seo_title"
              type="text"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
              :placeholder="`z.B. ${terms.businessNoun} Pascal | ${terms.appointmentsPlural} in Zürich`"
              maxlength="60"
            />
            <div class="text-xs text-gray-600 mt-1">
              {{ formData.seo_title?.length || 0 }}/60 Zeichen
            </div>
            <AIOptimizationSuggestion
              :original="formData.seo_title"
              content-type="seo_title"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="formData.seo_title = $event"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">
              Meta-Beschreibung (für Google) *
            </label>
            <textarea
              v-model="formData.seo_description"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 h-20 focus:ring-2 focus:border-transparent"
              placeholder="z.B. Moderne Fahrausbildung mit hoher Erfolgsquote..."
              maxlength="160"
            />
            <div class="text-xs text-gray-600 mt-1">
              {{ formData.seo_description?.length || 0 }}/160 Zeichen
            </div>
            <AIOptimizationSuggestion
              :original="formData.seo_description"
              content-type="seo_description"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="formData.seo_description = $event"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">
              Keywords (Komma-separiert)
            </label>
            <input
              v-model="formData.seo_keywords"
              type="text"
              class="tenant-focus w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:border-transparent"
              :placeholder="`z.B. ${terms.staff}, ${terms.businessNoun}, ${terms.appointment}`"
            />
            <AIOptimizationSuggestion
              :original="formData.seo_keywords"
              content-type="keywords"
              optimization-type="seo"
              :formal-address="formData.formal_address"
              @apply="formData.seo_keywords = $event"
            />
          </div>

          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-sm">
              📊 <strong>SEO Score: 85/100</strong> - Sehr gut!
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4"
    >
      <div class="max-w-2xl mx-auto flex justify-between items-center">
        <button
          v-if="currentStep > 0"
          @click="currentStep--"
          class="px-6 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
        >
          ← Zurück
        </button>
        <div v-else />

        <div class="flex gap-3">
          <button
            v-if="currentStep < steps.length - 1"
            @click="currentStep++"
            class="px-8 py-2 text-white font-medium rounded-lg hover:opacity-90 transition"
            :style="{ background: primaryColor }"
          >
            Weiter →
          </button>
          <template v-else>
            <button
              @click="saveWebsite(false)"
              :disabled="savingLoading"
              class="px-6 py-2 border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {{ savingLoading ? '…' : 'Als Entwurf' }}
            </button>
            <button
              @click="saveWebsite(true)"
              :disabled="savingLoading"
              class="px-8 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition"
            >
              {{ savingLoading ? '⏳ Speichern...' : 'Veröffentlichen' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { getTerminologyDefaults } from '~/composables/useTerminology'
import { compressImage, validateImageFile } from '~/utils/imageCompression'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { primaryColor, accentColor } = useTenantBranding()

const currentStep = ref(0)
const savingLoading = ref(false)
const uploadingLogo = ref(false)
const uploadingHero = ref(false)
const resultUrl = ref('')

const steps = [
  { label: 'Wer bist du?' },
  { label: 'Services' },
  { label: 'Erfolg' },
  { label: 'Kontakt' },
  { label: 'SEO' }
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
  seo_title: '',
  seo_description: '',
  seo_keywords: ''
})

const appServices = ref<any[]>([])
const serviceDescriptions = ref<Record<string, string>>({})
const topTestimonials = ref<any[]>([])
const selectedTestimonials = ref<string[]>([])
const tenantInfo = ref<any>(null)
const staffList = ref<any[]>([])
const categories = ref<any[]>([])
const stats = ref<any>(null)
const googleReviewsMeta = ref<{ enabled: boolean; places: any[] }>({ enabled: false, places: [] })
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
    else formData.value.hero_image_url = url
  } catch (error: any) {
    alert(error?.data?.statusMessage || error?.message || 'Upload fehlgeschlagen')
  } finally {
    loadingRef.value = false
    if (input) input.value = ''
  }
}

const saveWebsite = async (publish = true) => {
  savingLoading.value = true
  try {
    // Ensure website row exists
    await $fetch('/api/website/init', { method: 'POST' }).catch(() => null)

    const result = await $fetch<any>('/api/website/wizard-save', {
      method: 'POST',
      body: {
        ...formData.value,
        serviceDescriptions: serviceDescriptions.value,
        selectedTestimonials: selectedTestimonials.value,
        services: appServices.value,
        testimonials: topTestimonials.value,
        stats: stats.value,
        publish,
      },
    })

    resultUrl.value = result?.preview_url || result?.live_url || ''
    if (publish) {
      await navigateTo('/admin/website/editor')
    } else if (result?.preview_url) {
      await navigateTo(result.preview_url)
    } else if (resultUrl.value) {
      await navigateTo(resultUrl.value)
    } else {
      alert(publish ? 'Website veröffentlicht.' : 'Entwurf gespeichert.')
    }
  } catch (error: any) {
    alert('Fehler beim Speichern: ' + (error?.data?.statusMessage || error.message))
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

    if (data.tenant?.name) formData.value.name = data.tenant.name
    if (data.suggestions?.bio) formData.value.bio = data.suggestions.bio

    if (data.tenant?.contact_email || data.tenant?.email) {
      formData.value.email = data.tenant.contact_email || data.tenant.email
    }
    if (data.tenant?.contact_phone || data.tenant?.phone) {
      formData.value.phone = data.tenant.contact_phone || data.tenant.phone
    }
    if (data.tenant?.address) formData.value.address = data.tenant.address

    if (data.branding?.logo_url) formData.value.logo_url = data.branding.logo_url
    if (data.branding?.hero_image_url) formData.value.hero_image_url = data.branding.hero_image_url

    formData.value.specializations = specializationOptions.value.slice(0, 6)
    selectedTestimonials.value = topTestimonials.value.slice(0, 3).map((t: any) => t.id)

    if (data.suggestions?.seo_title) formData.value.seo_title = data.suggestions.seo_title
    if (data.suggestions?.seo_description) formData.value.seo_description = data.suggestions.seo_description
    if (data.suggestions?.seo_keywords) formData.value.seo_keywords = data.suggestions.seo_keywords
    if (data.suggestions?.formal_address === 'du' || data.suggestions?.formal_address === 'sie') {
      formData.value.formal_address = data.suggestions.formal_address
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
</style>
