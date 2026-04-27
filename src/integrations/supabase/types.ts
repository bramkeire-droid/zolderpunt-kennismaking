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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      leads: {
        Row: {
          achternaam: string
          adres: string
          adres_lat: number | null
          adres_lng: number | null
          btw_percentage: number | null
          budget_excl: number | null
          budget_incl21: number | null
          budget_incl6: number | null
          budget_max: number | null
          budget_min: number | null
          calculator_state: Json | null
          created_at: string
          email: string
          fotos: Json
          gesprek_datum: string | null
          gesprek_notities: string
          gespreksvragen: Json
          gevonden_via: string
          gezocht_naar: string
          id: string
          inbegrepen_posten: Json
          notities_vooraf: string
          oppervlakte_m2: number | null
          portal_activated_at: string | null
          portal_sent_via: string | null
          portal_status: string | null
          portal_token: string | null
          prijs_max_incl_btw: number | null
          prijs_min_incl_btw: number | null
          prijs_mw_max_incl_btw: number | null
          prijs_mw_min_incl_btw: number | null
          project_feiten: Json | null
          project_timing: string
          project_type: string
          rapport_aandachtspunten_ai: string
          rapport_besproken_ai: string
          rapport_gegenereerd_op: string | null
          rapport_situatie_ai: string
          rapport_tekst: string
          rapport_versies: Json
          rapport_verwachtingen_ai: string
          status: string
          technisch: Json
          telefoon: string
          updated_at: string
          volgende_stap: string
          voornaam: string
          waarde_tekst_ai: string
        }
        Insert: {
          achternaam?: string
          adres?: string
          adres_lat?: number | null
          adres_lng?: number | null
          btw_percentage?: number | null
          budget_excl?: number | null
          budget_incl21?: number | null
          budget_incl6?: number | null
          budget_max?: number | null
          budget_min?: number | null
          calculator_state?: Json | null
          created_at?: string
          email?: string
          fotos?: Json
          gesprek_datum?: string | null
          gesprek_notities?: string
          gespreksvragen?: Json
          gevonden_via?: string
          gezocht_naar?: string
          id?: string
          inbegrepen_posten?: Json
          notities_vooraf?: string
          oppervlakte_m2?: number | null
          portal_activated_at?: string | null
          portal_sent_via?: string | null
          portal_status?: string | null
          portal_token?: string | null
          prijs_max_incl_btw?: number | null
          prijs_min_incl_btw?: number | null
          prijs_mw_max_incl_btw?: number | null
          prijs_mw_min_incl_btw?: number | null
          project_feiten?: Json | null
          project_timing?: string
          project_type?: string
          rapport_aandachtspunten_ai?: string
          rapport_besproken_ai?: string
          rapport_gegenereerd_op?: string | null
          rapport_situatie_ai?: string
          rapport_tekst?: string
          rapport_versies?: Json
          rapport_verwachtingen_ai?: string
          status?: string
          technisch?: Json
          telefoon?: string
          updated_at?: string
          volgende_stap?: string
          voornaam?: string
          waarde_tekst_ai?: string
        }
        Update: {
          achternaam?: string
          adres?: string
          adres_lat?: number | null
          adres_lng?: number | null
          btw_percentage?: number | null
          budget_excl?: number | null
          budget_incl21?: number | null
          budget_incl6?: number | null
          budget_max?: number | null
          budget_min?: number | null
          calculator_state?: Json | null
          created_at?: string
          email?: string
          fotos?: Json
          gesprek_datum?: string | null
          gesprek_notities?: string
          gespreksvragen?: Json
          gevonden_via?: string
          gezocht_naar?: string
          id?: string
          inbegrepen_posten?: Json
          notities_vooraf?: string
          oppervlakte_m2?: number | null
          portal_activated_at?: string | null
          portal_sent_via?: string | null
          portal_status?: string | null
          portal_token?: string | null
          prijs_max_incl_btw?: number | null
          prijs_min_incl_btw?: number | null
          prijs_mw_max_incl_btw?: number | null
          prijs_mw_min_incl_btw?: number | null
          project_feiten?: Json | null
          project_timing?: string
          project_type?: string
          rapport_aandachtspunten_ai?: string
          rapport_besproken_ai?: string
          rapport_gegenereerd_op?: string | null
          rapport_situatie_ai?: string
          rapport_tekst?: string
          rapport_versies?: Json
          rapport_verwachtingen_ai?: string
          status?: string
          technisch?: Json
          telefoon?: string
          updated_at?: string
          volgende_stap?: string
          voornaam?: string
          waarde_tekst_ai?: string
        }
        Relationships: []
      }
      portal_email_attempts: {
        Row: {
          attempted_at: string | null
          id: string
          ip_address: string | null
          portal_token: string
        }
        Insert: {
          attempted_at?: string | null
          id?: string
          ip_address?: string | null
          portal_token: string
        }
        Update: {
          attempted_at?: string | null
          id?: string
          ip_address?: string | null
          portal_token?: string
        }
        Relationships: []
      }
      portal_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          lead_id: string
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          lead_id: string
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          lead_id?: string
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sessions: {
        Row: {
          created_at: string | null
          email_verified: string
          expires_at: string
          id: string
          lead_id: string
          session_token: string | null
        }
        Insert: {
          created_at?: string | null
          email_verified: string
          expires_at?: string
          id?: string
          lead_id: string
          session_token?: string | null
        }
        Update: {
          created_at?: string | null
          email_verified?: string
          expires_at?: string
          id?: string
          lead_id?: string
          session_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
