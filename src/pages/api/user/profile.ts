import type { APIRoute } from 'astro'
import { getUserProfile, handleAuthError } from '#utils/serverAuth'

/**
 * API route that returns the current user's profile with proper TypeScript types
 */
export const GET: APIRoute = async (context) => {
  const userResult = await getUserProfile(context)
  
  if (!userResult.ok) {
    return handleAuthError(userResult.error)
  }

  const user = userResult.value

  // Return user profile data as JSON
  return new Response(JSON.stringify({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      hasImage: user.hasImage,
      primaryEmail: user.primaryEmailAddress?.emailAddress,
      emailVerified: user.emailAddresses.some(email => 
        email.verification.status === 'verified'
      ),
      emailCount: user.emailAddresses.length,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}