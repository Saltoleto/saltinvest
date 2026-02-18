-- ESQUEMA SQL COMPLETO - SALTINVEST
-- Versão: 1.2 (Com suporte a FGC, Metas Mensais e RLS)

-- 1. EXTENSÕES (Caso utilize PostgreSQL/Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELAS PRINCIPAIS

-- Tabela de Perfis (Vinculada ao Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Classes de Ativos
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_percent DECIMAL(5,2) DEFAULT 0, -- Definido na tela de Alvos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Instituições Financeiras
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Metas (Goals)
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    target_date DATE NOT NULL,
    is_monthly_plan BOOLEAN DEFAULT TRUE, -- Flag para planejamento mensal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Investimentos (Ativos)
CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    liquidity_type TEXT CHECK (liquidity_type IN ('diaria', 'vencimento')),
    due_date DATE,
    is_fgc_covered BOOLEAN DEFAULT FALSE, -- Flag de proteção FGC
    is_redeemed BOOLEAN DEFAULT FALSE,    -- Flag de resgate
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Alocação de Ativos em Metas (Relacionamento N:N)
-- No Firestore isso é um array/map, aqui é uma tabela de junção para integridade referencial
CREATE TABLE public.investment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Insights (Cache Diário)
CREATE TABLE public.insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    content JSONB, -- Array de {type, text}
    insight_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, insight_date)
);

-- 3. SEGURANÇA (ROW LEVEL SECURITY)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuário só vê seus próprios dados
CREATE POLICY "Users can only access their own data" ON public.classes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own data" ON public.institutions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own data" ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own data" ON public.investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own data" ON public.investment_allocations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.investments WHERE id = investment_id AND user_id = auth.uid())
);
CREATE POLICY "Users can only access their own data" ON public.insights FOR ALL USING (auth.uid() = user_id);

-- 4. VIEWS DE ANÁLISE (O coração do SaltInvest)

-- View para Resumo do Patrimônio e Liquidez
CREATE OR REPLACE VIEW public.v_equity_summary AS
SELECT 
    user_id,
    SUM(total_value) FILTER (WHERE NOT is_redeemed) as total_equity,
    SUM(total_value) FILTER (WHERE NOT is_redeemed AND liquidity_type = 'diaria') as liquid_equity,
    SUM(total_value) FILTER (WHERE NOT is_redeemed AND is_fgc_covered) as fgc_protected_total
FROM public.investments
GROUP BY user_id;

-- View para Progresso das Metas
CREATE OR REPLACE VIEW public.v_goals_evolution AS
SELECT 
    g.id as goal_id,
    g.user_id,
    g.name,
    g.target_value,
    g.is_monthly_plan,
    COALESCE(SUM(ia.amount), 0) as current_contributed,
    CASE 
        WHEN g.target_value > 0 THEN (COALESCE(SUM(ia.amount), 0) / g.target_value) * 100 
        ELSE 0 
    END as percent_progress,
    (g.target_date - CURRENT_DATE) as days_remaining
FROM public.goals g
LEFT JOIN public.investment_allocations ia ON g.id = ia.goal_id
GROUP BY g.id, g.user_id, g.name, g.target_value, g.target_date, g.is_monthly_plan;

-- View para Exposição ao FGC por Instituição (Solicitado)
CREATE OR REPLACE VIEW public.v_fgc_exposure AS
SELECT 
    i.user_id,
    inst.name as institution_name,
    SUM(i.total_value) FILTER (WHERE i.is_fgc_covered) as covered_amount,
    SUM(i.total_value) FILTER (WHERE NOT i.is_fgc_covered) as uncovered_amount,
    SUM(i.total_value) as total_in_institution
FROM public.investments i
JOIN public.institutions inst ON i.institution_id = inst.id
WHERE i.is_redeemed = FALSE
GROUP BY i.user_id, inst.name;

-- =========================
-- PLANO DO MÊS (Views)
-- =========================
-- Regras:
-- - suggested_this_month = (target_value - current_contributed) / months_remaining
-- - months_remaining considera meses-calendário a partir do mês atual até o mês da target_date (inclusive)
--   Ex.: fev -> dez = 11, jun -> dez = 7
-- - total do mês = soma do suggested_this_month (somente metas is_monthly_plan = true)
-- - subtrai aportes feitos no mês atual (investment_allocations vinculadas a investments.created_at no mês atual)
-- - repete automaticamente mês a mês pelo filtro de created_at

