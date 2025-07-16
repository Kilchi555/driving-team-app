<template>
  <div v-if="shouldShowPrice" class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2 shadow-sm">
    <!-- Hauptpreis-Anzeige -->
   <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium text-green-800 flex items-center gap-2" style="white-space: pre-line;">
        {{ formattedAppointmentInfo }}
        </span>
      <span class="text-md font-bold text-green-900">CHF {{ formattedLessonPrice }}</span>
    </div>
    
    <!-- Detaillierte Preisaufschlüsselung -->
    <div v-if="showDetails" class="space-y-2 pt-3 border-t border-green-200">
      
      <!-- Rabatt (falls vorhanden) -->
        <div v-if="props.discount > 0" class="flex justify-between text-sm">
            <span class="text-red-600 flex items-center gap-1">
                Rabatt: - CHF {{ props.discount }}
            <span v-if="allowDiscountEdit" class="flex items-center gap-1 ml-1">
                <button
                @click="removeDiscount"
                class="text-red-500 hover:text-red-700 text-xs"
                title="Rabatt entfernen"
                >
                🗑️
                </button>
            </span>
            </span>
            <span class="font-medium text-red-600">-CHF {{ formattedDiscountAmount }}</span>
        </div>
      
      <!-- Rabatt-Grund -->
      <div v-if="props.discount > 0 && props.discountReason" class="text-xs text-gray-500 italic">
        Grund: {{ props.discountReason }}
      </div>
      
      <!-- Preis nach Rabatt -->
      <div v-if="props.discount > 0" class="flex justify-between text-sm font-semibold pt-1 border-t border-gray-200">
        <span class="text-gray-800">Lektionspreis nach Rabatt:</span>
        <span class="text-gray-900">CHF {{ formattedDiscountedPrice }}</span>
      </div>
      
      <!-- Rabatt hinzufügen Button (nur für Staff) -->
      <div v-if="allowDiscountEdit && props.discount === 0" class="pt-2 border-t border-gray-200">
        <button 
          @click="showDiscountEdit = true"
          class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          + Rabatt hinzufügen
        </button>
      </div>
      
      <!-- Admin-Pauschale (falls anwendbar) -->
      <div v-if="shouldShowAdminFee" class="flex justify-between text-sm">
        <span class="text-gray-600 flex items-center gap-1">
          📋 Administrationspauschale
          <button 
            @click="showAdminFeeInfo = !showAdminFeeInfo"
            class="text-blue-500 hover:text-blue-700 text-xs"
          >
            ℹ️
          </button>
        </span>
        <span class="font-medium">CHF {{ formattedAdminFee }}</span>
      </div>
      
      <!-- Admin-Fee Info -->
      <div v-if="showAdminFeeInfo && shouldShowAdminFee" class="text-xs text-gray-500 bg-blue-50 p-2 rounded">
        💡 Die Administrationspauschale wird beim 2. Termin automatisch verrechnet und deckt Versicherung, Prüfungsanmeldung und administrative Aufwände ab.
      </div>
      
      <!-- Gesamtsumme (mit Admin-Fee) -->
      <div v-if="shouldShowAdminFee" class="flex justify-between text-sm font-semibold pt-2 border-t border-green-300">
        <span class="text-green-800">Gesamtpreis (inkl. Admin-Pauschale):</span>
        <span class="text-green-900">CHF {{ formattedTotalPrice }}</span>
      </div>
      
      <!-- Zahlungsstatus -->
      <div class="flex items-center justify-between pt-2 border-t border-green-200">
        <span class="text-xs text-gray-600">Zahlungsstatus:</span>
        <span :class="paymentStatusClass">
          {{ paymentStatusText }}
        </span>
      </div>
    </div>
    
    <!-- Rabatt-Edit Modal -->
    <div v-if="showDiscountEdit" class="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="mb-3">        
        <!-- Rabatt-Wert -->
        <div class="mb-3">
          <label class="block text-xs text-gray-600 mb-1">
                Rabatt in CHF
            </label>
          <input
            v-model="tempDiscountInput"
            @focus="($event.target as HTMLInputElement)?.select()"
            @blur="formatToTwoDecimals"
            type="number"
            :min="0"
            :max="tempDiscountType === 'fixed' ? 100 : lessonPrice"
            step="0.50"
            class="w-full p-2 border border-gray-300 rounded text-sm"
            :placeholder="'25.00'"
          />
        </div>
        
        <!-- Rabatt-Grund -->
        <div class="mb-3">
          <label class="block text-xs text-gray-600 mb-1">Grund (optional)</label>
          <select
            v-model="tempDiscountReason"
            class="w-full p-2 border border-gray-300 rounded text-sm"
          >
            <option value="">Grund wählen...</option>
            <option value="Stammkunde">🏆 Stammkunde</option>
            <option value="Mehrfachbuchung">📅 Mehrfachbuchung</option>
            <option value="Kulanz">🤝 Kulanz</option>
            <option value="Promotion">🎉 Promotion</option>
            <option value="Sonstiges">📝 Sonstiges</option>
          </select>
        </div>
        
        <!-- Vorschau -->
        <div class="mb-3 p-2 bg-white border border-gray-200 rounded text-xs">
          <div class="flex justify-between">
            <span>Ursprungspreis:</span>
            <span>CHF {{ formattedLessonPrice }}</span>
          </div>
          <div class="flex justify-between text-red-600">
            <span>Rabatt:</span>
            <span>-CHF {{ getPreviewDiscountAmount() }}</span>
          </div>
          <div class="flex justify-between font-medium border-t pt-1 mt-1">
            <span>Neuer Preis:</span>
            <span>CHF {{ getPreviewFinalPrice() }}</span>
          </div>
        </div>
        
        <!-- Buttons -->
        <div class="flex gap-2">
          <button
            @click="applyDiscount"
            :disabled="tempDiscount <= 0"
            class="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✅ Rabatt anwenden
          </button>
          <button
            @click="cancelDiscountEdit"
            class="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-400"
          >
            ❌ Abbrechen
          </button>
        </div>
      </div>
    </div>
    
    <!-- Toggle für Details -->
    <button 
      @click="showDetails = !showDetails"
      class="w-full mt-3 text-xs text-green-700 hover:text-green-900 transition-colors flex items-center justify-center gap-1"
    >
      {{ showDetails ? '▲ Weniger Details' : '▼ Details anzeigen' }}
    </button>
    
    <!-- Warnung bei ungewöhnlichen Preisen -->
    <div v-if="priceWarning" class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
      ⚠️ {{ priceWarning }}
    </div>
  </div>
  <!-- Für Staff: Einfache Zahlungsmarkierung -->
  <div v-if="currentUser?.role === 'staff' && !isPaid" class="mt-3 pt-3 border-t border-gray-200">
    <div class="space-y-2">
      <button
        @click="markAsPaid('cash')"
        class="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700"
      >
        💰 Als bar bezahlt markieren
      </button>
      
      <button
        @click="markAsPaid('invoice')"
        class="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
      >
        📄 Rechnung erstellt - als bezahlt markieren
      </button>
    </div>
  </div>

  <!-- Für Clients: Link zu PaymentModal -->
  <div v-if="currentUser?.role === 'student' && !isPaid" class="mt-3 pt-3 border-t border-gray-200">
    <button
      @click="$emit('open-payment-modal')"
      class="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700"
    >
      💳 Online bezahlen (Twint, Karte)
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'


