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
