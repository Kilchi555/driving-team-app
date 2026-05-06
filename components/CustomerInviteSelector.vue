<template>
  <div class="customer-invite-selector">
    <!-- Kollapsible Wrapper -->
    <div class="rounded-xl border overflow-hidden" :style="{ ...primaryBgLight, borderColor: 'color-mix(in srgb, var(--color-primary, #111827) 20%, transparent)' }">

      <!-- Klickbarer Header -->
      <div
        class="flex items-center justify-between px-4 py-3 cursor-pointer transition-opacity hover:opacity-80"
        @click="toggleExpanded"
      >
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" :style="primaryText" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          <span class="text-sm font-semibold" :style="primaryText">Neukunden einladen</span>
          <span v-if="invitedCustomers.length > 0" class="text-xs px-2 py-0.5 rounded-full font-medium" :style="primaryBg">
            {{ invitedCustomers.length }}
          </span>
          <span v-if="smsStatusSummary.total > 0" class="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-white/60">
            {{ smsStatusSummary.sent }}/{{ smsStatusSummary.total }} SMS
          </span>
        </div>

        <div class="flex items-center gap-2">
          <div v-if="sendingSms" class="flex items-center gap-1.5">
            <div class="animate-spin rounded-full h-3 w-3 border-b-2" :style="primaryBorder"></div>
            <span class="text-xs" :style="primaryText">SMS...</span>
          </div>
          <button
            v-if="isExpanded && invitedCustomers.length > 0"
            @click.stop="clearAll"
            :disabled="disabled"
            class="text-xs px-2 py-1 bg-white/60 text-gray-600 rounded-lg hover:bg-white/80 disabled:opacity-50"
          >
            Alle löschen
          </button>
          <svg
            class="w-4 h-4 text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      <!-- Ausklappbarer Inhalt -->
      <div v-if="isExpanded" class="border-t bg-white" style="border-color: color-mix(in srgb, var(--color-primary, #111827) 15%, transparent)">

        <!-- Error -->
        <div v-if="error" class="mx-4 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {{ error }}
        </div>

        <!-- SMS Sending -->
        <div v-if="sendingSms" class="mx-4 mt-4 px-3 py-2.5 rounded-xl flex items-center gap-2" :style="primaryBgLight">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 shrink-0" :style="primaryBorder"></div>
          <span class="text-sm font-medium" :style="primaryText">Sende SMS-Einladungen...</span>
        </div>

        <!-- Formular -->
        <div class="p-4 space-y-3">
          <!-- Info Banner -->
          <div class="flex items-center gap-2 text-xs px-3 py-2 rounded-xl" :style="{ ...primaryBgLight, ...primaryText }">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Mindestens Vor- oder Nachname + Telefonnummer erforderlich
          </div>

          <!-- Vorname / Nachname -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Vorname</label>
              <input
                v-model="newCustomer.first_name"
                type="text"
                placeholder="Max"
                :disabled="disabled"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900 disabled:bg-gray-50"
                @keydown.enter="addCustomer"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Nachname</label>
              <input
                v-model="newCustomer.last_name"
                type="text"
                placeholder="Mustermann"
                :disabled="disabled"
                class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900 disabled:bg-gray-50"
                @keydown.enter="addCustomer"
              />
            </div>
          </div>

          <!-- Telefon -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Telefonnummer *</label>
            <input
              v-model="newCustomer.phone"
              type="tel"
              placeholder="+41 79 123 45 67"
              :disabled="disabled"
              class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-900 disabled:bg-gray-50"
              @keydown.enter="addCustomer"
            />
            <p class="text-xs text-gray-400 mt-1 px-1">Der Kunde erhält eine SMS-Einladung an diese Nummer</p>
          </div>

          <!-- Button -->
          <div class="flex justify-end pt-1">
            <button
              @click="addCustomer"
              :disabled="!isNewCustomerValid || disabled || isProcessing"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              :style="isNewCustomerValid && !isProcessing && !disabled ? primaryBg : {}"
              :class="isNewCustomerValid && !isProcessing && !disabled ? '' : 'bg-gray-200 text-gray-400'"
            >
              <svg v-if="isProcessing" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              {{ isProcessing ? 'Hinzufügen...' : 'Zur Liste hinzufügen' }}
            </button>
          </div>
        </div>

        <!-- Eingeladene Kunden Liste -->
        <div v-if="invitedCustomers.length > 0" class="px-4 pb-4 border-t border-gray-100 pt-4 space-y-2">
          <div class="text-xs font-medium text-gray-500 mb-2">Eingeladene Neukunden ({{ invitedCustomers.length }})</div>

          <div
            v-for="(customer, index) in invitedCustomers"
            :key="index"
            class="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-gray-900">{{ customer.first_name }} {{ customer.last_name }}</span>
                <span v-if="customer.phone" class="text-xs px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-lg">
                  {{ customer.phone }}
                </span>
              </div>
              <div v-if="customer.phone && smsStatus[customer.phone]" class="mt-0.5 text-xs">
                <span v-if="smsStatus[customer.phone].sent" class="text-gray-400">
                  Gesendet ✓
                </span>
                <span v-else-if="smsStatus[customer.phone].error" class="text-red-500">
                  {{ smsStatus[customer.phone].error }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="smsStatus[customer.phone] && !smsStatus[customer.phone].sent"
                @click="retrySms(customer)"
                class="text-xs px-2 py-1 rounded-lg transition-colors"
                :style="{ ...primaryBgLight, ...primaryText }"
                title="SMS erneut senden"
              >
                Retry
              </button>
              <button
                v-if="!disabled"
                @click="removeCustomer(index)"
                class="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- SMS Summary -->
          <div v-if="smsStatusSummary.total > 0" class="mt-3 px-3 py-3 bg-gray-50 rounded-xl">
            <div class="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <div class="font-bold text-gray-900">{{ smsStatusSummary.total }}</div>
                <div class="text-xs text-gray-500">Gesamt</div>
              </div>
              <div>
                <div class="font-bold" :style="primaryText">{{ smsStatusSummary.sent }}</div>
                <div class="text-xs text-gray-500">Gesendet</div>
              </div>
              <div>
                <div class="font-bold text-red-600">{{ smsStatusSummary.failed }}</div>
                <div class="text-xs text-gray-500">Fehler</div>
              </div>
            </div>
          </div>

          <!-- Info Box -->
          <div class="px-3 py-3 rounded-xl" :style="primaryBgLight">
            <p class="text-xs font-medium mb-1" :style="primaryText">Was passiert beim Speichern:</p>
            <ul class="text-xs text-gray-600 space-y-0.5">
              <li>• Neukunden werden automatisch registriert</li>
              <li>• SMS-Einladung mit Termindetails und App-Link</li>
              <li>• Termin wird für alle Teilnehmer erstellt</li>
              <li v-if="sendingSms" class="font-medium" :style="primaryText">• SMS werden gerade versendet...</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Kompakte Übersicht (eingeklappt) -->
    <div v-if="!isExpanded && invitedCustomers.length > 0" class="mt-2 flex flex-wrap gap-1">
      <span
        v-for="(customer, index) in invitedCustomers"
        :key="index"
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium"
        :style="{ ...primaryBgLight, ...primaryText }"
      >
        {{ customer.first_name }} {{ customer.last_name }}
        <span v-if="smsStatus[customer.phone]">
          <span v-if="smsStatus[customer.phone].sent">✓</span>
          <span v-else class="text-red-500">✗</span>
        </span>
        <button v-if="!disabled" @click="removeCustomer(index)" class="hover:opacity-60">×</button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed } from 'vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { useSmsService } from '~/composables/useSmsService'
