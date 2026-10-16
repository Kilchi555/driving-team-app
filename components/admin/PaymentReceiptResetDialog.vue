<template>
  <div v-if="open" class="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/40 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
      <h2 class="text-base font-semibold text-gray-900">Zahlungseingang korrigieren</h2>
      <p class="mt-1 text-sm text-gray-600">
        Eine Statusänderung allein markiert kein eingegangenes Geld als offen. Die Korrektur wird nur ausgeführt, wenn Rechnung, Settlement und Buchhaltung zusammen passen.
      </p>

      <p v-if="loading" class="mt-4 text-sm text-gray-500">Prüfung läuft…</p>
      <p v-else-if="loadError && !preview" class="mt-4 text-sm text-red-700">{{ displayError }}</p>

      <div v-else-if="preview" class="mt-4 space-y-3 text-sm">
        <dl class="grid grid-cols-2 gap-2">
          <dt class="text-gray-500">Zahlung</dt>
          <dd class="font-mono text-xs break-all">{{ preview.discovered.paymentId || '—' }}</dd>
          <dt class="text-gray-500">Rechnung</dt>
          <dd>{{ preview.discovered.invoiceNumber || '—' }}</dd>
          <dt class="text-gray-500">Rechnungsbetrag</dt>
          <dd>{{ chf(preview.discovered.invoiceTotalRappen) }}</dd>
          <dt class="text-gray-500">Diese Position</dt>
          <dd>{{ chf(preview.discovered.lineAmountRappen) }}</dd>
          <dt class="text-gray-500">Andere Positionen</dt>
          <dd>{{ siblingText }}</dd>
          <dt class="text-gray-500">Zielstatus</dt>
          <dd>{{ preview.proposed_target_status || 'noch nicht bestimmt' }}</dd>
        </dl>

        <p v-if="loadError" class="rounded bg-red-50 text-red-800 p-3">
          {{ displayError }}
        </p>
        <p v-else-if="preview.blocked" class="rounded bg-amber-50 text-amber-900 p-3">
          {{ reasonText }}
        </p>
        <p v-else-if="preview.already_applied" class="rounded bg-green-50 text-green-900 p-3">
          Diese Korrektur ist bereits ausgeführt. Es wird keine zweite Stornierung gebucht.
        </p>
        <p v-else class="rounded bg-green-50 text-green-900 p-3">
          Die anderen Positionen bleiben unverändert. Der Termin bleibt, wie er ist, solange kein eigener Terminstatus gewählt wird.
        </p>

        <label class="block">
          <span class="text-gray-700">Begründung</span>
          <textarea v-model="reason" rows="3" class="mt-1 w-full border rounded p-2" placeholder="Warum war die Zahlung nicht eingegangen?" />
        </label>

        <label v-if="preview.requires.sibling_confirmation && !preview.already_applied" class="flex gap-2 items-start">
          <input v-model="confirmSiblings" type="checkbox" class="mt-1">
          <span>Die anderen Rechnungspositionen bleiben als eingegangen bestehen.</span>
        </label>

        <label v-if="preview.requires.invoice_line_disposition && !preview.already_applied" class="block">
          <span class="text-gray-700">Rechnungsposition</span>
          <select v-model="disposition" class="mt-1 w-full border rounded p-2">
            <option value="">Bitte wählen</option>
            <option value="remain_on_invoice">Auf der Rechnung lassen</option>
            <option value="detach">Von der Rechnung lösen</option>
          </select>
        </label>

        <label v-if="preview.requires.appointment_disposition && !preview.already_applied" class="block">
          <span class="text-gray-700">Termin</span>
          <select v-model="appointmentDisposition" class="mt-1 w-full border rounded p-2">
            <option value="">Bitte wählen</option>
            <option value="leave_unchanged">Terminstatus nicht ändern</option>
            <option value="set_status">Terminstatus ausdrücklich setzen</option>
          </select>
        </label>

        <label v-if="appointmentDisposition === 'set_status'" class="block">
          <span class="text-gray-700">Neuer Terminstatus</span>
          <select v-model="appointmentStatus" class="mt-1 w-full border rounded p-2">
            <option value="">Bitte wählen</option>
            <option v-for="status in appointmentStatuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="px-3 py-2 text-sm rounded border" @click="close">Abbrechen</button>
        <button
          type="button"
          class="px-3 py-2 text-sm rounded text-white bg-gray-900 disabled:opacity-40"
          :disabled="loading || submitting || !canSubmit"
          @click="submit"
        >
          Korrektur prüfen und ausführen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ open: boolean; appointmentId: string | null }>()
const emit = defineEmits<{ close: []; applied: [] }>()

const appointmentStatuses = ['confirmed', 'scheduled', 'completed', 'cancelled', 'pending', 'verrechnet']
const loading = ref(false)
const submitting = ref(false)
const loadError = ref('')
const reason = ref('')
const confirmSiblings = ref(false)
const disposition = ref('')
const appointmentDisposition = ref('')
const appointmentStatus = ref('')
const idempotencyKey = ref('')
const preview = ref<any>(null)

