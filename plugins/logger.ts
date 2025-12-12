// plugins/logger.ts
import { logger } from '~/utils/logger'

export default defineNuxtPlugin(() => {
  return {
    provide: {
      logger
    }
  }
})