import { usePrimaryColor } from '~/composables/usePrimaryColor'
const { primaryBg, primaryText, primaryBgLight, primaryBorder } = usePrimaryColor()

// Customer Interface - simplified for phone-only invitations
interface NewCustomer {
  first_name?: string
  last_name?: string
  phone?: string
  notes?: string
}

// Props
interface Props {
  modelValue?: NewCustomer[]
  currentUser?: any
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [customers: NewCustomer[]]
  'customers-added': [customers: NewCustomer[]]
  'customers-cleared': []
}>()

// State
const isExpanded = ref(false)
const isProcessing = ref(false)
const error = ref<string | null>(null)
const smsStatus = ref<Record<string, { sent: boolean, sid?: string, error?: string }>>({})
const sendingSms = ref(false)
const tenantSenderName = ref<string>('Fahrschule')

const newCustomer = ref<NewCustomer>({
  first_name: '',
  last_name: '',
  phone: '',
  notes: ''
})

// Always use SMS (removed invitationMethod selector)

// Computed
const invitedCustomers = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const isNewCustomerValid = computed(() => {
  const hasName = newCustomer.value.first_name?.trim() || newCustomer.value.last_name?.trim()
  const hasPhone = newCustomer.value.phone?.trim() && isValidPhone(newCustomer.value.phone)
  
  return hasPhone && hasName
})

