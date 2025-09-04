// composables/usePriceCalculation.ts - KORRIGIERTE VERSION
import { computed, type Ref } from 'vue'

// ✅ ProductItem Interface definieren (falls nicht aus anderem File importiert)
interface ProductItem {
  id: string
  name: string
  price: number
  quantity: number
  total_chf: number
}

interface PriceCalculationProps {
  durationMinutes: Ref<number>
  pricePerMinute: Ref<number>
  adminFee: Ref<number>
  appointmentNumber: Ref<number>
  discount: Ref<number>
  selectedProducts: Ref<ProductItem[]>
  showAdminFeeByDefault?: Ref<boolean>
}

export const usePriceCalculation = (props: PriceCalculationProps) => {
  
  // Basic calculations
  const lessonPrice = computed(() => 
    props.durationMinutes.value * props.pricePerMinute.value
  )

  // ✅ KORRIGIERT: Admin-Fee nur beim 2. Termin pro Kategorie (außer bei Motorrädern)
  const shouldShowAdminFee = computed(() => {
    // Wenn showAdminFeeByDefault gesetzt ist, immer anzeigen
    if (props.showAdminFeeByDefault?.value) return true
    
    // Ansonsten nur beim 2. Termin
    return props.appointmentNumber.value === 2
  })

  const productsTotal = computed(() => 
    props.selectedProducts.value.reduce((sum, item) => sum + item.total_chf, 0)
  )

  const subtotal = computed(() => {
    let total = lessonPrice.value
    if (shouldShowAdminFee.value) {
      total += props.adminFee.value  // ✅ FIX: .value hinzufügen
    }
    total += productsTotal.value
    return total
  })

  // ✅ FIX: finalPrice computed korrigieren
  const finalPrice = computed(() => {
    let total = lessonPrice.value
    if (shouldShowAdminFee.value) {
      total += props.adminFee.value  // ✅ FIX: .value hinzufügen
    }
    total += productsTotal.value
    total -= props.discount.value    // ✅ FIX: .value hinzufügen
    return Math.max(0, total)
  })

  const maxPossibleDiscount = computed(() => subtotal.value)

  // Price breakdown for detailed view
  const priceBreakdown = computed(() => ({
    lessonPrice: lessonPrice.value,
    adminFee: shouldShowAdminFee.value ? props.adminFee.value : 0,  // ✅ FIX
    productsTotal: productsTotal.value,
    subtotal: subtotal.value,
    discount: props.discount.value,
    finalPrice: finalPrice.value
  }))

  // Validation
  const isPriceValid = computed(() => {
    return lessonPrice.value > 0 && 
           props.discount.value <= maxPossibleDiscount.value &&
           props.discount.value >= 0
  })

  // Formatting
  const formatPrice = (amount: number): string => amount.toFixed(2)

  const formatCurrency = (amount: number): string => `CHF ${formatPrice(amount)}`

  return {
    // Computed values
    lessonPrice,
    shouldShowAdminFee,
    productsTotal,
    subtotal,
    finalPrice,
    maxPossibleDiscount,
    priceBreakdown,
    isPriceValid,
    
    // Utilities
    formatPrice,
    formatCurrency
  }
}