interface Props {
  eventType: string
  durationMinutes: number
  pricePerMinute: number
  categoryCode?: string
  categoryInfo?: any
  availableDurations?: number[]
  isPaid?: boolean
  adminFee?: number
  isSecondOrLaterAppointment?: boolean
  appointmentNumber?: number
  showAdminFeeByDefault?: boolean
  discount?: number
  discountType?: 'fixed'
  discountReason?: string
  allowDiscountEdit?: boolean
  selectedDate?: string | null
  startTime?: string | null
  currentUser?: any 

}

interface Emits {
  (e: 'update:modelValue', value: number): void
  (e: 'duration-changed', duration: number): void
  (e: 'discount-changed', discount: number, discountType: 'fixed', reason: string): void
  (e: 'payment-status-changed', isPaid: boolean, paymentMethod?: string): void 
  (e: 'open-payment-modal'): void
}

const props = withDefaults(defineProps<Props>(), {
  eventType: 'lesson',
  durationMinutes: 45,
  pricePerMinute: 0,
  isPaid: false,
  adminFee: 120,
  isSecondOrLaterAppointment: false,
  appointmentNumber: 1,
  showAdminFeeByDefault: false,
  discount: 0,
  discountType: 'fixed',
  discountReason: '',
  allowDiscountEdit: false,
  selectedDate: '',
  startTime: '',
  currentUser: null
})

const emit = defineEmits<Emits>()

// Reactive state
const showDetails = ref(false)
const showAdminFeeInfo = ref(false)
const showDiscountEdit = ref(false)
const tempDiscount = ref(0)
const tempDiscountType = ref<'fixed'>('fixed')
const tempDiscountReason = ref('')

// Computed properties
const shouldShowPrice = computed(() => {
  return props.eventType === 'lesson' && props.pricePerMinute > 0 && props.durationMinutes > 0
})

const lessonPrice = computed(() => {
  return props.durationMinutes * props.pricePerMinute
})

const discountAmount = computed(() => {
  if (props.discount <= 0) return 0
  // Da nur noch 'fixed' möglich ist, können wir direkt zurückgeben
  return Math.min(props.discount, lessonPrice.value) // Rabatt kann nicht höher als Preis sein
})

const discountedLessonPrice = computed(() => {
  return Math.max(0, lessonPrice.value - discountAmount.value)
})

const shouldShowAdminFee = computed(() => {
  return props.appointmentNumber === 2 || props.showAdminFeeByDefault
})

const totalPrice = computed(() => {
  let total = discountedLessonPrice.value
  if (shouldShowAdminFee.value) {
    total += props.adminFee
  }
  return total
})

const formattedLessonPrice = computed(() => {
  return lessonPrice.value.toFixed(2)
})

