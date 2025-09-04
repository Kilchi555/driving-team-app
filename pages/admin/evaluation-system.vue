<template>
  <div>
    <AdminLayout>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Bewertungssystem</h1>
            <p class="text-gray-600">Verwalten Sie Kategorien, Kriterien und Bewertungsskala</p>
          </div>
        </div>
      </template>

      <EvaluationSystemManagerInline />
    </AdminLayout>
  </div>
</template>

<script setup lang="ts">
import EvaluationSystemManagerInline from '~/components/admin/EvaluationSystemManagerInline.vue'

// @ts-ignore
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})
</script>
