-- =============================================================================
-- SALTINVEST - ESQUEMA DEFINITIVO (v3.2 FINAL)
-- Supabase / PostgreSQL
--
-- Principais garantias:
--  - Submetas (parcelas) geradas automaticamente (meses inclusivos + ajuste de centavos)
--  - Aportes distribuídos em cascata nas submetas ABERTAS
--  - Cada parcela impactada gera UMA linha em alocacoes_investimento (rastreabilidade total)
--  - Excluir investimento estorna automaticamente tudo o que ele fez
--  - Atualizar investimento (re-salvar) estorna e recria alocações via RPC
--  - RLS: cada usuário só acessa seus próprios dados
-- =============================================================================

-- 0) EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1) TABELAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.classes_investimento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, nome)
);

CREATE TABLE IF NOT EXISTS public.instituicoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, nome)
);

CREATE TABLE IF NOT EXISTS public.alvos_carteira (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  classe_id UUID REFERENCES public.classes_investimento(id) ON DELETE CASCADE,
  percentual_alvo DECIMAL(5,2) NOT NULL CHECK (percentual_alvo >= 0 AND percentual_alvo <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, classe_id)
);

CREATE TABLE IF NOT EXISTS public.metas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nome TEXT NOT NULL,
  valor_alvo DECIMAL(15,2) NOT NULL CHECK (valor_alvo > 0),
  data_inicio DATE NOT NULL,
  data_alvo DATE NOT NULL,
  is_plano_mensal BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'CONCLUIDA')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT dates_check CHECK (data_alvo > data_inicio)
);

CREATE TABLE IF NOT EXISTS public.submetas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  meta_id UUID REFERENCES public.metas(id) ON DELETE CASCADE,
  data_referencia DATE NOT NULL,
  valor_esperado DECIMAL(15,2) NOT NULL CHECK (valor_esperado >= 0),
  valor_aportado DECIMAL(15,2) DEFAULT 0 CHECK (valor_aportado >= 0),
  status TEXT DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'APORTADA', 'BAIXADA')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meta_id, data_referencia)
);

CREATE TABLE IF NOT EXISTS public.investimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  nome TEXT NOT NULL,
  classe_id UUID REFERENCES public.classes_investimento(id),
  instituicao_id UUID REFERENCES public.instituicoes(id),
  valor_total DECIMAL(15,2) NOT NULL CHECK (valor_total > 0),
  data_vencimento DATE,
  liquidez TEXT,
  coberto_fgc BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'RESGATADO')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alocacoes_investimento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  investimento_id UUID REFERENCES public.investimentos(id) ON DELETE CASCADE,
  submeta_id UUID REFERENCES public.submetas(id) ON DELETE CASCADE,
  valor_alocado DECIMAL(15,2) NOT NULL CHECK (valor_alocado > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2) ÍNDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_submetas_meta_status ON public.submetas(meta_id, status);
CREATE INDEX IF NOT EXISTS idx_submetas_data ON public.submetas(data_referencia);
CREATE INDEX IF NOT EXISTS idx_invest_user ON public.investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_invest ON public.alocacoes_investimento(investimento_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_submeta ON public.alocacoes_investimento(submeta_id);

-- =============================================================================
-- 3) AUTOMAÇÕES (FUNCTIONS & TRIGGERS)
-- =============================================================================

-- Limpeza idempotente de triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_pos_meta_insert') THEN
    DROP TRIGGER trg_pos_meta_insert ON public.metas;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_meta_update') THEN
    DROP TRIGGER trg_prevent_meta_update ON public.metas;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_before_investimento_delete_estorno') THEN
    DROP TRIGGER trg_before_investimento_delete_estorno ON public.investimentos;
  END IF;
END $$;

-- A) Gerador de submetas (meses inclusivos + ajuste de centavos)
CREATE OR REPLACE FUNCTION public.fn_gerar_submetas()
RETURNS TRIGGER AS $$
DECLARE
  meses_count INT;
  valor_parcela NUMERIC(15,2);
  soma_parcelas NUMERIC(15,2) := 0;
  current_month DATE;
