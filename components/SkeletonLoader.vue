<template>
  <div class="animate-pulse">
    <div class="space-y-4">
      <!-- Table skeleton -->
      <div v-if="type === 'table'" class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <!-- Header -->
        <div class="bg-gray-50 px-6 py-3">
          <div class="grid grid-cols-6 gap-4">
            <div v-for="i in columns" :key="i" class="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
        <!-- Rows -->
        <div class="bg-white divide-y divide-gray-200">
          <div v-for="row in rows" :key="row" class="px-6 py-4">
            <div class="grid grid-cols-6 gap-4">
              <div v-for="col in columns" :key="col" class="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card skeleton -->
      <div v-else-if="type === 'card'" class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="h-4 bg-gray-200 rounded mb-2"></dt>
                <dd class="h-6 bg-gray-200 rounded"></dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats skeleton -->
      <div v-else-if="type === 'stats'" class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="h-4 bg-gray-200 rounded mb-2"></dt>
                  <dd class="h-6 bg-gray-200 rounded"></dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Generic skeleton -->
      <div v-else class="space-y-3">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'table' | 'card' | 'stats' | 'generic'
  columns?: number
  rows?: number
}

withDefaults(defineProps<Props>(), {
  type: 'generic',
  columns: 6,
  rows: 5
})
</script>
