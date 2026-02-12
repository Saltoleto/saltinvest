-- SaltInvest - Schema (com melhorias de execução e RLS explícito)
-- Observação: mantém o mesmo modelo e regras do SQL original, mas adiciona:
-- - extensão pgcrypto (gen_random_uuid)
-- - WITH CHECK explícito nas políticas (evita erro no INSERT)
-- - índices básicos para performance (user_id e created_at)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Classes de Ativos (Ações, FIIs, Cripto, etc)
CREATE TABLE IF NOT EXISTS public.asset_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Instituições (Bancos/Corretoras)
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Metas (Goals)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target NUMERIC NOT NULL DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Investimentos (Aportes)
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  institution TEXT,
  liquidity TEXT,
  asset_due_date DATE,
  fgc_covered BOOLEAN DEFAULT false,
  distributions JSONB DEFAULT '{}'::jsonb,
  date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Configurações do Usuário (XP, Nível, Alocação)
CREATE TABLE IF NOT EXISTS public.user_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  allocation JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de Insights da IA
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices básicos (opcionais, mas recomendados)
CREATE INDEX IF NOT EXISTS idx_asset_classes_user_id ON public.asset_classes(user_id);
CREATE INDEX IF NOT EXISTS idx_institutions_user_id ON public.institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id_created_at ON public.goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investments_user_id_created_at ON public.investments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id_created_at ON public.ai_insights(user_id, created_at DESC);

-- RLS
ALTER TABLE public.asset_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Políticas (USING + WITH CHECK)
DROP POLICY IF EXISTS "Users can manage their own asset classes" ON public.asset_classes;
CREATE POLICY "Users can manage their own asset classes" ON public.asset_classes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own institutions" ON public.institutions;
CREATE POLICY "Users can manage their own institutions" ON public.institutions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals" ON public.goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own investments" ON public.investments;
CREATE POLICY "Users can manage their own investments" ON public.investments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own config" ON public.user_config;
CREATE POLICY "Users can manage their own config" ON public.user_config
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own insights" ON public.ai_insights;
CREATE POLICY "Users can manage their own insights" ON public.ai_insights
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- Option A) View + Índices (Dashboard/Planejamento de Metas)
--
-- A view abaixo calcula, por usuário e por meta:
-- - valor investido na meta (somando o JSONB investments.distributions)
-- - % de progresso, valor restante, e status (Ativa/Atrasada/Concluída)
--
-- Observação: investments.distributions é JSONB com chaves = goal_id (texto)
-- e valores numéricos (armazenados como number).
-- =============================================================

-- View: progresso de metas
DROP VIEW IF EXISTS public.v_goal_progress;
-- IMPORTANTE: `security_invoker=true` faz a view respeitar permissões/RLS do usuário que consulta,
-- evitando o alerta de SECURITY DEFINER no Supabase.
CREATE VIEW public.v_goal_progress WITH (security_invoker = true) AS
WITH dist AS (
  SELECT
    i.user_id,
    (e.key)::uuid AS goal_id,
    COALESCE((e.value)::numeric, 0) AS amount
  FROM public.investments i
  CROSS JOIN LATERAL jsonb_each(COALESCE(i.distributions, '{}'::jsonb)) AS e(key, value)
)
SELECT
  g.user_id,
  g.id AS goal_id,
  g.title,
  g.target,
  g.due_date,
  g.created_at,
  COALESCE(SUM(d.amount), 0) AS invested_amount,
  GREATEST(g.target - COALESCE(SUM(d.amount), 0), 0) AS remaining_amount,
  CASE
    WHEN g.due_date IS NULL OR GREATEST(g.target - COALESCE(SUM(d.amount), 0), 0) = 0 THEN NULL
    ELSE GREATEST(
      1,
      (
        (EXTRACT(YEAR FROM AGE(g.due_date, CURRENT_DATE)) * 12)
        + EXTRACT(MONTH FROM AGE(g.due_date, CURRENT_DATE))
        + 1
      )::int
    )
  END AS months_left,
  CASE
    WHEN g.due_date IS NULL THEN NULL
    WHEN GREATEST(g.target - COALESCE(SUM(d.amount), 0), 0) = 0 THEN 0
    ELSE ROUND(
      GREATEST(g.target - COALESCE(SUM(d.amount), 0), 0)
      / GREATEST(
          1,
          (
            (EXTRACT(YEAR FROM AGE(g.due_date, CURRENT_DATE)) * 12)
            + EXTRACT(MONTH FROM AGE(g.due_date, CURRENT_DATE))
            + 1
          )::int
        ),
      2
    )
  END AS required_per_month,
  CASE
    WHEN g.target > 0 THEN ROUND((COALESCE(SUM(d.amount), 0) / g.target) * 100, 2)
    ELSE 0
  END AS progress_percent,
  CASE
    WHEN g.target > 0 AND COALESCE(SUM(d.amount), 0) >= g.target THEN 'Concluída'
    WHEN g.due_date IS NOT NULL AND g.due_date < CURRENT_DATE AND COALESCE(SUM(d.amount), 0) < g.target THEN 'Atrasada'
    ELSE 'Ativa'
  END AS status
FROM public.goals g
LEFT JOIN dist d
  ON d.user_id = g.user_id AND d.goal_id = g.id
GROUP BY g.user_id, g.id, g.title, g.target, g.due_date, g.created_at;

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_goals_user_due_date ON public.goals (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_created_at ON public.goals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investments_user_created_at ON public.investments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investments_user_date ON public.investments (user_id, date DESC);

-- Para acelerar consultas envolvendo distributions (jsonb)
CREATE INDEX IF NOT EXISTS idx_investments_distributions_gin ON public.investments USING GIN (distributions jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created_at ON public.ai_insights (user_id, created_at DESC);

