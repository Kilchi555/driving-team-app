<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Pricing System Test</h1>
    
    <div class="space-y-4">
      <!-- Test Pricing Rules Loading -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">Pricing Rules Test</h2>
        <button 
          @click="testPricingRules" 
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test Pricing Rules Loading
        </button>
        <div v-if="pricingTestResult" class="mt-2 text-sm">
          <pre>{{ pricingTestResult }}</pre>
        </div>
      </div>

      <!-- Test Price Calculation -->
      <div class="bg-green-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">Price Calculation Test</h2>
        <div class="space-y-2">
          <div>
            <label class="block text-sm font-medium">Category:</label>
            <select v-model="testCategory" class="border rounded px-2 py-1">
              <option value="B">B - Auto</option>
              <option value="A">A - Motorrad</option>
              <option value="BE">BE - Anhänger</option>
              <option value="C">C - LKW</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium">Duration (minutes):</label>
            <input v-model="testDuration" type="number" class="border rounded px-2 py-1" />
          </div>
          <button 
            @click="testPriceCalculation" 
            class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Calculate Price
          </button>
        </div>
        <div v-if="priceCalculationResult" class="mt-2 text-sm">
          <pre>{{ priceCalculationResult }}</pre>
        </div>
      </div>

      <!-- Test PriceDisplay Component -->
      <div class="bg-yellow-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">PriceDisplay Component Test</h2>
        <div class="space-y-2">
          <div>
            <label class="block text-sm font-medium">Student Category:</label>
            <select v-model="testStudentCategory" class="border rounded px-2 py-1">
              <option value="B">B - Auto</option>
              <option value="A">A - Motorrad</option>
              <option value="BE">BE - Anhänger</option>
              <option value="C">C - LKW</option>
            </select>
          </div>
          <button 
            @click="testPriceDisplay" 
            class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Test PriceDisplay
          </button>
        </div>
        <div v-if="showPriceDisplay" class="mt-4">
          <PriceDisplay
            :event-type="'lesson'"
            :duration-minutes="45"
            :price-per-minute="2.11"
            :selected-student="mockStudent"
            :current-user="mockUser"
            :event-data="mockEventData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePricing } from '~/composables/usePricing'
import PriceDisplay from '~/components/PriceDisplay.vue'

// Test state
const pricingTestResult = ref('')
const priceCalculationResult = ref('')
const testCategory = ref('B')
const testDuration = ref(45)
const testStudentCategory = ref('B')
const showPriceDisplay = ref(false)

// Mock data
const mockStudent = ref({
  id: 'test-student',
  first_name: 'Test',
  last_name: 'Student',
  category: 'B'
})

const mockUser = ref({
  id: 'test-user',
  role: 'staff'
})

const mockEventData = ref({
  id: 'test-event',
  title: 'Test Lesson'
})

// Pricing composable
const { loadPricingRules, calculatePrice, pricingRules, isLoadingPrices, pricingError } = usePricing()

// Test functions
const testPricingRules = async () => {
  try {
    logger.debug('🧪 Testing pricing rules loading...')
    await loadPricingRules(true) // Force reload
    
    pricingTestResult.value = JSON.stringify({
      success: true,
      rulesCount: pricingRules.value.length,
      rules: pricingRules.value.map(r => ({
        category: r.category_code,
        pricePerMinute: r.price_per_minute_rappen / 100,
        adminFee: r.admin_fee_rappen / 100,
        adminFeeAppliesFrom: r.admin_fee_applies_from,
        ruleName: r.rule_name
      })),
      isLoading: isLoadingPrices.value,
      error: pricingError.value
    }, null, 2)
    
    logger.debug('✅ Pricing rules test completed')
  } catch (error) {
    console.error('❌ Pricing rules test failed:', error)
    pricingTestResult.value = JSON.stringify({
      success: false,
      error: error.message
    }, null, 2)
  }
}

const testPriceCalculation = async () => {
  try {
    logger.debug('🧪 Testing price calculation...')
    const result = await calculatePrice(testCategory.value, testDuration.value)
    
    priceCalculationResult.value = JSON.stringify({
      success: true,
      category: testCategory.value,
      duration: testDuration.value,
      result: {
        basePriceChf: result.base_price_chf,
        adminFeeChf: result.admin_fee_chf,
        totalChf: result.total_chf,
        appointmentNumber: result.appointment_number
      }
    }, null, 2)
    
    logger.debug('✅ Price calculation test completed')
  } catch (error) {
    console.error('❌ Price calculation test failed:', error)
    priceCalculationResult.value = JSON.stringify({
      success: false,
      error: error.message
    }, null, 2)
  }
}

const testPriceDisplay = () => {
  logger.debug('🧪 Testing PriceDisplay component...')
  mockStudent.value.category = testStudentCategory.value
  showPriceDisplay.value = true
  
  // ✅ NEU: Warte kurz und zeige dann die geladenen Preise
  setTimeout(() => {
    logger.debug('💰 PriceDisplay test - Student category:', testStudentCategory.value)
    logger.debug('💰 PriceDisplay test - Mock student:', mockStudent.value)
  }, 1000)
  
  logger.debug('✅ PriceDisplay test completed')
}
</script>
