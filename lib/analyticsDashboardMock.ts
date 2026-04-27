import {
  type AnalyticsColorToken,
  type AnalyticsDashboardBehaviorSummary,
  type AnalyticsDashboardBehaviorTotal,
  type AnalyticsDashboardCompany,
  type AnalyticsDashboardCompanyTotal,
  type AnalyticsDashboardPoint,
  type AnalyticsDashboardResponse,
  type AnalyticsDashboardTopSender,
  normalizeAnalyticsDashboardResponse,
} from "@/lib/analyticsDashboard";

type CompanySeed = {
  companyId: string;
  slug: string;
  label: string;
  totalSignals: number;
  uniqueParticipants: number;
  uniqueSenders: number;
  uniqueReceivers: number;
  trend: number[];
  behaviorTotals: number[];
};

const AVAILABLE_COMPANIES: AnalyticsDashboardCompany[] = [
  { id: "all", slug: "all", label: "Tüm Şirketler" },
  { id: "topluluk", slug: "topluluk", label: "TOPLULUK" },
  { id: "karo", slug: "karo", label: "KARO" },
  { id: "banyo", slug: "banyo", label: "BANYO" },
  { id: "saglik", slug: "saglik", label: "SAĞLIK" },
  { id: "esan", slug: "esan", label: "ESAN" },
  {
    id: "tuketim-urunleri",
    slug: "tuketim-urunleri",
    label: "TÜKETİM ÜRÜNLERİ",
  },
];

const BEHAVIOR_SEEDS: Array<{
  behaviorId: string;
  label: string;
  colorToken: AnalyticsColorToken;
  daily: number[];
}> = [
  {
    behaviorId: "amac-hedef",
    label: "Amaç & Hedef",
    colorToken: "blue",
    daily: [0, 0, 0, 2, 0, 11, 32],
  },
  {
    behaviorId: "katma-deger",
    label: "Katma Değer",
    colorToken: "red",
    daily: [1, 0, 0, 1, 0, 10, 33],
  },
  {
    behaviorId: "umut-cesaret",
    label: "Umut & Cesaret",
    colorToken: "gold",
    daily: [1, 1, 0, 3, 0, 12, 22],
  },
  {
    behaviorId: "basari-kutlama",
    label: "Başarı Kutlama",
    colorToken: "purple",
    daily: [0, 0, 2, 0, 0, 7, 27],
  },
  {
    behaviorId: "ileri-bildirim",
    label: "İleri Bildirim",
    colorToken: "green",
    daily: [0, 1, 1, 2, 1, 5, 12],
  },
];

const COMPANY_SEEDS: Record<string, CompanySeed> = {
  all: {
    companyId: "all",
    slug: "all",
    label: "Tüm Şirketler",
    totalSignals: 188,
    uniqueParticipants: 48,
    uniqueSenders: 31,
    uniqueReceivers: 44,
    trend: [2, 0, 2, 4, 0, 50, 126],
    behaviorTotals: [45, 45, 39, 37, 22],
  },
  esan: {
    companyId: "esan",
    slug: "esan",
    label: "ESAN",
    totalSignals: 23,
    uniqueParticipants: 12,
    uniqueSenders: 9,
    uniqueReceivers: 11,
    trend: [0, 0, 1, 0, 0, 6, 16],
    behaviorTotals: [7, 5, 4, 4, 3],
  },
  topluluk: {
    companyId: "topluluk",
    slug: "topluluk",
    label: "TOPLULUK",
    totalSignals: 78,
    uniqueParticipants: 41,
    uniqueSenders: 28,
    uniqueReceivers: 36,
    trend: [1, 0, 1, 2, 0, 21, 53],
    behaviorTotals: [19, 19, 16, 14, 10],
  },
  karo: {
    companyId: "karo",
    slug: "karo",
    label: "KARO",
    totalSignals: 32,
    uniqueParticipants: 17,
    uniqueSenders: 12,
    uniqueReceivers: 15,
    trend: [0, 0, 0, 1, 0, 9, 22],
    behaviorTotals: [6, 7, 7, 8, 4],
  },
  banyo: {
    companyId: "banyo",
    slug: "banyo",
    label: "BANYO",
    totalSignals: 15,
    uniqueParticipants: 8,
    uniqueSenders: 6,
    uniqueReceivers: 8,
    trend: [0, 0, 0, 0, 0, 4, 11],
    behaviorTotals: [3, 3, 3, 4, 2],
  },
  saglik: {
    companyId: "saglik",
    slug: "saglik",
    label: "SAĞLIK",
    totalSignals: 25,
    uniqueParticipants: 13,
    uniqueSenders: 10,
    uniqueReceivers: 12,
    trend: [1, 0, 0, 1, 0, 7, 16],
    behaviorTotals: [6, 7, 5, 4, 3],
  },
  "tuketim-urunleri": {
    companyId: "tuketim-urunleri",
    slug: "tuketim-urunleri",
    label: "TÜKETİM ÜRÜNLERİ",
    totalSignals: 15,
    uniqueParticipants: 8,
    uniqueSenders: 6,
    uniqueReceivers: 8,
    trend: [0, 0, 0, 0, 0, 3, 12],
    behaviorTotals: [4, 4, 3, 2, 2],
  },
};