BEGIN
  meses_count :=
      (EXTRACT(year FROM age(NEW.data_alvo, NEW.data_inicio))::int * 12)
    + (EXTRACT(month FROM age(NEW.data_alvo, NEW.data_inicio))::int)
    + 1;

  IF meses_count <= 0 THEN
    meses_count := 1;
  END IF;

  valor_parcela := round(NEW.valor_alvo / meses_count, 2);
  current_month := date_trunc('month', NEW.data_inicio)::date;

  FOR i IN 1..meses_count LOOP
    IF i = meses_count THEN
      INSERT INTO public.submetas (user_id, meta_id, data_referencia, valor_esperado)
      VALUES (NEW.user_id, NEW.id, current_month, round(NEW.valor_alvo - soma_parcelas, 2));
    ELSE
      INSERT INTO public.submetas (user_id, meta_id, data_referencia, valor_esperado)
      VALUES (NEW.user_id, NEW.id, current_month, valor_parcela);
      soma_parcelas := soma_parcelas + valor_parcela;
    END IF;

    current_month := (current_month + INTERVAL '1 month')::date;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pos_meta_insert
AFTER INSERT ON public.metas
FOR EACH ROW EXECUTE FUNCTION public.fn_gerar_submetas();

-- B) Lock de edição de meta (permite apenas mudar status)
CREATE OR REPLACE FUNCTION public.fn_lock_meta_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.nome <> NEW.nome OR OLD.valor_alvo <> NEW.valor_alvo OR OLD.data_inicio <> NEW.data_inicio OR OLD.data_alvo <> NEW.data_alvo OR OLD.is_plano_mensal <> NEW.is_plano_mensal) THEN
    RAISE EXCEPTION 'Não é permitido editar uma meta. Exclua e crie uma nova para manter a integridade.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_meta_update
BEFORE UPDATE ON public.metas
FOR EACH ROW EXECUTE FUNCTION public.fn_lock_meta_update();

