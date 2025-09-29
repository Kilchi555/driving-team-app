export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          end_time: string
          id: string
          is_paid: boolean
          location_id: string
          custom_location_address: any | null
          price_per_minute: number
          staff_id: string
          start_time: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes: number
          end_time: string
          id?: string
          is_paid: boolean
          location_id: string
          custom_location_address?: any | null
          price_per_minute: number
          staff_id: string
          start_time: string
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_paid?: boolean
          location_id?: string
          custom_location_address?: any | null
          price_per_minute?: number
          staff_id?: string
          start_time?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          staff_id: string
          latitude: number | null
          longitude: number | null
          location_type: string | null
          is_active: boolean | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          staff_id: string
          latitude?: number | null
          longitude?: number | null
          location_type?: string | null
          is_active?: boolean | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          staff_id?: string
          latitude?: number | null
          longitude?: number | null
          location_type?: string | null
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          last_updated_at: string
          last_updated_by_user_id: string
          staff_note: string
          staff_rating: number
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          last_updated_at?: string
          last_updated_by_user_id: string
          staff_note?: string
          staff_rating: number
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          last_updated_at?: string
          last_updated_by_user_id?: string
          staff_note?: string
          staff_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_categories: {
        Row: {
          category_id: number | null
          created_at: string
          id: number
          teacher_id: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          id?: number
          teacher_id: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          id?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_categories_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          assigned_staff_id: string | null
          birthdate: string | null
          category: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          payment_provider_customer_id: string | null
          phone: string
          role: string
          street: string | null
          street_nr: string | null
          zip: string | null
        }
        Insert: {
          assigned_staff_id?: string | null
          birthdate?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          payment_provider_customer_id?: string | null
          phone: string
          role?: string
          street?: string | null
          street_nr?: string | null
          zip?: string | null
        }
        Update: {
          assigned_staff_id?: string | null
          birthdate?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          payment_provider_customer_id?: string | null
          phone?: string
          role?: string
          street?: string | null
          street_nr?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          document_type: string
          category_code: string | null
          side: string
          file_name: string
          file_size: number | null
          file_type: string
          storage_path: string
          title: string | null
          description: string | null
          is_verified: boolean | null
          verification_date: string | null
          verified_by: string | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          document_type: string
          category_code?: string | null
          side?: string
          file_name: string
          file_size?: number | null
          file_type: string
          storage_path: string
          title?: string | null
          description?: string | null
          is_verified?: boolean | null
          verification_date?: string | null
          verified_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          document_type?: string
          category_code?: string | null
          side?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          storage_path?: string
          title?: string | null
          description?: string | null
          is_verified?: boolean | null
          verification_date?: string | null
          verified_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
