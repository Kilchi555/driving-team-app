<template>
  <div>
    <!-- Trigger Button -->
    <button
      @click="openCalculator"
      class="w-full md:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition duration-200 text-lg shadow-lg"
    >
      💰 Kostenrechner
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showModal" class="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-800 text-white p-4 flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold">{{ props.title }}</h2>
                <p class="text-white text-sm mt-1">{{ modalDescription }}</p>
              </div>
              <button
                @click="closeModal"
                class="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                ✕
              </button>
            </div>

            <!-- Content -->
            <div class="p-4 space-y-2">
              <!-- Step 1: Category Selection -->
              <div v-show="currentStep === 1" class="space-y-6 animate-fadeIn">
                <div>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      v-for="cat in categories"
                      :key="cat.id"
                      @click="selectedCategory = cat.id; nextStep()"
                      :class="[
                        'p-4 rounded-lg border-2 transition duration-200 text-center font-medium',
                        selectedCategory === cat.id
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-gray-50'
                      ]"
                    >
                      <div class="text-3xl mb-2">{{ cat.icon }}</div>
                      <div class="text-sm font-semibold mb-2">{{ cat.label.split(' ')[0] }}</div>
                      <div class="text-xs text-gray-500">{{ cat.description }}</div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 2: Lesson Count -->
              <div v-show="currentStep === 2" class="space-y-6 animate-fadeIn">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 mb-4">Wie viele Fahrstunden brauchst du?</h3>
                  <p class="text-gray-600 mb-6">
                    <span class="font-semibold">Durchschnitt:</span>
                    {{ lessonsTip }}
                  </p>
                  <div class="flex items-center justify-center gap-6 mb-8">
                    <button
                      @click="lessonsCount = Math.max(1, lessonsCount - 1)"
                      class="w-14 h-14 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold transition text-2xl"
                    >
                      −
                    </button>
                    <input
                      v-model.number="lessonsCount"
                      type="number"
                      min="1"
                      max="200"
                      class="w-24 px-4 py-4 text-center text-3xl font-bold border-2 border-primary-300 rounded-lg focus:outline-none focus:border-primary-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      @click="lessonsCount = Math.min(200, lessonsCount + 1)"
                      class="w-14 h-14 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold transition text-2xl"
                    >
                      +
                    </button>
                  </div>
                  <p class="text-center text-sm text-gray-500">{{ lessonsCount }} Fahrstunden</p>
                </div>
              </div>

              <!-- Step 3: Email -->
              <div v-show="currentStep === 3" class="space-y-2 animate-fadeIn">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 mb-1">Deine Kostenschätzung</h3>
                  <p class="text-gray-500 text-sm mb-6">Kategorie: <span class="font-semibold text-gray-700">{{ currentCategory?.label }}</span></p>

                  <!-- Kostenaufschlüsselung -->
                  <div class="rounded-xl border-2 border-gray-200 overflow-hidden mb-5">
                    <!-- Fahrstunden -->
                    <div class="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                      <div>
                        <p class="font-medium text-sm text-gray-900">{{ lessonsCount }} Fahrstunden</p>
                        <p class="text-xs text-gray-500">CHF {{ currentLessonPrice }}.– pro Lektion</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ (lessonsCount * currentLessonPrice).toFixed(0) }}.–</span>
                    </div>

                    <!-- Admin/Versicherungspauschale -->
                    <div v-if="currentCategory?.insuranceOrAdminFee" class="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                      <div>
                        <p class="font-medium text-sm text-gray-900">{{ currentCategory.insuranceOrAdminLabel }}</p>
                        <p class="text-xs text-gray-500">Einmalig für die ganze Ausbildung</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ currentCategory.insuranceOrAdminFee }}.–</span>
                    </div>

                    <!-- WarmUp -->
                    <div v-if="showWarmup && currentCategory?.warmupFee" class="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                      <div>
                        <p class="font-medium text-sm text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                        <p class="text-xs text-gray-500">Kosten der Fahrschule</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ currentCategory.warmupFee }}.–</span>
                    </div>

                    <!-- Externe Kosten immer sichtbar -->
                    <div v-if="currentCategory?.externalCosts" class="bg-blue-50 border-b border-gray-100">
                      <div class="flex justify-between items-center px-4 py-3 border-b border-blue-100">
                        <p class="font-semibold text-sm text-gray-900">Strassenverkehrsamt & weitere Kosten</p>
                        <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ externalCostsTotal }}.–</span>
                      </div>
                      <div class="px-4 py-2 space-y-1.5">
                        <div v-for="fee in svaFees" :key="fee.label" class="flex justify-between items-center text-xs py-1">
                          <span class="text-gray-600">{{ fee.label }}</span>
                          <span class="font-semibold text-gray-800 whitespace-nowrap">CHF {{ fee.amount }}.–</span>
                        </div>
                      </div>
                      <p class="text-xs text-gray-500 py-2 px-4">* nicht für Inhaber:innen von anderen Kategorien</p>
                    </div>

                    <!-- Total -->
                    <div class="flex justify-between items-center px-4 py-4 bg-primary-600">
                      <span class="font-bold text-white text-base">Geschätzte Gesamtkosten</span>
                      <span class="text-2xl font-bold text-white whitespace-nowrap">CHF {{ totalCost }}.–</span>
                    </div>
                  </div>

                  <!-- Disclaimer -->
                  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5">
                    <p class="text-xs text-gray-700">
                      <span class="font-semibold">⚠️ Unverbindliche Preise:</span> Diese Kalkulation dient nur zur Orientierung. Die tatsächlichen Kosten können je nach individuellen Umständen variieren.
                    </p>
                  </div>

                  <!-- Email Input -->
                  <div class="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-2">
                    <p class="text-sm font-semibold text-primary-900 mb-1">📬 Kalkulation per E-Mail erhalten</p>
                    <ul class="text-xs text-primary-700 space-y-0.5 mb-3">
                      <li>✓ Zum Nachschlagen und Vergleichen gespeichert</li>
                      <li>✓ Kein Spam – wir melden uns nur wenn du es willst</li>
                    </ul>
                    <div class="flex gap-2 mb-1">
                      <input
                        v-model="firstNameInput"
                        type="text"
                        placeholder="Vorname"
                        autocomplete="given-name"
                        class="w-1/3 px-3 py-2.5 rounded-lg border-2 border-primary-200 focus:border-primary-600 focus:outline-none bg-white text-sm"
                      />
                      <input
                        v-model="emailInput"
                        type="email"
                        placeholder="deine@email.com"
                        autocomplete="email"
                        class="flex-1 px-3 py-2.5 rounded-lg border-2 border-primary-200 focus:border-primary-600 focus:outline-none bg-white text-sm"
                      />
                    </div>
                    <p class="text-xs text-primary-600/70">Keine E-Mail? Einfach auf „Schliessen" klicken.</p>
                    <!-- Newsletter opt-in -->
                    <label class="flex items-start gap-2 mt-3 cursor-pointer">
                      <input
                        v-model="newsletterOptIn"
                        type="checkbox"
                        class="mt-0.5 w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0"
                      />
                      <span class="text-xs text-primary-800">Ich will über Neuerungen und Aktionen informiert werden</span>
                    </label>
                  </div>

                  <!-- Error Message -->
                  <div
                    v-if="emailSendError"
                    class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
                  >
                    ❌ {{ emailSendError }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer with Actions -->
            <div class="sticky bottom-0 bg-gray-100 border-t-2 border-gray-200 p-4 flex gap-3">
              <button
                @click="previousStep"
                v-if="currentStep > 1"
                class="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold rounded-lg transition"
              >
                ← Zurück
              </button>
              <button
                v-if="currentStep === totalSteps && (!emailInput || !isValidEmail)"
                @click="closeModal"
                class="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold rounded-lg transition text-sm"
              >
                Schliessen
              </button>
              <button
                v-if="currentStep < totalSteps"
                @click="nextStep"
                :disabled="!canProceed"
                class="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition"
              >
                Weiter →
              </button>
              <button
                v-if="currentStep === totalSteps && emailInput && isValidEmail"
                @click="sendCalculationEmail"
                :disabled="isSending"
                class="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition"
              >
                {{ isSending ? 'Wird gesendet...' : '📧 Kalkulation erhalten' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Success Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="emailSendSuccess"
          class="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          @click.self="closeSuccessModal"
        >
          <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center space-y-5 animate-scale-in">
            <div class="mx-auto w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl">
              ✓
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900">Kalkulation versendet!</h3>
              <p class="text-sm text-gray-500 mt-2">
                Wir haben dir die Kostenschätzung per E-Mail geschickt. Schau auch im Spam-Ordner nach.
              </p>
            </div>
            <div class="space-y-3">
              <a
                href="https://www.simy.ch/booking/availability/driving-team"
                target="_blank"
                rel="noopener noreferrer"
                class="block w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition text-sm"
              >
                Jetzt Termin buchen →
              </a>
              <button
                @click="closeSuccessModal"
                class="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition text-sm"
              >
                Schliessen
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  autoOpen: {
    type: Boolean,
    default: false
  },
  preSelectCategory: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: '💰 Kostenrechner'
  },
  description: {
    type: String,
    default: 'Schritt {{ currentStep }} von {{ totalSteps }}'
  }
})

