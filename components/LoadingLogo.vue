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
import { ref, onMounted, computed } from 'vue'
import { useLoadingLogo } from '~/composables/useLoadingLogo'

// Loading logo system
const { loadCurrentTenantLogo, isLoadingLogo, getTenantLogo, logoCache } = useLoadingLogo()

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  alt?: string
  tenantId?: string
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

// Load tenant logo on mount with immediate cache check
onMounted(async () => {
  try {
    if (props.tenantId) {
      console.log('🎯 LoadingLogo: Using explicit tenantId:', props.tenantId)
      
      // Check cache immediately for instant loading
      const cached = logoCache.value.get(props.tenantId)
      
      if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
        console.log('⚡ LoadingLogo: Instant cache hit!', cached.url)
        tenantLogo.value = cached.url
        // Still load in background to refresh cache
        getTenantLogo(props.tenantId).then((url: string | null) => {
          if (url !== tenantLogo.value) {
            tenantLogo.value = url
          }
        })
      } else {
        tenantLogo.value = await getTenantLogo(props.tenantId)
      }
    } else {
      console.log('🔄 LoadingLogo: Auto-detecting tenant from current user')
      tenantLogo.value = await loadCurrentTenantLogo()
    }
    console.log('✅ LoadingLogo: Final logo URL:', tenantLogo.value)
  } catch (err) {
    console.error('❌ Error loading tenant logo in LoadingLogo:', err)
    handleImageError()
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
