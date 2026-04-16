// server/api/accounto/create-invoice.post.ts
// Accounto Public API v2 Integration

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointments, customerData, billingAddress, emailData, totalAmount } = body

    if (!appointments?.length || !customerData || !totalAmount) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
    }

    const apiKey = process.env.ACCOUNTO_API_KEY
    const baseUrl = process.env.ACCOUNTO_BASE_URL || 'https://api.accounto.ch'

    if (!apiKey) {
      throw createError({ statusCode: 500, statusMessage: 'ACCOUNTO_API_KEY not configured' })
    }

    // Decode tenant_id from JWT (it's in the payload, no secret needed for reading)
    let tenantId: number
    try {
      const payload = JSON.parse(Buffer.from(apiKey.split('.')[1], 'base64').toString())
      tenantId = payload.tenant_id
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Could not decode tenant_id from ACCOUNTO_API_KEY' })
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    // Step 1: Create or find customer address
    let addressId: number
    try {
      // Search for existing address by email
      const existingAddresses = await $fetch<any[]>(`${baseUrl}/v2/${tenantId}/addresses`, {
        headers,
      })
      const existing = existingAddresses?.find((a: any) => a.email === customerData.email)

      if (existing) {
        addressId = existing.id
      } else {
        const newAddress = await $fetch<any>(`${baseUrl}/v2/${tenantId}/addresses`, {
          method: 'POST',
          headers,
          body: {
            address_type: 'person',
            contact_person_name: `${customerData.firstName} ${customerData.lastName}`,
            email: customerData.email || '',
            phone: customerData.phone || '',
            street: billingAddress?.street || '',
            house_number: billingAddress?.street_number || '',
            postal_code: billingAddress?.zip || '',
            city_name: billingAddress?.city || '',
            country_code: 'CH',
            language_default: 'de',
          },
        })
        addressId = newAddress.id
      }
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        statusMessage: `Accounto address creation failed: ${err?.data?.message || err.message}`,
      })
    }

    // Step 2: Create invoice with line items
    const invoiceDate = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const itemsAttributes = appointments.map((apt: any, i: number) => ({
      title: apt.title || 'Fahrstunde',
      item_type: 'article',
      position: i + 1,
      price_cents: Math.round(apt.amount * 100),
      quantity: 1,
      tax_rate: 0, // Fahrschulen in CH haben i.d.R. 0% oder 8.1%
      unit: 'Stk.',
    }))

    const invoice = await $fetch<any>(`${baseUrl}/v2/${tenantId}/invoices`, {
      method: 'POST',
      headers,
      body: {
        invoice: {
          address_id: addressId,
          invoice_date: invoiceDate,
          due_date: dueDate,
          currency: 'CHF',
          status: 'draft',
          invoice_type: 'invoice',
          vat_included: false,
          items_attributes: itemsAttributes,
        },
      },
    })

    return {
      success: true,
      invoiceId: invoice.id,
      addressId,
      tenantId,
    }
  } catch (err: any) {
    // Non-fatal: log and rethrow so caller can handle as warning
    console.error('❌ Accounto API Error:', err?.data?.statusMessage || err.message)
    throw createError({
      statusCode: err.statusCode || 502,
      statusMessage: `Accounto API Error: ${err?.data?.statusMessage || err.message}`,
    })
  }
})
