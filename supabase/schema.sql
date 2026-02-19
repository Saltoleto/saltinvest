-- =========================================================
--  Gestão Centralizada de Investimentos (Business Naming)
--  Supabase / PostgreSQL
--  - Usuário vê: Objetivos, Aplicações, Aportes, Plano Mensal
--  - "Parcelas do objetivo" existem apenas para modelagem interna
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
--  ENUMs (Business)
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'liquidez_aplicacao') then
    create type public.liquidez_aplicacao as enum ('DIARIA', 'NO_VENCIMENTO');
  end if;

  if not exists (select 1 from pg_type where typname = 'status_aplicacao') then
    create type public.status_aplicacao as enum ('ATIVA', 'RESGATADA');
  end if;

  if not exists (select 1 from pg_type where typname = 'status_parcela_objetivo') then
    create type public.status_parcela_objetivo as enum ('ABERTA', 'ATINGIDA');
  end if;
end$$;

-- =========================================================
--  Cadastros
-- =========================================================

-- Categorias de ativos (classe de investimento)
create table if not exists public.categorias_ativos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, nome)
);

-- Instituições financeiras
create table if not exists public.instituicoes_financeiras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, nome)
);

-- Política de alocação (alvo da carteira)
create table if not exists public.politicas_alocacao (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default 'Política Principal',
  criado_em timestamptz not null default now(),
  unique (usuario_id, nome)
);

-- Itens da política (categoria + percentual)
create table if not exists public.politicas_alocacao_itens (
  id uuid primary key default gen_random_uuid(),
  politica_alocacao_id uuid not null references public.politicas_alocacao(id) on delete cascade,
  categoria_ativo_id uuid not null references public.categorias_ativos(id) on delete restrict,
  percentual_alvo numeric(6,3) not null check (percentual_alvo > 0 and percentual_alvo <= 100),
  criado_em timestamptz not null default now(),
  unique (politica_alocacao_id, categoria_ativo_id)
);

create index if not exists idx_politicas_itens_politica on public.politicas_alocacao_itens(politica_alocacao_id);

-- Trigger: soma <= 100
create or replace function public.fn_politica_validar_soma_percentual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  soma_atual numeric;
begin
  select coalesce(sum(percentual_alvo), 0)
    into soma_atual
  from public.politicas_alocacao_itens
  where politica_alocacao_id = new.politica_alocacao_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  soma_atual := soma_atual + new.percentual_alvo;

  if soma_atual > 100 then
    raise exception 'Soma dos percentuais da política excede 100%% (atual: %).', soma_atual;
  end if;

  return new;
end$$;

drop trigger if exists tg_politica_validar_soma_percentual on public.politicas_alocacao_itens;
create trigger tg_politica_validar_soma_percentual
before insert or update on public.politicas_alocacao_itens
for each row execute function public.fn_politica_validar_soma_percentual();

-- =========================================================
--  Objetivos (Metas) - não pode editar, só criar/excluir
-- =========================================================
create table if not exists public.objetivos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,

  nome text not null,
  valor_alvo numeric(14,2) not null check (valor_alvo > 0),

  data_inicio date not null,
  data_alvo date not null,

  participa_plano_mensal boolean not null default true,

  criado_em timestamptz not null default now(),
  check (data_alvo >= data_inicio)
);

create or replace function public.fn_objetivos_bloquear_edicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Não é permitido editar objetivos. Apenas cadastrar ou excluir.';
  return new;
end$$;

drop trigger if exists tg_objetivos_bloquear_edicao on public.objetivos;
create trigger tg_objetivos_bloquear_edicao
before update on public.objetivos
for each row execute function public.fn_objetivos_bloquear_edicao();

