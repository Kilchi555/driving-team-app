<template>
  <nav aria-label="Breadcrumb" class="bg-gray-50 border-b border-gray-200">
    <div class="section-container py-3">
      <ol class="flex items-center space-x-2 text-sm">
        <li>
          <a href="/" class="text-primary-600 hover:text-primary-700 font-medium">🏠 Home</a>
        </li>
        <li class="text-gray-400">/</li>
        <li v-if="breadcrumbs.length === 0">
          <span class="text-gray-600 font-medium">Fahrschule Zürich</span>
        </li>
        <template v-else>
          <li v-for="(crumb, index) in breadcrumbs" :key="index" class="flex items-center space-x-2">
            <span v-if="index > 0" class="text-gray-400">/</span>
            <a 
              v-if="crumb.href" 
              :href="crumb.href" 
              class="text-primary-600 hover:text-primary-700 font-medium"
            >
              {{ crumb.label }}
            </a>
            <span v-else class="text-gray-600 font-medium">{{ crumb.label }}</span>
          </li>
        </template>
      </ol>
    </div>
  </nav>
</template>

<script setup lang="ts">
interface Breadcrumb {
  label: string
  href?: string
}

interface Props {
  breadcrumbs?: Breadcrumb[]
}

withDefaults(defineProps<Props>(), {
  breadcrumbs: () => []
})
</script>

<style scoped>
/* Breadcrumb Schema ist im Head definiert */
</style>
