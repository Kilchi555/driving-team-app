// composables/useEditMode.ts
import { ref } from 'vue'

export const useEditMode = (initialValue = false) => {
  const isActive = ref(initialValue)
  
  const toggle = () => {
    isActive.value = !isActive.value
  }
  
  const enable = () => {
    isActive.value = true
  }
  
  const disable = () => {
    isActive.value = false
  }
  
  return {
    isActive,
    toggle,
    enable,
    disable
  }
}