interface Category {
  id: string
  icon: string
  label: string
  description: string
  basePricePerLesson: number
  doublePricePerLesson: number
  insuranceOrAdminFee: number | null
  insuranceOrAdminLabel?: string
  warmupFee?: number
  externalCosts?: number
}

const categories: Category[] = [
  {
    id: 'auto',
    icon: '🚗',
    label: 'Auto Kategorie B',
    description: 'bis 3.5t',
    basePricePerLesson: 95,
    doublePricePerLesson: 190,
    insuranceOrAdminFee: 120,
    insuranceOrAdminLabel: 'Admin- und Versicherungspauschale',
    warmupFee: 285,
    externalCosts: 400,
  },
  {
    id: 'motorrad',
    icon: '🏍️',
    label: 'Motorrad/Roller Kategorie A',
    description: 'A1/A35kW/A',
    basePricePerLesson: 95,
    doublePricePerLesson: 190,
    insuranceOrAdminFee: null,
    externalCosts: 350,
  },
  {
    id: 'anhänger',
    icon: '🚗',
    label: 'Anhänger Kategorie BE',
    description: 'Gesamtzugsgewicht mehr als 3.5t',
    basePricePerLesson: 240,
    doublePricePerLesson: 240,
    insuranceOrAdminFee: 120,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 360,
    externalCosts: 280,
  },
  {
    id: 'motorwagen',
    icon: '🚛',
    label: 'Transporter Kategorie C1',
    description: 'bis 7.5t',
    basePricePerLesson: 150,
    doublePricePerLesson: 300,
    insuranceOrAdminFee: 160,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 649,
    externalCosts: 500,
  },
  {
    id: 'lastwagen',
    icon: '🚚',
    label: 'Lastwagen Kategorie C',
    description: 'über 7.5t',
    basePricePerLesson: 170,
    doublePricePerLesson: 340,
    insuranceOrAdminFee: 200,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 737,
    externalCosts: 550,
  },
  {
    id: 'gesellschaftswagen',
    icon: '🚌',
    label: 'Kleinbus Kategorie D1',
    description: 'bis 16 Personen',
    basePricePerLesson: 150,
    doublePricePerLesson: 300,
    insuranceOrAdminFee: 160,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 649,
    externalCosts: 500,
  },
  {
    id: 'bus',
    icon: '🚌',
    label: 'Bus Kategorie D',
    description: 'über 16 Personen',
    basePricePerLesson: 200,
    doublePricePerLesson: 400,
    insuranceOrAdminFee: 300,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 1066,
    externalCosts: 600,
  },
  {
    id: 'motorboot',
    icon: '🛥️',
    label: 'Motorboot',
    description: 'bis 12 Personen',
    basePricePerLesson: 95,
    doublePricePerLesson: 190,
    insuranceOrAdminFee: 120,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 285,
    externalCosts: 300,
  },
]

