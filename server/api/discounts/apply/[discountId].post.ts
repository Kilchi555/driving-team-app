import { defineEventHandler, createError } from 'h3'

/**
 * POST /api/discounts/apply/:discountId
 * PR-A C2 — removed. This route must not mutate usage counters.
 */
export default defineEventHandler(async () => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Gone — /api/discounts/apply/:id is disabled',
  })
})
