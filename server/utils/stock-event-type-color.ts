/** Palette copied onto new tenants from Simy business-type templates. */
const STOCK_EVENT_TYPE_COLORS = new Set([
  '#6366f1',
  '#0ea5e9',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#666666',
])

export function isStockEventTypeColor(color: unknown): boolean {
  if (typeof color !== 'string') return true
  return STOCK_EVENT_TYPE_COLORS.has(color.trim().toLowerCase())
}
