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
      acompanhamento_diario: {
        Row: {
          created_at: string
          data: string
          faturamento_realizado: number | null
          id: string
          obs: string | null
          updated_at: string
          vendas_realizadas: number | null
        }
        Insert: {
          created_at?: string
          data: string
          faturamento_realizado?: number | null
          id?: string
          obs?: string | null
          updated_at?: string
          vendas_realizadas?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          faturamento_realizado?: number | null
          id?: string
          obs?: string | null
          updated_at?: string
          vendas_realizadas?: number | null
        }
        Relationships: []
      }
      anuncios: {
        Row: {
          ano: number
          cac: number | null
          cliques: number | null
          conversao: number | null
          created_at: string
          custo_por_lead: number | null
          id: string
          investimento: number | null
          leads: number | null
          mes: string
          pacientes: number | null
          percentual: number | null
          plataforma: string
          screenshot_url: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          cac?: number | null
          cliques?: number | null
          conversao?: number | null
          created_at?: string
          custo_por_lead?: number | null
          id?: string
          investimento?: number | null
          leads?: number | null
          mes: string
          pacientes?: number | null
          percentual?: number | null
          plataforma: string
          screenshot_url?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ano?: number
          cac?: number | null
          cliques?: number | null
          conversao?: number | null
          created_at?: string
          custo_por_lead?: number | null
          id?: string
          investimento?: number | null
          leads?: number | null
          mes?: string
          pacientes?: number | null
          percentual?: number | null
          plataforma?: string
          screenshot_url?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      automacao_disparos: {
        Row: {
          automacao_id: string
          created_at: string
          data_envio: string | null
          data_programada: string
          erro: string | null
          id: string
          lead_id: string
          mensagem_enviada: string | null
          nome_cliente: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          automacao_id: string
          created_at?: string
          data_envio?: string | null
          data_programada: string
          erro?: string | null
          id?: string
          lead_id: string
          mensagem_enviada?: string | null
          nome_cliente?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          automacao_id?: string
          created_at?: string
          data_envio?: string | null
          data_programada?: string
          erro?: string | null
          id?: string
          lead_id?: string
          mensagem_enviada?: string | null
          nome_cliente?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automacao_disparos_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "automacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automacao_disparos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      automacoes: {
        Row: {
          audio_url: string | null
          audios_vendedor: Json | null
          created_at: string
          dias_apos_venda: number
          filtro_como_conheceu: string[] | null
          fonte: string
          id: string
          mensagem: string
          nome: string
          status: string
          total_envios: number
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          audios_vendedor?: Json | null
          created_at?: string
          dias_apos_venda: number
          filtro_como_conheceu?: string[] | null
          fonte?: string
          id?: string
          mensagem: string
          nome: string
          status?: string
          total_envios?: number
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          audios_vendedor?: Json | null
          created_at?: string
          dias_apos_venda?: number
          filtro_como_conheceu?: string[] | null
          fonte?: string
          id?: string
          mensagem?: string
          nome?: string
          status?: string
          total_envios?: number
          updated_at?: string
        }
        Relationships: []
      }
      automacoes_config: {
        Row: {
          id: string
          pausado: boolean
          template_perdidos: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          pausado?: boolean
          template_perdidos?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          pausado?: boolean
          template_perdidos?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      detalhado: {
        Row: {
          como_conheceu: string | null
          created_at: string
          data: string | null
          email: string | null
          id: string
          nome: string | null
          obs: string | null
          receita: string | null
          telefone: string | null
          updated_at: string
          venda: string | null
          visitou_loja: string | null
        }
        Insert: {
          como_conheceu?: string | null
          created_at?: string
          data?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          obs?: string | null
          receita?: string | null
          telefone?: string | null
          updated_at?: string
          venda?: string | null
          visitou_loja?: string | null
        }
        Update: {
          como_conheceu?: string | null
          created_at?: string
          data?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          obs?: string | null
          receita?: string | null
          telefone?: string | null
          updated_at?: string
          venda?: string | null
          visitou_loja?: string | null
        }
        Relationships: []
      }
      disparos_perdidos: {
        Row: {
          created_at: string
          data_envio: string | null
          erro: string | null
          id: string
          lead_id: string
          media_type: string | null
          media_url: string | null
          mensagem_enviada: string | null
          nome_cliente: string | null
          status: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          data_envio?: string | null
          erro?: string | null
          id?: string
          lead_id: string
          media_type?: string | null
          media_url?: string | null
          mensagem_enviada?: string | null
          nome_cliente?: string | null
          status?: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          data_envio?: string | null
          erro?: string | null
          id?: string
          lead_id?: string
          media_type?: string | null
          media_url?: string | null
          mensagem_enviada?: string | null
          nome_cliente?: string | null
          status?: string
          telefone?: string | null
        }
        Relationships: []
      }
      indicadores: {
        Row: {
          created_at: string
          id: string
          indicador: string | null
          meta: string | null
          obs: string | null
          periodo: string | null
          updated_at: string
          valor: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          indicador?: string | null
          meta?: string | null
          obs?: string | null
          periodo?: string | null
          updated_at?: string
          valor?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          indicador?: string | null
          meta?: string | null
          obs?: string | null
          periodo?: string | null
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          canal: string | null
          created_at: string
          data_registro: string | null
          entrar_em_contato: string | null
          id: string
          medico: string | null
          nome: string | null
          numero: string | null
          obs: string | null
          orcamento: string | null
          status: string | null
          updated_at: string
          venda: string | null
          vendedor: string | null
        }
        Insert: {
          canal?: string | null
          created_at?: string
          data_registro?: string | null
          entrar_em_contato?: string | null
          id?: string
          medico?: string | null
          nome?: string | null
          numero?: string | null
          obs?: string | null
          orcamento?: string | null
          status?: string | null
          updated_at?: string
          venda?: string | null
          vendedor?: string | null
        }
        Update: {
          canal?: string | null
          created_at?: string
          data_registro?: string | null
          entrar_em_contato?: string | null
          id?: string
          medico?: string | null
          nome?: string | null
          numero?: string | null
          obs?: string | null
          orcamento?: string | null
          status?: string | null
          updated_at?: string
          venda?: string | null
          vendedor?: string | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          obs: string | null
          percentual: string | null
          status: string | null
          updated_at: string
          valor_atual: string | null
          valor_meta: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          obs?: string | null
          percentual?: string | null
          status?: string | null
          updated_at?: string
          valor_atual?: string | null
          valor_meta?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          obs?: string | null
          percentual?: string | null
          status?: string | null
          updated_at?: string
          valor_atual?: string | null
          valor_meta?: string | null
        }
        Relationships: []
      }
      metas_config: {
        Row: {
          created_at: string
          id: string
          media_atendimentos: number | null
          mes: string
          meta_faturamento_mensal: number | null
          percentual_comparecimento: number | null
          percentual_conversao: number | null
          percentual_receita: number | null
          periodos: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_atendimentos?: number | null
          mes: string
          meta_faturamento_mensal?: number | null
          percentual_comparecimento?: number | null
          percentual_conversao?: number | null
          percentual_receita?: number | null
          periodos?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_atendimentos?: number | null
          mes?: string
          meta_faturamento_mensal?: number | null
          percentual_comparecimento?: number | null
          percentual_conversao?: number | null
          percentual_receita?: number | null
          periodos?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      mkt: {
        Row: {
          campanha: string | null
          canal: string | null
          conversoes: string | null
          created_at: string
          id: string
          investimento: string | null
          leads_gerados: string | null
          obs: string | null
          retorno: string | null
          updated_at: string
        }
        Insert: {
          campanha?: string | null
          canal?: string | null
          conversoes?: string | null
          created_at?: string
          id?: string
          investimento?: string | null
          leads_gerados?: string | null
          obs?: string | null
          retorno?: string | null
          updated_at?: string
        }
        Update: {
          campanha?: string | null
          canal?: string | null
          conversoes?: string | null
          created_at?: string
          id?: string
          investimento?: string | null
          leads_gerados?: string | null
          obs?: string | null
          retorno?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          afternoon_shift: string | null
          created_at: string
          date: string
          day_of_week: string
          id: string
          morning_shift: string | null
          sheet_name: string
          updated_at: string
        }
        Insert: {
          afternoon_shift?: string | null
          created_at?: string
          date: string
          day_of_week: string
          id?: string
          morning_shift?: string | null
          sheet_name?: string
          updated_at?: string
        }
        Update: {
          afternoon_shift?: string | null
          created_at?: string
          date?: string
          day_of_week?: string
          id?: string
          morning_shift?: string | null
          sheet_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_inactive_patients: {
        Args: { dias_janela?: number; dias_limite?: number }
        Returns: {
          dias_desde_ultimo: number
          id: string
          nome: string
          telefone: string
          ultimo_atendimento: string
        }[]
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
