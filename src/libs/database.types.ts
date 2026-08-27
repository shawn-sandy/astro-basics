// Database type definitions for Supabase
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
          role: string
          app_metadata: Record<string, unknown>
          created_at: string
          updated_at: string
          last_sign_in_at: string | null
        }
        Insert: { clerk_id: string } & Partial<
          Omit<
            Database['public']['Tables']['users']['Row'],
            'id' | 'clerk_id' | 'created_at' | 'updated_at'
          >
        >
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
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
        Insert: Pick<
          Database['public']['Tables']['messages']['Row'],
          'name' | 'email' | 'message'
        > &
          Partial<
            Omit<
              Database['public']['Tables']['messages']['Row'],
              'id' | 'created_at' | 'updated_at'
            >
          >
        Update: Partial<
          Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'updated_at'>
        >
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
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['organization_memberships']['Row'],
          'id' | 'joined_at' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['organization_memberships']['Insert']>
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string | null
          theme: string
          notifications_email: boolean
          notifications_push: boolean
          language: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: { user_id: string } & Partial<
          Omit<
            Database['public']['Tables']['user_preferences']['Row'],
            'id' | 'user_id' | 'created_at' | 'updated_at'
          >
        >
        Update: Partial<
          Omit<
            Database['public']['Tables']['user_preferences']['Row'],
            'id' | 'created_at' | 'updated_at'
          >
        >
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
