// Clerk user types based on actual API responses
export interface ClerkEmailAddress {
  id: string
  emailAddress: string
  verification: {
    status: 'verified' | 'unverified' | 'pending'
    strategy: string
  }
}

export interface ClerkPhoneNumber {
  id: string
  phoneNumber: string
  verification: {
    status: 'verified' | 'unverified' | 'pending'
    strategy: string
  }
}

export interface ClerkUser {
  id: string
  emailAddresses: ClerkEmailAddress[]
  phoneNumbers?: ClerkPhoneNumber[]
  primaryEmailAddressId?: string
  primaryPhoneNumberId?: string
  username?: string
  firstName?: string
  lastName?: string
  fullName?: string
  imageUrl?: string
  createdAt: number
  updatedAt: number
  lastSignInAt?: number
  twoFactorEnabled?: boolean
  publicMetadata: Record<string, unknown>
  privateMetadata: Record<string, unknown>
  unsafeMetadata: Record<string, unknown>
}

// Database user types
export interface DatabaseUser {
  id?: number
  clerk_id: string
  email?: string
  username?: string
  full_name?: string
  avatar_url?: string
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface UserPreferences {
  id?: number
  user_id: number
  theme?: 'light' | 'dark' | 'system'
  notifications?: boolean
  language?: string
  timezone?: string
  [key: string]: unknown
}

// API response types
export interface UserProfileApiResponse {
  user?: DatabaseUser & {
    user_preferences?: UserPreferences[]
  }
  success?: boolean
  message?: string
  error?: string
  details?: string
}

// Component prop types
export interface UserInfoProps {
  user?: ClerkUser | null
  error?: string | null
}

export interface UserProfileProps {
  className?: string
  showPreferences?: boolean
}

// Error types
export interface ApiError {
  type: 'network' | 'auth' | 'server' | 'validation' | 'unknown'
  message: string
  code?: string | number
  retryable: boolean
  timestamp: number
}