// Modal & Step Management
const showModal = ref(false)
const currentStep = ref(1)
const totalSteps = ref(3)

onMounted(() => {
  if (props.autoOpen) {
    showModal.value = true
  }
  // Pre-select category and jump to step 2 if provided
  if (props.preSelectCategory) {
    selectedCategory.value = props.preSelectCategory
    currentStep.value = 2
  }
})

// Form State
const selectedCategory = ref('auto')
const lessonsCount = ref(22)
const emailInput = ref('')
const firstNameInput = ref('')
const emailSendSuccess = ref(false)
const emailSendError = ref('')
const isSending = ref(false)
const newsletterOptIn = ref(false)

interface SvaFee {
  label: string
  amount: number
}

const svaFees = computed((): SvaFee[] => {
  const id = selectedCategory.value
  if (id === 'auto') {
    return [
      { label: 'Sehtest', amount: 25 },
      { label: 'Nothelferkurs *', amount: 99 },
      { label: 'Lernfahrgesuch', amount: 20 },
      { label: 'Lernfahrausweis', amount: 40 },
      { label: 'Identitätsprüfung *', amount: 20 },
      { label: 'Theorieprüfung *', amount: 36 },
      { label: 'VKU Verkehrskundeunterricht *', amount: 190 },
      { label: 'Praktische Fahrprüfung', amount: 134 },
      { label: 'Führerausweis (Probezeit)', amount: 40 },
      { label: 'WAB-Kurs (2-Phasen-Ausbildung)', amount: 300 },
      { label: 'Führerausweis (unbefristet)', amount: 40 },

    ]
  } else if (id === 'motorrad') {
    return [
      { label: 'Sehtest', amount: 25 },
      { label: 'Nothelferkurs *', amount: 99 },
      { label: 'Lernfahrgesuch', amount: 20 },
      { label: 'Lernfahrausweis', amount: 40 },
      { label: 'Identitätsprüfung *', amount: 20 },
      { label: 'Motorrad Grundkurs', amount: 500 },
      { label: 'Theorieprüfung *', amount: 36 },
      { label: 'Praktische Fahrprüfung', amount: 134 },
      { label: 'Führerausweis', amount: 40 },
    ]
  } else if (id === 'anhänger') {
    return [
      { label: 'Lernfahrgesuch', amount: 20 },
      { label: 'Lernfahrausweis', amount: 40 },
      { label: 'Praktische Fahrprüfung', amount: 134 },
      { label: 'Führerausweis', amount: 40 },
    ]
  } else if (['motorwagen', 'lastwagen', 'gesellschaftswagen'].includes(id)) {
    return [
      { label: 'Ärztlicher Gesundheits-Check', amount: 150 },
      { label: 'Lernfahrgesuch', amount: 20 },
      { label: 'Lernfahrausweis', amount: 40 },
      { label: 'Theorieprüfung', amount: 45 },
      { label: 'LKW Theoriekurs', amount: 800 },
      { label: 'Praktische Fahrprüfung', amount: 201 },
      { label: 'Führerausweis', amount: 40 },
    ]
  } else if (['bus'].includes(id)) {
    return [
      { label: 'Ärztlicher Gesundheits-Check', amount: 150 },
      { label: 'Lernfahrgesuch', amount: 20 },
      { label: 'Lernfahrausweis', amount: 40 },
      { label: 'Theorieprüfung', amount: 45 },
      { label: 'Bus Theoriekurs', amount: 800 },
      { label: 'Praktische Fahrprüfung', amount: 268 },
      { label: 'Führerausweis', amount: 40 },
    ]
  } else if (id === 'motorboot') {
    return [
      { label: 'Lernfahrgesuch', amount: 20 },
      { label: 'Lernfahrausweis', amount: 50 },
      { label: 'Theorieprüfung', amount: 45 },
      { label: 'Praktische Fahrprüfung', amount: 140 },
      { label: 'Bootsführerausweis', amount: 40 },
    ]
  }
  return []
})

