import {
  type AnalyticsColorToken,
  type AnalyticsDashboardBehaviorSummary,
  type AnalyticsDashboardBehaviorTotal,
  type AnalyticsDashboardCompanyTotal,
  type AnalyticsDashboardPoint,
  type AnalyticsDashboardResponse,
  type AnalyticsDashboardTopSender,
} from "@/lib/analyticsDashboard";

export const ANALYTICS_COLOR_STYLES: Record<
  AnalyticsColorToken,
  {
    line: string;
    fill: string;
    surface: string;
    text: string;
    dot: string;
  }
> = {
  gold: {
    line: "#AD7A00",
    fill: "#FFF1C7",
    surface: "bg-[#FFF1C7] text-[#8A6100]",
    text: "text-[#AD7A00]",
    dot: "#AD7A00",
  },
  blue: {
    line: "#375CCB",
    fill: "#E3EBFF",
    surface: "bg-[#E3EBFF] text-[#375CCB]",
    text: "text-[#375CCB]",
    dot: "#375CCB",
  },
  green: {
    line: "#1C8067",
    fill: "#DDF6EF",
    surface: "bg-[#DDF6EF] text-[#1C8067]",
    text: "text-[#1C8067]",
    dot: "#1C8067",
  },
  red: {
    line: "#B52E45",
    fill: "#FFE2E7",
    surface: "bg-[#FFE2E7] text-[#B52E45]",
    text: "text-[#B52E45]",
    dot: "#B52E45",
  },
  purple: {
    line: "#6B3AB2",
    fill: "#EBDDFF",
    surface: "bg-[#EBDDFF] text-[#6B3AB2]",
    text: "text-[#6B3AB2]",
    dot: "#6B3AB2",
  },
  orange: {
    line: "#D48200",
    fill: "#FFE9C9",
    surface: "bg-[#FFE9C9] text-[#D48200]",
    text: "text-[#D48200]",
    dot: "#D48200",
  },
};

type AdaptedBarItem = {
  id: string;
  label: string;
  value: number;
  progress: number;
  colorToken: AnalyticsColorToken;
};

type AdaptedTopSender = AnalyticsDashboardTopSender & {
  progress: number;
};

type AdaptedBehaviorSummary = AnalyticsDashboardBehaviorSummary & {
  toneClass: string;
};

export type AnalyticsDashboardViewModel = {
  meta: AnalyticsDashboardResponse["meta"] & {
    showCompanyTabs: boolean;
  };
  kpis: Array<{
    id: string;
    label: string;
    value: number;
    subtitle: string;
    colorToken: AnalyticsColorToken;
  }>;
  overallTrend: AnalyticsDashboardResponse["overallTrend"];
  behaviorTotals: AdaptedBarItem[];
  companyComparison: AdaptedBarItem[];
  topSenders: AdaptedTopSender[];
  behaviorSummary: AdaptedBehaviorSummary[];
  behaviorTrends: AnalyticsDashboardResponse["behaviorTrends"];
  filters: AnalyticsDashboardResponse["filters"];
};

function toProgress(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(6, Math.round((value / maxValue) * 100));
}

function sortByValue<T extends { totalSignals: number; label: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    if (right.totalSignals !== left.totalSignals) {
      return right.totalSignals - left.totalSignals;
    }

    return left.label.localeCompare(right.label, "tr");
  });
}

function adaptTotals(
  items: AnalyticsDashboardBehaviorTotal[] | AnalyticsDashboardCompanyTotal[],
) {
  const sortedItems = [...items].sort((left, right) => {
    if (right.totalSignals !== left.totalSignals) {
      return right.totalSignals - left.totalSignals;
    }

    return left.label.localeCompare(right.label, "tr");
  });
  const maxValue = sortedItems[0]?.totalSignals || 0;

  return sortedItems.map((item) => ({
    id: "behaviorId" in item ? item.behaviorId : item.companyId,
    label: item.label,
    value: item.totalSignals,
    progress: toProgress(item.totalSignals, maxValue),
    colorToken: item.colorToken,
  }));
}

function adaptTopSenders(items: AnalyticsDashboardTopSender[]): AdaptedTopSender[] {
  const sortedItems = [...items].sort((left, right) => left.rank - right.rank);
  const maxValue = sortedItems[0]?.totalSignals || 0;

  return sortedItems.map((item) => ({
    ...item,
    progress: toProgress(item.totalSignals, maxValue),
  }));
}

function adaptBehaviorSummary(
  items: AnalyticsDashboardBehaviorSummary[],
): AdaptedBehaviorSummary[] {
  return sortByValue(items).map((item) => ({
    ...item,
    toneClass: ANALYTICS_COLOR_STYLES[item.colorToken].surface,
  }));
}

export function adaptAnalyticsDashboard(
  response: AnalyticsDashboardResponse,
): AnalyticsDashboardViewModel {
  return {
    meta: {
      ...response.meta,
      showCompanyTabs: response.meta.availableCompanies.length > 1,
    },
    kpis: [
      {
        id: "totalSignals",
        label: "Toplam Sinyal",
        value: response.kpis.totalSignals,
        subtitle: response.meta.periodLabel,
        colorToken: "gold",
      },
      {
        id: "uniqueParticipants",
        label: "Toplam Benzersiz Katılımcı",
        value: response.kpis.uniqueParticipants,
        subtitle: "Seçili dönemde benzersiz kişi",
        colorToken: "blue",
      },
      {
        id: "uniqueSenders",
        label: "Sinyal Veren",
        value: response.kpis.uniqueSenders,
        subtitle: "Benzersiz katılımcı",
        colorToken: "green",
      },
      {
        id: "uniqueReceivers",
        label: "Sinyal Alan",
        value: response.kpis.uniqueReceivers,
        subtitle: "Benzersiz kişi",
        colorToken: "red",
      },
    ],
    overallTrend: response.overallTrend,
    behaviorTotals: adaptTotals(response.behaviorTotals),
    companyComparison: adaptTotals(response.companyComparison),
    topSenders: adaptTopSenders(response.topSenders),
    behaviorSummary: adaptBehaviorSummary(response.behaviorSummary),
    behaviorTrends: response.behaviorTrends,
    filters: response.filters,
  };
}

export function getAnalyticsChartMax(points: AnalyticsDashboardPoint[]) {
  const maxValue = Math.max(0, ...points.map((point) => point.value));
  return maxValue === 0 ? 4 : maxValue;
}
