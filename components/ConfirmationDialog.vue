<template>
  <div 
    v-if="isVisible" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="handleBackdropClick"
  >
    <div 
      class="bg-white rounded-lg w-full max-w-md shadow-xl transform transition-all"
      @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <div class="text-2xl">{{ icon }}</div>
          <h3 class="text-lg font-semibold text-gray-900">
            {{ title }}
          </h3>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4">
        <p class="text-gray-700 leading-relaxed">{{ message }}</p>
        
        <!-- Details falls vorhanden -->
        <div v-if="details" class="mt-4 p-3 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-600" v-html="details"></div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
        <button
          @click="handleCancel"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          :class="[
            'px-4 py-2 text-white rounded-lg font-medium transition-colors',
            type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
            type === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
            'bg-green-600 hover:bg-green-700'
          ]"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isVisible: boolean
  title: string
  message: string
  details?: string
  icon?: string
  type?: 'success' | 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: '❓',
  type: 'warning',
  confirmText: 'Bestätigen',
  cancelText: 'Abbrechen'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  close: []
}>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}

const handleBackdropClick = () => {
  emit('cancel')
  emit('close')
}
</script>