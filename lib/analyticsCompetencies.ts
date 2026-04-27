import type {
  DashboardCultureQuestion,
  DashboardHourlyRating,
} from "@/lib/dashboardSummary";

export type CompanySummaryData = {
  totalFeedbacks: number;
  overallAverageRating: number;
  hourlyRatings: DashboardHourlyRating[];
  cultureScore: {
    overallAverageRating: number;
    maxRating: number;
    questions: DashboardCultureQuestion[];
  };
};

export type AnalyticsSummaryResponse = {
  competency: {
    competencyId: string;
    displayName: string;
    periodLabel: string;
  };
  maxRating: number;
  availableCompanies: string[];
  byCompany: Record<string, CompanySummaryData>;
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
