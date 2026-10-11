/**
 * Code-path analysis for public courses without course_category embed.
 * No production data mutation.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_CATEGORY_ENROLLMENT_FIELDS,
  resolveCategoryEnrollmentFields,
} from '~/utils/category-enrollment-fields'

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

describe('public courses without course_category — enrollment_fields fallback', () => {
  it('public.get embeds course_categories via course_category relationship', () => {
    const src = read('server/api/courses/public.get.ts')
    expect(src).toContain('course_category:course_categories')
    expect(src).toContain('enrollment_fields')
    // Embed is FK-driven; null course_category_id ⇒ null course_category object
    expect(src).toMatch(/course_category_id|course_category:course_categories/)
  })

  it('CourseEnrollmentModal resolves null category fields to all-required defaults', () => {
    const modal = read('components/customer/CourseEnrollmentModal.vue')
    expect(modal).toContain('resolveCategoryEnrollmentFields(props.course?.course_category?.enrollment_fields)')
    expect(resolveCategoryEnrollmentFields(undefined)).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
    expect(resolveCategoryEnrollmentFields(null)).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
  })

  it('enroll handlers resolve missing course_category.enrollment_fields to defaults', () => {
    for (const rel of [
      'server/api/courses/enroll-cash.post.ts',
      'server/api/courses/enroll-wallee.post.ts',
    ]) {
      const src = read(rel)
      expect(src).toContain('course.course_category?.enrollment_fields')
      expect(src).toContain('resolveCategoryEnrollmentFields')
    }
    expect(resolveCategoryEnrollmentFields(undefined)).toEqual(DEFAULT_CATEGORY_ENROLLMENT_FIELDS)
  })
})
