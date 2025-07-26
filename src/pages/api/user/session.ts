import type { APIRoute } from 'astro'
import { getSessionData, handleAuthError } from '#utils/serverAuth'

/**
 * API route that returns the current session information with proper TypeScript types
 */
export const GET: APIRoute = async (context) => {
  const sessionResult = await getSessionData(context)
  
  if (!sessionResult.ok) {
    return handleAuthError(sessionResult.error)
  }

  const session = sessionResult.value

  return new Response(JSON.stringify({
    success: true,
    data: {
      sessionId: session.id,
      status: session.status,
      userId: session.user.id,
      userName: session.user.fullName || session.user.username,
      lastActiveAt: session.lastActiveAt.toISOString(),
      expireAt: session.expireAt.toISOString(),
      abandonAt: session.abandonAt.toISOString(),
      lastActiveOrganizationId: session.lastActiveOrganizationId,
      factorVerificationAge: session.factorVerificationAge,
      isActive: session.status === 'active',
      timeUntilExpiry: Math.max(0, session.expireAt.getTime() - Date.now()),
    },
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}