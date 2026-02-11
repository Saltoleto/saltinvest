-- ESQUEMA DE TABELAS PARA SALTINVEST (INVESTPRO) PREMIUM

-- 1. Tabela de Classes de Ativos (Ações, FIIs, Cripto, etc)
CREATE TABLE public.asset_classes (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
name TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Instituições (Bancos/Corretoras)
CREATE TABLE public.institutions (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
name TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Metas (Goals)
CREATE TABLE public.goals (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
title TEXT NOT NULL,
target NUMERIC NOT NULL DEFAULT 0,
due_date DATE,
created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Investimentos (Aportes)
CREATE TABLE public.investments (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
asset TEXT NOT NULL,
amount NUMERIC NOT NULL DEFAULT 0,
category TEXT NOT NULL,
institution TEXT,
liquidity TEXT,
asset_due_date DATE,
fgc_covered BOOLEAN DEFAULT false, -- Flag de cobertura do FGC
distributions JSONB DEFAULT '{}'::jsonb, -- Mapeia ID da Meta -> Valor destinado
date TIMESTAMPTZ DEFAULT now(),
created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Configurações do Usuário (XP, Nível, Alocação)
CREATE TABLE public.user_config (
user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
xp INTEGER DEFAULT 0,
level INTEGER DEFAULT 1,
allocation JSONB DEFAULT '{}'::jsonb,
updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabela de Insights da IA
CREATE TABLE public.ai_insights (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
type TEXT, -- Ex: Oportunidade, Atenção, Dica
text TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT now()
);

-- CONFIGURAÇÃO DE SEGURANÇA (RLS - ROW LEVEL SECURITY)

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.asset_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- CRIAR POLÍTICAS DE ACESSO (Usuário só vê/edita o que é dele)

-- Políticas para asset_classes
CREATE POLICY "Users can manage their own asset classes" ON public.asset_classes
FOR ALL USING (auth.uid() = user_id);

-- Políticas para institutions
CREATE POLICY "Users can manage their own institutions" ON public.institutions
FOR ALL USING (auth.uid() = user_id);

-- Políticas para goals
CREATE POLICY "Users can manage their own goals" ON public.goals
FOR ALL USING (auth.uid() = user_id);

-- Políticas para investments
CREATE POLICY "Users can manage their own investments" ON public.investments
FOR ALL USING (auth.uid() = user_id);

-- Políticas para user_config
CREATE POLICY "Users can manage their own config" ON public.user_config
FOR ALL USING (auth.uid() = user_id);

-- Políticas para ai_insights
CREATE POLICY "Users can manage their own insights" ON public.ai_insights
FOR ALL USING (auth.uid() = user_id);
