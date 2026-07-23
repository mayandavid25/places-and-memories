export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      couple_invites: {
        Row: {
          code: string
          couple_id: string
          created_by: string
          expires_at: string
          used_at: string | null
        }
        Insert: {
          code: string
          couple_id: string
          created_by: string
          expires_at?: string
          used_at?: string | null
        }
        Update: {
          code?: string
          couple_id?: string
          created_by?: string
          expires_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couple_invites_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_members: {
        Row: {
          couple_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          couple_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      entertainment_items: {
        Row: {
          couple_id: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          planned_date: string | null
          planned_formatted_address: string | null
          planned_lat: number | null
          planned_lng: number | null
          planned_location: string | null
          planned_time: string | null
          progress_current: number | null
          progress_note: string | null
          progress_total: number | null
          progress_unit: string | null
          status: Database["public"]["Enums"]["entertainment_status"]
          title: string
          type: Database["public"]["Enums"]["entertainment_type"]
          updated_at: string
        }
        Insert: {
          couple_id: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          planned_date?: string | null
          planned_formatted_address?: string | null
          planned_lat?: number | null
          planned_lng?: number | null
          planned_location?: string | null
          planned_time?: string | null
          progress_current?: number | null
          progress_note?: string | null
          progress_total?: number | null
          progress_unit?: string | null
          status?: Database["public"]["Enums"]["entertainment_status"]
          title: string
          type: Database["public"]["Enums"]["entertainment_type"]
          updated_at?: string
        }
        Update: {
          couple_id?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          planned_date?: string | null
          planned_formatted_address?: string | null
          planned_lat?: number | null
          planned_lng?: number | null
          planned_location?: string | null
          planned_time?: string | null
          progress_current?: number | null
          progress_note?: string | null
          progress_total?: number | null
          progress_unit?: string | null
          status?: Database["public"]["Enums"]["entertainment_status"]
          title?: string
          type?: Database["public"]["Enums"]["entertainment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entertainment_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      entertainment_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          item_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          item_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entertainment_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "entertainment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entertainment_reviews_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          couple_id: string
          created_at: string
          created_by: string
          date: string
          description: string | null
          formatted_address: string | null
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          notes: string | null
          participants: string[]
          photos: string[]
          place_id: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["event_status"]
          tags: string[]
          time: string | null
          title: string
        }
        Insert: {
          category?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          formatted_address?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          notes?: string | null
          participants?: string[]
          photos?: string[]
          place_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          time?: string | null
          title: string
        }
        Update: {
          category?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          formatted_address?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          notes?: string | null
          participants?: string[]
          photos?: string[]
          place_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[]
          time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          desired_date: string | null
          estimated_value: number | null
          id: string
          link: string | null
          name: string
          notes: string | null
          photo: string | null
          privacy: string
          recipient_id: string
          status: string
          store: string | null
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          desired_date?: string | null
          estimated_value?: number | null
          id?: string
          link?: string | null
          name: string
          notes?: string | null
          photo?: string | null
          privacy?: string
          recipient_id: string
          status?: string
          store?: string | null
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          desired_date?: string | null
          estimated_value?: number | null
          id?: string
          link?: string | null
          name?: string
          notes?: string | null
          photo?: string | null
          privacy?: string
          recipient_id?: string
          status?: string
          store?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      place_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          place_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          place_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          place_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "place_reviews_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          category: Database["public"]["Enums"]["place_category"]
          couple_id: string
          created_at: string
          created_by: string
          favorited: boolean
          formatted_address: string | null
          id: string
          lat: number | null
          lng: number | null
          location: string | null
          name: string
          photos: string[]
          visited_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["place_category"]
          couple_id: string
          created_at?: string
          created_by: string
          favorited?: boolean
          formatted_address?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          name: string
          photos?: string[]
          visited_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["place_category"]
          couple_id?: string
          created_at?: string
          created_by?: string
          favorited?: boolean
          formatted_address?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location?: string | null
          name?: string
          photos?: string[]
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color: string
          couple_id: string | null
          created_at: string
          display_name: string
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          color?: string
          couple_id?: string | null
          created_at?: string
          display_name: string
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          color?: string
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_comments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          checked: boolean
          created_at: string
          id: string
          position: number
          recipe_id: string
          text: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          id?: string
          position?: number
          recipe_id: string
          text: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          id?: string
          position?: number
          recipe_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: Database["public"]["Enums"]["recipe_category"] | null
          couple_id: string
          cover_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          photos: string[]
          planned_date: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          couple_id: string
          cover_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          photos?: string[]
          planned_date?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["recipe_category"] | null
          couple_id?: string
          cover_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          photos?: string[]
          planned_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          category: Database["public"]["Enums"]["place_category"] | null
          couple_id: string
          created_at: string
          created_by: string
          formatted_address: string | null
          id: string
          is_private: boolean
          lat: number | null
          linked_place_id: string | null
          lng: number | null
          location: string | null
          name: string
          note: string | null
          photos: string[]
          planned_date: string | null
          priority: number
          status: Database["public"]["Enums"]["wishlist_status"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["place_category"] | null
          couple_id: string
          created_at?: string
          created_by: string
          formatted_address?: string | null
          id?: string
          is_private?: boolean
          lat?: number | null
          linked_place_id?: string | null
          lng?: number | null
          location?: string | null
          name: string
          note?: string | null
          photos?: string[]
          planned_date?: string | null
          priority?: number
          status?: Database["public"]["Enums"]["wishlist_status"]
        }
        Update: {
          category?: Database["public"]["Enums"]["place_category"] | null
          couple_id?: string
          created_at?: string
          created_by?: string
          formatted_address?: string | null
          id?: string
          is_private?: boolean
          lat?: number | null
          linked_place_id?: string | null
          lng?: number | null
          location?: string | null
          name?: string
          note?: string | null
          photos?: string[]
          planned_date?: string | null
          priority?: number
          status?: Database["public"]["Enums"]["wishlist_status"]
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_couple_with_invite: {
        Args: { _name?: string }
        Returns: {
          couple_id: string
          invite_code: string
        }[]
      }
      create_new_couple: {
        Args: { _name?: string; _set_active?: boolean }
        Returns: {
          couple_id: string
          invite_code: string
        }[]
      }
      current_couple_id: { Args: never; Returns: string }
      is_in_couple: { Args: { _couple_id: string }; Returns: boolean }
      is_member_of: { Args: { _couple_id: string }; Returns: boolean }
      join_couple_with_code: { Args: { _code: string }; Returns: string }
      leave_couple: { Args: { _couple_id: string }; Returns: string }
      regenerate_invite_code: { Args: { _couple_id: string }; Returns: string }
      reset_couple_data: { Args: { _couple_id: string }; Returns: undefined }
      set_active_couple: { Args: { _couple_id: string }; Returns: undefined }
    }
    Enums: {
      entertainment_status: "quero_consumir" | "consumindo" | "concluido"
      entertainment_type: "filme" | "serie" | "jogo" | "livro"
      event_status: "futuro" | "aconteceu" | "cancelado"
      place_category: "restaurante" | "cafe" | "bar" | "viagem" | "diversao"
      recipe_category:
        | "cafe_da_manha"
        | "almoco"
        | "jantar"
        | "sobremesa"
        | "lanche"
        | "drinks"
        | "outros"
      wishlist_status: "queremos_visitar" | "planejado" | "visitado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      entertainment_status: ["quero_consumir", "consumindo", "concluido"],
      entertainment_type: ["filme", "serie", "jogo", "livro"],
      event_status: ["futuro", "aconteceu", "cancelado"],
      place_category: ["restaurante", "cafe", "bar", "viagem", "diversao"],
      recipe_category: [
        "cafe_da_manha",
        "almoco",
        "jantar",
        "sobremesa",
        "lanche",
        "drinks",
        "outros",
      ],
      wishlist_status: ["queremos_visitar", "planejado", "visitado"],
    },
  },
} as const
