import type { SupabaseClient } from '@supabase/supabase-js'

export const NO_FURTHER_LESSONS_REASONS = ['exam_passed', 'stopped'] as const
export type NoFurtherLessonsReason = typeof NO_FURTHER_LESSONS_REASONS[number]

export function normalizeNoFurtherLessonsReason(value: unknown): NoFurtherLessonsReason | null {
  if (value === 'exam_passed' || value === 'stopped') return value
  return null
}

export async function setNoFurtherLessons(
  supabase: SupabaseClient,
  userId: string,
  reason: NoFurtherLessonsReason | null
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(
      reason
        ? {
            no_further_lessons_at: new Date().toISOString(),
            no_further_lessons_reason: reason
          }
        : {
            no_further_lessons_at: null,
            no_further_lessons_reason: null
          }
    )
    .eq('id', userId)
    .eq('role', 'client')

  if (error) throw error
}