// Computed für SMS Status Display:
const smsStatusSummary = computed(() => {
  const statuses = Object.values(smsStatus.value)
  return {
    total: statuses.length,
    sent: statuses.filter(s => s.sent).length,
    failed: statuses.filter(s => !s.sent).length
  }
})

// Methods
const isValidPhone = (phone: string): boolean => {
  // Swiss phone number validation
  const phoneRegex = /^(\+41|0041|0)[1-9]\d{8}$/
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  return phoneRegex.test(cleanPhone)
}

const isValidEmail = (email: string): boolean => {
  // Email validation - no longer used
  return true
}

const formatPhone = (phone: string): string => {
  // Format phone number consistently
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  if (cleanPhone.startsWith('0041')) {
    cleanPhone = '+41' + cleanPhone.substring(4)
  } else if (cleanPhone.startsWith('0') && !cleanPhone.startsWith('+41')) {
    cleanPhone = '+41' + cleanPhone.substring(1)
  }
  
  return cleanPhone
}

const createInvitationSmsMessage = (customer: NewCustomer, appointmentData?: any) => {
  const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Kunde'
  
  // Basis-Einladungs-SMS
  let message = `Hallo ${customerName}! `
  
  if (appointmentData) {
    // ✅ KRITISCHER FIX: Entferne das +00:00 UTC-Suffix
    const cleanStartTime = appointmentData.start_time.replace('+00:00', '').replace('T', ' ')
    
    // Jetzt wird es als lokale Zeit interpretiert
    const startDate = new Date(cleanStartTime)
    
    const appointmentDate = startDate.toLocaleDateString('de-CH')
    const appointmentTime = startDate.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    // Staff-Informationen aus appointmentData
    const staffName = appointmentData.staff?.first_name || 'Ihr Fahrlehrer'
    const staffPhone = appointmentData.staff?.phone || ''
    
    // Location-Informationen aus appointmentData
    const locationName = appointmentData.location_name || 'Treffpunkt'
    const locationAddress = appointmentData.location_address || ''
    
    message += `Dein Termin ist am ${appointmentDate} um ${appointmentTime} Uhr bestätigt.\n\n`
    
    // Staff-Name mit Telefonnummer
    if (staffPhone) {
      message += `${staffName} (${staffPhone}) wird dich gerne hier erwarten: ${locationName}`
    } else {
      message += `${staffName} wird dich gerne hier erwarten: ${locationName}`
    }
    
    if (locationAddress) {
      message += ` (${locationAddress})`
    }
    
    message += `.\n\n`
  }
  
  message += `Beste Grüsse,\nDein Driving Team!`
  
  return message
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  logger.debug('🔄 CustomerInviteSelector expanded:', isExpanded.value)
}