const externalCostsTotal = computed(() =>
  svaFees.value.reduce((sum, fee) => sum + fee.amount, 0)
)

const lessonsTip = computed(() => {
  const tips: Record<string, string> = {
    auto: 'Auto: 15-30 Lektionen',
    motorrad: 'Motorrad: 6-12 Lektionen',
    anhänger: 'Anhänger: 6-12 Lektionen',
    motorwagen: 'Motorwagen: 20-40 Lektionen',
    lastwagen: 'Lastwagen: 20-40 Lektionen',
    gesellschaftswagen: 'Gesellschaftswagen: 20-40 Lektionen',
    bus: 'Bus: 30-60 Lektionen',
    motorboot: 'Motorboot: 20-30 Lektionen',
  }
  return tips[selectedCategory.value] || 'Siehe Beschreibung unten'
})

const lessonsTipRange = computed(() => {
  const ranges: Record<string, [number, number]> = {
    auto: [15, 30],
    motorrad: [6, 12],
    anhänger: [6, 12],
    motorwagen: [15, 30],
    lastwagen: [20, 30],
    gesellschaftswagen: [15, 30],
    bus: [20, 60],
    motorboot: [20, 30],
  }
  const range = ranges[selectedCategory.value] || [20, 30]
  return Math.round((range[0] + range[1]) / 2)
})

// Wenn Kategorie wechselt, Fahrstunden auf Mittelpunkt setzen
watch(selectedCategory, () => {
  lessonsCount.value = lessonsTipRange.value
})

const currentCategory = computed(() =>
  categories.find(cat => cat.id === selectedCategory.value)
)

const currentLessonPrice = computed(() => {
  if (!currentCategory.value) return 0
  return currentCategory.value.basePricePerLesson
})

const showWarmup = computed(() => {
  return lessonsCount.value >= 15
})

