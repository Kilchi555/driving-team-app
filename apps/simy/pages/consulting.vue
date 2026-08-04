<template>
  <SimyVerticalLanding v-if="vertical" :vertical="vertical" />
</template>

<script setup lang="ts">
import { getVertical } from '~/data/verticals'

const vertical = getVertical('consulting')
if (!vertical) {
  throw createError({ statusCode: 404, statusMessage: 'Vertical not found' })
}
</script>
