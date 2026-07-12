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

/**
 * Escapes a value for safe interpolation into a PostgREST `.or()`/`.filter()`
 * condition string (e.g. `` `col1.ilike.${term},col2.ilike.${term}` ``).
 * Wraps the value in double quotes and escapes backslashes/quotes inside it,
 * so that commas, parentheses, and periods in user input are treated as
 * literal characters instead of being parsed as additional filter conditions
 * — otherwise a value like `foo,bar.eq.1)or(role.eq.admin` could inject extra
 * clauses into the query.
 */
export function escapeOrFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

/**
 * Whitelists a dynamic JSON key used to build `raw_json->>KEY` path
 * expressions from user input. Rejects anything containing characters that
 * could break out of the intended path expression (`.`, `,`, `(`, `)`, `>`,
 * quotes, backslashes, etc.). Returns null if the key is invalid.
 */
export function sanitizeJsonColumnKey(key: string): string | null {
  const trimmed = key.trim()
  if (!trimmed || trimmed.length > 64) return null
  if (!/^[\p{L}\p{N} _-]+$/u.test(trimmed)) return null
  return trimmed
}
