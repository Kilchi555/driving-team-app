export default defineEventHandler(async (event) => {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    const body = await readBody(event)
    const { pendencyId } = body
    
    if (!pendencyId) {
      throw new Error('pendencyId is required')
    }
    
    // Get the pendency
    const { data: pendency, error: fetchError } = await supabaseAdmin
      .from('pendencies')
      .select('*')
      .eq('id', pendencyId)
      .single()
    
    if (fetchError || !pendency) throw new Error('Pendency not found')
    
    if (pendency.recurrence_type === 'keine') {
      return { success: true, message: 'No recurrence' }
    }
    
    const dueDate = new Date(pendency.due_date)
    let newDueDate = new Date(dueDate)
    
    // Calculate next due date based on recurrence type
    switch (pendency.recurrence_type) {
      case 'täglich':
        newDueDate.setDate(newDueDate.getDate() + 1)
        break
      case 'wöchentlich':
        newDueDate.setDate(newDueDate.getDate() + 7)
        break
      case 'monatlich':
        newDueDate.setMonth(newDueDate.getMonth() + 1)
        break
      case 'jährlich':
        newDueDate.setFullYear(newDueDate.getFullYear() + 1)
        break
    }
    
    // Check if we're past recurrence end date
    if (pendency.recurrence_end_date && newDueDate > new Date(pendency.recurrence_end_date)) {
      return { success: true, message: 'Recurrence ended' }
    }
    
    // Create new recurring pendency
    const { error: insertError } = await supabaseAdmin
      .from('pendencies')
      .insert({
        tenant_id: pendency.tenant_id,
        title: pendency.title,
        description: pendency.description,
        status: 'pendent',
        priority: pendency.priority,
        category: pendency.category,
        due_date: newDueDate.toISOString(),
        assigned_to: pendency.assigned_to,
        recurrence_type: pendency.recurrence_type,
        recurrence_end_date: pendency.recurrence_end_date,
        tags: pendency.tags,
        attachments: pendency.attachments,
        notes: pendency.notes,
        created_by: pendency.created_by
      })
    
    if (insertError) throw insertError
    
    return {
      success: true,
      message: 'New recurring pendency created',
      nextDueDate: newDueDate.toISOString()
    }
  } catch (err: any) {
    console.error('❌ Error handling recurrence:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to handle recurrence',
      data: { error: err.message }
    })
  }
})

