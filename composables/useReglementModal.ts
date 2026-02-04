import { ref, readonly } from 'vue'

// Global state for reglement modal
const isReglementModalOpen = ref(false)
const selectedReglementType = ref<string>('')

export const useReglementModal = () => {
  const openReglement = (type: string) => {
    selectedReglementType.value = type
    isReglementModalOpen.value = true
  }

  const closeReglement = () => {
    isReglementModalOpen.value = false
    selectedReglementType.value = ''
  }

  return {
    isOpen: readonly(isReglementModalOpen),
    type: readonly(selectedReglementType),
    openReglement,
    closeReglement
  }
}
