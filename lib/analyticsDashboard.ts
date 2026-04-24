export type AnalyticsGranularity = "daily" | "weekly" | "monthly";

export type AnalyticsColorToken =
  | "gold"
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "orange";

export type AnalyticsDashboardPoint = {
  label: string;
  value: number;
};

export type AnalyticsDashboardSeries = Record<
  AnalyticsGranularity,
  { points: AnalyticsDashboardPoint[] }
>;

export type AnalyticsDashboardCompany = {
  id: string;
  slug: string;
  label: string;
};

export type AnalyticsDashboardMeta = {
  competencyId: string;
  competencyName: string;
  dashboardTitle: string;
  periodLabel: string;
  totalSignalsBadge: string;
  availableCompanies: AnalyticsDashboardCompany[];
  selectedCompany: string;
};

export type AnalyticsDashboardKpis = {
  totalSignals: number;
  uniqueParticipants: number;
  uniqueSenders: number;
  uniqueReceivers: number;
};

export type AnalyticsDashboardBehaviorTotal = {
  behaviorId: string;
  label: string;
  totalSignals: number;
  colorToken: AnalyticsColorToken;
};

export type AnalyticsDashboardCompanyTotal = {
  companyId: string;
  label: string;
  totalSignals: number;
  colorToken: AnalyticsColorToken;
};

export type AnalyticsDashboardTopSender = {
  personId: string;
  fullName: string;
  initials: string;
  totalSignals: number;
  dominantColorToken: AnalyticsColorToken;
  rank: number;
};

export type AnalyticsDashboardBehaviorSummary = {
  behaviorId: string;
  label: string;
  totalSignals: number;
  colorToken: AnalyticsColorToken;
};

export type AnalyticsDashboardBehaviorTrend = {
  behaviorId: string;
  label: string;
  colorToken: AnalyticsColorToken;
  granularities: AnalyticsDashboardSeries;
};

export type AnalyticsDashboardFilters = {
  availablePeriods: string[];
  availableGranularities: AnalyticsGranularity[];
};

export type AnalyticsDashboardResponse = {
  meta: AnalyticsDashboardMeta;
  kpis: AnalyticsDashboardKpis;
  overallTrend: {
    granularities: AnalyticsDashboardSeries;
  };
  behaviorTotals: AnalyticsDashboardBehaviorTotal[];
  companyComparison: AnalyticsDashboardCompanyTotal[];
  topSenders: AnalyticsDashboardTopSender[];
  behaviorSummary: AnalyticsDashboardBehaviorSummary[];
  behaviorTrends: AnalyticsDashboardBehaviorTrend[];
  filters: AnalyticsDashboardFilters;
};

const COMPANY_LABEL_FIXES: Record<string, string> = {
  HOLDING: "HOLDİNG",
  VITRA: "VİTRA",
};

function localizeCompanyLabel(label: string) {
  const trimmed = label.trim();
  return COMPANY_LABEL_FIXES[trimmed] || trimmed;
}

function localizeDashboardTitle(title: string, competencyName: string) {
  const trimmed = title.trim();

  if (!trimmed) {
    return `${competencyName} CEO Dashboard`;
  }

  return trimmed;
}

function localizePeriodLabel(periodLabel: string) {
  const trimmed = periodLabel.trim();

  if (!trimmed) {
    return "CEO Dashboard · Son kapalı dönem";
  }

  if (/^all periods$/i.test(trimmed)) {
    return "TÜM DÖNEMLER";
  }

  return trimmed
    .replace(/\bAll Periods\b/gi, "TÜM DÖNEMLER");
}

function localizeSignalsBadge(badge: string) {
  const trimmed = badge.trim();

  if (!trimmed) {
    return "0 SİNYAL";
  }

  const signalMatch = trimmed.match(/^(\d+)\s+signals?$/i);
  if (signalMatch) {
    return `${signalMatch[1]} SİNYAL`;
  }

  return trimmed.replace(/\bsignals?\b/gi, "SİNYAL");
}

export const DEFAULT_ANALYTICS_GRANULARITIES: AnalyticsGranularity[] = [
  "daily",
  "weekly",
  "monthly",
];

