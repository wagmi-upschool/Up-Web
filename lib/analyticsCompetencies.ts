import type { DashboardSummaryResponse } from "@/lib/dashboardSummary";

export type AnalyticsSummaryResponse = Omit<
  DashboardSummaryResponse,
  "feedbackReceiverIds"
> & {
  competency: {
    competencyId: string;
    displayName: string;
    periodLabel: string;
  };
};

export function normalizeAnalyticsCompetencyId(
  value: string | null | undefined,
) {
  return value?.trim().toLowerCase() || "";
}

export function isValidAnalyticsCompetencyId(value: string | null | undefined) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    normalizeAnalyticsCompetencyId(value),
  );
}
