<template>
  <div class="tenant-logo" :class="containerClass">
    <!-- SVG Logo (bevorzugt) -->
    <div 
      v-if="logoType === 'svg'" 
      class="logo-svg"
      :style="logoStyles"
      v-html="svgContent"
    ></div>

    <!-- Maskiertes Logo (PNG/JPG mit Farbüberlagerung) -->
    <div 
      v-else-if="logoType === 'masked' && logoUrl" 
      class="logo-masked"
      :style="{
        ...logoStyles,
        mask: `url('${logoUrl}') no-repeat center / contain`,
        WebkitMask: `url('${logoUrl}') no-repeat center / contain`,
        backgroundColor: primaryColor
      }"
    ></div>

    <!-- Standard Bild-Logo -->
    <img 
      v-else-if="logoUrl" 
      :src="logoUrl" 
      :alt="altText"
      class="logo-image"
      :style="logoStyles"
    >

    <!-- Fallback: Text-Logo -->
    <div 
      v-else 
      class="logo-fallback"
      :style="{
        ...logoStyles,
        backgroundColor: primaryColor,
        color: 'white'
      }"
    >
      {{ fallbackText }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  // Logo-Eigenschaften
  logoUrl?: string
  svgContent?: string
  logoType?: 'svg' | 'masked' | 'image' | 'fallback'
  
  // Styling
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom'
  variant?: 'square' | 'wide' | 'standard'
  
  // Farben
  primaryColor?: string
  secondaryColor?: string
  
  // Text
  altText?: string
  fallbackText?: string
  
  // CSS-Klassen
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  logoType: 'image',
  size: 'md',
  variant: 'standard',
  primaryColor: '#1E40AF',
  secondaryColor: '#64748B',
  altText: 'Logo',
  fallbackText: 'DT',
  containerClass: ''
})

// Composables
const { primaryColor: tenantPrimary, secondaryColor: tenantSecondary } = useTenantBranding()

// Computed
const primaryColor = computed(() => props.primaryColor || tenantPrimary.value)
const secondaryColor = computed(() => props.secondaryColor || tenantSecondary.value)

const logoStyles = computed(() => {
  const sizeMap = {
    xs: { width: '1.5rem', height: '1.5rem' },
    sm: { width: '2rem', height: '2rem' },
    md: { width: '3rem', height: '3rem' },
    lg: { width: '4rem', height: '4rem' },
    xl: { width: '6rem', height: '6rem' },
    custom: {}
  }

  const variantMap = {
    square: { aspectRatio: '1 / 1' },
    wide: { aspectRatio: '3 / 1', width: 'auto', maxWidth: '12rem' },
    standard: {}
  }

  return {
    ...sizeMap[props.size],
    ...variantMap[props.variant]
  }
})

// SVG-Content mit dynamischen Farben verarbeiten
const processedSvgContent = computed(() => {
  if (!props.svgContent) return ''
  
  return props.svgContent
    .replace(/fill="[^"]*"/g, `fill="${primaryColor.value}"`)
    .replace(/stroke="[^"]*"/g, `stroke="${secondaryColor.value}"`)
    .replace(/var\(--color-primary\)/g, primaryColor.value)
    .replace(/var\(--color-secondary\)/g, secondaryColor.value)
})

// Auto-detect logo type
const logoType = computed(() => {
  if (props.logoType !== 'image') return props.logoType
  
  if (props.svgContent) return 'svg'
  if (props.logoUrl?.endsWith('.svg')) return 'svg'
  if (props.logoUrl && (props.logoUrl.endsWith('.png') || props.logoUrl.endsWith('.jpg'))) {
    return 'masked' // Kann maskiert werden
  }
  if (props.logoUrl) return 'image'
  return 'fallback'
})

const svgContent = computed(() => {
  if (logoType.value === 'svg') {
    return processedSvgContent.value
  }
  return ''
})
</script>

<style scoped>
.tenant-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logo-svg,
.logo-masked,
.logo-image,
.logo-fallback {
  transition: all 0.2s ease-in-out;
}

.logo-svg {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-svg :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-masked {
  flex-shrink: 0;
}

.logo-image {
  object-fit: contain;
  max-width: 100%;
  max-height: 100%;
}

.logo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: bold;
  font-family: var(--font-family-heading, system-ui);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Hover-Effekte */
.tenant-logo:hover .logo-svg,
.tenant-logo:hover .logo-masked,
.tenant-logo:hover .logo-image,
.tenant-logo:hover .logo-fallback {
  transform: scale(1.05);
}

/* Responsive Anpassungen */
@media (max-width: 640px) {
  .logo-fallback {
    font-size: 0.875rem;
  }
}
</style>




