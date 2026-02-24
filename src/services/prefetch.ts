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

export function prefetchCoreAppData() {
  bg(async () => {
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
  bg(async () => {
    await Promise.allSettled([
      getEquitySummary(),
      getMonthlyPlanSummary(),
      listYearGoalProjections(y),
      listInvestments(),
      listYearMonthBreakdown(y),
    ]);
  });
}

export function prefetchExposureData() {
  bg(async () => {
    await Promise.allSettled([getEquitySummary(), listInvestments(), getFgcExposure()]);
  });
}

export function prefetchMonthlyPlanData() {
  bg(async () => {
    await Promise.allSettled([getMonthlyPlanSummary(), listMonthlyPlanGoals()]);
  });
}
