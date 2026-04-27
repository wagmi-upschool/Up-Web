import { NextRequest, NextResponse } from "next/server";
import {
  normalizeAnalyticsDashboardResponse,
  type AnalyticsDashboardResponse,
  type AnalyticsColorToken,
} from "@/lib/analyticsDashboard";
import {
  buildMockAnalyticsDashboard,
} from "@/lib/analyticsDashboardMock";
import {
  type AnalyticsSummaryResponse,
  isValidAnalyticsCompetencyId,
} from "@/lib/analyticsCompetencies";

const analyticsBase =
  process.env.DASHBOARD_REMOTE_URL ||
  process.env.NEXT_PUBLIC_DASHBOARD_REMOTE_URL ||
  process.env.REMOTE_URL ||
  process.env.NEXT_PUBLIC_REMOTE_URL;

const shouldUseLocalFallback = process.env.NODE_ENV !== "production";
const SUMMARY_COLOR_TOKENS: AnalyticsColorToken[] = [
  "gold",
  "green",
  "blue",
  "purple",
  "red",
  "orange",
];

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    { errorCode: code, errorMessage: message },
    { status },
  );
}

function normalizeCompanySlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isAnalyticsSummaryResponse(
  value: unknown,
): value is AnalyticsSummaryResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "availableCompanies" in value &&
    "byCompany" in value &&
    "competency" in value &&
    "maxRating" in value
  );
}

function buildGranularityPoints(
  hourlyRatings: AnalyticsSummaryResponse["byCompany"]["all"]["hourlyRatings"],
) {
  const dailyMap = new Map<string, number>();
  const weeklyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();

  for (const rating of hourlyRatings) {
    const date = new Date(`${rating.hour}Z`);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const dailyKey = `${year}-${month}-${day}`;
    const weekStart = new Date(date);
    const dayOfWeek = (weekStart.getUTCDay() + 6) % 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek);
    const weeklyKey = `${weekStart.getUTCFullYear()}-${String(
      weekStart.getUTCMonth() + 1,
    ).padStart(2, "0")}-${String(weekStart.getUTCDate()).padStart(2, "0")}`;
    const monthlyKey = `${year}-${month}`;

    dailyMap.set(dailyKey, (dailyMap.get(dailyKey) || 0) + rating.totalFeedbacks);
    weeklyMap.set(
      weeklyKey,
      (weeklyMap.get(weeklyKey) || 0) + rating.totalFeedbacks,
    );
    monthlyMap.set(
      monthlyKey,
      (monthlyMap.get(monthlyKey) || 0) + rating.totalFeedbacks,
    );
  }

  const toPoints = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([label, value]) => ({ label, value }));

  return {
    daily: { points: toPoints(dailyMap) },
    weekly: { points: toPoints(weeklyMap) },
    monthly: { points: toPoints(monthlyMap) },
  };
}

