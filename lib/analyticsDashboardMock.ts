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
  { id: "esan", slug: "esan", label: "ESAN" },
  { id: "eyap", slug: "eyap", label: "EYAP" },
  { id: "eczacibasi-ilac", slug: "eczacibasi-ilac", label: "Eczacıbaşı İlaç" },
  { id: "holding", slug: "holding", label: "HOLDİNG" },
  { id: "saniverse", slug: "saniverse", label: "SANIVERSE" },
  { id: "vitra", slug: "vitra", label: "VİTRA" },
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
    totalSignals: 50,
    uniqueParticipants: 18,
    uniqueSenders: 11,
    uniqueReceivers: 16,
    trend: [0, 0, 1, 1, 0, 12, 36],
    behaviorTotals: [14, 12, 10, 8, 6],
  },
  eyap: {
    companyId: "eyap",
    slug: "eyap",
    label: "EYAP",
    totalSignals: 22,
    uniqueParticipants: 9,
    uniqueSenders: 6,
    uniqueReceivers: 8,
    trend: [0, 0, 0, 1, 0, 7, 14],
    behaviorTotals: [4, 5, 4, 5, 4],
  },
  "eczacibasi-ilac": {
    companyId: "eczacibasi-ilac",
    slug: "eczacibasi-ilac",
    label: "Eczacıbaşı İlaç",
    totalSignals: 87,
    uniqueParticipants: 24,
    uniqueSenders: 15,
    uniqueReceivers: 21,
    trend: [2, 0, 1, 2, 0, 21, 61],
    behaviorTotals: [22, 21, 18, 17, 9],
  },
  holding: {
    companyId: "holding",
    slug: "holding",
    label: "HOLDİNG",
    totalSignals: 4,
    uniqueParticipants: 3,
    uniqueSenders: 2,
    uniqueReceivers: 3,
    trend: [0, 0, 0, 0, 0, 1, 3],
    behaviorTotals: [1, 1, 1, 1, 0],
  },
  saniverse: {
    companyId: "saniverse",
    slug: "saniverse",
    label: "SANIVERSE",
    totalSignals: 4,
    uniqueParticipants: 3,
    uniqueSenders: 2,
    uniqueReceivers: 2,
    trend: [0, 0, 0, 0, 0, 1, 3],
    behaviorTotals: [1, 1, 1, 0, 1],
  },
  vitra: {
    companyId: "vitra",
    slug: "vitra",
    label: "VİTRA",
    totalSignals: 21,
    uniqueParticipants: 8,
    uniqueSenders: 5,
    uniqueReceivers: 7,
    trend: [0, 0, 0, 0, 0, 8, 13],
    behaviorTotals: [3, 5, 5, 6, 2],
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
    peakDayLabel: "21 Nis",
    peakDayValue: Math.max(0, Math.round(behavior.totalSignals * 0.72)),
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
      companyId: "eczacibasi-ilac",
      label: "Eczacıbaşı İlaç",
      totalSignals: 87,
      colorToken: "gold",
    },
    {
      companyId: "esan",
      label: "ESAN",
      totalSignals: 50,
      colorToken: "blue",
    },
    {
      companyId: "eyap",
      label: "EYAP",
      totalSignals: 22,
      colorToken: "green",
    },
    {
      companyId: "vitra",
      label: "VİTRA",
      totalSignals: 21,
      colorToken: "red",
    },
    {
      companyId: "holding",
      label: "HOLDİNG",
      totalSignals: 4,
      colorToken: "purple",
    },
    {
      companyId: "saniverse",
      label: "SANIVERSE",
      totalSignals: 4,
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
