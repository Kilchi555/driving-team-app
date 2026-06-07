// Proxy to app.simy.ch so the simy.ch marketing page can upload
// a preview logo and pass it via URL to the tenant registration flow.
import { defineEventHandler, readBody, createError } from 'h3'

const APP_URL = 'https://app.simy.ch'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  try {
    const res = await $fetch<{ token: string; publicUrl: string }>(
      `${APP_URL}/api/brand/temp-logo`,
      { method: 'POST', body },
    )
    return res
  } catch (err: any) {
    throw createError({
      statusCode: err.status || 502,
      statusMessage: err.data?.statusMessage || 'Logo-Upload fehlgeschlagen',
    })
  }
})
