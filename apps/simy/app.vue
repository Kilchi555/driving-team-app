<template>
  <div>
    <NuxtPage />
    <CookieBanner />
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/main.css'
import { SIMY_ORG, SIMY_WEBSITE, ldScripts } from '~/utils/schema'
import {
  SIMY_BRAND,
  SIMY_BRAND_STORAGE_KEY,
  applyBrandCssVars,
} from '~/utils/brand'

useHead({
  script: ldScripts(SIMY_ORG, SIMY_WEBSITE),
})

onMounted(() => {
  try {
    const raw = localStorage.getItem(SIMY_BRAND_STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { primary?: string; secondary?: string; accent?: string }
      applyBrandCssVars(
        data.primary || SIMY_BRAND.primary,
        data.secondary || SIMY_BRAND.secondary,
        data.accent || SIMY_BRAND.accent,
      )
    } else {
      applyBrandCssVars()
    }
  } catch {
    applyBrandCssVars()
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== SIMY_BRAND_STORAGE_KEY || !e.newValue) return
    try {
      const data = JSON.parse(e.newValue) as { primary?: string; secondary?: string; accent?: string }
      applyBrandCssVars(
        data.primary || SIMY_BRAND.primary,
        data.secondary || SIMY_BRAND.secondary,
        data.accent || SIMY_BRAND.accent,
      )
    } catch { /* ignore */ }
  }
  window.addEventListener('storage', onStorage)
  onUnmounted(() => window.removeEventListener('storage', onStorage))
})
</script>
