<template>
  <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 md:p-10 shadow-lg">
    <!-- Header -->
    <div class="text-center mb-8">
      <h2 class="heading-md text-gray-900 mb-2">💰 Kostenrechner</h2>
      <p class="text-gray-600">Berechne deine persönlichen Fahrstunden-Kosten und erhalte eine Übersicht per E-Mail</p>
    </div>

    <!-- Disclaimer -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
      <p class="text-xs md:text-sm text-gray-700">
        <span class="font-semibold">⚠️ Unverbindliche Preise:</span> Diese Kalkulation dient nur zur Orientierung. Die tatsächlichen Kosten können je nach individuellen Umständen, Anzahl der benötigten Fahrstunden und externen Gebühren variieren. Externe Kosten wie Sehtest, Lernfahrgesuch, Prüfungsgebühren und Strassenverkehrsamtsgebühren sind teilweise enthalten, aber nicht vollständig. Für ein genaues Angebot kontaktiere uns bitte direkt.
      </p>
    </div>

    <!-- Calculator Form -->
    <div class="grid md:grid-cols-2 gap-8">
      <!-- Left: Inputs -->
      <div class="space-y-6">
        <!-- Category Selection -->
        <div>
          <label class="block text-sm font-semibold text-gray-900 mb-3">1. Wähle deine Kategorie:</label>
          <div class="space-y-2">
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="selectedCategory = cat.id"
              :class="[
                'w-full text-left px-4 py-3 rounded-lg border-2 transition duration-200 font-medium',
                selectedCategory === cat.id
                  ? 'border-primary-600 bg-primary-50 text-primary-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
              ]"
            >
              <span class="text-lg mr-3">{{ cat.icon }}</span>{{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Lessons Count -->
        <div>
          <label class="block text-sm font-semibold text-gray-900 mb-3">2. Anzahl Fahrstunden:</label>
          <div class="flex items-center gap-4">
            <button
              @click="lessonsCount = Math.max(1, lessonsCount - 1)"
              class="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold transition"
            >
              −
            </button>
            <input
              v-model.number="lessonsCount"
              type="number"
              min="1"
              max="200"
              class="flex-1 px-4 py-3 text-center text-lg font-bold border-2 border-primary-300 rounded-lg focus:outline-none focus:border-primary-600"
            />
            <button
              @click="lessonsCount = Math.min(200, lessonsCount + 1)"
              class="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold transition"
            >
              +
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">Tipp: Auto 15-30 Lektionen, Motorrad 10-20 Lektionen</p>
        </div>

        <!-- Lesson Type (optional for some categories) -->
        <div v-if="currentCategory && ['auto', 'motorrad', 'motorwagen', 'lastwagen', 'gesellschaftswagen', 'bus', 'motorboot'].includes(currentCategory.id)">
          <label class="block text-sm font-semibold text-gray-900 mb-3">3. Lektionstyp (Durchschnitt):</label>
          <div class="space-y-2">
            <button
              v-for="type in lessonTypes"
              :key="type.id"
              @click="selectedLessonType = type.id"
              :class="[
                'w-full text-left px-4 py-3 rounded-lg border-2 transition duration-200',
                selectedLessonType === type.id
                  ? 'border-primary-600 bg-primary-50 text-primary-900 font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
              ]"
            >
              {{ type.label }} – {{ type.price }}CHF
            </button>
          </div>
        </div>

        <!-- Email Input -->
        <div>
          <label class="block text-sm font-semibold text-gray-900 mb-2">4. Deine E-Mail (optional):</label>
          <input
            v-model="emailInput"
            type="email"
            placeholder="name@example.com"
            class="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-primary-600 focus:outline-none"
          />
          <p class="text-xs text-gray-500 mt-2">Um die Kalkulation per E-Mail zu erhalten</p>
        </div>
      </div>

      <!-- Right: Summary & Results -->
      <div class="bg-white rounded-xl p-6 shadow-md border-2 border-gray-200 h-fit">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Kostenübersicht</h3>

        <!-- Breakdown -->
        <div class="space-y-3 mb-6 pb-6 border-b-2 border-gray-200">
          <!-- Driving Lessons -->
          <div class="flex justify-between items-center">
            <span class="text-gray-700">
              {{ lessonsCount }} × {{ currentLessonPrice }}CHF
              <span class="text-xs text-gray-500">({{ lessonTypeLabel }})</span>
            </span>
            <span class="font-bold text-gray-900">{{ (lessonsCount * currentLessonPrice).toFixed(0) }}CHF</span>
          </div>

          <!-- Insurance/Admin -->
          <div v-if="currentCategory && currentCategory.insuranceOrAdminFee" class="flex justify-between items-center">
            <span class="text-gray-700">{{ currentCategory.insuranceOrAdminLabel }}</span>
            <span class="font-bold text-gray-900">{{ currentCategory.insuranceOrAdminFee }}CHF</span>
          </div>

          <!-- Warmup (if applicable) -->
          <div v-if="showWarmup && currentCategory" class="flex justify-between items-center">
            <span class="text-gray-700">WarmUp inkl. Prüfungsfahrt</span>
            <span class="font-bold text-gray-900">{{ currentCategory.warmupFee }}CHF</span>
          </div>

          <!-- External Costs (estimate) -->
          <div v-if="currentCategory && currentCategory.externalCosts" class="flex justify-between items-center bg-blue-50 p-2 rounded">
            <span class="text-gray-700 text-sm">Externe Kosten (Strassenverkehrsamt)</span>
            <span class="font-bold text-gray-900">ca. {{ currentCategory.externalCosts }}CHF</span>
          </div>
        </div>

        <!-- Total -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <span class="text-lg font-bold text-gray-900">Geschätzte Gesamtkosten</span>
            <span class="text-3xl font-bold text-primary-600">{{ totalCost }}CHF</span>
          </div>
          <p class="text-xs text-gray-500">ohne weitere externe Gebühren</p>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            @click="sendCalculationEmail"
            :disabled="!emailInput || !isValidEmail"
            class="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition duration-200"
          >
            📧 Kalkulation per E-Mail
          </button>
          <button
            @click="printCalculation"
            class="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition duration-200"
          >
            🖨️ Drucken
          </button>
          <a
            href="tel:+41444310033"
            class="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition duration-200 text-center"
          >
            📞 Anrufen
          </a>
        </div>

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

    <!-- Category Info -->
    <div v-if="currentCategory" class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-gray-700">
        <span class="font-semibold text-blue-900">ℹ️ {{ currentCategory.label }}:</span>
        {{ currentCategory.description }}
      </p>
    </div>
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

interface LessonType {
  id: string
  label: string
  price: number
}

const lessonTypes: LessonType[] = [
  { id: 'single', label: 'Einzellektionen (45min)', price: 1 },
  { id: 'double', label: 'Doppellektionen (90min)', price: 1 },
  { id: 'average', label: 'Durchschnitt (Mix)', price: 1 },
]

const selectedCategory = ref('auto')
const lessonsCount = ref(20)
const selectedLessonType = ref('average')
const emailInput = ref('')
const emailSendSuccess = ref(false)
const emailSendError = ref('')

const currentCategory = computed(() =>
  categories.find(cat => cat.id === selectedCategory.value)
)

const currentLessonPrice = computed(() => {
  if (!currentCategory.value) return 0

  if (selectedLessonType.value === 'single') {
    return currentCategory.value.basePricePerLesson
  } else if (selectedLessonType.value === 'double') {
    return currentCategory.value.doublePricePerLesson / 2
  } else {
    return (currentCategory.value.basePricePerLesson + currentCategory.value.doublePricePerLesson / 2) / 2
  }
})

const lessonTypeLabel = computed(() => {
  const type = lessonTypes.find(t => t.id === selectedLessonType.value)
  return type?.label || 'Durchschnitt'
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

const sendCalculationEmail = async () => {
  if (!isValidEmail.value) {
    emailSendError.value = 'Bitte gib eine gültige E-Mail-Adresse ein'
    return
  }

  try {
    emailSendError.value = ''
    emailSendSuccess.value = false

    const mailBody = buildEmailBody()

    const response = await fetch('/api/booking/send-price-calculation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value,
        category: currentCategory.value?.label,
        lessonsCount,
        lessonType: lessonTypeLabel.value,
        totalCost,
        calculationDetails: mailBody,
      }),
    })

    if (!response.ok) {
      throw new Error('Fehler beim Versand')
    }

    emailSendSuccess.value = true
    setTimeout(() => {
      emailSendSuccess.value = false
    }, 4000)
  } catch (error) {
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

  breakdown.push(`\nGESCHÄTZTE GESAMTKOSTEN: ${totalCost}CHF`)

  return breakdown.join('\n')
}

const printCalculation = () => {
  const printWindow = window.open('', '', 'height=600,width=800')
  if (!printWindow) return

  const breakdown = buildEmailBody()
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kostenberechnung - Fahrschule Driving Team</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
          .breakdown { margin: 20px 0; white-space: pre-line; font-size: 14px; line-height: 1.8; }
          .total { background-color: #f0f0f0; padding: 15px; margin-top: 20px; border-left: 4px solid #0066cc; font-weight: bold; font-size: 16px; }
          .disclaimer { background-color: #fff3cd; padding: 10px; margin-top: 20px; font-size: 12px; border-left: 4px solid #ffc107; }
          .contact { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>💰 Kostenberechnung - Fahrschule Driving Team</h1>
        <div class="breakdown">${breakdown.replace(/\n/g, '<br>')}</div>
        <div class="disclaimer">
          <strong>⚠️ Unverbindliche Preise:</strong> Diese Kalkulation dient nur zur Orientierung. Die tatsächlichen Kosten können je nach individuellen Umständen variieren.
        </div>
        <div class="contact">
          <p><strong>Kontakt:</strong></p>
          <p>📞 +41 44 431 00 33</p>
          <p>🌐 drivingteam.ch</p>
        </div>
      </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()
  printWindow.print()
}
</script>

<style scoped>
/* Smooth transitions */
button,
input {
  transition: all 0.2s ease;
}

/* Focus states */
input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
