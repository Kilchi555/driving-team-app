// composables/useDiscountEditor.ts
import { ref, computed } from 'vue'

export const useDiscountEditor = (initialAmount = 0, initialReason = '') => {
  const amount = ref(initialAmount)
  const reason = ref(initialReason)
  const showEditor = ref(false)
  const tempAmount = ref('')
  const tempReason = ref('')
  
  const isValid = computed(() => {
    const value = parseFloat(tempAmount.value) || 0
    return value >= 0
  })
  
  const apply = (newAmount: number, newReason: string) => {
    amount.value = newAmount
    reason.value = newReason
    showEditor.value = false
    tempAmount.value = ''
    tempReason.value = ''
  }
  
  const cancel = () => {
    showEditor.value = false
    tempAmount.value = ''
    tempReason.value = ''
  }
  
  const remove = () => {
    amount.value = 0
    reason.value = ''
  }
  
  return {
    amount,
    reason,
    showEditor,
    tempAmount,
    tempReason,
    isValid,
    apply,
    cancel,
    remove
  }
}