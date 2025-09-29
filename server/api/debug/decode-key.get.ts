export default defineEventHandler(async (event) => {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      return {
        success: false,
        error: 'No service role key in process.env'
      }
    }

    // Decode JWT to see what's inside
    const parts = serviceRoleKey.split('.')
    if (parts.length !== 3) {
      return {
        success: false,
        error: 'Invalid JWT format',
        parts: parts.length
      }
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    return {
      success: true,
      header,
      payload,
      keyLength: serviceRoleKey.length,
      keyStart: serviceRoleKey.substring(0, 50) + '...'
    }

  } catch (err: any) {
    return {
      success: false,
      error: 'Failed to decode key',
      details: err.message
    }
  }
})
