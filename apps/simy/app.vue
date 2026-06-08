<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import '~/assets/css/main.css'

const DEFAULT_PRIMARY   = '#6000BD'
const DEFAULT_SECONDARY = '#8B2FE8'
const BRAND_KEY = 'simy_brand_preview'

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function applyBranding(primary: string, secondary: string) {
  const root = document.documentElement
  root.style.setProperty('--brand-primary',   primary)
  root.style.setProperty('--brand-secondary',  secondary)
  root.style.setProperty('--brand-rgb',        hexToRgb(primary))
  root.style.setProperty('--brand-2-rgb',      hexToRgb(secondary))
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(BRAND_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { primary?: string; secondary?: string }
      applyBranding(data.primary || DEFAULT_PRIMARY, data.secondary || DEFAULT_SECONDARY)
    } else {
      applyBranding(DEFAULT_PRIMARY, DEFAULT_SECONDARY)
    }
  } catch {
    applyBranding(DEFAULT_PRIMARY, DEFAULT_SECONDARY)
  }

  // React to brand changes made on the same tab (index.vue writes to localStorage)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== BRAND_KEY || !e.newValue) return
    try {
      const data = JSON.parse(e.newValue) as { primary?: string; secondary?: string }
      applyBranding(data.primary || DEFAULT_PRIMARY, data.secondary || DEFAULT_SECONDARY)
    } catch { /* ignore */ }
  }
  window.addEventListener('storage', onStorage)
  onUnmounted(() => window.removeEventListener('storage', onStorage))
})
</script>