-- C) RPC: distribuir aporte em submetas e criar alocações por submeta (rastreabilidade)
CREATE OR REPLACE FUNCTION public.fn_alocar_investimento_meta(
  p_investimento_id UUID,
  p_meta_id UUID,
  p_valor NUMERIC(15,2),
  p_partir_de DATE DEFAULT NULL
)
RETURNS TABLE (
  submeta_id UUID,
  data_referencia DATE,
  valor_aplicado NUMERIC(15,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user UUID;
  v_valor_invest NUMERIC(15,2);
  v_total_alocado NUMERIC(15,2);
  v_remaining NUMERIC(15,2);
  v_start DATE;
  r RECORD;
  v_need NUMERIC(15,2);
  v_apply NUMERIC(15,2);
  v_meta_alvo NUMERIC(15,2);
  v_total_aportado_meta NUMERIC(15,2);
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor para alocar deve ser maior que zero';
  END IF;

  -- valida investimento e ownership
  SELECT valor_total INTO v_valor_invest
  FROM public.investimentos
  WHERE id = p_investimento_id AND s.user_id = v_user;

  IF v_valor_invest IS NULL THEN
    RAISE EXCEPTION 'Investimento não encontrado ou sem permissão';
  END IF;

  -- valida meta e ownership
  PERFORM 1 FROM public.metas WHERE id = p_meta_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meta não encontrada ou sem permissão';
  END IF;

  -- valida saldo disponível do investimento (somatório de alocações)
  SELECT COALESCE(SUM(valor_alocado), 0) INTO v_total_alocado
  FROM public.alocacoes_investimento
  WHERE investimento_id = p_investimento_id AND user_id = v_user;

  IF (v_total_alocado + p_valor) > v_valor_invest THEN
    RAISE EXCEPTION 'Saldo insuficiente no investimento. Já alocado: %, total: %', v_total_alocado, v_valor_invest;
  END IF;

  v_remaining := p_valor;
  v_start := COALESCE(p_partir_de, date_trunc('month', now())::date);

  FOR r IN
    SELECT s.id, s.data_referencia, s.valor_esperado, s.valor_aportado
    FROM public.submetas s
    WHERE s.meta_id = p_meta_id
      AND user_id = v_user
      AND s.status = 'ABERTA'
      AND s.data_referencia >= v_start
    ORDER BY s.data_referencia
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_need := GREATEST(0, COALESCE(r.valor_esperado, 0) - COALESCE(r.valor_aportado, 0));
    IF v_need <= 0 THEN
      UPDATE public.submetas SET status = 'APORTADA'
      WHERE id = r.id AND user_id = v_user;
      CONTINUE;
    END IF;

    v_apply := LEAST(v_remaining, v_need);

    UPDATE public.submetas
    SET valor_aportado = COALESCE(valor_aportado, 0) + v_apply,
        status = CASE
          WHEN (COALESCE(valor_aportado, 0) + v_apply) >= valor_esperado THEN 'APORTADA'
          ELSE 'ABERTA'
        END
    WHERE id = r.id AND user_id = v_user;

    INSERT INTO public.alocacoes_investimento (user_id, investimento_id, submeta_id, valor_alocado)
    VALUES (v_user, p_investimento_id, r.id, v_apply);

    submeta_id := r.id;
    data_referencia := r.data_referencia;
    valor_aplicado := v_apply;
    RETURN NEXT;

    v_remaining := v_remaining - v_apply;
  END LOOP;

  -- excedente: aplica na última submeta do plano (mantém valor_esperado intacto)
  IF v_remaining > 0 THEN
    SELECT s.id, s.data_referencia INTO r
    FROM public.submetas s
    WHERE s.meta_id = p_meta_id AND s.user_id = v_user
    ORDER BY s.data_referencia DESC
    LIMIT 1;

    IF r.id IS NOT NULL THEN
      UPDATE public.submetas
      SET valor_aportado = COALESCE(valor_aportado, 0) + v_remaining,
          status = 'APORTADA'
      WHERE id = r.id AND user_id = v_user;

      INSERT INTO public.alocacoes_investimento (user_id, investimento_id, submeta_id, valor_alocado)
      VALUES (v_user, p_investimento_id, r.id, v_remaining);

      submeta_id := r.id;
      data_referencia := r.data_referencia;
      valor_aplicado := v_remaining;
      RETURN NEXT;

      v_remaining := 0;
    END IF;
  END IF;

  -- atualiza status da meta
  SELECT valor_alvo INTO v_meta_alvo
  FROM public.metas
  WHERE id = p_meta_id AND user_id = v_user;

  SELECT COALESCE(SUM(valor_aportado), 0) INTO v_total_aportado_meta
  FROM public.submetas
  WHERE meta_id = p_meta_id AND user_id = v_user;

  UPDATE public.metas
  SET status = CASE WHEN v_total_aportado_meta >= v_meta_alvo THEN 'CONCLUIDA' ELSE 'ATIVA' END
  WHERE id = p_meta_id AND user_id = v_user;

END;
$$;

-- D) RPC: resetar alocações de um investimento (estorna e remove linhas) - usado no editar/re-salvar
CREATE OR REPLACE FUNCTION public.fn_reset_investimento_alocacoes(
  p_investimento_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user UUID;
  r RECORD;
  v_meta_id UUID;
  v_meta_alvo NUMERIC(15,2);
  v_total_aportado_meta NUMERIC(15,2);
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- garante ownership do investimento
  PERFORM 1 FROM public.investimentos WHERE id = p_investimento_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investimento não encontrado ou sem permissão';
  END IF;

  FOR r IN
    SELECT a.submeta_id, a.valor_alocado, s.meta_id
    FROM public.alocacoes_investimento a
    JOIN public.submetas s ON s.id = a.submeta_id
    WHERE a.investimento_id = p_investimento_id
      AND a.user_id = v_user
  LOOP
    UPDATE public.submetas
    SET valor_aportado = GREATEST(0, COALESCE(valor_aportado, 0) - COALESCE(r.valor_alocado, 0))
    WHERE id = r.submeta_id AND user_id = v_user;

    UPDATE public.submetas
    SET status = CASE
      WHEN COALESCE(valor_aportado,0) >= COALESCE(valor_esperado,0) THEN 'APORTADA'
      ELSE 'ABERTA'
    END
    WHERE id = r.submeta_id AND user_id = v_user;

    v_meta_id := r.meta_id;

    -- recalcula status da meta impactada
    SELECT valor_alvo INTO v_meta_alvo FROM public.metas WHERE id = v_meta_id AND user_id = v_user;
    SELECT COALESCE(SUM(valor_aportado),0) INTO v_total_aportado_meta FROM public.submetas WHERE meta_id = v_meta_id AND user_id = v_user;

    UPDATE public.metas
    SET status = CASE WHEN v_total_aportado_meta >= v_meta_alvo THEN 'CONCLUIDA' ELSE 'ATIVA' END
    WHERE id = v_meta_id AND user_id = v_user;
  END LOOP;

  DELETE FROM public.alocacoes_investimento
  WHERE investimento_id = p_investimento_id AND user_id = v_user;
END;
$$;

-- E) Estorno automático ao excluir investimento
CREATE OR REPLACE FUNCTION public.fn_estornar_investimento_before_delete()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
  v_meta_id UUID;
  v_meta_alvo NUMERIC(15,2);
  v_total_aportado_meta NUMERIC(15,2);
BEGIN
  -- estorna cada alocação registrada (1 por submeta)
  FOR r IN
    SELECT a.submeta_id, a.valor_alocado, s.meta_id
    FROM public.alocacoes_investimento a
    JOIN public.submetas s ON s.id = a.submeta_id
    WHERE a.investimento_id = OLD.id
      AND a.user_id = OLD.user_id
  LOOP
    UPDATE public.submetas
    SET valor_aportado = GREATEST(0, COALESCE(valor_aportado, 0) - COALESCE(r.valor_alocado, 0))
    WHERE id = r.submeta_id AND user_id = OLD.user_id;

    UPDATE public.submetas
    SET status = CASE
      WHEN COALESCE(valor_aportado,0) >= COALESCE(valor_esperado,0) THEN 'APORTADA'
      ELSE 'ABERTA'
    END
    WHERE id = r.submeta_id AND user_id = OLD.user_id;

    v_meta_id := r.meta_id;

    SELECT valor_alvo INTO v_meta_alvo FROM public.metas WHERE id = v_meta_id AND user_id = OLD.user_id;
    SELECT COALESCE(SUM(valor_aportado),0) INTO v_total_aportado_meta FROM public.submetas WHERE meta_id = v_meta_id AND user_id = OLD.user_id;

    UPDATE public.metas
    SET status = CASE WHEN v_total_aportado_meta >= v_meta_alvo THEN 'CONCLUIDA' ELSE 'ATIVA' END
    WHERE id = v_meta_id AND user_id = OLD.user_id;
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_before_investimento_delete_estorno
BEFORE DELETE ON public.investimentos
FOR EACH ROW
EXECUTE FUNCTION public.fn_estornar_investimento_before_delete();

-- =============================================================================
-- 4) VIEW - PLANEJAMENTO MENSAL
-- =============================================================================

