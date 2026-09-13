/**
 * Source contract: `server/api/courses/enroll.post.ts` is the Nitro file that
 * actually binds POST /api/courses/enroll (HTTP 410).
 *
 * Mapping matches nitropack 2.13.4 `scanServerRoutes` (method suffix `.post`,
 * not a folder named `post.ts`).
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError, defineEventHandler } from 'h3'

const ROOT = process.cwd()
const ENROLL_POST = 'server/api/courses/enroll.post.ts'
const ENROLL_POST_SEGMENT = 'server/api/courses/enroll/post.ts'

/** Same suffix regex Nitro 2.13.4 uses in scanServerRoutes. */
const suffixRegex =
  /(\.(?<method>connect|delete|get|head|options|patch|post|put|trace))?(\.(?<env>dev|prod|prerender))?$/

function nitroRouteFromApiFile(relFromApi: string): { route: string; method: string | undefined } {
  let route = relFromApi.replace(/\.[A-Za-z]+$/, '')
  route = `/api/${route}`.replace(/\/+/g, '/')
  const suffixMatch = route.match(suffixRegex)
  let method: string | undefined
  if (suffixMatch?.index && suffixMatch.index >= 0) {
    route = route.slice(0, suffixMatch.index)
    method = suffixMatch.groups?.method
  }
  route = route.replace(/\/index$/, '') || '/'
  return { route, method }
}

function src(rel: string) {
  return readFileSync(resolve(ROOT, rel), 'utf8')
}

describe('POST /api/courses/enroll retirement (Nitro .post.ts)', () => {
  it('maps enroll.post.ts to POST /api/courses/enroll, not the path-segment file', () => {
    expect(existsSync(resolve(ROOT, ENROLL_POST))).toBe(true)
    expect(existsSync(resolve(ROOT, ENROLL_POST_SEGMENT))).toBe(true)

    expect(nitroRouteFromApiFile('courses/enroll.post.ts')).toEqual({
      route: '/api/courses/enroll',
      method: 'post',
    })
    expect(nitroRouteFromApiFile('courses/enroll-complete.post.ts')).toEqual({
      route: '/api/courses/enroll-complete',
      method: 'post',
    })
    expect(nitroRouteFromApiFile('courses/enroll/post.ts')).toEqual({
      route: '/api/courses/enroll/post',
      method: undefined,
    })
  })

  it('is a pure 410 retirement handler with no writer/auth/payment side effects', () => {
    const body = src(ENROLL_POST)
    expect(body).toContain('statusCode: 410')
    expect(body).toContain('/api/courses/enroll-wallee')
    expect(body).toContain('/api/courses/enroll-cash')
    expect(body).toMatch(/admin enrollment/i)
    expect(body).not.toMatch(/getAuthenticatedUser/)
    expect(body).not.toMatch(/jwt/i)
    expect(body).not.toMatch(/supabase/i)
    expect(body).not.toMatch(/transactionService/)
    expect(body).not.toMatch(/course_enrollments/)
    expect(body).not.toMatch(/from\('payments'\)/)
    expect(body).not.toMatch(/readBody/)
  })

  it('throws HTTP 410 when invoked', async () => {
    expect(typeof defineEventHandler).toBe('function')
    const handler = (await import('../../api/courses/enroll.post')).default as () => unknown
    try {
      await handler()
      throw new Error('expected 410')
    } catch (err) {
      if ((err as Error).message === 'expected 410') throw err
      expect((err as { statusCode?: number }).statusCode).toBe(410)
      expect(createError).toBeTypeOf('function')
    }
  })
})
