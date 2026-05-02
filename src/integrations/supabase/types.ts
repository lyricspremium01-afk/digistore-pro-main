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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
          related_order_id: string | null
          related_user_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          related_order_id?: string | null
          related_user_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          related_order_id?: string | null
          related_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          from_user_id: string
          id: string
          read_at: string | null
          to_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_user_id: string
          id?: string
          read_at?: string | null
          to_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_user_id?: string
          id?: string
          read_at?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          is_public: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          target_user_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          target_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          amount: number
          buyer_email: string
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          delivered_link: string | null
          id: string
          order_number: string
          payment_method: string
          product_id: string
          proof_url: string | null
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          buyer_email: string
          buyer_id?: string | null
          buyer_name: string
          buyer_phone: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          delivered_link?: string | null
          id?: string
          order_number?: string
          payment_method?: string
          product_id: string
          proof_url?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          delivered_link?: string | null
          id?: string
          order_number?: string
          payment_method?: string
          product_id?: string
          proof_url?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string
          details: string | null
          embed_html: string | null
          id: string
          instructions: string | null
          is_active: boolean
          kind: string
          link: string | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          details?: string | null
          embed_html?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          kind: string
          link?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          details?: string | null
          embed_html?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          kind?: string
          link?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_media: {
        Row: {
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          account_age: string | null
          category_id: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          currency: string
          delivery_link: string
          delivery_method: string | null
          description: string | null
          engagement_rate: number | null
          extra: Json | null
          followers_count: number | null
          id: string
          is_featured: boolean
          is_hot: boolean
          monetized: boolean | null
          niche: string | null
          platform: string | null
          price: number
          product_type: string
          rating_avg: number
          rating_count: number
          rejection_reason: string | null
          sales_count: number
          seller_id: string
          short_desc: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number | null
          title: string
          trending_score: number
          updated_at: string
          views: number
          what_youll_learn: string | null
          who_its_for: string | null
        }
        Insert: {
          account_age?: string | null
          category_id?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          delivery_link: string
          delivery_method?: string | null
          description?: string | null
          engagement_rate?: number | null
          extra?: Json | null
          followers_count?: number | null
          id?: string
          is_featured?: boolean
          is_hot?: boolean
          monetized?: boolean | null
          niche?: string | null
          platform?: string | null
          price: number
          product_type?: string
          rating_avg?: number
          rating_count?: number
          rejection_reason?: string | null
          sales_count?: number
          seller_id: string
          short_desc?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number | null
          title: string
          trending_score?: number
          updated_at?: string
          views?: number
          what_youll_learn?: string | null
          who_its_for?: string | null
        }
        Update: {
          account_age?: string | null
          category_id?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          delivery_link?: string
          delivery_method?: string | null
          description?: string | null
          engagement_rate?: number | null
          extra?: Json | null
          followers_count?: number | null
          id?: string
          is_featured?: boolean
          is_hot?: boolean
          monetized?: boolean | null
          niche?: string | null
          platform?: string | null
          price?: number
          product_type?: string
          rating_avg?: number
          rating_count?: number
          rejection_reason?: string | null
          sales_count?: number
          seller_id?: string
          short_desc?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number | null
          title?: string
          trending_score?: number
          updated_at?: string
          views?: number
          what_youll_learn?: string | null
          who_its_for?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          bio: string | null
          created_at: string
          currency: string
          email: string | null
          full_name: string | null
          id: string
          language: string
          level: number
          phone: string | null
          referral_code: string
          referred_by: string | null
          status: Database["public"]["Enums"]["account_status"]
          total_sales: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          bio?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          level?: number
          phone?: string | null
          referral_code: string
          referred_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          total_sales?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          bio?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          level?: number
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          is_first_sale: boolean
          order_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          is_first_sale?: boolean
          order_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          is_first_sale?: boolean
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          description: string | null
          id: string
          profile_image_url: string | null
          store_link: string
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          profile_image_url?: string | null
          store_link: string
          store_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          profile_image_url?: string | null
          store_link?: string
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_details: string | null
          account_name: string
          account_number: string
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_details?: string | null
          account_name: string
          account_number: string
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_details?: string | null
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _note: string; _user: string }
        Returns: Json
      }
      admin_confirm_order: { Args: { _order_id: string }; Returns: Json }
      admin_process_withdrawal: {
        Args: { _action: string; _note?: string; _withdrawal_id: string }
        Returns: undefined
      }
      admin_reject_order: {
        Args: { _order_id: string; _reason: string }
        Returns: Json
      }
      admin_set_product_status: {
        Args: {
          _product: string
          _reason?: string
          _status: Database["public"]["Enums"]["product_status"]
        }
        Returns: Json
      }
      admin_set_user: {
        Args: {
          _level?: number
          _status?: Database["public"]["Enums"]["account_status"]
          _user: string
        }
        Returns: Json
      }
      gen_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      recompute_seller_level: { Args: { _seller: string }; Returns: number }
      request_withdrawal: {
        Args: {
          _account_details: string
          _account_name: string
          _account_number: string
          _amount: number
          _method: string
        }
        Returns: string
      }
      wallet_checkout: { Args: { _product_id: string }; Returns: Json }
    }
    Enums: {
      account_status: "active" | "suspended" | "frozen"
      app_role: "user" | "seller" | "admin" | "super_admin"
      ledger_kind:
        | "sale_credit"
        | "referral_first"
        | "referral_recurring"
        | "admin_credit"
        | "admin_debit"
        | "withdrawal"
        | "debit"
      notification_kind: "promo" | "update" | "maintenance" | "system"
      order_status:
        | "awaiting_proof"
        | "pending_review"
        | "confirmed"
        | "rejected"
        | "refunded"
      product_status: "pending" | "approved" | "rejected" | "paused"
      withdrawal_status: "pending" | "approved" | "paid" | "rejected"
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
      account_status: ["active", "suspended", "frozen"],
      app_role: ["user", "seller", "admin", "super_admin"],
      ledger_kind: [
        "sale_credit",
        "referral_first",
        "referral_recurring",
        "admin_credit",
        "admin_debit",
        "withdrawal",
        "debit",
      ],
      notification_kind: ["promo", "update", "maintenance", "system"],
      order_status: [
        "awaiting_proof",
        "pending_review",
        "confirmed",
        "rejected",
        "refunded",
      ],
      product_status: ["pending", "approved", "rejected", "paused"],
      withdrawal_status: ["pending", "approved", "paid", "rejected"],
    },
  },
} as const
