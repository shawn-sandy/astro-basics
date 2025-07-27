// Astro types are automatically included through astro/client
/// <reference types="astro/client" />
/// <reference types="@clerk/astro/client" />

import type { UserResource } from '@clerk/types'

declare namespace App {
  interface Locals {
    auth(): {
      userId: string | null
      user: UserResource | null
      redirectToSignIn(): Response
    }
    currentUser(): Promise<UserResource | null>
  }
}
