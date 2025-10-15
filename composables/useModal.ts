import { ref } from 'vue'

export const useModal = () => {
  const isOpen = ref(false)

  const open = () => {
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  // Stop propagation for modal content - prevents click outside from triggering
  const handleClickStop = (event: MouseEvent) => {
    event.stopPropagation()
  }

  // Modal wrapper classes with click outside functionality
  const getModalWrapperClasses = () => {
    return 'fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4'
  }

  // Regular modal content classes
  const getModalContentClasses = (size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') => {
    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-2xl', 
      lg: 'max-w-4xl',
      xl: 'max-w-6xl'
    }
    
    return `bg-white rounded-lg border border-gray-200 shadow-sm ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto admin-modal`
  }

  // Sticky modal content classes (with flex layout)
  const getStickyModalContentClasses = (size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') => {
    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-2xl',
      lg: 'max-w-4xl', 
      xl: 'max-w-6xl'
    }
    
    return `bg-white rounded-lg border border-gray-200 shadow-sm ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col admin-modal`
  }

  // Regular modal header classes
  const getModalHeaderClasses = () => {
    return 'px-6 py-4 border-b border-gray-200'
  }

  // Sticky modal header classes
  const getStickyModalHeaderClasses = () => {
    return 'px-6 py-4 border-b border-gray-200 flex-shrink-0'
  }

  // Regular modal body classes
  const getModalBodyClasses = () => {
    return 'px-6 py-4'
  }

  // Sticky modal body classes
  const getStickyModalBodyClasses = () => {
    return 'px-6 py-4 overflow-y-auto flex-1'
  }

  // Regular modal footer classes
  const getModalFooterClasses = () => {
    return 'px-6 py-4 border-t border-gray-200 flex justify-end space-x-3'
  }

  // Sticky modal footer classes
  const getStickyModalFooterClasses = () => {
    return 'px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-white'
  }

  return {
    isOpen,
    open,
    close,
    toggle,
    handleClickStop,
    getModalWrapperClasses,
    getModalContentClasses,
    getModalHeaderClasses,
    getModalBodyClasses,
    getModalFooterClasses,
    getStickyModalContentClasses,
    getStickyModalHeaderClasses,
    getStickyModalBodyClasses,
    getStickyModalFooterClasses
  }
}
