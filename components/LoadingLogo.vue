<template>
  <div class="flex justify-center items-center">
    <!-- Show actual tenant logo when available -->
    <img v-if="effectiveLogoUrl && !showGenericLoader"
      :src="effectiveLogoUrl" 
      :alt="alt || 'Tenant Logo'"
      :class="[
        'object-contain transition-opacity duration-300',
        sizeClasses[size] || sizeClasses.md,
        { 
          'opacity-0': isLoadingLogo,
          'opacity-100': !isLoadingLogo
        }
      ]"
      @error="handleImageError"
      @load="handleImageLoad"
    />
    
    <!-- Show generic loading spinner as fallback -->
    <div v-else 
         :class="[
           'flex items-center justify-center border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin',
           sizeClasses[size] || sizeClasses.md
         ]"
         :title="isLoadingLogo ? 'Logo wird geladen...' : 'Kein Logo verfügbar'">
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed, watch } from 'vue'
import { useLoadingLogo } from '~/composables/useLoadingLogo'

// Loading logo system
const { loadCurrentTenantLogo, isLoadingLogo, getTenantLogo, getTenantLogoBySlug, logoCache } = useLoadingLogo()

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  alt?: string
  tenantId?: string
  tenantSlug?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  alt: ''
})

// State
const tenantLogo = ref<string | null>(null)
const imageError = ref(false)

// Computed
const effectiveLogoUrl = computed(() => {
  return tenantLogo.value
})

const showGenericLoader = computed(() => {
  return !tenantLogo.value || imageError.value
})

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-32 w-32'
}

// Methods
const handleImageError = () => {
  console.warn('⚠️ LoadingLogo: Image failed to load, using fallback')
  imageError.value = true
}

const handleImageLoad = () => {
  imageError.value = false
}

// Function to load logo for a specific tenant
const loadLogoForTenant = async (tenantId: string | null, tenantSlug?: string) => {
  try {
    if (tenantId) {
      logger.debug('🎯 LoadingLogo: Using explicit tenantId:', tenantId)
      
      // Check cache immediately for instant loading
      const cached = logoCache.value.get(tenantId)
      
      if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
        logger.debug('⚡ LoadingLogo: Instant cache hit!', cached.url)
        tenantLogo.value = cached.url
        // Still load in background to refresh cache
        getTenantLogo(tenantId).then((url: string | null) => {
          if (url !== tenantLogo.value) {
            tenantLogo.value = url
          }
        })
      } else {
        tenantLogo.value = await getTenantLogo(tenantId)
      }
    } else if (tenantSlug) {
      logger.debug('🎯 LoadingLogo: Using tenantSlug:', tenantSlug)
      tenantLogo.value = await getTenantLogoBySlug(tenantSlug)
    } else {
      logger.debug('🔄 LoadingLogo: Auto-detecting tenant from current user')
      tenantLogo.value = await loadCurrentTenantLogo()
    }
    logger.debug('✅ LoadingLogo: Final logo URL:', tenantLogo.value)
  } catch (err) {
    console.error('❌ Error loading tenant logo in LoadingLogo:', err)
    handleImageError()
  }
}

// Load tenant logo on mount with immediate cache check
onMounted(async () => {
  await loadLogoForTenant(props.tenantId, props.tenantSlug)
})

// Watch for changes in tenantId or tenantSlug props
watch([() => props.tenantId, () => props.tenantSlug], async ([newTenantId, newTenantSlug], [oldTenantId, oldTenantSlug]) => {
  if (newTenantId !== oldTenantId || newTenantSlug !== oldTenantSlug) {
    logger.debug('🔄 LoadingLogo: props changed:', { 
      tenantId: { from: oldTenantId, to: newTenantId },
      tenantSlug: { from: oldTenantSlug, to: newTenantSlug }
    })
    await loadLogoForTenant(newTenantId, newTenantSlug)
  }
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
