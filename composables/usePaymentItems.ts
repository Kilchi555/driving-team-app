// composables/usePaymentItems.ts
// DEPRECATED: Diese Datei ist ein Stub - payment_items Tabelle wurde gelöscht
// Produkte werden jetzt in product_sales gespeichert
// Rabatte werden jetzt in discount_sales gespeichert

export const usePaymentItems = () => {
  // Stub-Funktionen für Abwärtskompatibilität
  const createPaymentItem = async () => {
    console.warn('⚠️ createPaymentItem ist deprecated - payment_items Tabelle existiert nicht mehr')
    return null
  }

  const addAppointmentItem = async () => {
    console.warn('⚠️ addAppointmentItem ist deprecated - payment_items Tabelle existiert nicht mehr')
    return null
  }

  const addProductItem = async () => {
    console.warn('⚠️ addProductItem ist deprecated - nutze product_sales Tabelle')
    return null
  }

  const addDiscountItem = async () => {
    console.warn('⚠️ addDiscountItem ist deprecated - nutze discount_sales Tabelle')
    return null
  }

  return {
    createPaymentItem,
    addAppointmentItem,
    addProductItem,
    addDiscountItem
  }
}

