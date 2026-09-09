import { describe, expect, it } from 'vitest'
import { httpErrorForCourseWrite } from '../course-write-error'

describe('httpErrorForCourseWrite', () => {
  it('maps the payment method check constraint to HTTP 400', () => {
    expect(httpErrorForCourseWrite({
      code: '23514',
      message: 'new row for relation "courses" violates check constraint "courses_payment_method_check"',
    })).toEqual({
      statusCode: 400,
      statusMessage: 'Ungültige Zahlungsmethode. Erlaubt sind Online, Bar oder Rechnung.',
    })
  })

  it('keeps other database errors as HTTP 500', () => {
    expect(httpErrorForCourseWrite({
      code: '23505',
      message: 'duplicate key value violates unique constraint "courses_pkey"',
    })).toEqual({
      statusCode: 500,
      statusMessage: 'duplicate key value violates unique constraint "courses_pkey"',
    })
  })
})
