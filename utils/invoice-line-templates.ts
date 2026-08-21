export type InvoiceLineTemplateKind = 'product' | 'service' | 'course'
export type InvoiceLineTemplateGroup = 'Dienstleistungen' | 'Kurse' | 'Produkte'

export interface InvoiceLineTemplate {
  id: string
  kind: InvoiceLineTemplateKind
  group: InvoiceLineTemplateGroup
  name: string
  description?: string
  /** Multi-line text written onto the invoice line (e.g. course sessions). */
  details?: string
  price_rappen: number
  product_id?: string
}

export function filterInvoiceLineTemplates(
  templates: InvoiceLineTemplate[],
  query: string,
  limit = 16,
): InvoiceLineTemplate[] {
  const q = (query || '').trim().toLowerCase()
  const list = q
    ? templates.filter((row) => {
        return [row.name, row.description, row.details, row.group]
          .filter(Boolean)
          .some((part) => String(part).toLowerCase().includes(q))
      })
    : templates
  if (!limit || limit <= 0) return list
  if (q) return list.slice(0, limit)

  // Empty query: keep all groups visible (services used to hide Kurse/Produkte).
  const groups = groupInvoiceLineTemplates(list)
  if (groups.length <= 1) return list.slice(0, limit)
  const perGroup = Math.max(4, Math.ceil(limit / groups.length))
  return groups.flatMap((g) => g.items.slice(0, perGroup)).slice(0, limit)
}

export function groupInvoiceLineTemplates(templates: InvoiceLineTemplate[]): Array<{
  label: InvoiceLineTemplateGroup
  items: InvoiceLineTemplate[]
}> {
  const order: InvoiceLineTemplateGroup[] = ['Dienstleistungen', 'Kurse', 'Produkte']
  return order
    .map((label) => ({ label, items: templates.filter((t) => t.group === label) }))
    .filter((g) => g.items.length > 0)
}
