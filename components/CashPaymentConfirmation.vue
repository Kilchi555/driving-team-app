<!-- components/CashPaymentConfirmation.vue -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-sm w-full shadow-xl">
      
      <!-- Header -->
      <div class="bg-green-600 text-white p-4 rounded-t-lg">
        <div class="text-center">
          <h3 class="text-lg font-semibold">Barzahlung bestätigen</h3>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        
        <!-- Betrag - Groß und zentral -->
        <div class="text-center mb-6">
          <div class="text-3xl font-bold text-gray-900 mb-2">
            CHF {{ (payment.total_amount_rappen / 100).toFixed(2) }}
          </div>
          <div class="text-sm text-gray-600">Barzahlung</div>
          
          <!-- Preisaufschlüsselung (falls verfügbar) -->
          <div v-if="payment.metadata?.price_breakdown" class="mt-3 text-xs text-gray-500 space-y-1">
            <div>Lektion: CHF {{ (payment.metadata.price_breakdown.lesson_price_rappen / 100).toFixed(2) }}</div>
            <div v-if="payment.metadata.price_breakdown.products_price_rappen > 0">
              Produkte: CHF {{ (payment.metadata.price_breakdown.products_price_rappen / 100).toFixed(2) }}
            </div>
            <div v-if="payment.metadata.price_breakdown.admin_fee_rappen > 0" class="text-orange-600 font-medium">
              Admin-Fee: CHF {{ (payment.metadata.price_breakdown.admin_fee_rappen / 100).toFixed(2) }}
            </div>
            <div v-if="payment.metadata.price_breakdown.discount_amount_rappen > 0" class="text-green-600">
              Rabatt: -CHF {{ (payment.metadata.price_breakdown.discount_amount_rappen / 100).toFixed(2) }}
            </div>
          </div>
        </div>

        <!-- Einfache Frage -->
        <div class="text-center mb-6">
          <p class="text-gray-700">
            Wurde die Barzahlung bereits geleistet?
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-3">
          <button
            @click="confirmPayment"
            :disabled="isProcessing"
            class="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isProcessing">Wird bestätigt...</span>
            <span v-else>✅ Ja, bestätigen</span>
          </button>
          
          <button
            @click="closeModal"
            :disabled="isProcessing"
            class="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors disabled:opacity-50"
          >
            Später
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
interface Props {
  isVisible: boolean
  payment: any
  currentUserId: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'payment-confirmed': [payment: any]
  'close': []
}>()

// State
const isProcessing = ref(false)

// Methods
const closeModal = () => {
  if (!isProcessing.value) {
    emit('close')
  }
}

const confirmPayment = async () => {
  console.log('💰 [CashPayment] confirmPayment called')
  console.log('💰 [CashPayment] props.payment:', props.payment)
  console.log('💰 [CashPayment] props.currentUserId:', props.currentUserId)
  
  if (!props.payment?.id || !props.currentUserId) {
    console.error('❌ [CashPayment] Missing payment.id or currentUserId - returning')
    return
  }
  
  isProcessing.value = true
  console.log('💰 [CashPayment] isProcessing set to true')
  
  try {
    console.log('💰 [CashPayment] Starting payment confirmation for:', props.payment.id)
    console.log('💰 [CashPayment] tenant_id:', props.payment.tenant_id)
    console.log('💰 [CashPayment] payment_status:', props.payment.payment_status)
    console.log('💰 [CashPayment] total_amount_rappen:', props.payment.total_amount_rappen)
    
    // Direkt in der Datenbank speichern
    const supabase = getSupabase()
    console.log('💰 [CashPayment] Supabase client created')
    
    const updateData = {
      payment_status: 'completed',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('💰 [CashPayment] Update data:', updateData)
    
    // Payment als completed markieren
    const { data, error: paymentError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', props.payment.id)
      .eq('tenant_id', props.payment.tenant_id) // ← RLS Filter erforderlich
      .select() // Return the updated row
    
    console.log('💰 [CashPayment] Update response:', { data, error: paymentError })
    
    if (paymentError) {
      console.error('❌ [CashPayment] Supabase error:', paymentError)
      throw paymentError
    }
    
    console.log('✅ [CashPayment] Cash payment confirmed successfully')
    console.log('✅ [CashPayment] Updated data:', data)
    
    // Emit success
    emit('payment-confirmed', props.payment)
    console.log('✅ [CashPayment] Emitted payment-confirmed event')
    
    // Close modal
    closeModal()
    console.log('✅ [CashPayment] Modal closed')
    
  } catch (error: any) {
    console.error('❌ [CashPayment] Cash payment confirmation failed:', error)
    console.error('❌ [CashPayment] Error message:', error.message)
    console.error('❌ [CashPayment] Error details:', error)
    alert(`Fehler bei der Zahlungsbestätigung: ${error.message}`)
  } finally {
    isProcessing.value = false
    console.log('💰 [CashPayment] isProcessing set to false')
  }
}
</script>
