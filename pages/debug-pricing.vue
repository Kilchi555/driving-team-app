<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Pricing Database Debug</h1>
    
    <div class="space-y-4">
      <!-- Raw Database Query -->
      <div class="bg-red-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">Raw Database Query</h2>
        <button 
          @click="queryRawDatabase" 
          class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Query Raw Database
        </button>
        <div v-if="rawDatabaseResult" class="mt-2 text-sm">
          <pre class="bg-gray-100 p-2 rounded overflow-auto max-h-96 text-black">{{ rawDatabaseResult }}</pre>
        </div>
      </div>

      <!-- Test Specific Category -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">Test Specific Category</h2>
        <div class="space-y-2">
          <div>
            <label class="block text-sm font-medium">Category:</label>
            <input v-model="testCategory" type="text" class="border rounded px-2 py-1" placeholder="B" />
          </div>
          <button 
            @click="testSpecificCategory" 
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Category
          </button>
        </div>
        <div v-if="categoryTestResult" class="mt-2 text-sm">
          <pre class="bg-gray-100 p-2 rounded text-black">{{ categoryTestResult }}</pre>
        </div>
      </div>

      <!-- Test Price Calculation -->
      <div class="bg-green-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">Test Price Calculation</h2>
        <div class="space-y-2">
          <div>
            <label class="block text-sm font-medium">Category:</label>
            <input v-model="calcCategory" type="text" class="border rounded px-2 py-1" placeholder="B" />
          </div>
          <div>
            <label class="block text-sm font-medium">Duration (minutes):</label>
            <input v-model="calcDuration" type="number" class="border rounded px-2 py-1" value="45" />
          </div>
          <div>
            <label class="block text-sm font-medium">User ID (optional):</label>
            <input v-model="calcUserId" type="text" class="border rounded px-2 py-1" placeholder="user-id" />
          </div>
          <button 
            @click="testPriceCalculation" 
            class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Calculate Price
          </button>
        </div>
        <div v-if="calculationResult" class="mt-2 text-sm">
          <pre class="bg-gray-100 p-2 rounded text-black">{{ calculationResult }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { usePricing } from '~/composables/usePricing'

// State
const rawDatabaseResult = ref('')
const categoryTestResult = ref('')
const calculationResult = ref('')
const testCategory = ref('B')
const calcCategory = ref('B')
const calcDuration = ref(45)
const calcUserId = ref('')

// Pricing composable
const { loadPricingRules, calculatePrice, getPricingRule, pricingRules } = usePricing()

// Functions
const queryRawDatabase = async () => {
  try {
    logger.debug('🔍 Querying raw database...')
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('category_code')

    if (error) {
      console.error('❌ Database error:', error)
      rawDatabaseResult.value = JSON.stringify({ error: error.message }, null, 2)
      return
    }

    logger.debug('📊 Raw database result:', data)
    rawDatabaseResult.value = JSON.stringify({
      count: data?.length || 0,
      data: data
    }, null, 2)

  } catch (error) {
    console.error('❌ Error querying database:', error)
    rawDatabaseResult.value = JSON.stringify({ error: error.message }, null, 2)
  }
}

const testSpecificCategory = async () => {
  try {
    logger.debug('🔍 Testing specific category:', testCategory.value)
    
    // First load pricing rules
    await loadPricingRules(true)
    
    // Then test the specific category
    const rule = getPricingRule(testCategory.value)
    
    categoryTestResult.value = JSON.stringify({
      category: testCategory.value,
      ruleFound: !!rule,
      rule: rule ? {
        id: rule.id,
        category_code: rule.category_code,
        price_per_minute_rappen: rule.price_per_minute_rappen,
        price_per_minute_chf: rule.price_per_minute_rappen / 100,
        admin_fee_rappen: rule.admin_fee_rappen,
        admin_fee_chf: rule.admin_fee_rappen / 100,
        admin_fee_applies_from: rule.admin_fee_applies_from
      } : null,
      allRules: pricingRules.value.map(r => ({
        category: r.category_code,
        pricePerMinute: r.price_per_minute_rappen / 100,
        adminFee: r.admin_fee_rappen / 100
      }))
    }, null, 2)

  } catch (error) {
    console.error('❌ Error testing category:', error)
    categoryTestResult.value = JSON.stringify({ error: error.message }, null, 2)
  }
}

const testPriceCalculation = async () => {
  try {
    logger.debug('🔍 Testing price calculation for:', calcCategory.value, calcDuration.value, 'User:', calcUserId.value || 'none')
    
    const result = await calculatePrice(calcCategory.value, calcDuration.value, calcUserId.value || undefined)
    
    calculationResult.value = JSON.stringify({
      category: calcCategory.value,
      duration: calcDuration.value,
      userId: calcUserId.value || 'none',
      result: {
        base_price_rappen: result.base_price_rappen,
        base_price_chf: result.base_price_chf,
        admin_fee_rappen: result.admin_fee_rappen,
        admin_fee_chf: result.admin_fee_chf,
        total_rappen: result.total_rappen,
        total_chf: result.total_chf,
        appointment_number: result.appointment_number
      }
    }, null, 2)

  } catch (error: any) {
    console.error('❌ Error calculating price:', error)
    calculationResult.value = JSON.stringify({ error: error.message }, null, 2)
  }
}
</script>