CREATE OR REPLACE VIEW public.vw_planejamento_mensal AS
SELECT
  s.user_id,
  date_trunc('month', s.data_referencia)::date AS mes,
  COALESCE(SUM(s.valor_esperado), 0) AS total_sugerido,
  COALESCE(SUM(s.valor_aportado), 0) AS total_aportado,
  GREATEST(
    0,
    COALESCE(SUM(s.valor_esperado), 0) - COALESCE(SUM(s.valor_aportado), 0)
  ) AS restante_mes
FROM public.submetas s
GROUP BY s.user_id, mes;

-- =============================================================================
-- 5) RLS
-- =============================================================================

-- habilitar rls
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- policies por tabela que tem user_id
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'user_id'
      )
  LOOP
    -- drop (idempotente)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can select own data', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can insert own data', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update own data', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can delete own data', t);

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = user_id)', 'Users can select own data', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', 'Users can insert own data', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', 'Users can update own data', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = user_id)', 'Users can delete own data', t);
  END LOOP;
END $$;

-- ===== Feature: baixa e ajuste de submetas =====
-- =========================================================
-- SaltInvest - Feature de Baixa e Ajuste de Valor de Submeta
-- Supabase / PostgreSQL
-- Cria funções RPC para:
--   1) Baixar submeta do mês de referência com redistribuição
--   2) Ajustar valor da submeta do mês de referência com redistribuição
-- Regras:
--   - Só permite se NÃO existir submeta anterior em ABERTO
--   - Opera apenas sobre a meta do usuário autenticado (auth.uid())
--   - Redistribui apenas entre submetas subsequentes em ABERTO
-- =========================================================

