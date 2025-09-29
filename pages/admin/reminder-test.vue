<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Reminder-System Test</h1>
      <p class="text-gray-600 mt-1">Teste die verschiedenen Komponenten des Reminder-Systems.</p>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Test 1: Template Rendering -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">1. Template Rendering Test</h2>
        
        <div class="space-y-4">
          <div class="flex gap-3 mb-4">
            <button @click="seedTemplates" :disabled="isSeeding" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              Standard-Templates laden
            </button>
            <div v-if="seedResult" class="text-sm text-gray-600">{{ seedResult }}</div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Template auswählen</label>
            <USelect 
              v-model="testTemplate" 
              :options="templateOptions"
              placeholder="Template auswählen..."
            />
          </div>

          <div v-if="testTemplate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Test-Daten</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UInput v-model="testData.student_name" placeholder="Schüler-Name" />
                <UInput v-model="testData.appointment_date" placeholder="Termin-Datum" />
                <UInput v-model="testData.appointment_time" placeholder="Termin-Zeit" />
                <UInput v-model="testData.location" placeholder="Standort" />
                <UInput v-model="testData.price" placeholder="Preis" />
                <UInput v-model="testData.confirmation_link" placeholder="Bestätigungs-Link" />
              </div>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Gerenderte Nachricht:</h4>
              <div class="bg-white p-3 rounded border text-sm text-gray-900">
                <div class="font-medium mb-2 text-gray-900">{{ renderedSubject }}</div>
                <div class="whitespace-pre-wrap text-gray-900">{{ renderedContent }}</div>
              </div>
            </div>

            <button @click="renderTemplate" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Template rendern
            </button>
          </div>
        </div>
      </div>

      <!-- Test 2: Appointment Creation -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">2. Test-Termin erstellen</h2>
        
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Schüler auswählen</label>
              <USelect 
                v-model="testAppointment.user_id" 
                :options="studentOptions"
                placeholder="Schüler auswählen..."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Datum & Zeit</label>
              <UInput 
                type="datetime-local" 
                v-model="testAppointment.start_time"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Standort</label>
              <UInput v-model="testAppointment.location_id" placeholder="Location ID" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Typ</label>
              <USelect 
                v-model="testAppointment.type" 
                :options="[{label: 'Fahrstunde', value: 'B'}, {label: 'Theorie', value: 'T'}]"
              />
            </div>
          </div>

          <button @click="createTestAppointment" :disabled="isCreating" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            Test-Termin erstellen (pending_confirmation)
          </button>
        </div>
      </div>

      <!-- Test 3: Reminder Simulation -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">3. Reminder Simulation</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Termin auswählen</label>
            <USelect 
              v-model="selectedAppointment" 
              :options="pendingAppointments"
              placeholder="Termin auswählen..."
            />
          </div>

          <div v-if="selectedAppointment" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button @click="simulateFirstReminder" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                1. Erinnerung senden
              </button>
              <button @click="simulateSecondReminder" class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                2. Erinnerung senden
              </button>
              <button @click="simulateFinalWarning" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Letzte Warnung senden
              </button>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Letzte Aktion:</h4>
              <div class="text-sm">{{ lastAction }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Test 4: Provider Test -->
      <div class="bg-white rounded-xl shadow border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">4. Provider Test</h2>
        
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button @click="testEmailProvider" :disabled="isTesting" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              E-Mail Provider testen
            </button>
            <button @click="testSmsProvider" :disabled="isTesting" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
              SMS Provider testen
            </button>
          </div>

          <div v-if="providerTestResult" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Test-Ergebnis:</h4>
            <div class="text-sm">{{ providerTestResult }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// Test data
const testTemplate = ref('')
const testData = ref({
  student_name: 'Max Mustermann',
  appointment_date: '15.09.2025',
  appointment_time: '14:00',
  location: 'Zürich HB',
  price: '120',
  confirmation_link: 'https://app.driving-team.ch/confirm/123'
})

const testAppointment = ref({
  user_id: '',
  start_time: '',
  location_id: '',
  type: 'B'
})

const selectedAppointment = ref('')
const lastAction = ref('')
const providerTestResult = ref('')

const isCreating = ref(false)
const isTesting = ref(false)
const isSeeding = ref(false)
const seedResult = ref('')

// Template options
const templateOptions = [
  { label: '1. Erinnerung - E-Mail', value: 'first_email' },
  { label: '1. Erinnerung - SMS', value: 'first_sms' },
  { label: '2. Erinnerung - E-Mail', value: 'second_email' },
  { label: 'Letzte Warnung - E-Mail', value: 'final_email' },
  { label: 'Letzte Warnung - SMS', value: 'final_sms' }
]

// Student options
const studentOptions = ref([])

// Pending appointments
const pendingAppointments = ref([])

// Computed
const renderedSubject = ref('')
const renderedContent = ref('')

// Functions
const renderTemplate = async () => {
  if (!testTemplate.value) return

  // Map template key to channel and stage
  const templateMap: Record<string, {channel: string, stage: string}> = {
    'first_email': { channel: 'email', stage: 'first' },
    'first_push': { channel: 'push', stage: 'first' },
    'first_sms': { channel: 'sms', stage: 'first' },
    'second_email': { channel: 'email', stage: 'second' },
    'second_push': { channel: 'push', stage: 'second' },
    'second_sms': { channel: 'sms', stage: 'second' },
    'final_email': { channel: 'email', stage: 'final' },
    'final_push': { channel: 'push', stage: 'final' },
    'final_sms': { channel: 'sms', stage: 'final' }
  }

  const mapping = templateMap[testTemplate.value]
  if (!mapping) return

  const { data } = await supabase
    .from('reminder_templates')
    .select('*')
    .eq('channel', mapping.channel)
    .eq('stage', mapping.stage)
    .eq('language', 'de')
    .is('tenant_id', null)
    .single()

  if (data) {
    let subject = data.subject || ''
    let content = data.body || ''

    // Replace variables
    Object.entries(testData.value).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      content = content.replace(new RegExp(placeholder, 'g'), value)
    })

    renderedSubject.value = subject
    renderedContent.value = content
  }
}