const TOP_SENDERS: AnalyticsDashboardTopSender[] = [
  {
    personId: "emin-fadillioglu",
    fullName: "Emin Fadillioğlu",
    initials: "EF",
    totalSignals: 17,
    dominantColorToken: "gold",
    rank: 1,
  },
  {
    personId: "kader-karaca",
    fullName: "KADER KARACA",
    initials: "KK",
    totalSignals: 16,
    dominantColorToken: "blue",
    rank: 2,
  },
  {
    personId: "irem-yenice",
    fullName: "İrem Yenice",
    initials: "İY",
    totalSignals: 14,
    dominantColorToken: "green",
    rank: 3,
  },
  {
    personId: "pelin-kirici",
    fullName: "Pelin Kirici",
    initials: "PK",
    totalSignals: 14,
    dominantColorToken: "red",
    rank: 4,
  },
  {
    personId: "zehra-marangoz",
    fullName: "ZEHRA MARANGOZ",
    initials: "ZM",
    totalSignals: 14,
    dominantColorToken: "purple",
    rank: 5,
  },
  {
    personId: "mert-karasu",
    fullName: "Mert Karasu",
    initials: "MK",
    totalSignals: 13,
    dominantColorToken: "gold",
    rank: 6,
  },
  {
    personId: "omur-salman",
    fullName: "Ömür Salman",
    initials: "ÖS",
    totalSignals: 13,
    dominantColorToken: "blue",
    rank: 7,
  },
  {
    personId: "serdar-sahan",
    fullName: "SERDAR ŞAHAN",
    initials: "SŞ",
    totalSignals: 11,
    dominantColorToken: "green",
    rank: 8,
  },
];

function buildPeriodLabel(period: string | null | undefined) {
  if (!period) {
    return "CEO Dashboard · Nisan 2026";
  }

  return `CEO Dashboard · ${period}`;
}

function toDailyPoints(values: number[]): AnalyticsDashboardPoint[] {
  const labels = ["13 Nis", "15 Nis", "17 Nis", "18 Nis", "19 Nis", "20 Nis", "21 Nis"];

  return labels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));
}

function toWeeklyPoints(values: number[]): AnalyticsDashboardPoint[] {
  const weeklyValues = [
    values.slice(0, 2).reduce((sum, value) => sum + value, 0),
    values.slice(2, 4).reduce((sum, value) => sum + value, 0),
    values.slice(4, 7).reduce((sum, value) => sum + value, 0),
  ];

  return [
    { label: "1. Hafta", value: weeklyValues[0] },
    { label: "2. Hafta", value: weeklyValues[1] },
    { label: "3. Hafta", value: weeklyValues[2] },
  ];
}

function toMonthlyPoints(values: number[]): AnalyticsDashboardPoint[] {
  return [
    {
      label: "Şub",
      value: Math.max(0, Math.round(values.reduce((sum, value) => sum + value, 0) * 0.18)),
    },
    {
      label: "Mar",
      value: Math.max(0, Math.round(values.reduce((sum, value) => sum + value, 0) * 0.33)),
    },
    {
      label: "Nis",
      value: values.reduce((sum, value) => sum + value, 0),
    },
  ];
}

function scaleValues(values: number[], ratio: number) {
  return values.map((value) => Math.max(0, Math.round(value * ratio)));
}