const totalCost = computed(() => {
  let total = lessonsCount.value * currentLessonPrice.value

  if (currentCategory.value) {
    if (currentCategory.value.insuranceOrAdminFee) {
      total += currentCategory.value.insuranceOrAdminFee
    }
    if (showWarmup.value && currentCategory.value.warmupFee) {
      total += currentCategory.value.warmupFee
    }
  }

  total += externalCostsTotal.value

  return Math.round(total)
})

const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(emailInput.value)
})

const canProceed = computed(() => {
  if (currentStep.value === 1) return !!selectedCategory.value
  if (currentStep.value === 2) return lessonsCount.value >= 1
  return true
})

const nextStep = () => {
  if (currentStep.value < totalSteps.value && canProceed.value) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const closeModal = () => {
  showModal.value = false
  setTimeout(() => {
    currentStep.value = props.preSelectCategory ? 2 : 1
    emailInput.value = ''
    firstNameInput.value = ''
    emailSendSuccess.value = false
    emailSendError.value = ''
    newsletterOptIn.value = false
  }, 300)
}

const trackEvent = async (eventType: 'opened' | 'submitted', category: string) => {
  try {
    const sessionId = window.__analyticsSessionId || 'unknown'
    await fetch('/api/calculator-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, category, sessionId }),
    }).catch(() => {}) // Fire and forget
  } catch (err) {
    // Silently fail
  }
}

const openCalculator = () => {
  showModal.value = true
  trackEvent('opened', selectedCategory.value)
}

const modalDescription = computed(() => {
  return props.description
    .replace('{{ currentStep }}', String(currentStep.value))
    .replace('{{ totalSteps }}', String(totalSteps.value))
})

const closeSuccessModal = () => {
  emailSendSuccess.value = false
  currentStep.value = props.preSelectCategory ? 2 : 1
  emailInput.value = ''
  firstNameInput.value = ''
  emailSendError.value = ''
}

const sendCalculationEmail = async () => {
  if (!emailInput.value || !isValidEmail.value) {
    closeModal()
    return
  }

  try {
    isSending.value = true
    emailSendError.value = ''
    emailSendSuccess.value = false

    const mailBody = buildEmailBody()

    const response = await fetch('/api/booking/send-price-calculation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value,
        firstName: firstNameInput.value.trim() || undefined,
        category: currentCategory.value?.label,
        lessonsCount: lessonsCount.value,
        totalCost: totalCost.value,
        calculationDetails: mailBody,
        svaFees: svaFees.value,
        externalCostsTotal: externalCostsTotal.value,
        newsletterOptIn: newsletterOptIn.value,
        sessionId: window.__analyticsSessionId,
      }),
    })

    if (!response.ok) {
      throw new Error('Fehler beim Versand')
    }

    // Track successful submission
    trackEvent('submitted', selectedCategory.value)

    emailSendSuccess.value = true
    isSending.value = false
    showModal.value = false // close main modal, show success modal
  } catch (error) {
    isSending.value = false
    emailSendError.value =
      error instanceof Error
        ? error.message
        : 'Fehler beim Versand der E-Mail'
    setTimeout(() => {
      emailSendError.value = ''
    }, 4000)
  }
}

const buildEmailBody = (): string => {
  const breakdown = [
    `Kategorie: ${currentCategory.value?.label}`,
    `Fahrstunden: ${lessonsCount.value} × ${currentLessonPrice.value.toFixed(0)}CHF = ${(lessonsCount.value * currentLessonPrice.value).toFixed(0)}CHF`,
  ]

  if (currentCategory.value?.insuranceOrAdminFee) {
    breakdown.push(
      `${currentCategory.value.insuranceOrAdminLabel}: ${currentCategory.value.insuranceOrAdminFee}CHF`
    )
  }

  if (showWarmup.value && currentCategory.value?.warmupFee) {
    breakdown.push(
      `WarmUp inkl. Prüfungsfahrt: ${currentCategory.value.warmupFee}CHF`
    )
  }

  if (currentCategory.value?.externalCosts) {
    breakdown.push(
      `Externe Kosten (Strassenverkehrsamt): ca. ${currentCategory.value.externalCosts}CHF`
    )
  }

  breakdown.push(`\nGESCHÄTZTE GESAMTKOSTEN: ${totalCost.value}CHF`)

  return breakdown.join('\n')
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease;
}

.animate-scale-in {
  animation: scaleIn 0.25s ease-out;
}

button,
input {
  transition: all 0.2s ease;
}

input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
