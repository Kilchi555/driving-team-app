import { defineEventHandler, readBody, createError } from 'h3'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { extractColorsFromImageBuffer } from '~/server/utils/extract-logo-colors'

const MAX_SIZE_BYTES = 2.5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const ip = getClientIP(event) || 'unknown'
  const rate = await checkRateLimit(ip, 'extract_logo_colors', 30, 60_000)
  if (!rate.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  const body = await readBody(event)
  const { logoData } = (body || {}) as { logoData?: string }
  if (!logoData || typeof logoData !== 'string' || !logoData.startsWith('data:image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid logoData' })
  }

  const base64 = logoData.split(',')[1]
  if (!base64) throw createError({ statusCode: 400, statusMessage: 'Invalid base64 data' })

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Logo too large' })
  }

  const palette = await extractColorsFromImageBuffer(buffer)
  return {
    colors: palette,
  }
})