function buildBehaviorTotals(company: CompanySeed): AnalyticsDashboardBehaviorTotal[] {
  return BEHAVIOR_SEEDS.map((behavior, index) => ({
    behaviorId: behavior.behaviorId,
    label: behavior.label,
    totalSignals: company.behaviorTotals[index] ?? 0,
    colorToken: behavior.colorToken,
  }));
}

function buildBehaviorSummary(
  behaviorTotals: AnalyticsDashboardBehaviorTotal[],
): AnalyticsDashboardBehaviorSummary[] {
  return behaviorTotals.map((behavior) => ({
    behaviorId: behavior.behaviorId,
    label: behavior.label,
    totalSignals: behavior.totalSignals,
    colorToken: behavior.colorToken,
  }));
}

function buildBehaviorTrends(company: CompanySeed) {
  const ratio =
    COMPANY_SEEDS.all.totalSignals > 0
      ? company.totalSignals / COMPANY_SEEDS.all.totalSignals
      : 0;

  return BEHAVIOR_SEEDS.map((behavior) => {
    const scaledDaily =
      company.slug === "all"
        ? behavior.daily
        : scaleValues(behavior.daily, Math.max(ratio, 0.08));

    return {
      behaviorId: behavior.behaviorId,
      label: behavior.label,
      colorToken: behavior.colorToken,
      granularities: {
        daily: {
          points: toDailyPoints(scaledDaily),
        },
        weekly: {
          points: toWeeklyPoints(scaledDaily),
        },
        monthly: {
          points: toMonthlyPoints(scaledDaily),
        },
      },
    };
  });
}

function buildCompanyComparison(): AnalyticsDashboardCompanyTotal[] {
  return [
    {
      companyId: "topluluk",
      label: "TOPLULUK",
      totalSignals: 78,
      colorToken: "gold",
    },
    {
      companyId: "karo",
      label: "KARO",
      totalSignals: 32,
      colorToken: "blue",
    },
    {
      companyId: "saglik",
      label: "SAĞLIK",
      totalSignals: 25,
      colorToken: "green",
    },
    {
      companyId: "esan",
      label: "ESAN",
      totalSignals: 23,
      colorToken: "red",
    },
    {
      companyId: "banyo",
      label: "BANYO",
      totalSignals: 15,
      colorToken: "purple",
    },
    {
      companyId: "tuketim-urunleri",
      label: "TÜKETİM ÜRÜNLERİ",
      totalSignals: 15,
      colorToken: "orange",
    },
  ];
}

export function buildMockAnalyticsDashboard(args: {
  competencyId: string;
  period?: string | null;
  company?: string | null;
}): AnalyticsDashboardResponse {
  const company =
    COMPANY_SEEDS[args.company || ""] || COMPANY_SEEDS.all;
  const behaviorTotals = buildBehaviorTotals(company);
  const behaviorSummary = buildBehaviorSummary(behaviorTotals);
  const behaviorTrends = buildBehaviorTrends(company);

  return normalizeAnalyticsDashboardResponse(
    {
      meta: {
        competencyId: args.competencyId,
        competencyName: "Eczacıbaşı",
        dashboardTitle: "Eczacıbaşı · UP Pulse",
        periodLabel: buildPeriodLabel(args.period),
        totalSignalsBadge: `${company.totalSignals} Sinyal`,
        availableCompanies: AVAILABLE_COMPANIES,
        selectedCompany: company.slug,
      },
      kpis: {
        totalSignals: company.totalSignals,
        uniqueParticipants: company.uniqueParticipants,
        uniqueSenders: company.uniqueSenders,
        uniqueReceivers: company.uniqueReceivers,
      },
      overallTrend: {
        granularities: {
          daily: {
            points: toDailyPoints(company.trend),
          },
          weekly: {
            points: toWeeklyPoints(company.trend),
          },
          monthly: {
            points: toMonthlyPoints(company.trend),
          },
        },
      },
      behaviorTotals,
      companyComparison: buildCompanyComparison(),
      topSenders: company.slug === "all" ? TOP_SENDERS : TOP_SENDERS.slice(0, 5),
      behaviorSummary,
      behaviorTrends,
      filters: {
        availablePeriods: ["2026-04", "2026-03", "2026-02"],
        availableGranularities: ["daily", "weekly", "monthly"],
      },
    },
    args.competencyId,
  );
}
