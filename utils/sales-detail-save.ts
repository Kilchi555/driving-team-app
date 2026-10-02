/**
 * Holds the detail-page save lock across the contact POST and the reload that follows.
 * The lock is released only after both have settled, including a failed reload.
 */
export async function runSalesContactSave(input: {
  onSaving: (saving: boolean) => void
  post: () => Promise<void>
  reload: () => Promise<void>
}): Promise<{ posted: boolean; postError: unknown; reloadError: unknown }> {
  input.onSaving(true)
  let posted = false
  let postError: unknown = null
  let reloadError: unknown = null
  try {
    try {
      await input.post()
      posted = true
    } catch (error) {
      postError = error
    }
    if (posted) {
      try {
        await input.reload()
      } catch (error) {
        reloadError = error
      }
    }
  } finally {
    input.onSaving(false)
  }
  return { posted, postError, reloadError }
}
