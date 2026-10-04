<template>
  <div class="mt-2 flex flex-wrap gap-1.5" @click.stop>
    <button
      type="button"
      class="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      @click="$emit('edit')"
    >
      Bearbeiten
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
      :disabled="busy"
      @click="$emit('resend')"
    >
      <svg v-if="busy" class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>{{ busy ? 'Senden…' : 'Einladung erneut senden' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  busy?: boolean
}>()

defineEmits<{
  edit: []
  resend: []
}>()
</script>
