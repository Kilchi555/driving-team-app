<template>
  <label class="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="$emit('update:modelValue', $event.target.checked)"
      class="sr-only peer"
      :disabled="disabled"
    />
    <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
    <span v-if="label" class="ml-3 text-sm font-medium" :class="labelClass">
      {{ label }}
    </span>
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  label?: string
  disabled?: boolean
  labelClass?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
/* Custom toggle styling */
.peer:checked + div {
  background-color: #3B82F6; /* blue-500 */
}

.peer:focus + div {
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.peer:disabled + div {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Smooth animations */
.peer + div,
.peer + div::after {
  transition: all 0.2s ease-in-out;
}

/* Custom colors for different states */
.toggle-green .peer:checked + div {
  background-color: #10B981; /* green-500 */
}

.toggle-red .peer:checked + div {
  background-color: #EF4444; /* red-500 */
}

.toggle-purple .peer:checked + div {
  background-color: #8B5CF6; /* purple-500 */
}
</style>
