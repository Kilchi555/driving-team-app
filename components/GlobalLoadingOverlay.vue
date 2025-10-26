<template>
  <Teleport to="body">
    <div v-if="show" class="global-loading-overlay">
      <div class="loading-content">
        <div class="logo-container">
          <LoadingLogo 
            :size="logoSize"
            :tenant-id="tenantId"
            :loading-text="message"
            :show-progress="showProgress"
            :progress="progress"
          />
        </div>
        
        <div v-if="message" class="loading-message">
          {{ message }}
        </div>
        
        <div v-if="submessage" class="loading-submessage">
          {{ submessage }}
        </div>
        
        <!-- Progress bar -->
        <div v-if="showProgress" class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ 
                width: `${progress}%`,
                background: progressColor
              }"
            ></div>
          </div>
          <div class="progress-text">{{ progress }}%</div>
        </div>
        
        <!-- Cancel button for long operations -->
        <button 
          v-if="showCancel && onCancel"
          @click="onCancel"
          class="cancel-button"
        >
          Abbrechen
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show: boolean
  message?: string
  submessage?: string
  tenantId?: string
  logoSize?: 'small' | 'medium' | 'large'
  showProgress?: boolean
  progress?: number
  progressColor?: string
  showCancel?: boolean
  onCancel?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  message: 'Lädt...',
  logoSize: 'large',
  showProgress: false,
  progress: 0,
  progressColor: 'linear-gradient(90deg, #3B82F6, #1D4ED8)',
  showCancel: false
})

// Computed
const effectiveProgressColor = computed(() => {
  return props.progressColor || 'linear-gradient(90deg, #3B82F6, #1D4ED8)'
})
</script>

<style scoped>
.global-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
}

.loading-content {
  text-align: center;
  padding: 3rem 2rem;
  max-width: 400px;
  width: 100%;
}

.logo-container {
  margin-bottom: 2rem;
}

.loading-message {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.loading-submessage {
  font-size: 0.875rem;
  color: #6B7280;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.progress-container {
  margin: 2rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.75rem;
  color: #6B7280;
  font-weight: 500;
}

.cancel-button {
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background: #F3F4F6;
  color: #374151;
  border: 1px solid #D1D5DB;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.cancel-button:hover {
  background: #E5E7EB;
  border-color: #9CA3AF;
}

.cancel-button:focus {
  outline: none;
  ring: 2px;
  ring-color: #3B82F6;
  ring-opacity: 0.5;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .loading-content {
    padding: 2rem 1rem;
  }
  
  .loading-message {
    font-size: 1.125rem;
  }
}
</style>




















