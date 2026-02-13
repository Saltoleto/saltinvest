-- SaltInvest - Migração: metas no planejamento mensal + atualização da view de progresso
-- Data: 2026-02-13

-- 1) Coluna para controlar se a meta entra (ou não) no Plano do Mês
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS include_in_plan BOOLEAN NOT NULL DEFAULT true;

-- 2) Atualiza a view do dashboard para expor include_in_plan (e manter cálculos consistentes)
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
  g.include_in_plan,
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

-- Observação:
-- - Caso você já tenha RLS/policies configuradas para goals, esta alteração não muda as políticas.
-- - A view usa security_invoker=true, então respeita RLS do usuário.
