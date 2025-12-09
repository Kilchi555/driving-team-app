/**
 * Logger Plugin - Makes logger available globally in Nuxt app
 */

import { logger } from '~/utils/logger'

export default defineNuxtPlugin(() => {
  // Make logger available as $logger in templates and setup
  return {
    provide: {
      logger
    }
  }
})