const addCustomer = async () => {
  if (!isNewCustomerValid.value) {
    // Specific error message
    const hasName = newCustomer.value.first_name?.trim() || newCustomer.value.last_name?.trim()
    const hasPhone = newCustomer.value.phone?.trim() && isValidPhone(newCustomer.value.phone)
    
    if (!hasName && !hasPhone) {
      error.value = 'Bitte geben Sie mindestens Vor- oder Nachname und eine Telefonnummer an'
    } else if (!hasName) {
      error.value = 'Bitte geben Sie mindestens den Vor- oder Nachnamen an'
    } else if (!hasPhone) {
      error.value = 'Bitte geben Sie eine gültige Telefonnummer an'
    } else {
      error.value = 'Bitte füllen Sie alle Pflichtfelder korrekt aus'
    }
    return
  }

  // Check for duplicates
  const phoneExists = invitedCustomers.value.some(c => 
    formatPhone(c.phone) === formatPhone(newCustomer.value.phone)
  )
  
  if (phoneExists) {
    error.value = 'Ein Kunde mit dieser Telefonnummer wurde bereits hinzugefügt'
    return
  }

  try {
    isProcessing.value = true
    error.value = null

  // Check if customer already exists in database
  const supabase = getSupabase()
  
  // Check existing customers by phone (only SMS now)
  let existingCustomer = null
  if (newCustomer.value.phone) {
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone')
      .eq('phone', formatPhone(newCustomer.value.phone))
      .eq('role', 'client')
      .maybeSingle()
    existingCustomer = data
  }

  if (existingCustomer) {
    error.value = `Kunde "${existingCustomer.first_name} ${existingCustomer.last_name}" ist bereits registriert`
    return
  }

    // Add to invite list
    const customerToAdd: NewCustomer = {
      first_name: newCustomer.value.first_name?.trim() || undefined,
      last_name: newCustomer.value.last_name?.trim() || undefined,
      phone: formatPhone(newCustomer.value.phone || ''),
      notes: newCustomer.value.notes || undefined
    }

    const updatedCustomers = [...invitedCustomers.value, customerToAdd]
    invitedCustomers.value = updatedCustomers

    // Reset form
    newCustomer.value = {
      first_name: '',
      last_name: '',
      phone: '',
      notes: ''
    }

    logger.debug('✅ Customer added to invite list:', customerToAdd)
    emit('customers-added', [customerToAdd])

  } catch (err: any) {
    console.error('❌ Error adding customer:', err)
    error.value = err.message || 'Fehler beim Hinzufügen des Kunden'
  } finally {
    isProcessing.value = false
  }
}

const removeCustomer = (index: number) => {
  const updatedCustomers = invitedCustomers.value.filter((_, i) => i !== index)
  invitedCustomers.value = updatedCustomers
  logger.debug('🗑️ Customer removed from invite list at index:', index)
}

const clearAll = () => {
  invitedCustomers.value = []
  const clearedCustomer: NewCustomer = {
    first_name: '',
    last_name: '',
    phone: '',
    notes: ''
  }
  newCustomer.value = clearedCustomer
  error.value = null
  logger.debug('🗑️ All invited customers cleared')
  emit('customers-cleared')
}

const resetSelection = () => {
  clearAll()
  isExpanded.value = false
  logger.debug('🔄 CustomerInviteSelector: Selection reset')
}

// 1. VERWENDE useSmsService STATT DIREKTER EDGE FUNCTION:
const { sendSms } = useSmsService()