CREATE OR REPLACE VIEW public.v_monthly_plan_goals AS
WITH
params AS (
  SELECT date_trunc('month', CURRENT_DATE)::date AS current_month
),
goal_base AS (
  SELECT
    g.id                 AS goal_id,
    g.user_id,
    g.name,
    g.target_value,
    g.target_date,
    g.is_monthly_plan,
    COALESCE(SUM(ia.amount), 0)::numeric(15,2) AS current_contributed
  FROM public.goals g
  LEFT JOIN public.investment_allocations ia
    ON ia.goal_id = g.id
  GROUP BY g.id, g.user_id, g.name, g.target_value, g.target_date, g.is_monthly_plan
),
months_calc AS (
  SELECT
    gb.*,
    p.current_month,
    date_trunc('month', gb.target_date)::date AS target_month,
    (
      (EXTRACT(YEAR  FROM date_trunc('month', gb.target_date))::int - EXTRACT(YEAR  FROM p.current_month)::int) * 12
      + (EXTRACT(MONTH FROM date_trunc('month', gb.target_date))::int - EXTRACT(MONTH FROM p.current_month)::int)
      + 1
    ) AS months_remaining_raw
  FROM goal_base gb
  CROSS JOIN params p
),
aportes_mes AS (
  SELECT
    ia.goal_id,
    i.user_id,
    COALESCE(SUM(ia.amount), 0)::numeric(15,2) AS contributed_this_month
  FROM public.investment_allocations ia
  JOIN public.investments i
    ON i.id = ia.investment_id
  WHERE date_trunc('month', i.created_at)::date = date_trunc('month', CURRENT_DATE)::date
  GROUP BY ia.goal_id, i.user_id
)
SELECT
  mc.user_id,
  mc.goal_id,
  mc.name,
  mc.target_value,
  mc.target_date,
  mc.is_monthly_plan,

  mc.current_contributed,

  GREATEST(mc.target_value - mc.current_contributed, 0)::numeric(15,2) AS remaining_value,
  GREATEST(mc.months_remaining_raw, 0) AS months_remaining,

  CASE
    WHEN mc.is_monthly_plan IS TRUE
     AND GREATEST(mc.months_remaining_raw, 0) > 0
    THEN (GREATEST(mc.target_value - mc.current_contributed, 0) / GREATEST(mc.months_remaining_raw, 1))::numeric(15,2)
    ELSE 0::numeric(15,2)
  END AS suggested_this_month,

  COALESCE(am.contributed_this_month, 0)::numeric(15,2) AS contributed_this_month,

  GREATEST(
    (
      CASE
        WHEN mc.is_monthly_plan IS TRUE
         AND GREATEST(mc.months_remaining_raw, 0) > 0
        THEN (GREATEST(mc.target_value - mc.current_contributed, 0) / GREATEST(mc.months_remaining_raw, 1))::numeric(15,2)
        ELSE 0::numeric(15,2)
      END
    ) - COALESCE(am.contributed_this_month, 0),
    0
  )::numeric(15,2) AS remaining_this_month

FROM months_calc mc
LEFT JOIN aportes_mes am
  ON am.goal_id = mc.goal_id
 AND am.user_id = mc.user_id;


CREATE OR REPLACE VIEW public.v_monthly_plan_summary AS
SELECT
  user_id,
  SUM(suggested_this_month)::numeric(15,2)   AS total_suggested_this_month,
  SUM(contributed_this_month)::numeric(15,2) AS total_contributed_this_month,
  SUM(remaining_this_month)::numeric(15,2)   AS total_remaining_this_month
FROM public.v_monthly_plan_goals
WHERE is_monthly_plan IS TRUE
GROUP BY user_id;


-- Ranking de metas por prioridade (Plano do mês)
-- Heurística (premium/útil):
-- - Quanto menor o prazo (months_remaining), maior a prioridade
-- - Quanto maior o gap relativo (remaining_value/target_value), maior a prioridade
-- priority_score combina ambos; use priority_rank para ordenar.
CREATE OR REPLACE VIEW public.v_monthly_plan_ranking AS
SELECT
  mpg.*,
  (
    (CASE WHEN mpg.months_remaining > 0 THEN (1::numeric / mpg.months_remaining) ELSE 0::numeric END) * 0.6
    + (CASE WHEN mpg.target_value > 0 THEN (mpg.remaining_value / mpg.target_value) ELSE 0::numeric END) * 0.4
  )::numeric(15,6) AS priority_score,
  DENSE_RANK() OVER (
    PARTITION BY mpg.user_id
    ORDER BY
      (
        (CASE WHEN mpg.months_remaining > 0 THEN (1::numeric / mpg.months_remaining) ELSE 0::numeric END) * 0.6
        + (CASE WHEN mpg.target_value > 0 THEN (mpg.remaining_value / mpg.target_value) ELSE 0::numeric END) * 0.4
      ) DESC,
      mpg.months_remaining ASC,
      mpg.remaining_value DESC
  ) AS priority_rank
FROM public.v_monthly_plan_goals mpg
WHERE mpg.is_monthly_plan IS TRUE
  AND mpg.remaining_value > 0;

-- 5. TRIGGER PARA ATUALIZAÇÃO DE TIMESTAMPS
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_modtime BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER update_investments_modtime BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE PROCEDURE update_timestamp();