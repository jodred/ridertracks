export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      fleet_adjustment_types: {
        Row: {
          created_at: string;
          default_amount: number;
          direction: string;
          fleet_user_id: string;
          frequency: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_amount?: number;
          direction: string;
          fleet_user_id: string;
          frequency?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_amount?: number;
          direction?: string;
          fleet_user_id?: string;
          frequency?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fleet_driver_entries: {
        Row: {
          cash: number;
          created_at: string;
          date: string;
          driver_id: string;
          fleet_user_id: string;
          gas_card: number;
          gross: number;
          id: string;
          updated_at: string;
        };
        Insert: {
          cash?: number;
          created_at?: string;
          date: string;
          driver_id: string;
          fleet_user_id: string;
          gas_card?: number;
          gross?: number;
          id?: string;
          updated_at?: string;
        };
        Update: {
          cash?: number;
          created_at?: string;
          date?: string;
          driver_id?: string;
          fleet_user_id?: string;
          gas_card?: number;
          gross?: number;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_driver_entries_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "fleet_drivers";
            referencedColumns: ["id"];
          },
        ];
      };
      fleet_driver_sources: {
        Row: {
          created_at: string;
          driver_id: string;
          fleet_user_id: string;
          source_id: string;
        };
        Insert: {
          created_at?: string;
          driver_id: string;
          fleet_user_id: string;
          source_id: string;
        };
        Update: {
          created_at?: string;
          driver_id?: string;
          fleet_user_id?: string;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_driver_sources_driver_id_fleet_user_id_fkey";
            columns: ["driver_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_drivers";
            referencedColumns: ["id", "fleet_user_id"];
          },
          {
            foreignKeyName: "fleet_driver_sources_source_id_fleet_user_id_fkey";
            columns: ["source_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_earning_sources";
            referencedColumns: ["id", "fleet_user_id"];
          },
        ];
      };
      fleet_driver_tax_profiles: {
        Row: {
          address_line: string;
          apply_sickness_insurance: boolean;
          apply_social_insurance: boolean;
          arrangement: string;
          city: string;
          created_at: string;
          custom_income_cost: number;
          disability_rate: number;
          driver_id: string;
          fleet_user_id: string;
          health_rate: number;
          income_cost_type: string;
          nip: string;
          pension_rate: number;
          pesel: string;
          pit_rate: number;
          pit2_reduction: number;
          postal_code: string;
          ppk_rate: number;
          self_billing: boolean;
          sickness_rate: number;
          tax_resident: boolean;
          under_26: boolean;
          updated_at: string;
          vat_exempt: boolean;
          vat_rate: number;
        };
        Insert: {
          address_line?: string;
          apply_sickness_insurance?: boolean;
          apply_social_insurance?: boolean;
          arrangement?: string;
          city?: string;
          created_at?: string;
          custom_income_cost?: number;
          disability_rate?: number;
          driver_id: string;
          fleet_user_id: string;
          health_rate?: number;
          income_cost_type?: string;
          nip?: string;
          pension_rate?: number;
          pesel?: string;
          pit_rate?: number;
          pit2_reduction?: number;
          postal_code?: string;
          ppk_rate?: number;
          self_billing?: boolean;
          sickness_rate?: number;
          tax_resident?: boolean;
          under_26?: boolean;
          updated_at?: string;
          vat_exempt?: boolean;
          vat_rate?: number;
        };
        Update: {
          address_line?: string;
          apply_sickness_insurance?: boolean;
          apply_social_insurance?: boolean;
          arrangement?: string;
          city?: string;
          created_at?: string;
          custom_income_cost?: number;
          disability_rate?: number;
          driver_id?: string;
          fleet_user_id?: string;
          health_rate?: number;
          income_cost_type?: string;
          nip?: string;
          pension_rate?: number;
          pesel?: string;
          pit_rate?: number;
          pit2_reduction?: number;
          postal_code?: string;
          ppk_rate?: number;
          self_billing?: boolean;
          sickness_rate?: number;
          tax_resident?: boolean;
          under_26?: boolean;
          updated_at?: string;
          vat_exempt?: boolean;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_driver_tax_profiles_driver_id_fleet_user_id_fkey";
            columns: ["driver_id", "fleet_user_id"];
            isOneToOne: true;
            referencedRelation: "fleet_drivers";
            referencedColumns: ["id", "fleet_user_id"];
          },
        ];
      };
      fleet_drivers: {
        Row: {
          app_fee_override: number | null;
          code: string;
          created_at: string;
          email: string;
          fleet_user_id: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          app_fee_override?: number | null;
          code: string;
          created_at?: string;
          email: string;
          fleet_user_id: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          app_fee_override?: number | null;
          code?: string;
          created_at?: string;
          email?: string;
          fleet_user_id?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fleet_earning_sources: {
        Row: {
          created_at: string;
          fleet_user_id: string;
          id: string;
          is_active: boolean;
          is_default: boolean;
          logo_key: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          fleet_user_id: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          logo_key?: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          fleet_user_id?: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          logo_key?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fleet_entry_adjustments: {
        Row: {
          adjustment_type_id: string;
          created_at: string;
          direction: string;
          entry_id: string;
          fleet_user_id: string;
          frequency: string;
          id: string;
          label: string;
          note: string | null;
          quantity: number;
          unit_amount: number;
          updated_at: string;
        };
        Insert: {
          adjustment_type_id: string;
          created_at?: string;
          direction: string;
          entry_id: string;
          fleet_user_id: string;
          frequency?: string;
          id?: string;
          label: string;
          note?: string | null;
          quantity?: number;
          unit_amount?: number;
          updated_at?: string;
        };
        Update: {
          adjustment_type_id?: string;
          created_at?: string;
          direction?: string;
          entry_id?: string;
          fleet_user_id?: string;
          frequency?: string;
          id?: string;
          label?: string;
          note?: string | null;
          quantity?: number;
          unit_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_entry_adjustments_adjustment_type_id_fleet_user_id_fkey";
            columns: ["adjustment_type_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_adjustment_types";
            referencedColumns: ["id", "fleet_user_id"];
          },
          {
            foreignKeyName: "fleet_entry_adjustments_entry_id_fleet_user_id_fkey";
            columns: ["entry_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_driver_entries";
            referencedColumns: ["id", "fleet_user_id"];
          },
        ];
      };
      fleet_entry_earnings: {
        Row: {
          amount: number;
          created_at: string;
          entry_id: string;
          fleet_user_id: string;
          id: string;
          source_id: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          entry_id: string;
          fleet_user_id: string;
          id?: string;
          source_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          entry_id?: string;
          fleet_user_id?: string;
          id?: string;
          source_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_entry_earnings_entry_id_fleet_user_id_fkey";
            columns: ["entry_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_driver_entries";
            referencedColumns: ["id", "fleet_user_id"];
          },
          {
            foreignKeyName: "fleet_entry_earnings_source_id_fleet_user_id_fkey";
            columns: ["source_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_earning_sources";
            referencedColumns: ["id", "fleet_user_id"];
          },
        ];
      };
      fleet_generated_documents: {
        Row: {
          document_number: string;
          document_type: string;
          driver_id: string;
          fleet_user_id: string;
          generated_at: string;
          id: string;
          period_from: string;
          period_to: string;
          snapshot: Json;
        };
        Insert: {
          document_number: string;
          document_type: string;
          driver_id: string;
          fleet_user_id: string;
          generated_at?: string;
          id?: string;
          period_from: string;
          period_to: string;
          snapshot: Json;
        };
        Update: {
          document_number?: string;
          document_type?: string;
          driver_id?: string;
          fleet_user_id?: string;
          generated_at?: string;
          id?: string;
          period_from?: string;
          period_to?: string;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_generated_documents_driver_id_fleet_user_id_fkey";
            columns: ["driver_id", "fleet_user_id"];
            isOneToOne: false;
            referencedRelation: "fleet_drivers";
            referencedColumns: ["id", "fleet_user_id"];
          },
        ];
      };
      fleet_tax_profiles: {
        Row: {
          address_line: string;
          bank_account: string;
          city: string;
          created_at: string;
          document_prefix: string;
          fleet_user_id: string;
          legal_name: string;
          nip: string;
          postal_code: string;
          regon: string;
          tax_office: string;
          updated_at: string;
        };
        Insert: {
          address_line?: string;
          bank_account?: string;
          city?: string;
          created_at?: string;
          document_prefix?: string;
          fleet_user_id: string;
          legal_name?: string;
          nip?: string;
          postal_code?: string;
          regon?: string;
          tax_office?: string;
          updated_at?: string;
        };
        Update: {
          address_line?: string;
          bank_account?: string;
          city?: string;
          created_at?: string;
          document_prefix?: string;
          fleet_user_id?: string;
          legal_name?: string;
          nip?: string;
          postal_code?: string;
          regon?: string;
          tax_office?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_type: string;
          created_at: string;
          display_name: string | null;
          email: string | null;
          fleet_partner_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          account_type?: string;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          fleet_partner_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          account_type?: string;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          fleet_partner_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_data: {
        Row: {
          created_at: string;
          entries: Json;
          fleet: Json;
          profile: Json;
          updated_at: string;
          user_id: string;
          workspace: string;
        };
        Insert: {
          created_at?: string;
          entries?: Json;
          fleet?: Json;
          profile?: Json;
          updated_at?: string;
          user_id: string;
          workspace?: string;
        };
        Update: {
          created_at?: string;
          entries?: Json;
          fleet?: Json;
          profile?: Json;
          updated_at?: string;
          user_id?: string;
          workspace?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
