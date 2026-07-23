/**
 * Shared Meta Marketing API helpers
 * Used by meta-setup-campaigns and meta-upload-ad
 */

export const META_GRAPH = 'https://graph.facebook.com/v19.0'

/** Strip whitespace / accidental `\n` pasted into Vercel env values. */
function cleanMetaEnv(value: string | undefined | null): string {
  if (!value) return ''
  return value.trim().replace(/\\n$/i, '').replace(/\r?\n$/g, '').trim()
}

export function getMetaCredentials() {
  return {
    token: cleanMetaEnv(process.env.META_SYSTEM_USER_TOKEN ?? process.env.META_ACCESS_TOKEN),
    adAccount: cleanMetaEnv(process.env.META_AD_ACCOUNT_ID),
    pageId: cleanMetaEnv(process.env.META_PAGE_ID),
    pixelId: cleanMetaEnv(process.env.META_PIXEL_ID),
  }
}

export async function metaPost(path: string, body: Record<string, any>, token?: string): Promise<any> {
  const t = token ?? getMetaCredentials().token
  const res = await fetch(`${META_GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: t }),
  })
  const data = await res.json() as any
  if (!res.ok || data.error) {
    throw new Error(`Meta API [${path}]: ${data.error?.message ?? JSON.stringify(data)}`)
  }
  return data
}

export async function metaGet(path: string, params: Record<string, string>, token?: string): Promise<any> {
  const t = token ?? getMetaCredentials().token
  const url = new URL(`${META_GRAPH}/${path}`)
  url.searchParams.set('access_token', t)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  const data = await res.json() as any
  if (!res.ok || data.error) {
    throw new Error(`Meta API GET [${path}]: ${data.error?.message ?? JSON.stringify(data)}`)
  }
  return data
}
