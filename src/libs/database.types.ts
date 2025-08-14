// Database type definitions for Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
          last_sign_in_at: string | null
        }
        Insert: Omit<
          Database['public']['Tables']['users']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['users']['Insert']>
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
        Insert: Omit<
          Database['public']['Tables']['messages']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
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
