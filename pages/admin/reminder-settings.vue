<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Erinnerungseinstellungen</h1>
      <p class="text-gray-600 mt-1">Konfiguriere Erinnerungen für Terminbestätigungen.</p>
    </div>

    <!-- Tab Navigation -->
    <div class="mb-6">
      <nav class="flex space-x-8">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === tab.key 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="bg-white rounded-xl shadow border">
      <!-- Allgemeine Einstellungen -->
      <div v-if="activeTab === 'general'" class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Allgemeine Einstellungen</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-900">Erinnerungen aktiv</span>
            <UToggle v-model="form.is_enabled" color="primary" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm text-gray-700 mb-1">1. Erinnerung (Std. nach Erstellung)</label>
              <UInput type="number" v-model.number="form.first_after_hours" min="1" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">2. Erinnerung (Std. nach Erstellung)</label>
              <UInput type="number" v-model.number="form.second_after_hours" min="1" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Letzte Warnung (Std. nach Erstellung)</label>
              <UInput type="number" v-model.number="form.final_after_hours" min="1" />
            </div>
          </div>

          <!-- Channels -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div>
              <h3 class="font-medium mb-2">1. Erinnerung</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">E‑Mail</span>
                  <UToggle v-model="form.first_email" color="primary" size="sm" />
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">Web Push</span>
                  <UToggle v-model="form.first_push" color="primary" size="sm" />
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">SMS</span>
                  <UToggle v-model="form.first_sms" color="primary" size="sm" />
                </div>
              </div>
            </div>
            <div>
              <h3 class="font-medium mb-2">2. Erinnerung</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">E‑Mail</span>
                  <UToggle v-model="form.second_email" color="primary" size="sm" />
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">Web Push</span>
                  <UToggle v-model="form.second_push" color="primary" size="sm" />
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">SMS</span>
                  <UToggle v-model="form.second_sms" color="primary" size="sm" />
                </div>
              </div>
            </div>
            <div>
              <h3 class="font-medium mb-2">Letzte Warnung</h3>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">E‑Mail</span>
                  <UToggle v-model="form.final_email" color="primary" size="sm" />
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">Web Push</span>
                  <UToggle v-model="form.final_push" color="primary" size="sm" />
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-900">SMS</span>
                  <UToggle v-model="form.final_sms" color="primary" size="sm" />
                </div>
              </div>
            </div>
          </div>

          <!-- Auto delete -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div class="flex items-center justify-between">
              <span class="text-gray-900">Termin nach letzter Warnung automatisch löschen</span>
              <UToggle v-model="form.auto_delete" color="primary" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Zeit bis Löschung (Std. nach Warnung)</label>
              <UInput type="number" v-model.number="form.auto_delete_after_hours" min="1" />
            </div>
          </div>

          <div class="pt-4 flex gap-3">
            <button @click="save" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Speichern</button>
            <button @click="load" :disabled="isSaving" class="px-4 py-2 border rounded">Neu laden</button>
          </div>
        </div>
      </div>

      <!-- E-Mail Provider -->
      <div v-if="activeTab === 'email'" class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">E-Mail Provider (SMTP)</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-700 mb-1">SMTP Host</label>
              <UInput v-model="smtpSettings.host" placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Port</label>
              <UInput type="number" v-model.number="smtpSettings.port" placeholder="587" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Benutzername</label>
              <UInput v-model="smtpSettings.username" placeholder="your-email@gmail.com" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Passwort</label>
              <UInput type="password" v-model="smtpSettings.password" placeholder="••••••••" />
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center justify-between">
                <span class="text-gray-900">SSL/TLS verwenden</span>
                <UToggle v-model="smtpSettings.secure" color="primary" />
              </div>
            </div>
          </div>

          <div class="pt-4 flex gap-3">
            <button @click="saveProviders" :disabled="isSaving" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">E-Mail Provider speichern</button>
            <button @click="testEmail" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">E-Mail testen</button>
          </div>
        </div>
      </div>

      <!-- SMS Provider -->
      <div v-if="activeTab === 'sms'" class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">SMS Provider (Twilio)</h2>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-700 mb-1">Account SID</label>
              <UInput v-model="twilioSettings.account_sid" placeholder="AC..." />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Auth Token</label>
              <UInput type="password" v-model="twilioSettings.auth_token" placeholder="••••••••" />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Von-Nummer</label>
              <UInput v-model="twilioSettings.from_number" placeholder="+41..." />
            </div>
            <div>
              <label class="block text-sm text-gray-700 mb-1">Webhook URL</label>
              <UInput v-model="twilioSettings.webhook_url" placeholder="https://..." />
            </div>
          </div>

          <div class="pt-4 flex gap-3">
            <button @click="saveProviders" :disabled="isSaving" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">SMS Provider speichern</button>
            <button @click="testSms" :disabled="isSaving" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">SMS testen</button>
          </div>
        </div>
      </div>

      <!-- Templates -->
      <div v-if="activeTab === 'templates'" class="p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Template-Editor</h2>
        
        <div class="space-y-6">
          <!-- Template Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Template auswählen</label>
            <USelect 
              v-model="selectedTemplate" 
              :options="templateOptions"
              placeholder="Template auswählen..."
            />
          </div>

          <!-- Template Editor -->
          <div v-if="selectedTemplate" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Betreff</label>
              <UInput v-model="currentTemplate.subject" placeholder="Betreff der E-Mail/SMS" />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nachricht</label>
              <UTextarea 
                v-model="currentTemplate.content" 
                :rows="8"
                placeholder="Nachrichtentext..."
              />
            </div>

            <!-- Available Variables -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Verfügbare Variablen:</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div class="flex items-center gap-2">
                  <code class="bg-white px-2 py-1 rounded border">{{student_name}}</code>
                  <span class="text-gray-600">Schüler-Name</span>
                </div>
                <div class="flex items-center gap-2">
                  <code class="bg-white px-2 py-1 rounded border">{{appointment_date}}</code>
                  <span class="text-gray-600">Termin-Datum</span>
                </div>
                <div class="flex items-center gap-2">
                  <code class="bg-white px-2 py-1 rounded border">{{appointment_time}}</code>
                  <span class="text-gray-600">Termin-Zeit</span>
                </div>
                <div class="flex items-center gap-2">
                  <code class="bg-white px-2 py-1 rounded border">{{location}}</code>
                  <span class="text-gray-600">Standort</span>
                </div>
                <div class="flex items-center gap-2">
                  <code class="bg-white px-2 py-1 rounded border">{{price}}</code>
                  <span class="text-gray-600">Preis</span>
                </div>
                <div class="flex items-center gap-2">
                  <code class="bg-white px-2 py-1 rounded border">{{confirmation_link}}</code>
                  <span class="text-gray-600">Bestätigungs-Link</span>
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Vorschau:</h4>
              <div class="bg-white p-3 rounded border text-sm">
                <div class="font-medium mb-2">{{ currentTemplate.subject || 'Betreff' }}</div>
                <div class="whitespace-pre-wrap">{{ currentTemplate.content || 'Nachrichtentext...' }}</div>
              </div>
            </div>

            <div class="flex gap-3">
              <button @click="saveTemplate" :disabled="isSaving" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Template speichern</button>
              <button @click="resetTemplate" class="px-4 py-2 border rounded hover:bg-gray-50">Zurücksetzen</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
