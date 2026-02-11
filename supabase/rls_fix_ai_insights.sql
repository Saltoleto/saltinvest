-- Fix de RLS para a tabela public.ai_insights
-- Erro típico: "new row violates row-level security policy for table \"ai_insights\"" (code 42501)
--
-- Como aplicar:
-- 1) Supabase Dashboard -> SQL Editor
-- 2) Cole e execute este script
--
-- Regra mantida: cada usuário só pode ler/escrever/apagar os próprios insights.

-- (Opcional) garante UUID generator usado no schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Garante que a coluna user_id tenha default (facilita inserts mesmo que o client esqueça)
-- (seguro, pois a política abaixo exige user_id = auth.uid())
ALTER TABLE public.ai_insights
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- RLS ligado
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (se existirem)
DROP POLICY IF EXISTS "Users can manage their own insights" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_select_own" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_insert_own" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_update_own" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_delete_own" ON public.ai_insights;

-- Políticas explícitas por operação (mais fácil de debugar)
CREATE POLICY "ai_insights_select_own" ON public.ai_insights
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ai_insights_insert_own" ON public.ai_insights
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_insights_update_own" ON public.ai_insights
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_insights_delete_own" ON public.ai_insights
  FOR DELETE
  USING (user_id = auth.uid());
