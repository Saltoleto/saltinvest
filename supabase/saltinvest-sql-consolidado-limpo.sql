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
  include_in_plan BOOLEAN NOT NULL DEFAULT true,
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

-- 4.1. Tabela associativa de distribuição de investimentos por meta (fonte auditável)
-- Cada linha representa quanto de um investimento foi alocado para uma meta.
CREATE TABLE IF NOT EXISTS public.investment_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT investment_allocations_amount_nonneg CHECK (amount >= 0),
  CONSTRAINT investment_allocations_unique UNIQUE (investment_id, goal_id)
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

-- RLS
ALTER TABLE public.asset_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_allocations ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "Users can manage their own investment allocations" ON public.investment_allocations;
CREATE POLICY "Users can manage their own investment allocations" ON public.investment_allocations
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
-- Observação: a fonte preferencial para progresso de metas é investment_allocations.
-- O campo investments.distributions é mantido por retrocompatibilidade, mas não é a fonte primária.
-- =============================================================

-- View: progresso de metas
DROP VIEW IF EXISTS public.v_goal_progress;
-- IMPORTANTE: `security_invoker=true` faz a view respeitar permissões/RLS do usuário que consulta,
-- evitando o alerta de SECURITY DEFINER no Supabase.
CREATE VIEW public.v_goal_progress WITH (security_invoker = true) AS
WITH
  -- soma do aportado por meta (tabela associativa)
  alloc_sum AS (
    SELECT
      ia.user_id,
      ia.goal_id,
      COALESCE(SUM(ia.amount), 0)::numeric AS invested_amount
    FROM public.investment_allocations ia
    GROUP BY ia.user_id, ia.goal_id
  ),
  -- detecta se houve qualquer aporte no mês corrente (para "travar" o mês atual no cálculo)
  alloc_this_month AS (
    SELECT
      ia.user_id,
      ia.goal_id,
      1::int AS has_alloc_this_month
    FROM public.investment_allocations ia
    JOIN public.investments i
      ON i.id = ia.investment_id
     AND i.user_id = ia.user_id
    WHERE
      date_trunc('month', COALESCE(i.date, i.created_at)) = date_trunc('month', CURRENT_DATE)
    GROUP BY ia.user_id, ia.goal_id
  ),
  base AS (
    SELECT
      g.id,
      g.user_id,
      g.title,
      g.target,
      g.due_date,
      g.include_in_plan,
      g.created_at,
      COALESCE(a.invested_amount, 0)::numeric AS invested_amount,
      GREATEST((g.target - COALESCE(a.invested_amount, 0))::numeric, 0)::numeric AS remaining_amount,
      -- meses totais "incluindo o mês atual"
      CASE
        WHEN g.due_date IS NULL THEN NULL::int
        ELSE GREATEST(
          (
            (EXTRACT(YEAR FROM g.due_date)::int * 12 + EXTRACT(MONTH FROM g.due_date)::int)
            - (EXTRACT(YEAR FROM CURRENT_DATE)::int * 12 + EXTRACT(MONTH FROM CURRENT_DATE)::int)
          ) + 1,
          0
        )::int
      END AS months_total_from_now,
      COALESCE(atm.has_alloc_this_month, 0)::int AS has_alloc_this_month,
      (date_trunc('month', g.due_date) = date_trunc('month', CURRENT_DATE)) AS is_due_current_month
    FROM public.goals g
    LEFT JOIN alloc_sum a
      ON a.user_id = g.user_id
     AND a.goal_id = g.id
    LEFT JOIN alloc_this_month atm
      ON atm.user_id = g.user_id
     AND atm.goal_id = g.id
    WHERE g.status = 'Ativa'
  )
SELECT
  b.id,
  b.user_id,
  b.title,
  b.target,
  b.due_date,
  b.include_in_plan,
  b.created_at,
  b.invested_amount,
  b.remaining_amount,
  -- months_left (regra):
  -- 1) se já atingiu, 0
  -- 2) se o vencimento é no mês corrente e ainda falta, mantém 1 (não pode virar 0 com aporte parcial)
  -- 3) caso contrário: meses totais incluindo o mês atual, e se houve aporte no mês corrente, desconta 1 (próximos meses)
  CASE
    WHEN b.due_date IS NULL THEN NULL::int
    WHEN b.remaining_amount <= 0 THEN 0::int
    WHEN b.is_due_current_month THEN 1::int
    ELSE GREATEST((b.months_total_from_now - b.has_alloc_this_month), 0)::int
  END AS months_left,
  -- required_per_month:
  -- 1) se já atingiu, 0
  -- 2) se vencimento é no mês corrente, precisa completar o restante ainda nesse mês
  -- 3) caso months_left <= 0 (atrasada/sem meses), mostra o restante como "urgente"
  -- 4) caso normal: restante / months_left
  CASE
    WHEN b.due_date IS NULL THEN NULL::numeric
    WHEN b.remaining_amount <= 0 THEN 0::numeric
    WHEN b.is_due_current_month THEN ROUND(b.remaining_amount, 2)
    ELSE
      CASE
        WHEN GREATEST((b.months_total_from_now - b.has_alloc_this_month), 0) <= 0 THEN ROUND(b.remaining_amount, 2)
        ELSE ROUND(
          b.remaining_amount
          / NULLIF(GREATEST((b.months_total_from_now - b.has_alloc_this_month), 0), 0),
          2
        )
      END
  END AS required_per_month,
  -- progresso global da meta
  CASE
    WHEN b.target = 0 THEN 0::numeric
    ELSE ROUND(((b.invested_amount / b.target) * 100)::numeric, 2)
  END AS progress_percent,
  'Ativa'::text AS status
FROM base b;

-- Índices recomendados
CREATE INDEX IF NOT EXISTS idx_goals_user_due_date ON public.goals (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_goals_user_created_at ON public.goals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investments_user_created_at ON public.investments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investments_user_date ON public.investments (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_investment_allocations_user_goal ON public.investment_allocations (user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_investment_allocations_user_investment ON public.investment_allocations (user_id, investment_id);

-- Para acelerar consultas envolvendo distributions (jsonb)
CREATE INDEX IF NOT EXISTS idx_investments_distributions_gin ON public.investments USING GIN (distributions jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created_at ON public.ai_insights (user_id, created_at DESC);