import { ref, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

type Settings = {
  id?: string
  is_enabled: boolean
  first_after_hours: number
  second_after_hours: number
  final_after_hours: number
  first_email: boolean
  first_push: boolean
  first_sms: boolean
  second_email: boolean
  second_push: boolean
  second_sms: boolean
  final_email: boolean
  final_push: boolean
  final_sms: boolean
  auto_delete: boolean
  auto_delete_after_hours: number
}

const supabase = getSupabase()
const isSaving = ref(false)
const activeTab = ref('general')
const form = ref<Settings>({
  is_enabled: false,
  first_after_hours: 24,
  second_after_hours: 48,
  final_after_hours: 72,
  first_email: true,
  first_push: true,
  first_sms: false,
  second_email: true,
  second_push: true,
  second_sms: false,
  final_email: false,
  final_push: false,
  final_sms: true,
  auto_delete: true,
  auto_delete_after_hours: 3
})

// Provider Settings
const smtpSettings = ref({
  host: '',
  port: 587,
  username: '',
  password: '',
  secure: false
})

const twilioSettings = ref({
  account_sid: '',
  auth_token: '',
  from_number: '',
  webhook_url: ''
})

// Tabs configuration
const tabs = [
  {
    key: 'general',
    label: 'Allgemein',
    icon: 'i-heroicons-cog-6-tooth'
  },
  {
    key: 'email',
    label: 'E-Mail Provider',
    icon: 'i-heroicons-envelope'
  },
  {
    key: 'sms',
    label: 'SMS Provider',
    icon: 'i-heroicons-device-phone-mobile'
  },
  {
    key: 'templates',
    label: 'Templates',
    icon: 'i-heroicons-document-text'
  }
]

// Template Editor
const selectedTemplate = ref('')
const currentTemplate = ref({
  subject: '',
  content: ''
})

const templateOptions = [
  { label: '1. Erinnerung - E-Mail', value: 'first_email' },
  { label: '1. Erinnerung - Web Push', value: 'first_push' },
  { label: '1. Erinnerung - SMS', value: 'first_sms' },
  { label: '2. Erinnerung - E-Mail', value: 'second_email' },
  { label: '2. Erinnerung - Web Push', value: 'second_push' },
  { label: '2. Erinnerung - SMS', value: 'second_sms' },
  { label: 'Letzte Warnung - E-Mail', value: 'final_email' },
  { label: 'Letzte Warnung - Web Push', value: 'final_push' },
  { label: 'Letzte Warnung - SMS', value: 'final_sms' }
]

// Default templates
const defaultTemplates = {
  first_email: {
    subject: 'Terminbestätigung erforderlich - {{appointment_date}}',
    content: `Hallo {{student_name}},

bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin hier: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team`
  },
  first_sms: {
    subject: '',
    content: `Hallo {{student_name}}, bitte bestätigen Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr. {{confirmation_link}}`
  },
  second_email: {
    subject: 'Erinnerung: Terminbestätigung noch ausstehend',
    content: `Hallo {{student_name}},

dies ist eine freundliche Erinnerung, dass Sie Ihren Termin am {{appointment_date}} um {{appointment_time}} Uhr noch bestätigen müssen.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin hier: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team`
  },
  final_email: {
    subject: 'Letzte Warnung: Termin wird gelöscht',
    content: `Hallo {{student_name}},

dies ist die letzte Warnung! Ihr Termin am {{appointment_date}} um {{appointment_time}} Uhr wird in 3 Stunden automatisch gelöscht, wenn Sie ihn nicht bestätigen.

Standort: {{location}}
Preis: {{price}} CHF

Bitte bestätigen Sie den Termin JETZT: {{confirmation_link}}

Mit freundlichen Grüßen
Ihr Driving Team`
  },
  final_sms: {
    subject: '',
    content: `LETZTE WARNUNG: Termin am {{appointment_date}} wird in 3h gelöscht! Bestätigen: {{confirmation_link}}`
  }
}

const load = async () => {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!error && data) {
    form.value = { ...form.value, ...data }
  }
}

