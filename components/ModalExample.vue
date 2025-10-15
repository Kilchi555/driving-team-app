<!-- Example component showing how to use the useModal composable -->
<template>
  <div>
    <!-- Button to open modal -->
    <button @click="modal.open()" class="bg-blue-600 text-white px-4 py-2 rounded">
      Open Modal
    </button>

    <!-- Modal using composable -->
    <div v-if="modal.isOpen.value" :class="modal.getModalWrapperClasses()" @click="modal.close()">
      <div :class="modal.getStickyModalContentClasses('md')" @click="modal.handleClickStop">
        
        <!-- Header -->
        <div :class="modal.getStickyModalHeaderClasses()">
          <h2 class="text-xl font-bold text-gray-900">Example Modal</h2>
        </div>
        
        <!-- Body -->
        <div :class="modal.getStickyModalBodyClasses()">
          <p class="text-gray-600">This is modal content that can scroll.</p>
          <!-- Add more content here to test scrolling -->
          <div v-for="i in 20" :key="i" class="p-4 border-b">
            Content item {{ i }}
          </div>
        </div>
        
        <!-- Footer -->
        <div :class="modal.getStickyModalFooterClasses()">
          <button @click="modal.close()" class="px-4 py-2 bg-gray-500 text-white rounded">
            Close
          </button>
          <button @click="handleSave()" class="px-4 py-2 bg-green-600 text-white rounded">
            Save
          </button>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup>
import { useModal } from '~/composables/useModal'

const modal = useModal()

const handleSave = () => {
  console.log('Save clicked')
  modal.close()
}
</script>
