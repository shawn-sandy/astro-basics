/**
 * Supabase schema types, mirroring `scripts/migrations/001_core_schema.sql` (users,
 * organization_memberships, user_preferences) and `006_messages.sql` (messages).
 *
 * `createClient<Database>()` checks every `from(...)` call against these, so they have to
 * match the migrations. Two rules keep that checking switched on:
 *
 * 1. **Every table needs a `Relationships` key**, even an empty array. Without it the table
 *    does not satisfy supabase-js's `GenericTable`, the whole schema fails `GenericSchema`,
 *    and every `from()` call resolves to `never` - which silently accepts any column name,
 *    any payload and any result shape instead of reporting a mismatch. It is all or
 *    nothing: one table missing the key disables checking for the rest too.
 * 2. **`Relationships` drives embedded selects.** `select('*, user_preferences(*)')` on
 *    `users` resolves through the entry on the child table that points back at `users`.
 *
 * Nullability follows the migrations: a column without NOT NULL is `| null` here, and a
 * column with a DEFAULT is optional in `Insert`.
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          // DB type is the `user_role` enum below. Kept as `string` because the Clerk
          // webhook writes whatever `public_metadata.role` holds; callers narrow it to
          // `UserRole` from `#utils/role-guard`, which validates the value.
          role: string
          app_metadata: Record<string, unknown> | null
          last_sign_in_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        // Only clerk_id is required: every other column is nullable or has a default.
        Insert: {
          clerk_id: string
          id?: string
          email?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          app_metadata?: Record<string, unknown> | null
          last_sign_in_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      organization_memberships: {
        Row: {
          id: string
          user_id: string | null
          clerk_org_id: string
          clerk_org_role: string
          org_name: string | null
          org_slug: string | null
          joined_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          clerk_org_id: string
          clerk_org_role: string
          id?: string
          user_id?: string | null
          org_name?: string | null
          org_slug?: string | null
          joined_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['organization_memberships']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'organization_memberships_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string | null
          // CHECK (theme IN ('light', 'dark', 'system'))
          theme: string | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          language: string | null
          timezone: string | null
          created_at: string | null
          updated_at: string | null
        }
        // Every column has a default, so a row can be created from user_id alone.
        Insert: {
          id?: string
          user_id?: string | null
          theme?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          language?: string | null
          timezone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
        // user_id is UNIQUE, so a user has at most one preferences row.
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: number
          user_id: string | null
          clerk_user_id: string | null
          name: string
          email: string
          subject: string | null
          message: string
          is_read: boolean
          is_archived: boolean
          ip_address: string | null
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        // Only the contact form's own fields are required: every other column has a
        // default in scripts/migrations/006_messages.sql, and a seed may set the
        // timestamps explicitly.
        Insert: {
          name: string
          email: string
          message: string
          user_id?: string | null
          clerk_user_id?: string | null
          subject?: string | null
          is_read?: boolean
          is_archived?: boolean
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      // 001_core_schema.sql: member (default) -> admin -> super_admin
      user_role: 'member' | 'admin' | 'super_admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
