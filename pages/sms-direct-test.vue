<template>
  <div class="container mx-auto p-8">
    <h1 class="text-2xl font-bold mb-6">SMS Direct Test</h1>
    
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-lg font-semibold mb-4">Direct Database Test</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            v-model="phoneNumber"
            type="tel"
            placeholder="+41791234567"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            v-model="message"
            rows="3"
            placeholder="Test message"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          ></textarea>
        </div>
        
        <div class="flex space-x-4">
          <button
            @click="sendDirectSms"
            :disabled="isLoading"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isLoading ? 'Sending...' : 'Send Direct SMS' }}
          </button>
          
          <button
            @click="testDatabaseConnection"
            :disabled="isLoading"
            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Test DB Connection
          </button>
        </div>
      </div>
      
      <div v-if="result" class="mt-6 p-4 bg-gray-100 rounded-md">
        <h3 class="font-semibold">Result:</h3>
        <pre class="text-sm">{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
      
      <div v-if="error" class="mt-6 p-4 bg-red-100 text-red-700 rounded-md">
        <h3 class="font-semibold">Error:</h3>
        <p>{{ error }}</p>
      </div>
    </div>
    
    <div class="mt-8 bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-lg font-semibold mb-4">SMS Logs ({{ smsLogs.length }})</h2>
      <button
        @click="loadSmsLogs"
        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mb-4"
      >
        Load SMS Logs
      </button>
      
      <div v-if="smsLogs.length > 0" class="overflow-x-auto">
        <table class="min-w-full table-auto">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-4 py-2 text-left">Phone</th>
              <th class="px-4 py-2 text-left">Message</th>
              <th class="px-4 py-2 text-left">Status</th>
              <th class="px-4 py-2 text-left">Sent At</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in smsLogs" :key="log.id" class="border-t">
              <td class="px-4 py-2">{{ log.to_phone }}</td>
              <td class="px-4 py-2">{{ log.message.substring(0, 50) }}...</td>
              <td class="px-4 py-2">
                <span :class="log.status === 'simulated' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'" 
                      class="px-2 py-1 rounded-full text-xs">
                  {{ log.status }}
                </span>
              </td>
              <td class="px-4 py-2">{{ new Date(log.sent_at).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-else-if="smsLogsLoaded" class="text-gray-500">
        No SMS logs found
      </div>
    </div>
  </div>
</template>

<script setup>
import { logger } from '~/utils/logger'

import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

const phoneNumber = ref('+41791234567')
const message = ref('Test SMS from Driving Team App')
const isLoading = ref(false)
const result = ref(null)
const error = ref(null)
const smsLogs = ref([])
const smsLogsLoaded = ref(false)

const sendDirectSms = async () => {
  if (!phoneNumber.value || !message.value) {
    error.value = 'Please fill in both phone number and message'
    return
  }
  
  isLoading.value = true
  error.value = null
  result.value = null
  
  try {
    logger.debug('📱 Sending direct SMS:', { phoneNumber: phoneNumber.value, message: message.value })
    
    // Direkt in die Datenbank schreiben
    const { data, error: dbError } = await supabase
      .from('sms_logs')
      .insert({
        to_phone: phoneNumber.value,
        message: message.value,
        twilio_sid: 'direct_' + Date.now(),
        status: 'simulated',
        sent_at: new Date().toISOString()
      })
      .select()
    
    if (dbError) {
      console.error('❌ Database error:', dbError)
      error.value = 'Database error: ' + dbError.message
      return
    }
    
    logger.debug('✅ SMS saved to database:', data)
    result.value = { success: true, data: data[0] }
    
    // Reload SMS logs
    await loadSmsLogs()
    
  } catch (err) {
    console.error('❌ Error:', err)
    error.value = err.message || 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const testDatabaseConnection = async () => {
  isLoading.value = true
  error.value = null
  result.value = null
  
  try {
    logger.debug('🔍 Testing database connection...')
    
    const { data, error: dbError } = await supabase
      .from('sms_logs')
      .select('count')
      .limit(1)
    
    if (dbError) {
      console.error('❌ Database connection error:', dbError)
      error.value = 'Database connection failed: ' + dbError.message
    } else {
      logger.debug('✅ Database connection successful')
      result.value = { success: true, message: 'Database connection successful' }
    }
    
  } catch (err) {
    console.error('❌ Connection test error:', err)
    error.value = err.message || 'Connection test failed'
  } finally {
    isLoading.value = false
  }
}

const loadSmsLogs = async () => {
  try {
    logger.debug('📋 Loading SMS logs...')
    
    const { data, error: dbError } = await supabase
      .from('sms_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20)
    
    if (dbError) {
      console.error('❌ Error loading SMS logs:', dbError)
      error.value = 'Failed to load SMS logs: ' + dbError.message
      return
    }
    
    logger.debug('✅ SMS logs loaded:', data)
    smsLogs.value = data || []
    smsLogsLoaded.value = true
    
  } catch (err) {
    console.error('❌ Error loading SMS logs:', err)
    error.value = 'Failed to load SMS logs: ' + err.message
  }
}

// Load SMS logs on page load
onMounted(() => {
  loadSmsLogs()
})
</script>
