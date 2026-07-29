import { getValidAccessToken, resolveGbpLocation } from '~/server/utils/gbp'

const QANDA_BASE = 'https://mybusinessqanda.googleapis.com/v1'

export interface GbpQuestion {
  name: string
  text: string
  createTime: string
  updateTime: string
  author?: { displayName?: string; type?: string }
  totalAnswerCount: number
  topAnswers: { name: string; text: string; author?: { displayName?: string; type?: string } }[]
}

/**
 * List Q&A for a location. Returns questions with up to `answersPerQuestion` answers each.
 */
export async function listGbpQuestions(tenantId: string, locationId?: string | null): Promise<GbpQuestion[]> {
  const accessToken = await getValidAccessToken(tenantId)
  const loc = await resolveGbpLocation(tenantId, locationId)

  const res = await fetch(
    `${QANDA_BASE}/${loc.gbp_location_id}/questions?pageSize=50&answersPerQuestion=5&orderBy=updateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `GBP Q&A fetch failed (${res.status})`)

  return (data.questions ?? []).map((q: any) => ({
    name: q.name,
    text: q.text,
    createTime: q.createTime,
    updateTime: q.updateTime,
    author: q.author,
    totalAnswerCount: q.totalAnswerCount ?? 0,
    topAnswers: (q.topAnswers ?? []).map((a: any) => ({ name: a.name, text: a.text, author: a.author })),
  }))
}

/**
 * Post a new FAQ question as the business owner (seeds a Q&A that can then be answered).
 */
export async function createGbpQuestion(tenantId: string, text: string, locationId?: string | null) {
  const accessToken = await getValidAccessToken(tenantId)
  const loc = await resolveGbpLocation(tenantId, locationId)

  const res = await fetch(`${QANDA_BASE}/${loc.gbp_location_id}/questions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `GBP question create failed (${res.status})`)
  return data
}

/**
 * Create or update the owner's answer for a question.
 * `questionName` is the full resource name, e.g. "locations/123/questions/456".
 */
export async function answerGbpQuestion(tenantId: string, questionName: string, text: string) {
  const accessToken = await getValidAccessToken(tenantId)

  const res = await fetch(`${QANDA_BASE}/${questionName}/answers:upsert`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer: { text } }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `GBP answer failed (${res.status})`)
  return data
}

/**
 * Delete a question the business owner created (e.g. a seeded FAQ entry).
 */
export async function deleteGbpQuestion(tenantId: string, questionName: string) {
  const accessToken = await getValidAccessToken(tenantId)
  const res = await fetch(`${QANDA_BASE}/${questionName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.ok ? { success: true } : res.json()
}