// 2. DEINE createInvitedCustomers FUNKTION BLEIBT UNVERÄNDERT:
const createInvitedCustomers = async (appointmentData: any) => {
  if (invitedCustomers.value.length === 0) {
    logger.debug('📞 No customers to invite')
    return []
  }

  logger.debug('📧 Creating invited customers and sending invitations:', invitedCustomers.value.length)
  const supabase = getSupabase()
  const createdInvites = []
  sendingSms.value = true

  for (const customer of invitedCustomers.value) {
    try {
      // 1. UPSERT entry in invited_customers table
      const inviteData = {
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        phone: customer.phone || null,
        email: customer.email || null,
        notes: customer.notes || null,
        invited_by_staff_id: props.currentUser?.id,
        appointment_id: appointmentData.id, // ← Verknüpfung zum Termin
        status: 'pending',
        expires_at: toLocalTimeString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 Tage        
        updated_at: toLocalTimeString(new Date())
      }

      // UPSERT: ON CONFLICT (phone OR email) DO UPDATE
      const conflictColumn = customer.phone ? 'phone' : 'email'
      const { data: invite, error: inviteError } = await supabase
        .from('invited_customers')
        .upsert(inviteData, { 
          onConflict: conflictColumn,
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      logger.debug('✅ Invitation upserted with ID:', invite.id)

      // 2. Send SMS invitation (only SMS now)
      try {
        if (customer.phone) {
          // Send SMS invitation
          const smsMessage = createInvitationSmsMessage(customer, appointmentData)
          logger.debug('📱 Sending SMS to:', customer.phone)
          logger.debug('📄 Message:', smsMessage)

          const smsResult = await sendSms(customer.phone, smsMessage, tenantSenderName.value)

          if (smsResult.success) {
            logger.debug('✅ SMS sent successfully:', smsResult.data?.sid)
            
            // Update SMS status tracking
            smsStatus.value[customer.phone] = {
              sent: true,
              sid: smsResult.data?.sid
            }

            // Update invitation record with SMS status
            await supabase
              .from('invited_customers')
              .update({
                invitation_sent_at: toLocalTimeString(new Date()),
                metadata: {
                  sms_sent: true,
                  sms_sid: smsResult.data?.sid,
                  sms_sent_at: toLocalTimeString(new Date())
                }
              })
              .eq('id', invite.id)

          } else {
            console.error('❌ SMS failed:', smsResult.error)
            smsStatus.value[customer.phone] = {
              sent: false,
              error: smsResult.error
            }

            // Update invitation record with SMS failure
            await supabase
              .from('invited_customers')
              .update({
                invitation_sent_at: toLocalTimeString(new Date()),
                metadata: {
                  sms_sent: false,
                  sms_error: smsResult.error,
                  sms_sent_at: toLocalTimeString(new Date())
                }
              })
              .eq('id', invite.id)
          }
        }

      } catch (smsError: any) {
        console.error('❌ SMS sending error:', smsError)
        if (customer.phone) {
          smsStatus.value[customer.phone] = {
            sent: false,
            error: smsError.message || 'SMS Fehler'
          }
        }
      }

      createdInvites.push({
        ...invite,
        sms_status: smsStatus.value[customer.phone]
      })

    } catch (err) {
      console.error('❌ Error creating invite for customer:', customer, err)
    }
  }

  sendingSms.value = false

  // 3. Log SMS summary
  const successfulSms = Object.values(smsStatus.value).filter(status => status.sent).length
  const failedSms = Object.values(smsStatus.value).filter(status => !status.sent).length
  logger.debug(`📊 SMS Summary: ${successfulSms} sent, ${failedSms} failed`)

  // 4. TODO: Create reminder job for follow-up SMS
  logger.debug('⏰ Reminder jobs would be scheduled for', createdInvites.length, 'invites')

  return createdInvites
}

// Funktion zum manuellen Nachsenden einer SMS:
const retrySms = async (customer: NewCustomer) => {
  try {
    const smsMessage = createInvitationSmsMessage(customer)
    const smsResult = await sendSms(customer.phone, smsMessage, tenantSenderName.value)
    
    if (smsResult.success) {
      smsStatus.value[customer.phone] = {
        sent: true,
        sid: smsResult.data?.sid
      }
      logger.debug('✅ SMS retry successful for:', customer.phone)
    } else {
      console.error('❌ SMS retry failed for:', customer.phone, smsResult.error)
    }
  } catch (error) {
    console.error('❌ SMS retry error:', error)
  }
}

// Expose methods for parent components
defineExpose({
  addCustomer,
  clearAll,
  resetSelection,
  createInvitedCustomers,
  toggleExpanded
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states */
input:focus, select:focus {
  outline: none;
}
</style>