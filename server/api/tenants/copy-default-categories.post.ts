export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id } = body

    if (!tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required'
      })
    }

    const supabase = getSupabase()

    // 1. Prüfen ob der Tenant existiert
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found'
      })
    }

    // 2. Standard-Templates für den Tenant kopieren
    const { data: standardCategories, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .is('tenant_id', null)  // Standard-Templates haben tenant_id = null
      .eq('is_active', true)

    if (fetchError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch standard categories: ${fetchError.message}`
      })
    }

    if (!standardCategories || standardCategories.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No standard categories found'
      })
    }

    // 3. Categories für den Tenant erstellen
    const categoriesToInsert = standardCategories.map(cat => ({
      name: cat.name,
      description: cat.description,
      code: cat.code,
      color: cat.color,
      is_active: cat.is_active,
      exam_duration_minutes: cat.exam_duration_minutes,
      lesson_duration_minutes: cat.lesson_duration_minutes,
      theory_durations: cat.theory_durations,
      tenant_id: tenant_id
    }))

    const { data: insertedCategories, error: insertError } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select()

    if (insertError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to copy categories: ${insertError.message}`
      })
    }

    return {
      success: true,
      tenant: tenant,
      categories_copied: insertedCategories?.length || 0,
      categories: insertedCategories
    }

  } catch (error: any) {
    console.error('Error copying default categories:', error)
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