begin;

create extension if not exists pgcrypto;

-- Helper interno: redistribui um delta entre submetas subsequentes abertas.
-- p_delta_para_subsequentes:
--   > 0  => soma nas submetas subsequentes (ex.: baixa)
--   < 0  => reduz das submetas subsequentes (ex.: ajuste para mais)
create or replace function public.fn_redistribuir_delta_submetas_abertas(
  p_user_id uuid,
  p_meta_id uuid,
  p_after_date date,
  p_delta_para_subsequentes numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_vals numeric[];
  v_count int;
  v_delta numeric := round(coalesce(p_delta_para_subsequentes, 0)::numeric, 2);
  v_base numeric;
  v_resid numeric;
  v_new numeric;
  v_idx int;
begin
  if v_delta = 0 then
    return jsonb_build_object('ok', true, 'affected', 0, 'delta', 0);
  end if;

  select
    array_agg(s.id order by s.data_referencia, s.id),
    array_agg(coalesce(s.valor_esperado, 0) order by s.data_referencia, s.id)
  into v_ids, v_vals
  from public.submetas s
  where s.user_id = p_user_id
    and s.meta_id = p_meta_id
    and s.data_referencia > p_after_date
    and coalesce(s.status, 'ABERTA') = 'ABERTA';

  v_count := coalesce(array_length(v_ids, 1), 0);

  if v_count = 0 then
    raise exception 'Não há submetas subsequentes abertas para redistribuir o valor.'
      using errcode = 'P0001';
  end if;

  v_base := trunc((v_delta / v_count)::numeric, 2);
  v_resid := round(v_delta - (v_base * v_count), 2);

  for v_idx in 1..v_count loop
    v_new := round(coalesce(v_vals[v_idx], 0) + v_base + case when v_idx = v_count then v_resid else 0 end, 2);

    if v_new <= 0 then
      raise exception 'A redistribuição deixaria uma submeta subsequente com valor <= 0. Ajuste não permitido.'
        using errcode = 'P0001';
    end if;

    update public.submetas
       set valor_esperado = v_new
     where id = v_ids[v_idx]
       and user_id = p_user_id;
  end loop;

  return jsonb_build_object('ok', true, 'affected', v_count, 'delta', v_delta);
end;
$$;

comment on function public.fn_redistribuir_delta_submetas_abertas(uuid, uuid, date, numeric)
is 'Helper interno para redistribuir delta entre submetas subsequentes abertas.';

create or replace function public.fn_baixar_submeta_meta_mes_referencia(
  p_meta_id uuid,
  p_data_referencia date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ref_date date := coalesce(date_trunc('month', p_data_referencia)::date, date_trunc('month', now())::date);
  v_submeta public.submetas%rowtype;
  v_prev_open_exists boolean;
  v_redist jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = 'P0001';
  end if;

  select s.*
    into v_submeta
  from public.submetas s
  where s.user_id = v_user_id
    and s.meta_id = p_meta_id
    and s.data_referencia = v_ref_date
  limit 1;

  if not found then
    raise exception 'Submeta do mês de referência não encontrada para a meta.' using errcode = 'P0001';
  end if;

  if coalesce(v_submeta.status, 'ABERTA') <> 'ABERTA' then
    raise exception 'A submeta do mês de referência não está ABERTA.' using errcode = 'P0001';
  end if;

  select exists (
    select 1
      from public.submetas s
     where s.user_id = v_user_id
       and s.meta_id = p_meta_id
       and s.data_referencia < v_ref_date
       and coalesce(s.status, 'ABERTA') = 'ABERTA'
  ) into v_prev_open_exists;

  if v_prev_open_exists then
    raise exception 'Existe submeta anterior em ABERTO. Regularize os meses anteriores antes de baixar.' using errcode = 'P0001';
  end if;

  if round(coalesce(v_submeta.valor_esperado, 0), 2) <= 0 then
    raise exception 'Submeta já está zerada ou sem valor para baixar.' using errcode = 'P0001';
  end if;

  v_redist := public.fn_redistribuir_delta_submetas_abertas(
    v_user_id,
    p_meta_id,
    v_ref_date,
    round(coalesce(v_submeta.valor_esperado, 0), 2)
  );

  update public.submetas
     set valor_esperado = 0,
         status = 'BAIXADA'
   where id = v_submeta.id
     and user_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'acao', 'BAIXAR',
    'meta_id', p_meta_id,
    'submeta_id', v_submeta.id,
    'data_referencia', v_ref_date,
    'valor_baixado', round(coalesce(v_submeta.valor_esperado, 0), 2),
    'redistribuicao', v_redist
  );
end;
$$;

comment on function public.fn_baixar_submeta_meta_mes_referencia(uuid, date)
is 'Baixa submeta do mês (zera e marca BAIXADA) redistribuindo o valor entre submetas subsequentes abertas.';

create or replace function public.fn_ajustar_submeta_meta_mes_referencia(
  p_meta_id uuid,
  p_novo_valor numeric,
  p_data_referencia date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_ref_date date := coalesce(date_trunc('month', p_data_referencia)::date, date_trunc('month', now())::date);
  v_submeta public.submetas%rowtype;
  v_prev_open_exists boolean;
  v_novo_valor numeric := round(coalesce(p_novo_valor, 0), 2);
  v_valor_anterior numeric;
  v_delta_para_subsequentes numeric;
  v_redist jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = 'P0001';
  end if;

  if v_novo_valor = 0 then
    raise exception 'Valor novo não pode ser zero. Use a função de baixar.' using errcode = 'P0001';
  end if;

  if v_novo_valor < 0 then
    raise exception 'Valor novo não pode ser negativo.' using errcode = 'P0001';
  end if;

  select s.*
    into v_submeta
  from public.submetas s
  where s.user_id = v_user_id
    and s.meta_id = p_meta_id
    and s.data_referencia = v_ref_date
  limit 1;

  if not found then
    raise exception 'Submeta do mês de referência não encontrada para a meta.' using errcode = 'P0001';
  end if;

  if coalesce(v_submeta.status, 'ABERTA') <> 'ABERTA' then
    raise exception 'A submeta do mês de referência não está ABERTA.' using errcode = 'P0001';
  end if;

  select exists (
    select 1
      from public.submetas s
     where s.user_id = v_user_id
       and s.meta_id = p_meta_id
       and s.data_referencia < v_ref_date
       and coalesce(s.status, 'ABERTA') = 'ABERTA'
  ) into v_prev_open_exists;

  if v_prev_open_exists then
    raise exception 'Existe submeta anterior em ABERTO. Regularize os meses anteriores antes de ajustar.' using errcode = 'P0001';
  end if;

  v_valor_anterior := round(coalesce(v_submeta.valor_esperado, 0), 2);

  if v_valor_anterior = v_novo_valor then
    raise exception 'Novo valor é igual ao valor atual da submeta.' using errcode = 'P0001';
  end if;

  -- Para manter o total da meta:
  -- se a submeta atual aumenta, as próximas precisam reduzir;
  -- se a submeta atual reduz, as próximas precisam aumentar.
  v_delta_para_subsequentes := round(v_valor_anterior - v_novo_valor, 2);

  v_redist := public.fn_redistribuir_delta_submetas_abertas(
    v_user_id,
    p_meta_id,
    v_ref_date,
    v_delta_para_subsequentes
  );

  update public.submetas
     set valor_esperado = v_novo_valor
   where id = v_submeta.id
     and user_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'acao', 'AJUSTAR',
    'meta_id', p_meta_id,
    'submeta_id', v_submeta.id,
    'data_referencia', v_ref_date,
    'valor_anterior', v_valor_anterior,
    'valor_novo', v_novo_valor,
    'delta_para_subsequentes', v_delta_para_subsequentes,
    'redistribuicao', v_redist
  );
end;
$$;

comment on function public.fn_ajustar_submeta_meta_mes_referencia(uuid, numeric, date)
is 'Ajusta valor da submeta do mês e redistribui a diferença nas submetas subsequentes abertas.';

grant execute on function public.fn_redistribuir_delta_submetas_abertas(uuid, uuid, date, numeric) to authenticated;
grant execute on function public.fn_baixar_submeta_meta_mes_referencia(uuid, date) to authenticated;
grant execute on function public.fn_ajustar_submeta_meta_mes_referencia(uuid, numeric, date) to authenticated;

commit;