const loadProviders = async () => {
  // Load SMTP settings
  const { data: smtpData } = await supabase
    .from('reminder_providers')
    .select('*')
    .eq('provider_type', 'smtp')
    .single()

  if (smtpData) {
    smtpSettings.value = { ...smtpSettings.value, ...smtpData.config }
  }

  // Load Twilio settings
  const { data: twilioData } = await supabase
    .from('reminder_providers')
    .select('*')
    .eq('provider_type', 'twilio')
    .single()

  if (twilioData) {
    twilioSettings.value = { ...twilioSettings.value, ...twilioData.config }
  }
}

const save = async () => {
  isSaving.value = true
  try {
    if (form.value.id) {
      const { error } = await supabase
        .from('reminder_settings')
        .update({ ...form.value })
        .eq('id', form.value.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('reminder_settings')
        .insert([{ ...form.value }])
        .select('*')
        .single()
      if (error) throw error
      form.value.id = data.id
    }
  } finally {
    isSaving.value = false
  }
}

const saveProviders = async () => {
  isSaving.value = true
  try {
    // Save SMTP settings
    await supabase
      .from('reminder_providers')
      .upsert({
        provider_type: 'smtp',
        config: smtpSettings.value,
        is_active: true
      })

    // Save Twilio settings
    await supabase
      .from('reminder_providers')
      .upsert({
        provider_type: 'twilio',
        config: twilioSettings.value,
        is_active: true
      })
  } finally {
    isSaving.value = false
  }
}

const testEmail = async () => {
  // TODO: Implement email test
  alert('E-Mail Test noch nicht implementiert')
}

const testSms = async () => {
  // TODO: Implement SMS test
  alert('SMS Test noch nicht implementiert')
}

// Template functions
const loadTemplate = async (templateKey: string) => {
  const { data } = await supabase
    .from('reminder_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single()

  if (data) {
    currentTemplate.value = {
      subject: data.subject || '',
      content: data.content || ''
    }
  } else {
    // Load default template
    const defaultTemplate = defaultTemplates[templateKey as keyof typeof defaultTemplates]
    if (defaultTemplate) {
      currentTemplate.value = { ...defaultTemplate }
    }
  }
}

const saveTemplate = async () => {
  if (!selectedTemplate.value) return
  
  isSaving.value = true
  try {
    await supabase
      .from('reminder_templates')
      .upsert({
        template_key: selectedTemplate.value,
        subject: currentTemplate.value.subject,
        content: currentTemplate.value.content,
        language: 'de'
      })
  } finally {
    isSaving.value = false
  }
}

const resetTemplate = () => {
  if (selectedTemplate.value) {
    loadTemplate(selectedTemplate.value)
  }
}

// Watch for template selection changes
watch(selectedTemplate, (newTemplate) => {
  if (newTemplate) {
    loadTemplate(newTemplate)
  }
})

onMounted(() => {
  load()
  loadProviders()
})
</script>

<style scoped>
</style>


