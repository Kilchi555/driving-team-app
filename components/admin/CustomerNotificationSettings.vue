<template>
  <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
      <div>
        <h2 class="text-sm font-semibold text-gray-800">Kunden-Benachrichtigungen (E-Mail / SMS)</h2>
        <p class="text-xs text-gray-400 mt-0.5">
          Bestätigungen, Erinnerungen, Absagen und Kursmails aus der Tabelle.
          Aus schaltet nur diese Kanäle — Onboarding, Registrierung, Pause, Rechnungen und App-Push bleiben separat.
          Inklusiv-SMS-Segmente gemäss Plan; Überzug CHF {{ smsOverageRate.toFixed(2) }}/Segment.
        </p>
        <p v-if="smsUsage" class="text-xs text-gray-600 mt-2">
          Verbrauch: <span class="font-semibold">{{ smsUsage.used }} / {{ smsUsage.included }}</span> Segmente
          <span v-if="smsUsage.resetLabel"> · Reset am {{ smsUsage.resetLabel }}</span>
          <span v-if="smsUsage.overage > 0" class="text-amber-600">
            · Überzug {{ smsUsage.overage }} (ca. CHF {{ smsUsage.overageCostChf.toFixed(2) }})
          </span>
        </p>
      </div>
      <button
        type="button"
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
        :style="policy.customer_notifications_enabled ? primaryBg : { background: '#e5e7eb' }"
        @click="patch({ customer_notifications_enabled: !policy.customer_notifications_enabled })"
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
          :class="policy.customer_notifications_enabled ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <div
      class="px-5 py-4 space-y-5 transition-opacity"
      :class="policy.customer_notifications_enabled ? '' : 'opacity-40 pointer-events-none'"
    >
      <div>
        <p class="text-sm font-medium text-gray-800 mb-2">Kanal-Priorität</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            v-for="opt in channelOptions"
            :key="opt.value"
            type="button"
            class="text-left rounded-xl border p-3 transition-colors"
            :class="policy.customer_notification_channel === opt.value ? 'border-transparent' : 'border-gray-100 hover:border-gray-200'"
            :style="policy.customer_notification_channel === opt.value
              ? { borderColor: 'var(--color-primary, #3B82F6)', background: 'var(--color-primary-bg, #EFF6FF)' }
              : {}"
            @click="patch({ customer_notification_channel: opt.value })"
          >
            <p class="text-sm font-semibold text-gray-800">{{ opt.label }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ opt.description }}</p>
          </button>
        </div>
      </div>

      <div>
        <div class="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 items-center mb-2 px-1">
          <p class="text-xs font-medium text-gray-500">Nachricht</p>
          <p class="text-xs font-medium text-gray-500 text-center">E-Mail</p>
          <p class="text-xs font-medium text-gray-500 text-center">SMS</p>
        </div>
        <div class="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <div
            v-for="row in rows"
            :key="row.emailKey"
            class="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 items-center px-3 py-2.5"
          >
            <div>
              <p class="text-sm font-medium text-gray-800">{{ row.label }}</p>
              <p class="text-xs text-gray-400">{{ row.hint }}</p>
            </div>
            <div class="flex justify-center">
              <button
                type="button"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                :style="policy[row.emailKey] ? primaryBg : { background: '#e5e7eb' }"
                @click="patch({ [row.emailKey]: !policy[row.emailKey] })"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="policy[row.emailKey] ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </div>
            <div class="flex justify-center">
              <button
                v-if="row.smsKey"
                type="button"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                :style="policy[row.smsKey] ? primaryBg : { background: '#e5e7eb' }"
                @click="row.smsKey && patch({ [row.smsKey]: !policy[row.smsKey] })"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="policy[row.smsKey] ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
              <span v-else class="text-xs text-gray-300">—</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-2">
          Zahlungserinnerungen brauchen zusätzlich die Methoden unter Zahlungen.
          App-Push bei offenen Beträgen läuft unabhängig von E-Mail und SMS.
        </p>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-gray-800">Hard-Stop bei leerem Kontingent</p>
          <p class="text-xs text-gray-400">Sonst Soft-Cap: SMS laufen weiter und werden verrechnet</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
          :style="policy.sms_hard_stop_on_quota ? primaryBg : { background: '#e5e7eb' }"
          @click="patch({ sms_hard_stop_on_quota: !policy.sms_hard_stop_on_quota })"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
            :class="policy.sms_hard_stop_on_quota ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <div>
        <p class="text-sm font-medium text-gray-800 mb-2">Nachrichtenlänge</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            class="text-left rounded-xl border p-3 transition-colors"
            :class="policy.sms_message_length === 'short' ? 'border-transparent' : 'border-gray-100 hover:border-gray-200'"
            :style="policy.sms_message_length === 'short'
              ? { borderColor: 'var(--color-primary, #3B82F6)', background: 'var(--color-primary-bg, #EFF6FF)' }
              : {}"
            @click="patch({ sms_message_length: 'short' })"
          >
            <p class="text-sm font-semibold text-gray-800">Kurz · {{ smsPreviews.short.segments }} Segment</p>
            <p class="text-xs text-gray-500 mt-1">≈ CHF {{ smsPreviews.short.costChf.toFixed(2) }}</p>
            <p class="text-xs text-gray-600 mt-2 font-mono leading-relaxed">{{ smsPreviews.short.message }}</p>
          </button>
          <button
            type="button"
            class="text-left rounded-xl border p-3 transition-colors"
            :class="policy.sms_message_length === 'long' ? 'border-transparent' : 'border-gray-100 hover:border-gray-200'"
            :style="policy.sms_message_length === 'long'
              ? { borderColor: 'var(--color-primary, #3B82F6)', background: 'var(--color-primary-bg, #EFF6FF)' }
              : {}"
            @click="patch({ sms_message_length: 'long' })"
          >
            <p class="text-sm font-semibold text-gray-800">Lang · {{ smsPreviews.long.segments }} Segmente</p>
            <p class="text-xs text-gray-500 mt-1">≈ CHF {{ smsPreviews.long.costChf.toFixed(2) }}</p>
            <p class="text-xs text-gray-600 mt-2 font-mono leading-relaxed">{{ smsPreviews.long.message }}</p>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePrimaryColor } from '~/composables/usePrimaryColor'

