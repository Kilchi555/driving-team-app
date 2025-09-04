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
import type { PaymentStatus } from '~/types/invoice'
import { PAYMENT_STATUS_LABELS } from '~/types/invoice'

interface Props {
  status: PaymentStatus
}

const props = defineProps<Props>()

const statusLabel = computed(() => PAYMENT_STATUS_LABELS[props.status])

const statusClasses = computed(() => {
  switch (props.status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'partial':
      return 'bg-orange-100 text-orange-800'
    case 'paid':
      return 'bg-green-100 text-green-800'
    case 'overdue':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
})
</script>
