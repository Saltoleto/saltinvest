import { getEquitySummary, getFgcExposure } from "./analytics";
import { listInvestments } from "./investments";
import { getMonthlyPlanSummary, listMonthlyPlanGoals } from "./monthly";
import { listYearGoalProjections, listYearMonthBreakdown } from "./yearly";

/**
 * Warm common caches in background to improve perceived navigation speed.
 * Intentionally fire-and-forget and swallow errors (UX optimization only).
 */
function bg(task: () => Promise<unknown>) {
  task().catch(() => undefined);
}

/**
 * Avoid re-running the same prefetch burst repeatedly in a short interval.
 * This reduces duplicate requests when multiple effects fire close together
 * (login redirect, app shell mount, route transitions, filter changes).
 */
const lastRun = new Map<string, number>();
const PREFETCH_COOLDOWN_MS = 8_000;

function shouldRun(key: string, cooldownMs = PREFETCH_COOLDOWN_MS) {
  const now = Date.now();
  const prev = lastRun.get(key) ?? 0;
  if (now - prev < cooldownMs) return false;
  lastRun.set(key, now);
  return true;
}

function runOnce(key: string, task: () => Promise<unknown>, cooldownMs?: number) {
  if (!shouldRun(key, cooldownMs)) return;
  bg(task);
}

export function prefetchCoreAppData() {
  runOnce("core", async () => {
    const year = new Date().getFullYear();
    await Promise.allSettled([
      getEquitySummary(),
      listInvestments(),
      getMonthlyPlanSummary(),
      listMonthlyPlanGoals(),
      listYearGoalProjections(year),
      listYearMonthBreakdown(year),
      getFgcExposure(),
    ]);
  });
}

export function prefetchDashboardData(year?: number) {
  const y = year ?? new Date().getFullYear();
  runOnce(`dashboard:${y}`, async () => {
    await Promise.allSettled([
      getEquitySummary(),
      getMonthlyPlanSummary(),
      listYearGoalProjections(y),
      listYearMonthBreakdown(y),
      listInvestments(),
    ]);
  }, 4_000);
}

export function prefetchExposureData() {
  runOnce("exposure", async () => {
    await Promise.allSettled([getEquitySummary(), listInvestments(), getFgcExposure()]);
  }, 4_000);
}

export function prefetchMonthlyPlanData() {
  runOnce("monthly-plan", async () => {
    await Promise.allSettled([getMonthlyPlanSummary(), listMonthlyPlanGoals()]);
  }, 4_000);
}
