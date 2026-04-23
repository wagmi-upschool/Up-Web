import {
  buildDashboardSummaryQuery,
  type DashboardSummaryResponse,
} from "@/lib/dashboardSummary";

export const ECZACIBASI_VALUES_COMPETENCY_ID =
  "c6fd62a8-c282-4115-a4e4-edcaffbbcbc3";

export type AnalyticsCompetencyConfig = {
  competencyId: string;
  displayName: string;
  periodLabel: string;
  receiverIds: string[];
};

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

const ANALYTICS_COMPETENCIES: AnalyticsCompetencyConfig[] = [
  {
    competencyId: ECZACIBASI_VALUES_COMPETENCY_ID,
    displayName: "Eczacıbaşı",
    periodLabel: "UP Pulse",
    receiverIds: ["ab668687-79c5-4059-a269-5e3c44140158"],
  },
];

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

export function resolveAnalyticsCompetency(
  value: string | null | undefined,
  configs: AnalyticsCompetencyConfig[] = ANALYTICS_COMPETENCIES,
): AnalyticsCompetencyConfig | null {
  const competencyId = normalizeAnalyticsCompetencyId(value);
  if (!competencyId) return null;

  return (
    configs.find(
      (config) =>
        normalizeAnalyticsCompetencyId(config.competencyId) === competencyId,
    ) || null
  );
}

export function buildAnalyticsCompetencyDashboardQuery(
  value: string | null | undefined,
  configs: AnalyticsCompetencyConfig[] = ANALYTICS_COMPETENCIES,
) {
  const competency = resolveAnalyticsCompetency(value, configs);

  return competency ? buildDashboardSummaryQuery(competency.receiverIds) : null;
}

export function listAnalyticsCompetencies() {
  return [...ANALYTICS_COMPETENCIES];
}
