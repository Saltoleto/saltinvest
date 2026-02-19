import { createClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// IMPORTANT:
// This app is aligned to the SQL model in `sql-saltinvest.sql`.
// We keep types lightweight and only for the objects we query directly.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; created_at: string | null };
        Insert: { id: string; email?: string | null; created_at?: string | null };
        Update: { email?: string | null; created_at?: string | null };
        Relationships: [];
      };

      categorias_ativos: {
        Row: { id: string; usuario_id: string; nome: string; criado_em: string };
        Insert: { id?: string; usuario_id: string; nome: string; criado_em?: string };
        Update: { nome?: string };
        Relationships: [];
      };

      instituicoes_financeiras: {
        Row: { id: string; usuario_id: string; nome: string; criado_em: string };
        Insert: { id?: string; usuario_id: string; nome: string; criado_em?: string };
        Update: { nome?: string };
        Relationships: [];
      };

      politicas_alocacao: {
        Row: { id: string; usuario_id: string; nome: string; criado_em: string };
        Insert: { id?: string; usuario_id: string; nome?: string; criado_em?: string };
        Update: { nome?: string };
        Relationships: [];
      };

      politicas_alocacao_itens: {
        Row: { id: string; politica_alocacao_id: string; categoria_ativo_id: string; percentual_alvo: number; criado_em: string };
        Insert: { id?: string; politica_alocacao_id: string; categoria_ativo_id: string; percentual_alvo: number; criado_em?: string };
        Update: { percentual_alvo?: number };
        Relationships: [];
      };

      objetivos: {
        Row: {
          id: string;
          usuario_id: string;
          nome: string;
          valor_alvo: number;
          data_inicio: string;
          data_alvo: string;
          participa_plano_mensal: boolean;
          criado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          nome: string;
          valor_alvo: number;
          data_inicio: string;
          data_alvo: string;
          participa_plano_mensal?: boolean;
          criado_em?: string;
        };
        // Updates are intentionally blocked by DB trigger.
        Update: never;
        Relationships: [];
      };

      parcelas_objetivo: {
        Row: {
          id: string;
          objetivo_id: string;
          usuario_id: string;
          mes_referencia: string;
          valor_planejado: number;
          status: "ABERTA" | "ATINGIDA";
          criado_em: string;
        };
        Insert: {
          id?: string;
          objetivo_id: string;
          usuario_id: string;
          mes_referencia: string;
          valor_planejado: number;
          status?: "ABERTA" | "ATINGIDA";
          criado_em?: string;
        };
        Update: { valor_planejado?: number; status?: "ABERTA" | "ATINGIDA" };
        Relationships: [];
      };

      aplicacoes: {
        Row: {
          id: string;
          usuario_id: string;
          nome: string;
          categoria_ativo_id: string;
          instituicao_financeira_id: string | null;
          valor_aplicado: number;
          liquidez: "DIARIA" | "NO_VENCIMENTO";
          data_vencimento: string | null;
          coberto_fgc: boolean;
          status: "ATIVA" | "RESGATADA";
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          nome: string;
          categoria_ativo_id: string;
          instituicao_financeira_id?: string | null;
          valor_aplicado: number;
          liquidez?: "DIARIA" | "NO_VENCIMENTO";
          data_vencimento?: string | null;
          coberto_fgc?: boolean;
          status?: "ATIVA" | "RESGATADA";
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          nome?: string;
          categoria_ativo_id?: string;
          instituicao_financeira_id?: string | null;
          valor_aplicado?: number;
          liquidez?: "DIARIA" | "NO_VENCIMENTO";
          data_vencimento?: string | null;
          coberto_fgc?: boolean;
          status?: "ATIVA" | "RESGATADA";
        };
        Relationships: [];
      };

      aportes: {
        Row: {
          id: string;
          usuario_id: string;
          aplicacao_id: string;
          objetivo_id: string;
          parcela_objetivo_id: string | null;
          valor_aporte: number;
          aportado_em: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          aplicacao_id: string;
          objetivo_id: string;
          parcela_objetivo_id?: string | null;
          valor_aporte: number;
          aportado_em?: string;
          criado_em?: string;
        };
        Update: { valor_aporte?: number; parcela_objetivo_id?: string | null };
        Relationships: [];
      };

      resgates_aplicacoes: {
        Row: {
          id: string;
          usuario_id: string;
          aplicacao_id: string;
          resgatado_em: string;
          valor_resgatado: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          aplicacao_id: string;
          resgatado_em?: string;
          valor_resgatado: number;
          criado_em?: string;
        };
        Update: never;
        Relationships: [];
      };
    };

    Views: {
      v_parcelas_objetivo_com_pago: {
        Row: Database["public"]["Tables"]["parcelas_objetivo"]["Row"] & { valor_pago: number };
      };

      v_plano_mensal_resumo: {
        Row: {
          usuario_id: string;
          mes_referencia: string;
          valor_total_sugerido: number;
          valor_total_aportado: number;
          valor_total_restante: number;
        };
      };

      v_plano_mensal_detalhe: {
        Row: {
          usuario_id: string;
          objetivo_id: string;
          objetivo_nome: string;
          participa_plano_mensal: boolean;
          mes_referencia: string;
          valor_planejado: number;
          valor_pago: number;
          status: "ABERTA" | "ATINGIDA";
          em_atraso: boolean;
        };
      };

      v_objetivos_progresso: {
        Row: {
          usuario_id: string;
          objetivo_id: string;
          nome: string;
          parcelas_atingidas: number;
          parcelas_total: number;
          percentual_atingimento: number;
        };
      };

      v_objetivos_aportes_historico: {
        Row: {
          usuario_id: string;
          objetivo_id: string;
          objetivo_nome: string;
          parcela_objetivo_id: string | null;
          mes_referencia: string | null;
          aplicacao_id: string;
          aplicacao_nome: string;
          valor_aporte: number;
          aportado_em: string;
        };
      };
    };

    Functions: {
      fn_aplicacoes_resgatar: {
        Args: { p_aplicacao_id: string; p_valor_resgatado: number };
        Returns: void;
      };
    };

    Enums: {
      liquidez_aplicacao: "DIARIA" | "NO_VENCIMENTO";
      status_aplicacao: "ATIVA" | "RESGATADA";
      status_parcela_objetivo: "ABERTA" | "ATINGIDA";
    };

    CompositeTypes: {};
  };
};

export type Tables = { [K in keyof Database["public"]["Tables"]]: Database["public"]["Tables"][K]["Row"] };
export type Views = { [K in keyof Database["public"]["Views"]]: Database["public"]["Views"][K]["Row"] };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// NOTE: We keep Database types exported for app-level typing, but avoid binding them to the client
// to prevent build-time "never" issues when local types drift from the runtime schema.
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "") as any;
