/**
 * Database Types for Supabase Integration
 * Generated: 2025-01-23
 * Description: TypeScript definitions for astro-basics Supabase database schema
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string
          commentable_id: string
          commentable_type: Database['public']['Enums']['commentable_type']
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          organization_id: string | null
          parent_comment_id: string | null
          status: Database['public']['Enums']['comment_status'] | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          commentable_id: string
          commentable_type: Database['public']['Enums']['commentable_type']
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          organization_id?: string | null
          parent_comment_id?: string | null
          status?: Database['public']['Enums']['comment_status'] | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          commentable_id?: string
          commentable_type?: Database['public']['Enums']['commentable_type']
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          organization_id?: string | null
          parent_comment_id?: string | null
          status?: Database['public']['Enums']['comment_status'] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'comments_with_authors'
            referencedColumns: ['author_user_id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_comment_id_fkey'
            columns: ['parent_comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_comment_id_fkey'
            columns: ['parent_comment_id']
            isOneToOne: false
            referencedRelation: 'comments_with_authors'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          clerk_id: string
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          role: Database['public']['Enums']['user_role'] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          clerk_id: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: Database['public']['Enums']['user_role'] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          clerk_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          role?: Database['public']['Enums']['user_role'] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      comments_with_authors: {
        Row: {
          author_avatar_url: string | null
          author_clerk_id: string | null
          author_full_name: string | null
          author_id: string | null
          author_role: Database['public']['Enums']['user_role'] | null
          author_user_id: string | null
          commentable_id: string | null
          commentable_type: Database['public']['Enums']['commentable_type'] | null
          content: string | null
          created_at: string | null
          id: string | null
          is_internal: boolean | null
          organization_id: string | null
          parent_comment_id: string | null
          status: Database['public']['Enums']['comment_status'] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'comments_with_authors'
            referencedColumns: ['author_user_id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_comment_id_fkey'
            columns: ['parent_comment_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_comment_id_fkey'
            columns: ['parent_comment_id']
            isOneToOne: false
            referencedRelation: 'comments_with_authors'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      create_comment: {
        Args: {
          p_author_clerk_id: string
          p_commentable_id: string
          p_commentable_type: Database['public']['Enums']['commentable_type']
          p_content: string
          p_is_internal?: boolean
          p_organization_id?: string
          p_parent_comment_id?: string
        }
        Returns: string
      }
      get_comment_stats: {
        Args: {
          p_commentable_id: string
          p_commentable_type: Database['public']['Enums']['commentable_type']
          p_organization_id?: string
        }
        Returns: {
          active_comments: number
          internal_comments: number
          latest_comment_at: string
          total_comments: number
        }[]
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      get_user_by_clerk_id: {
        Args: { p_clerk_id: string }
        Returns: {
          avatar_url: string
          clerk_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          organization_id: string
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }[]
      }
      upsert_user_from_clerk: {
        Args: {
          p_avatar_url?: string
          p_clerk_id: string
          p_email?: string
          p_full_name?: string
          p_organization_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      comment_status: 'active' | 'hidden' | 'archived' | 'flagged'
      commentable_type: 'post' | 'doc'
      user_role: 'volunteer' | 'coordinator' | 'super_admin'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      comment_status: ['active', 'hidden', 'archived', 'flagged'],
      commentable_type: ['post', 'doc'],
      user_role: ['volunteer', 'coordinator', 'super_admin'],
    },
  },
} as const

// Helper type aliases for common use cases
export type User = Tables<'users'>
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>

export type Comment = Tables<'comments'>
export type CommentInsert = TablesInsert<'comments'>
export type CommentUpdate = TablesUpdate<'comments'>

export type CommentWithAuthor = Tables<'comments_with_authors'>

export type UserRole = Enums<'user_role'>
export type CommentStatus = Enums<'comment_status'>
export type CommentableType = Enums<'commentable_type'>
