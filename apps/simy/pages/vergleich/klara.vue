<template>
  <SimyComparisonLanding v-if="comparison" :comparison="comparison" />
</template>

<script setup lang="ts">
import { getComparison } from '~/data/comparisons'

const comparison = getComparison('klara')
if (!comparison) {
  throw createError({ statusCode: 404, statusMessage: 'Comparison not found' })
}
</script>
