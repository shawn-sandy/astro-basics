// Astro types are automatically included through astro/client
/// <reference types="astro/client" />
/// <reference types="@clerk/astro/client" />

declare namespace App {
  interface Locals {
    auth(): {
      userId: string | null
      user: any
      redirectToSignIn(): Response
    }
    currentUser(): Promise<any>
  }
}
