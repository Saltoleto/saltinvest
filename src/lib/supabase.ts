import { createClient } from "@supabase/supabase-js";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; created_at: string | null };
        Insert: { id: string; email?: string | null; created_at?: string | null };
        Update: { email?: string | null; created_at?: string | null };
        Relationships: [];
      };
      classes: {
        Row: { id: string; user_id: string; name: string; target_percent: number | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; name: string; target_percent?: number | null; created_at?: string | null; updated_at?: string | null };
        Update: { name?: string; target_percent?: number | null; updated_at?: string | null };
        Relationships: [];
      };
      institutions: {
        Row: { id: string; user_id: string; name: string; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; name: string; created_at?: string | null; updated_at?: string | null };
        Update: { name?: string; updated_at?: string | null };
        Relationships: [];
      };
      goals: {
        Row: { id: string; user_id: string; name: string; target_value: number; target_date: string; is_monthly_plan: boolean; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; name: string; target_value: number; target_date: string; is_monthly_plan?: boolean; created_at?: string | null; updated_at?: string | null };
        Update: { name?: string; target_value?: number; target_date?: string; is_monthly_plan?: boolean; updated_at?: string | null };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          total_value: number;
          class_id: string | null;
          institution_id: string | null;
          due_date: string | null;
          liquidity_type: string;
          is_fgc_covered: boolean;
          is_redeemed: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          total_value: number;
          class_id?: string | null;
          institution_id?: string | null;
          due_date?: string | null;
          liquidity_type: string;
          is_fgc_covered?: boolean;
          is_redeemed?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          total_value?: number;
          class_id?: string | null;
          institution_id?: string | null;
          due_date?: string | null;
          liquidity_type?: string;
          is_fgc_covered?: boolean;
          is_redeemed?: boolean;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      investment_allocations: {
        Row: { id: string; investment_id: string; goal_id: string; amount: number; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; investment_id: string; goal_id: string; amount: number; created_at?: string | null; updated_at?: string | null };
        Update: { amount?: number; updated_at?: string | null };
        Relationships: [];
      };
      insights: {
        Row: { id: string; user_id: string; insight_date: string; content: Json; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; insight_date: string; content: Json; created_at?: string | null; updated_at?: string | null };
        Update: { content?: Json; updated_at?: string | null };
        Relationships: [];
      };
    };
    Views: {
      v_equity_summary: {
        Row: { user_id: string; total_equity: number; liquid_equity: number; fgc_protected_total: number };
      };
      v_goals_evolution: {
        Row: {
          user_id: string;
          goal_id: string;
          name: string;
          target_value: number;
          current_contributed: number;
          percent_progress: number;
          days_remaining: number;
          is_monthly_plan: boolean;
        };
      };
      v_fgc_exposure: {
        Row: { user_id: string; institution_name: string; covered_amount: number; uncovered_amount: number; total_in_institution: number };
      };
      v_monthly_plan_goals: {
        Row: {
          user_id: string;
          goal_id: string;
          name: string;
          target_value: number;
          target_date: string;
          is_monthly_plan: boolean;
          current_contributed: number;
          remaining_value: number;
          months_remaining: number;
          suggested_this_month: number;
          contributed_this_month: number;
          remaining_this_month: number;
        };
      };
      v_monthly_plan_summary: {
        Row: {
          user_id: string;
          total_suggested_this_month: number;
          total_contributed_this_month: number;
          total_remaining_this_month: number;
        };
      };
      v_monthly_plan_ranking: {
        Row: {
          user_id: string;
          goal_id: string;
          name: string;
          target_value: number;
          target_date: string;
          is_monthly_plan: boolean;
          current_contributed: number;
          remaining_value: number;
          months_remaining: number;
          suggested_this_month: number;
          contributed_this_month: number;
          remaining_this_month: number;
          priority_score: number;
          priority_rank: number;
        };
      };
    };
    Functions: {};
    Enums: {};
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