const formattedDiscountedPrice = computed(() => {
  return discountedLessonPrice.value.toFixed(2)
})

const formattedDiscountAmount = computed(() => {
  return discountAmount.value.toFixed(2)
})

const formattedTotalPrice = computed(() => {
  return totalPrice.value.toFixed(2)
})

const formattedTotalWithAdmin = computed(() => {
  return totalPrice.value.toFixed(2)
})

const formattedPricePerMinute = computed(() => {
  return props.pricePerMinute.toFixed(2)
})

const formattedAdminFee = computed(() => {
  return props.adminFee.toFixed(2)
})

const paymentStatusClass = computed(() => {
  return props.isPaid 
    ? 'text-green-600 font-medium text-xs'
    : 'text-orange-600 font-medium text-xs'
})

const paymentStatusText = computed(() => {
  return props.isPaid ? '✅ Bezahlt' : '⏳ Offen'
})

const availableDurationsText = computed(() => {
  if (!props.availableDurations || props.availableDurations.length === 0) {
    return 'Nicht verfügbar'
  }
  return props.availableDurations.map(d => `${d}min`).join(', ')
})

const priceWarning = computed(() => {
  // Warnung bei sehr niedrigen oder hohen Preisen
  if (props.pricePerMinute < 1) {
    return 'Ungewöhnlich niedriger Preis - bitte prüfen'
  }
  if (props.pricePerMinute > 5) {
    return 'Ungewöhnlich hoher Preis - bitte prüfen'
  }
  // Warnung bei ungewöhnlichen Dauern
  if (props.durationMinutes > 240) {
    return 'Sehr lange Lektionsdauer - bitte prüfen'
  }
  return null
})

const markAsPaid = (paymentMethod: 'cash' | 'invoice') => {
  emit('payment-status-changed', true, paymentMethod)
}

const openPaymentModal = () => {
  emit('open-payment-modal')
}

// Neue computed property hinzufügen:
const tempDiscountInput = computed({
  get: () => {
    return tempDiscount.value === 0 ? '' : tempDiscount.value.toString()
  },
  set: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    tempDiscount.value = isNaN(numValue) ? 0 : numValue
  }
})

const formattedAppointmentInfo = computed(() => {
 let parts = []
 
 // Kategorie
 if (props.categoryInfo?.name) {
   parts.push(props.categoryInfo.name)
 } else if (props.categoryCode) {
   parts.push(`Kategorie ${props.categoryCode}`)
 }
 
 // Datum
 if (props.selectedDate) {
   const date = new Date(props.selectedDate)
   parts.push(date.toLocaleDateString('de-CH'))
 }
 
 // Zeit & Dauer mit Endzeit
 if (props.startTime) {
   // Endzeit berechnen
   const [hours, minutes] = props.startTime.split(':').map(Number)
   const startMinutes = hours * 60 + minutes
   const endMinutes = startMinutes + props.durationMinutes
   const endHours = Math.floor(endMinutes / 60)
   const endMins = endMinutes % 60
   const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
   
   parts.push(`${props.startTime} - ${endTime} (${props.durationMinutes}min)`)
 } else {
   parts.push(`${props.durationMinutes}min`)
 }
 
 return parts.join('\n')
})


// Neue Methode:
const formatToTwoDecimals = () => {
  if (tempDiscount.value > 0) {
    tempDiscount.value = parseFloat(tempDiscount.value.toFixed(2))
  }
}

const removeDiscount = () => {
  // und den Grund auf leer.
emit('discount-changed', 0, 'fixed', '') 
  showDiscountEdit.value = false
  // Optional: Setze die temporären Werte zurück, falls der Nutzer zuvor das Modal geöffnet hatte
  tempDiscount.value = 0
  tempDiscountType.value = 'fixed'
  tempDiscountReason.value = ''
  console.log('✅ Rabatt wurde entfernt.')
}

// Methods
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const applyDiscount = () => {
  if (tempDiscount.value > 0) {
    // discountType ist jetzt immer 'fixed'
    emit('discount-changed', tempDiscount.value, 'fixed', tempDiscountReason.value)
  }
  showDiscountEdit.value = false
}

const cancelDiscountEdit = () => {
  showDiscountEdit.value = false
  tempDiscount.value = 0
  tempDiscountType.value = 'fixed'
  tempDiscountReason.value = ''
}

const getPreviewDiscountAmount = () => {
  if (tempDiscount.value <= 0) return '0.00'
  // Da nur noch 'fixed' möglich ist
  return Math.min(tempDiscount.value, lessonPrice.value).toFixed(2)
}

const getPreviewFinalPrice = () => {
  const discountAmount = parseFloat(getPreviewDiscountAmount())
  return Math.max(0, lessonPrice.value - discountAmount).toFixed(2)
}

// Expose für Parent-Component
defineExpose({
  totalPrice,
  lessonPrice,
  toggleDetails,
  showDetails
})
</script>

<style scoped>
/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Gradient background animation */
.bg-gradient-to-r {
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Custom scrollbar for details */
.space-y-2 {
  max-height: 300px;
  overflow-y: auto;
}
</style>