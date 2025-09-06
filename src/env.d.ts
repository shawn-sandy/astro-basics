// Astro types are automatically included through astro/client
/// <reference types="astro/client" />
/// <reference types="@clerk/astro/client" />

declare namespace App {
  interface Locals {
    // Custom properties added to the Clerk Locals interface
    csrfToken?: string
    userId?: string | null
    userRole?: string
    clerkToken?: string | null
  }
}

interface ImportMetaEnv {
  readonly PWA_ENABLED: string
  readonly ORGANIZATION_ID: string
}
