<!-- components/Toast.vue -->
<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="transform translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform translate-y-0 opacity-100 sm:translate-x-0"
    leave-to-class="transform translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
  >
    <div
      v-if="show"
      class="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4 bg-white shadow-2xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
    >
      <div class="p-6">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                 :class="iconClass">
              {{ icon }}
            </div>
          </div>
          <div class="ml-4 w-0 flex-1 pt-1">
            <p class="text-lg font-semibold text-gray-900">
              {{ title }}
            </p>
            <p v-if="message" class="mt-2 text-base text-gray-600">
              {{ message }}
            </p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              @click="close"
              class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span class="sr-only">Schließen</span>
              <svg class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 5000
  }
})

// Emits
const emit = defineEmits(['close'])

// Computed
const icon = computed(() => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[props.type] || icons.info
})

const iconClass = computed(() => {
  const classes = {
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
    warning: 'bg-yellow-100 text-yellow-600',
    info: 'bg-blue-100 text-blue-600'
  }
  return classes[props.type] || classes.info
})

// Methods
const close = () => {
  emit('close')
}

// Auto-close after duration
if (props.duration > 0) {
  setTimeout(() => {
    close()
  }, props.duration)
}
</script>
