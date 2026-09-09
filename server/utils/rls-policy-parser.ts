/**
 * Parse CREATE POLICY statements from a SQL migration.
 * Used by security contract tests when a live JWT/RLS database is not available.
 *
 * LIMITATION: this is not a live RLS probe. Production behavior still depends
 * on applying the migration.
 */

export type PolicyCommand = 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

export type ParsedPolicy = {
  name: string
  table: string
  command: PolicyCommand
  roles: string[]
  using: string | null
  withCheck: string | null
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
}

function extractParen(source: string, openIndex: number): string | null {
  if (source[openIndex] !== '(') return null
  let depth = 0
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1
    if (source[i] === ')') {
      depth -= 1
      if (depth === 0) {
        return source.slice(openIndex + 1, i).replace(/\s+/g, ' ').trim()
      }
    }
  }
  return null
}

export function parseCreatePolicies(sql: string): ParsedPolicy[] {
  const body = stripSqlComments(sql)
  const policies: ParsedPolicy[] = []
  const re =
    /CREATE\s+POLICY\s+"?([A-Za-z0-9_]+)"?\s+ON\s+((?:[A-Za-z0-9_]+\.)?[A-Za-z0-9_]+)\s+FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\s+TO\s+([A-Za-z0-9_]+(?:\s*,\s*[A-Za-z0-9_]+)*)/gi

  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const start = match.index
    const nextCreate = body.slice(start + match[0].length).search(/CREATE\s+POLICY\b/i)
    const chunk = nextCreate === -1
      ? body.slice(start)
      : body.slice(start, start + match[0].length + nextCreate)

    const usingIdx = chunk.search(/\bUSING\s*\(/i)
    const withCheckIdx = chunk.search(/\bWITH CHECK\s*\(/i)

    policies.push({
      name: match[1],
      table: match[2].replace(/^public\./, ''),
      command: match[3].toUpperCase() as PolicyCommand,
      roles: match[4].split(',').map((role) => role.trim()).filter(Boolean),
      using: usingIdx >= 0 ? extractParen(chunk, usingIdx + chunk.slice(usingIdx).indexOf('(')) : null,
      withCheck:
        withCheckIdx >= 0
          ? extractParen(chunk, withCheckIdx + chunk.slice(withCheckIdx).indexOf('('))
          : null,
    })
  }

  return policies
}

export function policiesForTable(sql: string, table: string): ParsedPolicy[] {
  const suffix = table.replace(/^public\./, '')
  return parseCreatePolicies(sql).filter((policy) => policy.table === suffix)
}