-- =========================================================
--  Parcelas do Objetivo (modelagem interna)
-- =========================================================
create table if not exists public.parcelas_objetivo (
  id uuid primary key default gen_random_uuid(),
  objetivo_id uuid not null references public.objetivos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,

  mes_referencia date not null, -- 1º dia do mês
  valor_planejado numeric(14,2) not null check (valor_planejado >= 0),

  status public.status_parcela_objetivo not null default 'ABERTA',
  criado_em timestamptz not null default now(),

  unique (objetivo_id, mes_referencia)
);

create index if not exists idx_parcelas_objetivo_usuario_mes on public.parcelas_objetivo(usuario_id, mes_referencia);
create index if not exists idx_parcelas_objetivo_objetivo on public.parcelas_objetivo(objetivo_id);

-- Meses inclusivos (por mês)
create or replace function public.fn_periodo_meses_inclusivo(p_inicio date, p_fim date)
returns int
language sql
immutable
as $$
  select (
    (date_part('year', p_fim)::int * 12 + date_part('month', p_fim)::int) -
    (date_part('year', p_inicio)::int * 12 + date_part('month', p_inicio)::int)
  ) + 1
$$;

-- Geração automática de parcelas
-- (SECURITY DEFINER para funcionar com RLS sem precisar liberar INSERT em parcelas_objetivo)
create or replace function public.fn_objetivos_gerar_parcelas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  qtd_meses int;
  base numeric(14,10);
  soma numeric(14,2) := 0;
  i int;
  mes date;
  valor numeric(14,2);
begin
  qtd_meses := public.fn_periodo_meses_inclusivo(
    date_trunc('month', new.data_inicio)::date,
    date_trunc('month', new.data_alvo)::date
  );

  if qtd_meses <= 0 then
    raise exception 'Período inválido para gerar parcelas do objetivo.';
  end if;

  base := (new.valor_alvo / qtd_meses);

  for i in 0..(qtd_meses - 1) loop
    mes := (date_trunc('month', new.data_inicio)::date + (i || ' months')::interval)::date;

    if i < (qtd_meses - 1) then
      valor := round(base::numeric, 2);
      soma := soma + valor;
    else
      valor := round((new.valor_alvo - soma)::numeric, 2);
      if valor < 0 then valor := 0; end if;
    end if;

    insert into public.parcelas_objetivo (objetivo_id, usuario_id, mes_referencia, valor_planejado, status)
    values (new.id, new.usuario_id, mes, valor, 'ABERTA');
  end loop;

  return new;
end$$;

drop trigger if exists tg_objetivos_gerar_parcelas on public.objetivos;
create trigger tg_objetivos_gerar_parcelas
after insert on public.objetivos
for each row execute function public.fn_objetivos_gerar_parcelas();

-- =========================================================
--  Aplicações (Investimentos)
-- =========================================================
create table if not exists public.aplicacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,

  nome text not null,

  categoria_ativo_id uuid not null references public.categorias_ativos(id) on delete restrict,
  instituicao_financeira_id uuid references public.instituicoes_financeiras(id) on delete set null,

  valor_aplicado numeric(14,2) not null check (valor_aplicado > 0),

  liquidez public.liquidez_aplicacao not null default 'DIARIA',
  data_vencimento date null,

  coberto_fgc boolean not null default false,

  status public.status_aplicacao not null default 'ATIVA',

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  check (
    (liquidez = 'NO_VENCIMENTO' and data_vencimento is not null)
    or
    (liquidez = 'DIARIA')
  )
);

create index if not exists idx_aplicacoes_usuario_status on public.aplicacoes(usuario_id, status);
create index if not exists idx_aplicacoes_usuario_vencimento on public.aplicacoes(usuario_id, data_vencimento);

create or replace function public.fn_touch_atualizado_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end$$;

drop trigger if exists tg_touch_aplicacoes on public.aplicacoes;
create trigger tg_touch_aplicacoes
before update on public.aplicacoes
for each row execute function public.fn_touch_atualizado_em();

