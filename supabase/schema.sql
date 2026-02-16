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