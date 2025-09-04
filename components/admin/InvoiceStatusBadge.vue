<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusClasses
    ]"
  >
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import type { InvoiceStatus } from '~/types/invoice'
import { INVOICE_STATUS_LABELS } from '~/types/invoice'

interface Props {
  status: InvoiceStatus
}

const props = defineProps<Props>()

const statusLabel = computed(() => INVOICE_STATUS_LABELS[props.status])

const statusClasses = computed(() => {
  switch (props.status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    case 'sent':
      return 'bg-blue-100 text-blue-800'
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-800'
  }
})
</script>
