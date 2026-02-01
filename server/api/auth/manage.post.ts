// api/auth/manage.post.ts
import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '#auth'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AuthRequest {
  action: string
  [key: string]: any
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<AuthRequest>(event)
    const { action } = body

    // Public actions (no auth required)
    if (action === 'signin-password') {
      return await signInWithPassword(body)
    }
    if (action === 'signup') {
      return await signUp(body)
    }
    if (action === 'reset-password-email') {
      return await resetPasswordForEmail(body)
    }
    if (action === 'get-session') {
      return await getSession(body)
    }
    if (action === 'set-session') {
      return await setSession(body)
    }

    // Protected actions (auth required)
    const session = await getServerSession(event)
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    if (action === 'update-user') {
      return await updateUser(body, session.user.id)
    }

    throw new Error('Invalid action')
  } catch (err: any) {
    console.error('Auth manage error:', err)
    return {
      success: false,
      error: err.message || 'Operation failed'
    }
  }
})

async function signInWithPassword(body: AuthRequest) {
  const { email, password } = body

  if (!email || !password) {
    throw new Error('Email and password required')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  return {
    success: true,
    data: {
      user: data.user,
      session: data.session
    }
  }
}

async function signUp(body: AuthRequest) {
  const { email, password, options } = body

  if (!email || !password) {
    throw new Error('Email and password required')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options
  })

  if (error) throw error

  return {
    success: true,
    data: {
      user: data.user,
      session: data.session
    }
  }
}

async function resetPasswordForEmail(body: AuthRequest) {
  const { email, redirectTo } = body

  if (!email) {
    throw new Error('Email required')
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password`
  })

  if (error) throw error

  return {
    success: true,
    data
  }
}

async function getSession(body: AuthRequest) {
  // This requires access token from client
  const { access_token } = body

  if (!access_token) {
    throw new Error('Access token required')
  }

  const { data, error } = await supabase.auth.getUser(access_token)

  if (error) throw error

  return {
    success: true,
    data: {
      user: data.user
    }
  }
}

async function setSession(body: AuthRequest) {
  const { access_token, refresh_token } = body

  if (!access_token || !refresh_token) {
    throw new Error('Access token and refresh token required')
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token
  })

  if (error) throw error

  return {
    success: true,
    data: {
      session: data.session,
      user: data.user
    }
  }
}

async function updateUser(body: AuthRequest, userId: string) {
  const { attributes } = body

  if (!attributes) {
    throw new Error('Attributes required')
  }

  const { data, error } = await supabase.auth.updateUser(attributes)

  if (error) throw error

  return {
    success: true,
    data: {
      user: data.user
    }
  }
}