function transformSummaryToDashboardResponse(
  input: AnalyticsSummaryResponse,
  requestedCompany: string | null,
): AnalyticsDashboardResponse {
  const companyMap = new Map(
    input.availableCompanies.map((companyLabel) => [
      normalizeCompanySlug(companyLabel),
      companyLabel,
    ]),
  );
  const normalizedRequestedCompany = normalizeCompanySlug(requestedCompany || "");
  const selectedCompanyLabel =
    companyMap.get(normalizedRequestedCompany) ||
    (requestedCompany && input.byCompany[requestedCompany]
      ? requestedCompany
      : "all");
  const activeCompany =
    input.byCompany[selectedCompanyLabel] || input.byCompany.all;

  const availableCompanies = [
    {
      id: "all",
      slug: "all",
      label: "Tüm Şirketler",
    },
    ...input.availableCompanies.map((companyLabel) => ({
      id: normalizeCompanySlug(companyLabel),
      slug: companyLabel,
      label: companyLabel,
    })),
  ];
  const companyComparison = input.availableCompanies.map((companyLabel, index) => ({
    companyId: normalizeCompanySlug(companyLabel),
    label: companyLabel,
    totalSignals: input.byCompany[companyLabel]?.totalFeedbacks || 0,
    colorToken: SUMMARY_COLOR_TOKENS[index % SUMMARY_COLOR_TOKENS.length],
  }));
  const behaviorTotals = activeCompany.cultureScore.questions.map((question, index) => ({
    behaviorId: question.questionId,
    label: question.questionText,
    totalSignals: question.totalFeedbacks,
    colorToken: SUMMARY_COLOR_TOKENS[index % SUMMARY_COLOR_TOKENS.length],
  }));

  return {
    meta: {
      competencyId: input.competency.competencyId,
      competencyName: input.competency.displayName,
      dashboardTitle: `${input.competency.displayName} CEO Dashboard`,
      periodLabel: input.competency.periodLabel,
      totalSignalsBadge: `${activeCompany.totalFeedbacks} Sinyal`,
      availableCompanies,
      selectedCompany: selectedCompanyLabel,
    },
    kpis: {
      totalSignals: activeCompany.totalFeedbacks,
      uniqueParticipants: 0,
      uniqueSenders: 0,
      uniqueReceivers: 0,
    },
    overallTrend: {
      granularities: buildGranularityPoints(activeCompany.hourlyRatings),
    },
    behaviorTotals,
    companyComparison,
    topSenders: [],
    behaviorSummary: behaviorTotals.map((item) => ({
      behaviorId: item.behaviorId,
      label: item.label,
      totalSignals: item.totalSignals,
      colorToken: item.colorToken,
    })),
    behaviorTrends: [],
    filters: {
      availablePeriods: [],
      availableGranularities: ["daily", "weekly", "monthly"],
    },
  };
}

function buildFallbackDashboard(
  competencyId: string,
  period?: string | null,
  company?: string | null,
) {
  return normalizeAnalyticsDashboardResponse(
    buildMockAnalyticsDashboard({
      competencyId,
      period,
      company,
    }),
    competencyId,
  );
}

export async function handleAnalyticsDashboardRequest(request: NextRequest) {
  const competencyId = request.nextUrl.searchParams.get("competencyId");
  const period = request.nextUrl.searchParams.get("period");
  const company = request.nextUrl.searchParams.get("company");

  if (!competencyId?.trim()) {
    return jsonError(
      "competencyId query parameter is required.",
      400,
      "COMPETENCY_ID_REQUIRED",
    );
  }

  if (!isValidAnalyticsCompetencyId(competencyId)) {
    return jsonError(
      "competencyId must be a valid UUID.",
      400,
      "COMPETENCY_ID_INVALID",
    );
  }

  if (!analyticsBase) {
    return NextResponse.json(
      buildFallbackDashboard(competencyId.trim(), period, company),
    );
  }

  const query = new URLSearchParams({
    competencyId: competencyId.trim(),
  });

  if (period?.trim()) {
    query.set("period", period.trim());
  }

  if (company?.trim()) {
    query.set("company", company.trim());
  }

  let response: Response;
  try {
    response = await fetch(
      `${analyticsBase}/analytics/dashboard?${query.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
  } catch {
    if (shouldUseLocalFallback) {
      return NextResponse.json(
        buildFallbackDashboard(competencyId.trim(), period, company),
      );
    }

    return NextResponse.json(
      {
        errorCode: "DASHBOARD_UPSTREAM_UNAVAILABLE",
        errorMessage: "Dashboard data source is unavailable.",
      },
      { status: 502 },
    );
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    if (response.status === 404) {
      return NextResponse.json(
        buildFallbackDashboard(competencyId.trim(), period, company),
      );
    }

    return NextResponse.json(
      {
        errorCode: json?.body?.errorCode || json?.errorCode || response.status,
        errorMessage:
          json?.body?.errorMessage ||
          json?.errorMessage ||
          response.statusText ||
          "Dashboard data could not be loaded.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json(
    normalizeAnalyticsDashboardResponse(
      isAnalyticsSummaryResponse(json?.body ?? json)
        ? transformSummaryToDashboardResponse(json?.body ?? json, company)
        : ((json?.body ?? json) as AnalyticsDashboardResponse),
      competencyId.trim(),
    ),
  );
}
