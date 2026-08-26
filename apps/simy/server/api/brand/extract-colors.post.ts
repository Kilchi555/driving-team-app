import { defineEventHandler, readBody, createError } from 'h3'

const APP_URL = 'https://app.simy.ch'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  try {
    return await $fetch<{ colors: [string, string, string] | null }>(
      `${APP_URL}/api/brand/extract-colors`,
      { method: 'POST', body },
    )
  } catch (err: any) {
    throw createError({
      statusCode: err.status || 502,
      statusMessage: err.data?.statusMessage || 'Farben konnten nicht gelesen werden',
    })
  }
})
