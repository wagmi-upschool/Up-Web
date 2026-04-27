"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import AnalyticsDashboardPage from "@/components/analytics-dashboard/dashboard-page";
import type {
  AnalyticsColorToken,
  AnalyticsDashboardResponse,
} from "@/lib/analyticsDashboard";
import type { AnalyticsSummaryResponse } from "@/lib/analyticsCompetencies";
import { isValidAnalyticsCompetencyId } from "@/lib/analyticsCompetencies";

const SUMMARY_COLOR_TOKENS: AnalyticsColorToken[] = [
  "gold",
  "green",
  "blue",
  "purple",
  "red",
  "orange",
];

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
  requestedCompany: string,
): AnalyticsDashboardResponse {
  const companyMap = new Map(
    input.availableCompanies.map((companyLabel) => [
      normalizeCompanySlug(companyLabel),
      companyLabel,
    ]),
  );
  const normalizedRequestedCompany = normalizeCompanySlug(requestedCompany);
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
    companyComparison: input.availableCompanies.map((companyLabel, index) => ({
      companyId: normalizeCompanySlug(companyLabel),
      label: companyLabel,
      totalSignals: input.byCompany[companyLabel]?.totalFeedbacks || 0,
      colorToken: SUMMARY_COLOR_TOKENS[index % SUMMARY_COLOR_TOKENS.length],
    })),
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

async function getAnalyticsSummary(competencyId: string) {
  const query = new URLSearchParams({
    competencyId,
  });

  const response = await fetch(
    `/analytics/summary?${query.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const code = json?.errorCode || response.status;
    const message =
      json?.errorMessage || response.statusText || "Dashboard verisi alınamadı.";
    throw new Error(`${code}: ${message}`);
  }

  return json as AnalyticsSummaryResponse;
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  return messageParts.join(":").trim() || raw;
}

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCompetencyId = searchParams.get("competencyId") || "";
  const competencyId = rawCompetencyId.trim();
  const company = (searchParams.get("company") || "all").trim() || "all";
  const hasCompetencyId = isValidAnalyticsCompetencyId(competencyId);

  const dashboardQuery = useQuery({
    queryKey: ["analyticsSummaryForDashboard", competencyId],
    queryFn: () => getAnalyticsSummary(competencyId),
    enabled: hasCompetencyId,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
  const dashboardResponse = dashboardQuery.data
    ? transformSummaryToDashboardResponse(dashboardQuery.data, company)
    : undefined;

  const handleCompanySelect = (slug: string) => {
    const query = new URLSearchParams(searchParams.toString());

    if (slug === "all") {
      query.delete("company");
    } else {
      query.set("company", slug);
    }

    startTransition(() => {
      router.replace(`/analytics?${query.toString()}`);
    });
  };

  return (
    <AnalyticsDashboardPage
      errorMessage={
        dashboardQuery.error ? formatApiError(dashboardQuery.error) : null
      }
      hasCompetencyId={hasCompetencyId}
      isLoading={dashboardQuery.isLoading}
      isUpdating={dashboardQuery.isFetching && !dashboardQuery.isLoading}
      onCompanySelect={handleCompanySelect}
      response={dashboardResponse}
    />
  );
}

export default function AnalyticsPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsPageContent />
    </QueryClientProvider>
  );
}
