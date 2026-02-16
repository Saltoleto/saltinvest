-- Fix v_goal_progress: evitar required_per_month NULL e months_left=0 no mesmo mês do vencimento
-- Causa do bug observado: cálculo de months_left/divisão pode resultar em 0 e required_per_month NULL
-- (o frontend acabava convertendo NULL para 0 e marcando "Objetivo do mês atingido" indevidamente).

DROP VIEW IF EXISTS public.v_goal_progress;
CREATE VIEW public.v_goal_progress WITH (security_invoker = true) AS
WITH
  alloc_sum AS (
    SELECT
      ia.user_id,
      ia.goal_id,
      COALESCE(SUM(ia.amount), 0)::numeric AS invested_amount
    FROM public.investment_allocations ia
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
      GREATEST((g.target - COALESCE(a.invested_amount, 0))::numeric, 0)::numeric AS remaining_amount
    FROM public.goals g
    LEFT JOIN alloc_sum a
      ON a.user_id = g.user_id
     AND a.goal_id = g.id
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
  ml.months_left,
  CASE
    WHEN b.due_date IS NULL THEN NULL::numeric
    WHEN b.remaining_amount <= 0 THEN 0::numeric
    WHEN b.due_date < CURRENT_DATE THEN ROUND(b.remaining_amount, 2)
    ELSE ROUND(b.remaining_amount / NULLIF(ml.months_left, 0), 2)
  END AS required_per_month,
  CASE
    WHEN b.target = 0 THEN 0::numeric
    ELSE ROUND(((b.invested_amount / b.target) * 100)::numeric, 2)
  END AS progress_percent,
  'Ativa'::text AS status
FROM base b
CROSS JOIN LATERAL (
  SELECT
    CASE
      WHEN b.due_date IS NULL THEN NULL::int
      WHEN b.remaining_amount <= 0 THEN 0::int
      WHEN b.due_date < CURRENT_DATE THEN 0::int
      ELSE GREATEST(
        (
          (EXTRACT(YEAR FROM age(date_trunc('month', b.due_date), date_trunc('month', CURRENT_DATE)))::int * 12)
          + (EXTRACT(MONTH FROM age(date_trunc('month', b.due_date), date_trunc('month', CURRENT_DATE)))::int)
        ) + 1,
        1
      )::int
    END AS months_left
) ml;