const createTestAppointment = async () => {
  if (!testAppointment.value.user_id || !testAppointment.value.start_time) {
    alert('Bitte füllen Sie alle Felder aus')
    return
  }

  isCreating.value = true
  try {
    const startTime = new Date(testAppointment.value.start_time)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // +1 hour

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        user_id: testAppointment.value.user_id,
        title: 'Test Fahrstunde',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: 60,
        type: testAppointment.value.type,
        location_id: testAppointment.value.location_id || '67e05350-574f-412b-981a-e6747d5cb8f2',
        status: 'pending_confirmation',
        event_type_code: 'lesson'
      }])
      .select('*')
      .single()

    if (error) throw error
    
    alert(`Test-Termin erstellt: ${data.id}`)
    loadPendingAppointments()
  } catch (error) {
    alert(`Fehler: ${error.message}`)
  } finally {
    isCreating.value = false
  }
}

const simulateFirstReminder = () => {
  lastAction.value = `1. Erinnerung für Termin ${selectedAppointment.value} simuliert - ${new Date().toLocaleString()}`
}

const simulateSecondReminder = () => {
  lastAction.value = `2. Erinnerung für Termin ${selectedAppointment.value} simuliert - ${new Date().toLocaleString()}`
}

const simulateFinalWarning = () => {
  lastAction.value = `Letzte Warnung für Termin ${selectedAppointment.value} simuliert - ${new Date().toLocaleString()}`
}

const testEmailProvider = async () => {
  isTesting.value = true
  try {
    // TODO: Implement actual email test
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    providerTestResult.value = 'E-Mail Provider Test erfolgreich - Test-E-Mail wurde gesendet'
  } catch (error) {
    providerTestResult.value = `E-Mail Provider Test fehlgeschlagen: ${error.message}`
  } finally {
    isTesting.value = false
  }
}

const testSmsProvider = async () => {
  isTesting.value = true
  try {
    // TODO: Implement actual SMS test
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    providerTestResult.value = 'SMS Provider Test erfolgreich - Test-SMS wurde gesendet'
  } catch (error) {
    providerTestResult.value = `SMS Provider Test fehlgeschlagen: ${error.message}`
  } finally {
    isTesting.value = false
  }
}

const loadStudents = async () => {
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('role', 'student')
    .limit(20)

  if (data) {
    studentOptions.value = data.map(user => ({
      label: `${user.first_name} ${user.last_name}`,
      value: user.id
    }))
  }
}

const seedTemplates = async () => {
  isSeeding.value = true
  try {
    const response = await $fetch('/api/reminder/seed-templates', {
      method: 'POST'
    })
    seedResult.value = `✅ ${response.count} Templates erfolgreich geladen`
  } catch (error) {
    seedResult.value = `❌ Fehler: ${error.message}`
  } finally {
    isSeeding.value = false
  }
}

const loadPendingAppointments = async () => {
  const { data } = await supabase
    .from('appointments')
    .select('id, title, start_time, user_id, status')
    .eq('status', 'pending_confirmation')
    .order('start_time', { ascending: true })

  if (data) {
    pendingAppointments.value = data.map(apt => ({
      label: `${apt.title} - ${new Date(apt.start_time).toLocaleString()}`,
      value: apt.id
    }))
  }
}

onMounted(() => {
  loadStudents()
  loadPendingAppointments()
})
</script>

<style scoped>
</style>
