<template>
  <div>
    <!-- Trigger Button -->
    <button
      @click="showModal = true"
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
        <div v-if="showModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-800 text-white p-6 flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold">💰 Kostenrechner</h2>
                <p class="text-primary-100 text-sm mt-1">Schritt {{ currentStep }} von {{ totalSteps }}</p>
              </div>
              <button
                @click="closeModal"
                class="text-white hover:bg-white/20 rounded-lg p-2 transition"
              >
                ✕
              </button>
            </div>

            <!-- Progress Bar -->
            <div class="h-2 bg-gray-200">
              <div
                class="h-full bg-primary-600 transition-all duration-300"
                :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
              ></div>
            </div>

            <!-- Content -->
            <div class="p-8 space-y-6">
              <!-- Step 1: Category Selection -->
              <div v-show="currentStep === 1" class="space-y-6 animate-fadeIn">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 mb-4">Welche Kategorie interessiert dich?</h3>
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
                      <div class="text-sm">{{ cat.label.split(' ')[0] }}</div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 2: Lesson Count -->
              <div v-show="currentStep === 2" class="space-y-6 animate-fadeIn">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 mb-4">Wie viele Fahrstunden brauchst du?</h3>
                  <p class="text-gray-600 mb-6">
                    <span class="font-semibold">Tipp:</span>
                    {{ currentCategory?.id === 'auto' ? 'Auto: 15-30 Lektionen' : currentCategory?.id === 'motorrad' ? 'Motorrad: 10-20 Lektionen' : 'Siehe Beschreibung unten' }}
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
                      class="w-24 px-4 py-4 text-center text-3xl font-bold border-2 border-primary-300 rounded-lg focus:outline-none focus:border-primary-600"
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
              <div v-show="currentStep === 3" class="space-y-6 animate-fadeIn">
                <div>
                  <h3 class="text-xl font-bold text-gray-900 mb-1">Deine Kostenschätzung</h3>
                  <p class="text-gray-500 text-sm mb-6">Kategorie: <span class="font-semibold text-gray-700">{{ currentCategory?.label }}</span></p>

                  <!-- Kostenaufschlüsselung -->
                  <div class="rounded-xl border-2 border-gray-200 overflow-hidden mb-5">
                    <!-- Fahrstunden -->
                    <div class="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                      <div>
                        <p class="font-medium text-gray-900">{{ lessonsCount }} Fahrstunden</p>
                        <p class="text-xs text-gray-500">CHF {{ currentLessonPrice }}.– pro Lektion</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ (lessonsCount * currentLessonPrice).toFixed(0) }}.–</span>
                    </div>

                    <!-- Admin/Versicherungspauschale -->
                    <div v-if="currentCategory?.insuranceOrAdminFee" class="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                      <div>
                        <p class="font-medium text-gray-900">{{ currentCategory.insuranceOrAdminLabel }}</p>
                        <p class="text-xs text-gray-500">Einmalig für die ganze Ausbildung</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ currentCategory.insuranceOrAdminFee }}.–</span>
                    </div>

                    <!-- WarmUp -->
                    <div v-if="showWarmup && currentCategory?.warmupFee" class="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                      <div>
                        <p class="font-medium text-gray-900">WarmUp inkl. Prüfungsfahrt</p>
                        <p class="text-xs text-gray-500">Am Prüfungstag (ab 15 Fahrstunden)</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">CHF {{ currentCategory.warmupFee }}.–</span>
                    </div>

                    <!-- Externe Kosten -->
                    <div v-if="currentCategory?.externalCosts" class="flex justify-between items-center px-4 py-3 bg-blue-50 border-b border-gray-100">
                      <div>
                        <p class="font-medium text-gray-900">Strassenverkehrsamt</p>
                        <p class="text-xs text-gray-500">Lernfahrgesuch, Prüfungsgebühr, Sehtest etc.</p>
                      </div>
                      <span class="font-bold text-gray-900 whitespace-nowrap">ca. CHF {{ currentCategory.externalCosts }}.–</span>
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
                  <label class="block text-sm font-semibold text-gray-900 mb-2">Kalkulation per E-Mail erhalten:</label>
                  <input
                    v-model="emailInput"
                    type="email"
                    placeholder="deine@email.com"
                    class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-600 focus:outline-none"
                  />
                  <p class="text-xs text-gray-400 mt-2">Optional – du kannst den Schritt auch überspringen</p>

                  <!-- Success Message -->
                  <div
                    v-if="emailSendSuccess"
                    class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm"
                  >
                    ✅ Kalkulation wurde erfolgreich versendet!
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
            <div class="sticky bottom-0 bg-gray-100 border-t-2 border-gray-200 p-6 flex gap-4">
              <button
                @click="previousStep"
                v-if="currentStep > 1"
                class="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold rounded-lg transition"
              >
                ← Zurück
              </button>
              <button
                @click="currentStep === totalSteps ? sendCalculationEmail() : nextStep()"
                :disabled="!canProceed || (currentStep === totalSteps && isSending)"
                v-if="currentStep > 1"
                class="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition"
              >
                {{ currentStep === totalSteps ? (emailInput && isValidEmail ? '📧 Versenden' : 'Fertig') : 'Weiter →' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
    description: 'Fahrstunden für Führerausweis Auto Kategorie B',
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
    label: 'Motorrad Kategorie A',
    description: 'Fahrstunden für Führerausweis Motorrad Kategorie A',
    basePricePerLesson: 95,
    doublePricePerLesson: 190,
    insuranceOrAdminFee: null,
    externalCosts: 350,
  },
  {
    id: 'anhänger',
    icon: '🚗',
    label: 'Anhänger Kategorie BE',
    description: 'Fahrstunden für Anhänger Ausbildung',
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
    label: 'Motorwagen Kategorie C1',
    description: 'Fahrstunden für Motorwagen mit Gesamtgewicht bis 7.5t',
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
    description: 'Fahrstunden für schwere Lastwagen über 12t',
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
    label: 'Gesellschaftswagen Kategorie D1',
    description: 'Fahrstunden für Kleinbusse bis 9 Personen',
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
    description: 'Fahrstunden für grosse Busse über 9 Personen',
    basePricePerLesson: 200,
    doublePricePerLesson: 400,
    insuranceOrAdminFee: 300,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 1066,
    externalCosts: 600,
  },
  {
    id: 'motorboot',
    icon: '⛵',
    label: 'Motorboot',
    description: 'Fahrstunden für Motorboot-Führerschein',
    basePricePerLesson: 95,
    doublePricePerLesson: 190,
    insuranceOrAdminFee: 120,
    insuranceOrAdminLabel: 'Versicherungspauschale',
    warmupFee: 317,
    externalCosts: 300,
  },
]

// Modal & Step Management
const showModal = ref(false)
const currentStep = ref(1)
const totalSteps = ref(3)

// Form State
const selectedCategory = ref('auto')
const lessonsCount = ref(20)
const emailInput = ref('')
const emailSendSuccess = ref(false)
const emailSendError = ref('')
const isSending = ref(false)

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

    if (currentCategory.value.externalCosts) {
      total += currentCategory.value.externalCosts
    }
  }

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
    currentStep.value = 1
    emailInput.value = ''
    emailSendSuccess.value = false
    emailSendError.value = ''
  }, 300)
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
        category: currentCategory.value?.label,
        lessonsCount: lessonsCount.value,
        totalCost: totalCost.value,
        calculationDetails: mailBody,
      }),
    })

    if (!response.ok) {
      throw new Error('Fehler beim Versand')
    }

    emailSendSuccess.value = true
    isSending.value = false
    setTimeout(() => {
      closeModal()
    }, 2000)
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

.animate-fadeIn {
  animation: fadeIn 0.3s ease;
}

button,
input {
  transition: all 0.2s ease;
}

input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
