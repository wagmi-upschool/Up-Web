import type {
  DashboardCultureQuestion,
  DashboardHourlyRating,
} from "@/lib/dashboardSummary";
import type {
  AnalyticsDashboardBehaviorTotal,
  AnalyticsDashboardBehaviorTrend,
  AnalyticsDashboardCompanyTotal,
  AnalyticsDashboardKpis,
  AnalyticsDashboardResponse,
  AnalyticsDashboardTopSender,
} from "@/lib/analyticsDashboard";

export type CompanySummaryData = {
  totalFeedbacks: number;
  overallAverageRating: number;
  hourlyRatings: DashboardHourlyRating[];
  cultureScore: {
    overallAverageRating: number;
    maxRating: number;
    questions: DashboardCultureQuestion[];
  };
  kpis?: AnalyticsDashboardKpis;
  overallTrend?: AnalyticsDashboardResponse["overallTrend"];
  behaviorTotals?: AnalyticsDashboardBehaviorTotal[];
  topSenders?: AnalyticsDashboardTopSender[];
  behaviorTrends?: AnalyticsDashboardBehaviorTrend[];
};

export type AnalyticsSummaryResponse = {
  competency: {
    competencyId: string;
    displayName: string;
    periodLabel: string;
  };
  maxRating: number;
  availableCompanies: string[];
  companyComparison?: AnalyticsDashboardCompanyTotal[];
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