-- =========================================================
--  Aportes (alocação do valor aplicado em objetivos/parcelas)
--  (CORRIGIDO: removido CHECK com subquery; substituído por trigger)
-- =========================================================

-- Caso você tenha tentado rodar antes e criado parcialmente:
alter table if exists public.aportes
drop constraint if exists ck_parcela_objetivo_consistente;

create table if not exists public.aportes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,

  aplicacao_id uuid not null references public.aplicacoes(id) on delete cascade,
  objetivo_id uuid not null references public.objetivos(id) on delete cascade,
  parcela_objetivo_id uuid references public.parcelas_objetivo(id) on delete set null,

  valor_aporte numeric(14,2) not null check (valor_aporte > 0),

  aportado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create index if not exists idx_aportes_usuario_data on public.aportes(usuario_id, aportado_em);
create index if not exists idx_aportes_aplicacao on public.aportes(aplicacao_id);
create index if not exists idx_aportes_objetivo on public.aportes(objetivo_id);
create index if not exists idx_aportes_parcela on public.aportes(parcela_objetivo_id);

-- Validações: ownership + parcela pertence ao objetivo informado
create or replace function public.fn_aportes_validar_consistencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- aplicação pertence ao usuário
  perform 1
  from public.aplicacoes ap
  where ap.id = new.aplicacao_id and ap.usuario_id = new.usuario_id;

  if not found then
    raise exception 'Aplicação inválida ou não pertence ao usuário.';
  end if;

  -- objetivo pertence ao usuário
  perform 1
  from public.objetivos o
  where o.id = new.objetivo_id and o.usuario_id = new.usuario_id;

  if not found then
    raise exception 'Objetivo inválido ou não pertence ao usuário.';
  end if;

  -- parcela (se informada) deve pertencer ao mesmo objetivo e ao mesmo usuário
  if new.parcela_objetivo_id is not null then
    perform 1
    from public.parcelas_objetivo po
    where po.id = new.parcela_objetivo_id
      and po.usuario_id = new.usuario_id
      and po.objetivo_id = new.objetivo_id;

    if not found then
      raise exception 'Parcela inválida (não pertence ao objetivo/usuário informado).';
    end if;
  end if;

  return new;
end$$;

drop trigger if exists tg_aportes_validar_consistencia on public.aportes;
create trigger tg_aportes_validar_consistencia
before insert or update on public.aportes
for each row execute function public.fn_aportes_validar_consistencia();

-- Regra: soma dos aportes da aplicação <= valor_aplicado
create or replace function public.fn_aportes_validar_soma_por_aplicacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor_aplicado numeric(14,2);
  v_soma numeric(14,2);
begin
  select valor_aplicado into v_valor_aplicado
  from public.aplicacoes
  where id = new.aplicacao_id and usuario_id = new.usuario_id;

  if v_valor_aplicado is null then
    raise exception 'Aplicação não encontrada ou sem permissão.';
  end if;

  select coalesce(sum(valor_aporte), 0)
    into v_soma
  from public.aportes
  where aplicacao_id = new.aplicacao_id
    and usuario_id = new.usuario_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_soma := v_soma + new.valor_aporte;

  if v_soma > v_valor_aplicado then
    raise exception 'Soma dos aportes (%) excede o valor aplicado (%).', v_soma, v_valor_aplicado;
  end if;

  return new;
end$$;

drop trigger if exists tg_aportes_validar_soma_por_aplicacao on public.aportes;
create trigger tg_aportes_validar_soma_por_aplicacao
before insert or update on public.aportes
for each row execute function public.fn_aportes_validar_soma_por_aplicacao();

