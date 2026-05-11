<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-slate-700">Rabattcode <span class="text-slate-400 font-normal">(optional)</span></label>
    <div class="flex gap-2">
      <input
        v-model="code"
        type="text"
        placeholder="Code eingeben"
        :disabled="!!appliedDiscount || isValidating"
        class="flex-1 px-4 py-2 border-2 rounded-lg text-sm transition-colors"
        :class="appliedDiscount
          ? 'border-green-400 bg-green-50 text-green-800 uppercase tracking-wider'
          : 'border-slate-300 focus:outline-none'"
        :style="!appliedDiscount ? { '--ring-color': primaryColor } : {}"
        @keydown.enter.prevent="applyCode"
        @input="clearError"
      />
      <button
        v-if="!appliedDiscount"
        type="button"
        @click="applyCode"
        :disabled="!code.trim() || isValidating"
        class="px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        :style="{ borderColor: primaryColor, color: primaryColor }"
      >
        <span v-if="isValidating" class="flex items-center gap-1">
          <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </span>
        <span v-else>Anwenden</span>
      </button>
      <button
        v-else
        type="button"
        @click="removeCode"
        class="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border-2 border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
      >
        Entfernen
      </button>
    </div>

    <!-- Success -->
    <div v-if="appliedDiscount" class="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
      <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span class="text-sm text-green-800 font-medium">{{ successLabel }}</span>
    </div>

    <!-- Error -->
    <p v-else-if="errorMsg" class="text-sm text-red-600 flex items-center gap-1">
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {{ errorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  tenantId: string
  amountRappen: number         // full price in rappen (to calculate % discounts)
  categoryCode?: string        // optional category filter
  primaryColor?: string
}

interface DiscountResult {
  code: string
  discountAmountRappen: number
  discountData: any
}

const props = withDefaults(defineProps<Props>(), {
  primaryColor: '#3B82F6'
})

const emit = defineEmits<{
  (e: 'applied', result: DiscountResult): void
  (e: 'removed'): void
}>()

const code = ref('')
const isValidating = ref(false)
const appliedDiscount = ref<DiscountResult | null>(null)
const errorMsg = ref<string | null>(null)

const successLabel = computed(() => {
  if (!appliedDiscount.value) return ''
  const amount = (appliedDiscount.value.discountAmountRappen / 100).toFixed(2)
  return `Code angewendet – Rabatt: CHF ${amount}`
})

const clearError = () => {
  errorMsg.value = null
}

const applyCode = async () => {
  const trimmed = code.value.trim()
  if (!trimmed) return

  isValidating.value = true
  errorMsg.value = null

  try {
    const res = await $fetch('/api/discounts/validate', {
      method: 'POST',
      body: {
        code: trimmed,
        amount_rappen: props.amountRappen,
        categoryCode: props.categoryCode,
        tenant_id: props.tenantId
      }
    }) as any

    if (res.isValid) {
      appliedDiscount.value = {
        code: trimmed.toUpperCase(),
        discountAmountRappen: res.discount_amount_rappen,
        discountData: res.discount
      }
      emit('applied', appliedDiscount.value)
    } else {
      errorMsg.value = res.error || 'Ungültiger Code'
    }
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || err?.statusMessage || 'Code konnte nicht geprüft werden'
  } finally {
    isValidating.value = false
  }
}

const removeCode = () => {
  appliedDiscount.value = null
  code.value = ''
  errorMsg.value = null
  emit('removed')
}

// Re-validate if amount changes (price updates)
watch(() => props.amountRappen, () => {
  if (appliedDiscount.value) {
    removeCode()
  }
})
</script>
