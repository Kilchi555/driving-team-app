/**
 * GET /api/cron/year-end-reminder-2
 * Second (final) reminder – Jan 9th, one week before the Jan 15th deadline.
 * Delegates to the same handler as year-end-reminder; date-based round detection
 * returns round=2 when called on Jan 9th.
 */
export { default } from './year-end-reminder.get'
