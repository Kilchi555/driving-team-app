<template>
  <div class="container mx-auto p-8">
    <h1 class="text-2xl font-bold mb-6">Debug Other Event Types</h1>
    
    <!-- Test SMS Service -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-lg font-semibold mb-4">1. SMS Service Test</h2>
      <div class="space-y-4">
        <div class="flex space-x-4">
          <button
            @click="testSmsService"
            :disabled="isLoading"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Test SMS Service
          </button>
          <button
            @click="loadSmsLogs"
            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Load SMS Logs
          </button>
        </div>
        <div v-if="smsResult" class="p-4 bg-gray-100 rounded-md">
          <pre class="text-sm">{{ JSON.stringify(smsResult, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Test Customer Invite Selector -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-lg font-semibold mb-4">2. Customer Invite Selector Test</h2>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">First Name</label>
            <input
              v-model="testCustomer.first_name"
              type="text"
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              v-model="testCustomer.last_name"
              type="text"
              class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Phone</label>
          <input
            v-model="testCustomer.phone"
            type="tel"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div class="flex space-x-4">
          <button
            @click="testCustomerInvite"
            :disabled="isLoading"
            class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Test Customer Invite
          </button>
          <button
            @click="loadInvitedCustomers"
            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Load Invited Customers
          </button>
        </div>
        <div v-if="customerResult" class="p-4 bg-gray-100 rounded-md">
          <pre class="text-sm">{{ JSON.stringify(customerResult, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Test Event Modal Form -->
    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 class="text-lg font-semibold mb-4">3. Event Modal Form Test</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Event Type</label>
          <select
            v-model="testEventType"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="meeting">Meeting</option>
            <option value="break">Break</option>
            <option value="training">Training</option>
            <option value="maintenance">Maintenance</option>
            <option value="admin">Admin</option>
            <option value="team_invite">Team Invite</option>
          </select>
        </div>
        <div class="flex space-x-4">
          <button
            @click="testEventForm"
            :disabled="isLoading"
            class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            Test Event Form
          </button>
          <button
            @click="loadExistingAppointment"
            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Load Existing Appointment
          </button>
        </div>
        <div v-if="eventResult" class="p-4 bg-gray-100 rounded-md">
          <pre class="text-sm">{{ JSON.stringify(eventResult, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Display Results -->
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-lg font-semibold mb-4">Results</h2>
      <div class="space-y-4">
        <div>
          <h3 class="font-medium">SMS Logs ({{ smsLogs.length }})</h3>
          <div v-if="smsLogs.length > 0" class="overflow-x-auto">
            <table class="min-w-full table-auto text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-2 py-1 text-left">Phone</th>
                  <th class="px-2 py-1 text-left">Status</th>
                  <th class="px-2 py-1 text-left">Sent At</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in smsLogs" :key="log.id" class="border-t">
                  <td class="px-2 py-1">{{ log.to_phone }}</td>
                  <td class="px-2 py-1">
                    <span :class="log.status === 'simulated' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'" 
                          class="px-2 py-1 rounded-full text-xs">
                      {{ log.status }}
                    </span>
                  </td>
                  <td class="px-2 py-1">{{ new Date(log.sent_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-gray-500">No SMS logs found</div>
        </div>

        <div>
          <h3 class="font-medium">Invited Customers ({{ invitedCustomers.length }})</h3>
          <div v-if="invitedCustomers.length > 0" class="overflow-x-auto">
            <table class="min-w-full table-auto text-sm">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-2 py-1 text-left">Name</th>
                  <th class="px-2 py-1 text-left">Phone</th>
                  <th class="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="customer in invitedCustomers" :key="customer.id" class="border-t">
                  <td class="px-2 py-1">{{ customer.first_name }} {{ customer.last_name }}</td>
                  <td class="px-2 py-1">{{ customer.phone }}</td>
                  <td class="px-2 py-1">{{ customer.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-gray-500">No invited customers found</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSmsService } from '~/composables/useSmsService'
import { getSupabase } from '~/utils/supabase'

const { sendSms } = useSmsService()
const supabase = getSupabase()

const isLoading = ref(false)
const smsResult = ref(null)
const customerResult = ref(null)
const eventResult = ref(null)
const smsLogs = ref([])
const invitedCustomers = ref([])

const testCustomer = ref({
  first_name: 'Test',
  last_name: 'Customer',
  phone: '+41791234567',
  category: 'B',
  notes: 'Test customer'
})

const testEventType = ref('meeting')

const testSmsService = async () => {
  isLoading.value = true
  smsResult.value = null
  
  try {
    const result = await sendSms('+41791234567', 'Test SMS from debug page')
    smsResult.value = result
    await loadSmsLogs()
  } catch (error) {
    smsResult.value = { error: error.message }
  } finally {
    isLoading.value = false
  }
}

const testCustomerInvite = async () => {
  isLoading.value = true
  customerResult.value = null
  
  try {
    // Simulate appointment data
    const appointmentData = {
      id: 'test-appointment-' + Date.now(),
      title: 'Test Meeting',
      type: testEventType.value,
      start_time: new Date().toISOString()
    }
    
    // Create invited customer record
    const { data, error } = await supabase
      .from('invited_customers')
      .insert({
        first_name: testCustomer.value.first_name,
        last_name: testCustomer.value.last_name,
        phone: testCustomer.value.phone,
        category: testCustomer.value.category,
        notes: testCustomer.value.notes,
        appointment_id: appointmentData.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Send SMS
    const smsMessage = `Hallo ${testCustomer.value.first_name}! Du wurdest zu einem ${testEventType.value} eingeladen.`
    const smsResult = await sendSms(testCustomer.value.phone, smsMessage)
    
    customerResult.value = {
      customer: data,
      sms: smsResult
    }
    
    await loadInvitedCustomers()
    await loadSmsLogs()
    
  } catch (error) {
    customerResult.value = { error: error.message }
  } finally {
    isLoading.value = false
  }
}

const testEventForm = async () => {
  isLoading.value = true
  eventResult.value = null
  
  try {
    // Test event type detection
    const isLessonType = (eventType) => {
      return ['lesson', 'exam', 'theory'].includes(eventType)
    }
    
    const isOtherEvent = !isLessonType(testEventType.value)
    
    eventResult.value = {
      eventType: testEventType.value,
      isLessonType: isLessonType(testEventType.value),
      isOtherEvent: isOtherEvent,
      shouldShowEventTypeSelector: isOtherEvent,
      shouldShowStudentSelector: isLessonType(testEventType.value),
      shouldShowStaffSelector: isOtherEvent,
      shouldShowCustomerInviteSelector: isOtherEvent
    }
    
  } catch (error) {
    eventResult.value = { error: error.message }
  } finally {
    isLoading.value = false
  }
}

const loadExistingAppointment = async () => {
  try {
    // Load a sample appointment
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('type', 'meeting')
      .limit(1)
      .single()
    
    if (error) throw error
    
    eventResult.value = {
      appointment: data,
      eventType: data.type,
      eventTypeCode: data.event_type_code,
      isLessonType: ['lesson', 'exam', 'theory'].includes(data.type),
      isOtherEvent: !['lesson', 'exam', 'theory'].includes(data.type)
    }
    
  } catch (error) {
    eventResult.value = { error: error.message }
  }
}

const loadSmsLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    smsLogs.value = data || []
  } catch (error) {
    console.error('Error loading SMS logs:', error)
  }
}

const loadInvitedCustomers = async () => {
  try {
    const { data, error } = await supabase
      .from('invited_customers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    invitedCustomers.value = data || []
  } catch (error) {
    console.error('Error loading invited customers:', error)
  }
}

// Load data on mount
onMounted(() => {
  loadSmsLogs()
  loadInvitedCustomers()
})
</script>