type Channel = 'email_first' | 'sms_first' | 'both'
type SmsLength = 'short' | 'long'

export type CustomerNotificationPolicyFields = {
  customer_notifications_enabled: boolean
  customer_notification_channel: Channel
  confirmation_email_enabled: boolean
  confirmation_sms_enabled: boolean
  reminder_email_enabled: boolean
  reminder_sms_enabled: boolean
  cancellation_email_enabled: boolean
  cancellation_sms_enabled: boolean
  reschedule_email_enabled: boolean
  reschedule_sms_enabled: boolean
  payment_reminder_email_enabled: boolean
  payment_reminder_sms_enabled: boolean
  course_reminder_email_enabled: boolean
  course_reminder_sms_enabled: boolean
  course_enrollment_email_enabled: boolean
  sms_message_length: SmsLength
  sms_hard_stop_on_quota: boolean
}

type BoolKey = {
  [K in keyof CustomerNotificationPolicyFields]: CustomerNotificationPolicyFields[K] extends boolean ? K : never
}[keyof CustomerNotificationPolicyFields]

const policy = defineModel<CustomerNotificationPolicyFields>('policy', { required: true })

const props = defineProps<{
  smsUsage?: {
    used: number
    included: number
    overage: number
    overageCostChf: number
    resetLabel?: string
  } | null
  smsOverageRate?: number
  smsPreviews?: {
    short: { message: string; segments: number; costChf: number }
    long: { message: string; segments: number; costChf: number }
  }
}>()

function patch(partial: Partial<CustomerNotificationPolicyFields>) {
  policy.value = { ...policy.value, ...partial }
}

const { primaryBg } = usePrimaryColor()
const smsOverageRate = computed(() => props.smsOverageRate ?? 0.15)
const smsPreviews = computed(() => props.smsPreviews ?? {
  short: { message: 'Hallo Max, Termin Di 15.3. 14:00 bestätigt.', segments: 1, costChf: 0.15 },
  long: { message: 'Hallo Max, Termin Di 15.3. 14:00 bestätigt. Absage/Details: https://app.simy.ch/login', segments: 2, costChf: 0.30 },
})

const channelOptions = [
  { value: 'email_first' as const, label: 'E-Mail zuerst', description: 'E-Mail wenn vorhanden, sonst SMS. Bisheriges Verhalten.' },
  { value: 'sms_first' as const, label: 'SMS zuerst', description: 'SMS wenn Telefon vorhanden, sonst E-Mail.' },
  { value: 'both' as const, label: 'Beides', description: 'E-Mail und SMS, sofern Kontakt vorhanden.' },
]

const rows: Array<{ label: string; hint: string; emailKey: BoolKey; smsKey?: BoolKey }> = [
  { label: 'Terminbestätigung', hint: 'Nach jeder Buchung', emailKey: 'confirmation_email_enabled', smsKey: 'confirmation_sms_enabled' },
  { label: 'Termin-Erinnerung', hint: 'Tag vorher', emailKey: 'reminder_email_enabled', smsKey: 'reminder_sms_enabled' },
  { label: 'Absage', hint: 'Bei Stornierung', emailKey: 'cancellation_email_enabled', smsKey: 'cancellation_sms_enabled' },
  { label: 'Verschiebung', hint: 'Bei Terminänderung', emailKey: 'reschedule_email_enabled', smsKey: 'reschedule_sms_enabled' },
  { label: 'Zahlungserinnerung', hint: 'Offene Beträge nach dem Termin', emailKey: 'payment_reminder_email_enabled', smsKey: 'payment_reminder_sms_enabled' },
  { label: 'Kurs-Erinnerung', hint: 'Teilnehmer, Tag vor der Session', emailKey: 'course_reminder_email_enabled', smsKey: 'course_reminder_sms_enabled' },
  { label: 'Kurs-Anmeldung', hint: 'Bestätigung nach Einschreibung', emailKey: 'course_enrollment_email_enabled' },
]
</script>
