export interface StudentExamInfo {
  category?: string[] | null
  exam_passed_categories?: string[] | null
  no_further_lessons_at?: string | null
}

/** Normalizes "B Automatik" → "B" so it matches exam_passed_categories. */
export function isCategoryPassed(student: StudentExamInfo, cat: string): boolean {
  const passed: string[] = student.exam_passed_categories || []
  if (!passed.length) return false
  const normalizedCat = cat.trim().split(' ')[0]
  return passed.some(p => p === cat || p === normalizedCat)
}

/** True when the student has enrolled categories and every one is passed. */
export function isStudentCompleted(student: StudentExamInfo): boolean {
  const categories: string[] = student.category || []
  if (!categories.length) return false
  return categories.every(cat => isCategoryPassed(student, cat))
}

/** Student said they no longer need lessons (exam elsewhere or stopped). */
export function hasStoppedLessons(student: Pick<StudentExamInfo, 'no_further_lessons_at'>): boolean {
  return !!student.no_further_lessons_at
}

/** Completed exam or opted out of further lessons. */
export function isStudentOutOfTraining(student: StudentExamInfo): boolean {
  return isStudentCompleted(student) || hasStoppedLessons(student)
}
