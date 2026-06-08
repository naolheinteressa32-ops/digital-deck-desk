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
      customers: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          pontos: number
          saldo: number
          telefone: string | null
          total_gasto: number
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          pontos?: number
          saldo?: number
          telefone?: string | null
          total_gasto?: number
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          pontos?: number
          saldo?: number
          telefone?: string | null
          total_gasto?: number
        }
        Relationships: []
      }
      employees: {
        Row: {
          data_admissao: string | null
          id: string
          observacoes: string | null
          profile_id: string | null
          salario: number | null
          turno: string | null
        }
        Insert: {
          data_admissao?: string | null
          id?: string
          observacoes?: string | null
          profile_id?: string | null
          salario?: number | null
          turno?: string | null
        }
        Update: {
          data_admissao?: string | null
          id?: string
          observacoes?: string | null
          profile_id?: string | null
          salario?: number | null
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          session_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          session_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          session_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          numero: number | null
          preco_hora: number
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string | null
          numero?: number | null
          preco_hora?: number
          status?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          numero?: number | null
          preco_hora?: number
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          role: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: string
          nome?: string | null
          role: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          role?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          tipo: string | null
          titulo: string | null
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          tipo?: string | null
          titulo?: string | null
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          tipo?: string | null
          titulo?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          attendant_id: string | null
          created_at: string
          customer_id: string | null
          duracao_minutos: number | null
          fim: string | null
          id: string
          inicio: string
          machine_id: string | null
          status: string
          valor_total: number | null
        }
        Insert: {
          attendant_id?: string | null
          created_at?: string
          customer_id?: string | null
          duracao_minutos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          machine_id?: string | null
          status?: string
          valor_total?: number | null
        }
        Update: {
          attendant_id?: string | null
          created_at?: string
          customer_id?: string | null
          duracao_minutos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          machine_id?: string | null
          status?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          machine_tipo: string | null
          posicao: number | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          machine_tipo?: string | null
          posicao?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          machine_tipo?: string | null
          posicao?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { _user_id: string }; Returns: string }
      is_gerente: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
