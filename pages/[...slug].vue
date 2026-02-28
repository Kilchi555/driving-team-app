<template>
  <div>
    <!-- Dynamic content based on URL -->
    <CategoryPage v-if="pageType === 'category'" :slug="pageData.slug" />
    <PricingPage v-else-if="pageType === 'pricing'" />
    <AboutPage v-else-if="pageType === 'about'" />
    <ContactPage v-else-if="pageType === 'contact'" />
    <div v-else class="section-container py-16 text-center">
      <h1>Seite nicht gefunden</h1>
      <p><NuxtLink to="/">Zurück zur Startseite</NuxtLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { urlMappings } from '~/url-mappings'

const route = useRoute()
const path = route.path

// Get mapping for current path
const mapping = urlMappings[path as keyof typeof urlMappings] || null

const pageType = mapping?.type
const pageData = mapping

// Import components
import CategoryPage from '~/components/CategoryPage.vue'
import PricingPage from '~/components/PricingPage.vue'
import AboutPage from '~/components/AboutPage.vue'
import ContactPage from '~/components/ContactPage.vue'
</script>