export const DEFAULT_ANALYTICS_DASHBOARD_RESPONSE = (
  competencyId: string,
): AnalyticsDashboardResponse => ({
  meta: {
    competencyId,
    competencyName: "Eczacıbaşı",
    dashboardTitle: "Eczacıbaşı CEO Dashboard",
    periodLabel: "CEO Dashboard · Son kapalı dönem",
    totalSignalsBadge: "0 SİNYAL",
    availableCompanies: [
      {
        id: "all",
        slug: "all",
        label: "Tüm Şirketler",
      },
    ],
    selectedCompany: "all",
  },
  kpis: {
    totalSignals: 0,
    uniqueParticipants: 0,
    uniqueSenders: 0,
    uniqueReceivers: 0,
  },
  overallTrend: {
    granularities: {
      daily: { points: [] },
      weekly: { points: [] },
      monthly: { points: [] },
    },
  },
  behaviorTotals: [],
  companyComparison: [],
  topSenders: [],
  behaviorSummary: [],
  behaviorTrends: [],
  filters: {
    availablePeriods: [],
    availableGranularities: DEFAULT_ANALYTICS_GRANULARITIES,
  },
});

function normalizeSeries(
  series: Partial<AnalyticsDashboardSeries> | undefined,
): AnalyticsDashboardSeries {
  return {
    daily: {
      points: series?.daily?.points || [],
    },
    weekly: {
      points: series?.weekly?.points || [],
    },
    monthly: {
      points: series?.monthly?.points || [],
    },
  };
}

export function normalizeAnalyticsDashboardResponse(
  input: Partial<AnalyticsDashboardResponse> | null | undefined,
  competencyId: string,
): AnalyticsDashboardResponse {
  const fallback = DEFAULT_ANALYTICS_DASHBOARD_RESPONSE(competencyId);
  const competencyName =
    input?.meta?.competencyName || fallback.meta.competencyName;

  return {
    meta: {
      competencyId: input?.meta?.competencyId || fallback.meta.competencyId,
      competencyName,
      dashboardTitle: localizeDashboardTitle(
        input?.meta?.dashboardTitle || fallback.meta.dashboardTitle,
        competencyName,
      ),
      periodLabel: localizePeriodLabel(
        input?.meta?.periodLabel || fallback.meta.periodLabel,
      ),
      totalSignalsBadge: localizeSignalsBadge(
        input?.meta?.totalSignalsBadge || fallback.meta.totalSignalsBadge,
      ),
      availableCompanies:
        input?.meta?.availableCompanies?.length
          ? input.meta.availableCompanies.map((company) => ({
              ...company,
              label: localizeCompanyLabel(company.label),
            }))
          : fallback.meta.availableCompanies,
      selectedCompany:
        input?.meta?.selectedCompany || fallback.meta.selectedCompany,
    },
    kpis: {
      totalSignals: input?.kpis?.totalSignals ?? fallback.kpis.totalSignals,
      uniqueParticipants:
        input?.kpis?.uniqueParticipants ?? fallback.kpis.uniqueParticipants,
      uniqueSenders:
        input?.kpis?.uniqueSenders ?? fallback.kpis.uniqueSenders,
      uniqueReceivers:
        input?.kpis?.uniqueReceivers ?? fallback.kpis.uniqueReceivers,
    },
    overallTrend: {
      granularities: normalizeSeries(input?.overallTrend?.granularities),
    },
    behaviorTotals: input?.behaviorTotals || [],
    companyComparison: input?.companyComparison || [],
    topSenders: input?.topSenders || [],
    behaviorSummary: input?.behaviorSummary || [],
    behaviorTrends: (input?.behaviorTrends || []).map((trend) => ({
      ...trend,
      granularities: normalizeSeries(trend.granularities),
    })),
    filters: {
      availablePeriods: input?.filters?.availablePeriods || [],
      availableGranularities:
        input?.filters?.availableGranularities?.length
          ? input.filters.availableGranularities
          : DEFAULT_ANALYTICS_GRANULARITIES,
    },
  };
}
