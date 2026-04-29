import { buildHomepageSchema } from '../../business.config'

// Serves the canonical JSON-LD schema for drivingteam.ch.
// Single source of truth is business.config.ts — never edit data here directly.
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/ld+json')
  return buildHomepageSchema()
})