-- Atualiza status da parcela (atingida se pago >= planejado)
create or replace function public.fn_parcelas_atualizar_status(p_parcela_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  planejado numeric(14,2);
  pago numeric(14,2);
begin
  select valor_planejado into planejado
  from public.parcelas_objetivo
  where id = p_parcela_id;

  if planejado is null then
    return;
  end if;

  select coalesce(sum(valor_aporte), 0) into pago
  from public.aportes
  where parcela_objetivo_id = p_parcela_id;

  update public.parcelas_objetivo
     set status = case
       when pago >= planejado then 'ATINGIDA'::public.status_parcela_objetivo
       else 'ABERTA'::public.status_parcela_objetivo
     end
   where id = p_parcela_id;
end$$;

create or replace function public.fn_tg_parcelas_atualizar_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.parcela_objetivo_id is not null then
      perform public.fn_parcelas_atualizar_status(new.parcela_objetivo_id);
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    if old.parcela_objetivo_id is not null then
      perform public.fn_parcelas_atualizar_status(old.parcela_objetivo_id);
    end if;
    if new.parcela_objetivo_id is not null then
      perform public.fn_parcelas_atualizar_status(new.parcela_objetivo_id);
    end if;
    return new;

  else
    if old.parcela_objetivo_id is not null then
      perform public.fn_parcelas_atualizar_status(old.parcela_objetivo_id);
    end if;
    return old;
  end if;
end$$;

drop trigger if exists tg_parcelas_atualizar_status on public.aportes;
create trigger tg_parcelas_atualizar_status
after insert or update or delete on public.aportes
for each row execute function public.fn_tg_parcelas_atualizar_status();

-- Redistribui diferença (pago - planejado) igualmente nas próximas parcelas ABERTAS
-- (função pronta para uso por RPC/ação do app se você decidir acionar automaticamente)
create or replace function public.fn_parcelas_redistribuir_diferenca(p_parcela_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objetivo_id uuid;
  v_mes date;

  v_planejado numeric(14,2);
  v_pago numeric(14,2);
  v_delta numeric(14,2);

  qtd_proximas int;
  ajuste numeric(14,10);

  r record;
begin
  select objetivo_id, mes_referencia, valor_planejado
    into v_objetivo_id, v_mes, v_planejado
  from public.parcelas_objetivo
  where id = p_parcela_id;

  if v_objetivo_id is null then
    raise exception 'Parcela do objetivo não encontrada.';
  end if;

  select coalesce(sum(valor_aporte), 0) into v_pago
  from public.aportes
  where parcela_objetivo_id = p_parcela_id;

  v_delta := round((v_pago - v_planejado)::numeric, 2);

  if v_delta = 0 then
    perform public.fn_parcelas_atualizar_status(p_parcela_id);
    return;
  end if;

  select count(*) into qtd_proximas
  from public.parcelas_objetivo
  where objetivo_id = v_objetivo_id
    and mes_referencia > v_mes
    and status = 'ABERTA';

  if qtd_proximas = 0 then
    perform public.fn_parcelas_atualizar_status(p_parcela_id);
    return;
  end if;

  ajuste := (v_delta::numeric / qtd_proximas::numeric);

  for r in
    select id, valor_planejado
    from public.parcelas_objetivo
    where objetivo_id = v_objetivo_id
      and mes_referencia > v_mes
      and status = 'ABERTA'
    order by mes_referencia
  loop
    update public.parcelas_objetivo
       set valor_planejado = greatest(0, round((r.valor_planejado - ajuste)::numeric, 2))
     where id = r.id;
  end loop;

  perform public.fn_parcelas_atualizar_status(p_parcela_id);
end$$;

-- =========================================================
--  Resgates (histórico de aplicações)
-- =========================================================
create table if not exists public.resgates_aplicacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,

  aplicacao_id uuid not null references public.aplicacoes(id) on delete cascade,
  resgatado_em timestamptz not null default now(),
  valor_resgatado numeric(14,2) not null check (valor_resgatado > 0),

  criado_em timestamptz not null default now()
);

create index if not exists idx_resgates_aplicacoes_usuario_data on public.resgates_aplicacoes(usuario_id, resgatado_em);

create or replace function public.fn_aplicacoes_resgatar(p_aplicacao_id uuid, p_valor_resgatado numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_liquidez public.liquidez_aplicacao;
  v_vencimento date;
  v_valor numeric(14,2);
  v_status public.status_aplicacao;
begin
  if v_usuario is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select liquidez, data_vencimento, valor_aplicado, status
    into v_liquidez, v_vencimento, v_valor, v_status
  from public.aplicacoes
  where id = p_aplicacao_id and usuario_id = v_usuario;

  if v_liquidez is null then
    raise exception 'Aplicação não encontrada.';
  end if;

  if v_status = 'RESGATADA' then
    raise exception 'Aplicação já resgatada.';
  end if;

  if p_valor_resgatado is null or p_valor_resgatado <= 0 then
    raise exception 'Valor de resgate inválido.';
  end if;

  if p_valor_resgatado > v_valor then
    raise exception 'Valor resgatado não pode ser maior que o valor aplicado.';
  end if;

  if v_liquidez = 'NO_VENCIMENTO' then
    if v_vencimento is null then
      raise exception 'Aplicação sem data de vencimento.';
    end if;
    if v_vencimento > current_date then
      raise exception 'Resgate permitido apenas no vencimento (%).', v_vencimento;
    end if;
  end if;

  insert into public.resgates_aplicacoes(usuario_id, aplicacao_id, valor_resgatado)
  values (v_usuario, p_aplicacao_id, p_valor_resgatado);

  update public.aplicacoes
     set status = 'RESGATADA'
   where id = p_aplicacao_id and usuario_id = v_usuario;
end$$;

-- =========================================================
--  Views (Plano Mensal / Progresso / Histórico)
-- =========================================================

-- Parcelas com total pago
create or replace view public.v_parcelas_objetivo_com_pago as
select
  po.*,
  coalesce(sum(a.valor_aporte), 0)::numeric(14,2) as valor_pago
from public.parcelas_objetivo po
left join public.aportes a on a.parcela_objetivo_id = po.id
group by po.id;

-- Resumo do plano mensal (totais por mês)
create or replace view public.v_plano_mensal_resumo as
select
  o.usuario_id,
  po.mes_referencia,
  sum(case when o.participa_plano_mensal then po.valor_planejado else 0 end)::numeric(14,2) as valor_total_sugerido,
  sum(case when o.participa_plano_mensal then coalesce(p.valor_pago,0) else 0 end)::numeric(14,2) as valor_total_aportado,
  (sum(case when o.participa_plano_mensal then po.valor_planejado else 0 end) -
   sum(case when o.participa_plano_mensal then coalesce(p.valor_pago,0) else 0 end)
  )::numeric(14,2) as valor_total_restante
from public.objetivos o
join public.v_parcelas_objetivo_com_pago p on p.objetivo_id = o.id
join public.parcelas_objetivo po on po.id = p.id
group by o.usuario_id, po.mes_referencia;

-- Detalhe do plano mensal (parcelas + atraso)
create or replace view public.v_plano_mensal_detalhe as
select
  o.usuario_id,
  o.id as objetivo_id,
  o.nome as objetivo_nome,
  o.participa_plano_mensal,
  p.mes_referencia,
  p.valor_planejado,
  p.valor_pago,
  p.status,
  (p.mes_referencia < date_trunc('month', current_date)::date and p.status = 'ABERTA') as em_atraso
from public.objetivos o
join public.v_parcelas_objetivo_com_pago p on p.objetivo_id = o.id;

-- Progresso do objetivo (% parcelas atingidas)
create or replace view public.v_objetivos_progresso as
select
  o.usuario_id,
  o.id as objetivo_id,
  o.nome,
  count(*) filter (where po.status = 'ATINGIDA') as parcelas_atingidas,
  count(*) as parcelas_total,
  case when count(*) = 0 then 0
       else round((count(*) filter (where po.status = 'ATINGIDA')::numeric / count(*)::numeric) * 100, 2)
  end as percentual_atingimento
from public.objetivos o
join public.parcelas_objetivo po on po.objetivo_id = o.id
group by o.usuario_id, o.id, o.nome;

-- Histórico de aportes por objetivo
create or replace view public.v_objetivos_aportes_historico as
select
  a.usuario_id,
  a.objetivo_id,
  o.nome as objetivo_nome,
  a.parcela_objetivo_id,
  po.mes_referencia,
  a.aplicacao_id,
  ap.nome as aplicacao_nome,
  a.valor_aporte,
  a.aportado_em
from public.aportes a
join public.objetivos o on o.id = a.objetivo_id
left join public.parcelas_objetivo po on po.id = a.parcela_objetivo_id
join public.aplicacoes ap on ap.id = a.aplicacao_id;

-- =========================================================
--  RLS (padrão: usuario_id = auth.uid())
-- =========================================================
alter table public.categorias_ativos enable row level security;
alter table public.instituicoes_financeiras enable row level security;
alter table public.politicas_alocacao enable row level security;
alter table public.politicas_alocacao_itens enable row level security;
alter table public.objetivos enable row level security;
alter table public.parcelas_objetivo enable row level security;
alter table public.aplicacoes enable row level security;
alter table public.aportes enable row level security;
alter table public.resgates_aplicacoes enable row level security;

-- categorias_ativos
drop policy if exists "categorias_select_proprio" on public.categorias_ativos;
create policy "categorias_select_proprio" on public.categorias_ativos for select
using (usuario_id = auth.uid());

drop policy if exists "categorias_insert_proprio" on public.categorias_ativos;
create policy "categorias_insert_proprio" on public.categorias_ativos for insert
with check (usuario_id = auth.uid());

drop policy if exists "categorias_update_proprio" on public.categorias_ativos;
create policy "categorias_update_proprio" on public.categorias_ativos for update
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "categorias_delete_proprio" on public.categorias_ativos;
create policy "categorias_delete_proprio" on public.categorias_ativos for delete
using (usuario_id = auth.uid());

-- instituicoes_financeiras
drop policy if exists "inst_fin_select_proprio" on public.instituicoes_financeiras;
create policy "inst_fin_select_proprio" on public.instituicoes_financeiras for select
using (usuario_id = auth.uid());

drop policy if exists "inst_fin_insert_proprio" on public.instituicoes_financeiras;
create policy "inst_fin_insert_proprio" on public.instituicoes_financeiras for insert
with check (usuario_id = auth.uid());

drop policy if exists "inst_fin_update_proprio" on public.instituicoes_financeiras;
create policy "inst_fin_update_proprio" on public.instituicoes_financeiras for update
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "inst_fin_delete_proprio" on public.instituicoes_financeiras;
create policy "inst_fin_delete_proprio" on public.instituicoes_financeiras for delete
using (usuario_id = auth.uid());

-- politicas_alocacao
drop policy if exists "pol_select_proprio" on public.politicas_alocacao;
create policy "pol_select_proprio" on public.politicas_alocacao for select
using (usuario_id = auth.uid());

drop policy if exists "pol_insert_proprio" on public.politicas_alocacao;
create policy "pol_insert_proprio" on public.politicas_alocacao for insert
with check (usuario_id = auth.uid());

drop policy if exists "pol_update_proprio" on public.politicas_alocacao;
create policy "pol_update_proprio" on public.politicas_alocacao for update
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "pol_delete_proprio" on public.politicas_alocacao;
create policy "pol_delete_proprio" on public.politicas_alocacao for delete
using (usuario_id = auth.uid());

-- politicas_alocacao_itens (ownership via política)
drop policy if exists "pol_itens_select_proprio" on public.politicas_alocacao_itens;
create policy "pol_itens_select_proprio" on public.politicas_alocacao_itens for select
using (
  exists (
    select 1 from public.politicas_alocacao p
    where p.id = politica_alocacao_id and p.usuario_id = auth.uid()
  )
);

drop policy if exists "pol_itens_insert_proprio" on public.politicas_alocacao_itens;
create policy "pol_itens_insert_proprio" on public.politicas_alocacao_itens for insert
with check (
  exists (
    select 1 from public.politicas_alocacao p
    where p.id = politica_alocacao_id and p.usuario_id = auth.uid()
  )
);

drop policy if exists "pol_itens_update_proprio" on public.politicas_alocacao_itens;
create policy "pol_itens_update_proprio" on public.politicas_alocacao_itens for update
using (
  exists (
    select 1 from public.politicas_alocacao p
    where p.id = politica_alocacao_id and p.usuario_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.politicas_alocacao p
    where p.id = politica_alocacao_id and p.usuario_id = auth.uid()
  )
);

drop policy if exists "pol_itens_delete_proprio" on public.politicas_alocacao_itens;
create policy "pol_itens_delete_proprio" on public.politicas_alocacao_itens for delete
using (
  exists (
    select 1 from public.politicas_alocacao p
    where p.id = politica_alocacao_id and p.usuario_id = auth.uid()
  )
);

-- objetivos
drop policy if exists "obj_select_proprio" on public.objetivos;
create policy "obj_select_proprio" on public.objetivos for select
using (usuario_id = auth.uid());

drop policy if exists "obj_insert_proprio" on public.objetivos;
create policy "obj_insert_proprio" on public.objetivos for insert
with check (usuario_id = auth.uid());

drop policy if exists "obj_delete_proprio" on public.objetivos;
create policy "obj_delete_proprio" on public.objetivos for delete
using (usuario_id = auth.uid());

-- parcelas_objetivo (permite select/update; insert é feito pela trigger security definer)
drop policy if exists "parc_select_proprio" on public.parcelas_objetivo;
create policy "parc_select_proprio" on public.parcelas_objetivo for select
using (usuario_id = auth.uid());

drop policy if exists "parc_update_proprio" on public.parcelas_objetivo;
create policy "parc_update_proprio" on public.parcelas_objetivo for update
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- aplicacoes
drop policy if exists "apl_select_proprio" on public.aplicacoes;
create policy "apl_select_proprio" on public.aplicacoes for select
using (usuario_id = auth.uid());

drop policy if exists "apl_insert_proprio" on public.aplicacoes;
create policy "apl_insert_proprio" on public.aplicacoes for insert
with check (usuario_id = auth.uid());

drop policy if exists "apl_update_proprio" on public.aplicacoes;
create policy "apl_update_proprio" on public.aplicacoes for update
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "apl_delete_proprio" on public.aplicacoes;
create policy "apl_delete_proprio" on public.aplicacoes for delete
using (usuario_id = auth.uid());

-- aportes
drop policy if exists "aportes_select_proprio" on public.aportes;
create policy "aportes_select_proprio" on public.aportes for select
using (usuario_id = auth.uid());

drop policy if exists "aportes_insert_proprio" on public.aportes;
create policy "aportes_insert_proprio" on public.aportes for insert
with check (usuario_id = auth.uid());

drop policy if exists "aportes_update_proprio" on public.aportes;
create policy "aportes_update_proprio" on public.aportes for update
using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "aportes_delete_proprio" on public.aportes;
create policy "aportes_delete_proprio" on public.aportes for delete
using (usuario_id = auth.uid());

-- resgates_aplicacoes
drop policy if exists "resg_select_proprio" on public.resgates_aplicacoes;
create policy "resg_select_proprio" on public.resgates_aplicacoes for select
using (usuario_id = auth.uid());

drop policy if exists "resg_insert_proprio" on public.resgates_aplicacoes;
create policy "resg_insert_proprio" on public.resgates_aplicacoes for insert
with check (usuario_id = auth.uid());

