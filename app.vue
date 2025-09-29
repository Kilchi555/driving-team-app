<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    
    <!-- Global Loading Overlay -->
    <GlobalLoadingOverlay 
      :show="isLoading"
      :message="currentLoading?.message"
      :submessage="currentLoading?.submessage"
      :tenant-id="currentLoading?.tenantId"
      :show-progress="currentLoading?.showProgress || false"
      :progress="currentLoading?.progress || 0"
      :show-cancel="currentLoading?.showCancel || false"
      :on-cancel="currentLoading?.onCancel"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { initializeOfflineSupport } from '~/utils/offlineQueue'

// Loading store
const { isLoading, currentLoading } = useLoadingStore()

// Beim App-Start Offline-Support initialisieren
onMounted(() => {
  initializeOfflineSupport()
})
</script>