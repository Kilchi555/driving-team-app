import jwt from 'jsonwebtoken'
import { logger } from '~/utils/logger'

export function createSignedSessionJwt(sessionId: string): string {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET
  if (!jwtSecret) {
    logger.error('❌ SUPABASE_JWT_SECRET is not set in environment variables.')
    throw new Error('Supabase JWT secret is not configured.')
  }

  // Create a JWT with the session_id as a custom claim
  const token = jwt.sign(
    {
      session_id: sessionId,
      // You can add other claims here if needed for RLS
      // exp: Math.floor(Date.now() / 1000) + (60 * 60) // Token expires in 1 hour
    },
    jwtSecret,
    {
      // Algorithm must match what Supabase expects (usually HS256)
      algorithm: 'HS256',
      // We don't set a hard expiration here as the session itself has a timeout.
      // Supabase will validate the JWT's signature and the custom claim.
    }
  )

  logger.debug('✅ Successfully created JWT for session:', { sessionId })
  return token
}
