<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="uiStore.notifications.length > 0"
        class="fixed bottom-0 right-0 m-4 z-[9999] space-y-2 pointer-events-none"
      >
        <TransitionGroup
          enter-active-class="transition ease-out duration-300"
          enter-from-class="translate-x-full opacity-0"
          enter-to-class="translate-x-0 opacity-100"
          leave-active-class="transition ease-in duration-200"
          leave-from-class="translate-x-0 opacity-100"
          leave-to-class="translate-x-full opacity-0"
        >
          <div
            v-for="notification in uiStore.notifications"
            :key="notification.id"
            class="pointer-events-auto w-full max-w-sm rounded-lg shadow-lg p-4 flex items-start gap-3"
            :class="getNotificationStyles(notification.type)"
          >
            <!-- Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <svg
                v-if="notification.type === 'success'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else-if="notification.type === 'error'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else-if="notification.type === 'warning'"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 4v.01M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <!-- Content -->
            <div class="flex-1">
              <h3 class="font-semibold">{{ notification.title }}</h3>
              <p v-if="notification.message" class="text-sm mt-1 opacity-90">
                {{ notification.message }}
              </p>
            </div>

            <!-- Close Button -->
            <button
              @click="uiStore.removeNotification(notification.id)"
              class="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useUIStore } from '~/stores/ui'

const uiStore = useUIStore()

const getNotificationStyles = (type: string) => {
  const baseStyles = 'text-white'
  const typeStyles: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  }
  return `${baseStyles} ${typeStyles[type] || typeStyles.info}`
}
</script>

