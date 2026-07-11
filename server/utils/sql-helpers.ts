// ============================================
// SQL / PostgREST filter helpers
// ============================================

/**
 * Escapes `%`, `_`, and `\` before using a value in a Postgres `LIKE`/`ILIKE`
 * pattern (via Supabase's `.ilike()`/`.like()`). These characters are
 * wildcards — passing untrusted user input into `ilike()` unescaped lets an
 * attacker match arbitrary rows (e.g. `%` matches everything), which can leak
 * or misattribute data (wrong user matched, discount code guessed via partial
 * match, etc.). Always wrap user-supplied values with this before `ilike()`.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => '\\' + char)
}
