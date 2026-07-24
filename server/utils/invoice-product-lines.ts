/**
 * Produkte als eigene Rechnungspositionen ausweisen (nicht unter der Lektionszeile bundeln).
 *
 * Alte Rechnungen speichern oft Lektion+Produkt als eine Zeile; product_sales
 * bzw. product_details werden dann separat eingeblendet — das führt zu
 * Doppelzählung in der UI. Diese Helper splitten korrekt auf.
 */

export type InvoiceProductDetail = {
  name: string
  price_rappen: number
  product_id?: string | null
  quantity?: number
}

type ExpandableItem = {
  appointment_id?: string | null
  product_id?: string | null
  product_name?: string
  product_description?: string | null
  quantity?: number
  unit_price_rappen?: number
  total_price_rappen?: number
  vat_rate?: number
  vat_amount_rappen?: number
  sort_order?: number
  products_price_rappen?: number
  product_details?: InvoiceProductDetail[]
  _is_product_sale?: boolean
  [key: string]: unknown
}

/**
 * Reduziert gebündelte Termin-Zeilen um den Produktanteil und hängt Produkte
 * als eigene Positionen an. Bereits separat gespeicherte Produkt-Zeilen
 * (mit product_id) werden nicht nochmals ergänzt.
 */
export function expandProductsAsSeparateLines<T extends ExpandableItem>(
  items: T[],
  productsByAppointment: Record<string, InvoiceProductDetail[]>
): T[] {
  if (!items.length) return items

  const result: T[] = []
  let nextSort = Math.max(0, ...items.map((i) => i.sort_order ?? 0)) + 1

  for (const item of items) {
    const aptId = item.appointment_id
    const products = aptId ? productsByAppointment[aptId] || [] : []

    // Produktzeilen selbst nicht nochmals splitten
    if (item.product_id || item._is_product_sale) {
      result.push({
        ...item,
        products_price_rappen: 0,
        product_details: [],
      })
      continue
    }

    // Schon separat in den invoice_items vorhanden?
    const alreadySeparate = aptId
      ? items.some(
          (i) =>
            i.appointment_id === aptId &&
            (i.product_id || i._is_product_sale) &&
            i !== item
        )
      : false

    if (!aptId || products.length === 0 || alreadySeparate) {
      result.push({
        ...item,
        products_price_rappen: 0,
        product_details: [],
      })
      continue
    }

    const productsTotal = products.reduce((sum, p) => sum + (p.price_rappen || 0), 0)
    const unit = Number(item.unit_price_rappen) || 0
    const total = Number(item.total_price_rappen) || 0
    // Nur abziehen wenn der Produktanteil noch in der Terminzeile steckt
    const bundled = productsTotal > 0 && total >= productsTotal

    result.push({
      ...item,
      unit_price_rappen: bundled ? Math.max(0, unit - productsTotal) : unit,
      total_price_rappen: bundled ? Math.max(0, total - productsTotal) : total,
      products_price_rappen: 0,
      product_details: [],
    })

    for (const pd of products) {
      const qty = pd.quantity || 1
      const price = pd.price_rappen || 0
      result.push({
        ...item,
        id: `product-${aptId}-${pd.product_id || pd.name}`,
        product_id: pd.product_id || null,
        product_name: pd.name || 'Produkt',
        product_description: null,
        appointment_title: null,
        appointment_date: null,
        appointment_duration_minutes: null,
        appointment_start_time: null,
        quantity: qty,
        unit_price_rappen: price,
        total_price_rappen: price * qty,
        vat_amount_rappen: 0,
        sort_order: nextSort++,
        lesson_price_rappen: 0,
        admin_fee_rappen: 0,
        products_price_rappen: 0,
        discount_amount_rappen: 0,
        voucher_discount_rappen: 0,
        credit_used_rappen: 0,
        product_details: [],
        _is_product_sale: true,
        notes: null,
      } as T)
    }
  }

  return result
}

/** product_sales-Rows → Map appointment_id → Produkte */
export function groupProductSalesByAppointment(
  productSales: Array<{
    appointment_id?: string | null
    total_price_rappen?: number | null
    quantity?: number | null
    product_id?: string | null
    products?: { id?: string; name?: string } | null
  }>
): Record<string, InvoiceProductDetail[]> {
  const byApt: Record<string, InvoiceProductDetail[]> = {}
  for (const ps of productSales) {
    if (!ps.appointment_id) continue
    const prod = ps.products
    if (!byApt[ps.appointment_id]) byApt[ps.appointment_id] = []
    byApt[ps.appointment_id].push({
      name: prod?.name || 'Produkt',
      price_rappen: ps.total_price_rappen || 0,
      product_id: ps.product_id || prod?.id || null,
      quantity: ps.quantity || 1,
    })
  }
  return byApt
}
