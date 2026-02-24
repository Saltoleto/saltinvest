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
