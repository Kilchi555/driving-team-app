/** Client-safe labels for staff product-sale payments. No money is computed for writes. */

export function staffProductLines(metadata: any): Array<{
  name: string
  quantity: number
  price_rappen: number
}> {
  const products = metadata?.products
  if (!Array.isArray(products)) return []
  return products
    .map((product) => ({
      name: String(product?.name || 'Produkt'),
      quantity: Number(product?.quantity) || 0,
      price_rappen: Number(product?.price_rappen) || 0,
    }))
    .filter((product) => product.quantity > 0)
}

export function staffProductSaleTitle(payment: {
  appointment?: { event_type_label?: string | null; event_types?: { name?: string | null } | null; event_type_code?: string | null; type?: string | null } | null
  metadata?: any
}): string {
  const appointment = payment?.appointment
  if (appointment) {
    const label = appointment.event_type_label
      || appointment.event_types?.name
      || appointment.event_type_code
      || 'Termin'
    return appointment.type ? `${label} · Kat. ${appointment.type}` : label
  }
  const lines = staffProductLines(payment?.metadata)
  if (lines.length === 0) return 'Produkt'
  return lines.map((line) => `${line.quantity}× ${line.name}`).join(', ')
}

export function staffProductSaleRows(payment: { id?: string; metadata?: any }) {
  if (payment?.metadata?.source !== 'staff_product_sale') return []
  return staffProductLines(payment.metadata).map((line, index) => ({
    id: `${payment.id || 'sale'}-${index}`,
    quantity: line.quantity,
    unit_price_rappen: line.price_rappen,
    products: { name: line.name },
  }))
}
