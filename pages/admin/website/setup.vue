<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
              ]"
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
        class="h-full bg-blue-500 transition-all duration-300"
        :style="{ width: `${((currentStep + 1) / steps.length) * 100}%` }"
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
              <p class="text-xs text-gray-500 uppercase mb-2">Unternehmen</p>
              <p class="text-3xl font-bold text-blue-600">{{ tenantInfo?.name || '-' }}</p>
            </div>
            <!-- Contact Info -->
            <div class="md:col-span-2">
              <p class="text-xs text-gray-500 uppercase mb-3">📞 Kontakt</p>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p class="text-xs text-gray-500">Email</p>
                  <p class="font-semibold text-xs break-all">{{ tenantInfo?.contact_email || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Telefon</p>
                  <p class="font-semibold">{{ tenantInfo?.contact_phone || '-' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Ort / PLZ</p>
                  <p class="font-semibold">{{ tenantInfo?.city || '-' }} {{ tenantInfo?.postal_code || '' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Expandable Sections -->
        <div class="divide-y divide-gray-200">
          <!-- System Settings Section -->
          <div>
            <button @click="expandedSections.system = !expandedSections.system" class="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition">
              <div class="flex items-center gap-2">
                <span class="text-lg">⚙️</span>
                <h3 class="font-semibold text-gray-700">System</h3>
              </div>
              <span class="text-gray-500 transition" :class="expandedSections.system ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-if="expandedSections.system" class="p-4 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p class="text-xs text-gray-500">Zeitzone</p>
                <p class="font-semibold">{{ tenantInfo?.timezone || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Sprache</p>
                <p class="font-semibold uppercase">{{ tenantInfo?.language || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Währung</p>
                <p class="font-semibold">{{ tenantInfo?.currency || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Status</p>
                <p class="font-semibold">
                  <span v-if="tenantInfo?.is_active" class="text-green-600">✓ Aktiv</span>
                  <span v-else class="text-red-600">✗ Inaktiv</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Branding Section -->
          <div>
            <button @click="expandedSections.branding = !expandedSections.branding" class="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition">
              <div class="flex items-center gap-2">
                <span class="text-lg">🎨</span>
                <h3 class="font-semibold text-gray-700">Branding</h3>
              </div>
              <span class="text-gray-500 transition" :class="expandedSections.branding ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-if="expandedSections.branding" class="p-4 bg-gray-50">
              <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
                <div class="flex flex-col items-center">
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-200 mb-2" :style="{ backgroundColor: tenantInfo?.primary_color }"></div>
                  <p class="text-xs text-gray-600 text-center">Primary</p>
                  <p class="text-xs font-mono">{{ tenantInfo?.primary_color }}</p>
                </div>
                <div class="flex flex-col items-center">
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-200 mb-2" :style="{ backgroundColor: tenantInfo?.secondary_color }"></div>
                  <p class="text-xs text-gray-600 text-center">Secondary</p>
                  <p class="text-xs font-mono">{{ tenantInfo?.secondary_color }}</p>
                </div>
                <div class="flex flex-col items-center">
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-200 mb-2" :style="{ backgroundColor: tenantInfo?.accent_color }"></div>
                  <p class="text-xs text-gray-600 text-center">Accent</p>
                  <p class="text-xs font-mono">{{ tenantInfo?.accent_color }}</p>
                </div>
                <div class="flex flex-col items-center">
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-200 mb-2" :style="{ backgroundColor: tenantInfo?.success_color }"></div>
                  <p class="text-xs text-gray-600 text-center">Success</p>
                  <p class="text-xs font-mono">{{ tenantInfo?.success_color }}</p>
                </div>
                <div class="flex flex-col items-center">
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-200 mb-2" :style="{ backgroundColor: tenantInfo?.error_color }"></div>
                  <p class="text-xs text-gray-600 text-center">Error</p>
                  <p class="text-xs font-mono">{{ tenantInfo?.error_color }}</p>
                </div>
                <div class="flex flex-col items-center">
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-200 mb-2" :style="{ backgroundColor: tenantInfo?.info_color }"></div>
                  <p class="text-xs text-gray-600 text-center">Info</p>
                  <p class="text-xs font-mono">{{ tenantInfo?.info_color }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Categories & Pricing Section -->
          <div>
            <button @click="expandedSections.pricing = !expandedSections.pricing" class="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition">
              <div class="flex items-center gap-2">
                <span class="text-lg">💰</span>
                <h3 class="font-semibold text-gray-700">Kategorien & Preise</h3>
              </div>
              <span class="text-gray-500 transition" :class="expandedSections.pricing ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-if="expandedSections.pricing" class="p-4 bg-gray-50 space-y-3">
              <div v-for="category in categories" :key="category.id" class="border border-gray-200 rounded-lg p-3 bg-white">
                <div class="font-semibold text-sm mb-2">{{ category.name }}</div>
                <div class="text-xs space-y-1">
                  <div v-if="category.parent" class="text-gray-600">👨 Parent: {{ category.parent }}</div>
                  <div class="text-gray-600">📝 Code: <span class="font-mono">{{ category.code }}</span></div>
                  
                  <!-- Show pricing for this category -->
                  <div v-if="getPricingForCategory(category.code).length > 0" class="mt-2 bg-gray-50 rounded p-2">
                    <div class="text-xs font-semibold mb-1">Preise:</div>
                    <div v-for="pricing in getPricingForCategory(category.code)" :key="pricing.id" class="text-xs flex justify-between">
                      <span>{{ pricing.duration_minutes }} min:</span>
                      <span class="font-semibold">CHF {{ (pricing.price / 100).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Social & Web Section -->
          <div v-if="hasSocialMedia">
            <button @click="expandedSections.social = !expandedSections.social" class="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition">
              <div class="flex items-center gap-2">
                <span class="text-lg">🌐</span>
                <h3 class="font-semibold text-gray-700">Social & Web</h3>
              </div>
              <span class="text-gray-500 transition" :class="expandedSections.social ? 'rotate-180' : ''">▼</span>
            </button>
            <div v-if="expandedSections.social" class="p-4 bg-gray-50 space-y-2 text-sm">
              <div v-if="tenantInfo?.website_url">
                <p class="text-xs text-gray-500">Website</p>
                <p class="font-semibold text-xs break-all">{{ tenantInfo.website_url }}</p>
              </div>
              <div v-if="tenantInfo?.domain">
                <p class="text-xs text-gray-500">Domain</p>
                <p class="font-semibold text-xs break-all">{{ tenantInfo.domain }}</p>
              </div>
              <div v-if="tenantInfo?.social_facebook" class="text-xs">Facebook: {{ tenantInfo.social_facebook }}</div>
              <div v-if="tenantInfo?.social_instagram" class="text-xs">Instagram: {{ tenantInfo.social_instagram }}</div>
              <div v-if="tenantInfo?.social_twitter" class="text-xs">Twitter: {{ tenantInfo.social_twitter }}</div>
              <div v-if="tenantInfo?.social_linkedin" class="text-xs">LinkedIn: {{ tenantInfo.social_linkedin }}</div>
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
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Pascal Kilchenmann"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2"
              >Kurze Bio (2-3 Sätze) *</label
            >
            <textarea
              v-model="formData.bio"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Erfahrener Fahrlehrer seit 15 Jahren mit Spezialisierung auf..."
            />
            <AIOptimizationSuggestion
              :original="formData.bio"
              content-type="bio"
              optimization-type="seo"
              @apply="formData.bio = $event"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-3"
              >Deine Spezialisierungen</label
            >
            <div class="space-y-2">
              <label v-for="spec in specializations" :key="spec" class="flex items-center">
                <input
                  :checked="formData.specializations?.includes(spec)"
                  @change="toggleSpecialization(spec)"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600"
                />
                <span class="ml-2 text-sm">{{ spec }}</span>
              </label>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm">
              ✅ Diese Infos stammen aus deiner Driving Team App und werden
              automatisch synchronisiert
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
                  <h3 class="font-semibold">{{ service.name }}</h3>
                  <p class="text-sm text-gray-600">
                    {{ service.duration_minutes }} Min
                  </p>
                </div>
                <span class="text-lg font-bold text-blue-600"
                  >€ {{ (service.price / 100).toFixed(2) }}</span
                >
              </div>
              <textarea
                v-model="serviceDescriptions[service.id]"
                placeholder="Beschreibe diese Fahrstunde..."
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <AIOptimizationSuggestion
                :original="serviceDescriptions[service.id]"
                content-type="service_description"
                optimization-type="conversion"
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
            Beste Bewertungen aus deiner App werden automatisch angezeigt
          </p>
        </div>

        <div class="bg-white rounded-lg p-8 space-y-6">
          <div>
            <label class="block text-sm font-semibold mb-2">
              Erfolgsquote (Auto-kalkuliert)
            </label>
            <div class="text-4xl font-bold text-green-600">{{ successRate }}%</div>
            <p class="text-sm text-gray-600">
              Basierend auf {{ totalStudents }} Schüler
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
                    testimonial.student_name
                  }}</span>
                </div>
                <p class="text-sm text-gray-700">{{ testimonial.rating_text }}</p>
                <label class="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    :checked="selectedTestimonials.includes(testimonial.id)"
                    @change="toggleTestimonial(testimonial.id)"
                    class="w-4 h-4 text-blue-600"
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
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Bahnhofstrasse 123, 8000 Zürich"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Telefon</label>
            <input
              v-model="formData.phone"
              type="tel"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">Email</label>
            <input
              v-model="formData.email"
              type="email"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Fahrschule Pascal | Fahrausbildung in Zürich"
              maxlength="60"
            />
            <div class="text-xs text-gray-600 mt-1">
              {{ formData.seo_title?.length || 0 }}/60 Zeichen
            </div>
            <AIOptimizationSuggestion
              :original="formData.seo_title"
              content-type="seo_title"
              optimization-type="seo"
              @apply="formData.seo_title = $event"
            />
          </div>

          <div>
            <label class="block text-sm font-semibold mb-2">
              Meta-Beschreibung (für Google) *
            </label>
            <textarea
              v-model="formData.seo_description"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. Fahrlehrer, Fahrschule, Führerschein"
            />
            <AIOptimizationSuggestion
              :original="formData.seo_keywords"
              content-type="keywords"
              optimization-type="seo"
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
            class="px-8 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
          >
            Weiter →
          </button>
          <button
            v-else
            @click="saveWebsite"
            :disabled="savingLoading"
            class="px-8 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition"
          >
            {{ savingLoading ? '⏳ Speichern...' : '✅ Fertig!' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AIOptimizationSuggestion from '~/components/website/AIOptimizationSuggestion.vue'

const currentStep = ref(0)
const savingLoading = ref(false)

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
  specializations: [],
  address: '',
  phone: '',
  email: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: ''
})

const specializations = [
  'Auto (Kategorie B)',
  'Motorrad (Kategorie A)',
  'Anhänger (BE)',
  'Lastwagen (C)',
  'Bus (D)',
  'Automatik'
]

const appServices = ref<any[]>([])
const serviceDescriptions = ref<Record<string, string>>({})
const topTestimonials = ref<any[]>([])
const selectedTestimonials = ref<string[]>([])
const tenantInfo = ref<any>(null)
const staffList = ref<any[]>([])
const categories = ref<any[]>([])
const stats = ref<any>(null)
const expandedSections = ref({
  company: false,
  contact: false,
  system: false,
  branding: false,
  pricing: false,
  social: false
})

const successRate = computed(() => 88) // TODO: Calculate from app data
const totalStudents = computed(() => 245)
const hasSocialMedia = computed(() => {
  return tenantInfo.value?.website_url || 
         tenantInfo.value?.domain || 
         tenantInfo.value?.social_facebook || 
         tenantInfo.value?.social_instagram || 
         tenantInfo.value?.social_twitter || 
         tenantInfo.value?.social_linkedin
})
const bookingLink = computed(() => {
  return `${window.location.origin}/book`
})

const getPricingForCategory = (categoryCode: string) => {
  return appServices.value.filter(s => s.category === categoryCode)
}

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

const saveWebsite = async () => {
  savingLoading.value = true
  try {
    await $fetch('/api/website/wizard-save', {
      method: 'POST',
      body: {
        ...formData.value,
        serviceDescriptions: serviceDescriptions.value,
        selectedTestimonials: selectedTestimonials.value
      }
    })

    navigateTo('/admin/website/dashboard')
  } catch (error: any) {
    alert('Fehler beim Speichern: ' + error.message)
  } finally {
    savingLoading.value = false
  }
}

onMounted(async () => {
  try {
    const response = await $fetch('/api/website/init-data')
    const data = response?.data || response

    // ✅ Load Tenant Info for display
    tenantInfo.value = data.tenant
    
    // ✅ Load Staff Members
    staffList.value = data.staff || []
    
    // ✅ Load Categories
    categories.value = data.categories || []
    
    // ✅ Load Statistics
    stats.value = data.stats

    // ✅ Load Services
    appServices.value = data.services || []
    
    // ✅ Load Testimonials
    topTestimonials.value = data.testimonials || []
    
    // ✅ Prefill Form Step 1 - Name & Bio from Tenant
    if (data.tenant?.name) {
      formData.value.name = data.tenant.name
    }
    if (data.suggestions?.bio) {
      formData.value.bio = data.suggestions.bio
    }

    // ✅ Prefill Contact Info
    if (data.tenant?.email) {
      formData.value.email = data.tenant.email
    }
    if (data.tenant?.phone) {
      formData.value.phone = data.tenant.phone
    }
    if (data.tenant?.address) {
      formData.value.address = data.tenant.address
    }

    // ✅ Auto-populate specializations from categories
    if (data.categories && data.categories.length > 0) {
      const categoryNames = data.categories.map((c: any) => c.name)
      formData.value.specializations = categoryNames.filter((name: string) =>
        specializations.some(spec => spec.includes(name))
      )
    }

    // ✅ Prefill SEO fields with suggestions
    if (data.suggestions?.headline) {
      formData.value.seo_title = data.suggestions.headline
    }
    if (data.tenant?.description) {
      formData.value.seo_description = data.tenant.description
    }

    // ✅ Pre-select best testimonials
    if (data.testimonials && data.testimonials.length > 0) {
      selectedTestimonials.value = data.testimonials.slice(0, 3).map((t: any) => t.id)
    }

    console.log('✅ Website setup data loaded successfully:', {
      tenant: tenantInfo.value?.name,
      staff: staffList.value.length,
      services: appServices.value.length,
      testimonials: topTestimonials.value.length,
      categories: categories.value.length,
      stats: stats.value
    })
  } catch (error) {
    console.error('❌ Failed to load website setup data:', error)
  }
})
</script>