const reasonMessages: Record<string, string> = {
  missing_reason: 'Eine Begründung ist erforderlich.',
  missing_sibling_confirmation: 'Bitte bestätigen, dass die anderen Positionen eingegangen bleiben.',
  missing_invoice_line_disposition: 'Bitte festlegen, ob die Position auf der Rechnung bleibt.',
  missing_appointment_disposition: 'Bitte festlegen, ob der Terminstatus geändert wird.',
  invoice_line_detach_not_supported: 'Lösen von der Rechnung ist nicht möglich, weil damit die Rechnungssumme geändert würde.',
  actual_receipt_channel: 'Bar- oder Online-Zahlungen können hier nicht als nicht eingegangen dargestellt werden.',
  bank_settlement_present: 'Ein Bankimport liegt vor. Diese Funktion ändert ihn nicht.',
  refunded_payment: 'Eine bereits erstattete Zahlung wird nicht zurückgesetzt.',
  ambiguous_settlements: 'Mehrere Settlements. Die Zuordnung ist nicht eindeutig.',
  ambiguous_accounting: 'Mehrere Buchungen. Die Korrektur ist nicht eindeutig.',
  status_not_resettable: 'Der aktuelle Status kann so nicht korrigiert werden.',
  tenant_mismatch: 'Die Zahlung gehört nicht zu diesem Betrieb.',
  payment_not_found: 'Keine eindeutige Zahlung gefunden.',
  forbidden: 'Nur Admins dürfen diese Korrektur ausführen.',
  wallet_credit_present: 'Die Rechnung hat Guthaben gutgeschrieben. Diese Korrektur kann das Guthaben nicht zurücknehmen.',
  invoice_credit_transaction_present: 'Eine Guthabenbuchung verweist auf diese Rechnung. Die Korrektur wird nicht ausgeführt.',
  staff_pos_credit_present: 'Ein Kassenverkauf hat Guthaben zu dieser Zahlung erzeugt. Die Korrektur wird nicht ausgeführt.',
  linked_credit_transaction_present: 'Diese Zahlung ist mit einer Guthabenbuchung verknüpft. Die Korrektur kann das Guthaben nicht wiederherstellen.',
  credit_lookup_failed: 'Guthaben konnte nicht geprüft werden. Die Korrektur wird nicht ausgeführt.',
  idempotency_payment_mismatch: 'Dieser Vorgangsschlüssel gehört zu einer anderen Zahlung.',
}

const hardStops = [
  'actual_receipt_channel',
  'bank_settlement_present',
  'wallet_credit_present',
  'invoice_credit_transaction_present',
  'staff_pos_credit_present',
  'linked_credit_transaction_present',
  'credit_lookup_failed',
  'idempotency_payment_mismatch',
]

const siblingText = computed(() => {
  const amounts = preview.value?.discovered?.siblingLineAmountsRappen || []
  if (!amounts.length) return 'keine'
  return amounts.map((amount: number) => chf(amount)).join(', ')
})

const reasonText = computed(() => {
  const reasons = preview.value?.reasons || []
  if (!reasons.length) return 'Die Korrektur ist blockiert.'
  return reasons.map((code: string) => reasonMessages[code] || code).join(' ')
})

const displayError = computed(() => {
  const raw = loadError.value || ''
  const known = Object.keys(reasonMessages).find(code => raw.includes(code))
  if (known) return reasonMessages[known]
  if (preview.value?.reasons?.length) return reasonText.value
  return raw || 'Die Korrektur wurde nicht ausgeführt.'
})

const canSubmit = computed(() => {
  if (reason.value.trim().length < 10) return false
  const reasons = preview.value?.reasons || []
  return !hardStops.some(code => reasons.includes(code) || loadError.value.includes(code))
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  idempotencyKey.value = crypto.randomUUID()
  reason.value = ''
  confirmSiblings.value = false
  disposition.value = ''
  appointmentDisposition.value = ''
  appointmentStatus.value = ''
  void refreshPreview()
})

function chf(rappen: number | null | undefined) {
  if (rappen == null) return '—'
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function payload() {
  return {
    appointment_id: props.appointmentId,
    reason: reason.value,
    confirm_siblings_remain_settled: confirmSiblings.value,
    invoice_line_disposition: disposition.value || null,
    appointment_disposition: appointmentDisposition.value || null,
    appointment_status: appointmentStatus.value || null,
    idempotency_key: idempotencyKey.value,
  }
}

async function refreshPreview() {
  if (!props.appointmentId) return
  loading.value = true
  loadError.value = ''
  try {
    preview.value = await $fetch('/api/admin/payments/receipt-reset-preview', { method: 'POST', body: payload() })
  } catch (error: any) {
    const next = error?.data?.reasons ? error.data : (error?.data?.data || null)
    if (next) preview.value = next
    loadError.value = error?.data?.statusMessage || error?.statusMessage || 'Die Prüfung ist fehlgeschlagen.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  submitting.value = true
  loadError.value = ''
  try {
    const result = await $fetch<any>('/api/admin/payments/receipt-reset', { method: 'POST', body: payload() })
    if (result?.blocked || result?.success === false) {
      preview.value = result
      return
    }
    emit('applied')
    emit('close')
  } catch (error: any) {
    const next = error?.data?.reasons ? error.data : (error?.data?.data || null)
    if (next) preview.value = next
    loadError.value = error?.data?.statusMessage || error?.statusMessage || 'Die Korrektur wurde nicht ausgeführt.'
  } finally {
    submitting.value = false
  }
}

function close() {
  emit('close')
}
</script>
