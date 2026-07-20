<template>
  <div class="min-h-screen bg-gray-50">
    <div class="bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
        <NuxtLink to="/dashboard" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </NuxtLink>
        <h1 class="text-base font-semibold text-gray-900 flex-1">Beleg einreichen</h1>
      </div>
    </div>

    <div
      class="max-w-lg mx-auto px-4 py-4"
      style="padding-left: max(1rem, env(safe-area-inset-left)); padding-right: max(1rem, env(safe-area-inset-right))"
    >
      <StaffExpenseSubmit />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>
