<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Simple Pricing Test</h1>
    
    <div class="space-y-4">
      <!-- Simple Price Display Test -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h2 class="text-lg font-semibold mb-2">PriceDisplay Test</h2>
        
        <div class="space-y-2 mb-4">
          <div>
            <label class="block text-sm font-medium">Student Category:</label>
            <select v-model="testCategory" class="border rounded px-2 py-1">
              <option value="B">B - Auto</option>
              <option value="A">A - Motorrad</option>
              <option value="BE">BE - Anhänger</option>
              <option value="C">C - LKW</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium">Duration (minutes):</label>
            <input v-model="testDuration" type="number" class="border rounded px-2 py-1" value="45" />
          </div>
          <div>
            <label class="block text-sm font-medium">Price per minute:</label>
            <input v-model="testPricePerMinute" type="number" step="0.01" class="border rounded px-2 py-1" value="2.11" />
          </div>
          <div>
            <label class="block text-sm font-medium">Admin Fee:</label>
            <input v-model="testAdminFee" type="number" step="0.01" class="border rounded px-2 py-1" value="120" />
          </div>
        </div>
        
        <div class="bg-white p-4 rounded border">
          <PriceDisplay
            :event-type="'lesson'"
            :duration-minutes="testDuration"
            :price-per-minute="testPricePerMinute"
            :admin-fee="testAdminFee"
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
import { ref, watch } from 'vue'
import PriceDisplay from '~/components/PriceDisplay.vue'

// Test state
const testCategory = ref('B')
const testDuration = ref(45)
const testPricePerMinute = ref(2.11)
const testAdminFee = ref(120)

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

// Watch for category changes
watch(testCategory, (newCategory) => {
  mockStudent.value.category = newCategory
})
</script>
